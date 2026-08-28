import { BranchId, colors, money } from "@/lib/toto-data";
import { BranchCard } from "./BranchCard";
import { LogOut } from "lucide-react";

interface BranchSummary {
  id: BranchId;
  name: string;
  revenueToday: number;
  expensesToday: number;
  profitToday: number;
  vatToday: number;
}

interface BranchSelectionPageProps {
  branches: BranchSummary[];
  onSelectBranch: (id: BranchId) => void;
  userEmail?: string;
  role?: string;
  onLogout: () => void;
  // Summary for all shops
  allRevenue: number;
  allExpenses: number;
  allProfit: number;
  allVat: number;
}

export function BranchSelectionPage({
  branches,
  onSelectBranch,
  userEmail,
  role,
  onLogout,
  allRevenue,
  allExpenses,
  allProfit,
  allVat,
}: BranchSelectionPageProps) {
  const isPrivileged = role === "owner" || role === "manager";

  const summaryMetrics = [
    { label: "Revenue", value: money(allRevenue), icon: "📈", bg: colors.pinkBg, color: colors.secondary },
    { label: "Expenses", value: money(allExpenses), icon: "💳", bg: colors.lavenderLight, color: colors.primary },
    { label: "Profit", value: money(allProfit), icon: "💎", bg: colors.tealLight, color: colors.accent },
    { label: "VAT", value: money(allVat), icon: "🧾", bg: "#FCE8E8", color: "#E93FA0" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${colors.gradientMint} 0%, ${colors.gradientPink} 50%, ${colors.gradientDeepPurple} 100%)` }}>
      {/* Decorative circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-40 right-60 w-16 h-16 rounded-full bg-white/5" />
        <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-white/8" />
        <div className="absolute bottom-40 left-40 w-12 h-12 rounded-full bg-white/5" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-7xl bg-white rounded-[32px] shadow-2xl overflow-hidden p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#F0EEF4] pb-6">
          <div className="flex items-center gap-3">
            <div
              className="relative flex size-12 items-center justify-center rounded-full flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #f72585 0%, #ff8a00 20%, #ffbe0b 35%, #ff5d8f 52%, #7b2cbf 75%, #5b3a96 100%)",
              }}
            >
              <div className="flex size-10 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: "#EDE7F8" }}>
                <div className="flex flex-col items-center justify-center leading-none">
                  <div className="flex items-center justify-center gap-1">
                    <span className="block h-1.5 w-1.5 rounded-full border border-[#5B3A96] bg-[#F6D9EA]" style={{ transform: "rotate(18deg)" }} />
                    <span className="block h-1.5 w-1.5 rounded-full border border-[#5B3A96] bg-[#F6D9EA]" style={{ transform: "rotate(-18deg)" }} />
                  </div>
                  <div className="mt-0.5 flex items-center justify-center rounded-full border border-[#5B3A96] bg-[#F6D9EA] px-1 py-0.5">
                    <span className="text-[6px] font-black tracking-[-0.16em] text-[#5B3A96]">T</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.textDark }}>Totoz Empire</h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>Retail Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: colors.textDark }}>{userEmail}</p>
              <p className="text-xs capitalize" style={{ color: colors.textMuted }}>{role}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 transition-colors rounded-xl hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          <h2 className="text-xl font-bold" style={{ color: colors.textDark }}>Select a Shop</h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            {isPrivileged
              ? "Choose a shop to manage. You have access to all shops."
              : "Select your assigned shop to continue."}
          </p>

          {/* Summary Cards for All Shops */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryMetrics.map((metric, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 transition-all hover:shadow-md"
                style={{ background: metric.bg || colors.white }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{metric.icon}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.textMuted }}>{metric.label}</p>
                    <p className="text-xl font-bold" style={{ color: colors.textDark }}>{metric.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Branch Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                id={branch.id}
                name={branch.name}
                revenue={branch.revenueToday}
                expenses={branch.expensesToday}
                profit={branch.profitToday}
                vat={branch.vatToday}
                onClick={() => onSelectBranch(branch.id)}
                role={isPrivileged ? (role === "manager" ? "Manager" : "Owner") : "Cashier"}
              />
            ))}
          </div>

          {/* Empty State */}
          {branches.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">No shops available.</p>
              <p className="text-sm text-gray-400">Please contact your administrator.</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-[#F0EEF4] text-center text-sm" style={{ color: colors.textMuted }}>
            {branches.length} shop{branches.length !== 1 ? "s" : ""} available
          </div>
        </div>
      </div>
    </div>
  );
}
