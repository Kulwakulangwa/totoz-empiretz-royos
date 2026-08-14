import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/toto/Sidebar";
import {
  ExpensesSection,
  InventorySection,
  OverviewSection,
  PosSection,
  ReportsSection,
  StaffSection,
} from "@/components/toto/sections";
import { branches, money, navItems, type BranchId, type SectionId } from "@/lib/toto-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toto Empire | Retail Management" },
      {
        name: "description",
        content:
          "Multi-branch retail management for Toto Empire: point of sale, inventory, expenses, staff access and branch reports.",
      },
      { property: "og:title", content: "Toto Empire | Retail Management" },
      {
        property: "og:description",
        content:
          "Point of sale, inventory, expenses, staff access and reporting across all Toto Empire shops.",
      },
    ],
  }),
  component: Index,
});

const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent";
const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90";

function Index() {
  const [role, setRole] = useState<"Owner" | "Cashier">("Owner");
  const [shop, setShop] = useState<BranchId>("all");
  const [section, setSection] = useState<SectionId>("overview");
  const isOwner = role === "Owner";

  const data = branches.find((b) => b.id === shop)!;
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);

  function pickRole(next: "Owner" | "Cashier") {
    setRole(next);
    if (next === "Cashier") {
      setShop("kariakoo");
      setSection("pos");
    } else {
      setShop("all");
      setSection("overview");
    }
  }

  const metrics = [
    { label: "Sales today", value: money(0), note: "No sales recorded yet" },
    { label: "Expenses today", value: money(0), note: "No expenses recorded yet" },
    { label: "Gross profit", value: money(0), note: "Calculated from sales and expenses" },
    { label: "Low stock items", value: "0", note: "Products at or below minimum" },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar
        shop={shop}
        section={section}
        isOwner={isOwner}
        onShop={setShop}
        onSection={setSection}
      />

      <main className="min-w-0 px-4 pt-7 pb-28 sm:px-6 lg:px-10">
        <header className="mb-7 flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
              {data.name}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {isOwner ? "Business overview" : `Point of sale — ${data.name}`}
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {isOwner
                ? "Sales, inventory, expenses, staff access and reporting across every shop."
                : "Scan or search a product, build the receipt and confirm Cash or Lipa Namba payment."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 rounded-md border border-border bg-card p-1">
              {(["Owner", "Cashier"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => pickRole(option)}
                  className={cn(
                    "min-h-8 rounded-md px-3 text-[13px] font-medium transition-colors",
                    role === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {isOwner && (
              <button className={btn} onClick={() => toast("No data available to export yet.")}>
                Export report
              </button>
            )}
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
                section === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {section === "overview" && isOwner && <OverviewSection shop={shop} />}
        {section === "pos" && <PosSection shop={shop} cashier={role} />}
        {section === "inventory" && isOwner && <InventorySection shop={shop} />}
        {section === "expenses" && isOwner && <ExpensesSection shop={shop} />}
        {section === "staff" && isOwner && <StaffSection />}
        {section === "reports" && isOwner && <ReportsSection />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-flow-col justify-stretch gap-1 border-t border-border bg-card p-2 md:hidden">
        {visibleNav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={cn(
              "min-h-10 rounded-md px-1 text-[11px] font-medium text-muted-foreground",
              section === item.id && "bg-primary text-primary-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
