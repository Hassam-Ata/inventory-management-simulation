"use client";

import { useMemo } from "react";
import {
  Clock3,
  PackageCheck,
  Truck,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useSimulationStore } from "@/lib/store/simulationStore";

export default function LeadTimePage() {
  const { params, history } = useSimulationStore();

  const summary = useMemo(() => {
    if (history.length === 0) {
      return {
        ordersPlaced: 0,
        totalReceived: 0,
        avgLeadTime: 0,
        pendingToday: 0,
      };
    }

    const leadTimes = history
      .map((d) => d.orderLeadTime)
      .filter((value): value is number => value !== null);

    const totalReceived = history.reduce((sum, day) => sum + day.receivedQty, 0);
    const pendingToday = history[history.length - 1].pendingOrdersEndOfDay;

    return {
      ordersPlaced: leadTimes.length,
      totalReceived,
      avgLeadTime:
        leadTimes.length > 0
          ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length
          : 0,
      pendingToday,
    };
  }, [history]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-platinum tracking-tight">
          Stochastic <span className="text-orange-500">Lead Time</span>
        </h1>
        <p className="text-prussian-blue-800 max-w-3xl">
          Restocking is no longer instant. When inventory crosses the reorder
          threshold, the system places a purchase order that arrives after a
          random delay.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Clock3}
          label="Lead-Time Window"
          value={`${params.leadTimeMin}-${params.leadTimeMax} days`}
        />
        <StatCard
          icon={Truck}
          label="Orders Placed"
          value={summary.ordersPlaced.toString()}
        />
        <StatCard
          icon={PackageCheck}
          label="Units Received"
          value={summary.totalReceived.toString()}
        />
        <StatCard
          icon={AlertTriangle}
          label="Avg. Realized Lead Time"
          value={`${summary.avgLeadTime.toFixed(2)} days`}
        />
      </section>

      <section className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-8 space-y-6">
        <h2 className="text-xl font-bold">How The Rule Works</h2>
        <ol className="space-y-3 text-sm text-prussian-blue-800 leading-relaxed list-decimal list-inside">
          <li>Demand is sampled and fulfilled with current on-hand inventory.</li>
          <li>
            If end-of-day inventory is at or below reorder point, place one
            purchase order if there is no order already pending.
          </li>
          <li>
            Lead time L is sampled uniformly from the configured interval: every
            integer day between min and max has equal probability.
          </li>
          <li>
            The order arrives on day d + L, and then inventory is increased
            (without exceeding max capacity).
          </li>
        </ol>
      </section>

      <section className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Why This Is A Major Upgrade</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-prussian-blue-800">
          <Insight
            title="More Realistic Risk"
            text="Demand continues while replenishment is in transit, so stock-outs can occur even after an order is placed."
          />
          <Insight
            title="Pending Orders Matter"
            text="System behavior depends on both on-hand stock and whether an order is pending."
          />
          <Insight
            title="Deeper Markov Analysis"
            text="State transitions now include pipeline status, producing a richer long-run stochastic model."
          />
        </div>
      </section>

      <section className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-8">
        <h2 className="text-xl font-bold text-orange-500 mb-2">Current Run Snapshot</h2>
        <p className="text-sm text-platinum">
          Pending purchase orders at end of latest day: {summary.pendingToday}
        </p>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6">
      <div className="w-10 h-10 rounded-lg bg-prussian-blue-500 flex items-center justify-center mb-4">
        <Icon className="text-orange-500" size={20} />
      </div>
      <p className="text-xs uppercase tracking-wide text-prussian-blue-800 font-bold">
        {label}
      </p>
      <p className="text-xl font-black text-platinum mt-1">{value}</p>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-prussian-blue-300 bg-prussian-blue-500 p-4">
      <h3 className="font-bold text-platinum mb-2">{title}</h3>
      <p>{text}</p>
    </div>
  );
}
