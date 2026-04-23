import { Outlet } from "@tanstack/react-router";
import { Wallet, Bell, Settings } from "lucide-react";

export function DashboardShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Banserra
            </span>
            <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Beta
            </span>
          </div>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {["Overview", "Accounts", "Transactions", "Insights"].map((item, i) => (
              <a
                key={item}
                href="#"
                className={
                  i === 0
                    ? "rounded-md bg-muted px-3 py-1.5 font-medium text-foreground"
                    : "rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button
              aria-label="Notifications"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              aria-label="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              SR
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {children ?? <Outlet />}
      </main>
      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-muted-foreground sm:px-6">
        <p>
          Balances and transactions sourced from regulated providers. Banserra does not
          move funds. Display only.
        </p>
      </footer>
    </div>
  );
}
