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
  type BranchId,
  type SectionId,
} from "@/lib/toto-data";
import { TotoStoreProvider, useToto } from "@/lib/toto-store";
import { useAuth } from "@/hooks/use-auth";

const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent";
const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90";

function DashboardInner() {
  const navigate = useNavigate();
  const { user, role, signOut, staffProfile, loading: authLoading } = useAuth();
  const { sales, returns, expenses, products, loading: storeLoading, refreshData } = useToto();

  const isOwner = role === "owner";
  const cashier = user?.user_metadata?.["full_name"] ?? user?.email ?? "Staff";

  // Branch selection state
  const [selectedBranch, setSelectedBranch] = useState<BranchId | null>(null);
  const [showBranchSelector, setShowBranchSelector] = useState(true);
  const [section, setSection] = useState<SectionId>("overview");

  // Determine which branches the user can access
  const accessibleBranches = useMemo(() => {
    if (isOwner) return branches;
    if (staffProfile) {
      const assignedBranch = branches.find((b) => b.id === staffProfile.branch_id);
      return assignedBranch ? [assignedBranch] : [];
    }
    return [];
  }, [isOwner, staffProfile]);

  // Auto-select if only one branch
  useEffect(() => {
    if (accessibleBranches.length === 1 && !selectedBranch && !showBranchSelector) {
      setSelectedBranch(accessibleBranches[0].id);
      setShowBranchSelector(false);
    }
  }, [accessibleBranches, selectedBranch, showBranchSelector]);

  // If user has no branches, show error
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

  // Show branch selection page
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

  // Loading state
  if (authLoading || storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // No branch selected but not showing selector (shouldn't happen)
  if (!selectedBranch) {
    setShowBranchSelector(true);
    return null;
  }

  // Selected branch data
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
      label: "Net sales today",
      value: money(salesTotal),
      note: todayReturns.length
        ? `${todaySales.length} receipts · ${todayReturns.length} returns`
        : todaySales.length
          ? `${todaySales.length} receipts`
          : "No sales recorded yet",
    },
    {
      label: "Expenses today",
      value: money(expenseTotal),
      note: todayExpenses.length ? `${todayExpenses.length} entries` : "No expenses recorded yet",
    },
    {
      label: "Gross profit",
      value: money(salesTotal - salesCost - expenseTotal),
      note: "Net sales minus cost of goods and expenses",
    },
    {
      label: "VAT collected today",
      value: money(vatTotal),
      note: `${lowStock.length} product(s) at or below minimum stock`,
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
    <div className="min-h-screen bg-gray-50">
      {/* Branch Dashboard Header */}
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

      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar: now only shows selected branch + management menu */}
        <Sidebar
          shop={effectiveShop}
          section={activeSection}
          isOwner={isOwner}
          onSection={setSection}
        />

        <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {isOwner ? "Business overview" : `Point of sale — ${data.name}`}
              </h1>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                {isOwner
                  ? "Sales, returns, inventory, expenses, VAT receipts and reporting for this shop."
                  : "Scan or search a product, build the receipt and confirm Cash or Lipa Namba payment."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isOwner && (
                <button className={btn} onClick={handleExport}>
                  📊 Export report
                </button>
              )}
              <button
                className={btn}
                onClick={() => {
                  signOut();
                  navigate({ to: "/auth" });
                }}
              >
                Sign out
              </button>
              <button className={btnPrimary} onClick={() => setSection("pos")}>
                🧾 New sale
              </button>
            </div>
          </header>

          {isOwner && activeSection === "overview" && (
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <article key={metric.label} className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="text-[12px] font-medium text-muted-foreground">{metric.label}</div>
                  <div className="mt-2 font-mono text-xl font-bold">{metric.value}</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">{metric.note}</div>
                </article>
              ))}
            </section>
          )}

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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-flow-col justify-stretch gap-1 border-t border-border bg-card p-2 md:hidden shadow-lg">
        {visibleNav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={cn(
              "flex flex-col items-center justify-center min-h-12 rounded-md px-1 text-[10px] font-medium text-muted-foreground transition-colors",
              activeSection === item.id && "bg-primary/10 text-primary font-semibold",
            )}
          >
            {item.icon && <span className="text-lg mb-0.5">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={handleSwitchBranch}
          className="flex flex-col items-center justify-center min-h-12 rounded-md px-1 text-[10px] font-medium text-blue-600"
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
