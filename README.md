🚀 banserra — Financial Insights Dashboard

banserra is a full-stack financial insights MVP built using Next.js, FastAPI, Plaid, and PostgreSQL.

It allows users to securely connect bank accounts via Plaid OAuth and visualize their spending patterns through categorized insights and time-series analysis.

🔧 Tech Stack

Frontend: Next.js (React)

Backend: FastAPI

Database: PostgreSQL

API Integration: Plaid Sandbox

Visualization: Chart.js

🏗 Architecture

Frontend communicates with FastAPI backend over HTTP.

Sensitive tokens (access_token) are never exposed to the client and are stored server-side in PostgreSQL.

Data flow:

User connects bank via Plaid Link

Frontend receives public_token

Backend exchanges public_token for access_token

Backend fetches transactions from Plaid

Insights are computed server-side

Frontend renders analytics

🔐 Security Considerations

access_token stored only on backend

.env not committed

Database credentials stored securely

Separation of concerns between client/server

📊 Features

OAuth-style bank connection (Plaid)

Transaction retrieval (last 30 days)

Spending by category (pie chart)

Daily spending trend (line chart)

Persistent bank connection (PostgreSQL)