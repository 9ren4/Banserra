import { cn } from "@/lib/utils";
import type { SyncStatus, Provider } from "@/lib/mock-data";
import { relativeTime } from "@/lib/mock-data";

const statusLabel: Record<SyncStatus, string> = {
  fresh: "Live",
  delayed: "Delayed",
  failed: "Failed",
};

const statusDotClass: Record<SyncStatus, string> = {
  fresh: "bg-status-fresh",
  delayed: "bg-status-delayed",
  failed: "bg-status-failed",
};

const providerLabel: Record<Provider, string> = {
  plaid: "Plaid",
  truelayer: "TrueLayer",
};

export function SyncBadge({
  status,
  provider,
  lastSyncedAt,
  className,
}: {
  status: SyncStatus;
  provider: Provider;
  lastSyncedAt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1 text-xs",
        className,
      )}
      title={`Source: ${providerLabel[provider]} · Synced ${relativeTime(lastSyncedAt)}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === "fresh" && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", statusDotClass[status])} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", statusDotClass[status])} />
      </span>
      <span className="font-medium text-foreground">{providerLabel[provider]}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground tabular">
        {statusLabel[status]} · {relativeTime(lastSyncedAt)}
      </span>
    </div>
  );
}
