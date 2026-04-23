import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { NetWorthHeader } from "@/components/dashboard/NetWorthHeader";
import { ProviderStatusBar } from "@/components/dashboard/ProviderStatusBar";
import { AccountsGrid } from "@/components/dashboard/AccountsGrid";
import { TransactionsPanel } from "@/components/dashboard/TransactionsPanel";
import { InsightsSection } from "@/components/dashboard/InsightsSection";

const dashboardSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(dashboardSearchSchema),
  head: () => ({
    meta: [
      { title: "Banserra — Unified financial dashboard" },
      {
        name: "description",
        content:
          "Aggregate accounts and transactions from Plaid and TrueLayer in one calm, trustworthy dashboard.",
      },
      { property: "og:title", content: "Banserra — Unified financial dashboard" },
      {
        property: "og:description",
        content:
          "Aggregate accounts and transactions from Plaid and TrueLayer in one calm, trustworthy dashboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <DashboardShell>
      <div className="space-y-2">
        <ProviderStatusBar />
        <NetWorthHeader />
      </div>
      <AccountsGrid />
      <TransactionsPanel />
      <InsightsSection />
    </DashboardShell>
  );
}
