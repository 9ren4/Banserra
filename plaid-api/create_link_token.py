import os
from dotenv import load_dotenv
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

load_dotenv()

PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')

configuration = Configuration(
    host='https://sandbox.plaid.com',
    api_key={'clientId': PLAID_CLIENT_ID, 'secret': PLAID_SECRET},
)

api_client = ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

request = LinkTokenCreateRequest(
    user=LinkTokenCreateRequestUser(client_user_id='banserra-user-1'),
    client_name='banserra',
    products=[Products('transactions')],
    country_codes=[CountryCode('US')],
    language='en',
)

response = plaid_client.link_token_create(request)
data = response.to_dict()

print('Link Token Created Successfully!')
print('link_token:', data.get('link_token'))
print('expiration:', data.get('expiration'))
print('request_id:', data.get('request_id'))
