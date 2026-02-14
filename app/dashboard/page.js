"use client";

import { useEffect, useState } from "react";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";

import { Pie, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");

      // 1) Transactions
      const txRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`);
      const txData = await txRes.json();
      if (txData.error) {
        setError(txData.error);
        return;
      }
      setTransactions(txData.transactions || []);

      // 2) Insights
      const inRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/insights`);
      const inData = await inRes.json();
      if (inData.error) {
        setError(inData.error);
        return;
      }
      setInsights(inData);
    }

    load();
  }, []);

  const pieData =
    insights && insights.by_category
      ? {
          labels: insights.by_category.labels,
          datasets: [
            {
              label: "Spending by Category",
              data: insights.by_category.values,
            },
          ],
        }
      : null;

  const lineData =
    insights && insights.by_day
      ? {
          labels: insights.by_day.labels,
          datasets: [
            {
              label: "Daily Spending",
              data: insights.by_day.values,
            },
          ],
        }
      : null;

  return (
    <main style={{ padding: 30 }}>
      <h1>banserra Dashboard</h1>

      {error && (
        <p style={{ color: "crimson" }}>
          {error} (Go back to Home and connect bank again.)
        </p>
      )}

      {!error && insights && (
        <>
          <h2 style={{ marginTop: 30 }}>Spending by Category</h2>
          <div style={{ maxWidth: 520 }}>
            {pieData ? <Pie data={pieData} /> : <p>Loading pie…</p>}
          </div>

          <h2 style={{ marginTop: 30 }}>Spending over Time (Last 30 days)</h2>
          <div style={{ maxWidth: 720 }}>
            {lineData ? <Line data={lineData} /> : <p>Loading line…</p>}
          </div>
        </>
      )}

      <h2 style={{ marginTop: 30 }}>Recent Transactions</h2>

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
