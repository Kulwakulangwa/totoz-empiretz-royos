import { cn } from "@/lib/utils";
import { branches, navItems, type BranchId, type SectionId } from "@/lib/toto-data";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  ShoppingBag,
  RefreshCw,
  Package,
  DollarSign,
  Users,
  FileText,
  Settings,
  LogOut,
  Store,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  overview: <Home className="w-4 h-4" />,
  pos: <ShoppingBag className="w-4 h-4" />,
  returns: <RefreshCw className="w-4 h-4" />,
  inventory: <Package className="w-4 h-4" />,
  expenses: <DollarSign className="w-4 h-4" />,
  staff: <Users className="w-4 h-4" />,
  reports: <FileText className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

type Props = {
  shop: BranchId;
  section: SectionId;
  isOwner: boolean;
  onSection: (id: SectionId) => void;
  // onShop is removed – branch switching is done via header/mobile
};

export function Sidebar({ shop, section, isOwner, onSection }: Props) {
  const { signOut, user, role } = useAuth();
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);

  // Find the current branch name
  const branchName = branches.find((b) => b.id === shop)?.name || shop;

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:min-h-screen md:bg-white md:border-r md:border-border">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-gray-800">Toto Empire</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {role === "owner" ? "Owner" : "Cashier"}
        </div>
      </div>

      {/* Current Branch (non‑interactive) */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded-md">
          <Store className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">{branchName}</span>
        </div>
      </div>

      {/* Management Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {iconMap[item.id]}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
