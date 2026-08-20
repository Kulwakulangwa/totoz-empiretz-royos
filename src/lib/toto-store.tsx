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
  addProduct: (input: ProductInput) => Promise<SaveResult>;
  updateProduct: (sku: string, input: ProductInput) => Promise<SaveResult>;
  removeProduct: (sku: string) => Promise<void>;
  adjustStock: (sku: string, branch: ShopId, delta: number, reason: string) => Promise<void>;
  findByCode: (code: string, branch: BranchId) => Product | undefined;
  nextBarcode: () => string;
  suggestSku: (name: string) => string;
  recordSale: (input: {
   
