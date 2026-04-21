# Banserra — Financial Insights Dashboard

Banserra is a full-stack financial aggregation app built with Next.js, FastAPI, and PostgreSQL. It connects to multiple bank providers simultaneously and unifies accounts, transactions, and spending insights into a single dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS |
| Backend | FastAPI 0.128 + Python |
| Database | PostgreSQL (via SQLAlchemy + psycopg2) |
| Charts | Chart.js + react-chartjs-2 |
| Providers | Plaid (US), TrueLayer (EU/UK) |

## Architecture

The backend exposes a unified API that aggregates data from all connected providers. Each provider implements the `BankProvider` abstract base class (`backend/providers/base.py`), ensuring a consistent interface for accounts, transactions, and insights.

```
User
 └── Frontend (Next.js :3000)
      └── FastAPI Backend (:8095)
           ├── PlaidProvider      → Plaid API (US)
           └── TrueLayerProvider  → TrueLayer API (EU/UK)
                    └── PostgreSQL (tokens, accounts)
```

Providers are **optional** — the backend starts cleanly even if credentials for one provider are missing. Only configured providers appear in responses.

## API Endpoints

### Connection

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/connect/plaid` | Create a Plaid Link token |
| `POST` | `/exchange-token/plaid` | Exchange public token for access token |
| `GET` | `/connect/truelayer` | Get TrueLayer OAuth URL |
| `GET` | `/callback/truelayer` | TrueLayer OAuth callback (redirects to dashboard) |

### Data (unified across all providers)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/accounts` | All accounts from every connected provider |
| `GET` | `/transactions` | Normalized, deduplicated transactions (newest first) |
| `GET` | `/insights` | Spending by category + daily trend (Chart.js format) |
| `GET` | `/health` | Provider status check |

Legacy aliases `/link_token` and `/exchange_token` are kept for backwards compatibility.

### Normalized transaction format

```json
{
  "transaction_id": "string",
  "amount":         1.23,
  "date":           "YYYY-MM-DD",
  "description":    "string",
  "category":       "string",
  "provider":       "plaid | truelayer",
  "currency":       "USD"
}
```

## Project Structure

```
banserra/
├── app/                    # Next.js frontend
│   ├── dashboard/          # Main insights dashboard
│   ├── plaid-oauth/        # Plaid OAuth redirect handler
│   ├── layout.tsx
│   └── page.tsx
├── backend/
│   ├── providers/
│   │   ├── base.py         # BankProvider abstract base class
│   │   ├── plaid.py        # Plaid integration
│   │   ├── truelayer.py    # TrueLayer integration
│   │   └── nordigen.py     # Nordigen integration (in progress)
│   ├── main.py             # FastAPI app + routes
│   ├── database.py         # SQLAlchemy setup
│   └── requirements.txt
├── public/
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL

### Backend

```bash
cd banserra/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
# Plaid (US)
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox

# TrueLayer (EU/UK)
TRUELAYER_CLIENT_ID=your_client_id
TRUELAYER_CLIENT_SECRET=your_client_secret
TRUELAYER_REDIRECT_URI=http://localhost:8095/callback/truelayer

# App
DATABASE_URL=postgresql://user:password@localhost/banserra
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8095
```

```bash
uvicorn main:app --reload --port 8095
```

### Frontend

```bash
cd banserra
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Security

- `access_token` values are stored only on the backend — never sent to the client
- `.env` is not committed to version control
- Database credentials are managed via environment variables
- CORS is open in development; restrict `allow_origins` before deploying to production

## Features

- Connect US bank accounts via Plaid Link
- Connect EU/UK bank accounts via TrueLayer OAuth
- Unified accounts view across all providers
- Spending by category (pie chart)
- Daily spending trend (line chart)
- Persistent connections stored in PostgreSQL
- Provider-level deduplication for transactions
