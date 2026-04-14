"use client";

import { useState, useEffect, useMemo } from "react";
import { useSimulationStore } from "@/lib/store/simulationStore";
import ChartContainer from "@/components/ChartContainer";
import MetricCard from "@/components/MetricCard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Play,
  RotateCcw,
  TrendingDown,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Database,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function SimulationPage() {
  const { params, history, runSimulation, resetSimulation } =
    useSimulationStore();
  const [simDays, setSimDays] = useState(30);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    if (history.length === 0) {
      runSimulation(30);
    }
  }, []);

  const chartData = useMemo(() => {
    return {
      labels: history.map((d) => `Day ${d.day}`),
      datasets: [
        {
          label: "Inventory Level",
          data: history.map((d) => d.inventoryAfter),
          borderColor: "#fca311",
          backgroundColor: "rgba(252, 163, 17, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 2,
        },
        {
          label: "Demand",
          data: history.map((d) => d.demand),
          borderColor: "#beccea",
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0,
        },
      ],
    };
  }, [history]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        labels: { color: "#e5e5e5" },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(229, 229, 229, 0.05)" },
        ticks: { color: "#666666" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#666666", maxRotation: 0 },
      },
    },
  };

  const stats = useMemo(() => {
    if (history.length === 0)
      return { fulfilledRate: 0, totalStockOuts: 0, avgDemand: 0 };

    const totalDemand = history.reduce((acc, curr) => acc + curr.demand, 0);
    const totalLost = history.reduce((acc, curr) => acc + curr.lostDemand, 0);
    const totalStockOuts = history.filter((d) => d.stockOutOccurred).length;

    return {
      fulfilledRate:
        totalDemand > 0
          ? (((totalDemand - totalLost) / totalDemand) * 100).toFixed(1)
          : 100,
      totalStockOuts,
      avgDemand: (totalDemand / history.length).toFixed(1),
    };
  }, [history]);

  const handleRunSimulation = async () => {
    setSaveStatus("idle");
    runSimulation(simDays);

    const {
      params: currentParams,
      history: currentHistory,
      inventory,
    } = useSimulationStore.getState();

    if (currentHistory.length === 0) return;

    setSaveStatus("saving");
    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          params: currentParams,
          history: currentHistory,
          endingInventory: inventory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist simulation");
      }

      setSaveStatus("saved");
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-platinum tracking-tight">
            System <span className="text-orange-500">Simulation</span>
          </h1>
          <p className="text-prussian-blue-800">
            Execute multi-cycle inventory stress tests.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-prussian-blue-400 border border-prussian-blue-300 rounded-xl p-1">
            <input
              type="number"
              value={simDays}
              onChange={(e) => setSimDays(parseInt(e.target.value) || 1)}
              className="bg-transparent w-16 px-3 text-center font-bold text-orange-500 focus:outline-none"
            />
            <span className="text-xs font-bold text-prussian-blue-800 pr-3 uppercase">
              Days
            </span>
            <button
              onClick={handleRunSimulation}
              className="bg-orange-500 hover:bg-orange-600 text-prussian-blue-500 px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all active:scale-95"
            >
              <Play size={16} fill="currentColor" />
              <span>Simulate</span>
            </button>
          </div>
          <button
            onClick={resetSimulation}
            className="p-3 bg-prussian-blue-400 border border-prussian-blue-300 rounded-xl text-prussian-blue-800 hover:text-white transition-colors"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* <div className="flex items-center gap-2 text-xs font-semibold text-prussian-blue-800">
        <Database size={14} className="text-orange-500" />
        {saveStatus === "idle" && <span>Run a simulation to save it.</span>}
        {saveStatus === "saving" && <span>Saving run to database...</span>}
        {saveStatus === "saved" && <span>Simulation saved to history.</span>}
        {saveStatus === "error" && (
          <span className="text-red-400">Could not save simulation run.</span>
        )}
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Fulfillment Rate"
          value={`${stats.fulfilledRate}%`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Total Stock-outs"
          value={stats.totalStockOuts}
          icon={XCircle}
        />
        <MetricCard
          label="Avg. Daily Demand"
          value={stats.avgDemand}
          icon={TrendingDown}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <ChartContainer
          title="Inventory Over Time"
          description="Tracking stock levels vs incoming demand across cycles."
          className="lg:col-span-3"
        >
          <Line data={chartData} options={chartOptions} />
        </ChartContainer>

        <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <ClipboardList className="text-orange-500" />
            <span>Parameters</span>
          </h3>

          <div className="flex-1 space-y-6">
            <ParamItem
              label="Reorder Point"
              value={params.reorderPoint}
              unit="units"
            />
            <ParamItem
              label="Restock Amount"
              value={params.restockAmt}
              unit="units"
            />
            <ParamItem
              label="Max Capacity"
              value={params.maxInventory}
              unit="units"
            />

            <div className="p-4 bg-prussian-blue-500/50 rounded-xl border border-prussian-blue-300">
              <h4 className="text-xs font-bold uppercase text-prussian-blue-800 mb-2">
                Restocking Policy
              </h4>
              <p className="text-[11px] leading-relaxed">
                Whenever inventory ≤ {params.reorderPoint}, trigger a batch
                order of {params.restockAmt} units (capped at{" "}
                {params.maxInventory}).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-prussian-blue-300 flex justify-between items-center bg-prussian-blue-300/20">
          <h3 className="font-bold">Detailed Cycle Ledger</h3>
          <span className="text-xs font-bold text-prussian-blue-700 uppercase">
            All {history.length} Days
          </span>
        </div>
        <div className="overflow-x-auto max-h-100">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-bold text-prussian-blue-800 uppercase bg-prussian-blue-500/30 sticky top-0">
              <tr>
                <th className="px-6 py-4">Day</th>
                <th className="px-6 py-4">Demand</th>
                <th className="px-6 py-4">Before</th>
                <th className="px-6 py-4">After</th>
                <th className="px-6 py-4">Fulfilled</th>
                <th className="px-6 py-4">Lost</th>
                <th className="px-6 py-4">Restocked</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-prussian-blue-300">
              {[...history]
                .reverse()
                .map((day) => {
                  const expectedAfterDemand =
                    day.inventoryBefore - day.fulfilledDemand;
                  const restockedQty = Math.max(
                    0,
                    day.inventoryAfter - expectedAfterDemand,
                  );

                  return (
                  <tr
                    key={day.day}
                    className="hover:bg-prussian-blue-300/20 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-platinum">
                      #{day.day}
                    </td>
                    <td className="px-6 py-4 text-orange-500 font-mono font-bold">
                      {day.demand}
                    </td>
                    <td className="px-6 py-4 text-platinum/70">
                      {day.inventoryBefore}
                    </td>
                    <td className="px-6 py-4 font-black">
                      {day.inventoryAfter}
                    </td>
                    <td className="px-6 py-4">{day.fulfilledDemand}</td>
                    <td className="px-6 py-4">{day.lostDemand}</td>
                    <td className="px-6 py-4">
                      {restockedQty > 0 ? (
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-md text-[10px] uppercase font-bold">
                          +{restockedQty}
                        </span>
                      ) : (
                        <span className="text-prussian-blue-700">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {day.stockOutOccurred ? (
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-md text-[10px] uppercase font-bold">
                          Stock Out
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-md text-[10px] uppercase font-bold">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ParamItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex justify-between items-end border-b border-prussian-blue-300 pb-2">
      <span className="text-sm font-semibold text-prussian-blue-800">
        {label}
      </span>
      <div className="text-right">
        <span className="text-xl font-bold text-platinum">{value}</span>
        <span className="text-[10px] text-prussian-blue-700 ml-1 uppercase">
          {unit}
        </span>
      </div>
    </div>
  );
}
