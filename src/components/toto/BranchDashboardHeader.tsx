import { BranchId } from "@/lib/toto-data";
import { ArrowLeft, Store, LogOut } from "lucide-react";

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
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Switch Branch */}
        <button
          onClick={onSwitchBranch}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Switch Branch</span>
          <span className="sm:hidden">Switch</span>
        </button>

        {/* Center: Branch Info */}
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{branchName}</h1>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
        </div>

        {/* Right: User & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm text-gray-900">{userEmail}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 transition-colors rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
