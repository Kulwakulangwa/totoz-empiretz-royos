import { BranchId, colors } from "@/lib/toto-data";
import { ArrowLeft, Store, LogOut, Bell, Search } from "lucide-react";

interface BranchDashboardHeaderProps {
  branchName: string;
  branchId: BranchId;
  userEmail?: string;
  role?: string;
  onSwitchBranch: () => void;
  onLogout: () => void;
}

export function BranchDashboardHeader({
  branchName,
  branchId,
  userEmail,
  role,
  onSwitchBranch,
  onLogout,
}: BranchDashboardHeaderProps) {
  const isTotozEmpireBrand = branchId === "toto" || branchName.toLowerCase().includes("totoz");

  return (
    <div className="border-b border-[#F0EEF4] bg-white px-4 py-3 flex-shrink-0">
      <div className="max-w-full flex flex-wrap items-center justify-between gap-3">
        {/* Left: Switch Branch */}
        <button
          onClick={onSwitchBranch}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-[#F7F7FA]"
          style={{ color: colors.textMuted }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Switch Branch</span>
          <span className="sm:hidden">Switch</span>
        </button>

        {/* Center: Branch Info + Search */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <div
              className="relative flex size-12 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, #f72585 0%, #ff8a00 20%, #ffbe0b 35%, #ff5d8f 52%, #7b2cbf 75%, #5b3a96 100%)",
                boxShadow: "0 0 0 2px rgba(91,58,150,0.08)",
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
