"use client";

import { useMemo } from "react";
import {
  useSimulationStore,
  InventoryState,
} from "@/lib/store/simulationStore";
import ChartContainer from "@/components/ChartContainer";
import MetricCard from "@/components/MetricCard";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Pie, Radar } from "react-chartjs-2";
import { Activity, Layers, Repeat, ArrowRightLeft } from "lucide-react";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
);

const STATES: InventoryState[] = ["Stock-out", "Low", "Medium", "High", "Full"];

export default function MarkovPage() {
  const { transitionMatrix, getSteadyStateProbabilities } =
    useSimulationStore();

  const steadyStateProbs = useMemo(
    () => getSteadyStateProbabilities(),
    [getSteadyStateProbabilities],
  );

  const pieData = {
    labels: STATES,
    datasets: [
      {
        data: steadyStateProbs,
        backgroundColor: [
          "#fca311", // Orange (Stock-out/Critical)
          "#fdc871", // Lighter Orange
          "#beccea", // Prussian Blue Light
          "#3e67bf", // Prussian Blue Medium
          "#14213d", // Prussian Blue Dark
        ],
        borderColor: "#0c1425",
        borderWidth: 2,
      },
    ],
  };

  const radarData = {
    labels: STATES,
    datasets: [
      {
        label: "Steady State Probability",
        data: steadyStateProbs,
        backgroundColor: "rgba(252, 163, 17, 0.2)",
        borderColor: "#fca311",
        pointBackgroundColor: "#fca311",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#fca311",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: { color: "#e5e5e5", font: { family: "Inter" } },
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: "rgba(229, 229, 229, 0.1)" },
        grid: { color: "rgba(229, 229, 229, 0.1)" },
        pointLabels: { color: "#e5e5e5", font: { size: 12 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Markov Chain <span className="text-orange-500">States</span>
        </h1>
        <p className="text-prussian-blue-800">
          Transition dynamics between inventory levels.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Current States"
          value={STATES.length}
          icon={Layers}
        />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ChartContainer
          title="Steady-State Distribution"
          description="Long-term probability of being in each inventory state."
          className="lg:col-span-2"
        >
          <div className="flex flex-col md:flex-row h-full items-center">
            <div className="w-full md:w-1/2 h-full">
              <Pie data={pieData} options={chartOptions} />
            </div>
            <div className="w-full md:w-1/2 h-full">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
        </ChartContainer>

        <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6 overflow-x-auto">
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <span className="w-2 h-6 bg-orange-500 rounded-full" />
            <span>Transition Matrix (P)</span>
          </h3>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-prussian-blue-300">
                <th className="py-2 px-1 text-prussian-blue-800 italic">
                  From \ To
                </th>
                {STATES.map((s) => (
                  <th key={s} className="py-2 px-1 text-center font-bold">
                    {s.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transitionMatrix.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-prussian-blue-300/50 hover:bg-prussian-blue-300/30 transition-colors"
                >
                  <td className="py-3 px-1 font-semibold text-platinum">
                    {STATES[i]}
                  </td>
                  {row.map((cell, j) => (
                    <td key={j} className="py-3 px-1 text-center font-mono">
                      <span
                        className={
                          cell > 0.4
                            ? "text-orange-500 font-bold"
                            : "text-platinum/70"
                        }
                      >
                        {cell.toFixed(2)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-[11px] text-prussian-blue-800 leading-relaxed italic">
            * Each row sums to 1.0 (Stochastic Constraint). Higher values on the
            diagonal indicate state persistence.
          </p>
        </div>
      </div>

      <section className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">State Descriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STATES.map((state, i) => (
            <div
              key={state}
              className="p-4 bg-prussian-blue-500 rounded-xl border border-prussian-blue-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">{state}</span>
                <span className="text-[10px] bg-prussian-blue-300 px-2 py-0.5 rounded text-orange-500 font-bold">
                  π_{i}
                </span>
              </div>
              <div className="text-2xl font-black text-platinum mb-1">
                {(steadyStateProbs[i] * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-prussian-blue-800">
                Steady-state probability
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
