import { useState } from "react";
import { LogOut, Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { colors, money } from "@/lib/toto-data";
import type { Location, LocationType } from "@/lib/inventory";
import { BranchCard } from "./BranchCard";
import { AppLogo } from "./AppLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

interface BranchSummary extends Location {
  revenueToday: number;
  expensesToday: number;
  profitToday: number;
  vatToday: number;
}
type Props = {
  shops: BranchSummary[];
  warehouses: Location[];
  onSelectLocation: (location: Location) => void;
  onCreateLocation: (input: {
    name: string;
    location_type: LocationType;
    address?: string | undefined;
    phone?: string | undefined;
  }) => Promise<void>;
  onArchiveLocation: (location: Location) => Promise<void>;
  onRenameLocation: (location: Location, name: string) => Promise<void>;
  userEmail?: string | undefined;
  role?: string | undefined;
  onLogout: () => void;
  allRevenue: number;
  allExpenses: number;
  allProfit: number;
  allVat: number;
};

export function BranchSelectionPage({
  shops,
  warehouses,
  onSelectLocation,
  onCreateLocation,
  onArchiveLocation,
  onRenameLocation,
  userEmail,
  role,
  onLogout,
  allRevenue,
  allExpenses,
  allProfit,
  allVat,
}: Props) {
  const [createType, setCreateType] = useState<LocationType | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const summary = [
    ["Revenue", allRevenue, "📈"],
    ["Expenses", allExpenses, "💳"],
    ["Profit", allProfit, "💎"],
    ["VAT", allVat, "🧾"],
  ] as const;
  const create = async () => {
    if (!createType || !form.name.trim()) return;
    setSaving(true);
    try {
      await onCreateLocation({
        name: form.name,
        location_type: createType,
        address: form.address || undefined,
        phone: form.phone || undefined,
      });
      toast("Location created");
      setCreateType(null);
      setForm({ name: "", address: "", phone: "" });
    } catch (error: unknown) {
      toast("Location could not be created", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{
        background: `linear-gradient(135deg, ${colors.gradientMint}, ${colors.gradientPink} 55%, ${colors.gradientDeepPurple})`,
      }}
    >
      <div className="mx-auto max-w-7xl rounded-[32px] bg-white p-6 shadow-2xl md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <AppLogo className="size-12" />
            <div>
              <h1 className="text-2xl font-bold">Totoz Empire</h1>
              <p className="text-sm text-muted-foreground">Locations & inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{userEmail}</p>
              <p className="text-xs capitalize text-muted-foreground">{role}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </header>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(([label, value, icon]) => (
            <div key={label} className="rounded-2xl bg-muted/60 p-4">
              <span className="text-2xl">{icon}</span>
              <p className="mt-2 text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{money(value)}</p>
            </div>
          ))}
        </div>
        <section className="mt-8">
          <h2 className="text-xl font-bold">Shop branches</h2>
          <p className="text-sm text-muted-foreground">
            Choose a shop to manage sales and stocking.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <div key={shop.id} className="relative">
                <BranchCard
                  id={shop.id}
                  name={shop.name}
                  revenue={shop.revenueToday}
                  expenses={shop.expensesToday}
                  profit={shop.profitToday}
                  vat={shop.vatToday}
                  onClick={() => onSelectLocation(shop)}
                  role="Owner"
                />
                <div className="absolute right-3 top-3 flex gap-1">
                  <LocationActions
                    location={shop}
                    onRename={onRenameLocation}
                    onArchive={onArchiveLocation}
                  />
                </div>
              </div>
            ))}
            <AddCard label="Add shop branch" onClick={() => setCreateType("shop")} />
          </div>
        </section>
        <section className="mt-10 border-t pt-8">
          <h2 className="text-xl font-bold">Warehouses</h2>
          <p className="text-sm text-muted-foreground">
            Receive inventory and review stock supplied to shops.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((item) => (
              <div key={item.id} className="relative">
                <button
                  onClick={() => onSelectLocation(item)}
                  className="group min-h-44 w-full rounded-2xl border border-slate-700 bg-slate-900 p-5 text-left text-white shadow transition hover:-translate-y-0.5"
                >
                  <Warehouse className="size-8 text-emerald-400" />
                  <h3 className="mt-5 text-lg font-bold">{item.name}</h3>
                  <p className="font-mono text-xs text-slate-400">{item.code}</p>
                  <span className="mt-4 inline-block text-xs text-emerald-300">
                    Open warehouse dashboard →
                  </span>
                </button>
                <div className="absolute right-3 top-3 flex gap-1">
                  <LocationActions
                    location={item}
                    onRename={onRenameLocation}
                    onArchive={onArchiveLocation}
                  />
                </div>
              </div>
            ))}
            <AddCard label="Add warehouse" dark onClick={() => setCreateType("warehouse")} />
          </div>
        </section>
      </div>
      <Dialog open={createType !== null} onOpenChange={(open) => !open && setCreateType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {createType === "shop" ? "shop branch" : "warehouse"}</DialogTitle>
            <DialogDescription>
              The location code will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {(["name", "address", "phone"] as const).map((field) => (
              <label key={field} className="grid gap-1.5">
                <span className="text-xs font-medium capitalize">
                  {field}
                  {field === "name" ? " *" : ""}
                </span>
                <input
                  className="min-h-10 rounded-lg border px-3 text-sm"
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <button
              className="rounded-lg border px-4 py-2 text-sm"
              onClick={() => setCreateType(null)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={saving || !form.name.trim()}
              onClick={create}
            >
              {saving ? "Creating…" : "Create location"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationActions({
  location,
  onRename,
  onArchive,
}: {
  location: Location;
  onRename: (location: Location, name: string) => Promise<void>;
  onArchive: (location: Location) => Promise<void>;
}) {
  return (
    <>
      <button
        onClick={async () => {
          const name = window.prompt("New location name", location.name);
          if (name?.trim() && name.trim() !== location.name) {
            try {
              await onRename(location, name.trim());
              toast("Location renamed");
            } catch (error: unknown) {
              toast("Rename failed", { description: errorMessage(error) });
            }
          }
        }}
        className="rounded-md bg-white/90 px-2 py-1 text-[10px] text-slate-700 shadow"
      >
        Rename
      </button>
      <button
        onClick={async () => {
          if (!window.confirm(`Archive ${location.name}?`)) return;
          try {
            await onArchive(location);
            toast("Location archived");
          } catch (error: unknown) {
            toast("Archive failed", { description: errorMessage(error) });
          }
        }}
        className="rounded-md bg-white/90 px-2 py-1 text-[10px] text-red-500 shadow"
      >
        Archive
      </button>
    </>
  );
}

function AddCard({
  label,
  onClick,
  dark = false,
}: {
  label: string;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`grid min-h-44 place-items-center rounded-2xl border-2 border-dashed p-5 text-sm font-semibold transition ${dark ? "border-slate-400 bg-slate-100 text-slate-700 hover:bg-slate-200" : "border-violet-200 text-violet-700 hover:bg-violet-50"}`}
    >
      <span className="grid place-items-center gap-2">
        <Plus className="size-7" />
        {label}
      </span>
    </button>
  );
}
