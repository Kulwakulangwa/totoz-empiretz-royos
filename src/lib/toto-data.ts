export type ShopId = "toto" | "sunnozy-1" | "sunnozy-2" | "mimis" | "marc-urembo";
export type BranchId = ShopId | "all";

export const shopIds: ShopId[] = ["toto", "sunnozy-1", "sunnozy-2", "mimis", "marc-urembo"];

export const branches: { id: BranchId; name: string }[] = [
  { id: "toto", name: "Totoz Empire" },
  { id: "sunnozy-1", name: "Sunnozy-1" },
  { id: "sunnozy-2", name: "Sunnozy-2" },
  { id: "mimis", name: "Mimis" },
  { id: "marc-urembo", name: "Marc Urembo" },
];

export const branchLabel = (id: BranchId) => branches.find((b) => b.id === id)?.name ?? id;

// Colors
export const colors = {
  primary: "#5B3A96",
  primaryDeep: "#4C2E85",
  secondary: "#E93FA0",
  pinkLight: "#F7C6E0",
  accent: "#3ECFC0",
  tealLight: "#D7F5F0",
  lavenderLight: "#EDE9FB",
  pinkBg: "#FCE4F1",
  white: "#FFFFFF",
  offWhite: "#F7F7FA",
  textDark: "#2B2740",
  textMuted: "#8B889A",
  gradientMint: "#BDEDE6",
  gradientPink: "#E9AEDD",
  gradientDeepPurple: "#3B1E66",
};

// ✅ money formatter
export const money = (amount: number) => {
  return `TZS ${amount.toLocaleString("en-US")}`;
};

// ✅ Expense categories
export const expenseCategories = [
  "Rent",
  "Utilities",
  "Salaries",
  "Transport",
  "Marketing",
  "Supplies",
  "Maintenance",
  "Taxes",
  "Insurance",
  "Other",
];

// ✅ Reports configuration
export const reports = [
  { id: "sales", label: "Sales Report" },
  { id: "inventory", label: "Inventory Report" },
  { id: "expenses", label: "Expenses Report" },
  { id: "tax", label: "Tax Report" },
  { id: "profit", label: "Profit & Loss" },
];

export type Product = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  buy: number;
  sell: number;
  min: number;
  stock: Partial<Record<ShopId, number>>;
  imagePath?: string | null;
  imageUrl?: string | null;
};

export type Staff = {
  name: string;
  role: "owner" | "cashier";
  branch: BranchId;
  password?: string;
};

export type Expense = {
  id: string;
  date: string;
  branch: BranchId;
  category: string;
  description: string;
  amount: number;
  note?: string;
  created_by?: string;
};

export type Activity = {
  title: string;
  desc: string;
  time: string;
};

export type NavItem = {
  id: SectionId;
  label: string;
  ownerOnly: boolean;
  icon: string;
};

export type SectionId =
  | "overview"
  | "pos"
  | "returns"
  | "inventory"
  | "expenses"
  | "staff"
  | "reports"
  | "settings"
  | "vat";

export const navItems: NavItem[] = [
  { id: "overview", label: "Dashboard", ownerOnly: true, icon: "📊" },
  { id: "pos", label: "Point of Sale", ownerOnly: false, icon: "🛍️" },
  { id: "returns", label: "Returns", ownerOnly: false, icon: "🔄" },
  { id: "inventory", label: "Goods", ownerOnly: true, icon: "📦" },
  { id: "expenses", label: "Expenses", ownerOnly: true, icon: "💰" },
  { id: "staff", label: "Staff", ownerOnly: true, icon: "👥" },
  { id: "reports", label: "Reports", ownerOnly: true, icon: "📈" },
  { id: "vat", label: "VAT / EFD", ownerOnly: true, icon: "🧾" },
  { id: "settings", label: "Settings", ownerOnly: true, icon: "⚙️" },
];

export const INTERNAL_BARCODE_START = 1000000;

export const stockOf = (product: Product, branch: BranchId): number => {
  if (branch === "all") {
    return shopIds.reduce((sum, id) => sum + (product.stock[id] ?? 0), 0);
  }
  return product.stock[branch] ?? 0;
};

// ============================================
// BRANCH UUID MAPPING FOR SUPABASE
// ============================================

export const BRANCH_UUID_MAP: Record<string, string> = {
  toto: "b25dbe78-c9a9-432e-9117-2fb152267c61",
  "totoz-empire": "b25dbe78-c9a9-432e-9117-2fb152267c61",
  main: "b25dbe78-c9a9-432e-9117-2fb152267c61",
  "main-branch": "b25dbe78-c9a9-432e-9117-2fb152267c61",
  "sunnozy-1": "b25dbe78-c9a9-432e-9117-2fb152267c61",
  "sunnozy-2": "b25dbe78-c9a9-432e-9117-2fb152267c61",
  mimis: "b25dbe78-c9a9-432e-9117-2fb152267c61",
  "marc-urembo": "b25dbe78-c9a9-432e-9117-2fb152267c61",
};

export function getBranchUuid(branchId: string): string {
  return BRANCH_UUID_MAP[branchId] || BRANCH_UUID_MAP["toto"] || branchId;
}

export function getBranchIdFromUuid(uuid: string): ShopId {
  for (const [key, value] of Object.entries(BRANCH_UUID_MAP)) {
    if (value === uuid) {
      if (shopIds.includes(key as ShopId)) {
        return key as ShopId;
      }
    }
  }
  return "toto";
}

export function getAllBranchUuids(): string[] {
  return Object.values(BRANCH_UUID_MAP);
}

export function getBranchNameFromUuid(uuid: string): string {
  for (const [key, value] of Object.entries(BRANCH_UUID_MAP)) {
    if (value === uuid) {
      const branch = branches.find((b) => b.id === key);
      return branch?.name || key;
    }
  }
  return "Unknown";
}

export function getBranchIdFromName(name: string): ShopId {
  const branch = branches.find((b) => b.name.toLowerCase() === name.toLowerCase());
  return branch?.id || "toto";
}
