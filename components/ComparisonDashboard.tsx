"use client";

import { useMemo, useState } from "react";
import { Bar, Line, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Layers3,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import ChartContainer from "@/components/ChartContainer";
import MetricCard from "@/components/MetricCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type RunRecord = {
  id: string;
  day: number;
  demand: number;
  inventoryBefore: number;
  inventoryAfter: number;
  stockOutOccurred: boolean;
  fulfilledDemand: number;
  lostDemand: number;
  receivedQty: number;
  orderPlacedQty: number;
  orderLeadTime: number | null;
  pendingOrdersEod: number;
  pendingUnitsEod: number;
};

type Run = {
  id: string;
  createdAt: string;
  days: number;
  lambda: number;
  reorderPoint: number;
  restockAmt: number;
  maxInventory: number;
  initialInventory: number;
  leadTimeMin: number;
  leadTimeMax: number;
  endingInventory: number;
  records: RunRecord[];
};

interface ComparisonDashboardProps {
  runs: Run[];
}

type RunStats = {
  serviceLevel: number;
  stockOutRate: number;
  avgInventory: number;
  avgDemand: number;
  avgLeadTime: number;
  pendingShare: number;
  ordersPlaced: number;
  totalReceived: number;
};

export default function ComparisonDashboard({ runs }: ComparisonDashboardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    getInitialSelection(runs),
  );

  const toggleSelection = (id: string) => {
    const runToToggle = runs.find((run) => run.id === id);
    if (!runToToggle) return;

    setSelectedIds((current) => {
      const currentSelectedRun = runs.find((run) => run.id === current[0]);
      const currentDays = currentSelectedRun?.days;

      if (current.includes(id)) {
        return current.filter((value) => value !== id);
      }

      if (currentDays !== undefined && currentDays !== runToToggle.days) {
        return current;
      }

      if (current.length >= 5) {
        return current;
      }

      return [...current, id];
    });
  };

  const selectedRuns = useMemo(
    () => runs.filter((run) => selectedIds.includes(run.id)),
    [runs, selectedIds],
  );

  const selectedDayCount = selectedRuns[0]?.days ?? null;

  const statsByRun = useMemo(() => {
    return selectedRuns.reduce<Record<string, RunStats>>((acc, run) => {
      const totalDays = run.records.length || 1;
      const totalDemand = run.records.reduce((sum, day) => sum + day.demand, 0);
      const totalFulfilled = run.records.reduce(
        (sum, day) => sum + day.fulfilledDemand,
        0,
      );
      const avgInventory =
        run.records.reduce((sum, day) => sum + day.inventoryAfter, 0) / totalDays;
      const leadTimes = run.records
        .map((day) => day.orderLeadTime)
        .filter((value): value is number => value !== null);
      const avgLeadTime =
        leadTimes.length > 0
          ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length
          : 0;
      const pendingDays = run.records.filter(
        (day) => day.pendingOrdersEod > 0,
      ).length;
      const ordersPlaced = run.records.filter(
        (day) => day.orderPlacedQty > 0,
      ).length;
      const totalReceived = run.records.reduce(
        (sum, day) => sum + day.receivedQty,
        0,
      );

      acc[run.id] = {
        serviceLevel: totalDemand > 0 ? (totalFulfilled / totalDemand) * 100 : 100,
        stockOutRate: (run.records.filter((day) => day.stockOutOccurred).length / totalDays) * 100,
        avgInventory,
        avgDemand: totalDemand / totalDays,
        avgLeadTime,
        pendingShare: (pendingDays / totalDays) * 100,
        ordersPlaced,
        totalReceived,
      };

      return acc;
    }, {});
  }, [selectedRuns]);

  const longestDays = Math.max(...selectedRuns.map((run) => run.records.length), 0);

  const timelineLabels = Array.from({ length: longestDays }, (_, index) => `Day ${index + 1}`);

  const inventoryLineData = {
    labels: timelineLabels,
    datasets: selectedRuns.map((run, index) => ({
      label: `Run ${index + 1}`,
      data: Array.from({ length: longestDays }, (_, dayIndex) => {
        const record = run.records[dayIndex];
        return record ? record.inventoryAfter : null;
      }),
      borderColor: palette[index % palette.length],
      backgroundColor: `${palette[index % palette.length]}22`,
      tension: 0.35,
      fill: false,
      spanGaps: true,
      pointRadius: 2,
    })),
  };

  const serviceLevelBar = {
    labels: selectedRuns.map((run, index) => `Run ${index + 1}`),
    datasets: [
      {
        label: "Service Level %",
        data: selectedRuns.map((run) => statsByRun[run.id]?.serviceLevel ?? 0),
        backgroundColor: selectedRuns.map((_, index) => palette[index % palette.length]),
        borderRadius: 10,
      },
    ],
  };

  const riskBar = {
    labels: selectedRuns.map((run, index) => `Run ${index + 1}`),
    datasets: [
      {
        label: "Stock-out %",
        data: selectedRuns.map((run) => statsByRun[run.id]?.stockOutRate ?? 0),
        backgroundColor: selectedRuns.map((_, index) => `${palette[index % palette.length]}cc`),
        borderRadius: 10,
      },
    ],
  };

  const radarData = {
    labels: ["Service", "Inventory", "Lead Time", "Pending Days", "Received"],
    datasets: selectedRuns.map((run, index) => {
      const stats = statsByRun[run.id];
      const normalizedInventory = ((stats?.avgInventory ?? 0) / Math.max(run.maxInventory, 1)) * 100;
      const normalizedLeadTime = 100 - ((stats?.avgLeadTime ?? 0) / Math.max(run.leadTimeMax, 1)) * 100;
      const normalizedPending = 100 - (stats?.pendingShare ?? 0);
      const normalizedReceived = Math.min(
        100,
        ((stats?.totalReceived ?? 0) / Math.max(run.days, 1)) * 5,
      );

      return {
        label: `Run ${index + 1}`,
        data: [
          stats?.serviceLevel ?? 0,
          Math.max(0, Math.min(100, normalizedInventory)),
          Math.max(0, Math.min(100, normalizedLeadTime)),
          Math.max(0, Math.min(100, normalizedPending)),
          Math.max(0, Math.min(100, normalizedReceived)),
        ],
        borderColor: palette[index % palette.length],
        backgroundColor: `${palette[index % palette.length]}22`,
        pointBackgroundColor: palette[index % palette.length],
      };
    }),
  };

  const comparisonRows = useMemo(() => {
    return timelineLabels.map((label, index) => {
      const perRun = selectedRuns.map((run) => run.records[index] ?? null);
      return {
        label,
        perRun,
      };
    });
  }, [selectedRuns, timelineLabels]);

  const canCompare =
    selectedRuns.length >= 2 &&
    selectedRuns.every((run) => run.days === selectedDayCount);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <header className="space-y-3">
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Simulation <span className="text-orange-500">Comparison</span>
        </h1>
        <p className="text-prussian-blue-800 max-w-3xl">
          Select 2 to 5 saved runs from the database and compare their demand,
          inventory, lead-time exposure, and service outcomes across multiple
          visual formats.
        </p>
      </header>

      <section className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-platinum">Choose Simulations</h2>
            <p className="text-sm text-prussian-blue-800">
              Pick at least 2 and at most 5 runs. Only simulations with the same number of days can be compared.
            </p>
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-prussian-blue-800">
            {selectedRuns.length} selected / {runs.length} available
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-500 p-6 text-prussian-blue-800">
            No saved simulations are available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {runs.map((run, index) => {
              const isSelected = selectedIds.includes(run.id);
              const isLockedToDayCount =
                selectedDayCount !== null && run.days !== selectedDayCount;
              const isDisabled =
                (!isSelected && selectedIds.length >= 5) || isLockedToDayCount;
              return (
                <label
                  key={run.id}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-prussian-blue-300 bg-prussian-blue-500 hover:border-orange-500/30"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleSelection(run.id)}
                      className="mt-1 accent-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-platinum">Run {index + 1}</p>
                        <span className="text-[10px] uppercase font-bold text-prussian-blue-700">
                          {run.days} days
                        </span>
                      </div>
                      <p className="text-xs text-prussian-blue-800 mt-1">
                        λ {run.lambda} · RP {run.reorderPoint} · LT {run.leadTimeMin}-{run.leadTimeMax}
                      </p>
                      <p className="text-[11px] text-prussian-blue-800 mt-2">
                        Started with {run.initialInventory} units, ended with {run.endingInventory}.
                      </p>
                      {selectedDayCount !== null && (
                        <p className="text-[10px] uppercase tracking-wide mt-2 text-prussian-blue-700 font-bold">
                          {isLockedToDayCount ? "Different day count" : `Compatible with ${selectedDayCount} days`}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold text-prussian-blue-800">
          <Clock3 size={14} className="text-orange-500" />
          Minimum 2 selections are required. Maximum 5 selections are allowed. {selectedDayCount ? `Current comparison is locked to ${selectedDayCount}-day simulations.` : ""}
        </div>
      </section>

      {canCompare ? (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard label="Selected Runs" value={selectedRuns.length} icon={Layers3} />
            <MetricCard
              label="Best Service Level"
              value={`${Math.max(...selectedRuns.map((run) => statsByRun[run.id].serviceLevel)).toFixed(1)}%`}
              icon={CheckCircle2}
            />
            <MetricCard
              label="Worst Stock-out Risk"
              value={`${Math.max(...selectedRuns.map((run) => statsByRun[run.id].stockOutRate)).toFixed(1)}%`}
              icon={ShieldAlert}
            />
            <MetricCard
              label="Avg Lead Time"
              value={`${averageOf(selectedRuns.map((run) => statsByRun[run.id].avgLeadTime)).toFixed(2)} d`}
              icon={Clock3}
            />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <ChartContainer
              title="Inventory Trajectories"
              description="How on-hand stock evolved across the selected runs."
            >
              <Line
                data={inventoryLineData}
                options={lineOptions}
              />
            </ChartContainer>

            <ChartContainer
              title="Service vs Stock-out"
              description="A direct view of service quality and risk across runs."
            >
              <Bar data={serviceLevelBar} options={barOptions} />
            </ChartContainer>

            <ChartContainer
              title="Stock-out Risk"
              description="Higher bars mean more days with stock-outs."
            >
              <Bar data={riskBar} options={barOptions} />
            </ChartContainer>

            <ChartContainer
              title="Normalized Multi-Factor Radar"
              description="A compact view of service, lead time, and pending-order exposure."
            >
              <Radar data={radarData} options={radarOptions} />
            </ChartContainer>
          </div>

          <section className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-6 shadow-xl overflow-x-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-platinum">Day-by-Day Comparison</h2>
                <p className="text-sm text-prussian-blue-800">
                  Each row compares the selected simulations on the same simulated day index.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIds(selectedRuns.map((run) => run.id).slice(0, 2))}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full border border-prussian-blue-300 text-prussian-blue-800 hover:text-platinum hover:border-orange-500/30 transition-colors"
              >
                <RotateCcw size={14} />
                Reset to first 2
              </button>
            </div>

            <table className="w-full text-sm text-left min-w-240">
              <thead className="text-xs font-bold text-prussian-blue-800 uppercase bg-prussian-blue-500/30 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  {selectedRuns.map((run, index) => (
                    <th key={run.id} className="px-4 py-3">Run {index + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-prussian-blue-300">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="hover:bg-prussian-blue-300/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-platinum">{row.label}</td>
                    {row.perRun.map((record, index) => (
                      <td key={`${row.label}-${index}`} className="px-4 py-3 text-prussian-blue-800">
                        {record ? (
                          <div className="space-y-1">
                            <div className="font-bold text-platinum">Inv {record.inventoryAfter}</div>
                            <div className="text-[11px]">Demand {record.demand} · Rec {record.receivedQty} · Ord {record.orderPlacedQty}</div>
                            <div className="text-[11px]">Pending {record.pendingOrdersEod} · LT {record.orderLeadTime ?? "-"}</div>
                          </div>
                        ) : (
                          <span className="text-prussian-blue-700">No data</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {selectedRuns.map((run, index) => (
              <RunSummaryCard key={run.id} run={run} stats={statsByRun[run.id]} index={index} />
            ))}
          </section>
        </>
      ) : (
        <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-10 text-center text-prussian-blue-800">
          Please select at least two simulations to start the comparison.
        </div>
      )}
    </div>
  );
}

function RunSummaryCard({
  run,
  stats,
  index,
}: {
  run: Run;
  stats?: RunStats;
  index: number;
}) {
  return (
    <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-platinum">Run {index + 1}</h3>
          <p className="text-xs text-prussian-blue-800">
            {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-500">
          <CalendarDays size={14} />
          {run.days} days
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <MiniStat label="Service" value={`${stats?.serviceLevel.toFixed(1) ?? "0.0"}%`} />
        <MiniStat label="Stock-out" value={`${stats?.stockOutRate.toFixed(1) ?? "0.0"}%`} />
        <MiniStat label="Avg Inv" value={stats?.avgInventory.toFixed(1) ?? "0.0"} />
        <MiniStat label="Avg Demand" value={stats?.avgDemand.toFixed(1) ?? "0.0"} />
        <MiniStat label="Lead Time" value={`${stats?.avgLeadTime.toFixed(2) ?? "0.00"} d`} />
        <MiniStat label="Pending Days" value={`${stats?.pendingShare.toFixed(1) ?? "0.0"}%`} />
      </div>

      <div className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-500 p-4 text-sm text-prussian-blue-800 space-y-2">
        <div>Initial inventory: <span className="text-platinum font-bold">{run.initialInventory}</span></div>
        <div>Restock amount: <span className="text-platinum font-bold">{run.restockAmt}</span></div>
        <div>Lead-time window: <span className="text-platinum font-bold">{run.leadTimeMin}-{run.leadTimeMax} days</span></div>
        <div>Ending inventory: <span className="text-platinum font-bold">{run.endingInventory}</span></div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-prussian-blue-300 bg-prussian-blue-500 p-3">
      <div className="text-[10px] uppercase tracking-wide text-prussian-blue-800 font-bold">{label}</div>
      <div className="text-platinum font-bold mt-1">{value}</div>
    </div>
  );
}

const palette = ["#fca311", "#3e67bf", "#7e99d5", "#6d28d9", "#0ea5e9"];

const lineOptions = {
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

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#e5e5e5" } },
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

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      angleLines: { color: "rgba(229, 229, 229, 0.1)" },
      grid: { color: "rgba(229, 229, 229, 0.1)" },
      pointLabels: { color: "#e5e5e5" },
      ticks: { display: false, suggestedMin: 0, suggestedMax: 100 },
    },
  },
  plugins: {
    legend: {
      labels: { color: "#e5e5e5" },
    },
  },
};

function averageOf(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getInitialSelection(runs: Run[]) {
  const groupedRuns = new Map<number, Run[]>();

  for (const run of runs) {
    const group = groupedRuns.get(run.days) ?? [];
    group.push(run);
    groupedRuns.set(run.days, group);
  }

  const firstComparableGroup = Array.from(groupedRuns.values()).find(
    (group) => group.length >= 2,
  );

  if (firstComparableGroup) {
    return firstComparableGroup.slice(0, 5).map((run) => run.id);
  }

  return runs.slice(0, Math.min(1, runs.length)).map((run) => run.id);
}
