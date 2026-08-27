import { cn } from "@/lib/utils";
import { navItems, type BranchId, type SectionId, colors } from "@/lib/toto-data";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Plus } from "lucide-react";

const iconMap: Record<string, string> = {
  overview: "📊",
  pos: "🛍️",
  sales: "📋",
  returns: "🔄",
  inventory: "📦",
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
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();
  const visibleNav = isOwner
    ? navItems.filter((item) => item.id !== "sales")
    : [
        { id: "pos", label: "Point of Sale", ownerOnly: false, icon: "🛍️" },
        { id: "sales", label: "Sales", ownerOnly: false, icon: "📋" },
      ];

  const branchName = "Totoz Empire";

  return (
    <aside className="hidden md:flex md:flex-col md:w-[220px] md:min-h-full md:bg-white md:border-r md:border-[#F0EEF4] md:flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#F0EEF4]">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            TE
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: colors.textDark }}>
              Toto Empire
            </h1>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Retail Management
            </p>
          </div>
        </div>
      </div>

      {/* Branch */}
      <div className="px-4 py-3 border-b border-[#F0EEF4]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: colors.tealLight }}>
          <span className="text-sm">🏪</span>
          <span className="text-sm font-medium truncate" style={{ color: colors.textDark }}>
            {branchName}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-white shadow-sm"
                  : "hover:bg-[#F7F7FA]"
              )}
              style={{
                background: isActive ? colors.primary : "transparent",
                color: isActive ? colors.white : colors.textMuted,
              }}
            >
              <span className="text-base flex-shrink-0">{iconMap[item.id] || "📄"}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* New Goods CTA */}
      <div className="px-3 py-3 border-t border-[#F0EEF4]">
        <div
          className="rounded-xl p-4 text-center border-2 border-dashed"
          style={{
            background: colors.lavenderLight,
            borderColor: colors.primary + "40",
          }}
        >
          <p className="text-sm font-medium" style={{ color: colors.primary }}>
            + New Goods
          </p>
          <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            Add products to inventory
          </p>
          <button
            onClick={() => onSection("inventory")}
            className="mt-2 mx-auto flex items-center justify-center size-8 rounded-full text-white transition-transform hover:scale-105"
            style={{ background: colors.primary }}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

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
