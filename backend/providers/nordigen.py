"""
NordigenProvider
================
GoCardless Bank Account Data (Nordigen) implementation of BankProvider.

Auth flow (different from Plaid):
  1. Frontend calls POST /connect/nordigen  {institution_id, redirect_url}
  2. Backend creates a requisition → returns {link: "https://..."}
  3. User is redirected to the Nordigen consent screen
  4. After consent, Nordigen redirects to redirect_url?ref={requisition_id}
  5. Backend GET /callback/nordigen stores account_ids for the user
  6. Subsequent calls to get_normalized_transactions() read from those accounts

Nordigen API base: https://bankaccountdata.gocardless.com/api/v2
"""

import json
import os
import time
from collections import defaultdict
from typing import Any

import requests
from dotenv import load_dotenv
from sqlalchemy import text

from database import SessionLocal
from providers.base import BankProvider

load_dotenv()

_NORDIGEN_BASE = "https://bankaccountdata.gocardless.com/api/v2"


class NordigenProvider(BankProvider):
    """
    GoCardless / Nordigen Open Banking provider.
    Handles EU/UK bank connections via the PSD2 / Open Banking APIs.
    """

    def __init__(self):
        self.secret_id = os.getenv("NORDIGEN_SECRET_ID")
        self.secret_key = os.getenv("NORDIGEN_SECRET_KEY")

        if not self.secret_id or not self.secret_key:
            raise RuntimeError(
                "Missing Nordigen credentials (NORDIGEN_SECRET_ID, NORDIGEN_SECRET_KEY)"
            )

        # Instance-level token cache — avoids a round-trip on every request
        self._access_token: str | None = None
        self._token_expiry: float = 0.0

        # Ensure the nordigen_connections table exists
        self._ensure_table()

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    def _get_token(self) -> str:
        """Return a valid Nordigen access token, refreshing if expired."""
        if self._access_token and time.time() < self._token_expiry - 60:
            return self._access_token

        resp = requests.post(
            f"{_NORDIGEN_BASE}/token/new/",
            json={"secret_id": self.secret_id, "secret_key": self.secret_key},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        self._access_token = data["access"]
        # access_expires is in seconds from now; default 86400 (24 h)
        self._token_expiry = time.time() + data.get("access_expires", 86400)
        return self._access_token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._get_token()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    def _ensure_table(self):
        """Create nordigen_connections table if it doesn't exist yet."""
        db = SessionLocal()
        try:
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS nordigen_connections (
                    id              SERIAL PRIMARY KEY,
                    user_id         VARCHAR NOT NULL,
                    requisition_id  VARCHAR NOT NULL UNIQUE,
                    account_ids     TEXT    NOT NULL DEFAULT '[]',
                    status          VARCHAR NOT NULL DEFAULT 'pending',
                    created_at      TIMESTAMP DEFAULT NOW()
                )
            """))
            db.commit()
        finally:
            db.close()

    def _save_requisition(self, user_id: str, requisition_id: str):
        """Persist a new requisition (status=pending, no accounts yet)."""
        db = SessionLocal()
        try:
            db.execute(
                text("""
                    INSERT INTO nordigen_connections
                        (user_id, requisition_id, account_ids, status)
                    VALUES (:uid, :req_id, '[]', 'pending')
                    ON CONFLICT (requisition_id) DO NOTHING
                """),
                {"uid": user_id, "req_id": requisition_id},
            )
            db.commit()
        finally:
            db.close()

    def _update_requisition(
        self, requisition_id: str, account_ids: list[str], status: str
    ):
        """Update account_ids and status after the user authorises."""
        db = SessionLocal()
        try:
            db.execute(
                text("""
                    UPDATE nordigen_connections
                    SET account_ids = :aids,
                        status      = :status
                    WHERE requisition_id = :req_id
                """),
                {
                    "aids":   json.dumps(account_ids),
                    "status": status,
                    "req_id": requisition_id,
                },
            )
            db.commit()
        finally:
            db.close()

    def _get_connections(self, user_id: str) -> list[dict]:
        """
        Return all linked Nordigen connections for a user.
        Each item: {requisition_id, account_ids: list[str]}
        """
        db = SessionLocal()
        try:
            rows = db.execute(
                text("""
                    SELECT requisition_id, account_ids
                    FROM nordigen_connections
                    WHERE user_id = :uid
                      AND status  = 'linked'
                    ORDER BY created_at DESC
                """),
                {"uid": user_id},
            ).fetchall()
            return [
                {
                    "requisition_id": row[0],
                    "account_ids":    json.loads(row[1] or "[]"),
                }
                for row in rows
            ]
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Nordigen-specific public methods (called directly from routes)
    # ------------------------------------------------------------------

    def create_requisition(
        self,
        user_id: str,
        institution_id: str,
        redirect_url: str,
    ) -> dict[str, Any]:
        """
        Create a Nordigen requisition and return the consent link.
        The frontend should redirect the user to data["link"].
        """
        resp = requests.post(
            f"{_NORDIGEN_BASE}/requisitions/",
            headers=self._headers(),
            json={
                "redirect":       redirect_url,
                "institution_id": institution_id,
                "reference":      f"{user_id}-{int(time.time())}",
                "user_language":  "EN",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        requisition_id = data["id"]
        self._save_requisition(user_id, requisition_id)

        return {
            "provider":        "nordigen",
            "requisition_id":  requisition_id,
            "link":            data["link"],
        }

    def handle_callback(self, user_id: str, requisition_id: str) -> dict[str, Any]:
        """
        Called after Nordigen redirects back with ?ref={requisition_id}.
        Fetches the requisition, extracts account_ids, and persists them.
        """
        resp = requests.get(
            f"{_NORDIGEN_BASE}/requisitions/{requisition_id}/",
            headers=self._headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        status     = data.get("status", "")
        account_ids: list[str] = data.get("accounts", [])

        # Nordigen status "LN" means "linked"
        db_status = "linked" if status == "LN" else status.lower()
        self._update_requisition(requisition_id, account_ids, db_status)

        return {
            "status":      db_status,
            "account_ids": account_ids,
        }

    def get_institutions(self, country: str = "GB") -> list[dict]:
        """Helper: list institutions for a given country (e.g. 'GB', 'DE')."""
        resp = requests.get(
            f"{_NORDIGEN_BASE}/institutions/",
            headers=self._headers(),
            params={"country": country},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # BankProvider interface — data access
    # ------------------------------------------------------------------

    def get_accounts(self, user_id: str) -> dict[str, Any]:
        """Return account metadata for all linked Nordigen connections."""
        connections = self._get_connections(user_id)
        if not connections:
            return {"accounts": [], "error": "No Nordigen bank connected"}

        accounts = []
        for conn in connections:
            for account_id in conn["account_ids"]:
                try:
                    resp = requests.get(
                        f"{_NORDIGEN_BASE}/accounts/{account_id}/details/",
                        headers=self._headers(),
                        timeout=15,
                    )
                    resp.raise_for_status()
                    detail = resp.json().get("account", {})
                    accounts.append({
                        "account_id":      account_id,
                        "requisition_id":  conn["requisition_id"],
                        "iban":            detail.get("iban"),
                        "name":            detail.get("name") or detail.get("ownerName"),
                        "currency":        detail.get("currency"),
                        "product":         detail.get("product"),
                        "provider":        "nordigen",
                    })
                except Exception:
                    accounts.append({
                        "account_id": account_id,
                        "provider":   "nordigen",
                        "error":      "Could not fetch account details",
                    })

        return {"accounts": accounts}

    def get_transactions(self, user_id: str) -> dict[str, Any]:
        """
        Raw Nordigen transactions (booked + pending) for all linked accounts.
        Returns provider-native format; use get_normalized_transactions() for
        the unified cross-provider format.
        """
        connections = self._get_connections(user_id)
        if not connections:
            return {"transactions": [], "error": "No Nordigen bank connected"}

        all_booked:  list = []
        all_pending: list = []

        for conn in connections:
            for account_id in conn["account_ids"]:
                try:
                    resp = requests.get(
                        f"{_NORDIGEN_BASE}/accounts/{account_id}/transactions/",
                        headers=self._headers(),
                        timeout=15,
                    )
                    resp.raise_for_status()
                    txs = resp.json().get("transactions", {})
                    all_booked.extend(txs.get("booked", []))
                    all_pending.extend(txs.get("pending", []))
                except Exception:
                    pass

        return {
            "booked":       all_booked,
            "pending":      all_pending,
            "transactions": all_booked,  # primary list for backward compat
        }

    def get_normalized_transactions(self, user_id: str) -> list[dict[str, Any]]:
        """
        Return booked Nordigen transactions in the unified normalized format.
        Skips credits (amount > 0 in Nordigen = money into account).
        """
        connections = self._get_connections(user_id)
        if not connections:
            return []

        normalized = []

        for conn in connections:
            for account_id in conn["account_ids"]:
                try:
                    resp = requests.get(
                        f"{_NORDIGEN_BASE}/accounts/{account_id}/transactions/",
                        headers=self._headers(),
                        timeout=15,
                    )
                    resp.raise_for_status()
                    booked = resp.json().get("transactions", {}).get("booked", [])
                except Exception:
                    continue

                for tx in booked:
                    tx_amount_data = tx.get("transactionAmount", {})
                    raw_amount = float(tx_amount_data.get("amount", 0))
                    currency   = tx_amount_data.get("currency", "EUR")

                    # In Nordigen convention: negative amount = debit (expense)
                    # Positive = credit (income). We want expenses only.
                    if raw_amount >= 0:
                        continue

                    amount = round(abs(raw_amount), 2)

                    # Best-effort description: structured → unstructured → creditor
                    description = (
                        tx.get("remittanceInformationStructured")
                        or tx.get("remittanceInformationUnstructured")
                        or tx.get("creditorName")
                        or "Unknown"
                    )

                    # Nordigen doesn't provide categories — fall back to "Other"
                    category = tx.get("proprietaryBankTransactionCode") or "Other"

                    date_str = tx.get("bookingDate") or tx.get("valueDate", "")

                    tx_id = (
                        tx.get("transactionId")
                        or tx.get("internalTransactionId")
                        or f"{account_id}-{date_str}-{raw_amount}"
                    )

                    normalized.append({
                        "transaction_id": tx_id,
                        "amount":         amount,
                        "date":           date_str,
                        "description":    description,
                        "category":       category,
                        "provider":       "nordigen",
                        "currency":       currency,
                    })

        return normalized

    def get_insights(self, user_id: str) -> dict[str, Any]:
        """Aggregate normalized Nordigen transactions into chart-ready data."""
        txs = self.get_normalized_transactions(user_id)
        if not txs:
            return {"error": "No Nordigen bank connected"}

        by_category: dict = defaultdict(float)
        by_day:      dict = defaultdict(float)

        for tx in txs:
            by_category[tx["category"]] += tx["amount"]
            by_day[tx["date"]]           += tx["amount"]

        cat_labels = list(by_category.keys())
        cat_values = [round(by_category[k], 2) for k in cat_labels]

        day_labels = sorted(by_day.keys())
        day_values = [round(by_day[d], 2) for d in day_labels]

        return {
            "by_category": {"labels": cat_labels,  "values": cat_values},
            "by_day":      {"labels": day_labels,   "values": day_values},
        }

    # ------------------------------------------------------------------
    # Base class stubs (Nordigen doesn't use Plaid-style token exchange)
    # ------------------------------------------------------------------

    def create_link(self, _user_id: str) -> dict[str, Any]:
        """Not used for Nordigen — call create_requisition() instead."""
        raise NotImplementedError(
            "Nordigen uses create_requisition(), not create_link(). "
            "Use POST /connect/nordigen."
        )

    def exchange_token(self, _user_id: str, _public_token: str) -> dict[str, Any]:
        """Not applicable to Nordigen — authorization is handled via callback."""
        raise NotImplementedError(
            "Nordigen uses handle_callback(), not exchange_token(). "
            "Use GET /callback/nordigen."
        )
