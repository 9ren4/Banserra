"""
TrueLayerProvider
=================
TrueLayer Data API implementation of BankProvider.

Auth flow (OAuth 2.0 Authorization Code):
  1. Frontend calls GET /connect/truelayer  → {auth_url}
  2. Frontend redirects user to auth_url
  3. User picks their bank and logs in on TrueLayer's hosted page
  4. TrueLayer redirects to /callback/truelayer?code={code}
  5. Backend exchanges code for access_token + refresh_token, stores them
  6. Subsequent calls to get_accounts / get_normalized_transactions use the token

Sandbox credentials (use these in TrueLayer's mock bank):
  Username: john  |  Password: doe

TrueLayer docs: https://docs.truelayer.com
"""

import os
import time
from collections import defaultdict
from typing import Any
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from sqlalchemy import text

from database import SessionLocal
from providers.base import BankProvider

load_dotenv()

_TL_ENV    = os.getenv("TRUELAYER_ENV", "sandbox")
_AUTH_BASE = "https://auth.truelayer.com"      if _TL_ENV == "production" else "https://auth.truelayer-sandbox.com"
_DATA_BASE = "https://api.truelayer.com"       if _TL_ENV == "production" else "https://api.truelayer-sandbox.com"

_SCOPES = "info accounts balance transactions offline_access"


class TrueLayerProvider(BankProvider):
    """
    TrueLayer Open Banking provider.
    Handles UK/EU bank connections via TrueLayer's Data API.
    """

    def __init__(self):
        self.client_id     = os.getenv("TRUELAYER_CLIENT_ID")
        self.client_secret = os.getenv("TRUELAYER_CLIENT_SECRET")
        self.redirect_uri  = os.getenv("TRUELAYER_REDIRECT_URI",
                                       "http://localhost:8095/callback/truelayer")

        if not self.client_id or not self.client_secret:
            raise RuntimeError(
                "Missing TrueLayer credentials "
                "(TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET)"
            )

        self._ensure_table()

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    def _ensure_table(self):
        db = SessionLocal()
        try:
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS truelayer_connections (
                    id            SERIAL PRIMARY KEY,
                    user_id       VARCHAR NOT NULL UNIQUE,
                    access_token  TEXT    NOT NULL,
                    refresh_token TEXT,
                    token_expiry  BIGINT  NOT NULL DEFAULT 0,
                    created_at    TIMESTAMP DEFAULT NOW(),
                    updated_at    TIMESTAMP DEFAULT NOW()
                )
            """))
            db.commit()
        finally:
            db.close()

    def _save_tokens(
        self,
        user_id: str,
        access_token: str,
        refresh_token: str | None,
        expires_in: int,
    ):
        expiry = int(time.time()) + expires_in
        db = SessionLocal()
        try:
            db.execute(text("""
                INSERT INTO truelayer_connections
                    (user_id, access_token, refresh_token, token_expiry, updated_at)
                VALUES (:uid, :at, :rt, :exp, NOW())
                ON CONFLICT (user_id) DO UPDATE
                    SET access_token  = EXCLUDED.access_token,
                        refresh_token = EXCLUDED.refresh_token,
                        token_expiry  = EXCLUDED.token_expiry,
                        updated_at    = NOW()
            """), {
                "uid": user_id,
                "at":  access_token,
                "rt":  refresh_token,
                "exp": expiry,
            })
            db.commit()
        finally:
            db.close()

    def _load_tokens(self, user_id: str) -> dict | None:
        db = SessionLocal()
        try:
            row = db.execute(text("""
                SELECT access_token, refresh_token, token_expiry
                FROM truelayer_connections
                WHERE user_id = :uid
            """), {"uid": user_id}).fetchone()
            if not row:
                return None
            return {
                "access_token":  row[0],
                "refresh_token": row[1],
                "token_expiry":  row[2],
            }
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    def _get_access_token(self, user_id: str) -> str:
        """Return a valid access token, refreshing via refresh_token if needed."""
        tokens = self._load_tokens(user_id)
        if not tokens:
            raise ValueError(f"No TrueLayer connection found for user '{user_id}'")

        # Still valid (with 60-second buffer)
        if time.time() < tokens["token_expiry"] - 60:
            return tokens["access_token"]

        # Attempt refresh
        if not tokens["refresh_token"]:
            raise ValueError("TrueLayer token expired and no refresh_token available.")

        resp = requests.post(
            f"{_AUTH_BASE}/connect/token",
            data={
                "grant_type":    "refresh_token",
                "client_id":     self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": tokens["refresh_token"],
            },
            timeout=15,
        )
        resp.raise_for_status()
        new = resp.json()
        self._save_tokens(
            user_id,
            new["access_token"],
            new.get("refresh_token", tokens["refresh_token"]),
            new.get("expires_in", 3600),
        )
        return new["access_token"]

    def _auth_headers(self, user_id: str) -> dict:
        return {"Authorization": f"Bearer {self._get_access_token(user_id)}"}

    # ------------------------------------------------------------------
    # TrueLayer-specific public methods (called from routes)
    # ------------------------------------------------------------------

    def get_auth_url(self, user_id: str) -> str:
        """Build the TrueLayer authorization URL to redirect the user to."""
        params = {
            "response_type": "code",
            "client_id":     self.client_id,
            "scope":         _SCOPES,
            "redirect_uri":  self.redirect_uri,
            "providers":     "uk-ob-all uk-oauth-all",
            "state":         user_id,   # we echo this back in the callback
        }
        return f"{_AUTH_BASE}/?{urlencode(params)}"

    def handle_callback(self, code: str, user_id: str) -> dict[str, Any]:
        """
        Exchange the authorization code for tokens and persist them.
        Called from GET /callback/truelayer?code=...&state=...
        """
        resp = requests.post(
            f"{_AUTH_BASE}/connect/token",
            data={
                "grant_type":    "authorization_code",
                "client_id":     self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri":  self.redirect_uri,
                "code":          code,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        self._save_tokens(
            user_id,
            data["access_token"],
            data.get("refresh_token"),
            data.get("expires_in", 3600),
        )
        return {"status": "connected", "provider": "truelayer"}

    # ------------------------------------------------------------------
    # BankProvider interface — data access
    # ------------------------------------------------------------------

    def get_accounts(self, user_id: str) -> dict[str, Any]:
        resp = requests.get(
            f"{_DATA_BASE}/data/v1/accounts",
            headers=self._auth_headers(user_id),
            timeout=15,
        )
        resp.raise_for_status()
        raw_accounts = resp.json().get("results", [])

        accounts = []
        for acct in raw_accounts:
            accounts.append({
                "account_id":   acct.get("account_id"),
                "name":         acct.get("display_name") or acct.get("account_type"),
                "currency":     acct.get("currency"),
                "account_type": acct.get("account_type"),
                "provider":     "truelayer",
            })

        return {"accounts": accounts}

    def get_transactions(self, user_id: str) -> dict[str, Any]:
        """Raw TrueLayer transactions for all linked accounts."""
        accounts_data = self.get_accounts(user_id)
        all_txs = []

        for acct in accounts_data.get("accounts", []):
            account_id = acct["account_id"]
            try:
                resp = requests.get(
                    f"{_DATA_BASE}/data/v1/accounts/{account_id}/transactions",
                    headers=self._auth_headers(user_id),
                    timeout=15,
                )
                resp.raise_for_status()
                all_txs.extend(resp.json().get("results", []))
            except Exception:
                pass

        return {"transactions": all_txs}

    def get_normalized_transactions(self, user_id: str) -> list[dict[str, Any]]:
        """
        Return debit transactions in the unified normalized format.
        TrueLayer transaction_type: 'DEBIT' = expense, 'CREDIT' = income.
        """
        accounts_data = self.get_accounts(user_id)
        normalized = []

        for acct in accounts_data.get("accounts", []):
            account_id = acct["account_id"]
            try:
                resp = requests.get(
                    f"{_DATA_BASE}/data/v1/accounts/{account_id}/transactions",
                    headers=self._auth_headers(user_id),
                    timeout=15,
                )
                resp.raise_for_status()
                transactions = resp.json().get("results", [])
            except Exception:
                continue

            for tx in transactions:
                # Only include debits (expenses)
                if tx.get("transaction_type", "").upper() != "DEBIT":
                    continue

                amount   = round(abs(float(tx.get("amount", 0))), 2)
                currency = tx.get("currency", "GBP")

                description = (
                    tx.get("merchant_name")
                    or tx.get("description")
                    or "Unknown"
                )

                # TrueLayer provides transaction_category for most banks
                category = tx.get("transaction_category") or "Other"

                # Timestamp format: "2021-03-15T00:00:00+00:00" → take date part
                # Some banks return booking_datetime instead of timestamp
                raw_ts   = (
                    tx.get("timestamp")
                    or tx.get("booking_datetime")
                    or tx.get("value_datetime")
                    or ""
                )
                date_str = raw_ts[:10] if raw_ts else ""

                tx_id = (
                    tx.get("transaction_id")
                    or tx.get("normalised_provider_transaction_id")
                    or f"{account_id}-{date_str}-{amount}"
                )

                normalized.append({
                    "transaction_id": tx_id,
                    "amount":         amount,
                    "date":           date_str,
                    "description":    description,
                    "category":       category,
                    "provider":       "truelayer",
                    "currency":       currency,
                })

        return normalized

    def get_insights(self, user_id: str) -> dict[str, Any]:
        txs = self.get_normalized_transactions(user_id)
        if not txs:
            return {"error": "No TrueLayer bank connected"}

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
            "by_category": {"labels": cat_labels, "values": cat_values},
            "by_day":      {"labels": day_labels,  "values": day_values},
        }

    # ------------------------------------------------------------------
    # Base class stubs (TrueLayer doesn't use Plaid-style token exchange)
    # ------------------------------------------------------------------

    def create_link(self, _user_id: str) -> dict[str, Any]:
        raise NotImplementedError(
            "TrueLayer uses get_auth_url(), not create_link(). "
            "Use GET /connect/truelayer."
        )

    def exchange_token(self, _user_id: str, _public_token: str) -> dict[str, Any]:
        raise NotImplementedError(
            "TrueLayer uses handle_callback(), not exchange_token(). "
            "Use GET /callback/truelayer."
        )
