"use client";

import { useMemo } from "react";
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
  const { history, params } = useSimulationStore();

  const metrics = useMemo(() => {
    if (history.length === 0) return null;

    const totalDays = history.length;
    const stockOutDays = history.filter((d) => d.stockOutOccurred).length;
    const totalDemand = history.reduce((acc, curr) => acc + curr.demand, 0);
    const lostDemand = history.reduce((acc, curr) => acc + curr.lostDemand, 0);
    const avgInventory =
      history.reduce((acc, curr) => acc + curr.inventoryAfter, 0) / totalDays;
    const leadTimes = history
      .map((d) => d.orderLeadTime)
      .filter((value): value is number => value !== null);
    const avgLeadTime =
      leadTimes.length > 0
        ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length
        : 0;
    const pendingOrderDays = history.filter(
      (d) => d.pendingOrdersEndOfDay > 0,
    ).length;

    return {
      stockOutProb: ((stockOutDays / totalDays) * 100).toFixed(1),
      serviceLevel:
        totalDemand > 0 ? ((1 - lostDemand / totalDemand) * 100).toFixed(1) : "100.0",
      inventoryTurnover: (totalDemand / avgInventory).toFixed(2),
      efficiencyScore: (85 - (stockOutDays / totalDays) * 100).toFixed(1),
      avgLeadTime: avgLeadTime.toFixed(2),
      pendingOrderShare: ((pendingOrderDays / totalDays) * 100).toFixed(1),
    };
  }, [history]);

  const barData = {
    labels: ["Service Level", "Efficiency", "Turnover (x10)"],
    datasets: [
      {
        label: "Current Performance",
        data: metrics
          ? [
              parseFloat(metrics.serviceLevel),
              parseFloat(metrics.efficiencyScore),
              parseFloat(metrics.inventoryTurnover) * 10,
            ]
          : [0, 0, 0],
        backgroundColor: ["#fca311", "#3e67bf", "#7e99d5"],
        borderRadius: 12,
      },
    ],
  };

  const recommendations = useMemo(() => {
    if (!metrics) return [];
    const recs = [];

    if (parseFloat(metrics.stockOutProb) > 5) {
      recs.push({
        title: "Raise Safety Stock Buffer",
        desc: "Current stock-out risk is above 5%. With delayed replenishment, increasing reorder point by 2-3 units helps absorb lead-time demand.",
        icon: ShieldCheck,
        color: "text-orange-500",
      });
    } else {
      recs.push({
        title: "Inventory Optimized",
        desc: "Your current reorder point is maintaining a low stock-out risk. Current policy is efficient.",
        icon: ShieldCheck,
        color: "text-green-400",
      });
    }

    if (parseFloat(metrics.inventoryTurnover) < 0.5) {
      recs.push({
        title: "Reduce Restock Amount",
        desc: "Inventory turnover is low, leading to high holding costs. Try reducing the batch size.",
        icon: Zap,
        color: "text-blue-400",
      });
    } else {
      recs.push({
        title: "Balanced Turnover",
        desc: "The flow of goods matches demand patterns effectively. High operational turnover observed.",
        icon: Zap,
        color: "text-orange-500",
      });
    }

    if (parseFloat(metrics.pendingOrderShare) > 60) {
      recs.push({
        title: "Lead Time Exposure Is High",
        desc: "Orders are pending for most days. Consider lowering the lead-time range or increasing reorder point to reduce vulnerable periods.",
        icon: AlertTriangle,
        color: "text-orange-500",
      });
    }

    return recs;
  }, [metrics]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
            <MetricCard
              label="Avg Lead Time"
              value={`${metrics.avgLeadTime} d`}
              icon={ShieldCheck}
            />
            <MetricCard
              label="Pending-Order Days"
              value={`${metrics.pendingOrderShare}%`}
              icon={AlertTriangle}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer
              title="Performance Benchmarks"
              description="Key indicators normalized for long-term goal tracking."
            >
              <Bar
                data={barData}
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
                    <span>Policy Recommendation</span>
                  </h4>
                  <p className="text-sm text-platinum italic">
                    &quot;Based on a Poisson demand rate of λ={params.lambda}, we
                    suggest a reorder point of {Math.ceil(params.lambda * 1.5)}{" "}
                    units to maintain a 95% service level while minimizing dead
                    stock.&quot;
                  </p>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/20 blur-3xl rounded-full group-hover:bg-orange-500/30 transition-all" />
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
