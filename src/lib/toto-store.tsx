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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { compressProductImage } from "@/lib/product-images";
import {
  branches,
  shopIds,
  stockOf,
  INTERNAL_BARCODE_START,
  getBranchUuid,
  getBranchIdFromUuid,
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
  businessName: "Totoz Empire",
  address: "Dar es Salaam, Tanzania",
  phone: "",
  tin: "",
  vrn: "",
  efdSerial: "",
  vatEnabled: true,
  vatRate: 18,
  receiptFooter: "Thank you for shopping with Totoz Empire",
};

export const vatOf = (gross: number, settings: TaxSettings) =>
  settings.vatEnabled && settings.vatRate > 0
    ? Math.round(gross - gross / (1 + settings.vatRate / 100))
    : 0;

export type ProductInput = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  buy: number;
  sell: number;
  min: number;
  stock: Partial<Record<ShopId, number>>;
  imageFile?: File | null;
  removeImage?: boolean;
};

export type SaveResult = { ok: true; product: Product } | { ok: false; error: string };

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

type Ctx = State & {
  addProduct: (input: ProductInput, branchOverride?: ShopId) => Promise<SaveResult>;
  updateProduct: (sku: string, input: ProductInput, branchOverride?: ShopId) => Promise<SaveResult>;
  removeProduct: (sku: string, branchOverride?: ShopId) => Promise<void>;
  adjustStock: (sku: string, branch: ShopId, delta: number, reason: string) => Promise<void>;
  findByCode: (code: string, branch: BranchId) => Product | undefined;
  nextBarcode: () => string;
  suggestSku: (name: string) => string;
  recordSale: (input: {
    branch: BranchId;
    cashier: string;
    payment: "Cash" | "Lipa Namba";
    lines: SaleLine[];
  }) => Promise<Sale>;
  recordReturn: (input: {
    saleId: string;
    cashier: string;
    reason: string;
    restock: boolean;
    lines: SaleLine[];
  }) => Promise<SaleReturn | undefined>;
  updateSettings: (patch: Partial<TaxSettings>) => Promise<void>;
  addExpense: (e: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  addStaff: (s: Staff) => Promise<void>;
  removeStaff: (name: string) => Promise<void>;
  resetAll: () => void;
  refreshData: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

const StoreContext = createContext<Ctx | null>(null);

const today = () => new Date().toISOString().slice(0, 10);
const timeLabel = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const branchLabel = (id: BranchId) => branches.find((b) => b.id === id)?.name ?? id;
const PRODUCT_IMAGE_BUCKET = "product-images";

const norm = (v: string) => v.trim().toLowerCase();

async function productImageUrl(path?: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.error("Error signing product image URL:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

function imagePathForProduct(sku: string, branch: ShopId) {
  const safeSku = sku
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return `${getBranchUuid(branch)}/${safeSku || "product"}/${Date.now()}.webp`;
}

async function uploadProductImage(sku: string, branch: ShopId, file?: File | null) {
  if (!file) return null;

  const image = await compressProductImage(file);
  const path = imagePathForProduct(sku, branch);
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, image.blob, {
    cacheControl: "31536000",
    contentType: "image/webp",
    upsert: true,
  });

  if (error) throw error;
  return path;
}

async function removeProductImage(path?: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  if (error) {
    console.error("Error removing product image:", error);
  }
}

function nextInternalBarcode(products: Product[]): string {
  const used = new Set(products.map((p) => p.barcode));
  let candidate = INTERNAL_BARCODE_START;
  for (const p of products) {
    const n = Number(p.barcode);
    if (Number.isSafeInteger(n) && n >= INTERNAL_BARCODE_START && n >= candidate) {
      candidate = n + 1;
    }
  }
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

const productBranch = (product: Product): ShopId =>
  product.branch ?? (Object.keys(product.stock)[0] as ShopId | undefined) ?? "toto";

export function TotoStoreProvider({ children }: { children: ReactNode }) {
  const { user, role, staffProfile } = useAuth();
  const [state, setState] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<State>(EMPTY);

  useEffect(() => {
    ref.current = state;
  }, [state]);

  const commit = useCallback((updater: (prev: State) => State) => {
    const next = updater(ref.current);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const log = (title: string, desc: string) => (prev: State): State => ({
    ...prev,
    activities: [{ title, desc, time: `${today()} ${timeLabel()}` }, ...prev.activities].slice(0, 40),
  });

  const refreshData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isOwner = role === "owner";
      const userBranch = staffProfile?.branch_id;
      const userBranchUuid = userBranch ? getBranchUuid(userBranch) : null;

      let productsQuery = supabase.from('products').select('*');
      if (!isOwner && userBranchUuid) {
        productsQuery = productsQuery.eq('branch_id', userBranchUuid);
      }

      const { data: productsData, error: productsError } = await productsQuery;
      if (productsError) throw productsError;

      const mappedProducts: Product[] = await Promise.all((productsData || []).map(async (p) => {
        const branch = getBranchIdFromUuid(p.branch_id);
        return {
          branch,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          category: p.category || 'General',
          buy: Number(p.buying_price) || 0,
          sell: Number(p.selling_price) || 0,
          min: Number(p.min_stock) || 5,
          stock: { [branch]: Number(p.quantity) || 0 } as Partial<Record<ShopId, number>>,
          imagePath: p.image_path || null,
          imageUrl: await productImageUrl(p.image_path || null),
        };
      }));

      let salesQuery = supabase
        .from('sales')
        .select(`
          *,
          sale_items(*)
        `);

      if (!isOwner && userBranchUuid) {
        salesQuery = salesQuery.eq('branch_id', userBranchUuid);
      }

      const { data: salesData, error: salesError } = await salesQuery.order('created_at', { ascending: false });
      if (salesError) throw salesError;

      const mappedSales: Sale[] = (salesData || []).map(s => {
        const items = s.sale_items || [];
        const lines: SaleLine[] = items.map((item: any) => ({
          sku: item.sku || '',
          name: item.product_name,
          qty: item.quantity || 0,
          sell: Number(item.unit_price) || 0,
          buy: Number(item.unit_price) * 0.7 || 0,
        }));

        return {
          id: s.id,
          receipt: parseInt(s.receipt_number?.replace('REC-', '') || '1'),
          date: s.created_at?.split('T')[0] || today(),
          branch: getBranchIdFromUuid(s.branch_id),
          cashier: s.cashier_id || 'Unknown',
          payment: (s.payment_method as "Cash" | "Lipa Namba") || 'Cash',
          lines,
          total: Number(s.total) || 0,
          cost: Number(s.subtotal) || 0,
          vat: Number(s.tax) || 0,
        };
      });

      let expensesQuery = supabase.from('expenses').select('*');
      if (!isOwner && userBranchUuid) {
        expensesQuery = expensesQuery.eq('branch_id', userBranchUuid);
      }

      const { data: expensesData, error: expensesError } = await expensesQuery.order('expense_date', { ascending: false });
      if (expensesError) throw expensesError;

      const mappedExpenses: Expense[] = (expensesData || []).map(e => ({
        id: e.id,
        date: e.expense_date || today(),
        branch: getBranchIdFromUuid(e.branch_id),
        category: e.category,
        description: e.description || '',
        amount: Number(e.amount) || 0,
        note: e.description || '',
        created_by: e.created_by || undefined,
      }));

      const newState: State = {
        ...EMPTY,
        products: mappedProducts,
        sales: mappedSales,
        expenses: mappedExpenses,
        returns: [],
        staff: [],
        activities: [],
        receipt: mappedSales.length > 0 ? Math.max(...mappedSales.map(s => s.receipt)) + 1 : 1,
        creditNote: 1,
        settings: defaultTaxSettings,
      };

      ref.current = newState;
      setState(newState);
      setLoading(false);
      setError(null);

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [user, role, staffProfile]);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setState(EMPTY);
      setLoading(false);
    }
  }, [user, refreshData]);

  const nextBarcode = useCallback(() => nextInternalBarcode(ref.current.products), []);
  const suggestSku = useCallback((name: string) => nextSku(ref.current.products, name), []);

  const findByCode = useCallback((code: string, branch: BranchId) => {
    const q = norm(code);
    if (!q) return undefined;
    return state.products.find(
      (p) =>
        (branch === "all" || productBranch(p) === branch) &&
        (norm(p.barcode) === q || norm(p.sku) === q),
    );
  }, [state.products]);

  const addProduct = useCallback(async (
    input: ProductInput,
    branchOverride?: ShopId
  ): Promise<SaveResult> => {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Product name is required." };

    let branch: ShopId = branchOverride || 'toto';
    if (!branchOverride) {
      const keys = Object.keys(input.stock) as ShopId[];
      if (keys.length > 0) branch = keys[0];
    }

    const others = ref.current.products.filter((p) => productBranch(p) === branch);

    const sku = input.sku.trim() || nextSku(others, name);
    if (others.some((p) => norm(p.sku) === norm(sku))) {
      return { ok: false, error: "This SKU is already assigned to another product." };
    }

    let barcode = input.barcode.trim();
    if (!barcode) {
      barcode = nextInternalBarcode(ref.current.products);
    } else if (others.some((p) => norm(p.barcode) === norm(barcode))) {
      return { ok: false, error: "This barcode is already assigned to another product." };
    }

    const quantity = input.stock[branch] || 0;
    let imagePath: string | null = null;

    try {
      if (input.imageFile) {
        imagePath = await uploadProductImage(sku, branch, input.imageFile);
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          name,
          sku,
          barcode,
          category: input.category.trim() || 'General',
          buying_price: Number(input.buy) || 0,
          selling_price: Number(input.sell) || 0,
          min_stock: Math.max(0, Number(input.min) || 0),
          branch_id: getBranchUuid(branch),
          quantity: quantity,
          unit: 'pcs',
          is_active: true,
          image_path: imagePath,
        })
        .select()
        .single();

      if (error) throw error;

      const product: Product = {
        branch,
        name,
        sku,
        barcode,
        category: input.category.trim() || 'General',
        buy: Number(input.buy) || 0,
        sell: Number(input.sell) || 0,
        min: Math.max(0, Number(input.min) || 0),
        stock: { [branch]: quantity } as Partial<Record<ShopId, number>>,
        imagePath,
        imageUrl: await productImageUrl(imagePath),
      };

      commit(log("Product added", `${product.name} · ${product.sku} · ${product.barcode}`));
      await refreshData();
      return { ok: true, product };
    } catch (err: any) {
      if (imagePath) await removeProductImage(imagePath);
      console.error('Error adding product:', err);
      return { ok: false, error: err.message };
    }
  }, [commit, refreshData]);

  const updateProduct = useCallback(async (
    sku: string,
    input: ProductInput,
    branchOverride?: ShopId
  ): Promise<SaveResult> => {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Product name is required." };
    const lookupBranch = branchOverride || "toto";
    const oldProduct = ref.current.products.find((p) => p.sku === sku && productBranch(p) === lookupBranch);
    let nextImagePath = oldProduct?.imagePath ?? null;
    let uploadedImagePath: string | null = null;

    let newBranch = branchOverride;
    if (!newBranch) {
      const keys = Object.keys(input.stock) as ShopId[];
      if (keys.length > 0) newBranch = keys[0];
    }

    try {
      if (input.imageFile) {
        uploadedImagePath = await uploadProductImage(sku, newBranch || lookupBranch, input.imageFile);
        nextImagePath = uploadedImagePath;
      } else if (input.removeImage) {
        nextImagePath = null;
      }

      const updateData: any = {
        name,
        category: input.category.trim() || 'General',
        buying_price: Number(input.buy) || 0,
        selling_price: Number(input.sell) || 0,
        min_stock: Math.max(0, Number(input.min) || 0),
        image_path: nextImagePath,
      };
      if (newBranch && oldProduct) {
        const currentBranchId = getBranchUuid(productBranch(oldProduct));
        if (getBranchUuid(newBranch) !== currentBranchId) {
          updateData.branch_id = getBranchUuid(newBranch);
        }
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('sku', sku)
        .eq('branch_id', getBranchUuid(lookupBranch));

      if (error) throw error;

      if ((input.imageFile || input.removeImage) && oldProduct?.imagePath && oldProduct.imagePath !== nextImagePath) {
        await removeProductImage(oldProduct.imagePath);
      }

      commit(log("Product updated", `${name} · ${sku}`));
      await refreshData();
      const product = ref.current.products.find(p => p.sku === sku && productBranch(p) === lookupBranch);
      return { ok: true, product: product! };
    } catch (err: any) {
      if (uploadedImagePath) await removeProductImage(uploadedImagePath);
      console.error('Error updating product:', err);
      return { ok: false, error: err.message };
    }
  }, [commit, refreshData]);

  const removeProduct = useCallback(async (sku: string, branchOverride?: ShopId) => {
    try {
      const branch = branchOverride || "toto";
      const product = ref.current.products.find((p) => p.sku === sku && productBranch(p) === branch);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('sku', sku)
        .eq('branch_id', getBranchUuid(branch));

      if (error) throw error;
      await removeProductImage(product?.imagePath);
      commit(log("Product removed", `${sku} deleted from inventory`));
      await refreshData();
    } catch (err: any) {
      console.error('Error removing product:', err);
    }
  }, [commit, refreshData]);

  const adjustStock = useCallback(async (sku: string, branch: ShopId, delta: number, reason: string) => {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('quantity, branch_id')
        .eq('sku', sku)
        .eq('branch_id', getBranchUuid(branch))
        .single();

      if (!product) return;

      const newQuantity = Math.max(0, (product.quantity || 0) + delta);

      const { error } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('sku', sku)
        .eq('branch_id', getBranchUuid(branch));

      if (error) throw error;

      commit(log("Stock adjusted", `${sku} · ${branch} ${delta > 0 ? '+' : ''}${delta} · ${reason}`));
      await refreshData();
    } catch (err: any) {
      console.error('Error adjusting stock:', err);
    }
  }, [commit, refreshData]);

  const recordSale = useCallback(async (input: {
    branch: BranchId;
    cashier: string;
    payment: "Cash" | "Lipa Namba";
    lines: SaleLine[];
  }): Promise<Sale> => {
    const total = input.lines.reduce((s, l) => s + l.sell * l.qty, 0);
    const cost = input.lines.reduce((s, l) => s + l.buy * l.qty, 0);
    const branch: ShopId = input.branch === "all" ? "toto" : input.branch;
    const receiptNumber = ref.current.receipt;
    const cashierId = staffProfile?.id || user?.id || null;
    const paymentMethod = input.payment.toLowerCase() as "cash" | "lipa_namba";

    try {
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          receipt_number: `REC-${receiptNumber}`,
          branch_id: getBranchUuid(branch),
          cashier_id: cashierId,
          payment_method: paymentMethod,
          total: total,
          subtotal: total,
          tax: 0,
          payment_status: 'completed',
        })
        .select()
        .single();

      if (saleError) {
        console.error('Sale insert error:', saleError);
        throw saleError;
      }

      for (const line of input.lines) {
        const { error: itemError } = await supabase
          .from('sale_items')
          .insert({
            sale_id: saleData.id,
            product_name: line.name,
            sku: line.sku,
            quantity: line.qty,
            unit_price: line.sell,
            total_price: line.sell * line.qty,
          });

        if (itemError) {
          console.error('Sale item insert error:', itemError);
          throw itemError;
        }

        const { error: updateError } = await supabase.rpc('decrement_product_quantity_by_sku', {
          product_sku: line.sku,
          product_branch_id: getBranchUuid(branch),
          quantity_to_decrement: line.qty,
        });

        if (updateError) {
          console.error('Inventory update error:', updateError);
        }
      }

      const sale: Sale = {
        id: saleData.id,
        receipt: receiptNumber,
        date: today(),
        branch,
        cashier: input.cashier,
        payment: input.payment,
        lines: input.lines,
        total,
        cost,
        vat: vatOf(total, ref.current.settings),
      };

      commit((prev) => log(
        `Sale #${String(sale.receipt).padStart(4, "0")}`,
        `${branchLabel(branch)} · ${input.cashier} · ${input.payment} · TZS ${total.toLocaleString("en-US")}`,
      )({
        ...prev,
        sales: [sale, ...prev.sales],
        receipt: prev.receipt + 1,
      }));

      await refreshData();
      return sale;
    } catch (err: any) {
      console.error('Error recording sale:', err);
      throw err;
    }
  }, [commit, refreshData, staffProfile, user]);

  const recordReturn = useCallback(async (input: {
    saleId: string;
    cashier: string;
    reason: string;
    restock: boolean;
    lines: SaleLine[];
  }): Promise<SaleReturn | undefined> => {
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

    if (input.restock) {
      for (const line of lines) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('sku', line.sku)
          .eq('branch_id', getBranchUuid(branch))
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ quantity: (product.quantity || 0) + line.qty })
            .eq('sku', line.sku)
            .eq('branch_id', getBranchUuid(branch));
        }
      }
    }

    commit(log(
      `Return CN-${String(entry.creditNote).padStart(4, "0")}`,
      `Receipt #${String(sale.receipt).padStart(4, "0")} · ${branchLabel(branch)} · ${lines.reduce((s, l) => s + l.qty, 0)} item(s) · TZS ${total.toLocaleString("en-US")}`,
    )({
      ...prev,
      returns: [entry, ...prev.returns],
      creditNote: prev.creditNote + 1,
    }));

    await refreshData();
    return entry;
  }, [commit, refreshData]);

  const addExpense = useCallback(async (e: Expense) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          branch_id: getBranchUuid(e.branch),
          category: e.category,
          description: e.description,
          amount: e.amount,
          expense_date: e.date || today(),
          created_by: e.created_by || null,
        });

      if (error) throw error;

      commit(log("Expense recorded", `${e.category} · ${e.branch} · TZS ${e.amount.toLocaleString("en-US")}`));
      await refreshData();
    } catch (err: any) {
      console.error('Error adding expense:', err);
    }
  }, [commit, refreshData]);

  const removeExpense = useCallback(async (id: string) => {
    try {
      await supabase.from('expenses').delete().eq('id', id);
      commit((prev) => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
      await refreshData();
    } catch (err) {
      console.error('Error removing expense:', err);
    }
  }, [commit, refreshData]);

  const addStaff = useCallback(async (_s: Staff) => {
    return;
  }, []);

  const removeStaff = useCallback(async (_name: string) => {
    return;
  }, []);

  const updateSettings = useCallback(async (patch: Partial<TaxSettings>) => {
    commit((prev) => log("Tax settings updated", "VAT / EFD receipt details changed")({
      ...prev,
      settings: { ...prev.settings, ...patch }
    }));
  }, [commit]);

  const resetAll = useCallback(() => {
    commit(() => ({ ...EMPTY }));
  }, [commit]);

  const value = useMemo<Ctx>(() => ({
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
    refreshData,
    loading,
    error,
  }), [
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
    refreshData,
    loading,
    error,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useToto() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useToto must be used inside TotoStoreProvider");
  return ctx;
}

export { StoreContext };
