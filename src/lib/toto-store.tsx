import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  branches,
  shopIds,
  stockOf,
  INTERNAL_BARCODE_START,
  type Activity,
  type BranchId,
  type Expense,
  type Product,
  type ShopId,
  type Staff,
} from "@/lib/toto-data";

export type SaleLine = { sku: string; name: string; qty: number; sell: number; buy: number };
export type Sale = {
  id: string;
  receipt: number;
  date: string;
  branch: BranchId;
  cashier: string;
  payment: "Cash" | "Lipa Namba";
  lines: SaleLine[];
  total: number;
  cost: number;
  vat: number;
  returned?: number;
};

export type SaleReturn = {
  id: string;
  saleId: string;
  receipt: number;
  creditNote: number;
  date: string;
  branch: BranchId;
  cashier: string;
  reason: string;
  lines: SaleLine[];
  total: number;
  cost: number;
  vat: number;
  restock: boolean;
};

export type TaxSettings = {
  businessName: string;
  address: string;
  phone: string;
  tin: string;
  vrn: string;
  efdSerial: string;
  vatEnabled: boolean;
  vatRate: number;
  receiptFooter: string;
};

export const defaultTaxSettings: TaxSettings = {
  businessName: "Toto Empire",
  address: "Dar es Salaam, Tanzania",
  phone: "",
  tin: "",
  vrn: "",
  efdSerial: "",
  vatEnabled: true,
  vatRate: 18,
  receiptFooter: "Thank you for shopping with Toto Empire",
};

/** Prices are VAT inclusive (TRA practice). Returns the VAT portion of a gross amount. */
export const vatOf = (gross: number, settings: TaxSettings) =>
  settings.vatEnabled && settings.vatRate > 0
    ? Math.round(gross - gross / (1 + settings.vatRate / 100))
    : 0;

type State = {
  products: Product[];
  sales: Sale[];
  returns: SaleReturn[];
  expenses: Expense[];
  staff: Staff[];
  activities: Activity[];
  receipt: number;
  creditNote: number;
  settings: TaxSettings;
};

const EMPTY: State = {
  products: [],
  sales: [],
  returns: [],
  expenses: [],
  staff: [],
  activities: [],
  receipt: 1,
  creditNote: 1,
  settings: defaultTaxSettings,
};
const KEY = "toto-empire-state-v2";
const LEGACY_KEY = "toto-empire-state-v1";

export type ProductInput = {
  name: string;
  sku: string;
  /** Blank means "generate an internal barcode". */
  barcode: string;
  category: string;
  buy: number;
  sell: number;
  min: number;
  stock: Partial<Record<ShopId, number>>;
};

export type SaveResult = { ok: true; product: Product } | { ok: false; error: string };

type Ctx = State & {
  addProduct: (input: ProductInput) => SaveResult;
  updateProduct: (sku: string, input: ProductInput) => SaveResult;
  removeProduct: (sku: string) => void;
  adjustStock: (sku: string, branch: ShopId, delta: number, reason: string) => void;
  findByCode: (code: string, branch: BranchId) => Product | undefined;
  /** Next free internal barcode, safe against everything currently stored. */
  nextBarcode: () => string;
  /** Suggested unique SKU following the existing PREFIX-0001 convention. */
  suggestSku: (name: string) => string;
  recordSale: (input: {
    branch: BranchId;
    cashier: string;
    payment: "Cash" | "Lipa Namba";
    lines: SaleLine[];
  }) => Sale;
  recordReturn: (input: {
    saleId: string;
    cashier: string;
    reason: string;
    restock: boolean;
    lines: SaleLine[];
  }) => SaleReturn | undefined;
  updateSettings: (patch: Partial<TaxSettings>) => void;
  addExpense: (e: Expense) => void;
  removeExpense: (index: number) => void;
  addStaff: (s: Staff) => void;
  removeStaff: (name: string) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

const today = () => new Date().toISOString().slice(0, 10);
const timeLabel = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const branchLabel = (id: BranchId) => branches.find((b) => b.id === id)?.name ?? id;

const norm = (v: string) => v.trim().toLowerCase();

/* ---------- barcode / sku helpers (pure) ---------- */

function nextInternalBarcode(products: Product[]): string {
  const used = new Set(products.map((p) => p.barcode));
  let candidate = INTERNAL_BARCODE_START;
  for (const p of products) {
    const n = Number(p.barcode);
    if (Number.isSafeInteger(n) && n >= INTERNAL_BARCODE_START && n >= candidate) {
      candidate = n + 1;
    }
  }
  // Never hand out a value that already exists, even after manual edits.
  while (used.has(String(candidate))) candidate += 1;
  return String(candidate);
}

function skuPrefix(name: string) {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.map((w) => w[0]).join("");
  return (letters || "SKU").slice(0, 3).padEnd(2, "X");
}

function nextSku(products: Product[], name: string): string {
  const prefix = skuPrefix(name);
  const used = new Set(products.map((p) => norm(p.sku)));
  let n = 1;
  let candidate = `${prefix}-${String(n).padStart(4, "0")}`;
  while (used.has(norm(candidate))) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(4, "0")}`;
  }
  return candidate;
}

const cleanStock = (stock: Partial<Record<ShopId, number>>) => {
  const out: Partial<Record<ShopId, number>> = {};
  for (const id of shopIds) {
    const value = Math.max(0, Math.round(Number(stock[id]) || 0));
    if (value > 0) out[id] = value;
  }
  return out;
};

/* ---------- legacy migration: per-branch rows -> one global product ---------- */

type LegacyProduct = Product & { branch?: BranchId; qty?: number };

function migrateProducts(rows: LegacyProduct[]): { products: Product[]; notes: string[] } {
  const products: Product[] = [];
  const notes: string[] = [];
  const byBarcode = new Map<string, Product>();
  const bySku = new Map<string, Product>();

  for (const row of rows) {
    if (row.stock && !row.branch) {
      // already migrated
      const existing = byBarcode.get(norm(row.barcode)) ?? bySku.get(norm(row.sku));
      if (existing) {
        notes.push(`Duplicate identity merged: ${row.name} (${row.sku})`);
        for (const id of shopIds) {
          const add = row.stock[id] ?? 0;
          if (add) existing.stock[id] = (existing.stock[id] ?? 0) + add;
        }
        continue;
      }
      const p: Product = { ...row, stock: cleanStock(row.stock) };
      products.push(p);
      byBarcode.set(norm(p.barcode), p);
      bySku.set(norm(p.sku), p);
      continue;
    }

    const branch = (row.branch && row.branch !== "all" ? row.branch : "toto") as ShopId;
    const qty = Math.max(0, Math.round(Number(row.qty) || 0));
    const key = norm(row.barcode);
    const match = byBarcode.get(key);

    if (match) {
      // Same barcode: same global product in another shop -> merge stock.
      match.stock[branch] = (match.stock[branch] ?? 0) + qty;
      notes.push(`${row.name} merged into one product (${match.sku}) with per-shop stock`);
      continue;
    }

    let sku = row.sku;
    if (bySku.has(norm(sku))) {
      sku = nextSku(products, row.name);
      notes.push(`Duplicate SKU ${row.sku} on "${row.name}" renamed to ${sku}`);
    }

    const p: Product = {
      name: row.name,
      sku,
      barcode: row.barcode,
      category: row.category,
      buy: row.buy,
      sell: row.sell,
      min: row.min,
      stock: qty ? { [branch]: qty } : {},
    };
    products.push(p);
    byBarcode.set(norm(p.barcode), p);
    bySku.set(norm(p.sku), p);
  }

  return { products, notes };
}

export function TotoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  // Mirrors the latest committed state so uniqueness checks and barcode
  // generation always read fresh data, even for back-to-back writes.
  const ref = useRef<State>(EMPTY);

  const commit = useCallback((updater: (prev: State) => State) => {
    const next = updater(ref.current);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        const { products, notes } = migrateProducts(
          (parsed.products ?? []) as LegacyProduct[],
        );
        const migrated: State = {
          ...EMPTY,
          ...parsed,
          products,
          settings: { ...defaultTaxSettings, ...(parsed.settings ?? {}) },
        };
        if (notes.length) {
          migrated.activities = [
            {
              title: "Product identities consolidated",
              desc: notes.slice(0, 6).join(" · "),
              time: `${today()} ${timeLabel()}`,
            },
            ...migrated.activities,
          ];
        }
        ref.current = migrated;
        setState(migrated);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const log =
    (title: string, desc: string) =>
    (prev: State): State => ({
      ...prev,
      activities: [{ title, desc, time: `${today()} ${timeLabel()}` }, ...prev.activities].slice(
        0,
        40,
      ),
    });

  const stockSummary = (stock: Partial<Record<ShopId, number>>) =>
    shopIds
      .filter((id) => (stock[id] ?? 0) > 0)
      .map((id) => `${branchLabel(id)} ${stock[id]}`)
      .join(", ") || "no stock yet";

  const nextBarcode = useCallback(() => nextInternalBarcode(ref.current.products), []);
  const suggestSku = useCallback((name: string) => nextSku(ref.current.products, name), []);

  const saveProduct = useCallback(
    (input: ProductInput, editingSku: string | null): SaveResult => {
      const name = input.name.trim();
      if (!name) return { ok: false, error: "Product name is required." };

      const others = ref.current.products.filter((p) => p.sku !== editingSku);

      const sku = input.sku.trim() || nextSku(ref.current.products, name);
      if (others.some((p) => norm(p.sku) === norm(sku))) {
        const owner = others.find((p) => norm(p.sku) === norm(sku))!;
        return { ok: false, error: `This SKU is already assigned to ${owner.name}.` };
      }

      let barcode = input.barcode.trim();
      if (!barcode) {
        barcode = nextInternalBarcode(ref.current.products);
      } else if (others.some((p) => norm(p.barcode) === norm(barcode))) {
        return { ok: false, error: "This barcode is already assigned to another product." };
      }
      // Final safety net: if the generated value collided, take the next free one.
      while (others.some((p) => norm(p.barcode) === norm(barcode))) {
        barcode = nextInternalBarcode([...others, { ...EMPTY.products[0]! }].filter(Boolean));
      }

      const product: Product = {
        name,
        sku,
        barcode,
        category: input.category.trim() || "General",
        buy: Number(input.buy) || 0,
        sell: Number(input.sell) || 0,
        min: Math.max(0, Number(input.min) || 0),
        stock: cleanStock(input.stock),
      };

      commit((prev) =>
        log(
          editingSku ? "Product updated" : "Product added",
          `${product.name} · ${product.sku} · ${product.barcode} · ${stockSummary(product.stock)}`,
        )({
          ...prev,
          products: editingSku
            ? prev.products.map((p) => (p.sku === editingSku ? product : p))
            : [...prev.products, product],
        }),
      );

      return { ok: true, product };
    },
    [commit],
  );

  const addProduct = useCallback(
    (input: ProductInput) => saveProduct(input, null),
    [saveProduct],
  );
  const updateProduct = useCallback(
    (sku: string, input: ProductInput) => saveProduct(input, sku),
    [saveProduct],
  );

  const removeProduct = useCallback(
    (sku: string) => {
      commit((prev) => {
        const target = prev.products.find((p) => p.sku === sku);
        return log(
          "Product removed",
          `${target?.name ?? sku} deleted from inventory`,
        )({ ...prev, products: prev.products.filter((p) => p.sku !== sku) });
      });
    },
    [commit],
  );

  const adjustStock = useCallback(
    (sku: string, branch: ShopId, delta: number, reason: string) => {
      commit((prev) => {
        const target = prev.products.find((p) => p.sku === sku);
        if (!target) return prev;
        const products = prev.products.map((p) =>
          p.sku === sku
            ? { ...p, stock: { ...p.stock, [branch]: Math.max(0, (p.stock[branch] ?? 0) + delta) } }
            : p,
        );
        return log(
          "Stock adjusted",
          `${target.name} · ${branchLabel(branch)} ${delta > 0 ? "+" : ""}${delta} · ${reason}`,
        )({ ...prev, products });
      });
    },
    [commit],
  );

  const findByCode = useCallback(
    (code: string, branch: BranchId) => {
      const q = norm(code);
      if (!q) return undefined;
      const match = state.products.find((p) => norm(p.barcode) === q || norm(p.sku) === q);
      if (!match) return undefined;
      return branch === "all" || stockOf(match, branch) >= 0 ? match : undefined;
    },
    [state.products],
  );

  const recordSale = useCallback<Ctx["recordSale"]>(
    (input) => {
      const total = input.lines.reduce((s, l) => s + l.sell * l.qty, 0);
      const cost = input.lines.reduce((s, l) => s + l.buy * l.qty, 0);
      const branch: ShopId = input.branch === "all" ? "toto" : input.branch;
      const sale: Sale = {
        id: `${Date.now()}`,
        receipt: ref.current.receipt,
        date: today(),
        branch,
        cashier: input.cashier,
        payment: input.payment,
        lines: input.lines,
        total,
        cost,
        vat: vatOf(total, ref.current.settings),
      };
      commit((prev) => {
        const products = prev.products.map((p) => {
          const line = input.lines.find((l) => l.sku === p.sku);
          return line
            ? { ...p, stock: { ...p.stock, [branch]: Math.max(0, (p.stock[branch] ?? 0) - line.qty) } }
            : p;
        });
        return log(
          `Sale #${String(sale.receipt).padStart(4, "0")}`,
          `${branchLabel(branch)} · ${input.cashier} · ${input.payment} · TZS ${total.toLocaleString("en-US")}`,
        )({ ...prev, products, sales: [sale, ...prev.sales], receipt: prev.receipt + 1 });
      });
      return sale;
    },
    [commit],
  );

  const recordReturn = useCallback<Ctx["recordReturn"]>(
    (input) => {
      const sale = ref.current.sales.find((s) => s.id === input.saleId);
      if (!sale) return undefined;
      const lines = input.lines.filter((l) => l.qty > 0);
      if (!lines.length) return undefined;
      const total = lines.reduce((s, l) => s + l.sell * l.qty, 0);
      const cost = lines.reduce((s, l) => s + l.buy * l.qty, 0);
      const branch: ShopId = sale.branch === "all" ? "toto" : sale.branch;
      const entry: SaleReturn = {
        id: `r${Date.now()}`,
        saleId: sale.id,
        receipt: sale.receipt,
        creditNote: ref.current.creditNote,
        date: today(),
        branch,
        cashier: input.cashier,
        reason: input.reason,
        lines,
        total,
        cost,
        vat: vatOf(total, ref.current.settings),
        restock: input.restock,
      };
      const returnedQty = lines.reduce((s, l) => s + l.qty, 0);
      commit((prev) => {
        const products = input.restock
          ? prev.products.map((p) => {
              const line = lines.find((l) => l.sku === p.sku);
              return line
                ? { ...p, stock: { ...p.stock, [branch]: (p.stock[branch] ?? 0) + line.qty } }
                : p;
            })
          : prev.products;
        const sales = prev.sales.map((s) =>
          s.id === sale.id ? { ...s, returned: (s.returned ?? 0) + returnedQty } : s,
        );
        return log(
          `Return CN-${String(entry.creditNote).padStart(4, "0")}`,
          `Receipt #${String(sale.receipt).padStart(4, "0")} · ${branchLabel(branch)} · ${returnedQty} item(s) · TZS ${total.toLocaleString("en-US")}${input.restock ? " · restocked" : " · not restocked"}`,
        )({
          ...prev,
          products,
          sales,
          returns: [entry, ...prev.returns],
          creditNote: prev.creditNote + 1,
        });
      });
      return entry;
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<TaxSettings>) => {
      commit((prev) =>
        log(
          "Tax settings updated",
          "VAT / EFD receipt details changed",
        )({ ...prev, settings: { ...prev.settings, ...patch } }),
      );
    },
    [commit],
  );

  const addExpense = useCallback(
    (e: Expense) => {
      commit((prev) =>
        log(
          "Expense recorded",
          `${e.category} · ${e.branch} · TZS ${e.amount.toLocaleString("en-US")}`,
        )({ ...prev, expenses: [e, ...prev.expenses] }),
      );
    },
    [commit],
  );

  const removeExpense = useCallback(
    (index: number) => {
      commit((prev) => ({ ...prev, expenses: prev.expenses.filter((_, i) => i !== index) }));
    },
    [commit],
  );

  const addStaff = useCallback(
    (s: Staff) => {
      commit((prev) =>
        log("User added", `${s.name} · ${s.role} · ${s.branch}`)({
          ...prev,
          staff: [...prev.staff, s],
        }),
      );
    },
    [commit],
  );

  const removeStaff = useCallback(
    (name: string) => {
      commit((prev) => ({ ...prev, staff: prev.staff.filter((s) => s.name !== name) }));
    },
    [commit],
  );

  const resetAll = useCallback(() => commit(() => EMPTY), [commit]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      addProduct,
      updateProduct,
      removeProduct,
      adjustStock,
      findByCode,
      nextBarcode,
      suggestSku,
      recordSale,
      recordReturn,
      updateSettings,
      addExpense,
      removeExpense,
      addStaff,
      removeStaff,
      resetAll,
    }),
    [
      state,
      addProduct,
      updateProduct,
      removeProduct,
      adjustStock,
      findByCode,
      nextBarcode,
      suggestSku,
      recordSale,
      recordReturn,
      updateSettings,
      addExpense,
      removeExpense,
      addStaff,
      removeStaff,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useToto() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useToto must be used inside TotoStoreProvider");
  return ctx;
}
