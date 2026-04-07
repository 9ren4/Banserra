-- Nordigen / GoCardless connections
-- Run this once against your banserra database.
-- The NordigenProvider also calls CREATE TABLE IF NOT EXISTS on startup,
-- so this file is provided for documentation and manual inspection.

CREATE TABLE IF NOT EXISTS nordigen_connections (
    id              SERIAL PRIMARY KEY,

    -- Maps to the application user (matches plaid_items.user_id)
    user_id         VARCHAR NOT NULL,

    -- Nordigen requisition ID (globally unique)
    requisition_id  VARCHAR NOT NULL UNIQUE,

    -- JSON array of Nordigen account UUIDs, e.g. ["abc-123", "def-456"]
    -- Populated by the /callback/nordigen handler after the user authorises.
    account_ids     TEXT    NOT NULL DEFAULT '[]',

    -- 'pending' until user completes the consent flow
    -- 'linked'  once Nordigen confirms (status == "LN")
    -- other Nordigen status codes stored as-is for debugging
    status          VARCHAR NOT NULL DEFAULT 'pending',

    created_at      TIMESTAMP DEFAULT NOW()
);

-- Optional index for fast user look-ups
CREATE INDEX IF NOT EXISTS idx_nordigen_connections_user_id
    ON nordigen_connections (user_id);

-- Example normalized transaction shape produced by NordigenProvider
-- (for documentation only — not stored in the DB)
--
-- {
--   "transaction_id": "T20240115-00123",
--   "amount":         15.50,
--   "date":           "2024-01-15",
--   "description":    "TESCO STORES 1234",
--   "category":       "Other",
--   "provider":       "nordigen",
--   "currency":       "GBP"
-- }
