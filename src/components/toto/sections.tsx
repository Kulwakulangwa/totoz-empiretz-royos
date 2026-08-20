import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listStaff,
  createStaffAccount,
  deleteStaffAccount,
  type StaffAccount,
} from "@/lib/staff.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Panel, PanelHead, Pill, EmptyState, MiniCard } from "./primitives";
import { BarcodeScanner } from "./BarcodeScanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  branches,
  expenseCategories,
  money,
  reports,
  shopIds,
  stockOf,
  type BranchId,
  type Product,
  type ShopId,
} from "@/lib/toto-data";
import { branchLabel, useToto, type SaleLine } from "@/lib/toto-store";
import { Scan } from "lucide-react";

export const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent";
export const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90";

const field =
  "min-h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

const realBranches = branches.slice(1);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- Overview ---------------- */

export function OverviewSection({ shop }: { shop: BranchId }) {
  const { sales, expenses, activities } = useToto();
  const scopedName = shop === "all" ? "all shops" : branchLabel(shop);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Panel>
        <PanelHead
          title="Branch performance"
          description={`Sales and margin comparison for ${scopedName}.`}
        />
        <div className="grid gap-2">
          {realBranches.map((b) => {
            const branchSales = sales.filter((s) => s.branch === b.id);
            const revenue = branchSales.reduce((sum, s) => sum + s.total, 0);
            const cost = branchSales.reduce((sum, s) => sum + s.cost, 0);
            const spend = expenses
              .filter((e) => e.branch === b.id)
              .reduce((sum, e) => sum + e.amount, 0);
            const profit = revenue - cost - spend;
            return (
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
                  <div className="font-mono text-[13px]">{money(revenue)}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {branchSales.length
                      ? `${branchSales.length} sales · profit ${money(profit)}`
                      : "No sales recorded"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Recent activity" description="Sales, stock and price changes." />
        {activities.length ? (
          <div className="grid max-h-[420px] gap-2 overflow-y-auto">
            {activities.map((a, i) => (
              <div key={a.time + i} className="rounded-md border border-border p-3">
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

/* ---------------- Point of sale ---------------- */

type CartItem = SaleLine & { stock: number };

export function PosSection({ shop, cashier }: { shop: BranchId; cashier: string }) {
  const { products, recordSale, receipt } = useToto();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<"Cash" | "Lipa Namba">("Cash");
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeBranch: ShopId = shop === "all" ? "toto" : shop;
  const assigned = branchLabel(activeBranch);
  const available = useMemo(
    () => products.filter((p) => stockOf(p, activeBranch) > 0),
    [products, activeBranch],
  );

  const q = query.trim().toLowerCase();
  const filtered = available.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q),
  );

  function focusInput() {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }

  function addItem(item: Product, source: "scan" | "click" | "search") {
    setCart((prev) => {
      const existing = prev.find((row) => row.sku === item.sku);
      const inCart = existing?.qty ?? 0;
      const stock = stockOf(item, activeBranch);
      if (inCart + 1 > stock) {
        toast(`Only ${stock} units of ${item.name} left in ${branchLabel(activeBranch)}.`);
        return prev;
      }
      if (source === "scan") {
        toast(`Scanned: ${item.name}`, {
          description: `Barcode ${item.barcode} · ${money(item.sell)}`,
        });
      }
      return existing
        ? prev.map((row) => (row.sku === item.sku ? { ...row, qty: row.qty + 1 } : row))
        : [
            ...prev,
            {
              sku: item.sku,
              name: item.name,
              qty: 1,
              sell: item.sell,
              buy: item.buy,
              stock,
            },
          ];
    });
  }

  function add(product?: Product) {
    if (product) {
      addItem(product, "click");
      setQuery("");
      focusInput();
      return;
    }
    if (!q) {
      focusInput();
      return;
    }
    const exact = available.find((p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q);
    if (exact) {
      addItem(exact, "scan");
      setQuery("");
      focusInput();
      return;
    }
    if (filtered.length === 1) {
      addItem(filtered[0]!, "search");
      setQuery("");
      focusInput();
      return;
    }
    toast("No product matches that barcode or name in this shop.");
    focusInput();
  }

  function scan(barcode: string) {
    setScanning(false);
    const clean = barcode.trim().toLowerCase();
    if (!clean) return;
    const match = available.find(
      (p) => p.barcode.toLowerCase() === clean || p.sku.toLowerCase() === clean,
    );
    if (!match) {
      toast("No product matches scanned barcode", { description: barcode });
      setQuery(barcode);
      focusInput();
      return;
    }
    addItem(match, "scan");
    setQuery("");
    focusInput();
  }

  function step(sku: string, delta: number) {
    setCart((prev) =>
      prev
        .map((r) => {
          if (r.sku !== sku) return r;
          const next = r.qty + delta;
          if (next > r.stock) {
            toast(`Only ${r.stock} units of ${r.name} in stock.`);
            return r;
          }
          return { ...r, qty: next };
        })
        .filter((r) => r.qty > 0),
    );
  }

  const total = cart.reduce((sum, i) => sum + i.sell * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <Panel>
        <PanelHead title="Point of sale" description={`Assigned shop: ${assigned}`} />
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Scan barcode or search product"
              className="min-h-10 w-full rounded-md border border-border bg-card px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              autoFocus
            />
            <Scan className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button className={btn} onClick={() => setScanning(true)} aria-label="Scan with camera">
            <Scan className="size-4" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button className={btnPrimary} onClick={() => add()}>
            Add item
          </button>
        </div>
        {filtered.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const stock = stockOf(p, activeBranch);
              return (
                <button
                  key={p.sku}
                  onClick={() => add(p)}
                  disabled={stock === 0}
                  className="grid gap-1 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <strong className="text-[13px] font-semibold">{p.name}</strong>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {p.barcode} · {money(p.sell)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {stock > 0 ? `${stock} in stock` : "Out of stock"}
                  </span>
                </button>
              );
            })}
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
                    <strong className="w-5 text-center text-sm">{item.qty}</strong>
                    <button
                      className="size-7 rounded-md border border-border"
                      onClick={() => step(item.sku, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong className="font-mono text-sm">{money(item.sell * item.qty)}</strong>
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
              className={cn(
                btn,
                pay === method && "border-primary bg-primary text-primary-foreground",
              )}
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
            const sale = recordSale({
              branch: activeBranch,
              cashier,
              payment: pay,
              lines: cart.map(({ stock: _stock, ...line }) => line),
            });
            toast(`Receipt #${String(sale.receipt).padStart(4, "0")} completed`, {
              description: `${assigned} · ${cashier} · ${pay} · ${money(sale.total)}`,
            });
            setCart([]);
            focusInput();
          }}
        >
          Complete sale
        </button>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Completing a sale reduces stock, records the receipt and logs cashier, shop and payment
          method.
        </p>
      </Panel>

      <BarcodeScanner open={scanning} onClose={() => setScanning(false)} onScan={scan} />
    </div>
  );
}

/* ---------------- Inventory ---------------- */

const emptyProduct = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  buy: "",
  sell: "",
  min: "",
  stock: {} as Partial<Record<ShopId, string>>,
};

const stockLabel = (p: Product) => {
  const parts = shopIds
    .filter((id) => (p.stock[id] ?? 0) > 0)
    .map((id) => `${branchLabel(id)} ${p.stock[id]}`);
  return parts.length ? parts.join(" · ") : "No stock yet";
};

export function InventorySection({ shop }: { shop: BranchId }) {
  const { products, addProduct, updateProduct, removeProduct, adjustStock } = useToto();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [adjust, setAdjust] = useState<{
    sku: string;
    branch: ShopId;
    delta: string;
    reason: string;
  } | null>(null);

  const defaultShop: ShopId = shop === "all" ? "toto" : shop;
  const rows = products;

  function openNew() {
    setEditing(null);
    setForm({ ...emptyProduct, stock: {} });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p.sku);
    const stock: Partial<Record<ShopId, string>> = {};
    for (const id of shopIds) {
      if (p.stock[id] !== undefined) stock[id] = String(p.stock[id]);
    }
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      buy: String(p.buy),
      sell: String(p.sell),
      min: String(p.min),
      stock,
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast("Product name is required.");
      return;
    }
    const stock: Partial<Record<ShopId, number>> = {};
    for (const id of shopIds) {
      const value = Number(form.stock[id]) || 0;
      if (value > 0) stock[id] = value;
    }
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim() || "General",
      buy: Number(form.buy) || 0,
      sell: Number(form.sell) || 0,
      min: Number(form.min) || 0,
      stock,
    };
    const result = editing ? updateProduct(editing, payload) : addProduct(payload);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    toast(editing ? "Product updated" : "Product added", {
      description: `${result.product.name} · ${result.product.barcode}`,
    });
    setOpen(false);
  }

  return (
    <Panel>
      <PanelHead
        title="Inventory"
        description="One product identity per business, with stock tracked per shop."
      >
        <button
          className={btn}
          onClick={() => {
            if (!products.length) {
              toast("Add a product first.");
              return;
            }
            setAdjust({
              sku: rows[0]?.sku ?? products[0]!.sku,
              branch: defaultShop,
              delta: "",
              reason: "",
            });
          }}
        >
          Stock adjustment
        </button>
        <button className={btnPrimary} onClick={openNew}>
          New product
        </button>
      </PanelHead>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr>
                {[
                  "Product",
                  "Stock by shop",
                  "Barcode",
                  "Buying",
                  "Selling",
                  shop === "all" ? "Total qty" : `${branchLabel(shop)} qty`,
                  "Min",
                  "Status",
                  "",
                ].map((h) => (
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
              {rows.map((p) => {
                const qty = stockOf(p, shop);
                const low = qty <= p.min;
                return (
                  <tr key={p.sku} className="border-b border-border/50 last:border-0">
                    <td className="px-2.5 py-3">
                      <strong className="block font-semibold">{p.name}</strong>
                      <span className="text-[12px] text-muted-foreground">
                        {p.category} · {p.sku}
                      </span>
                    </td>
                    <td className="px-2.5 py-3 text-[12px] text-muted-foreground">
                      {stockLabel(p)}
                    </td>
                    <td className="px-2.5 py-3 font-mono">{p.barcode}</td>
                    <td className="px-2.5 py-3 font-mono">{money(p.buy)}</td>
                    <td className="px-2.5 py-3 font-mono">{money(p.sell)}</td>
                    <td className="px-2.5 py-3 font-mono">{qty}</td>
                    <td className="px-2.5 py-3 font-mono text-muted-foreground">{p.min}</td>
                    <td className="px-2.5 py-3">
                      <Pill tone={low ? "low" : "ok"}>{low ? "Low stock" : "In stock"}</Pill>
                    </td>
                    <td className="px-2.5 py-3">
                      <div className="flex gap-2">
                        <button
                          className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-[12px] font-medium text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            removeProduct(p.sku);
                            toast("Product removed", { description: p.name });
                          }}
                        >
                          Delete
                        </button>
                      </div>
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
          copy="Register your products with SKU, barcode, buying and selling price, per-shop stock and minimum stock level to start tracking inventory."
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              Leave SKU or barcode blank to generate them automatically. Stock is entered per shop.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product name">
              <input
                className={field}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <input
                className={field}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
            <Field label="SKU (optional)">
              <input
                className={field}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </Field>
            <Field label="Barcode (optional)">
              <input
                className={field}
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </Field>
            <Field label="Buying price (TZS)">
              <input
                className={field}
                inputMode="numeric"
                value={form.buy}
                onChange={(e) => setForm({ ...form, buy: e.target.value })}
              />
            </Field>
            <Field label="Selling price (TZS)">
              <input
                className={field}
                inputMode="numeric"
                value={form.sell}
                onChange={(e) => setForm({ ...form, sell: e.target.value })}
              />
            </Field>
            <Field label="Minimum stock">
              <input
                className={field}
                inputMode="numeric"
                value={form.min}
                onChange={(e) => setForm({ ...form, min: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-1 grid gap-3">
            <span className="text-[12px] font-medium text-muted-foreground">Stock per shop</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {shopIds.map((id) => (
                <Field key={id} label={branchLabel(id)}>
                  <input
                    className={field}
                    inputMode="numeric"
                    value={form.stock[id] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, stock: { ...form.stock, [id]: e.target.value } })
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button className={btn} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={save}>
              {editing ? "Save changes" : "Add product"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjust} onOpenChange={(v) => !v && setAdjust(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stock adjustment</DialogTitle>
            <DialogDescription>Use a negative number to reduce stock.</DialogDescription>
          </DialogHeader>
          {adjust && (
            <div className="grid gap-3">
              <Field label="Product">
                <select
                  className={field}
                  value={adjust.sku}
                  onChange={(e) => setAdjust({ ...adjust, sku: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} · {p.sku}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Shop">
                <select
                  className={field}
                  value={adjust.branch}
                  onChange={(e) => setAdjust({ ...adjust, branch: e.target.value as ShopId })}
                >
                  {shopIds.map((id) => (
                    <option key={id} value={id}>
                      {branchLabel(id)} (
                      {products.find((p) => p.sku === adjust.sku)?.stock[id] ?? 0})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity change">
                <input
                  className={field}
                  inputMode="numeric"
                  value={adjust.delta}
                  onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })}
                />
              </Field>
              <Field label="Reason">
                <input
                  className={field}
                  value={adjust.reason}
                  onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <button className={btn} onClick={() => setAdjust(null)}>
              Cancel
            </button>
            <button
              className={btnPrimary}
              onClick={() => {
                if (!adjust) return;
                const delta = Number(adjust.delta);
                if (!delta) {
                  toast("Enter a non-zero quantity change.");
                  return;
                }
                adjustStock(
                  adjust.sku,
                  adjust.branch,
                  delta,
                  adjust.reason.trim() || "No reason given",
                );
                toast("Stock adjusted");
                setAdjust(null);
              }}
            >
              Apply adjustment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/* ---------------- Expenses ---------------- */

export function ExpensesSection({ shop }: { shop: BranchId }) {
  const { expenses, addExpense, removeExpense } = useToto();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    branch: (shop === "all" ? "toto" : shop) as BranchId,
    category: expenseCategories[0] ?? "Other",
    description: "",
    amount: "",
  });

  const rows = expenses
    .map((e, index) => ({ ...e, index }))
    .filter((e) => shop === "all" || e.branch === shop);
  const totalSpend = rows.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <Panel>
        <PanelHead
          title="Shop expenses"
          description={`Recorded costs by branch, category and date. Total ${money(totalSpend)}.`}
        >
          <button className={btnPrimary} onClick={() => setOpen(true)}>
            Record expense
          </button>
        </PanelHead>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Date", "Branch", "Category", "Description", "Amount", ""].map((h) => (
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
                  <tr key={e.index} className="border-b border-border/50 last:border-0">
                    <td className="px-2.5 py-3">{e.date}</td>
                    <td className="px-2.5 py-3">{branchLabel(e.branch)}</td>
                    <td className="px-2.5 py-3">{e.category}</td>
                    <td className="px-2.5 py-3">{e.description}</td>
                    <td className="px-2.5 py-3 font-mono">{money(e.amount)}</td>
                    <td className="px-2.5 py-3">
                      <button
                        className="text-[12px] font-medium text-muted-foreground hover:text-destructive"
                        onClick={() => removeExpense(e.index)}
                      >
                        Delete
                      </button>
                    </td>
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
          {expenseCategories.map((category) => {
            const sum = rows
              .filter((e) => e.category === category)
              .reduce((s, e) => s + e.amount, 0);
            return (
              <span
                key={category}
                className="inline-flex min-h-8 items-center rounded-md border border-border px-3 text-[13px]"
              >
                {category}
                {sum > 0 && (
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                    {money(sum)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record expense</DialogTitle>
            <DialogDescription>Amount, category, date, shop and description.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Date">
              <input
                type="date"
                className={field}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Branch">
              <select
                className={field}
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value as BranchId })}
              >
                {realBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                className={field}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <input
                className={field}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Amount (TZS)">
              <input
                className={field}
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <button className={btn} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className={btnPrimary}
              onClick={() => {
                const amount = Number(form.amount);
                if (!amount || amount <= 0) {
                  toast("Enter a valid expense amount.");
                  return;
                }
                addExpense({
                  date: form.date,
                  branch: form.branch,
                  category: form.category,
                  description: form.description.trim() || form.category,
                  amount,
                });
                toast("Expense recorded", { description: money(amount) });
                setForm({ ...form, description: "", amount: "" });
                setOpen(false);
              }}
            >
              Save expense
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Staff ---------------- */

export function StaffSection() {
  const queryClient = useQueryClient();
  const listStaffFn = useServerFn(listStaff);
  const createStaffFn = useServerFn(createStaffAccount);
  const deleteStaffFn = useServerFn(deleteStaffAccount);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as "owner" | "cashier",
    branch: "toto" as ShopId,
  });

  const { data: people = [], isLoading, error } = useQuery({
    queryKey: ["staff-accounts"],
    queryFn: () => listStaffFn(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });

  const submit = async () => {
    if (!form.name.trim()) {
      toast("Enter the user's full name.");
      return;
    }
    if (!/^[^@\s]+@[^
