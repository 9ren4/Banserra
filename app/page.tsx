"use client";

import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [linkToken, setLinkToken]     = useState<string | null>(null);
  const [plaidStatus, setPlaidStatus] = useState<string>("");
  const [tlStatus, setTlStatus]       = useState<string>("");
  const [loading, setLoading]         = useState<string | null>(null);

  // ── Plaid ──────────────────────────────────────────────────────────────

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

  // Auto-open Plaid Link once token is ready
  useEffect(() => {
    if (plaidReady && linkToken) openPlaid();
  }, [plaidReady, linkToken, openPlaid]);

  // ── TrueLayer ──────────────────────────────────────────────────────────

  async function startTrueLayer() {
    setLoading("truelayer");
    try {
      const res  = await fetch(`${API}/connect/truelayer`);
      const data = await res.json();
      if (!data.auth_url) throw new Error(data.error || "No auth_url returned");
      // Redirect user to TrueLayer's hosted consent screen
      window.location.href = data.auth_url;
    } catch (err: any) {
      setTlStatus(`Error: ${err.message}`);
      setLoading(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <main style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1>banserra</h1>
      <p style={{ color: "#666" }}>
        Connect your UK bank account using either provider below.
        You can connect via both at the same time.
      </p>

      <div style={{ display: "flex", gap: 24, marginTop: 32, flexWrap: "wrap" }}>

        {/* Plaid card */}
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 8px" }}>Plaid</h2>
          <p style={{ color: "#555", fontSize: 14, margin: "0 0 16px" }}>
            Supports UK OAuth banks (Barclays, HSBC, Lloyds, etc.)
          </p>
          <button
            onClick={startPlaid}
            disabled={loading === "plaid"}
            style={btnStyle("#000")}
          >
            {loading === "plaid" ? "Loading…" : "Connect via Plaid"}
          </button>
          {plaidStatus && (
            <p style={{ marginTop: 10, color: plaidStatus.startsWith("Error") ? "crimson" : "green" }}>
              {plaidStatus}
            </p>
          )}
        </div>

        {/* TrueLayer card */}
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 8px" }}>TrueLayer</h2>
          <p style={{ color: "#555", fontSize: 14, margin: "0 0 16px" }}>
            Open Banking — UK &amp; EU banks via PSD2
          </p>
          <button
            onClick={startTrueLayer}
            disabled={loading === "truelayer"}
            style={btnStyle("#1a7fe8")}
          >
            {loading === "truelayer" ? "Redirecting…" : "Connect via TrueLayer"}
          </button>
          {tlStatus && (
            <p style={{ marginTop: 10, color: tlStatus.startsWith("Error") ? "crimson" : "green" }}>
              {tlStatus}
            </p>
          )}
        </div>

      </div>

      <div style={{ marginTop: 32 }}>
        <a href="/dashboard" style={{ color: "#1a7fe8" }}>
          Go to Dashboard →
        </a>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "24px 28px",
  minWidth: 260,
  flex: "0 0 auto",
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  };
}
