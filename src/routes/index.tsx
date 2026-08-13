import { useMemo, useState } from "react";
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
import {
  branches,
  compact,
  money,
  navItems,
  type BranchId,
  type SectionId,
} from "@/lib/toto-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toto Empire | Retail Management Dashboard" },
      {
        name: "description",
        content:
          "Owner command center for five Toto Empire shops: POS, stock, barcodes, expenses, cashier roles and branch reports.",
      },
      { property: "og:title", content: "Toto Empire | Retail Management Dashboard" },
      {
        property: "og:description",
        content:
          "Monitor sales, POS activity, inventory, expenses and branch performance across all five Toto Empire shops.",
      },
    ],
  }),
  component: Index,
});

const actionBtn =
  "inline-flex min-h-9.5 items-center justify-center gap-2 rounded-md border border-border bg-card/80 px-3 text-xs font-extrabold transition hover:-translate-y-px";

function Index() {
  const [role, setRole] = useState<"Owner" | "Cashier">("Owner");
  const [shop, setShop] = useState<BranchId>("all");
  const [section, setSection] = useState<SectionId>("overview");
  const isOwner = role === "Owner";

  const data = useMemo(() => branches.find((b) => b.id === shop)!, [shop]);
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);
  const profit = data.sales - data.expenses;

  function pickRole(next: "Owner" | "Cashier") {
    setRole(next);
    if (next === "Cashier") {
      setShop("kariakoo");
      setSection("pos");
      toast("Cashier mode - POS only", {
        description: "Dashboard, reports, stock edits, price changes and expenses are locked.",
      });
    } else {
      setShop("all");
      setSection("overview");
    }
  }

  const metrics = [
    { label: "Sales today", value: money(data.sales), note: "+12% vs yesterday", icon: "S", color: "var(--coral)", warn: false },
    { label: "Expenses", value: money(data.expenses), note: "Tracked by shop and category", icon: "E", color: "var(--violet)", warn: false },
    { label: "Gross profit", value: money(profit), note: `${data.margin}% estimated margin`, icon: "P", color: "var(--teal)", warn: false },
    { label: "Low stock", value: String(data.low), note: "Products at or below minimum", icon: "L", color: "var(--amber)", warn: data.low > 3 },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar
        shop={shop}
        section={section}
        isOwner={isOwner}
        onShop={setShop}
        onSection={setSection}
      />

      <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-9">
        <header className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="eyebrow mb-1.5 text-coral">
              {shop === "all" ? "All shops" : data.name} - Today, 12 Aug 2026
            </div>
            <h1 className="max-w-[780px] text-[clamp(28px,4vw,46px)] leading-[0.98] font-black">
              {isOwner
                ? "Owner command center for five retail shops."
                : `POS terminal for ${data.name}.`}
            </h1>
            <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
              {isOwner
                ? "One place to monitor sales, POS activity, shop stock, barcodes, expenses, cashier accounts and branch performance."
                : "Scan or search a product, build the receipt and confirm Cash or Lipa Namba payment manually."}
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            <div className="flex gap-1 rounded-md border border-border bg-card/80 p-1">
              {(["Owner", "Cashier"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => pickRole(option)}
                  className={cn(
                    "min-h-8 rounded-md px-3 text-xs font-extrabold",
                    role === option && "bg-night text-cream",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {isOwner && (
              <>
                <button
                  className={actionBtn}
                  onClick={() => toast("Barcode label batch prepared for selected products.")}
                >
                  Print barcodes
                </button>
                <button
                  className={actionBtn}
                  onClick={() => toast("Owner report exported for the selected shop and period.")}
                >
                  Export report
                </button>
              </>
            )}
            <button
              className={cn(actionBtn, "border-night bg-night text-cream")}
              onClick={() => setSection("pos")}
            >
              New sale
            </button>
          </div>
        </header>

        {isOwner && (
          <>
            <section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <div className="relative min-h-[250px] overflow-hidden rounded-md p-5 text-cream shadow-[var(--shadow-panel)] sm:p-6">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.21_0.018_290/0.94),oklch(0.28_0.03_300/0.94)),linear-gradient(90deg,oklch(0.658_0.15_33/0.35),oklch(0.525_0.085_186/0.3))]" />
                <div
                  className="pointer-events-none absolute -right-10 -bottom-20 h-56 w-80 rotate-[-10deg] opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, oklch(1 0 0 / 0.16) 1px, transparent 1px), linear-gradient(oklch(1 0 0 / 0.12) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                />
                <div className="relative">
                  <div className="eyebrow text-coral">Live business pulse</div>
                  <h2 className="mt-2.5 max-w-[720px] text-[clamp(24px,3.4vw,40px)] leading-none font-black">
                    {money(data.sales)} sold today{" "}
                    {shop === "all" ? "across all active branches" : `at ${data.name}`}.
                  </h2>
                  <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-cream/75">
                    {shop === "all"
                      ? "Cashiers are moving fast, Lipa Namba is trending up, and low-stock attention is concentrated in baby products and jewellery."
                      : `${data.name} is open with ${data.cashiers} cashiers signed in and ${data.receipts} receipts issued today.`}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                    {[
                      ["Open shops", shop === "all" ? "5 / 5" : "Open"],
                      ["Cashiers in", String(data.cashiers)],
                      ["Receipts", String(data.receipts)],
                      ["Gross margin", `${data.margin}%`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="min-w-[142px] rounded-md border border-cream/10 bg-cream/8 p-3"
                      >
                        <span className="eyebrow block text-cream/60">{label}</span>
                        <strong className="mt-1 block text-xl">{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold">Payment mix</h3>
                  <span className="rounded-full bg-success/12 px-2 py-1 text-[11px] font-black text-success">
                    Live
                  </span>
                </div>
                <div className="font-mono text-[clamp(28px,5vw,42px)] font-black">
                  {compact(data.sales)}
                </div>
                <div className="grid gap-2">
                  {[
                    ["Cash", data.cash, "var(--coral)"],
                    ["Lipa Namba", data.lipa, "var(--teal)"],
                  ].map(([label, pct, color]) => (
                    <div
                      key={label as string}
                      className="grid grid-cols-[92px_1fr_44px] items-center gap-2 text-xs font-extrabold"
                    >
                      <span>{label as string}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-track">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: color as string }}
                        />
                      </div>
                      <strong className="text-right">{pct as number}%</strong>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Manual confirmation keeps this version simple while still recording every payment
                  method.
                </p>
              </div>
            </section>

            <section className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <article key={metric.label} className="panel relative min-h-[142px] p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      className="grid size-9 place-items-center rounded-md font-black text-cream"
                      style={{ background: metric.color }}
                    >
                      {metric.icon}
                    </div>
                    <div
                      className={cn(
                        "text-xs font-black",
                        metric.warn ? "text-danger" : "text-success",
                      )}
                    >
                      {metric.warn ? "Needs action" : "Healthy"}
                    </div>
                  </div>
                  <div className="mt-3.5 text-xs font-extrabold text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black">{metric.value}</div>
                  <div className="mt-1 text-xs leading-snug text-muted-foreground">
                    {metric.note}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        <div className="mb-4 flex w-max max-w-full gap-1.5 overflow-x-auto rounded-md border border-border bg-card/75 p-1">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "min-h-8.5 rounded-md px-3 text-xs font-extrabold whitespace-nowrap",
                section === item.id && "bg-night text-cream",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {section === "overview" && isOwner && <OverviewSection shop={shop} />}
        {section === "pos" && (
          <PosSection shop={shop} cashier={isOwner ? "Owner" : "Asha"} />
        )}
        {section === "inventory" && isOwner && <InventorySection shop={shop} />}
        {section === "expenses" && isOwner && <ExpensesSection shop={shop} />}
        {section === "staff" && isOwner && <StaffSection />}
        {section === "reports" && isOwner && <ReportsSection />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-flow-col justify-stretch gap-1 border-t border-cream/10 bg-night/95 p-2 backdrop-blur md:hidden">
        {visibleNav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={cn(
              "min-h-10 rounded-md text-[11px] font-black text-cream/70",
              section === item.id && "bg-coral/22 text-cream",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
