"use client";

import { useSimulationStore } from "@/lib/store/simulationStore";
import MetricCard from "@/components/MetricCard";
import {
  SlidersHorizontal,
  Boxes,
  MoveRight,
  RefreshCcw,
  Activity,
} from "lucide-react";

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: SliderFieldProps) {
  const denominator = Math.max(1, max - min);
  const progress = ((value - min) / denominator) * 100;

  return (
    <div className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400/70 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold tracking-wide text-platinum">{label}</h3>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-500">
          {value}
          {unit ? ` ${unit}` : ""}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="inv-slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-prussian-blue-300"
        style={{
          background: `linear-gradient(to right, #fca311 0%, #fca311 ${progress}%, #0c1425 ${progress}%, #0c1425 100%)`,
        }}
      />

      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-prussian-blue-800">
        <span>Min {min}</span>
        <span>Max {max}</span>
      </div>
    </div>
  );
}

export default function ParametersPage() {
  const { params, setParams } = useSimulationStore();
  const dynamicReorderMax = Math.max(1, params.maxInventory - 1);
  const dynamicRestockMax = params.maxInventory;
  const dynamicInitialMax = params.maxInventory;

  const stateRanges = [
    {
      name: "Stock-out",
      range: "0",
      detail: "No inventory available",
    },
    {
      name: "Low",
      range: `1 to ${Math.max(1, Math.floor(params.maxInventory * 0.25))}`,
      detail: `Up to 25% of max inventory`,
    },
    {
      name: "Medium",
      range: `${Math.max(1, Math.floor(params.maxInventory * 0.25)) + 1} to ${Math.max(1, Math.floor(params.maxInventory * 0.5))}`,
      detail: `26% to 50% of max inventory`,
    },
    {
      name: "High",
      range: `${Math.max(1, Math.floor(params.maxInventory * 0.5)) + 1} to ${Math.max(1, Math.floor(params.maxInventory * 0.75))}`,
      detail: `51% to 75% of max inventory`,
    },
    {
      name: "Full",
      range: `${Math.max(1, Math.floor(params.maxInventory * 0.75)) + 1} to ${params.maxInventory}`,
      detail: `Above 75% of max inventory`,
    },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <header className="relative overflow-hidden rounded-3xl border border-prussian-blue-300 bg-linear-to-br from-prussian-blue-400 to-prussian-blue-500 p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-prussian-blue-700/20 blur-2xl" />

        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-platinum">
            Parameter <span className="text-orange-500">Control Deck</span>
          </h1>

        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MetricCard
          label="Warehouse Capacity"
          value={params.maxInventory}
          icon={Boxes}
        />
        <MetricCard
          label="Demand Rate (lambda)"
          value={params.lambda.toFixed(1)}
          icon={Activity}
        />
      </div>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <SliderField
            label="Max Inventory"
            value={params.maxInventory}
            min={10}
            max={30}
            onChange={(value) => setParams({ maxInventory: value })}
          />

          <SliderField
            label="Reorder Point"
            value={params.reorderPoint}
            min={1}
            max={dynamicReorderMax}
            onChange={(value) => setParams({ reorderPoint: value })}
          />

          <SliderField
            label="Refill Amount"
            value={params.restockAmt}
            min={5}
            max={dynamicRestockMax}
            onChange={(value) => setParams({ restockAmt: value })}
          />

          <SliderField
            label="Initial Inventory"
            value={params.initialInventory}
            min={1}
            max={dynamicInitialMax}
            onChange={(value) => setParams({ initialInventory: value })}
          />
        </div>

        <aside className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <SlidersHorizontal className="text-orange-500" size={18} />
              Active Ranges
            </h2>

            <div className="space-y-4 text-sm">
              <RangeRow label="Max Inventory" value="10 to 30" />
              <RangeRow label="Reorder Point" value={`1 to ${dynamicReorderMax}`} />
              <RangeRow label="Refill Amount" value={`5 to ${dynamicRestockMax}`} />
              <RangeRow label="Initial Inventory" value={`1 to ${dynamicInitialMax}`} />
              <RangeRow label="Lambda" value="0.5 to 10.0" />
            </div>

          </div>

          <div className="rounded-2xl border border-prussian-blue-300 bg-prussian-blue-400 p-6">
            <h2 className="mb-4 text-lg font-bold">State Map</h2>
            <p className="mb-4 text-sm text-prussian-blue-800">
              Current state thresholds derived from Max Inventory = {params.maxInventory}.
            </p>
            <div className="space-y-3">
              {stateRanges.map((state) => (
                <div
                  key={state.name}
                  className="rounded-xl border border-prussian-blue-300 bg-prussian-blue-500/30 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-platinum">{state.name}</div>
                      <div className="text-xs text-prussian-blue-800">{state.detail}</div>
                    </div>
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm font-black text-orange-500">
                      {state.range}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </aside>
      </section>
    </div>
  );
}

function RangeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-prussian-blue-300 bg-prussian-blue-500/30 px-3 py-2">
      <span className="text-prussian-blue-800">{label}</span>
      <span className="font-bold text-platinum">{value}</span>
    </div>
  );
}

function FlowRow({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-prussian-blue-300 bg-prussian-blue-500/30 px-3 py-2">
      <span>{from}</span>
      <MoveRight size={14} className="mx-2 shrink-0 text-orange-500" />
      <span>{to}</span>
    </div>
  );
}
