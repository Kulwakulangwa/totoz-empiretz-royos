export type BranchId = "all" | "toto" | "sunnozy1" | "sunnozy2" | "mimis" | "marc";
export type ShopId = Exclude<BranchId, "all">;

export type Branch = {
  id: BranchId;
  name: string;
  sub: string;
};

export const branches: Branch[] = [
  { id: "all", name: "All shops", sub: "Consolidated view" },
  { id: "toto", name: "Totoz Empire", sub: "Baby and kids" },
  { id: "sunnozy1", name: "Sunnozy-1", sub: "Toys and clothes" },
  { id: "sunnozy2", name: "Sunnozy-2", sub: "Baby products" },
  { id: "mimis", name: "Mimis", sub: "Clothes and toys" },
  { id: "marc", name: "Marc Urembo", sub: "Jewellery shop" },
];

export type SectionId =
  "overview" | "pos" | "inventory" | "returns" | "expenses" | "staff" | "reports" | "settings";

export const navItems: { id: SectionId; label: string; ownerOnly: boolean }[] = [
  { id: "overview", label: "Overview", ownerOnly: true },
  { id: "pos", label: "Point of sale", ownerOnly: false },
  { id: "returns", label: "Returns", ownerOnly: false },
  { id: "inventory", label: "Inventory", ownerOnly: true },
  { id: "expenses", label: "Expenses", ownerOnly: true },
  { id: "staff", label: "Staff", ownerOnly: true },
  { id: "reports", label: "Reports", ownerOnly: true },
  { id: "settings", label: "VAT / EFD", ownerOnly: true },
];

/**
 * A product has ONE global identity (sku + barcode) for the whole business.
 * Stock is held per shop in `stock`; the same product can live in many shops.
 */
export type Product = {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  buy: number;
  sell: number;
  min: number;
  stock: Partial<Record<ShopId, number>>;
};

export const shopIds: ShopId[] = ["toto", "sunnozy1", "sunnozy2", "mimis", "marc"];

export const totalStock = (p: Product) =>
  shopIds.reduce((sum, id) => sum + (p.stock[id] ?? 0), 0);

export const stockOf = (p: Product, branch: BranchId) =>
  branch === "all" ? totalStock(p) : (p.stock[branch] ?? 0);

/** Internal (self-generated) barcodes live in the 2000000xxxxx range. */
export const INTERNAL_BARCODE_PREFIX = "2";
export const INTERNAL_BARCODE_START = 200000000001;

export const products: Product[] = [];

export type Activity = { title: string; desc: string; time: string };

export const activities: Activity[] = [];

export type Expense = {
  date: string;
  branch: BranchId;
  category: string;
  description: string;
  amount: number;
};

export const expenses: Expense[] = [];

export const expenseCategories = [
  "Rent",
  "Utilities",
  "Internet",
  "Transport",
  "Packaging",
  "Repairs",
  "Cleaning",
  "Other",
];

export type Staff = { role: "Owner" | "Cashier"; name: string; branch: BranchId; detail: string };

export const staff: Staff[] = [];

export const reports = [
  {
    title: "Sales report",
    copy: "Sales by date, shop and cashier with receipt-level traceability.",
  },
  { title: "Payment report", copy: "Cash and Lipa Namba split for every shop and period." },
  { title: "Product sales", copy: "Products sold, quantities and category performance." },
  {
    title: "Inventory report",
    copy: "Opening stock, added stock, sales reduction and adjustments.",
  },
  { title: "Low-stock report", copy: "Products that reached their minimum level, by shop." },
  {
    title: "Expense report",
    copy: "Expenses by category, branch and period against shop revenue.",
  },
  { title: "Branch performance", copy: "Sales, expenses and profit comparison across all shops." },
  {
    title: "Audit history",
    copy: "Sales, price edits, stock adjustments, expenses and user changes.",
  },
  {
    title: "VAT report",
    copy: "Output VAT collected on sales, less VAT credited on returns.",
  },
  {
    title: "Returns report",
    copy: "Credit notes issued, value returned and reasons by shop.",
  },
];

export const money = (value: number) => "TZS " + value.toLocaleString("en-US");
