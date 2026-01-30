"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTransactions() {
      const res = await fetch("http://localhost:8095/transactions");
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setTransactions(data.transactions);
    }

    fetchTransactions();
  }, []);

  return (
    <main style={{ padding: 30 }}>
      <h1>Transactions</h1>

      {error && <p>{error}</p>}

      {transactions.map((tx) => (
        <div
          key={tx.transaction_id}
          style={{
            borderBottom: "1px solid #ddd",
            padding: "10px 0",
          }}
        >
          <strong>{tx.name}</strong>
          <div>Amount: ${tx.amount}</div>
          <div>Date: {tx.date}</div>
        </div>
      ))}
    </main>
  );
}
