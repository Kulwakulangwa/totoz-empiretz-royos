import { BranchId } from "@/lib/toto-data";
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Toto Empire</h1>
              <p className="text-sm text-gray-500">Retail Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-500 capitalize">{role}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 transition-colors rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Select a Shop</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isOwner
              ? "Choose a shop to manage. You have access to all shops."
              : "Select your assigned shop to continue."}
          </p>
        </div>

        {/* Branch Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          {branches.length} shop{branches.length !== 1 ? "s" : ""} available
        </div>
      </div>
    </div>
  );
}
