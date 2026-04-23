import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/index";
import { dashboardSnapshot, formatMoney, relativeTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export function TransactionsPanel() {
  const { transactions, accounts } = dashboardSnapshot;
  const { q, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))).sort(),
    [transactions],
  );

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => (category ? t.category === category : true))
      .filter((t) =>
        q
          ? t.description.toLowerCase().includes(q.toLowerCase()) ||
            t.merchant.toLowerCase().includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [transactions, q, category]);

  return (
    <section aria-labelledby="transactions-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="transactions-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Transactions
          </h2>
          <p className="text-sm text-muted-foreground tabular">
            {filtered.length} of {transactions.length} · normalized server-side
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search merchant…"
              value={q}
              onChange={(e) =>
                navigate({
                  search: (prev: { q: string; category: string }) => ({
                    ...prev,
                    q: e.target.value,
                  }),
                  replace: true,
                })
              }
              className="h-9 w-56 rounded-md border border-input bg-surface pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <select
            value={category}
            onChange={(e) =>
              navigate({
                search: (prev: { q: string; category: string }) => ({
                  ...prev,
                  category: e.target.value,
                }),
                replace: true,
              })
            }
            className="h-9 rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {(q || category) && (
            <button
              onClick={() =>
                navigate({ search: () => ({ q: "", category: "" }), replace: true })
              }
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Merchant</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Account</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Category</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Posted</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No transactions match your filters.
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const account = accountMap[t.accountId];
              const negative = t.amountCents < 0;
              return (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{t.merchant}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {account?.institutionName} ••{account?.mask}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {t.category}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell tabular">
                    {relativeTime(t.postedAt)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular font-medium",
                      negative ? "text-foreground" : "text-positive",
                    )}
                  >
                    {formatMoney(t.amountCents, t.currency, { signed: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
