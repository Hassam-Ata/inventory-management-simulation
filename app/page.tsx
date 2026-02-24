"use client";

import { Info, ArrowRight, Package, Users, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function OverviewPage() {
  return (
    <div className="space-y-12 pb-20">
      <header className="space-y-4">
        <h1 className="text-5xl font-black tracking-tighter text-platinum">
          Inventory{" "}
          <span className="text-orange-500 underline decoration-orange-500/30">
            Intelligence
          </span>
        </h1>
        <p className="text-xl text-prussian-blue-800 max-w-2xl leading-relaxed">
          A high-fidelity simulation engine for modeling inventory dynamics
          using Poisson demand processes and Markov Chain state transitions.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Users,
            title: "Poisson Demand",
            desc: "Customer arrivals modeled as discrete random variables following a Poisson distribution.",
          },
          {
            icon: Package,
            title: "Markov States",
            desc: "Inventory levels transition between discrete states (Full, Stock-out) based on probabilistic matrices.",
          },
          {
            icon: ShoppingCart,
            title: "Policy Simulation",
            desc: "Test reorder points and restocking quantities to minimize stock-outs and maximize efficiency.",
          },
        ].map((feat, i) => (
          <div
            key={i}
            className="bg-prussian-blue-400 p-8 rounded-3xl border border-prussian-blue-300 hover:border-orange-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/20 group-hover:scale-110 transition-transform">
              <feat.icon size={24} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
            <p className="text-prussian-blue-800 text-sm leading-relaxed">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>

      <section className="bg-prussian-blue-400 rounded-3xl border border-prussian-blue-300 p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <h2 className="text-3xl font-bold mb-8 flex items-center space-x-3">
          <Info className="text-orange-500" />
          <span>System Flow Diagram</span>
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0 relative z-10">
          <FlowStep
            icon={Users}
            label="Customer Demand"
            desc="Random Arrival (λ)"
          />
          <Arrow />
          <FlowStep
            icon={Package}
            label="Inventory Stock"
            desc="State Transition"
          />
          <Arrow />
          <FlowStep
            icon={ShoppingCart}
            label="Reorder Logic"
            desc="Threshold Check"
          />
        </div>
      </section>

      <div className="flex justify-center">
        <Link
          href="/demand"
          className="bg-orange-500 hover:bg-orange-600 text-prussian-blue-500 px-8 py-4 rounded-full font-bold text-lg flex items-center space-x-3 transition-all hover:scale-105 shadow-xl shadow-orange-500/20"
        >
          <span>Get Started</span>
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}

function FlowStep({
  icon: Icon,
  label,
  desc,
}: {
  icon: any;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center space-y-4 text-center max-w-[150px]">
      <div className="w-20 h-20 bg-prussian-blue-500 rounded-full flex items-center justify-center border-2 border-orange-500 shadow-lg group-hover:shadow-orange-500/20">
        <Icon size={32} className="text-orange-500" />
      </div>
      <div>
        <h4 className="font-bold text-lg">{label}</h4>
        <p className="text-xs text-prussian-blue-800">{desc}</p>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:block">
      <ArrowRight size={40} className="text-prussian-blue-300" />
    </div>
  );
}
