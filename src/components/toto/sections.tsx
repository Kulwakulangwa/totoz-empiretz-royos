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
import { Scanner } from "./Scanner";
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
import { Scan, QrCode } from "lucide-react";

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
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [scanningQR, setScanningQR] = useState(false);
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

  function handleScan(data: string) {
    setScanningBarcode(false);
    setScanningQR(false);
    const clean = data.trim().toLowerCase();
    if (!clean) return;

    const match = available.find(
      (p) =>
        p.barcode.toLowerCase() === clean ||
        p.sku.toLowerCase() === clean ||
        p.name.toLowerCase() === clean,
    );

    if (!match) {
      toast("No product matches scanned data", { description: data });
      setQuery(data);
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
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Scan barcode, QR code or search product"
              className="min-h-10 w-full rounded-md border border-border bg-card px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              autoFocus
            />
            <Scan className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button className={btn} onClick={() => setScanningBarcode(true)} aria-label="Scan barcode">
            <Scan className="size-4" />
            <span className="hidden sm:inline">Barcode</span>
          </button>
          <button className={btn} onClick={() => setScanningQR(true)} aria-label="Scan QR code">
            <QrCode className="size-4" />
            <span className="hidden sm:inline">QR Code</span>
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

      {/* Barcode Scanner */}
      <Scanner
        open={scanningBarcode}
        onClose={() => setScanningBarcode(false)}
        onScan={handleScan}
        mode="barcode"
      />

      {/* QR Code Scanner */}
      <Scanner
        open={scanningQR}
        onClose={() => setScanningQR(false)}
        onScan={handleScan}
        mode="qr"
      />
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      toast("Enter a valid login email.");
      return;
    }
    if (form.password.length < 6) {
      toast("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await createStaffFn({
        data: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.name.trim(),
          branch: form.branch,
          role: form.role,
        },
      });
      toast("Account created", {
        description: `${form.email.trim().toLowerCase()} can now sign in.`,
      });
      setForm({ name: "", email: "", password: "", role: "cashier", branch: form.branch });
      setOpen(false);
      await refresh();
    } catch (e) {
      toast("Could not create the account", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (person: StaffAccount) => {
    try {
      await deleteStaffFn({ data: { id: person.id } });
      toast("Account removed", { description: person.email });
      await refresh();
    } catch (e) {
      toast("Could not remove the account", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  return (
    <Panel>
      <PanelHead
        title="Staff and access"
        description="Create real login accounts. Cashiers only see point of sale and returns for their shop."
      >
        <button className={btnPrimary} onClick={() => setOpen(true)}>
          Create account
        </button>
      </PanelHead>

      {isLoading ? (
        <p className="text-[13px] text-muted-foreground">Loading accounts…</p>
      ) : error ? (
        <p className="text-[13px] text-destructive">
          Could not load accounts. Only the owner can manage staff.
        </p>
      ) : people.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <MiniCard
              key={person.id}
              title={`${person.fullName} · ${branchLabel(person.branch as BranchId)}`}
              copy={person.email}
              top={
                <div className="flex items-center gap-2">
                  <Pill tone={person.role === "owner" ? "ok" : "neutral"}>
                    {person.role === "owner" ? "Owner" : "Cashier"}
                  </Pill>
                  <button
                    className="text-[12px] text-muted-foreground hover:text-destructive"
                    onClick={() => remove(person)}
                  >
                    Remove
                  </button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No accounts yet"
          copy="Create cashier accounts with an email and password so they can sign in on the shop device."
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create login account</DialogTitle>
            <DialogDescription>
              The cashier signs in with this email and password at the login screen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Full name">
              <input
                className={field}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Login email">
              <input
                className={field}
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cashier@totoempire.co.tz"
              />
            </Field>
            <Field label="Temporary password">
              <input
                className={field}
                type="text"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </Field>
            <Field label="Role">
              <select
                className={field}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "owner" | "cashier" })}
              >
                <option value="cashier">Cashier</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <Field label="Assigned shop">
              <select
                className={field}
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value as ShopId })}
              >
                {realBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <button className={btn} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={submit} disabled={saving}>
              {saving ? "Creating…" : "Create account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/* ---------------- Reports ---------------- */

export function ReportsSection({ shop }: { shop: BranchId }) {
  const store = useToto();
  const scope = <T extends { branch: BranchId }>(rows: T[]) =>
    rows.filter((r) => shop === "all" || r.branch === shop);
  const sales = scope(store.sales);
  const expenses = scope(store.expenses);
  const products = store.products;
  const returns = scope(store.returns);
  const [openReport, setOpenReport] = useState<string | null>(null);

  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const cost = sales.reduce((s, x) => s + x.cost, 0);
  const spend = expenses.reduce((s, x) => s + x.amount, 0);
  const cash = sales.filter((s) => s.payment === "Cash").reduce((s, x) => s + x.total, 0);
  const lipa = revenue - cash;
  const lowStock = products.filter((p) => stockOf(p, shop) <= p.min);

  const summaries: Record<string, { label: string; value: string }[]> = {
    "Sales report": [
      { label: "Receipts", value: String(sales.length) },
      { label: "Revenue", value: money(revenue) },
      { label: "Gross profit", value: money(revenue - cost) },
    ],
    "Payment report": [
      { label: "Cash", value: money(cash) },
      { label: "Lipa Namba", value: money(lipa) },
    ],
    "Product sales": Object.entries(
      sales
        .flatMap((s) => s.lines)
        .reduce<Record<string, number>>((acc, l) => {
          acc[l.name] = (acc[l.name] ?? 0) + l.qty;
          return acc;
        }, {}),
    ).map(([name, qty]) => ({ label: name, value: `${qty} sold` })),
    "Inventory report": products.map((p) => ({
      label: `${p.name} · ${p.sku}`,
      value: `${stockOf(p, shop)} in stock`,
    })),
    "Low-stock report": lowStock.map((p) => ({
      label: `${p.name} · ${p.sku}`,
      value: `${stockOf(p, shop)} / min ${p.min}`,
    })),
    "Expense report": Object.entries(
      expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
        return acc;
      }, {}),
    ).map(([category, amount]) => ({ label: category, value: money(amount) })),
    "Branch performance": realBranches.map((b) => {
      const bs = sales.filter((s) => s.branch === b.id);
      const bRev = bs.reduce((s, x) => s + x.total, 0);
      const bCost = bs.reduce((s, x) => s + x.cost, 0);
      const bSpend = expenses.filter((e) => e.branch === b.id).reduce((s, e) => s + e.amount, 0);
      return { label: b.name, value: `${money(bRev)} · profit ${money(bRev - bCost - bSpend)}` };
    }),
    "VAT report": [
      { label: "Output VAT on sales", value: money(sales.reduce((a, x) => a + x.vat, 0)) },
      { label: "VAT credited on returns", value: money(returns.reduce((a, x) => a + x.vat, 0)) },
      {
        label: "Net VAT payable",
        value: money(sales.reduce((a, x) => a + x.vat, 0) - returns.reduce((a, x) => a + x.vat, 0)),
      },
    ],
    "Returns report": returns.map((r) => ({
      label: `CN-${String(r.creditNote).padStart(4, "0")} · ${branchLabel(r.branch)} · ${r.reason}`,
      value: money(r.total),
    })),
    "Audit history": sales.map((s) => ({
      label: `#${String(s.receipt).padStart(4, "0")} · ${branchLabel(s.branch)} · ${s.date}`,
      value: `${s.payment} · ${money(s.total)}`,
    })),
  };

  const rows = openReport ? (summaries[openReport] ?? []) : [];

  return (
    <Panel>
      <PanelHead
        title="Reports"
        description={`Revenue ${money(revenue)} · expenses ${money(spend)} · net ${money(revenue - cost - spend)}.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <button
            key={report.title}
            className="text-left"
            onClick={() => setOpenReport(report.title)}
          >
            <MiniCard title={report.title} copy={report.copy} />
          </button>
        ))}
      </div>

      <Dialog open={!!openReport} onOpenChange={(v) => !v && setOpenReport(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{openReport}</DialogTitle>
            <DialogDescription>
              Generated from recorded sales, stock and expenses.
            </DialogDescription>
          </DialogHeader>
          {rows.length ? (
            <div className="grid gap-2">
              {rows.map((r, i) => (
                <div
                  key={r.label + i}
                  className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-[13px] last:border-0"
                >
                  <span>{r.label}</span>
                  <span className="font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              No data for this report yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/* ---------------- Returns ---------------- */

export function ReturnsSection({
  shop,
  cashier,
  isOwner,
}: {
  shop: BranchId;
  cashier: string;
  isOwner: boolean;
}) {
  const { sales, returns, recordReturn } = useToto();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("Customer return");
  const [restock, setRestock] = useState(true);

  const scoped = sales.filter((s) => shop === "all" || s.branch === shop);
  const q = query.trim().toLowerCase();
  const matches = scoped.filter(
    (s) =>
      !q || String(s.receipt).padStart(4, "0").includes(q) || s.cashier.toLowerCase().includes(q),
  );
  const sale = sales.find((s) => s.id === openId) ?? null;

  function open(id: string) {
    const target = sales.find((s) => s.id === id);
    setOpenId(id);
    setQty(Object.fromEntries((target?.lines ?? []).map((l) => [l.sku, 0])));
    setReason("Customer return");
    setRestock(true);
  }

  function submit() {
    if (!sale) return;
    const lines = sale.lines
      .map((l) => ({ ...l, qty: Math.min(qty[l.sku] ?? 0, l.qty) }))
      .filter((l) => l.qty > 0);
    if (!lines.length) {
      toast("Select at least one item to return.");
      return;
    }
    const entry = recordReturn({ saleId: sale.id, cashier, reason, restock, lines });
    if (!entry) {
      toast("Could not record this return.");
      return;
    }
    toast(`Credit note CN-${String(entry.creditNote).padStart(4, "0")} issued`, {
      description: `${money(entry.total)} refunded${restock ? " · items restocked" : ""}`,
    });
    setOpenId(null);
  }

  return (
    <div className="grid gap-5">
      <Panel>
        <PanelHead
          title="Returns and credit notes"
          description="Find a receipt, pick the items coming back and issue a credit note."
        />
        <input
          className={field}
          placeholder="Search by receipt number or cashier"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {matches.length ? (
          <div className="mt-3 grid gap-2">
            {matches.slice(0, 30).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <div className="text-[13px] font-medium">
                    #{String(s.receipt).padStart(4, "0")} · {branchLabel(s.branch)}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {s.date} · {s.cashier} · {s.payment}
                    {s.returned ? ` · ${s.returned} item(s) returned` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px]">{money(s.total)}</span>
                  <button className={btn} onClick={() => open(s.id)}>
                    Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="No receipts found"
              copy="Sales recorded at the point of sale appear here so you can refund them."
            />
          </div>
        )}
      </Panel>

      {isOwner && (
        <Panel>
          <PanelHead title="Credit notes issued" description="Every refund with its reason." />
          {returns.length ? (
            <div className="grid gap-2">
              {returns.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-[13px] last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      CN-{String(r.creditNote).padStart(4, "0")} · receipt #
                      {String(r.receipt).padStart(4, "0")}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {r.date} · {branchLabel(r.branch)} · {r.reason}
                      {r.restock ? " · restocked" : ""}
                    </div>
                  </div>
                  <span className="font-mono">-{money(r.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No returns yet" copy="Credit notes will be listed here." />
          )}
        </Panel>
      )}

      <Dialog open={!!sale} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Return items · receipt #{sale ? String(sale.receipt).padStart(4, "0") : ""}
            </DialogTitle>
            <DialogDescription>
              Choose how many units of each line are coming back.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {sale?.lines.map((l) => (
              <div key={l.sku} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium">{l.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    sold {l.qty} · {money(l.sell)}
                  </div>
                </div>
                <input
                  className={cn(field, "w-20")}
                  type="number"
                  min={0}
                  max={l.qty}
                  value={qty[l.sku] ?? 0}
                  onChange={(e) =>
                    setQty((prev) => ({
                      ...prev,
                      [l.sku]: Math.max(0, Math.min(l.qty, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
            ))}
            <Field label="Reason">
              <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
              />
              Put returned items back into stock
            </label>
          </div>
          <DialogFooter>
            <button className={btn} onClick={() => setOpenId(null)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={submit}>
              Issue credit note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- VAT / EFD settings ---------------- */

export function SettingsSection() {
  const { settings, updateSettings } = useToto();
  const [form, setForm] = useState(settings);

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <Panel>
      <PanelHead
        title="VAT and EFD receipt details"
        description="These details print on every receipt. Prices are treated as VAT inclusive."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name">
          <input
            className={field}
            value={form.businessName}
            onChange={(e) => set({ businessName: e.target.value })}
          />
        </Field>
        <Field label="Address">
          <input
            className={field}
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className={field}
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="TIN">
          <input
            className={field}
            value={form.tin}
            onChange={(e) => set({ tin: e.target.value })}
          />
        </Field>
        <Field label="VRN">
          <input
            className={field}
            value={form.vrn}
            onChange={(e) => set({ vrn: e.target.value })}
          />
        </Field>
        <Field label="EFD serial">
          <input
            className={field}
            value={form.efdSerial}
            onChange={(e) => set({ efdSerial: e.target.value })}
          />
        </Field>
        <Field label="VAT rate (%)">
          <input
            className={field}
            type="number"
            min={0}
            max={30}
            value={form.vatRate}
            onChange={(e) => set({ vatRate: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Receipt footer">
          <input
            className={field}
            value={form.receiptFooter}
            onChange={(e) => set({ receiptFooter: e.target.value })}
          />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={form.vatEnabled}
          onChange={(e) => set({ vatEnabled: e.target.checked })}
        />
        Charge VAT on sales (prices are VAT inclusive)
      </label>
      <div className="mt-4 flex gap-2">
        <button
          className={btnPrimary}
          onClick={() => {
            updateSettings(form);
            toast("VAT / EFD settings saved");
          }}
        >
          Save settings
        </button>
        <button className={btn} onClick={() => setForm(settings)}>
          Reset
        </button>
      </div>
    </Panel>
  );
}
