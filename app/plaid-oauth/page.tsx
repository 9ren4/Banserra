"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";

export default function PlaidOAuth() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [receivedRedirectUri, setReceivedRedirectUri] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve the link_token saved before the OAuth redirect
    const token = localStorage.getItem("plaid_link_token");
    if (!token) {
      router.push("/");
      return;
    }
    setLinkToken(token);
    // Pass the full current URL (including query params) back to Plaid
    setReceivedRedirectUri(window.location.href);
  }, [router]);

  const onSuccess = useCallback(
    async (public_token: string) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchange_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      localStorage.removeItem("plaid_link_token");
      router.push("/dashboard");
    },
    [router]
  );

  const onExit = useCallback(() => {
    localStorage.removeItem("plaid_link_token");
    router.push("/");
  }, [router]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri: receivedRedirectUri ?? undefined,
    onSuccess,
    onExit,
  });

  // Auto-open Link as soon as the token + redirect URI are ready
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return (
    <main style={{ padding: 30 }}>
      <p>Completing bank authorization…</p>
    </main>
  );
}
