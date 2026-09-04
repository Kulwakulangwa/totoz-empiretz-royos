import { BranchId, colors } from "@/lib/toto-data";
import { AppLogo } from "./AppLogo";
import { ArrowLeft, LogOut, Bell, Search } from "lucide-react";

interface BranchDashboardHeaderProps {
  branchName: string;
  branchId: BranchId;
  userEmail?: string | undefined;
  role?: string | undefined;
  onSwitchBranch: () => void;
  onLogout: () => void;
  canSwitchBranch?: boolean;
}

export function BranchDashboardHeader({
  branchName,
  userEmail,
  role,
  onSwitchBranch,
  onLogout,
  canSwitchBranch = true,
}: BranchDashboardHeaderProps) {
  return (
    <div className="border-b border-[#F0EEF4] bg-white px-4 py-3 flex-shrink-0">
      <div className="max-w-full flex flex-wrap items-center justify-between gap-3">
        {/* Left: Switch Branch */}
        {canSwitchBranch ? (
          <button
            onClick={onSwitchBranch}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-[#F7F7FA]"
            style={{ color: colors.textMuted }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Switch Branch</span>
            <span className="sm:hidden">Switch</span>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Center: Branch Info + Search */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <AppLogo className="size-12" />
            <div>
              <h1 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                {branchName}
              </h1>
              <p className="text-xs capitalize" style={{ color: colors.textMuted }}>
                {role}
              </p>
            </div>
          </div>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: colors.offWhite }}>
            <Search className="w-4 h-4" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-32"
              style={{ color: colors.textDark }}
            />
          </div>
          <button className="p-2 rounded-full hover:bg-[#F7F7FA] transition-colors relative">
            <Bell className="w-5 h-5" style={{ color: colors.textMuted }} />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full" style={{ background: colors.secondary }} />
          </button>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium" style={{ color: colors.textDark }}>
              {userEmail?.split("@")[0] || "User"}
            </p>
            <p className="text-xs capitalize" style={{ color: colors.textMuted }}>
              {role}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-full hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
