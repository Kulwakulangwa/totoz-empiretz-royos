export type ShopId = string;
export type BranchId = string;

export const shopIds: ShopId[] = ["toto", "sunnozy-1", "sunnozy-2", "mimis", "marc-urembo"];

// All branches: 5 shops + 3 warehouses
export const branches: { id: BranchId | string; name: string; type: BranchType }[] = [
  // Shops
  { id: "toto", name: "Totoz Empire", type: "shop" },
  { id: "sunnozy-1", name: "Sunnozy-1", type: "shop" },
  { id: "sunnozy-2", name: "Sunnozy-2", type: "shop" },
  { id: "mimis", name: "Mimis", type: "shop" },
  { id: "marc-urembo", name: "Marc Urembo", type: "shop" },
  // Warehouses
  { id: "warehouse-1", name: "Warehouse 1", type: "warehouse" },
  { id: "warehouse-2", name: "Warehouse 2", type: "warehouse" },
  { id: "warehouse-3", name: "Warehouse 3", type: "warehouse" },
];

const dynamicBranchLabels = new Map<string, string>();
export const registerBranchLabels = (items: Array<{ id: string; name: string }>) => {
  items.forEach((item) => dynamicBranchLabels.set(item.id, item.name));
};
export const branchLabel = (id: BranchId) =>
  dynamicBranchLabels.get(id) ?? branches.find((b) => b.id === id)?.name ?? id;

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

export const money = (amount: number) => `TZS ${amount.toLocaleString("en-US")}`;

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

export const reports = [
  { id: "sales", label: "Sales Report" },
  { id: "inventory", label: "Inventory Report" },
  { id: "expenses", label: "Expenses Report" },
  { id: "tax", label: "Tax Report" },
  { id: "profit", label: "Profit & Loss" },
];

export type Product = {
  id?: string;
  branch: ShopId;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  buy: number;
  sell: number;
  min: number;
  stock: Partial<Record<string, number>>; // stock per branch (shop or warehouse)
  imagePath?: string | null;
  imageUrl?: string | null;
};

export type Staff = {
  name: string;
  role: "owner" | "manager" | "cashier";
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
  | "sales"
  | "returns"
  | "inventory"
  | "stocking"
  | "expenses"
  | "staff"
  | "reports"
  | "settings";

export const navItems: NavItem[] = [
  { id: "overview", label: "Dashboard", ownerOnly: true, icon: "📊" },
  { id: "pos", label: "Point of Sale", ownerOnly: false, icon: "🛍️" },
  { id: "sales", label: "Sales", ownerOnly: false, icon: "📋" },
  { id: "returns", label: "Returns", ownerOnly: false, icon: "🔄" },
  { id: "inventory", label: "Goods", ownerOnly: true, icon: "📦" },
  { id: "stocking", label: "Stocking", ownerOnly: true, icon: "🚚" },
  { id: "expenses", label: "Expenses", ownerOnly: true, icon: "💰" },
  { id: "staff", label: "Staff", ownerOnly: true, icon: "👥" },
  { id: "reports", label: "Reports", ownerOnly: true, icon: "📈" },
  { id: "settings", label: "Settings", ownerOnly: true, icon: "⚙️" },
];

export const INTERNAL_BARCODE_START = 1000000;

export const stockOf = (product: Product, branch: string): number => {
  if (branch === "all") {
    // Sum stock across all branches (both shops and warehouses)
    const ids = branches.map((b) => b.id);
    return ids.reduce((sum, id) => sum + (product.stock[id] ?? 0), 0);
  }
  return product.stock[branch] ?? 0;
};

// ============================================================
// UUIDs for all branches (shops + warehouses)
// ============================================================
export const BRANCH_UUID_MAP: Record<string, string> = {
  // Shops
  toto: "6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a",
  "totoz-empire": "6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a",
  "sunnozy-1": "a8d51c6d-7660-492d-8430-2243d48a59ef",
  "sunnozy-2": "d7280d3d-a2fd-41db-bd9d-c03d371d3d4d",
  mimis: "7f624cb1-f0d1-47d3-bcd5-a9ad3ecdfb92",
  "marc-urembo": "21967b1d-14d2-4d06-9d93-07bc7a2b153b",
  // Warehouses
  "warehouse-1": "33333333-3333-3333-3333-333333333331",
  "warehouse-2": "33333333-3333-3333-3333-333333333332",
  "warehouse-3": "33333333-3333-3333-3333-333333333333",
};

const looksLikeUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function getBranchUuid(branchId: string): string {
  if (!branchId) return BRANCH_UUID_MAP["toto"]!;
  const normalized = String(branchId).trim();
  if (looksLikeUuid(normalized)) return normalized;

  const direct = Object.entries(BRANCH_UUID_MAP).find(
    ([key]) => key.toLowerCase() === normalized.toLowerCase(),
  );
  if (direct) return direct[1];

  const alias = Object.entries(BRANCH_UUID_MAP).find(
    ([key]) => key.toLowerCase() === normalized.toLowerCase().replace(/\s+/g, "-"),
  );
  if (alias) return alias[1];

  return BRANCH_UUID_MAP[normalized] || BRANCH_UUID_MAP["toto"] || normalized;
}

export function getBranchIdFromUuid(uuid: string): string {
  if (!uuid) return "toto";
  const normalized = String(uuid).trim();

  if (normalized && !looksLikeUuid(normalized)) {
    const direct = Object.entries(BRANCH_UUID_MAP).find(
      ([key]) => key.toLowerCase() === normalized.toLowerCase(),
    );
    if (direct && branches.some((b) => b.id === direct[0])) return direct[0];
    return "toto";
  }

  const match = Object.entries(BRANCH_UUID_MAP).find(
    ([, value]) => value.toLowerCase() === normalized.toLowerCase(),
  );
  if (match && branches.some((b) => b.id === match[0])) {
    return match[0];
  }

  const byName = branches.find((branch) => getBranchUuid(branch.id) === normalized);
  if (byName) return byName.id as string;

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

export function getBranchIdFromName(name: string): string {
  const branch = branches.find((b) => b.name.toLowerCase() === name.toLowerCase());
  return branch?.id || "toto";
}
