export type BranchId = "all" | "kariakoo" | "mlimani" | "sinza" | "tegeta" | "jewellery";

export type Branch = {
  id: BranchId;
  name: string;
  sub: string;
};

export const branches: Branch[] = [
  { id: "all", name: "All shops", sub: "Consolidated view" },
  { id: "kariakoo", name: "Kariakoo", sub: "Baby and kids" },
  { id: "mlimani", name: "Mlimani", sub: "Toys and clothes" },
  { id: "sinza", name: "Sinza", sub: "Baby products" },
  { id: "tegeta", name: "Tegeta", sub: "Clothes and toys" },
  { id: "jewellery", name: "Jewellery", sub: "Local jewellery" },
];

export type SectionId = "overview" | "pos" | "inventory" | "expenses" | "staff" | "reports";

export const navItems: { id: SectionId; label: string; ownerOnly: boolean }[] = [
  { id: "overview", label: "Overview", ownerOnly: true },
  { id: "pos", label: "Point of sale", ownerOnly: false },
  { id: "inventory", label: "Inventory", ownerOnly: true },
  { id: "expenses", label: "Expenses", ownerOnly: true },
  { id: "staff", label: "Staff", ownerOnly: true },
  { id: "reports", label: "Reports", ownerOnly: true },
];

export type Product = {
  sku: string;
  barcode: string;
  name: string;
  branch: string;
  category: string;
  buy: number;
  sell: number;
  qty: number;
  min: number;
};

export const products: Product[] = [];

export type Activity = { title: string; desc: string; time: string };

export const activities: Activity[] = [];

export type Expense = {
  date: string;
  branch: string;
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

export type Staff = { role: "Owner" | "Cashier"; name: string; branch: string; detail: string };

export const staff: Staff[] = [];

export const reports = [
  { title: "Sales report", copy: "Sales by date, shop and cashier with receipt-level traceability." },
  { title: "Payment report", copy: "Cash and Lipa Namba split for every shop and period." },
  { title: "Product sales", copy: "Products sold, quantities and category performance." },
  { title: "Inventory report", copy: "Opening stock, added stock, sales reduction and adjustments." },
  { title: "Low-stock report", copy: "Products that reached their minimum level, by shop." },
  { title: "Expense report", copy: "Expenses by category, branch and period against shop revenue." },
  { title: "Branch performance", copy: "Sales, expenses and profit comparison across all shops." },
  { title: "Audit history", copy: "Sales, price edits, stock adjustments, expenses and user changes." },
];

export const money = (value: number) => "TZS " + value.toLocaleString("en-US");
