import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest
)
from datetime import date, timedelta
from collections import defaultdict


load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")

host = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}[PLAID_ENV]

configuration = Configuration(
    host=host,
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
    },
)

api_client = ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TEMP storage (memory only)
ACCESS_TOKENS = {}

# ---------------- ROUTES ----------------

@app.get("/health")
def health():
    return {"status": "ok", "project": "banserra"}


@app.post("/link_token")
def create_link_token():
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(
            client_user_id="banserra-user-1"
        ),
        client_name="banserra",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
    )

    response = plaid_client.link_token_create(request)
    return response.to_dict()




class ExchangeTokenRequest(BaseModel):
    public_token: str


@app.post("/exchange_token")
def exchange_public_token(data: ExchangeTokenRequest):
    request = ItemPublicTokenExchangeRequest(
        public_token=data.public_token
    )

    response = plaid_client.item_public_token_exchange(request)

    ACCESS_TOKENS["banserra-user-1"] = response["access_token"]

    return {
        "status": "connected",
        "item_id": response["item_id"]
    }


@app.get("/transactions")
def get_transactions():
    access_token = ACCESS_TOKENS.get("banserra-user-1")

    if not access_token:
        return {"error": "No bank connected"}

    start_date = date.today() - timedelta(days=30)
    end_date = date.today()

    request = TransactionsGetRequest(
        access_token=access_token,
        start_date=start_date,
        end_date=end_date,
        options=TransactionsGetRequestOptions(
            count=50,
            offset=0
        )
    )

    response = plaid_client.transactions_get(request)

    return response.to_dict()

@app.get("/insights")
def get_insights():
    access_token = ACCESS_TOKENS.get("banserra-user-1")
    if not access_token:
        return {"error": "No bank connected"}

    start_date = date.today() - timedelta(days=30)
    end_date = date.today()

    request = TransactionsGetRequest(
        access_token=access_token,
        start_date=start_date,
        end_date=end_date,
        options=TransactionsGetRequestOptions(count=200, offset=0)
    )

    resp = plaid_client.transactions_get(request).to_dict()
    txs = resp.get("transactions", [])

    by_category = defaultdict(float)
    by_day = defaultdict(float)

    for tx in txs:
        amount = float(tx.get("amount", 0))

        # Only count spending (positive amounts are usually spend in Plaid sandbox)
        if amount <= 0:
            continue

        # Category handling: Plaid provides "category" as a list sometimes
        cat = tx.get("category")
        if isinstance(cat, list) and len(cat) > 0:
            category_name = cat[0]
        else:
            category_name = tx.get("personal_finance_category", {}).get("primary") or "Other"

        by_category[category_name] += amount

        day = tx.get("date")  # "YYYY-MM-DD"
        if day:
            by_day[day] += amount

    # Sort for frontend
    category_labels = list(by_category.keys())
    category_values = [round(by_category[k], 2) for k in category_labels]

    day_labels = sorted(by_day.keys())
    day_values = [round(by_day[d], 2) for d in day_labels]

    return {
        "by_category": {"labels": category_labels, "values": category_values},
        "by_day": {"labels": day_labels, "values": day_values},
    }


'''
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
'''