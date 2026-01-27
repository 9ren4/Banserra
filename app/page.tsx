"use client";

import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";

export default function Home() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Not connected");

  // fetch link_token from backend
  async function createLinkToken() {
    const res = await fetch("http://localhost:8095/link_token", {
      method: "POST",
    });
    const data = await res.json();
    setLinkToken(data.link_token);
  }

  const onSuccess = useCallback(
    async (public_token: string) => {
      // send public_token to backend
      const res = await fetch("http://localhost:8095/exchange_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });

      const data = await res.json();
      setStatus("Bank connected successfully ✅");
    },
    []
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <main style={{ padding: 30 }}>
      <h1>banserra</h1>

      {!linkToken && (
        <button onClick={createLinkToken}>
          Create link_token
        </button>
      )}

      {linkToken && (
        <button onClick={() => open()} disabled={!ready}>
          Connect bank
        </button>
      )}

      <p>{status}</p>
    </main>
  );
}
