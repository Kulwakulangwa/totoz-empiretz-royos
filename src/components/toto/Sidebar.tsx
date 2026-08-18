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
    <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-border bg-card p-5 md:flex">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="grid size-10 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          TE
        </div>
        <div>
          <h2 className="text-[15px] leading-none font-semibold tracking-tight">Toto Empire</h2>
          <p className="mt-1.5 text-[12px] text-muted-foreground">Retail management</p>
        </div>
      </div>

      <div>
        <div className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Branches
        </div>
        <div className="grid gap-0.5">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => onShop(branch.id)}
              disabled={!isOwner}
              className={cn(
                "flex min-h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-accent disabled:opacity-40",
                branch.id === shop && "bg-accent font-medium",
              )}
            >
              {branch.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Management
        </div>
        <div className="grid gap-0.5">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              className={cn(
                "flex min-h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-accent",
                item.id === section && "bg-primary text-primary-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
