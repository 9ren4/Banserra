"use client";

import { useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("Not checked");

  async function checkBackend() {
    setStatus("Checking...");
    try {
      const res = await fetch("http://127.0.0.1:8095/health");
      const data = await res.json();
      setStatus(`Backend says: ${data.status}`);
    } catch (err) {
      console.error("Backend error:", err);
      setStatus("Failed to reach backend (is FastAPI running on :8095?)");
    }
  }

  return (
    <main className="min-h-screen p-8 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Plaid Insights MVP</h1>

      <button
        onClick={checkBackend}
        className="w-fit rounded-xl px-4 py-2 border"
      >
        Check Backend Health
      </button>

      <p className="text-lg">{status}</p>

      <a className="underline" href="/dashboard">
        Go to Dashboard →
      </a>
    </main>
  );
}
