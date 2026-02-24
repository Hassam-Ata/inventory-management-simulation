import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
}: MetricCardProps) {
  return (
    <div className="bg-prussian-blue-400 border border-prussian-blue-300 p-6 rounded-2xl shadow-lg relative group">
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-prussian-blue-800">
            <Icon size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {label}
            </span>
          </div>
          <div className="text-3xl font-black text-platinum tracking-tight">
            {value}
          </div>

          {trend && (
            <div
              className={`text-xs font-bold flex items-center space-x-1 ${trend.positive ? "text-green-400" : "text-orange-500"}`}
            >
              <span>{trend.positive ? "↑" : "↓"}</span>
              <span>{trend.value}</span>
              <span className="text-prussian-blue-700 font-normal">
                from yesterday
              </span>
            </div>
          )}
        </div>

        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
          <Icon size={24} className="text-orange-500" />
        </div>
      </div>
    </div>
  );
}
