import { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function ChartContainer({
  title,
  description,
  children,
  className,
  action,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "bg-prussian-blue-400 border border-prussian-blue-300 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-orange-500/30 transition-colors duration-300",
        className,
      )}
    >
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-platinum tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-prussian-blue-700 mt-1">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="relative h-64 w-full">{children}</div>
    </div>
  );
}
