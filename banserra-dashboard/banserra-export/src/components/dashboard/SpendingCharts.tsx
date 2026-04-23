import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { dashboardSnapshot, formatMoney } from "@/lib/mock-data";
import { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
);

// Read CSS tokens at runtime so charts match theme
function useThemeColors() {
  const [colors, setColors] = useState({
    fg: "#1a1a1a",
    muted: "#888",
    border: "#e5e5e5",
    chart: ["#5b6cff", "#3aa5b8", "#7a5af8", "#4cae8b", "#c98a4a"],
  });
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const get = (k: string) => styles.getPropertyValue(k).trim();
    setColors({
      fg: get("--foreground") ? `oklch(${get("--foreground")})` : "#1a1a1a",
      muted: get("--muted-foreground") ? `oklch(${get("--muted-foreground")})` : "#888",
      border: get("--border") ? `oklch(${get("--border")})` : "#e5e5e5",
      chart: [1, 2, 3, 4, 5].map((i) =>
        get(`--chart-${i}`) ? `oklch(${get(`--chart-${i}`)})` : "#5b6cff",
      ),
    });
  }, []);
  return colors;
}

export default function SpendingCharts() {
  const { spendingByCategory, spendingTrend, baseCurrency } = dashboardSnapshot;
  const colors = useThemeColors();

  const lineData = {
    labels: spendingTrend.map((d) =>
      new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    ),
    datasets: [
      {
        label: "Daily spend",
        data: spendingTrend.map((d) => d.amountCents / 100),
        borderColor: colors.chart[0],
        backgroundColor: `color-mix(in oklab, ${colors.chart[0]} 15%, transparent)`,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) =>
            formatMoney(Math.round(Number(ctx.parsed.y) * 100), baseCurrency),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: colors.muted, font: { size: 11 } },
        border: { color: colors.border },
      },
      y: {
        grid: { color: colors.border },
        ticks: {
          color: colors.muted,
          font: { size: 11 },
          callback: (v) => `$${v}`,
        },
        border: { display: false },
      },
    },
  };

  const doughnutData = {
    labels: spendingByCategory.map((c) => c.category),
    datasets: [
      {
        data: spendingByCategory.map((c) => c.amountCents / 100),
        backgroundColor: colors.chart,
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.label}: ${formatMoney(Math.round(Number(ctx.parsed) * 100), baseCurrency)}`,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card lg:col-span-3">
        <h3 className="text-sm font-medium text-foreground">Spend trend · 14d</h3>
        <p className="text-xs text-muted-foreground">Across all currencies, FX-normalized</p>
        <div className="mt-4 h-56">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card lg:col-span-2">
        <h3 className="text-sm font-medium text-foreground">By category</h3>
        <p className="text-xs text-muted-foreground">Server-categorized</p>
        <div className="mt-4 h-56">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>
    </div>
  );
}
