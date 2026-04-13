"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Activity,
  LineChart,
  History,
  SlidersHorizontal,
  GitCompareArrows,
  Settings,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Poisson Demand", href: "/demand", icon: BarChart3 },
  { name: "Parameters", href: "/parameters", icon: SlidersHorizontal },
  { name: "Markov Chain", href: "/markov", icon: Activity },
  { name: "Simulation", href: "/simulation", icon: LineChart },
  { name: "Comparison", href: "/comparison", icon: GitCompareArrows },
  { name: "History", href: "/history", icon: History },
  { name: "Analysis", href: "/analysis", icon: AlertCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen w-64 bg-prussian-blue-400 border-r border-prussian-blue-300 text-platinum">
      <div className="p-6 flex items-center space-x-3 border-b border-prussian-blue-300">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Activity size={24} className="text-prussian-blue-500" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          InvSim <span className="text-orange-500">Pro</span>
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-orange-500 text-prussian-blue-500 shadow-md font-semibold"
                  : "hover:bg-prussian-blue-300 text-prussian-blue-800 hover:text-platinum",
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive
                    ? "text-prussian-blue-500"
                    : "text-orange-500 group-hover:scale-110 transition-transform",
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-prussian-blue-300 space-y-4">
        <div className="bg-prussian-blue-300/50 p-4 rounded-xl border border-prussian-blue-200">
          <div className="flex items-center space-x-2 text-orange-500 mb-2">
            <HelpCircle size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Quick Note
            </span>
          </div>
          <p className="text-[11px] text-prussian-blue-800 leading-relaxed">
            Adjust simulation parameters in the settings tab to see real-time
            Markov updates.
          </p>
        </div>

        <button className="w-full flex items-center space-x-3 px-4 py-2 text-prussian-blue-800 hover:text-platinum rounded-lg hover:bg-prussian-blue-300 transition-colors">
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
