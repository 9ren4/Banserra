"""
Banserra FastAPI Application
============================
Multi-provider banking aggregation API.
Supports Plaid (US) and TrueLayer (EU/UK) simultaneously.

Connection flows
----------------
Plaid:
  POST /connect/plaid          → {link_token}
  POST /exchange-token/plaid   → {status, item_id}

TrueLayer:
  GET  /connect/truelayer      → {auth_url}  (redirect user here)
  GET  /callback/truelayer     → stores tokens, redirects to dashboard

Unified data (reads from ALL connected providers):
  GET  /accounts
  GET  /transactions
  GET  /insights

Legacy aliases kept for backward-compatibility:
  POST /link_token      → same as POST /connect/plaid
  POST /exchange_token  → same as POST /exchange-token/plaid
"""

import os
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from providers.plaid import PlaidProvider
from providers.truelayer import TrueLayerProvider

load_dotenv()

# --------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------

app = FastAPI(
    title="Banserra API",
    description="Multi-provider banking aggregation API",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Provider instances (optional — only created when credentials exist)
# --------------------------------------------------------------------------

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL  = os.getenv("BACKEND_URL",  "http://localhost:8095")

plaid_provider:      PlaidProvider      | None = None
truelayer_provider:  TrueLayerProvider  | None = None

try:
    plaid_provider = PlaidProvider()
except RuntimeError as e:
    print(f"[Banserra] Plaid disabled: {e}")

try:
    truelayer_provider = TrueLayerProvider()
except RuntimeError as e:
    print(f"[Banserra] TrueLayer disabled: {e}")

# --------------------------------------------------------------------------
# Request models
# --------------------------------------------------------------------------

class ExchangeTokenRequest(BaseModel):
    public_token: str

# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "project": "banserra",
        "providers": {
            "plaid":      plaid_provider     is not None,
            "truelayer":  truelayer_provider is not None,
        },
    }

# --------------------------------------------------------------------------
# Plaid connection
# --------------------------------------------------------------------------

@app.post("/connect/plaid")
def connect_plaid(user_id: str = "banserra-user-1"):
    """Initiate Plaid Link — returns {link_token} for the frontend."""
    if not plaid_provider:
        raise HTTPException(503, "Plaid not configured")
    return plaid_provider.create_link(user_id)


@app.post("/exchange-token/plaid")
def exchange_token_plaid(
    data: ExchangeTokenRequest,
    user_id: str = "banserra-user-1",
):
    """Exchange Plaid public_token for a persistent access_token."""
    if not plaid_provider:
        raise HTTPException(503, "Plaid not configured")
    return plaid_provider.exchange_token(user_id, data.public_token)


# Legacy aliases — keeps existing frontend working without changes
@app.post("/link_token")
def create_link_token_legacy(user_id: str = "banserra-user-1"):
    if not plaid_provider:
        raise HTTPException(503, "Plaid not configured")
    return plaid_provider.create_link(user_id)


@app.post("/exchange_token")
def exchange_token_legacy(
    data: ExchangeTokenRequest,
    user_id: str = "banserra-user-1",
):
    if not plaid_provider:
        raise HTTPException(503, "Plaid not configured")
    return plaid_provider.exchange_token(user_id, data.public_token)

# --------------------------------------------------------------------------
# TrueLayer connection
# --------------------------------------------------------------------------

@app.get("/connect/truelayer")
def connect_truelayer(user_id: str = "banserra-user-1"):
    """
    Returns {auth_url} — the frontend should redirect the user there.
    TrueLayer will redirect back to /callback/truelayer after auth.
    """
    if not truelayer_provider:
        raise HTTPException(503, "TrueLayer not configured")
    auth_url = truelayer_provider.get_auth_url(user_id)
    return {"provider": "truelayer", "auth_url": auth_url}


@app.get("/callback/truelayer")
def callback_truelayer(
    code:  str = Query(..., description="Authorization code from TrueLayer"),
    state: str = Query("banserra-user-1", description="user_id echoed back"),
):
    """
    TrueLayer redirects here after the user authorises bank access.
    Exchanges code for tokens, stores them, then redirects to the dashboard.
    """
    if not truelayer_provider:
        raise HTTPException(503, "TrueLayer not configured")

    truelayer_provider.handle_callback(code, user_id=state)
    return RedirectResponse(url=f"{FRONTEND_URL}/dashboard")

# --------------------------------------------------------------------------
# Unified accounts (all providers)
# --------------------------------------------------------------------------

@app.get("/accounts")
def get_accounts(user_id: str = "banserra-user-1"):
    """Return accounts from every connected provider."""
    result: list = []

    if plaid_provider:
        try:
            plaid_data = plaid_provider.get_accounts(user_id)
            for acct in plaid_data.get("accounts", []):
                result.append({**acct, "provider": "plaid"})
        except Exception:
            pass

    if truelayer_provider:
        try:
            tl_data = truelayer_provider.get_accounts(user_id)
            result.extend(tl_data.get("accounts", []))
        except Exception:
            pass

    return {"accounts": result}

# --------------------------------------------------------------------------
# Unified transactions (all providers, normalized)
# --------------------------------------------------------------------------

@app.get("/transactions")
def get_transactions(user_id: str = "banserra-user-1"):
    """
    Fetch and merge transactions from every connected provider.
    All items are in the unified normalized format:

        {
          "transaction_id": str,
          "amount":         float,   # positive = expense
          "date":           str,     # YYYY-MM-DD
          "description":    str,
          "category":       str,
          "provider":       "plaid" | "truelayer",
          "currency":       str,
        }
    """
    all_txs: list[dict] = []

    if plaid_provider:
        try:
            all_txs.extend(plaid_provider.get_normalized_transactions(user_id))
        except Exception as exc:
            print(f"[Banserra] Plaid transactions error: {exc}")

    if truelayer_provider:
        try:
            all_txs.extend(truelayer_provider.get_normalized_transactions(user_id))
        except Exception as exc:
            print(f"[Banserra] TrueLayer transactions error: {exc}")

    if not all_txs:
        return {"error": "No bank connected", "transactions": []}

    # Deduplicate — prefix provider name to avoid cross-provider ID collisions
    seen: set[str] = set()
    unique: list[dict] = []
    for tx in all_txs:
        key = f"{tx['provider']}:{tx['transaction_id']}"
        if key not in seen:
            seen.add(key)
            unique.append(tx)

    # Sort newest-first
    unique.sort(key=lambda t: t["date"], reverse=True)

    return {"transactions": unique, "count": len(unique)}

# --------------------------------------------------------------------------
# Unified insights (all providers)
# --------------------------------------------------------------------------

@app.get("/insights")
def get_insights(user_id: str = "banserra-user-1"):
    """
    Aggregate spending by category and by day across ALL connected providers.
    Returns data formatted for chart.js (labels + values arrays).
    """
    all_txs: list[dict] = []

    if plaid_provider:
        try:
            all_txs.extend(plaid_provider.get_normalized_transactions(user_id))
        except Exception as exc:
            print(f"[Banserra] Plaid insights error: {exc}")

    if truelayer_provider:
        try:
            all_txs.extend(truelayer_provider.get_normalized_transactions(user_id))
        except Exception as exc:
            print(f"[Banserra] TrueLayer insights error: {exc}")

    if not all_txs:
        return {"error": "No bank connected"}

    by_category: dict[str, float] = defaultdict(float)
    by_day:      dict[str, float] = defaultdict(float)

    for tx in all_txs:
        amount = tx["amount"]
        if amount <= 0:
            continue
        by_category[tx["category"]] += amount
        by_day[tx["date"]]           += amount

    cat_labels = list(by_category.keys())
    cat_values = [round(by_category[k], 2) for k in cat_labels]

    day_labels = sorted(by_day.keys())
    day_values = [round(by_day[d], 2) for d in day_labels]

    return {
        "by_category": {"labels": cat_labels, "values": cat_values},
        "by_day":      {"labels": day_labels,  "values": day_values},
    }
