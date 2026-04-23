// Mock unified financial data simulating the FastAPI backend response shape.
// All amounts are in cents (server authority — no client-side math beyond display).

export type Provider = "plaid" | "truelayer";
export type SyncStatus = "fresh" | "delayed" | "failed";
export type AccountType = "checking" | "savings" | "credit" | "investment";

export interface Account {
  id: string;
  provider: Provider;
  institutionName: string;
  accountName: string;
  accountType: AccountType;
  mask: string; // last 4
  balanceCents: number;
  currency: string; // ISO 4217
  syncStatus: SyncStatus;
  lastSyncedAt: string; // ISO
}

export interface Transaction {
  id: string;
  accountId: string;
  provider: Provider;
  description: string;
  merchant: string;
  category: string;
  amountCents: number; // negative = outflow
  currency: string;
  postedAt: string; // ISO
}

export interface ProviderSync {
  provider: Provider;
  status: SyncStatus;
  accountsTotal: number;
  accountsSynced: number;
  lastSyncedAt: string;
  errorMessage?: string;
}

export interface DashboardSnapshot {
  baseCurrency: string;
  fxAsOf: string;
  netWorthCents: number;
  delta24hCents: number;
  delta24hPct: number;
  providerSyncs: ProviderSync[];
  accounts: Account[];
  transactions: Transaction[];
  spendingByCategory: { category: string; amountCents: number }[];
  spendingTrend: { date: string; amountCents: number }[];
}

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

export const dashboardSnapshot: DashboardSnapshot = {
  baseCurrency: "USD",
  fxAsOf: iso(1000 * 60 * 5),
  netWorthCents: 8_742_315_00 / 100 * 100, // $87,423.15
  delta24hCents: 124_50,
  delta24hPct: 0.142,
  providerSyncs: [
    {
      provider: "plaid",
      status: "fresh",
      accountsTotal: 3,
      accountsSynced: 3,
      lastSyncedAt: iso(1000 * 60 * 4),
    },
    {
      provider: "truelayer",
      status: "delayed",
      accountsTotal: 2,
      accountsSynced: 1,
      lastSyncedAt: iso(1000 * 60 * 47),
      errorMessage: "1 account pending re-authentication",
    },
  ],
  accounts: [
    {
      id: "acc_1",
      provider: "plaid",
      institutionName: "Chase",
      accountName: "Everyday Checking",
      accountType: "checking",
      mask: "4421",
      balanceCents: 12_843_22,
      currency: "USD",
      syncStatus: "fresh",
      lastSyncedAt: iso(1000 * 60 * 4),
    },
    {
      id: "acc_2",
      provider: "plaid",
      institutionName: "Chase",
      accountName: "Sapphire Credit",
      accountType: "credit",
      mask: "8810",
      balanceCents: -2_104_67,
      currency: "USD",
      syncStatus: "fresh",
      lastSyncedAt: iso(1000 * 60 * 4),
    },
    {
      id: "acc_3",
      provider: "plaid",
      institutionName: "Vanguard",
      accountName: "Brokerage",
      accountType: "investment",
      mask: "0093",
      balanceCents: 64_201_89,
      currency: "USD",
      syncStatus: "fresh",
      lastSyncedAt: iso(1000 * 60 * 4),
    },
    {
      id: "acc_4",
      provider: "truelayer",
      institutionName: "Monzo",
      accountName: "Current Account",
      accountType: "checking",
      mask: "1029",
      balanceCents: 4_821_44,
      currency: "GBP",
      syncStatus: "fresh",
      lastSyncedAt: iso(1000 * 60 * 9),
    },
    {
      id: "acc_5",
      provider: "truelayer",
      institutionName: "Barclays",
      accountName: "Savings",
      accountType: "savings",
      mask: "7766",
      balanceCents: 9_452_30,
      currency: "GBP",
      syncStatus: "failed",
      lastSyncedAt: iso(1000 * 60 * 60 * 6),
    },
  ],
  transactions: [
    { id: "t1", accountId: "acc_1", provider: "plaid", description: "Whole Foods Market", merchant: "Whole Foods", category: "Groceries", amountCents: -84_27, currency: "USD", postedAt: iso(1000 * 60 * 60 * 2) },
    { id: "t2", accountId: "acc_2", provider: "plaid", description: "Uber Trip", merchant: "Uber", category: "Transport", amountCents: -23_40, currency: "USD", postedAt: iso(1000 * 60 * 60 * 5) },
    { id: "t3", accountId: "acc_1", provider: "plaid", description: "Salary — Acme Corp", merchant: "Acme Corp", category: "Income", amountCents: 4_250_00, currency: "USD", postedAt: iso(1000 * 60 * 60 * 18) },
    { id: "t4", accountId: "acc_4", provider: "truelayer", description: "Pret A Manger", merchant: "Pret", category: "Food & Drink", amountCents: -8_75, currency: "GBP", postedAt: iso(1000 * 60 * 60 * 22) },
    { id: "t5", accountId: "acc_2", provider: "plaid", description: "Netflix", merchant: "Netflix", category: "Subscriptions", amountCents: -15_99, currency: "USD", postedAt: iso(1000 * 60 * 60 * 30) },
    { id: "t6", accountId: "acc_1", provider: "plaid", description: "ConEd Utilities", merchant: "ConEd", category: "Bills", amountCents: -142_18, currency: "USD", postedAt: iso(1000 * 60 * 60 * 36) },
    { id: "t7", accountId: "acc_3", provider: "plaid", description: "VTI Dividend", merchant: "Vanguard", category: "Investment", amountCents: 84_22, currency: "USD", postedAt: iso(1000 * 60 * 60 * 44) },
    { id: "t8", accountId: "acc_4", provider: "truelayer", description: "TfL Travel", merchant: "Transport for London", category: "Transport", amountCents: -12_40, currency: "GBP", postedAt: iso(1000 * 60 * 60 * 50) },
    { id: "t9", accountId: "acc_2", provider: "plaid", description: "Apple.com/bill", merchant: "Apple", category: "Subscriptions", amountCents: -2_99, currency: "USD", postedAt: iso(1000 * 60 * 60 * 60) },
    { id: "t10", accountId: "acc_1", provider: "plaid", description: "Trader Joe's", merchant: "Trader Joe's", category: "Groceries", amountCents: -52_18, currency: "USD", postedAt: iso(1000 * 60 * 60 * 70) },
    { id: "t11", accountId: "acc_4", provider: "truelayer", description: "Deliveroo", merchant: "Deliveroo", category: "Food & Drink", amountCents: -24_50, currency: "GBP", postedAt: iso(1000 * 60 * 60 * 80) },
    { id: "t12", accountId: "acc_2", provider: "plaid", description: "Shell Gas", merchant: "Shell", category: "Transport", amountCents: -48_12, currency: "USD", postedAt: iso(1000 * 60 * 60 * 92) },
  ],
  spendingByCategory: [
    { category: "Groceries", amountCents: 412_88 },
    { category: "Transport", amountCents: 184_22 },
    { category: "Bills", amountCents: 642_18 },
    { category: "Subscriptions", amountCents: 98_45 },
    { category: "Food & Drink", amountCents: 224_12 },
  ],
  spendingTrend: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(now - (13 - i) * 86400000).toISOString().slice(0, 10),
    amountCents: Math.round(40_00 + Math.sin(i * 0.7) * 30_00 + Math.random() * 20_00),
  })),
};

// Format helpers — display only. Server is the source of truth for amounts.
export function formatMoney(cents: number, currency: string, opts?: { signed?: boolean }) {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  if (opts?.signed) {
    return `${value < 0 ? "−" : "+"}${formatted}`;
  }
  return value < 0 ? `−${formatted}` : formatted;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
