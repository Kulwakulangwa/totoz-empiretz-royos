import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Panel, PanelHead, Pill, EmptyState, MiniCard } from "./primitives";
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

export const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent";
export const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90";

function branchName(shop: BranchId) {
  return branches.find((b) => b.id === shop)!.name;
}

function scoped(shop: BranchId) {
  return products.filter((p) => shop === "all" || p.branch.toLowerCase() === shop);
}

export function OverviewSection({ shop }: { shop: BranchId }) {
  const rows = branches.slice(1);
  const scopedName = shop === "all" ? "all shops" : branchName(shop);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Panel>
        <PanelHead
          title="Branch performance"
          description={`Sales and margin comparison for ${scopedName}.`}
        />
        <div className="grid gap-2">
          {rows.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0",
                shop !== "all" && shop !== b.id && "opacity-45",
              )}
            >
              <div>
                <div className="text-[13px] font-medium">{b.name}</div>
                <div className="text-[12px] text-muted-foreground">{b.sub}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[13px]">{money(0)}</div>
                <div className="text-[12px] text-muted-foreground">No sales recorded</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Recent activity" description="Sales, stock and price changes." />
        {activities.length ? (
          <div className="grid gap-2">
            {activities.map((a) => (
              <div key={a.title} className="rounded-md border border-border p-3">
                <strong className="text-[13px] font-semibold">{a.title}</strong>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{a.desc}</p>
                <time className="mt-1 block text-[11px] text-muted-foreground">{a.time}</time>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No activity yet"
            copy="Sales, stock adjustments, price edits and user changes will appear here as your team starts working."
          />
        )}
      </Panel>
    </div>
  );
}

type CartItem = Product & { count: number };

export function PosSection({ shop, cashier }: { shop: BranchId; cashier: string }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<"Cash" | "Lipa Namba">("Cash");
  const [receipt, setReceipt] = useState(1);
  const available = useMemo(() => scoped(shop === "all" ? "kariakoo" : shop), [shop]);
  const assigned = shop === "all" ? branchName("kariakoo") : branchName(shop);

  const filtered = available.filter(
    (p) =>
      !query.trim() ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query.trim()),
  );

  function add(product?: Product) {
    const item = product ?? filtered[0];
    if (!item) {
      toast("No product matches that barcode or name in this shop.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((row) => row.sku === item.sku);
      return existing
        ? prev.map((row) => (row.sku === item.sku ? { ...row, count: row.count + 1 } : row))
        : [...prev, { ...item, count: 1 }];
    });
    setQuery("");
  }

  function step(sku: string, delta: number) {
    setCart((prev) =>
      prev
        .map((r) => (r.sku === sku ? { ...r, count: r.count + delta } : r))
        .filter((r) => r.count > 0),
    );
  }

  const total = cart.reduce((sum, i) => sum + i.sell * i.count, 0);
  const count = cart.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <Panel>
        <PanelHead title="Point of sale" description={`Assigned shop: ${assigned}`} />
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Scan barcode or search product"
            className="min-h-10 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <button className={btnPrimary} onClick={() => add()}>
            Add item
          </button>
        </div>
        {filtered.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.sku}
                onClick={() => add(p)}
                className="grid gap-1 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <strong className="text-[13px] font-semibold">{p.name}</strong>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {p.sku} · {money(p.sell)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No products available"
            copy="Add products with SKU, barcode, prices and stock levels in Inventory before selling from this terminal."
          />
        )}
      </Panel>

      <Panel>
        <PanelHead title="Current sale">
          <Pill tone="neutral">Receipt #{String(receipt).padStart(4, "0")}</Pill>
        </PanelHead>
        <div className="grid gap-2">
          {cart.length ? (
            cart.map((item) => (
              <div
                key={item.sku}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <strong className="text-[13px] font-semibold">{item.name}</strong>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {item.sku}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="size-7 rounded-md border border-border"
                      onClick={() => step(item.sku, -1)}
                      aria-label="Decrease quantity"
                    >
                      –
                    </button>
                    <strong className="w-5 text-center text-sm">{item.count}</strong>
                    <button
                      className="size-7 rounded-md border border-border"
                      onClick={() => step(item.sku, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong className="font-mono text-sm">{money(item.sell * item.count)}</strong>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
              No items on this receipt yet.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-1.5 border-t border-border pt-3 text-[13px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Items</span>
            <span className="font-mono text-foreground">{count}</span>
          </div>
          <div className="flex justify-between pt-1 text-base">
            <span className="font-semibold">Total</span>
            <strong className="font-mono">{money(total)}</strong>
          </div>
        </div>

        <div className="my-3 grid grid-cols-2 gap-2">
          {(["Cash", "Lipa Namba"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPay(method)}
              className={cn(btn, pay === method && "border-primary bg-primary text-primary-foreground")}
            >
              {method}
            </button>
          ))}
        </div>
        <button
          className={cn(btnPrimary, "w-full")}
          onClick={() => {
            if (!cart.length) {
              toast("Add at least one product before completing a sale.");
              return;
            }
            toast(`Receipt #${String(receipt).padStart(4, "0")} completed`, {
              description: `${assigned} · ${cashier} · ${pay} · ${money(total)}`,
            });
            setReceipt((r) => r + 1);
            setCart([]);
          }}
        >
          Complete sale
        </button>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
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
      <PanelHead title="Inventory" description="Stock levels, pricing and low-stock control.">
        <button
          className={btn}
          onClick={() => toast("Stock adjustments are recorded with a reason and the responsible user.")}
        >
          Stock adjustment
        </button>
        <button
          className={btnPrimary}
          onClick={() =>
            toast("New product", {
              description:
                "SKU, barcode, buying price, selling price, quantity, minimum stock and category.",
            })
          }
        >
          New product
        </button>
      </PanelHead>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr>
                {["Product", "Branch", "Barcode", "Buying", "Selling", "Qty", "Min", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-border px-2.5 pb-2.5 text-left text-[12px] font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const low = p.qty <= p.min;
                return (
                  <tr key={p.sku} className="border-b border-border/50 last:border-0">
                    <td className="px-2.5 py-3">
                      <strong className="block font-semibold">{p.name}</strong>
                      <span className="text-[12px] text-muted-foreground">
                        {p.category} · {p.sku}
                      </span>
                    </td>
                    <td className="px-2.5 py-3">{p.branch}</td>
                    <td className="px-2.5 py-3 font-mono">{p.barcode}</td>
                    <td className="px-2.5 py-3 font-mono">{money(p.buy)}</td>
                    <td className="px-2.5 py-3 font-mono">{money(p.sell)}</td>
                    <td className="px-2.5 py-3 font-mono">{p.qty}</td>
                    <td className="px-2.5 py-3 font-mono text-muted-foreground">{p.min}</td>
                    <td className="px-2.5 py-3">
                      <Pill tone={low ? "low" : "ok"}>{low ? "Low stock" : "In stock"}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No products yet"
          copy="Register your products with SKU, barcode, buying and selling price, quantity and minimum stock level to start tracking inventory."
        />
      )}
    </Panel>
  );
}

export function ExpensesSection({ shop }: { shop: BranchId }) {
  const rows = expenses.filter((e) => shop === "all" || e.branch.toLowerCase() === shop);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <Panel>
        <PanelHead title="Shop expenses" description="Recorded costs by branch, category and date.">
          <button
            className={btnPrimary}
            onClick={() =>
              toast("Expense entry", {
                description: "Amount, category, date, shop and description.",
              })
            }
          >
            Record expense
          </button>
        </PanelHead>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Date", "Branch", "Category", "Description", "Amount"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-border px-2.5 pb-2.5 text-left text-[12px] font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.date + e.description} className="border-b border-border/50 last:border-0">
                    <td className="px-2.5 py-3">{e.date}</td>
                    <td className="px-2.5 py-3">{e.branch}</td>
                    <td className="px-2.5 py-3">{e.category}</td>
                    <td className="px-2.5 py-3">{e.description}</td>
                    <td className="px-2.5 py-3 font-mono">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No expenses recorded"
            copy="Record rent, utilities, transport and other shop costs so profit per branch stays accurate."
          />
        )}
      </Panel>
      <Panel>
        <PanelHead title="Categories" description="Used when recording an expense." />
        <div className="flex flex-wrap gap-2">
          {expenseCategories.map((category) => (
            <span
              key={category}
              className="inline-flex min-h-8 items-center rounded-md border border-border px-3 text-[13px]"
            >
              {category}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function StaffSection() {
  return (
    <Panel>
      <PanelHead title="Staff and access" description="Owner and cashier accounts per branch.">
        <button
          className={btnPrimary}
          onClick={() =>
            toast("New user", { description: "Name, role, assigned shop and login details." })
          }
        >
          Add user
        </button>
      </PanelHead>
      {staff.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((person) => (
            <MiniCard
              key={person.name}
              title={`${person.name} · ${person.branch}`}
              copy={person.detail}
              top={<Pill tone={person.role === "Owner" ? "ok" : "neutral"}>{person.role}</Pill>}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No users yet"
          copy="Create the owner account and cashier accounts. Cashiers are limited to point of sale for their assigned shop."
        />
      )}
    </Panel>
  );
}

export function ReportsSection() {
  return (
    <Panel>
      <PanelHead title="Reports" description="Available once sales and expenses are recorded." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <MiniCard key={report.title} title={report.title} copy={report.copy} />
        ))}
      </div>
    </Panel>
  );
}
