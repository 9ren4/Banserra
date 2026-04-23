import { dashboardSnapshot, formatMoney, relativeTime } from "@/lib/mock-data";
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetWorthHeader() {
  const { netWorthCents, delta24hCents, delta24hPct, baseCurrency, fxAsOf, providerSyncs } =
    dashboardSnapshot;
  const positive = delta24hCents >= 0;
  const totalAccounts = providerSyncs.reduce((s, p) => s + p.accountsTotal, 0);
  const syncedAccounts = providerSyncs.reduce((s, p) => s + p.accountsSynced, 0);
  const partial = syncedAccounts < totalAccounts;

  return (
    <section
      aria-labelledby="net-worth-heading"
      className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
    >
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              id="net-worth-heading"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Net worth
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <h1 className="tabular text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {formatMoney(netWorthCents, baseCurrency)}
              </h1>
              <span className="text-sm text-muted-foreground">{baseCurrency}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium tabular",
                  positive
                    ? "bg-positive-muted text-positive"
                    : "bg-negative-muted text-negative",
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {formatMoney(delta24hCents, baseCurrency, { signed: true })}
                <span className="opacity-70">
                  ({positive ? "+" : ""}
                  {delta24hPct.toFixed(2)}%)
                </span>
              </div>
              <span className="text-xs text-muted-foreground">last 24h</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              FX as of {relativeTime(fxAsOf)}
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
                partial
                  ? "border-status-delayed/30 bg-status-delayed/10 text-status-delayed"
                  : "border-status-fresh/30 bg-status-fresh/10 text-status-fresh",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="font-medium tabular">
                {syncedAccounts}/{totalAccounts} accounts synced
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
