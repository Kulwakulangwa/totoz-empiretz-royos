import { cn } from "@/lib/utils";
import {
  navItems,
  type BranchId,
  type SectionId,
  colors,
  branchLabel,
  isWarehouse,
  isShop,
} from "@/lib/toto-data";
import { AppLogo } from "./AppLogo";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";
import { useToto } from "@/lib/toto-store";
import { useState, useEffect } from "react";

const iconMap: Record<string, string> = {
  overview: "📊",
  pos: "🛍️",
  sales: "📋",
  returns: "🔄",
  inventory: "📦",
  stocking: "🚚",
  expenses: "💰",
  staff: "👥",
  reports: "📈",
  settings: "⚙️",
};

type Props = {
  shop: BranchId;
  section: SectionId;
  isOwner: boolean;
  onSection: (id: SectionId) => void;
};

export function Sidebar({ shop, section, isOwner, onSection }: Props) {
  const { signOut } = useAuth();
  const { pendingOrderCount, orders } = useToto();
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count when orders change
  useEffect(() => {
    const count = orders.filter((o) => o.status === "pending").length;
    setPendingCount(count);
  }, [orders]);

  // Also refresh count periodically or when orders change
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await pendingOrderCount();
        setPendingCount(count);
      } catch (err) {
        // Silent fail - count will be updated from state
      }
    };
    fetchCount();
  }, [pendingOrderCount]);

  const branchName = branchLabel(shop);
  const isWarehouseBranch = isWarehouse(shop);
  const isShopBranch = isShop(shop);

  // Build navigation items based on branch type and role
  let visibleNav = [];

  if (isWarehouseBranch) {
    // Warehouse users: only warehouse-relevant items
    visibleNav = [
      { id: "overview", label: "Dashboard", ownerOnly: true, icon: "📊" },
      { id: "warehouse", label: "Warehouse", ownerOnly: true, icon: "🏪" },
      { id: "stock-requests", label: "Stock Requests", ownerOnly: false, icon: "📦" },
      { id: "pending-orders", label: "Pending Orders", ownerOnly: true, icon: "⏳" },
      { id: "expenses", label: "Expenses", ownerOnly: true, icon: "💰" },
      { id: "staff", label: "Staff", ownerOnly: true, icon: "👥" },
      { id: "reports", label: "Reports", ownerOnly: true, icon: "📈" },
      { id: "settings", label: "Settings", ownerOnly: true, icon: "⚙️" },
    ];
  } else if (isShopBranch) {
    // Shop users: shop-relevant items (including POS, Sales, Returns)
    if (isOwner) {
      visibleNav = [
        ...navItems,
        { id: "create-order", label: "Create Order", ownerOnly: false, icon: "📤" },
      ];
    } else {
      visibleNav = [
        { id: "pos", label: "Point of Sale", ownerOnly: false, icon: "🛍️" },
        { id: "sales", label: "Sales", ownerOnly: false, icon: "📋" },
        { id: "returns", label: "Returns", ownerOnly: false, icon: "🔄" },
        { id: "stock-requests", label: "Stock Requests", ownerOnly: false, icon: "📦" },
        { id: "create-order", label: "Create Order", ownerOnly: false, icon: "📤" },
      ];
    }
  } else {
    // Fallback: use default nav
    visibleNav = isOwner ? navItems : navItems.filter((item) => !item.ownerOnly);
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-[220px] md:min-h-full md:bg-white md:border-r md:border-[#F0EEF4] md:flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#F0EEF4]">
        <div className="flex items-center gap-3">
          <AppLogo className="size-12" />
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: colors.textDark }}>
              Totoz Empire
            </h1>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Retail Management
            </p>
          </div>
        </div>
      </div>

      {/* Branch */}
      <div className="px-4 py-3 border-b border-[#F0EEF4]">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: colors.tealLight }}
        >
          <span className="text-sm">🏪</span>
          <span className="text-sm font-medium truncate" style={{ color: colors.textDark }}>
            {branchName}
          </span>
          {isWarehouseBranch && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/60 text-[#5B3A96] ml-auto">
              Warehouse
            </span>
          )}
          {isShopBranch && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/60 text-[#E93FA0] ml-auto">
              Shop
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = section === item.id;
          const showBadge = item.id === "pending-orders" && pendingCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSection(item.id as SectionId)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                isActive ? "text-white shadow-sm" : "hover:bg-[#F7F7FA]",
              )}
              style={{
                background: isActive ? colors.primary : "transparent",
                color: isActive ? colors.white : colors.textMuted,
              }}
            >
              <span className="text-base flex-shrink-0">{iconMap[item.id] || "📄"}</span>
              <span className="truncate">{item.label}</span>
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#F0EEF4]">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="size-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
