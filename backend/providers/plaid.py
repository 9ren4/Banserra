import os
from typing import Any
from collections import defaultdict

from dotenv import load_dotenv
from sqlalchemy import text

from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.accounts_get_request import AccountsGetRequest

from providers.base import BankProvider
from database import SessionLocal

load_dotenv()


class PlaidProvider(BankProvider):
    """
    Plaid implementation of BankProvider.
    Handles all Plaid-specific API calls.
    """

    def __init__(self):
        client_id = os.getenv("PLAID_CLIENT_ID")
        secret = os.getenv("PLAID_SECRET")
        env = os.getenv("PLAID_ENV", "sandbox")

        if not client_id or not secret:
            raise RuntimeError("Missing Plaid credentials (PLAID_CLIENT_ID, PLAID_SECRET)")

        host = {
            "sandbox": "https://sandbox.plaid.com",
            "development": "https://development.plaid.com",
            "production": "https://production.plaid.com",
        }[env]

        configuration = Configuration(
            host=host,
            api_key={
                "clientId": client_id,
                "secret": secret,
            },
        )

        api_client = ApiClient(configuration)
        self.client = plaid_api.PlaidApi(api_client)

    def create_link(self, user_id: str) -> dict[str, Any]:
        """Create a Plaid Link token for the frontend."""
        # redirect_uri is required for UK OAuth banks (Open Banking flow).
        # Register the same URI in your Plaid dashboard under
        # Team Settings → API → Allowed redirect URIs.
        redirect_uri = os.getenv("PLAID_REDIRECT_URI", "http://localhost:3000/plaid-oauth")

        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=user_id),
            client_name="banserra",
            products=[Products("transactions")],
            country_codes=[CountryCode("GB")],
            language="en",
            redirect_uri=redirect_uri,
        )
        response = self.client.link_token_create(request)
        return response.to_dict()

    def exchange_token(self, user_id: str, public_token: str) -> dict[str, Any]:
        """Exchange public token for access token and store in DB."""
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = self.client.item_public_token_exchange(request)

        db = SessionLocal()
        try:
            db.execute(
                text("""
                    INSERT INTO plaid_items (user_id, access_token, item_id)
                    VALUES (:user_id, :access_token, :item_id)
                """),
                {
                    "user_id": user_id,
                    "access_token": response["access_token"],
                    "item_id": response["item_id"],
                }
            )
            db.commit()
        finally:
            db.close()

        return {
            "status": "connected",
            "item_id": response["item_id"]
        }

    def _get_access_token(self, user_id: str) -> tuple[str | None, str]:
        """Get access token and cursor from DB for a user."""
        db = SessionLocal()
        try:
            row = db.execute(
                text("""
                    SELECT access_token, cursor
                    FROM plaid_items
                    WHERE user_id = :u
                    ORDER BY created_at DESC
                    LIMIT 1
                """),
                {"u": user_id}
            ).fetchone()

            if row:
                return row[0], row[1] or ""
            return None, ""
        finally:
            db.close()

    def _save_cursor(self, user_id: str, cursor: str):
        """Save sync cursor for next fetch."""
        db = SessionLocal()
        try:
            db.execute(
                text("""
                    UPDATE plaid_items
                    SET cursor = :cursor
                    WHERE user_id = :u
                """),
                {"cursor": cursor, "u": user_id}
            )
            db.commit()
        finally:
            db.close()

    def get_accounts(self, user_id: str) -> dict[str, Any]:
        """Get all accounts for a connected user."""
        access_token, _ = self._get_access_token(user_id)

        if not access_token:
            return {"error": "No bank connected"}

        request = AccountsGetRequest(access_token=access_token)
        response = self.client.accounts_get(request)
        return response.to_dict()

    def get_transactions(self, user_id: str) -> dict[str, Any]:
        """Get transactions using Plaid Sync API."""
        access_token, cursor = self._get_access_token(user_id)

        if not access_token:
            return {"error": "No bank connected"}

        all_added = []
        all_modified = []
        all_removed = []
        has_more = True

        while has_more:
            request = TransactionsSyncRequest(
                access_token=access_token,
                cursor=cursor
            )
            response = self.client.transactions_sync(request).to_dict()

            all_added.extend(response.get("added", []))
            all_modified.extend(response.get("modified", []))
            all_removed.extend(response.get("removed", []))

            cursor = response.get("next_cursor", "")
            has_more = response.get("has_more", False)

        self._save_cursor(user_id, cursor)

        return {
            "added": all_added,
            "modified": all_modified,
            "removed": all_removed,
            "transactions": all_added  # Backward compatibility
        }

    def get_insights(self, user_id: str) -> dict[str, Any]:
        """Get spending insights aggregated by category and day."""
        access_token, _ = self._get_access_token(user_id)

        if not access_token:
            return {"error": "No bank connected"}

        # Fetch all transactions
        cursor = ""
        all_transactions = []
        has_more = True

        while has_more:
            request = TransactionsSyncRequest(
                access_token=access_token,
                cursor=cursor
            )
            response = self.client.transactions_sync(request).to_dict()

            all_transactions.extend(response.get("added", []))
            cursor = response.get("next_cursor", "")
            has_more = response.get("has_more", False)

        # Aggregate spending
        by_category = defaultdict(float)
        by_day = defaultdict(float)

        for tx in all_transactions:
            amount = float(tx.get("amount", 0))

            if amount <= 0:
                continue

            cat = tx.get("category")
            if isinstance(cat, list) and len(cat) > 0:
                category_name = cat[0]
            else:
                category_name = (
                    tx.get("personal_finance_category", {})
                    .get("primary")
                    or "Other"
                )

            by_category[category_name] += amount

            day = tx.get("date")
            if day:
                by_day[day] += amount

        # Format for frontend
        category_labels = list(by_category.keys())
        category_values = [round(by_category[k], 2) for k in category_labels]

        day_labels = sorted(by_day.keys())
        day_values = [round(by_day[d], 2) for d in day_labels]

        return {
            "by_category": {
                "labels": category_labels,
                "values": category_values
            },
            "by_day": {
                "labels": day_labels,
                "values": day_values
            }
        }

    def get_normalized_transactions(self, user_id: str) -> list[dict]:
        """
        Return all Plaid transactions in the unified normalized format.
        Starts from an empty cursor so we always read the full history —
        this is a read-only call and intentionally does NOT advance the
        stored sync cursor used by get_transactions().
        """
        access_token, _ = self._get_access_token(user_id)
        if not access_token:
            return []

        cursor = ""
        raw: list = []
        has_more = True

        while has_more:
            request = TransactionsSyncRequest(
                access_token=access_token,
                cursor=cursor,
            )
            response = self.client.transactions_sync(request).to_dict()
            raw.extend(response.get("added", []))
            cursor = response.get("next_cursor", "")
            has_more = response.get("has_more", False)

        normalized = []
        for tx in raw:
            amount = float(tx.get("amount", 0))
            if amount <= 0:
                continue  # Skip credits / refunds

            # Category: prefer explicit list, fall back to PFC primary, then "Other"
            cat = tx.get("category")
            if isinstance(cat, list) and cat:
                category = cat[0]
            else:
                category = (
                    (tx.get("personal_finance_category") or {}).get("primary")
                    or "Other"
                )

            # Date can be a date object or an ISO string
            date_val = tx.get("date")
            date_str = (
                date_val.isoformat()
                if hasattr(date_val, "isoformat")
                else str(date_val)
            )

            normalized.append({
                "transaction_id": tx.get("transaction_id", ""),
                "amount":         round(amount, 2),
                "date":           date_str,
                "description":    tx.get("name", ""),
                "category":       category,
                "provider":       "plaid",
                "currency":       tx.get("iso_currency_code") or "USD",
            })

        return normalized
