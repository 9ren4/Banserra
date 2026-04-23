import { dashboardSnapshot, formatMoney, type Account } from "@/lib/mock-data";
import { SyncBadge } from "./SyncBadge";
import { Wallet, PiggyBank, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcon = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
} as const;

const typeLabel = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit",
  investment: "Investment",
} as const;

function AccountCard({ account }: { account: Account }) {
  const Icon = typeIcon[account.accountType];
  const failed = account.syncStatus === "failed";
  const negative = account.balanceCents < 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card transition-colors",
        "hover:border-border-strong",
        failed && "border-status-failed/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {account.institutionName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {account.accountName} · ••{account.mask}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {typeLabel[account.accountType]}
        </span>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">
          Balance · {account.currency}
        </p>
        <p
          className={cn(
            "mt-1 tabular text-2xl font-semibold tracking-tight",
            negative ? "text-negative" : "text-foreground",
          )}
        >
          {formatMoney(account.balanceCents, account.currency)}
        </p>
      </div>

      {failed && (
        <div className="flex items-start gap-2 rounded-md border border-status-failed/30 bg-negative-muted/40 p-2.5 text-xs text-status-failed">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">Sync failed</p>
            <p className="opacity-80">Balance shown may be stale. Reconnect to refresh.</p>
          </div>
        </div>
      )}

      <SyncBadge
        status={account.syncStatus}
        provider={account.provider}
        lastSyncedAt={account.lastSyncedAt}
        className="self-start"
      />
    </article>
  );
}

export function AccountsGrid() {
  const { accounts } = dashboardSnapshot;

  return (
    <section aria-labelledby="accounts-heading" className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2
            id="accounts-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Accounts
          </h2>
          <p className="text-sm text-muted-foreground">
            {accounts.length} connected · grouped by institution
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} />
        ))}
      </div>
    </section>
  );
}
