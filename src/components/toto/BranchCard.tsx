import { BranchId, colors, money } from "@/lib/toto-data";
import { cn } from "@/lib/utils";
import { Store } from "lucide-react";

interface BranchCardProps {
  id: BranchId;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  vat: number;
  isSelected?: boolean;
  onClick: () => void;
  role?: string;
}

export function BranchCard({
  id,
  name,
  revenue,
  expenses,
  profit,
  vat,
  isSelected,
  onClick,
  role,
}: BranchCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full p-5 text-left transition-all duration-200 rounded-2xl border-2",
        "hover:shadow-lg hover:-translate-y-1",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20"
          : "border-[#F0EEF4] bg-white hover:border-blue-300 hover:bg-blue-50/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
            <h3 className="text-lg font-semibold" style={{ color: colors.textDark }}>{name}</h3>
          </div>
          {role && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs" style={{ color: colors.textMuted }}>{role}</span>
            </div>
          )}
        </div>
        {isSelected && (
          <div className="flex-shrink-0">
            <div className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">Selected</div>
          </div>
        )}
      </div>

      {/* Metrics Grid – 2 columns x 2 rows */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>Revenue</p>
          <p className="font-bold" style={{ color: colors.textDark }}>{money(revenue)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>Expenses</p>
          <p className="font-bold" style={{ color: colors.textDark }}>{money(expenses)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>Profit</p>
          <p className="font-bold" style={{ color: profit >= 0 ? colors.accent : colors.secondary }}>
            {money(profit)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>VAT</p>
          <p className="font-bold" style={{ color: colors.textDark }}>{money(vat)}</p>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-transparent group-hover:ring-blue-500/20 transition-all" />
    </button>
  );
}
