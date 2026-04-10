"use client";

import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";

const API = process.env.NEXT_PUBLIC_API_URL;

const C = {
  navy:   "#1B2F5E",
  navyDk: "#0F1E3D",
  green:  "#2DBE4E",
  bg:     "#F8F9FB",
  text:   "#111827",
  muted:  "#6B7280",
  border: "#E5E7EB",
  white:  "#FFFFFF",
} as const;

export default function Home() {
  const [linkToken, setLinkToken]     = useState<string | null>(null);
  const [plaidStatus, setPlaidStatus] = useState<string>("");
  const [tlStatus, setTlStatus]       = useState<string>("");
  const [loading, setLoading]         = useState<string | null>(null);
  const [email, setEmail]             = useState("");
  const [waitlisted, setWaitlisted]   = useState(false);

  // ── Plaid ─────────────────────────────────────────────────────────────────

  async function startPlaid() {
    setLoading("plaid");
    try {
      const res  = await fetch(`${API}/link_token`, { method: "POST" });
      const data = await res.json();
      if (!data.link_token) throw new Error(data.error || "No link_token returned");
      localStorage.setItem("plaid_link_token", data.link_token);
      setLinkToken(data.link_token);
    } catch (err: any) {
      setPlaidStatus(`Error: ${err.message}`);
    } finally {
      setLoading(null);
    }
  }

  const onPlaidSuccess = useCallback(async (public_token: string) => {
    try {
      const res  = await fetch(`${API}/exchange_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      const data = await res.json();
      if (data.status === "connected") {
        localStorage.removeItem("plaid_link_token");
        setPlaidStatus("Connected via Plaid ✓");
        setLinkToken(null);
      }
    } catch {
      setPlaidStatus("Exchange failed — try again");
    }
  }, []);

  const onPlaidExit = useCallback(() => {
    setLinkToken(null);
    localStorage.removeItem("plaid_link_token");
  }, []);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  useEffect(() => {
    if (plaidReady && linkToken) openPlaid();
  }, [plaidReady, linkToken, openPlaid]);

  // ── TrueLayer ─────────────────────────────────────────────────────────────

  async function startTrueLayer() {
    setLoading("truelayer");
    try {
      const res  = await fetch(`${API}/connect/truelayer`);
      const data = await res.json();
      if (!data.auth_url) throw new Error(data.error || "No auth_url returned");
      window.location.href = data.auth_url;
    } catch (err: any) {
      setTlStatus(`Error: ${err.message}`);
      setLoading(null);
    }
  }

  const statusMsg = tlStatus || plaidStatus;
  const isLoading = !!loading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", background: C.bg, color: C.text }}>

      {/* ── NAV ── */}
      <nav style={{
        background: C.navy,
        padding: "0 48px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/Banserra_logo.ico" alt="Banserra" style={{ height: 32, width: 32, objectFit: "contain" }} />
          <span style={{ color: C.white, fontWeight: 800, fontSize: 17, letterSpacing: "0.5px" }}>BANSERRA</span>
        </div>
        <a href="/dashboard" style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: 500 }}>
          Dashboard →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: C.navy, padding: "96px 48px 0", color: C.white, overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(45,190,78,0.12)", color: C.green,
            borderRadius: 24, padding: "5px 14px",
            fontSize: 12, fontWeight: 700, marginBottom: 28,
            border: "1px solid rgba(45,190,78,0.25)", letterSpacing: "0.3px",
          }}>
            <span style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", display: "inline-block" }} />
            Open Banking · Plaid · TrueLayer
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 6vw, 68px)",
            fontWeight: 800, lineHeight: 1.08,
            margin: "0 0 24px", letterSpacing: "-2px", maxWidth: 700,
          }}>
            Your money,<br />finally making sense.
          </h1>

          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: "0 0 44px", maxWidth: 500 }}>
            Connect your UK bank account securely. Banserra categorizes your spending, surfaces patterns, and shows you exactly where your money goes.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={startTrueLayer} disabled={isLoading} style={primaryBtn(C.green, C.navyDk, isLoading)}>
              {loading === "truelayer" ? "Redirecting…" : "Connect Your Bank"}
            </button>
            <button onClick={startPlaid} disabled={isLoading} style={ghostBtn(isLoading)}>
              {loading === "plaid" ? "Loading…" : "Connect via Plaid"}
            </button>
            <a href="/dashboard" style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginLeft: 4 }}>
              View Dashboard →
            </a>
          </div>

          {statusMsg && (
            <p style={{ marginTop: 16, fontSize: 14, color: statusMsg.startsWith("Error") ? "#f87171" : C.green }}>
              {statusMsg}
            </p>
          )}

          {/* Decorative bar chart */}
          <div style={{ marginTop: 72, display: "flex", gap: 8, alignItems: "flex-end", height: 140, maxWidth: 800 }}>
            {[38, 52, 41, 68, 44, 78, 55, 88, 62, 74, 80, 100].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`,
                background: i === 11 ? C.green : `rgba(45,190,78,${0.1 + i * 0.04})`,
                borderRadius: "5px 5px 0 0",
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "88px 48px", background: C.white }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={eyebrow}>How it works</p>
          <h2 style={sectionH2}>Up and running in 60 seconds</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 48, maxWidth: 860 }}>
            {[
              { n: "01", title: "Connect",  body: "Securely link your bank via Plaid or TrueLayer. OAuth-only — we never see your credentials or store your passwords." },
              { n: "02", title: "Sync",     body: "Transactions are fetched, normalized, and categorized automatically across every linked account." },
              { n: "03", title: "Insights", body: "Spending breakdowns, category trends, and time-series analysis — updated whenever you load the dashboard." },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: "2px", marginBottom: 20 }}>{n}</div>
                <div style={{ width: 40, height: 3, background: C.green, borderRadius: 2, marginBottom: 18 }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>{title}</h3>
                <p style={{ color: C.muted, lineHeight: 1.75, fontSize: 15, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "88px 48px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={eyebrow}>Insights</p>
          <h2 style={sectionH2}>Everything you need to see the full picture</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

            {/* Spending by Category */}
            <div style={featureCard}>
              <h3 style={cardTitle}>Spending by Category</h3>
              <p style={cardDesc}>See exactly how much you spend on food, transport, bills, and more.</p>
              <div style={{ marginTop: 20 }}>
                {([["Food & Drink", 35, C.green], ["Transport", 25, "#3B82F6"], ["Bills", 20, "#8B5CF6"], ["Shopping", 20, "#F59E0B"]] as [string, number, string][]).map(
                  ([label, pct, color]) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 5 }}>
                        <span>{label}</span><span>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3 }}>
                        <div style={{ width: `${pct * 2.5}%`, height: "100%", background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Monthly Trends */}
            <div style={featureCard}>
              <h3 style={cardTitle}>Monthly Trends</h3>
              <p style={cardDesc}>Track how your spending changes week to week and month to month.</p>
              <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 72, marginTop: 20 }}>
                {[45, 62, 38, 71, 55, 84, 60, 90, 52, 78, 66, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 11 ? C.green : `${C.navy}18`, borderRadius: "3px 3px 0 0" }} />
                ))}
              </div>
            </div>

            {/* Top Merchants */}
            <div style={featureCard}>
              <h3 style={cardTitle}>Top Merchants</h3>
              <p style={cardDesc}>Know which merchants are taking the biggest share of your wallet.</p>
              <div style={{ marginTop: 20 }}>
                {([["Tesco Metro", "£84.20"], ["TfL", "£62.50"], ["Amazon", "£41.00"], ["Costa Coffee", "£28.75"]] as [string, string][]).map(
                  ([name, amt], i) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, background: C.bg, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.navy }}>
                          {name[0]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{amt}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Net Cash Flow */}
            <div style={featureCard}>
              <h3 style={cardTitle}>Net Cash Flow</h3>
              <p style={cardDesc}>Income vs spending at a glance, so you always know where you stand.</p>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Income</span>
                  <span style={{ fontWeight: 700, color: C.green, fontSize: 15 }}>+£2,400.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Spending</span>
                  <span style={{ fontWeight: 700, color: "#EF4444", fontSize: 15 }}>−£1,847.50</span>
                </div>
                <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4 }}>
                  <div style={{ width: "77%", height: "100%", background: C.green, borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>Saved this month</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>£552.50</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section style={{ padding: "88px 48px", background: C.white }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 64, alignItems: "center" }}>
          <div>
            <p style={eyebrow}>Security</p>
            <h2 style={{ ...sectionH2, marginBottom: 16 }}>Bank-grade security, by design</h2>
            <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.8, margin: "0 0 32px" }}>
              Banserra connects through OAuth — we never store your banking password. Access is strictly read-only. Your data is encrypted in transit and at rest.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
              {["OAuth 2.0 only", "Read-only access", "No credential storage", "Encrypted at rest"].map(b => (
                <div key={b} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600 }}>
                  ✓ {b}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {["Plaid", "TrueLayer"].map(p => (
                <div key={p} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, color: C.navy, background: C.bg }}>
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.bg, borderRadius: 16, padding: 32, border: `1px solid ${C.border}` }}>
            {[
              { label: "Connection type", value: "OAuth 2.0" },
              { label: "Permissions",     value: "Read-only" },
              { label: "Data storage",    value: "Encrypted" },
              { label: "Credentials",     value: "Never stored" },
              { label: "Providers",       value: "Plaid · TrueLayer" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: C.navy, padding: "96px 48px", textAlign: "center" }}>
        <h2 style={{ color: C.white, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: "-1px" }}>
          Start understanding your money.
        </h2>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 17, margin: "0 0 44px" }}>
          Connect your bank in 60 seconds. No credit card required.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: "13px 20px", borderRadius: 8, border: "none", fontSize: 15, width: 280, outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={() => email && setWaitlisted(true)}
            style={primaryBtn(C.green, C.navyDk, false)}
          >
            {waitlisted ? "You're on the list ✓" : "Get Early Access"}
          </button>
        </div>
        <button
          onClick={startTrueLayer}
          disabled={isLoading}
          style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
        >
          Or connect your bank now →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: C.navyDk, padding: "20px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/Banserra_logo.ico" alt="" style={{ height: 22, width: 22, objectFit: "contain" }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>© 2025 Banserra</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Read-only · OAuth 2.0 · Bank-grade security</span>
      </footer>

    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────

function primaryBtn(bg: string, color: string, disabled: boolean): React.CSSProperties {
  return {
    background: bg, color,
    border: "none", borderRadius: 8,
    padding: "13px 28px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15, fontWeight: 700, letterSpacing: "-0.2px",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "inherit",
  };
}

function ghostBtn(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8, padding: "13px 28px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15, fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
  };
}

const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 800,
  letterSpacing: "2.5px", color: "#2DBE4E",
  textTransform: "uppercase", marginBottom: 14,
};

const sectionH2: React.CSSProperties = {
  fontSize: "clamp(26px, 3vw, 38px)",
  fontWeight: 800, margin: "0 0 48px",
  letterSpacing: "-0.5px", color: "#111827",
};

const featureCard: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 14, padding: 28,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const cardTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700,
  margin: "0 0 6px", color: "#111827",
};

const cardDesc: React.CSSProperties = {
  fontSize: 13, color: "#6B7280",
  margin: 0, lineHeight: 1.6,
};
