import { BranchId } from "@/lib/toto-data";
import { cn } from "@/lib/utils";
import { Store, TrendingUp, Users } from "lucide-react";

interface BranchCardProps {
  id: BranchId;
  name: string;
  todaySales: number;
  isSelected?: boolean;
  onClick: () => void;
  role?: string;
  userCount?: number;
}

export function BranchCard({
  id,
  name,
  todaySales,
  isSelected,
  onClick,
  role,
  userCount,
}: BranchCardProps) {
  const formattedSales = new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(todaySales);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full p-6 text-left transition-all duration-200 rounded-xl border-2",
        "hover:shadow-lg hover:-translate-y-1",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20"
          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          </div>
          {role && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">{role}</span>
            </div>
          )}
        </div>
        {isSelected && (
          <div className="flex-shrink-0">
            <div className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">
              Selected
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-500">Today's Sales</p>
          <p className="text-xl font-bold text-gray-900">{formattedSales}</p>
        </div>
        {userCount !== undefined && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{userCount} staff</span>
          </div>
        )}
      </div>

      {/* Hover effect indicator */}
      <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-transparent group-hover:ring-blue-500/20 transition-all" />
    </button>
  );
}
