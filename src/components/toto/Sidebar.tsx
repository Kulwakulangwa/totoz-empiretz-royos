import { cn } from "@/lib/utils";
import { branches, navItems, type BranchId, type SectionId } from "@/lib/toto-data";

type Props = {
  shop: BranchId;
  section: SectionId;
  isOwner: boolean;
  onShop: (id: BranchId) => void;
  onSection: (id: SectionId) => void;
};

export function Sidebar({ shop, section, isOwner, onShop, onSection }: Props) {
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);

  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-5 border-r border-cream/10 bg-[linear-gradient(180deg,var(--night),oklch(0.2_0.02_292))] p-5 text-cream md:flex">
      <div className="flex items-center gap-3 border-b border-cream/10 px-2 pb-4">
        <div className="grid size-11 place-items-center rounded-md bg-[linear-gradient(135deg,var(--coral),var(--gold))] font-black shadow-[inset_0_1px_0_oklch(1_0_0/0.24)]">
          TE
        </div>
        <div>
          <h2 className="text-[17px] leading-none font-bold">Toto Empire</h2>
          <p className="eyebrow mt-1.5 text-cream/55">Retail System</p>
        </div>
      </div>

      <div>
        <div className="eyebrow px-2.5 pb-2 text-cream/45">Branches</div>
        <div className="grid gap-1">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => onShop(branch.id)}
              disabled={!isOwner}
              className={cn(
                "flex min-h-[42px] w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-cream/8 disabled:opacity-40",
                branch.id === shop && "bg-coral/18 text-coral-foreground",
              )}
            >
              <span
                className="size-4.5 flex-none rounded-md"
                style={{ background: branch.color === "var(--night)" ? "var(--cream)" : branch.color }}
              />
              <span className="min-w-0 grid">
                <span className="text-[13px] font-bold">{branch.name}</span>
                <span className="text-[11px] text-cream/50">{branch.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="eyebrow px-2.5 pb-2 text-cream/45">Management</div>
        <div className="grid gap-1">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              className={cn(
                "flex min-h-[42px] w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-cream/8",
                item.id === section && "bg-coral/18 shadow-[inset_3px_0_0_var(--coral)]",
              )}
            >
              <span className="grid size-5.5 place-items-center text-[13px] font-black text-cream/85">
                {item.icon}
              </span>
              <span className="text-[13px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-md border border-cream/10 bg-cream/7 p-3.5">
        <strong className="text-[13px]">System readiness</strong>
        <p className="my-2 text-xs leading-relaxed text-cream/65">
          POS, stock, barcodes, expenses, reports and cashier restrictions are aligned with the
          first-version scope.
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-cream/15">
          <span className="block h-full w-[86%] rounded-full bg-[linear-gradient(90deg,var(--teal),oklch(0.75_0.13_130))]" />
        </div>
      </div>
    </aside>
  );
}