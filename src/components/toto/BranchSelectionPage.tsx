import { BranchId, colors } from "@/lib/toto-data";
import { BranchCard } from "./BranchCard";
import { LogOut, Building2 } from "lucide-react";

interface BranchSelectionPageProps {
  branches: { id: BranchId; name: string }[];
  onSelectBranch: (id: BranchId) => void;
  userEmail?: string;
  role?: string;
  onLogout: () => void;
  getTodaySales: (id: BranchId) => number;
}

export function BranchSelectionPage({
  branches,
  onSelectBranch,
  userEmail,
  role,
  onLogout,
  getTodaySales,
}: BranchSelectionPageProps) {
  const isOwner = role === "owner";

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
      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl overflow-hidden p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#F0EEF4] pb-6">
          <div className="flex items-center gap-3">
            <div
              className="size-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              }}
            >
              TE
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.textDark }}>
                Toto Empire
              </h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Retail Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: colors.textDark }}>
                {userEmail}
              </p>
              <p className="text-xs capitalize" style={{ color: colors.textMuted }}>
                {role}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 transition-colors rounded-xl hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          <h2 className="text-xl font-bold" style={{ color: colors.textDark }}>
            Select a Shop
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            {isOwner
              ? "Choose a shop to manage. You have access to all shops."
              : "Select your assigned shop to continue."}
          </p>

          {/* Branch Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                id={branch.id}
                name={branch.name}
                todaySales={getTodaySales(branch.id)}
                onClick={() => onSelectBranch(branch.id)}
                role={isOwner ? "Owner" : "Cashier"}
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
