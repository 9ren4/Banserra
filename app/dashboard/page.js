"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  ArcElement, Tooltip,
  CategoryScale, LinearScale,
  PointElement, LineElement, Filler,
);

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           "#F9FAFB",
  surface:      "#FFFFFF",
  fg:           "#111827",
  muted:        "#6B7280",
  border:       "#E5E7EB",
  borderStrong: "#D1D5DB",
  primary:      "#1B2F5E",
  primaryFg:    "#FFFFFF",
  positive:     "#16A34A",
  positiveMuted:"#DCFCE7",
  negative:     "#DC2626",
  negativeMuted:"#FEF2F2",
  fresh:        "#16A34A",
  delayed:      "#D97706",
  failed:       "#DC2626",
  chart: ["#4F46E5", "#0EA5E9", "#7C3AED", "#10B981", "#F59E0B",
          "#EF4444", "#EC4899", "#14B8A6", "#F97316", "#84CC16"],
};

const RANGES = { "7D": 7, "1M": 30, "3M": 90, "1Y": 365 };

function fmt(amount, sym) {
  return `${sym}${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

// ── Icon components (inline SVG) ─────────────────────────────────────────────
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [allTxs, setAllTxs]     = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [range, setRange]       = useState("1M");
  const [searchQ, setSearchQ]   = useState("");
  const [catFilter, setCatFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const api = process.env.NEXT_PUBLIC_API_URL;
        const txRes = await fetch(`${api}/transactions`);
        const txData = await txRes.json();
        if (txData.error) { setError(txData.error); return; }
        setAllTxs(txData.transactions || []);

        try {
          const accRes = await fetch(`${api}/accounts`);
          const accData = await accRes.json();
          setAccounts(accData.accounts || []);
        } catch {
          // accounts endpoint optional
        }
      } catch {
        setError("Could not load data. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter transactions by time range
  const txs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGES[range]);
    return allTxs.filter(tx => tx.date && new Date(tx.date) >= cutoff);
  }, [allTxs, range]);

  // Aggregate stats
  const { byCategory, byDay, totalSpent, topCategory } = useMemo(() => {
    const byCategory = {};
    const byDay = {};
    let totalSpent = 0;
    for (const tx of txs) {
      const cat = tx.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
      byDay[tx.date]  = (byDay[tx.date]  || 0) + tx.amount;
      totalSpent     += tx.amount;
    }
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return { byCategory, byDay, totalSpent: Math.round(totalSpent * 100) / 100, topCategory };
  }, [txs]);

  // Filtered transaction list for the table
  const filteredTxs = useMemo(() =>
    txs
      .filter(tx => catFilter ? (tx.category || "Other") === catFilter : true)
      .filter(tx => searchQ
        ? (tx.description || "").toLowerCase().includes(searchQ.toLowerCase())
        : true)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [txs, searchQ, catFilter],
  );

  const categories = useMemo(
    () => Array.from(new Set(txs.map(t => t.category || "Other"))).sort(),
    [txs],
  );

  // Provider sync summary
  const providerSyncs = useMemo(() => {
    const map = {};
    for (const t of allTxs) {
      if (!t.provider) continue;
      if (!map[t.provider]) map[t.provider] = 0;
      map[t.provider]++;
    }
    return Object.entries(map).map(([provider, count]) => ({ provider, count }));
  }, [allTxs]);

  const currency = allTxs[0]?.currency || "GBP";
  const sym      = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  // Chart data
  const catLabels = Object.keys(byCategory);
  const doughnutData = {
    labels: catLabels,
    datasets: [{
      data: catLabels.map(k => Math.round(byCategory[k] * 100) / 100),
      backgroundColor: C.chart,
      borderWidth: 0,
    }],
  };

  const dayLabels = Object.keys(byDay).sort();
  const lineData = {
    labels: dayLabels.map(d =>
      new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    ),
    datasets: [{
      label: "Daily spend",
      data: dayLabels.map(d => Math.round(byDay[d] * 100) / 100),
      borderColor: C.chart[0],
      backgroundColor: `${C.chart[0]}20`,
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      WebkitFontSmoothing: "antialiased",
      color: C.fg,
    }}>

      {/* ── TOP NAVBAR ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56, padding: "0 24px",
        }}>
          {/* Logo + brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/Banserra_logo.ico"
              alt="Banserra"
              style={{ height: 28, width: 28, objectFit: "contain" }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.fg, letterSpacing: "-0.01em" }}>
              Banserra
            </span>
            <span style={{
              marginLeft: 4, background: "#F3F4F6", color: C.muted,
              fontSize: 10, fontWeight: 600, padding: "2px 6px",
              borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              Beta
            </span>
          </div>

          {/* Nav links */}
          <nav style={{ display: "flex", gap: 2 }}>
            {["Overview", "Accounts", "Transactions", "Insights"].map((item, i) => (
              <a key={item} href="#" style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 13,
                textDecoration: "none", fontWeight: i === 0 ? 500 : 400,
                background: i === 0 ? "#F3F4F6" : "transparent",
                color: i === 0 ? C.fg : C.muted,
              }}>
                {item}
              </a>
            ))}
          </nav>

          {/* Action icons + avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {[BellIcon, SettingsIcon].map((Icon, i) => (
              <button key={i} style={{
                width: 32, height: 32, borderRadius: 6,
                border: "none", background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted,
              }}>
                <Icon />
              </button>
            ))}
            <div style={{
              marginLeft: 8, width: 32, height: 32, borderRadius: "50%",
              background: C.primary, color: C.primaryFg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600,
            }}>
              SR
            </div>
          </div>
        </div>
      </header>

      {/* ── PAGE BODY ── */}
      <main style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "24px", display: "flex", flexDirection: "column", gap: 32,
      }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: C.negativeMuted, border: `1px solid #FECACA`,
            borderRadius: 12, padding: "16px 20px", color: C.negative,
          }}>
            <strong>Could not load data</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              {error} — <a href="/" style={{ color: C.negative, textDecoration: "underline" }}>
                Go home to connect your bank.
              </a>
            </p>
          </div>
        )}

        {/* Spinner */}
        {loading && !error && (
          <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
            <div style={{
              width: 32, height: 32,
              border: `3px solid ${C.border}`, borderTopColor: C.chart[0],
              borderRadius: "50%", margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }} />
            Loading…
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── PROVIDER STATUS BAR ── */}
            {providerSyncs.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {providerSyncs.map(({ provider, count }) => (
                  <div key={provider} style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    border: `1px solid rgba(22,163,74,0.25)`,
                    background: "rgba(22,163,74,0.08)",
                    color: C.fresh,
                    borderRadius: 9999, padding: "6px 12px", fontSize: 12,
                  }}>
                    <CheckIcon />
                    <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{provider}</span>
                    <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                      {count} transactions
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── NET WORTH HERO ── */}
            <section style={{
              position: "relative", overflow: "hidden",
              borderRadius: 16, border: `1px solid ${C.border}`,
              background: C.surface, padding: "32px 32px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
            }}>
              {/* Grid background pattern */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.4,
                backgroundImage: `
                  linear-gradient(to right, ${C.border} 1px, transparent 1px),
                  linear-gradient(to bottom, ${C.border} 1px, transparent 1px)
                `,
                backgroundSize: "32px 32px",
                WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
                maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
              }} />

              <div style={{
                position: "relative",
                display: "flex", flexWrap: "wrap",
                alignItems: "flex-start", justifyContent: "space-between", gap: 16,
              }}>
                {/* Left: amount */}
                <div>
                  <p style={{
                    margin: 0, fontSize: 11, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted,
                  }}>
                    Total Spent
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
                    <h1 style={{
                      margin: 0, fontSize: 42, fontWeight: 600, color: C.fg,
                      letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
                    }}>
                      {sym}{totalSpent.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </h1>
                    <span style={{ fontSize: 14, color: C.muted }}>{currency}</span>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: C.positiveMuted, color: C.positive,
                      borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 500,
                    }}>
                      ↑ Last {range}
                    </span>
                    <span style={{ fontSize: 12, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                      across {txs.length} transactions
                    </span>
                  </div>
                </div>

                {/* Right: metadata */}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "flex-end", gap: 8,
                }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: C.muted,
                  }}>
                    <InfoIcon />
                    Top category: <strong style={{ color: C.fg }}>{topCategory}</strong>
                  </div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    border: `1px solid rgba(22,163,74,0.3)`, background: "rgba(22,163,74,0.1)",
                    color: C.fresh, borderRadius: 9999, padding: "4px 10px", fontSize: 12,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", background: "currentColor",
                    }} />
                    <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {txs.length} transactions synced
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── ACCOUNTS GRID ── */}
            {accounts.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: 17, fontWeight: 600, color: C.fg, letterSpacing: "-0.01em",
                  }}>
                    Accounts
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
                    {accounts.length} connected · grouped by institution
                  </p>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}>
                  {accounts.map((acc, i) => {
                    const id      = acc.id || acc.account_id || i;
                    const name    = acc.institution_name || acc.institutionName || "Account";
                    const subname = acc.name || acc.accountName || "";
                    const mask    = acc.mask ? `·· ${acc.mask}` : "";
                    const type    = acc.type || acc.accountType || "";
                    const balance = acc.balance ?? (acc.balanceCents != null ? acc.balanceCents / 100 : 0);
                    const cur     = acc.currency || currency;
                    const s       = cur === "GBP" ? "£" : cur === "EUR" ? "€" : "$";
                    const neg     = balance < 0;

                    return (
                      <article key={id} style={{
                        borderRadius: 12, border: `1px solid ${C.border}`,
                        background: C.surface, padding: 20,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        display: "flex", flexDirection: "column", gap: 16,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: C.bg, color: C.muted,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <CardIcon />
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.fg }}>{name}</p>
                              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{subname} {mask}</p>
                            </div>
                          </div>
                          {type && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, background: C.bg, color: C.muted,
                              borderRadius: 4, padding: "2px 6px",
                              textTransform: "uppercase", letterSpacing: "0.06em",
                            }}>
                              {type}
                            </span>
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Balance · {cur}</p>
                          <p style={{
                            margin: "4px 0 0", fontSize: 22, fontWeight: 600,
                            letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
                            color: neg ? C.negative : C.fg,
                          }}>
                            {neg ? "−" : ""}{fmt(balance, s)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── TRANSACTIONS PANEL ── */}
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Section header + controls */}
              <div style={{
                display: "flex", flexWrap: "wrap",
                alignItems: "flex-end", justifyContent: "space-between", gap: 12,
              }}>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: 17, fontWeight: 600, color: C.fg, letterSpacing: "-0.01em",
                  }}>
                    Transactions
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                    {filteredTxs.length} of {txs.length} · normalized server-side
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {/* Range buttons */}
                  <div style={{ display: "flex", gap: 3 }}>
                    {Object.keys(RANGES).map(r => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        height: 36, padding: "0 12px", borderRadius: 6, cursor: "pointer",
                        fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                        border: `1px solid ${range === r ? C.primary : C.border}`,
                        background: range === r ? C.primary : C.surface,
                        color: range === r ? "#fff" : C.muted,
                        transition: "all 0.12s",
                      }}>
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Search input */}
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 10, top: "50%",
                      transform: "translateY(-50%)", color: C.muted, pointerEvents: "none",
                    }}>
                      <SearchIcon />
                    </span>
                    <input
                      type="search"
                      placeholder="Search merchant…"
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      style={{
                        height: 36, width: 200, borderRadius: 6,
                        border: `1px solid ${C.border}`, background: C.surface,
                        paddingLeft: 32, paddingRight: 12,
                        fontSize: 13, color: C.fg, fontFamily: "inherit", outline: "none",
                      }}
                    />
                  </div>

                  {/* Category filter */}
                  <select
                    value={catFilter}
                    onChange={e => setCatFilter(e.target.value)}
                    style={{
                      height: 36, borderRadius: 6, border: `1px solid ${C.border}`,
                      background: C.surface, padding: "0 12px",
                      fontSize: 13, color: C.fg, fontFamily: "inherit", cursor: "pointer", outline: "none",
                    }}
                  >
                    <option value="">All categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {/* Clear filters */}
                  {(searchQ || catFilter) && (
                    <button
                      onClick={() => { setSearchQ(""); setCatFilter(""); }}
                      style={{
                        height: 36, padding: "0 10px", borderRadius: 6,
                        border: `1px solid ${C.border}`, background: C.surface,
                        fontSize: 12, color: C.muted, cursor: "pointer", fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <XIcon /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div style={{
                borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.surface, overflow: "hidden",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#F9FAFB" }}>
                      {[
                        { label: "Merchant",  align: "left"  },
                        { label: "Category",  align: "left"  },
                        { label: "Date",      align: "left"  },
                        { label: "Source",    align: "left"  },
                        { label: "Amount",    align: "right" },
                      ].map(({ label, align }) => (
                        <th key={label} style={{
                          padding: "10px 16px", textAlign: align,
                          fontSize: 11, fontWeight: 600, color: C.muted,
                          textTransform: "uppercase", letterSpacing: "0.07em",
                        }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{
                          padding: "48px 16px", textAlign: "center",
                          fontSize: 14, color: C.muted,
                        }}>
                          No transactions match your filters.
                        </td>
                      </tr>
                    )}
                    {filteredTxs.slice(0, 50).map((tx, i) => {
                      const outflow = tx.amount > 0;
                      const notLast = i < Math.min(filteredTxs.length, 50) - 1;
                      return (
                        <tr
                          key={tx.transaction_id}
                          style={{ borderBottom: notLast ? `1px solid ${C.border}` : "none" }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: C.bg, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700, color: C.primary,
                              }}>
                                {(tx.description || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 500, color: C.fg }}>
                                  {tx.description || "Unknown"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 500,
                              background: "#F3F4F6", color: C.muted,
                              borderRadius: 4, padding: "3px 8px",
                            }}>
                              {tx.category || "Other"}
                            </span>
                          </td>
                          <td style={{
                            padding: "12px 16px", color: C.muted,
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {tx.date || "—"}
                          </td>
                          <td style={{
                            padding: "12px 16px", color: C.muted,
                            fontSize: 11, textTransform: "capitalize",
                          }}>
                            {tx.provider}
                          </td>
                          <td style={{
                            padding: "12px 16px", textAlign: "right",
                            fontVariantNumeric: "tabular-nums", fontWeight: 500,
                            color: outflow ? C.fg : C.positive,
                          }}>
                            {outflow ? "" : "+"}{sym}{tx.amount?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredTxs.length > 50 && (
                  <div style={{
                    padding: "12px 16px", textAlign: "center",
                    color: C.muted, fontSize: 12, borderTop: `1px solid ${C.border}`,
                  }}>
                    Showing 50 of {filteredTxs.length} transactions
                  </div>
                )}
              </div>
            </section>

            {/* ── INSIGHTS SECTION ── */}
            {txs.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: 17, fontWeight: 600, color: C.fg, letterSpacing: "-0.01em",
                  }}>
                    Insights
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                    Last {range} · {sym}{totalSpent.toLocaleString("en-GB", { minimumFractionDigits: 2 })} total spend
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
                  {/* Spend trend (line) */}
                  <div style={{
                    borderRadius: 12, border: `1px solid ${C.border}`,
                    background: C.surface, padding: 20,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: C.fg }}>
                      Spend trend
                    </h3>
                    <p style={{ margin: "0 0 16px", fontSize: 12, color: C.muted }}>
                      Daily, across all accounts
                    </p>
                    <div style={{ height: 224 }}>
                      <Line
                        data={lineData}
                        options={{
                          responsive: true, maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: { label: ctx => `${sym}${ctx.parsed.y.toFixed(2)}` },
                            },
                          },
                          scales: {
                            x: {
                              grid: { display: false },
                              ticks: { color: C.muted, font: { size: 11 } },
                            },
                            y: {
                              grid: { color: "#F3F4F6" },
                              ticks: {
                                color: C.muted, font: { size: 11 },
                                callback: v => `${sym}${v}`,
                              },
                              border: { display: false },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>

                  {/* By category (doughnut) */}
                  <div style={{
                    borderRadius: 12, border: `1px solid ${C.border}`,
                    background: C.surface, padding: 20,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: C.fg }}>
                      By category
                    </h3>
                    <p style={{ margin: "0 0 16px", fontSize: 12, color: C.muted }}>
                      Server-categorized
                    </p>
                    <div style={{ height: 224 }}>
                      <Doughnut
                        data={doughnutData}
                        options={{
                          responsive: true, maintainAspectRatio: false,
                          cutout: "68%",
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: ctx => `${ctx.label}: ${sym}${ctx.parsed.toFixed(2)}`,
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "32px 24px", fontSize: 12, color: C.muted,
      }}>
        <p style={{ margin: 0 }}>
          Balances and transactions sourced from regulated providers. Banserra does not move funds. Display only.
        </p>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; }
        a { color: inherit; }
        input[type="search"]::-webkit-search-cancel-button { display: none; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
