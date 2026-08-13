import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Panel, PanelHead, Pill, Thumb, MiniCard } from "./primitives";
import {
  activities,
  branches,
  expenseCategories,
  expenses,
  money,
  products,
  reports,
  staff,
  type BranchId,
  type Product,
} from "@/lib/toto-data";

const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card/80 px-3 text-xs font-extrabold transition hover:-translate-y-px";
const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-night bg-night px-3 text-xs font-extrabold text-cream transition hover:-translate-y-px";

function branchName(shop: BranchId) {
  return branches.find((b) => b.id === shop)!.name;
}

function scoped(shop: BranchId) {
  return products.filter((p) => shop === "all" || p.branch.toLowerCase() === shop);
}

export function OverviewSection({ shop }: { shop: BranchId }) {
  const max = Math.max(...branches.slice(1).map((b) => b.sales));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Panel>
        <PanelHead title="Branch performance">
          <button className={btn} onClick={() => toast("Showing today's branch performance.")}>
            Today
          </button>
          <button className={btn} onClick={() => toast("Showing this week's branch performance.")}>
            This week
          </button>
        </PanelHead>
        <div className="grid gap-3">
          {branches.slice(1).map((b) => (
            <div
              key={b.id}
              className={cn(
                "grid items-center gap-1.5 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[118px_1fr_110px_60px] sm:gap-3 sm:border-0 sm:py-0",
                shop !== "all" && shop !== b.id && "opacity-45",
              )}
            >
              <div className="text-[13px] font-black">{b.name}</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round((b.sales / max) * 100)}%`, background: b.color }}
                />
              </div>
              <div className="font-mono text-xs font-black sm:text-right">
                {money(b.sales).replace("TZS ", "")}
              </div>
              <div className="text-xs font-black text-muted-foreground sm:text-right">
                {b.margin}%
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Recent activity">
          <button
            className={btn}
            onClick={() =>
              toast("Audit log", {
                description:
                  "Product edits, price changes, stock adjustments, expenses and user changes are all recorded.",
              })
            }
          >
            Audit log
          </button>
        </PanelHead>
        <div className="grid gap-1.5">
          {activities.map((a) => (
            <div
              key={a.title}
              className="grid grid-cols-[34px_1fr] items-start gap-2.5 rounded-md p-2 hover:bg-accent sm:grid-cols-[34px_1fr_auto]"
            >
              <div
                className="grid size-8 place-items-center rounded-md text-[11px] font-black text-cream"
                style={{ background: a.color }}
              >
                {a.badge}
              </div>
              <div>
                <strong className="text-[13px]">{a.title}</strong>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{a.desc}</p>
              </div>
              <time className="col-start-2 text-[11px] whitespace-nowrap text-muted-foreground sm:col-start-3">
                {a.time}
              </time>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

type CartItem = Product & { count: number };

export function PosSection({ shop, cashier }: { shop: BranchId; cashier: string }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<"Cash" | "Lipa Namba">("Cash");
  const [receipt, setReceipt] = useState(4822);
  const available = useMemo(() => scoped(shop === "all" ? "kariakoo" : shop), [shop]);
  const assigned = shop === "all" ? "Kariakoo" : branchName(shop);

  const filtered = available.filter(
    (p) =>
      !query.trim() ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query.trim()),
  );

  function add(product?: Product) {
    const item =
      product ??
      filtered[0] ??
      available.find(
        (p) =>
          p.sku.toLowerCase() === query.trim().toLowerCase() || p.barcode === query.trim(),
      );
    if (!item) return toast("No product matches that barcode or name in this shop.");
    setCart((prev) => {
      const existing = prev.find((row) => row.sku === item.sku);
      return existing
        ? prev.map((row) => (row.sku === item.sku ? { ...row, count: row.count + 1 } : row))
        : [...prev, { ...item, count: 1 }];
    });
    setQuery("");
    toast(`${item.name} added to receipt.`);
  }

  function step(sku: string, delta: number) {
    setCart((prev) =>
      prev.map((r) => (r.sku === sku ? { ...r, count: r.count + delta } : r)).filter((r) => r.count > 0),
    );
  }

  const total = cart.reduce((sum, i) => sum + i.sell * i.count, 0);
  const count = cart.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <Panel>
        <PanelHead title="Cashier POS">
          <Pill>Assigned shop: {assigned}</Pill>
        </PanelHead>
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Scan barcode or search product, e.g. BBT-00124"
            className="min-h-10 rounded-md border border-border bg-card/80 px-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-ring/25"
          />
          <button className={btnPrimary} onClick={() => add()}>
            Add item
          </button>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.sku}
              onClick={() => add(p)}
              className="grid gap-1.5 rounded-md border border-border bg-card/70 p-3 text-left transition hover:-translate-y-px hover:border-coral"
            >
              <Thumb>{p.icon}</Thumb>
              <strong className="text-[13px]">{p.name}</strong>
              <span className="font-mono text-[11px] text-muted-foreground">
                {p.sku} - {money(p.sell)}
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className="text-sm text-muted-foreground">No products match that search.</p>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Current sale">
          <Pill tone="warn">Receipt #{receipt}</Pill>
        </PanelHead>
        <div className="grid gap-2">
          {cart.length ? (
            cart.map((item) => (
              <div
                key={item.sku}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/60 p-3"
              >
                <div>
                  <strong className="text-[13px]">{item.name}</strong>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{item.sku}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="size-7 rounded-md border border-border font-black"
                      onClick={() => step(item.sku, -1)}
                    >
                      -
                    </button>
                    <strong className="w-5 text-center text-sm">{item.count}</strong>
                    <button
                      className="size-7 rounded-md border border-border font-black"
                      onClick={() => step(item.sku, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong className="font-mono text-sm">{money(item.sell * item.count)}</strong>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No items added yet.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <strong className="font-mono text-foreground">{money(total)}</strong>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Items</span>
            <strong className="font-mono text-foreground">{count}</strong>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-bold">Total</span>
            <strong className="font-mono">{money(total)}</strong>
          </div>
        </div>

        <div className="my-3 grid grid-cols-2 gap-2">
          {(["Cash", "Lipa Namba"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPay(method)}
              className={cn(btn, pay === method && "border-night bg-night text-cream")}
            >
              {method}
            </button>
          ))}
        </div>
        <button
          className={cn(btnPrimary, "w-full")}
          onClick={() => {
            if (!cart.length) return toast("Add at least one product before completing a sale.");
            toast(`Receipt #${receipt} completed by ${pay}: ${money(total)}`, {
              description: `${assigned} - ${cashier} - stock reduced automatically.`,
            });
            setReceipt((r) => r + 1);
            setCart([]);
          }}
        >
          Complete sale
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Payment is confirmed manually. Every sale records cashier, shop, payment method and
          receipt number.
        </p>
      </Panel>
    </div>
  );
}

export function InventorySection({ shop }: { shop: BranchId }) {
  const rows = scoped(shop);
  return (
    <Panel>
      <PanelHead title="Inventory and low-stock control">
        <button
          className={btn}
          onClick={() => toast("Stock adjustment recorded with reason and owner accountability.")}
        >
          Stock adjustment
        </button>
        <button
          className={btnPrimary}
          onClick={() =>
            toast("New product", {
              description:
                "SKU, barcode, buying price, selling price, quantity, minimum stock, category and optional image.",
            })
          }
        >
          New product
        </button>
      </PanelHead>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              {["Product", "Branch", "Barcode", "Buying", "Selling", "Qty", "Min", "Status"].map((h) => (
                <th
                  key={h}
                  className="eyebrow border-b border-border px-2.5 pb-2.5 text-left text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const low = p.qty <= p.min;
              return (
                <tr key={p.sku} className="border-b border-border/50 last:border-0">
                  <td className="px-2.5 py-3">
                    <div className="flex min-w-[220px] items-center gap-2.5">
                      <Thumb>{p.icon}</Thumb>
                      <span>
                        <strong className="block text-[13px]">{p.name}</strong>
                        <span className="text-[11px] text-muted-foreground">
                          {p.category} - {p.sku}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-2.5 py-3 text-[13px]">{p.branch}</td>
                  <td className="px-2.5 py-3 font-mono text-[13px]">{p.barcode}</td>
                  <td className="px-2.5 py-3 font-mono text-[13px]">{money(p.buy)}</td>
                  <td className="px-2.5 py-3 font-mono text-[13px]">{money(p.sell)}</td>
                  <td className="px-2.5 py-3 font-mono text-[13px]">{p.qty}</td>
                  <td className="px-2.5 py-3 font-mono text-[13px] text-muted-foreground">{p.min}</td>
                  <td className="px-2.5 py-3">
                    <Pill tone={low ? "low" : "ok"}>{low ? "Low stock" : "In stock"}</Pill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ExpensesSection({ shop }: { shop: BranchId }) {
  const rows = expenses.filter((e) => shop === "all" || e.branch.toLowerCase() === shop);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <Panel>
        <PanelHead title="Shop expenses">
          <button
            className={btnPrimary}
            onClick={() =>
              toast("Expense entry ready", {
                description: "Amount, category, date, shop and description.",
              })
            }
          >
            Record expense
          </button>
        </PanelHead>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                {["Date", "Branch", "Category", "Description", "Amount"].map((h) => (
                  <th
                    key={h}
                    className="eyebrow border-b border-border px-2.5 pb-2.5 text-left text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.date + e.description} className="border-b border-border/50 last:border-0">
                  <td className="px-2.5 py-3 text-[13px]">{e.date}</td>
                  <td className="px-2.5 py-3 text-[13px]">{e.branch}</td>
                  <td className="px-2.5 py-3 text-[13px]">{e.category}</td>
                  <td className="px-2.5 py-3 text-[13px]">{e.description}</td>
                  <td className="px-2.5 py-3 font-mono text-[13px]">{money(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel>
        <PanelHead title="Expense categories" />
        <div className="grid gap-2.5">
          {expenseCategories.map((category) => (
            <MiniCard
              key={category}
              title={category}
              copy="Capture amount, date, branch and a short description for clean owner reporting."
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function StaffSection() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {staff.map((person) => (
        <MiniCard
          key={person.name}
          title={`${person.name} - ${person.branch}`}
          copy={person.detail}
          top={<Pill tone={person.role === "Owner" ? "ok" : "warn"}>{person.role}</Pill>}
        />
      ))}
    </div>
  );
}

export function ReportsSection() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => (
        <MiniCard key={report.title} title={report.title} copy={report.copy} />
      ))}
    </div>
  );
}