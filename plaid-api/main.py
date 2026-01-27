import os
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")

if not PLAID_CLIENT_ID or not PLAID_SECRET:
    raise RuntimeError("Missing PLAID_CLIENT_ID or PLAID_SECRET in plaid-api/.env")

host = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}.get(PLAID_ENV, "https://sandbox.plaid.com")

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

@app.get("/health")
def health():
    return {"status": "ok", "project": "banserra"}

@app.post("/link_token")
def create_link_token():
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id="banserra-user-1"),
        client_name="banserra",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
    )
    response = plaid_client.link_token_create(request)
    return response.to_dict()
