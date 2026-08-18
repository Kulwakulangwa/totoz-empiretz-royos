import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/toto/Sidebar";
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

export function Dashboard() {
  return (
    <TotoStoreProvider>
      <DashboardInner />
    </TotoStoreProvider>
  );
}

function DashboardInner() {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const isOwner = role === "owner";
  const cashier = user?.user_metadata?.["full_name"] ?? user?.email ?? "Staff";

  const [shop, setShop] = useState<BranchId>("all");
  const [section, setSection] = useState<SectionId>("pos");
  const [menuOpen, setMenuOpen] = useState(false);
  const { sales, returns, expenses, products } = useToto();

  const effectiveShop: BranchId = isOwner ? shop : shop === "all" ? "toto" : shop;
  const data = branches.find((b) => b.id === effectiveShop)!;
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);
  const activeSection: SectionId =
    isOwner || !navItems.find((n) => n.id === section)?.ownerOnly ? section : "pos";

  const today = new Date().toISOString().slice(0, 10);
  const inScope = <T extends { branch: BranchId }>(rows: T[]) =>
    rows.filter((r) => effectiveShop === "all" || r.branch === effectiveShop);

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

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar
        shop={effectiveShop}
        section={activeSection}
        isOwner={isOwner}
        onShop={setShop}
        onSection={setSection}
      />

      <main className="min-w-0 px-4 pt-7 pb-28 sm:px-6 lg:px-10">
        <header className="mb-7 flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
              {data.name} · {isOwner ? "Owner" : "Cashier"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {isOwner ? "Business overview" : `Point of sale — ${data.name}`}
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {isOwner
                ? "Sales, returns, inventory, expenses, VAT receipts and reporting across every shop."
                : "Scan or search a product, build the receipt and confirm Cash or Lipa Namba payment."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-card px-3 text-[12px] text-muted-foreground">
              {user?.email}
            </span>
            {isOwner && (
              <button
                className={btn}
                onClick={() => {
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
                }}
              >
                Export report
              </button>
            )}
            <button
              className={btn}
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              Sign out
            </button>
            <button className={btnPrimary} onClick={() => setSection("pos")}>
              New sale
            </button>
          </div>
        </header>

        {isOwner && (
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.label} className="panel p-4">
                <div className="text-[12px] font-medium text-muted-foreground">{metric.label}</div>
                <div className="mt-2 font-mono text-xl">{metric.value}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">{metric.note}</div>
              </article>
            ))}
          </section>
        )}

        <div className="mb-5 flex w-max max-w-full gap-1 overflow-x-auto rounded-md border border-border bg-card p-1">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "min-h-8 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

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

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-flow-col justify-stretch gap-1 border-t border-border bg-card p-2 md:hidden">
        {visibleNav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={cn(
              "min-h-10 rounded-md px-1 text-[11px] font-medium text-muted-foreground",
              activeSection === item.id && "bg-primary text-primary-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
