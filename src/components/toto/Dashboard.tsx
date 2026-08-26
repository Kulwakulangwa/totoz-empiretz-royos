import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/toto/Sidebar";
import { BranchSelectionPage } from "./BranchSelectionPage";
import { BranchDashboardHeader } from "./BranchDashboardHeader";
import {
  ExpensesSection,
  InventorySection,
  OverviewSection,
  PosSection,
  ReportsSection,
  ReturnsSection,
  SettingsSection,
  StaffSection,
} from "@/components/toto/sections";
import {
  branches,
  money,
  navItems,
  stockOf,
  colors,
  type BranchId,
  type SectionId,
} from "@/lib/toto-data";
import { TotoStoreProvider, useToto } from "@/lib/toto-store";
import { useAuth } from "@/hooks/use-auth";

const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-[13px] font-medium transition-colors hover:bg-accent";
const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90";

function DashboardInner() {
  const navigate = useNavigate();
  const { user, role, signOut, staffProfile, loading: authLoading } = useAuth();
  const { sales, returns, expenses, products, loading: storeLoading, refreshData } = useToto();

  const isOwner = role === "owner";
  const cashier = user?.user_metadata?.["full_name"] ?? user?.email ?? "Staff";

  const [selectedBranch, setSelectedBranch] = useState<BranchId | null>(null);
  const [showBranchSelector, setShowBranchSelector] = useState(true);
  const [section, setSection] = useState<SectionId>("overview");

  const accessibleBranches = useMemo(() => {
    if (isOwner) return branches;
    if (staffProfile) {
      const assignedBranch = branches.find((b) => b.id === staffProfile.branch_id);
      return assignedBranch ? [assignedBranch] : [];
    }
    return [];
  }, [isOwner, staffProfile]);

  useEffect(() => {
    if (accessibleBranches.length === 1 && !selectedBranch && !showBranchSelector) {
      setSelectedBranch(accessibleBranches[0].id);
      setShowBranchSelector(false);
    }
  }, [accessibleBranches, selectedBranch, showBranchSelector]);

  if (!authLoading && accessibleBranches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">No Access</h2>
          <p className="mt-2 text-gray-600">
            You don't have access to any shop. Please contact your administrator.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (showBranchSelector) {
    return (
      <BranchSelectionPage
        branches={accessibleBranches}
        onSelectBranch={(id) => {
          setSelectedBranch(id);
          setShowBranchSelector(false);
        }}
        userEmail={user?.email}
        role={role || undefined}
        onLogout={() => {
          signOut();
          navigate({ to: "/auth" });
        }}
        getTodaySales={(id) => {
          const today = new Date().toISOString().slice(0, 10);
          const branchSales = sales.filter((s) => s.branch === id && s.date === today);
          return branchSales.reduce((sum, s) => sum + s.total, 0);
        }}
      />
    );
  }

  if (authLoading || storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  if (!selectedBranch) {
    setShowBranchSelector(true);
    return null;
  }

  const effectiveShop = selectedBranch;
  const data = branches.find((b) => b.id === effectiveShop) || branches[0];
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);
  const activeSection: SectionId =
    isOwner || !navItems.find((n) => n.id === section)?.ownerOnly ? section : "overview";

  const today = new Date().toISOString().slice(0, 10);
  const inScope = <T extends { branch: BranchId }>(rows: T[]) =>
    rows.filter((r) => r.branch === effectiveShop);

  const todaySales = inScope(sales).filter((s) => s.date === today);
  const todayReturns = inScope(returns).filter((r) => r.date === today);
  const todayExpenses = inScope(expenses).filter((e) => e.date === today);
  const salesTotal =
    todaySales.reduce((sum, s) => sum + s.total, 0) -
    todayReturns.reduce((sum, r) => sum + r.total, 0);
  const salesCost =
    todaySales.reduce((sum, s) => sum + s.cost, 0) -
    todayReturns.reduce((sum, r) => sum + r.cost, 0);
  const expenseTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const vatTotal =
    todaySales.reduce((sum, s) => sum + s.vat, 0) - todayReturns.reduce((sum, r) => sum + r.vat, 0);
  const lowStock = products.filter((p) => stockOf(p, effectiveShop) <= p.min);

  const metrics = [
    {
      label: "Revenue",
      value: money(salesTotal),
      icon: "📈",
      bg: colors.pinkBg,
      color: colors.secondary,
    },
    {
      label: "Expenses",
      value: money(expenseTotal),
      icon: "💳",
      bg: colors.lavenderLight,
      color: colors.primary,
    },
    {
      label: "Profit",
      value: money(salesTotal - salesCost - expenseTotal),
      icon: "💎",
      bg: colors.tealLight,
      color: colors.accent,
    },
    {
      label: "VAT",
      value: money(vatTotal),
      icon: "🧾",
      bg: "#FCE8E8",
      color: "#E93FA0",
    },
  ];

  const handleExport = () => {
    if (!sales.length) {
      toast("No sales recorded yet to export.");
      return;
    }
    const header = "receipt,date,branch,cashier,payment,total,vat\n";
    const body = sales
      .map((s) =>
        [s.receipt, s.date, s.branch, s.cashier, s.payment, s.total, s.vat].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "toto-sales.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Sales report exported");
  };

  const handleSwitchBranch = () => {
    setShowBranchSelector(true);
    setSelectedBranch(null);
    setSection("overview");
  };

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${colors.gradientMint} 0%, ${colors.gradientPink} 50%, ${colors.gradientDeepPurple} 100%)` }}>
      {/* Decorative Circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-40 right-60 w-16 h-16 rounded-full bg-white/5" />
        <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-white/8" />
        <div className="absolute bottom-40 left-40 w-12 h-12 rounded-full bg-white/5" />
      </div>

      {/* Main App Card */}
      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-[1440px] bg-white rounded-[32px] shadow-2xl overflow-hidden min-h-[90vh] max-h-[95vh] flex flex-col">
          {/* Header */}
          <BranchDashboardHeader
            branchName={data.name}
            branchId={effectiveShop}
            userEmail={user?.email}
            role={role || undefined}
            onSwitchBranch={handleSwitchBranch}
            onLogout={() => {
              signOut();
              navigate({ to: "/auth" });
            }}
          />

          {/* Main Flex Row */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <Sidebar
              shop={effectiveShop}
              section={activeSection}
              isOwner={isOwner}
              onSection={setSection}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-6 py-6 pb-28" style={{ background: colors.offWhite }}>
              {activeSection === "overview" && isOwner && <OverviewSection shop={effectiveShop} />}
              {activeSection === "pos" && <PosSection shop={effectiveShop} cashier={cashier} />}
              {activeSection === "returns" && (
                <ReturnsSection shop={effectiveShop} cashier={cashier} isOwner={isOwner} />
              )}
              {activeSection === "inventory" && isOwner && <InventorySection shop={effectiveShop} />}
              {activeSection === "expenses" && isOwner && <ExpensesSection shop={effectiveShop} />}
              {activeSection === "staff" && isOwner && <StaffSection />}
              {activeSection === "reports" && isOwner && <ReportsSection shop={effectiveShop} />}
              {activeSection === "settings" && isOwner && <SettingsSection />}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-flow-col justify-stretch gap-0.5 bg-white border-t border-[#F0EEF4] p-1.5 md:hidden shadow-lg rounded-t-2xl">
        {visibleNav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={cn(
              "flex flex-col items-center justify-center min-h-12 rounded-xl px-1 text-[10px] font-medium transition-colors",
              activeSection === item.id
                ? "text-white"
                : "text-[#8B889A]"
            )}
            style={{
              background: activeSection === item.id ? colors.primary : "transparent",
            }}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={handleSwitchBranch}
          className="flex flex-col items-center justify-center min-h-12 rounded-xl px-1 text-[10px] font-medium text-[#5B3A96]"
        >
          <span className="text-lg mb-0.5">🏪</span>
          <span>Switch</span>
        </button>
      </nav>
    </div>
  );
}

export function Dashboard() {
  return (
    <TotoStoreProvider>
      <DashboardInner />
    </TotoStoreProvider>
  );
}
