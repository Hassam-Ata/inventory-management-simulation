"use client";

import { useEffect, useMemo, useState } from "react";
import ChartContainer from "@/components/ChartContainer";
import MetricCard from "@/components/MetricCard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Legend,
  Tooltip,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  GitCompareArrows,
  ShieldCheck,
  Gauge,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Legend,
  Tooltip,
);

type ComparisonType = "policy" | "stress";

type DayRecord = {
  day: number;
  demand: number;
  inventoryAfter: number;
  stockOutOccurred: boolean;
  lostDemand: number;
  fulfilledDemand: number;
};

type SimulationRun = {
  id: string;
  createdAt: string;
  days: number;
  lambda: number;
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  endingInventory: number;
  records: DayRecord[];
};

type RunSummary = {
  id: string;
  label: string;
  totalDemand: number;
  totalLost: number;
  stockOutDays: number;
  fulfillmentRate: number;
  stockOutRate: number;
  endingInventory: number;
};

function formatRunLabel(run: SimulationRun) {
  const ts = new Date(run.createdAt);
  return `${ts.toLocaleDateString("en-IN")} ${ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function summarizeRun(run: SimulationRun): RunSummary {
  const totalDemand = run.records.reduce((acc, r) => acc + r.demand, 0);
  const totalLost = run.records.reduce((acc, r) => acc + r.lostDemand, 0);
  const stockOutDays = run.records.filter((r) => r.stockOutOccurred).length;
  const fulfillmentRate =
    totalDemand > 0 ? ((totalDemand - totalLost) / totalDemand) * 100 : 100;
  const stockOutRate = run.days > 0 ? (stockOutDays / run.days) * 100 : 0;

  return {
    id: run.id,
    label: formatRunLabel(run),
    totalDemand,
    totalLost,
    stockOutDays,
    fulfillmentRate,
    stockOutRate,
    endingInventory: run.endingInventory,
  };
}

function getValidationError(
  runs: SimulationRun[],
  mode: ComparisonType,
): string | null {
  if (runs.length < 2) return "Select at least 2 simulations to compare.";
  if (runs.length > 5) return "You can compare at most 5 simulations at once.";

  const firstDays = runs[0].days;
  const sameDays = runs.every((r) => r.days === firstDays);
  if (!sameDays) {
    return "All selected simulations must have the same total simulation days.";
  }

  if (mode === "policy") {
    const firstLambda = runs[0].lambda;
    const sameLambda = runs.every((r) => r.lambda === firstLambda);
    if (!sameLambda) {
      return "Policy Strategy Comparison requires the same arrival rate (lambda) for all selected simulations.";
    }
  }

  if (mode === "stress") {
    const firstReorder = runs[0].reorderPoint;
    const firstRestock = runs[0].restockAmt;
    const samePolicy = runs.every(
      (r) => r.reorderPoint === firstReorder && r.restockAmt === firstRestock,
    );
    if (!samePolicy) {
      return "System Stress Test / Sensitivity Analysis requires constant Reorder Point and Refill Amount across selected simulations.";
    }
  }

  return null;
}

export default function ComparisonPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<ComparisonType>("policy");

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const response = await fetch("/api/simulations", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load simulation runs");
        const data = (await response.json()) as SimulationRun[];
        setRuns(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadRuns();
  }, []);

  const selectedRuns = useMemo(
    () => runs.filter((run) => selectedIds.includes(run.id)),
    [runs, selectedIds],
  );

  const validationError = useMemo(
    () => getValidationError(selectedRuns, mode),
    [selectedRuns, mode],
  );

  const summaries = useMemo(
    () => selectedRuns.map((run) => summarizeRun(run)),
    [selectedRuns],
  );

  const chartLabels =
    selectedRuns.length > 0
      ? selectedRuns[0].records.map((record) => `Day ${record.day}`)
      : [];

  const inventoryLineData = {
    labels: chartLabels,
    datasets: selectedRuns.map((run, i) => {
      const palette = ["#fca311", "#fdc871", "#beccea", "#3e67bf", "#e5e5e5"];
      return {
        label: `${formatRunLabel(run)} | lambda ${run.lambda}`,
        data: run.records.map((record) => record.inventoryAfter),
        borderColor: palette[i % palette.length],
        backgroundColor: "transparent",
        pointRadius: 1.5,
        tension: 0.35,
      };
    }),
  };

  const performanceBarData = {
    labels: summaries.map((s) => s.label),
    datasets: [
      {
        label: "Fulfillment %",
        data: summaries.map((s) => Number(s.fulfillmentRate.toFixed(1))),
        backgroundColor: "#fca311",
      },
      {
        label: "Stock-out %",
        data: summaries.map((s) => Number(s.stockOutRate.toFixed(1))),
        backgroundColor: "#3e67bf",
      },
    ],
  };

  const comparisonTitle =
    mode === "policy"
      ? "Policy Strategy Comparison"
      : "System Stress Test / Sensitivity Analysis";

  const modeRules =
    mode === "policy"
      ? "Rules: 2-5 runs, same days, same lambda. Reorder point and refill amount may vary."
      : "Rules: 2-5 runs, same days, same reorder point, same refill amount. Lambda may vary.";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <header>
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Simulation <span className="text-orange-500">Comparison</span>
        </h1>
        <p className="text-prussian-blue-800">
          Select 2-5 runs and compare policy variants or stress/sensitivity response.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Selected Runs"
          value={selectedRuns.length}
          icon={GitCompareArrows}
        />
        <MetricCard
          label="Comparison Type"
          value={mode === "policy" ? "Policy Strategy" : "Stress / Sensitivity"}
          icon={mode === "policy" ? ShieldCheck : Gauge}
        />
        <MetricCard
          label="Validation"
          value={validationError ? "Needs Fix" : "Ready"}
          icon={validationError ? AlertTriangle : CheckCircle2}
        />
      </div>

      <section className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400 p-6">
        <h2 className="text-lg font-bold mb-4">Choose Comparison Mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("policy")}
            className={`text-left rounded-xl border p-4 transition-colors ${
              mode === "policy"
                ? "border-orange-500 bg-orange-500/10"
                : "border-prussian-blue-300 bg-prussian-blue-500/30"
            }`}
          >
            <div className="font-bold text-platinum">Policy Strategy Comparison</div>
            <p className="text-sm text-prussian-blue-800 mt-1">
              Compare different policy settings under the same arrival rate.
            </p>
          </button>

          <button
            onClick={() => setMode("stress")}
            className={`text-left rounded-xl border p-4 transition-colors ${
              mode === "stress"
                ? "border-orange-500 bg-orange-500/10"
                : "border-prussian-blue-300 bg-prussian-blue-500/30"
            }`}
          >
            <div className="font-bold text-platinum">System Stress Test / Sensitivity Analysis</div>
            <p className="text-sm text-prussian-blue-800 mt-1">
              Compare demand-pressure effects while keeping policy constants fixed.
            </p>
          </button>
        </div>

        <p className="mt-4 text-xs font-semibold text-prussian-blue-800 uppercase">
          {modeRules}
        </p>
      </section>

      <section className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400 p-6">
        <h2 className="text-lg font-bold mb-4">Select Simulation Runs (2-5)</h2>

        {loading ? (
          <p className="text-prussian-blue-800">Loading simulation history...</p>
        ) : runs.length === 0 ? (
          <p className="text-prussian-blue-800">
            No saved runs found. Run simulations first from the Simulation page.
          </p>
        ) : (
          <div className="space-y-3 max-h-90 overflow-y-auto pr-2">
            {runs.map((run) => {
              const checked = selectedIds.includes(run.id);
              const disabled = !checked && selectedIds.length >= 5;
              return (
                <label
                  key={run.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                    checked
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-prussian-blue-300 bg-prussian-blue-500/30"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-platinum">{formatRunLabel(run)}</div>
                    <div className="text-xs text-prussian-blue-800 flex flex-wrap gap-3">
                      <span>{run.days} days</span>
                      <span>lambda {run.lambda}</span>
                      <span>ROP {run.reorderPoint}</span>
                      <span>Refill {run.restockAmt}</span>
                      <span>Max {run.maxInventory}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleSelect(run.id)}
                    className="mt-1 h-4 w-4 accent-orange-500"
                  />
                </label>
              );
            })}
          </div>
        )}
      </section>

      {validationError ? (
        <section className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
          <p className="text-orange-700 font-semibold">{validationError}</p>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer
              title={`${comparisonTitle}: Inventory Trajectory`}
              description="End-of-day inventory path across selected runs."
            >
              <Line
                data={inventoryLineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: "#e5e5e5" },
                    },
                  },
                  scales: {
                    x: { ticks: { color: "#7e99d5", maxRotation: 0 }, grid: { display: false } },
                    y: { ticks: { color: "#7e99d5" }, grid: { color: "rgba(229,229,229,0.08)" } },
                  },
                }}
              />
            </ChartContainer>

            <ChartContainer
              title={`${comparisonTitle}: Performance Snapshot`}
              description="Fulfillment and stock-out percentage by run."
            >
              <Bar
                data={performanceBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: "#e5e5e5" },
                    },
                  },
                  scales: {
                    x: { ticks: { color: "#7e99d5", maxRotation: 20 }, grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { color: "#7e99d5" },
                      grid: { color: "rgba(229,229,229,0.08)" },
                    },
                  },
                }}
              />
            </ChartContainer>
          </div>

          <section className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-bold text-prussian-blue-800 uppercase bg-prussian-blue-500/30">
                <tr>
                  <th className="px-4 py-3">Run</th>
                  <th className="px-4 py-3">Lambda</th>
                  <th className="px-4 py-3">Reorder Point</th>
                  <th className="px-4 py-3">Refill Amount</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Fulfillment %</th>
                  <th className="px-4 py-3">Stock-out %</th>
                  <th className="px-4 py-3">Lost Demand</th>
                  <th className="px-4 py-3">Ending Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-prussian-blue-300">
                {selectedRuns.map((run) => {
                  const s = summarizeRun(run);
                  return (
                    <tr key={run.id} className="hover:bg-prussian-blue-300/20 transition-colors">
                      <td className="px-4 py-3 font-semibold">{s.label}</td>
                      <td className="px-4 py-3">{run.lambda.toFixed(1)}</td>
                      <td className="px-4 py-3">{run.reorderPoint}</td>
                      <td className="px-4 py-3">{run.restockAmt}</td>
                      <td className="px-4 py-3">{run.days}</td>
                      <td className="px-4 py-3 text-orange-500 font-bold">{s.fulfillmentRate.toFixed(1)}</td>
                      <td className="px-4 py-3 text-prussian-blue-900 font-bold">{s.stockOutRate.toFixed(1)}</td>
                      <td className="px-4 py-3">{s.totalLost}</td>
                      <td className="px-4 py-3">{s.endingInventory}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400 p-5">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="text-orange-500" size={16} />
          Interpreting Results
        </h3>
        {mode === "policy" ? (
          <p className="text-sm text-prussian-blue-800 leading-relaxed">
            With lambda fixed, differences in fulfillment and stock-out rates reflect policy quality
            (reorder point and refill amount settings).
          </p>
        ) : (
          <p className="text-sm text-prussian-blue-800 leading-relaxed">
            With policy fixed, shifts in fulfillment and stock-out rates show sensitivity to arrival
            rate changes and demand pressure.
          </p>
        )}
      </section>
    </div>
  );
}
