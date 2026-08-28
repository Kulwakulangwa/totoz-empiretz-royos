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
  const isTotozEmpireBrand = shop === "toto" || "totoz" === String(shop).toLowerCase();
  const visibleNav = isOwner
    ? navItems
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
          {isTotozEmpireBrand ? (
            <div
              className="relative flex size-12 items-center justify-center rounded-full flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #f72585 0%, #ff8a00 20%, #ffbe0b 35%, #ff5d8f 52%, #7b2cbf 75%, #5b3a96 100%)",
                boxShadow: "0 0 0 2px rgba(91,58,150,0.08)",
              }}
            >
              <div
                className="flex size-10 items-center justify-center rounded-full border-2 bg-white"
                style={{ borderColor: "#EDE7F8" }}
              >
                <div className="flex flex-col items-center justify-center leading-none">
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className="block h-2.5 w-2.5 rounded-full border border-[#5B3A96] bg-[#F6D9EA]"
                      style={{ transform: "rotate(18deg)" }}
                    />
                    <span
                      className="block h-2.5 w-2.5 rounded-full border border-[#5B3A96] bg-[#F6D9EA]"
                      style={{ transform: "rotate(-18deg)" }}
                    />
                  </div>
                  <div className="mt-0.5 flex items-center justify-center rounded-full border border-[#5B3A96] bg-[#F6D9EA] px-1.5 py-0.5">
                    <span className="text-[7px] font-black tracking-[-0.14em] text-[#5B3A96]">T</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              }}
            >
              TE
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: colors.textDark }}>
              {isTotozEmpireBrand ? "Totoz Empire" : "Toto Empire"}
            </h1>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              {isTotozEmpireBrand ? "Shop brand" : "Retail Management"}
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
