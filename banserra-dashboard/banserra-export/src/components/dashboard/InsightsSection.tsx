import { lazy, Suspense } from "react";
import { dashboardSnapshot, formatMoney } from "@/lib/mock-data";

// Dynamic import — Chart.js is below the fold
const SpendingCharts = lazy(() => import("./SpendingCharts"));

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="h-64 skeleton" />
      <div className="h-64 skeleton" />
    </div>
  );
}

export function InsightsSection() {
  const { spendingByCategory, baseCurrency } = dashboardSnapshot;
  const total = spendingByCategory.reduce((s, c) => s + c.amountCents, 0);

  return (
    <section aria-labelledby="insights-heading" className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2
            id="insights-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Insights
          </h2>
          <p className="text-sm text-muted-foreground tabular">
            Last 14 days · {formatMoney(total, baseCurrency)} total spend
          </p>
        </div>
      </div>
      <Suspense fallback={<ChartSkeleton />}>
        <SpendingCharts />
      </Suspense>
    </section>
  );
}
