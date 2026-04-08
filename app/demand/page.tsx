"use client";

import { useState, useMemo } from "react";
import { useSimulationStore } from "@/lib/store/simulationStore";
import ChartContainer from "@/components/ChartContainer";
import MetricCard from "@/components/MetricCard";
import { Users, Info, Settings2 } from "lucide-react";

// Using Recharts instead of Chart.js for better React integration in a fast-paced task,
// though the user asked for chart.js, I will use Chart.js if I have the components ready,
// but for complex dashboards Recharts often looks more modern.
// Wait, user explicitly asked for chart.js/react-chartjs-2. Let me stick to that.

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Bar as BarChartJS } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
);

export default function DemandPage() {
  const { params, history, setParams, computePoissonProb } = useSimulationStore();
  const [lambda, setLocalLambda] = useState(params.lambda);

  const demandStats = useMemo(() => {
    if (history.length === 0) {
      return {
        mean: params.lambda,
        variance: params.lambda,
        stdDev: Math.sqrt(params.lambda),
      };
    }

    const demands = history.map((d) => d.demand);
    const mean = demands.reduce((sum, value) => sum + value, 0) / demands.length;
    const variance =
      demands.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      demands.length;

    return {
      mean,
      variance,
      stdDev: Math.sqrt(variance),
    };
  }, [history, params.lambda]);

  const effectiveLambda = params.dynamicLambdaEnabled
    ? demandStats.mean
    : params.lambda;

  const chartData = useMemo(() => {
    const labels = Array.from({ length: 11 }, (_, i) => i.toString());
    const theoretical = labels.map((k) =>
      computePoissonProb(parseInt(k, 10), effectiveLambda),
    );

    const actualHistogram = new Array(labels.length).fill(0);
    if (history.length > 0) {
      history.forEach((entry) => {
        if (entry.demand < actualHistogram.length) {
          actualHistogram[entry.demand] += 1;
        }
      });
    }

    const actual =
      history.length > 0
        ? actualHistogram.map((count) => count / history.length)
        : new Array(labels.length).fill(0);

    return {
      labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Theoretical Poisson",
          data: theoretical,
          backgroundColor: "#fca311",
          borderRadius: 8,
          hoverBackgroundColor: "#fdb541",
        },
        {
          type: "bar" as const,
          label: "Actual Simulation Demand",
          data: actual,
          backgroundColor: "rgba(126, 153, 213, 0.65)",
          borderRadius: 8,
        },
      ],
    };
  }, [computePoissonProb, effectiveLambda, history]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        backgroundColor: "#14213d",
        titleColor: "#e5e5e5",
        bodyColor: "#e5e5e5",
        borderColor: "#0c1425",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(229, 229, 229, 0.05)" },
        ticks: { color: "#666666" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#666666" },
      },
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Poisson Demand <span className="text-orange-500">Analysis</span>
        </h1>
        <p className="text-prussian-blue-800">
          Modeling discrete customer arrivals per unit of time.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Mean (λ)"
          value={demandStats.mean.toFixed(2)}
          icon={Users}
        />
        <MetricCard
          label="Variance"
          value={demandStats.variance.toFixed(2)}
          icon={Info}
        />
        <MetricCard
          label="Standard Deviation"
          value={demandStats.stdDev.toFixed(2)}
          icon={Info}
        />

        <div className="md:col-span-1 bg-prussian-blue-400 border border-prussian-blue-300 p-6 rounded-2xl shadow-lg flex items-center space-x-6">
          <div className="w-12 h-12 bg-prussian-blue-300 rounded-xl flex items-center justify-center">
            <Settings2 className="text-orange-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-bold">Adjust Lambda (λ)</span>
              <span className="text-orange-500 font-bold">{lambda}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={lambda}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setLocalLambda(val);
                setParams({ lambda: val });
              }}
              disabled={params.dynamicLambdaEnabled}
              className="w-full h-2 bg-prussian-blue-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <label className="flex items-center justify-between p-4 bg-prussian-blue-500 rounded-xl border border-prussian-blue-300">
          <div>
            <p className="text-sm font-bold">Dynamic λ</p>
            <p className="text-xs text-prussian-blue-800">
              Use moving average from recent simulation days.
            </p>
          </div>
          <button
            onClick={() =>
              setParams({ dynamicLambdaEnabled: !params.dynamicLambdaEnabled })
            }
            className={`w-14 h-8 rounded-full p-1 transition-colors ${params.dynamicLambdaEnabled ? "bg-orange-500" : "bg-prussian-blue-300"}`}
          >
            <span
              className={`block w-6 h-6 rounded-full bg-prussian-blue-500 transition-transform ${params.dynamicLambdaEnabled ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </label>

        <div className="p-4 bg-prussian-blue-500 rounded-xl border border-prussian-blue-300 space-y-2">
          <div className="flex justify-between text-sm font-semibold">
            <span>Moving Avg Window</span>
            <span className="text-orange-500">{params.dynamicLambdaWindow} days</span>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            value={params.dynamicLambdaWindow}
            onChange={(e) =>
              setParams({ dynamicLambdaWindow: parseInt(e.target.value, 10) })
            }
            className="w-full h-2 bg-prussian-blue-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        <div className="p-4 bg-prussian-blue-500 rounded-xl border border-prussian-blue-300">
          <p className="text-xs text-prussian-blue-800 uppercase font-bold mb-2">
            Effective Lambda
          </p>
          <p className="text-3xl font-black text-orange-500">
            {effectiveLambda.toFixed(2)}
          </p>
          <p className="text-xs text-prussian-blue-800 mt-1">
            {params.dynamicLambdaEnabled ? "Dynamic mode from simulation history" : "Static mode from manual control"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ChartContainer
          title="Theoretical vs Simulation Distribution"
          description="Overlay comparison of Poisson prediction and actual simulated demand frequencies."
          className="lg:col-span-2"
        >
          <BarChartJS data={chartData} options={options} />
        </ChartContainer>

        <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center space-x-2">
            <span className="w-2 h-6 bg-orange-500 rounded-full" />
            <span>Mathematical Model</span>
          </h3>

          <div className="p-6 bg-prussian-blue-500 rounded-xl font-mono text-sm border border-prussian-blue-300">
            <div className="text-orange-500 mb-2">P(X = k) =</div>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-center">
                <span>e^-λ · λ^k</span>
                <hr className="w-full border-platinum/30 my-1" />
                <span>k!</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-prussian-blue-800 leading-relaxed">
            The Poisson distribution is ideal for modeling independent arrivals
            occurring at a constant average rate. In our inventory system, λ
            represents the expected number of customer requests per day.
          </p>

          <ul className="space-y-3">
            {[
              "Discrete outcomes (k = 0, 1, 2...)",
              "Independent events",
              "Memoryless process",
            ].map((li, i) => (
              <li key={i} className="flex items-center space-x-2 text-sm">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                <span>{li}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
