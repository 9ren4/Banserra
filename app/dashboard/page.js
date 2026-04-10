"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Title
);

const C = {
  navy:   "#1B2F5E",
  navyDk: "#0F1E3D",
  green:  "#2DBE4E",
  bg:     "#F0F2F5",
  text:   "#111827",
  muted:  "#6B7280",
  border: "#E5E7EB",
  white:  "#FFFFFF",
};

const PIE_COLORS = [
  "#2DBE4E", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
  "#6366F1", "#84CC16",
];

const RANGES = { "7D": 7, "1M": 30, "3M": 90, "1Y": 365 };

export default function Dashboard() {
  const [allTxs, setAllTxs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [range, setRange]     = useState("1M");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`);
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        setAllTxs(data.transactions || []);
      } catch {
        setError("Could not load transactions. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter by selected time range
  const txs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGES[range]);
    return allTxs.filter(tx => tx.date && new Date(tx.date) >= cutoff);
  }, [allTxs, range]);

  // Compute category + daily aggregates from filtered transactions
  const { byCategory, byDay, totalSpent, topCategory } = useMemo(() => {
    const byCategory = {};
    const byDay      = {};
    let   totalSpent = 0;
    for (const tx of txs) {
      const cat = tx.category || "Other";
      byCategory[cat]  = (byCategory[cat]  || 0) + tx.amount;
      byDay[tx.date]   = (byDay[tx.date]   || 0) + tx.amount;
      totalSpent      += tx.amount;
    }
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return { byCategory, byDay, totalSpent: Math.round(totalSpent * 100) / 100, topCategory };
  }, [txs]);

  const catLabels = Object.keys(byCategory);
  const pieData = {
    labels: catLabels,
    datasets: [{
      data: catLabels.map(k => Math.round(byCategory[k] * 100) / 100),
      backgroundColor: PIE_COLORS,
      borderWidth: 0,
    }],
  };

  const dayLabels = Object.keys(byDay).sort();
  const lineData = {
    labels: dayLabels,
    datasets: [{
      label: "Daily Spending",
      data: dayLabels.map(d => Math.round(byDay[d] * 100) / 100),
      borderColor: C.green,
      backgroundColor: "rgba(45,190,78,0.08)",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointBackgroundColor: C.green,
      borderWidth: 2,
    }],
  };

  const currency = txs[0]?.currency || "GBP";
  const sym      = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", overflow: "hidden", background: C.bg }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: C.navy, display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: "20px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src="/Banserra_logo.ico" alt="Banserra" style={{ height: 28, width: 28, objectFit: "contain" }} />
            <span style={{ color: C.white, fontWeight: 800, fontSize: 14, letterSpacing: "0.5px" }}>BANSERRA</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {[
            { label: "Dashboard",    href: "/dashboard", active: true  },
            { label: "Transactions", href: "/dashboard", active: false },
            { label: "Insights",     href: "/dashboard", active: false },
          ].map(({ label, href, active }) => (
            <a
              key={label}
              href={href}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? C.white : "rgba(255,255,255,0.45)",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderLeft: active ? `3px solid ${C.green}` : "3px solid transparent",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Bottom link */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <a href="/" style={{ display: "block", padding: "10px 12px", fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
            ← Home
          </a>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Dashboard</h1>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.keys(RANGES).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  background: range === r ? C.navy : C.bg,
                  color:      range === r ? C.white : C.muted,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Page body */}
        <div style={{ padding: "28px 32px", flex: 1 }}>

          {/* Error */}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "18px 24px", marginBottom: 24, color: "#DC2626" }}>
              <strong>Could not load data</strong>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#EF4444" }}>
                {error} — go back to <a href="/" style={{ color: "#DC2626", textDecoration: "underline" }}>Home</a> and connect your bank.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && !error && (
            <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.green, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
              Loading transactions…
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Total Spent",    value: `${sym}${totalSpent.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`, sub: `Last ${range}` },
                  { label: "Transactions",   value: txs.length,    sub: `Last ${range}` },
                  { label: "Top Category",   value: topCategory,   sub: "Highest spend" },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{value}</p>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              {txs.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24 }}>
                  {/* Pie */}
                  <div style={{ background: C.white, borderRadius: 12, padding: 24, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <h2 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: C.text }}>By Category</h2>
                    <Pie
                      data={pieData}
                      options={{
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { font: { size: 11 }, padding: 14, usePointStyle: true, boxWidth: 8 },
                          },
                        },
                        maintainAspectRatio: true,
                      }}
                    />
                  </div>
                  {/* Line */}
                  <div style={{ background: C.white, borderRadius: 12, padding: 24, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <h2 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: C.text }}>Daily Spending</h2>
                    <Line
                      data={lineData}
                      options={{
                        plugins: { legend: { display: false } },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { maxTicksLimit: 8, font: { size: 11 }, color: C.muted },
                          },
                          y: {
                            grid: { color: "#F3F4F6" },
                            ticks: { font: { size: 11 }, color: C.muted, callback: v => `${sym}${v}` },
                          },
                        },
                        maintainAspectRatio: true,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ background: C.white, borderRadius: 12, padding: "48px 24px", border: `1px solid ${C.border}`, textAlign: "center", marginBottom: 24, color: C.muted, fontSize: 15 }}>
                  No transactions found for this period.
                </div>
              )}

              {/* Transactions table */}
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>

                {/* Table header bar */}
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Transactions</h2>
                  <span style={{ fontSize: 12, color: C.muted }}>{txs.length} total</span>
                </div>

                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", padding: "10px 24px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                  {["Merchant", "Date", "Amount", "Category", "Source"].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {txs.length === 0 ? (
                  <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: 14 }}>
                    No transactions in this period.
                  </div>
                ) : (
                  txs.slice(0, 50).map((tx, i) => (
                    <div
                      key={tx.transaction_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                        padding: "14px 24px",
                        borderBottom: i < Math.min(txs.length, 50) - 1 ? `1px solid ${C.border}` : "none",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.navy, flexShrink: 0 }}>
                          {(tx.description || "?")[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.description || "Unknown"}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, color: C.muted }}>{tx.date || "—"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{sym}{tx.amount?.toFixed(2)}</span>
                      <span>
                        <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(45,190,78,0.12)", color: "#166534", borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>
                          {tx.category || "Other"}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: C.muted, textTransform: "capitalize" }}>{tx.provider}</span>
                    </div>
                  ))
                )}

                {txs.length > 50 && (
                  <div style={{ padding: "14px 24px", textAlign: "center", color: C.muted, fontSize: 13, borderTop: `1px solid ${C.border}` }}>
                    Showing 50 of {txs.length} transactions
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
