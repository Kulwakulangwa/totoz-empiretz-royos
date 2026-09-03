import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/toto/Sidebar";
import { BranchSelectionPage } from "./BranchSelectionPage";
import { BranchDashboardHeader } from "./BranchDashboardHeader";
import {
  ExpensesSection,
  WarehouseSection,
  OverviewSection,
  PosSection,
  ReportsSection,
  ReturnsSection,
  SalesSection,
  SettingsSection,
  StaffSection,
  StockRequestSection,
  PendingOrdersSection,
} from "@/components/toto/sections";
import CreateOrderPage from '@/routes/orders/create.client';
import {
  branches,
  money,
  navItems,
  stockOf,
  colors,
  getBranchIdFromUuid,
  isWarehouse,
  isShop,
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
  const isBranchManager = role === "manager";
  const canManageBranch = isOwner || isBranchManager;
  const cashier = user?.user_metadata?.["full_name"] ?? user?.email ?? "Staff";

  const [selectedBranch, setSelectedBranch] = useState<BranchId | null>(null);
  const [showBranchSelector, setShowBranchSelector] = useState(true);
  const [section, setSection] = useState<SectionId>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false);

  const accessibleBranches = useMemo(() => {
    if (isOwner) return branches;
    if (staffProfile) {
      const rawBranchId = staffProfile.branch?.id ?? staffProfile.branch_id;
      const branchId =
        typeof rawBranchId === "string" && rawBranchId.length > 20
          ? getBranchIdFromUuid(rawBranchId)
          : rawBranchId;
      const assignedBranch = branches.find((b) => b.id === branchId);
      return assignedBranch ? [assignedBranch] : [];
    }
    return [];
  }, [isOwner, staffProfile]);

  // All‑shop metrics (total)
  const allRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const allExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const allProfit = allRevenue - sales.reduce((sum, s) => sum + s.cost, 0) - allExpenses;
  const allVat = sales.reduce((sum, s) => sum + s.vat, 0);

  // Per‑branch metrics (today)
  const today = new Date().toISOString().slice(0, 10);
  const salesByBranch: Record<BranchId, { revenue: number; cost: number; vat: number; count: number }> = {};
  branches.forEach(b => {
    salesByBranch[b.id] = { revenue: 0, cost: 0, vat: 0, count: 0 };
  });
  sales.forEach(s => {
    const branchId = s.branch;
    if (branchId && s.date === today && salesByBranch[branchId]) {
      salesByBranch[branchId].revenue += s.total || 0;
      salesByBranch[branchId].cost += s.cost || 0;
      salesByBranch[branchId].vat += s.vat || 0;
      salesByBranch[branchId].count += 1;
    }
  });
  const expensesByBranch: Record<BranchId, number> = {};
  branches.forEach(b => {
    expensesByBranch[b.id] = 0;
  });
  expenses.forEach(e => {
    const branchId = e.branch;
    if (branchId && e.date === today && expensesByBranch[branchId] !== undefined) {
      expensesByBranch[branchId] += e.amount || 0;
    }
  });
  const branchSummaries = branches.map((b) => {
    const salesData = salesByBranch[b.id] || { revenue: 0, cost: 0, vat: 0 };
    const expensesToday = expensesByBranch[b.id] || 0;
    return {
      id: b.id,
      name: b.name,
      revenueToday: salesData.revenue,
      expensesToday,
      profitToday: salesData.revenue - salesData.cost - expensesToday,
      vatToday: salesData.vat,
    };
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
      return;
    }

    if (authLoading) return;

    if (!isOwner) {
      if (accessibleBranches.length === 0) {
        setSelectedBranch(null);
        setShowBranchSelector(true);
        return;
      }

      const assignedBranch = accessibleBranches[0].id;
      if (!selectedBranch || selectedBranch !== assignedBranch) {
        setSelectedBranch(assignedBranch);
      }
      setShowBranchSelector(false);
      return;
    }

    if (accessibleBranches.length === 1 && !selectedBranch && !showBranchSelector) {
      setSelectedBranch(accessibleBranches[0].id);
      setShowBranchSelector(false);
    }
  }, [authLoading, accessibleBranches, isOwner, selectedBranch, showBranchSelector]);

  // Auto-redirect warehouse users to the Warehouse section
  useEffect(() => {
    if (selectedBranch && isWarehouse(selectedBranch) && !hasAutoRedirected) {
      setSection("warehouse");
      setHasAutoRedirected(true);
    }
    // Reset auto-redirect flag when switching to a shop
    if (selectedBranch && isShop(selectedBranch)) {
      setHasAutoRedirected(false);
    }
  }, [selectedBranch, isWarehouse, isShop, hasAutoRedirected]);

  if (!authLoading && accessibleBranches.length === 0) {
    const handleSignOut = async () => {
      const { error } = await signOut();
      if (!error) {
        navigate({ to: "/auth" });
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">No Access</h2>
          <p className="mt-2 text-gray-600">
            You don't have access to any shop. Please contact your administrator.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!isOwner && accessibleBranches.length > 0 && !selectedBranch) {
    return null;
  }

  if (showBranchSelector && isOwner) {
    return (
      <BranchSelectionPage
        branches={branchSummaries}
        onSelectBranch={(id) => {
          setSelectedBranch(id);
          setShowBranchSelector(false);
          setHasAutoRedirected(false);
        }}
        userEmail={user?.email}
        role={role || undefined}
        onLogout={() => {
          signOut();
          navigate({ to: "/auth" });
        }}
        allRevenue={allRevenue}
        allExpenses={allExpenses}
        allProfit={allProfit}
        allVat={allVat}
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
  const isWarehouseBranch = isWarehouse(effectiveShop);
  const isShopBranch = isShop(effectiveShop);

  // For warehouse users, force the active section to be "warehouse"
  const activeSection: SectionId = isWarehouseBranch
    ? "warehouse"
    : canManageBranch
      ? (section as SectionId)
      : section === "sales" || section === "stock-requests"
        ? section
        : "pos";

  const todaySales = sales.filter((s) => s.branch === effectiveShop && s.date === today);
  const todayReturns = returns.filter((r) => r.branch === effectiveShop && r.date === today);
  const todayExpenses = expenses.filter((e) => e.branch === effectiveShop && e.date === today);
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
    { label: "Sales", value: money(salesTotal), icon: "📈", bg: colors.pinkBg, color: colors.secondary },
    { label: "Expenses", value: money(expenseTotal), icon: "💳", bg: colors.lavenderLight, color: colors.primary },
    { label: "Profit", value: money(salesTotal - salesCost - expenseTotal), icon: "💎", bg: colors.tealLight, color: colors.accent },
    { label: "VAT", value: money(vatTotal), icon: "🧾", bg: "#FCE8E8", color: "#E93FA0" },
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
    setHasAutoRedirected(false);
  };

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${colors.gradientMint} 0%, ${colors.gradientPink} 50%, ${colors.gradientDeepPurple} 100%)` }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-40 right-60 w-16 h-16 rounded-full bg-white/5" />
        <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-white/8" />
        <div className="absolute bottom-40 left-40 w-12 h-12 rounded-full bg-white/5" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-[1440px] bg-white rounded-[32px] shadow-2xl overflow-hidden min-h-[90vh] max-h-[95vh] flex flex-col">
          <BranchDashboardHeader
            branchName={data.name}
            branchId={effectiveShop}
            userEmail={user?.email}
            role={role || undefined}
            canSwitchBranch={isOwner}
            onSwitchBranch={handleSwitchBranch}
            onLogout={() => {
              signOut();
              navigate({ to: "/auth" });
            }}
          />

          <div className="flex flex-1 overflow-hidden">
            <Sidebar shop={effectiveShop} section={activeSection} isOwner={canManageBranch} onSection={setSection} />

            <main className="flex-1 overflow-y-auto px-6 py-6 pb-28" style={{ background: colors.offWhite }}>
              {/* If this is a warehouse branch, only show warehouse-related sections */}
              {isWarehouseBranch ? (
                <>
                  {activeSection === "overview" && <OverviewSection shop={effectiveShop} />}
                  {activeSection === "warehouse" && <WarehouseSection />}
                  {activeSection === "stock-requests" && <StockRequestSection shop={effectiveShop} />}
                  {activeSection === "pending-orders" && <PendingOrdersSection shop={effectiveShop} />}
                  {activeSection === "expenses" && <ExpensesSection shop={effectiveShop} />}
                  {activeSection === "staff" && <StaffSection shop={effectiveShop} />}
                  {activeSection === "reports" && <ReportsSection shop={effectiveShop} />}
                  {activeSection === "settings" && <SettingsSection />}
                </>
              ) : canManageBranch ? (
                <>
                  {activeSection === "overview" && <OverviewSection shop={effectiveShop} />}
                  {activeSection === "pos" && <PosSection shop={effectiveShop} cashier={cashier} />}
                  {activeSection === "sales" && <SalesSection shop={effectiveShop} isOwner={canManageBranch} />}
                  {activeSection === "returns" && (
                    <ReturnsSection shop={effectiveShop} cashier={cashier} isOwner={canManageBranch} />
                  )}
                  {activeSection === "warehouse" && <WarehouseSection />}
                  {activeSection === "expenses" && <ExpensesSection shop={effectiveShop} />}
                  {activeSection === "staff" && <StaffSection shop={effectiveShop} />}
                  {activeSection === "reports" && <ReportsSection shop={effectiveShop} />}
                  {activeSection === "settings" && <SettingsSection />}
                  {activeSection === "stock-requests" && <StockRequestSection shop={effectiveShop} />}
                  {activeSection === "pending-orders" && <PendingOrdersSection shop={effectiveShop} />}
                  {activeSection === "create-order" && <CreateOrderPage />}
                </>
              ) : (
                <>
                  {activeSection === "sales" && <SalesSection shop={effectiveShop} isOwner={canManageBranch} />}
                  {activeSection === "stock-requests" && <StockRequestSection shop={effectiveShop} />}
                  {activeSection === "pos" && <PosSection shop={effectiveShop} cashier={cashier} />}
                  {activeSection === "create-order" && <CreateOrderPage />}
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="mx-3 mb-3">
          {mobileMenuOpen && (
            <div className="mb-2 rounded-2xl border border-[#F0EEF4] bg-white p-2 shadow-[0_-10px_30px_rgba(86,54,130,0.14)]">
              <div className="grid grid-cols-2 gap-2">
                {/* Render only the visible nav items for mobile */}
                {(() => {
                  let mobileNav = [];
                  if (isWarehouseBranch) {
                    mobileNav = [
                      { id: "warehouse", label: "Warehouse", ownerOnly: true, icon: "🏪" },
                      { id: "stock-requests", label: "Stock Requests", ownerOnly: false, icon: "📦" },
                      { id: "pending-orders", label: "Pending Orders", ownerOnly: true, icon: "⏳" },
                    ];
                  } else if (isShopBranch) {
                    if (isOwner) {
                      mobileNav = navItems;
                    } else {
                      mobileNav = [
                        { id: "pos", label: "Point of Sale", ownerOnly: false, icon: "🛍️" },
                        { id: "sales", label: "Sales", ownerOnly: false, icon: "📋" },
                        { id: "stock-requests", label: "Stock Requests", ownerOnly: false, icon: "📦" },
                      ];
                    }
                  }
                  return mobileNav.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex min-h-[58px] flex-col items-center justify-center rounded-xl px-2 text-[10px] font-medium transition-colors",
                        activeSection === item.id ? "text-white" : "text-[#8B889A]"
                      )}
                      style={{
                        background: activeSection === item.id ? colors.primary : "#F7F7FA",
                      }}
                    >
                      <span className="mb-0.5 text-base">{item.icon}</span>
                      <span className="leading-tight text-center">{item.label}</span>
                    </button>
                  ));
                })()}
                {isOwner && (
                  <button
                    onClick={() => {
                      handleSwitchBranch();
                      setMobileMenuOpen(false);
                    }}
                    className="flex min-h-[58px] flex-col items-center justify-center rounded-xl px-2 text-[10px] font-medium text-[#5B3A96]"
                    style={{ background: "#F5F0FF" }}
                  >
                    <span className="mb-0.5 text-base">🏪</span>
                    <span className="leading-tight text-center">Switch</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-[#EDE7F8] bg-white px-4 py-3 shadow-lg"
            style={{ boxShadow: "0 12px 28px rgba(88, 62, 162, 0.16)" }}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full text-base" style={{ background: colors.primary, color: colors.white }}>
                {(() => {
                  let icon = "📱";
                  if (isWarehouseBranch) {
                    icon = "🏪";
                  } else if (activeSection === "pos") {
                    icon = "🛍️";
                  } else if (activeSection === "sales") {
                    icon = "📋";
                  } else if (activeSection === "stock-requests") {
                    icon = "📦";
                  }
                  return icon;
                })()}
              </span>
              <div className="text-left leading-tight">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: colors.textMuted }}>
                  {isWarehouseBranch ? "Warehouse" : "Shop"}
                </p>
                <p className="text-sm font-semibold" style={{ color: colors.textDark }}>
                  {isWarehouseBranch ? "Warehouse" : (() => {
                    let label = "Open";
                    if (activeSection === "pos") label = "Point of Sale";
                    else if (activeSection === "sales") label = "Sales";
                    else if (activeSection === "stock-requests") label = "Stock Requests";
                    else if (activeSection === "warehouse") label = "Warehouse";
                    return label;
                  })()}
                </p>
              </div>
            </div>
            <span className="text-xl" style={{ color: colors.primary }}>{mobileMenuOpen ? "⌃" : "⌄"}</span>
          </button>
        </div>
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
