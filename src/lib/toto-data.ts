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
  | "sales"        // ✅ Replaced "vat"
  | "returns"
  | "inventory"
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
  { id: "expenses", label: "Expenses", ownerOnly: true, icon: "💰" },
  { id: "staff", label: "Staff", ownerOnly: true, icon: "👥" },
  { id: "reports", label: "Reports", ownerOnly: true, icon: "📈" },
  { id: "settings", label: "Settings", ownerOnly: true, icon: "⚙️" },
];

export const INTERNAL_BARCODE_START = 1000000;

export const stockOf = (product: Product, branch: BranchId): number => {
  if (branch === "all") {
    return shopIds.reduce((sum, id) => sum + (product.stock[id] ?? 0), 0);
  }
  return product.stock[branch] ?? 0;
};

// Branch UUID mapping (unchanged)
export const BRANCH_UUID_MAP: Record<string, string> = {
  toto: "6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a",
  "totoz-empire": "6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a",
  main: "6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a",
  "main-branch": "6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a",
  "sunnozy-1": "a8d51c6d-7660-492d-8430-2243d48a59ef",
  "sunnozy-2": "d7280d3d-a2fd-41db-bd9d-c03d371d3d4d",
  mimis: "7f624cb1-f0d1-47d3-bcd5-a9ad3ecdfb92",
  "marc-urembo": "21967b1d-14d2-4d06-9d93-07bc7a2b153b",
};

const looksLikeUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function getBranchUuid(branchId: string): string {
  if (!branchId) return BRANCH_UUID_MAP.toto;
  const normalized = String(branchId).trim();
  if (looksLikeUuid(normalized)) return normalized;

  const direct = Object.entries(BRANCH_UUID_MAP).find(([key]) => key.toLowerCase() === normalized.toLowerCase());
  if (direct) return direct[1];

  const alias = Object.entries(BRANCH_UUID_MAP).find(([key]) => key.toLowerCase() === normalized.toLowerCase().replace(/\s+/g, "-"));
  if (alias) return alias[1];

  return BRANCH_UUID_MAP[normalized] || BRANCH_UUID_MAP["toto"] || normalized;
}

export function getBranchIdFromUuid(uuid: string): ShopId {
  if (!uuid) return "toto";
  const normalized = String(uuid).trim();

  if (normalized && !looksLikeUuid(normalized)) {
    const direct = Object.entries(BRANCH_UUID_MAP).find(([key]) => key.toLowerCase() === normalized.toLowerCase());
    if (direct && shopIds.includes(direct[0] as ShopId)) return direct[0] as ShopId;
    return "toto";
  }

  const match = Object.entries(BRANCH_UUID_MAP).find(([, value]) => value.toLowerCase() === normalized.toLowerCase());
  if (match && shopIds.includes(match[0] as ShopId)) {
    return match[0] as ShopId;
  }

  const byName = branches.find((branch) => getBranchUuid(branch.id) === normalized);
  if (byName) return byName.id as ShopId;

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
