import * as React from "react";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseDesignCardMetric {
  label: string;
  value: string;
  accent?: boolean;
}

export interface CourseDesignCardProps {
  title: string;
  role?: string;
  metrics: CourseDesignCardMetric[];
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CourseDesignCard({
  title,
  role,
  metrics,
  isSelected,
  onClick,
  className,
}: CourseDesignCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-[20px] border border-[#E5E7EB] bg-[#F3F5F7] p-5 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
        isSelected && "border-[#60A5FA] bg-[#EEF6FF] shadow-[0_12px_28px_rgba(59,130,246,0.12)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE3EA] bg-white/70 text-[#4B5563]">
            <Store className="h-4 w-4" />
          </div>
          <h3 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#1F2937]">{title}</h3>
        </div>
      </div>

      {role && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[#4B5563]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
          <span>{role}</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <p className="text-[0.8rem] text-[#6B7280]">{metric.label}</p>
            <p
              className={cn(
                "mt-1 font-semibold leading-5 text-[#111827]",
                metric.accent && "text-[#14B8A6]",
              )}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {isSelected && (
        <div className="absolute right-4 top-4 rounded-full bg-[#3B82F6] px-2 py-1 text-[10px] font-medium text-white">
          Selected
        </div>
      )}
    </button>
  );
}

export default CourseDesignCard;
