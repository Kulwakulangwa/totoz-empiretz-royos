import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  branches,
  type Activity,
  type BranchId,
  type Expense,
  type Product,
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
const KEY = "toto-empire-state-v1";

type Ctx = State & {
  addProduct: (p: Product) => void;
  updateProduct: (sku: string, patch: Partial<Product>) => void;
  removeProduct: (sku: string) => void;
  adjustStock: (sku: string, delta: number, reason: string) => void;
  findByCode: (code: string, branch: BranchId) => Product | undefined;
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

export function TotoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({
          ...EMPTY,
          ...parsed,
          settings: { ...defaultTaxSettings, ...(parsed.settings ?? {}) },
        });
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

  const addProduct = useCallback((p: Product) => {
    setState((prev) => {
      const next = log(
        "Product added",
        `${p.name} · ${p.branch} · ${p.qty} in stock`,
      )({
        ...prev,
        products: [...prev.products.filter((x) => x.sku !== p.sku), p],
      });
      return next;
    });
  }, []);

  const updateProduct = useCallback((sku: string, patch: Partial<Product>) => {
    setState((prev) => {
      const target = prev.products.find((p) => p.sku === sku);
      const products = prev.products.map((p) => (p.sku === sku ? { ...p, ...patch } : p));
      return log(
        "Product updated",
        `${target?.name ?? sku} details changed`,
      )({ ...prev, products });
    });
  }, []);

  const removeProduct = useCallback((sku: string) => {
    setState((prev) => {
      const target = prev.products.find((p) => p.sku === sku);
      return log(
        "Product removed",
        `${target?.name ?? sku} deleted from inventory`,
      )({
        ...prev,
        products: prev.products.filter((p) => p.sku !== sku),
      });
    });
  }, []);

  const adjustStock = useCallback((sku: string, delta: number, reason: string) => {
    setState((prev) => {
      const target = prev.products.find((p) => p.sku === sku);
      if (!target) return prev;
      const products = prev.products.map((p) =>
        p.sku === sku ? { ...p, qty: Math.max(0, p.qty + delta) } : p,
      );
      return log(
        "Stock adjusted",
        `${target.name} ${delta > 0 ? "+" : ""}${delta} · ${reason}`,
      )({ ...prev, products });
    });
  }, []);

  const findByCode = useCallback(
    (code: string, branch: BranchId) => {
      const q = code.trim().toLowerCase();
      if (!q) return undefined;
      return state.products.find(
        (p) =>
          (branch === "all" || p.branch === branch) &&
          (p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q),
      );
    },
    [state.products],
  );

  const recordSale = useCallback<Ctx["recordSale"]>(
    (input) => {
      const total = input.lines.reduce((s, l) => s + l.sell * l.qty, 0);
      const cost = input.lines.reduce((s, l) => s + l.buy * l.qty, 0);
      const sale: Sale = {
        id: `${Date.now()}`,
        receipt: state.receipt,
        date: today(),
        branch: input.branch,
        cashier: input.cashier,
        payment: input.payment,
        lines: input.lines,
        total,
        cost,
        vat: vatOf(total, state.settings),
      };
      setState((prev) => {
        const products = prev.products.map((p) => {
          const line = input.lines.find((l) => l.sku === p.sku);
          return line ? { ...p, qty: Math.max(0, p.qty - line.qty) } : p;
        });
        return log(
          `Sale #${String(sale.receipt).padStart(4, "0")}`,
          `${branchLabel(input.branch)} · ${input.cashier} · ${input.payment} · TZS ${total.toLocaleString("en-US")}`,
        )({ ...prev, products, sales: [sale, ...prev.sales], receipt: prev.receipt + 1 });
      });
      return sale;
    },
    [state.receipt, state.settings],
  );

  const recordReturn = useCallback<Ctx["recordReturn"]>(
    (input) => {
      const sale = state.sales.find((s) => s.id === input.saleId);
      if (!sale) return undefined;
      const lines = input.lines.filter((l) => l.qty > 0);
      if (!lines.length) return undefined;
      const total = lines.reduce((s, l) => s + l.sell * l.qty, 0);
      const cost = lines.reduce((s, l) => s + l.buy * l.qty, 0);
      const entry: SaleReturn = {
        id: `r${Date.now()}`,
        saleId: sale.id,
        receipt: sale.receipt,
        creditNote: state.creditNote,
        date: today(),
        branch: sale.branch,
        cashier: input.cashier,
        reason: input.reason,
        lines,
        total,
        cost,
        vat: vatOf(total, state.settings),
        restock: input.restock,
      };
      const returnedQty = lines.reduce((s, l) => s + l.qty, 0);
      setState((prev) => {
        const products = input.restock
          ? prev.products.map((p) => {
              const line = lines.find((l) => l.sku === p.sku && sale.branch === p.branch);
              return line ? { ...p, qty: p.qty + line.qty } : p;
            })
          : prev.products;
        const sales = prev.sales.map((s) =>
          s.id === sale.id ? { ...s, returned: (s.returned ?? 0) + returnedQty } : s,
        );
        return log(
          `Return CN-${String(entry.creditNote).padStart(4, "0")}`,
          `Receipt #${String(sale.receipt).padStart(4, "0")} · ${branchLabel(sale.branch)} · ${returnedQty} item(s) · TZS ${total.toLocaleString("en-US")}${input.restock ? " · restocked" : " · not restocked"}`,
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
    [state.sales, state.creditNote, state.settings],
  );

  const updateSettings = useCallback((patch: Partial<TaxSettings>) => {
    setState((prev) =>
      log(
        "Tax settings updated",
        "VAT / EFD receipt details changed",
      )({ ...prev, settings: { ...prev.settings, ...patch } }),
    );
  }, []);

  const addExpense = useCallback((e: Expense) => {
    setState((prev) =>
      log(
        "Expense recorded",
        `${e.category} · ${e.branch} · TZS ${e.amount.toLocaleString("en-US")}`,
      )({
        ...prev,
        expenses: [e, ...prev.expenses],
      }),
    );
  }, []);

  const removeExpense = useCallback((index: number) => {
    setState((prev) => ({ ...prev, expenses: prev.expenses.filter((_, i) => i !== index) }));
  }, []);

  const addStaff = useCallback((s: Staff) => {
    setState((prev) =>
      log(
        "User added",
        `${s.name} · ${s.role} · ${s.branch}`,
      )({ ...prev, staff: [...prev.staff, s] }),
    );
  }, []);

  const removeStaff = useCallback((name: string) => {
    setState((prev) => ({ ...prev, staff: prev.staff.filter((s) => s.name !== name) }));
  }, []);

  const resetAll = useCallback(() => setState(EMPTY), []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      addProduct,
      updateProduct,
      removeProduct,
      adjustStock,
      findByCode,
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
