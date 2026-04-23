import { dashboardSnapshot, relativeTime } from "@/lib/mock-data";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const providerLabel = { plaid: "Plaid", truelayer: "TrueLayer" } as const;

export function ProviderStatusBar() {
  const { providerSyncs } = dashboardSnapshot;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {providerSyncs.map((p) => {
        const Icon =
          p.status === "fresh" ? CheckCircle2 : p.status === "delayed" ? Clock : AlertTriangle;
        return (
          <div
            key={p.provider}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              p.status === "fresh" && "border-status-fresh/25 bg-status-fresh/10 text-status-fresh",
              p.status === "delayed" &&
                "border-status-delayed/30 bg-status-delayed/10 text-status-delayed",
              p.status === "failed" &&
                "border-status-failed/30 bg-status-failed/10 text-status-failed",
            )}
            title={p.errorMessage}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="font-medium">{providerLabel[p.provider]}</span>
            <span className="opacity-70 tabular">
              {p.accountsSynced}/{p.accountsTotal} · {relativeTime(p.lastSyncedAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
