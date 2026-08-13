export type BranchId = "all" | "kariakoo" | "mlimani" | "sinza" | "tegeta" | "jewellery";

export type Branch = {
  id: BranchId;
  name: string;
  sub: string;
  color: string;
  sales: number;
  expenses: number;
  low: number;
  cashiers: number;
  receipts: number;
  cash: number;
  lipa: number;
  margin: number;
};

export const branches: Branch[] = [
  { id: "all", name: "All shops", sub: "5 branches", color: "var(--night)", sales: 1842000, expenses: 392000, low: 6, cashiers: 12, receipts: 148, cash: 58, lipa: 42, margin: 38 },
  { id: "kariakoo", name: "Kariakoo", sub: "Baby and kids", color: "var(--coral)", sales: 520000, expenses: 98000, low: 2, cashiers: 3, receipts: 41, cash: 61, lipa: 39, margin: 41 },
  { id: "mlimani", name: "Mlimani", sub: "Toys and clothes", color: "var(--teal)", sales: 431000, expenses: 74000, low: 1, cashiers: 2, receipts: 35, cash: 52, lipa: 48, margin: 36 },
  { id: "sinza", name: "Sinza", sub: "Baby products", color: "var(--amber)", sales: 276000, expenses: 65000, low: 1, cashiers: 2, receipts: 26, cash: 64, lipa: 36, margin: 34 },
  { id: "tegeta", name: "Tegeta", sub: "Clothes and toys", color: "var(--violet)", sales: 238000, expenses: 62000, low: 1, cashiers: 2, receipts: 19, cash: 57, lipa: 43, margin: 33 },
  { id: "jewellery", name: "Jewellery", sub: "Local jewellery", color: "var(--gold)", sales: 377000, expenses: 93000, low: 1, cashiers: 3, receipts: 27, cash: 55, lipa: 45, margin: 45 },
];

export type SectionId = "overview" | "pos" | "inventory" | "expenses" | "staff" | "reports";

export const navItems: { id: SectionId; label: string; icon: string; ownerOnly: boolean }[] = [
  { id: "overview", label: "Overview", icon: "O", ownerOnly: true },
  { id: "pos", label: "POS", icon: "P", ownerOnly: false },
  { id: "inventory", label: "Inventory", icon: "I", ownerOnly: true },
  { id: "expenses", label: "Expenses", icon: "E", ownerOnly: true },
  { id: "staff", label: "Staff", icon: "S", ownerOnly: true },
  { id: "reports", label: "Reports", icon: "R", ownerOnly: true },
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
  icon: string;
};

export const products: Product[] = [
  { sku: "BBT-00124", barcode: "6201000124", name: "Baby T-Shirt, 6-9m", branch: "Tegeta", category: "Baby Clothes", buy: 15000, sell: 25000, qty: 5, min: 5, icon: "T" },
  { sku: "BBW-0092", barcode: "6201000092", name: "Baby Wrap Blanket", branch: "Sinza", category: "Baby Products", buy: 18000, sell: 34000, qty: 4, min: 6, icon: "B" },
  { sku: "TDS-0221", barcode: "6201000221", name: "Toddler Sandals 22", branch: "Kariakoo", category: "Children Clothes", buy: 12000, sell: 22000, qty: 7, min: 8, icon: "S" },
  { sku: "TOY-0447", barcode: "6201000447", name: "Wooden Building Blocks", branch: "Mlimani", category: "Toys", buy: 22000, sell: 39000, qty: 8, min: 8, icon: "W" },
  { sku: "JWL-0119", barcode: "6201000119", name: "Gold-plated Anklet", branch: "Jewellery", category: "Jewellery", buy: 91000, sell: 158000, qty: 2, min: 3, icon: "J" },
  { sku: "FDB-0301", barcode: "6201000301", name: "Feeding Bottle 250ml", branch: "Kariakoo", category: "Baby Products", buy: 7000, sell: 14000, qty: 6, min: 7, icon: "F" },
  { sku: "TOY-0620", barcode: "6201000620", name: "Alphabet Learning Mat", branch: "Mlimani", category: "Toys", buy: 26000, sell: 47000, qty: 24, min: 8, icon: "A" },
  { sku: "JWL-0188", barcode: "6201000188", name: "Silver Bangle Set", branch: "Jewellery", category: "Jewellery", buy: 92000, sell: 158000, qty: 13, min: 4, icon: "G" },
  { sku: "KDS-0505", barcode: "6201000505", name: "Kids Denim Jacket 4y", branch: "Tegeta", category: "Children Clothes", buy: 24000, sell: 45000, qty: 11, min: 5, icon: "D" },
  { sku: "BBP-0777", barcode: "6201000777", name: "Diaper Pack Medium", branch: "Sinza", category: "Baby Products", buy: 28000, sell: 42000, qty: 19, min: 8, icon: "P" },
];

export type Activity = { badge: string; title: string; desc: string; time: string; color: string };

export const activities: Activity[] = [
  { badge: "POS", title: "Sale completed - Receipt #4821", desc: "Kariakoo - Asha - Lipa Namba", time: "2 min", color: "var(--teal)" },
  { badge: "LOW", title: "Stock reached minimum - Baby Wrap Blanket", desc: "Sinza - 4 units remaining", time: "18 min", color: "var(--amber)" },
  { badge: "PRC", title: "Price updated - Silver Bangle Set", desc: "Jewellery - TZS 145,000 to TZS 158,000 - Owner", time: "41 min", color: "var(--gold)" },
  { badge: "EXP", title: "Expense recorded - Electricity", desc: "Tegeta - TZS 62,000", time: "1 hr", color: "var(--violet)" },
  { badge: "USR", title: "Cashier account created - Neema", desc: "Mlimani - POS access only - by Owner", time: "1 hr", color: "var(--night)" },
  { badge: "BAR", title: "12 products added and barcodes generated", desc: "Mlimani - Toy category", time: "2 hr", color: "var(--coral)" },
];

export type Expense = { date: string; branch: string; category: string; description: string; amount: number };

export const expenses: Expense[] = [
  { date: "12 Aug", branch: "Tegeta", category: "Utilities", description: "Electricity bill", amount: 62000 },
  { date: "12 Aug", branch: "Kariakoo", category: "Packaging", description: "Bags and labels", amount: 36000 },
  { date: "11 Aug", branch: "Jewellery", category: "Rent", description: "Shop rent installment", amount: 210000 },
  { date: "11 Aug", branch: "Mlimani", category: "Transport", description: "Stock delivery", amount: 28000 },
  { date: "10 Aug", branch: "Sinza", category: "Cleaning", description: "Weekly cleaning", amount: 18000 },
  { date: "10 Aug", branch: "Kariakoo", category: "Repairs", description: "Display shelf repair", amount: 45000 },
];

export const expenseCategories = ["Rent", "Utilities", "Internet", "Transport", "Packaging", "Repairs", "Cleaning", "Other"];

export type Staff = { role: "Owner" | "Cashier"; name: string; branch: string; detail: string };

export const staff: Staff[] = [
  { role: "Owner", name: "Mama Toto", branch: "All shops", detail: "Full access to all shops, stock, prices, staff, expenses, reports and audit logs." },
  { role: "Cashier", name: "Asha", branch: "Kariakoo", detail: "POS only. Can scan, search, sell, select Cash or Lipa Namba and print receipt." },
  { role: "Cashier", name: "Neema", branch: "Mlimani", detail: "Restricted from dashboard, reports, stock edits, price changes, product deletion and expenses." },
  { role: "Cashier", name: "Baraka", branch: "Jewellery", detail: "Assigned to one shop. Every sale records cashier, shop, payment method and receipt number." },
  { role: "Cashier", name: "Zawadi", branch: "Sinza", detail: "POS access for one branch with manual confirmation of Cash and Lipa Namba payments." },
  { role: "Cashier", name: "Juma", branch: "Tegeta", detail: "POS access for one branch. Cannot adjust stock or view branch profit." },
];

export const reports = [
  { title: "Sales report", copy: "Sales by date, shop and cashier with receipt-level traceability." },
  { title: "Payment report", copy: "Cash and Lipa Namba split for every shop and period." },
  { title: "Product sales", copy: "Products sold, quantities and category performance." },
  { title: "Inventory report", copy: "Current stock, opening stock, added stock, sales reduction and adjustments." },
  { title: "Low-stock report", copy: "Products that reached minimum levels by shop." },
  { title: "Expense report", copy: "Expenses by category, branch and period against shop revenue." },
  { title: "Branch performance", copy: "Sales, expenses and profit comparison across all five shops." },
  { title: "Audit history", copy: "Sales, price edits, stock adjustments, expenses and user changes." },
];

export const money = (value: number) => "TZS " + value.toLocaleString("en-US");
export const compact = (value: number) =>
  value >= 1000000 ? "TZS " + (value / 1000000).toFixed(2) + "M" : money(value);