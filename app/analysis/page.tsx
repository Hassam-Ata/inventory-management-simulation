"use client";

import { useMemo, useState } from "react";
import { useSimulationStore } from "@/lib/store/simulationStore";
import ChartContainer from "@/components/ChartContainer";
import MetricCard from "@/components/MetricCard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Lightbulb,
  AlertTriangle,
  DollarSign,
  Brain,
  Dice6,
  ShieldAlert,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

export default function AnalysisPage() {
  const {
    history,
    params,
    costParams,
    setCostParams,
    getCostSummary,
    getOptimizationRecommendation,
    runMonteCarlo,
    getRiskAnalysis,
  } = useSimulationStore();
  const [monteCarloRuns, setMonteCarloRuns] = useState(100);
  const [monteCarloDays, setMonteCarloDays] = useState(60);

  const metrics = useMemo(() => {
    if (history.length === 0) return null;

    const totalDays = history.length;
    const stockOutDays = history.filter((d) => d.stockOutOccurred).length;
    const totalDemand = history.reduce((acc, curr) => acc + curr.demand, 0);
    const lostDemand = history.reduce((acc, curr) => acc + curr.lostDemand, 0);
    const avgInventory =
      history.reduce((acc, curr) => acc + curr.inventoryAfter, 0) / totalDays;

    return {
      stockOutProb: ((stockOutDays / totalDays) * 100).toFixed(1),
      serviceLevel: ((1 - lostDemand / totalDemand) * 100).toFixed(1),
      inventoryTurnover: (totalDemand / avgInventory).toFixed(2),
      efficiencyScore: (85 - (stockOutDays / totalDays) * 100).toFixed(1),
    };
  }, [history]);

  const costSummary = useMemo(() => getCostSummary(), [getCostSummary, history, costParams]);
  const optimization = useMemo(
    () => getOptimizationRecommendation(),
    [getOptimizationRecommendation, history, params, costParams],
  );
  const monteCarlo = useMemo(
    () => runMonteCarlo(monteCarloRuns, monteCarloDays),
    [runMonteCarlo, monteCarloRuns, monteCarloDays, params, costParams],
  );
  const risk = useMemo(
    () => getRiskAnalysis(7),
    [getRiskAnalysis, history, params],
  );

  const costData = {
    labels: ["Holding", "Stock-out", "Ordering"],
    datasets: [
      {
        label: "Cost Breakdown",
        data: [
          costSummary.holdingCost,
          costSummary.stockOutCost,
          costSummary.orderingCost,
        ],
        backgroundColor: ["#3e67bf", "#fca311", "#7e99d5"],
        borderRadius: 10,
      },
    ],
  };

  const recommendations = useMemo(() => {
    if (!metrics) return [];
    const recs: {
      title: string;
      desc: string;
      icon: typeof ShieldCheck;
      color: string;
    }[] = [];

    if (parseFloat(metrics.stockOutProb) > 5 || risk.stockOutProbabilityPercent > 30) {
      recs.push({
        title: "Increase Reorder Point",
        desc: "Stock-out risk is elevated. Increase reorder point to reduce future service failures.",
        icon: ShieldCheck,
        color: "text-orange-500",
      });
    }

    if (costSummary.holdingCost > costSummary.stockOutCost * 1.2) {
      recs.push({
        title: "Reduce Restock Amount",
        desc: "Holding costs dominate. Lower restock batches to avoid excess idle inventory.",
        icon: Zap,
        color: "text-blue-400",
      });
    }

    const demands = history.map((day) => day.demand);
    const demandMean =
      demands.length > 0
        ? demands.reduce((sum, value) => sum + value, 0) / demands.length
        : params.lambda;
    const demandVariance =
      demands.length > 0
        ? demands.reduce((sum, value) => sum + Math.pow(value - demandMean, 2), 0) /
          demands.length
        : params.lambda;

    if (Math.sqrt(demandVariance) > demandMean * 0.6) {
      recs.push({
        title: "Increase Safety Stock",
        desc: "Demand variability is high. Increase safety stock buffer to absorb volatility.",
        icon: Zap,
        color: "text-orange-500",
      });
    }

    if (recs.length === 0) {
      recs.push({
        title: "Policy Is Balanced",
        desc: "Cost and service levels are currently in a healthy operating range.",
        icon: ShieldCheck,
        color: "text-green-400",
      });
    }

    return recs;
  }, [metrics, risk, costSummary, history, params.lambda]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header>
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Long-Term <span className="text-orange-500">Analysis</span>
        </h1>
        <p className="text-prussian-blue-800">
          Operational metrics and strategic restocking policy recommendations.
        </p>
      </header>

      {metrics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              label="Service Level"
              value={`${metrics.serviceLevel}%`}
              icon={TrendingUp}
            />
            <MetricCard
              label="Stock-out Prob"
              value={`${metrics.stockOutProb}%`}
              icon={AlertTriangle}
            />
            <MetricCard
              label="Efficiency"
              value={metrics.efficiencyScore}
              icon={Zap}
            />
            <MetricCard
              label="Turnover"
              value={metrics.inventoryTurnover}
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              label="Total Cost"
              value={costSummary.totalCost.toFixed(0)}
              icon={DollarSign}
            />
            <MetricCard
              label="MC Avg Service"
              value={`${monteCarlo.averageServiceLevel.toFixed(1)}%`}
              icon={Dice6}
            />
            <MetricCard
              label="95% CI"
              value={`${monteCarlo.confidenceInterval95[0].toFixed(1)}-${monteCarlo.confidenceInterval95[1].toFixed(1)}`}
              icon={Brain}
            />
            <MetricCard
              label="7d Stock-out Risk"
              value={`${risk.stockOutProbabilityPercent.toFixed(1)}%`}
              icon={ShieldAlert}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer
              title="Cost Breakdown"
              description="Operational cost model across holding, stock-out, and ordering components."
            >
              <Bar
                data={costData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      grid: { color: "rgba(229, 229, 229, 0.05)" },
                      ticks: { color: "#666666" },
                    },
                    x: { ticks: { color: "#666666" } },
                  },
                }}
              />
            </ChartContainer>

            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Lightbulb className="text-orange-500" />
                <span>Strategic Insights</span>
              </h3>

              <div className="grid gap-4">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="bg-prussian-blue-400 border border-prussian-blue-300 p-6 rounded-2xl flex items-start space-x-4 hover:border-orange-500/30 transition-all"
                  >
                    <div
                      className={`p-3 bg-prussian-blue-500 rounded-xl ${rec.color}`}
                    >
                      <rec.icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{rec.title}</h4>
                      <p className="text-sm text-prussian-blue-800 leading-relaxed">
                        {rec.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="text-orange-500 font-bold flex items-center space-x-2 mb-2">
                    <AlertTriangle size={18} />
                    <span>Optimization Recommendation</span>
                  </h4>
                  <p className="text-sm text-platinum italic">
                    "Best candidate under current costs: reorder point {optimization.reorderPoint},
                    restock amount {optimization.restockAmt}, expected service level
                    {" "}{optimization.serviceLevel.toFixed(1)}%, expected cost {optimization.totalCost.toFixed(0)}."
                  </p>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/20 blur-3xl rounded-full group-hover:bg-orange-500/30 transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold">Cost Model Controls</h3>
              <CostSlider
                label="Holding Cost / Unit / Day"
                value={costParams.holdingCostPerUnitPerDay}
                min={0.5}
                max={5}
                step={0.1}
                onChange={(value) =>
                  setCostParams({ holdingCostPerUnitPerDay: value })
                }
              />
              <CostSlider
                label="Stock-out Cost / Unit"
                value={costParams.stockOutCostPerUnit}
                min={1}
                max={20}
                step={1}
                onChange={(value) => setCostParams({ stockOutCostPerUnit: value })}
              />
              <CostSlider
                label="Ordering Cost / Order"
                value={costParams.orderingCostPerOrder}
                min={5}
                max={80}
                step={1}
                onChange={(value) => setCostParams({ orderingCostPerOrder: value })}
              />
            </div>

            <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold">Monte Carlo Settings</h3>
              <CostSlider
                label="Runs"
                value={monteCarloRuns}
                min={20}
                max={300}
                step={10}
                onChange={(value) => setMonteCarloRuns(Math.round(value))}
              />
              <CostSlider
                label="Days Per Run"
                value={monteCarloDays}
                min={30}
                max={180}
                step={10}
                onChange={(value) => setMonteCarloDays(Math.round(value))}
              />

              <div className="p-4 bg-prussian-blue-500 border border-prussian-blue-300 rounded-xl text-sm">
                <p>
                  Avg total cost across Monte Carlo runs: <span className="text-orange-500 font-bold">{monteCarlo.averageTotalCost.toFixed(0)}</span>
                </p>
                <p className="mt-2 text-prussian-blue-800">
                  Stock-out day distribution mean: {(
                    monteCarlo.stockOutDistribution.reduce(
                      (sum, value) => sum + value,
                      0,
                    ) / Math.max(1, monteCarlo.stockOutDistribution.length)
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Risk Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-prussian-blue-500 border border-prussian-blue-300 rounded-xl p-4">
                <p className="text-xs uppercase text-prussian-blue-800 font-bold">
                  P(Stock-out in next 7 days)
                </p>
                <p className="text-3xl font-black text-orange-500 mt-1">
                  {risk.stockOutProbabilityPercent.toFixed(1)}%
                </p>
              </div>
              <div className="bg-prussian-blue-500 border border-prussian-blue-300 rounded-xl p-4">
                <p className="text-xs uppercase text-prussian-blue-800 font-bold">
                  Worst-case Demand Spike
                </p>
                <p className="text-3xl font-black text-orange-500 mt-1">
                  {risk.worstCaseDemandSpike}
                </p>
              </div>
              <div className="bg-prussian-blue-500 border border-prussian-blue-300 rounded-xl p-4">
                <p className="text-xs uppercase text-prussian-blue-800 font-bold">
                  Minimum Inventory Reached
                </p>
                <p className="text-3xl font-black text-orange-500 mt-1">
                  {risk.minimumInventoryReached}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-20 text-center space-y-4">
          <div className="w-20 h-20 bg-prussian-blue-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={40} className="text-orange-500 opacity-50" />
          </div>
          <h3 className="text-2xl font-bold">No Data for Analysis</h3>
          <p className="text-prussian-blue-800 max-w-sm mx-auto">
            Please run the multi-cycle simulation first to generate operational
            data for behavioral analysis.
          </p>
          <button
            onClick={() => (window.location.href = "/simulation")}
            className="bg-orange-500 text-prussian-blue-500 px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform mt-4"
          >
            Go to Simulation
          </button>
        </div>
      )}
    </div>
  );
}

function CostSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-semibold">{label}</span>
        <span className="text-orange-500 font-bold">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-prussian-blue-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
    </div>
  );
}
