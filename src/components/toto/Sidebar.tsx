import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { branches, navItems, type BranchId, type SectionId } from "@/lib/toto-data";

type Props = {
  shop: BranchId;
  section: SectionId;
  isOwner: boolean;
  open: boolean;
  onShop: (id: BranchId) => void;
  onSection: (id: SectionId) => void;
  onClose: () => void;
};

export function Sidebar({ shop, section, isOwner, open, onShop, onSection, onClose }: Props) {
  const visibleNav = navItems.filter((item) => isOwner || !item.ownerOnly);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[268px] max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-border bg-card p-5 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-auto md:max-w-none md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            TE
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] leading-none font-semibold tracking-tight">
              Toto Empire
            </h2>
            <p className="mt-1.5 text-[12px] text-muted-foreground">Retail management</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div>
          <div className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Branches
          </div>
          <div className="grid gap-0.5">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => {
                  onShop(branch.id);
                  onClose();
                }}
                disabled={!isOwner}
                className={cn(
                  "flex min-h-10 w-full items-center rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-accent disabled:opacity-40 md:min-h-9",
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
                onClick={() => {
                  onSection(item.id);
                  onClose();
                }}
                className={cn(
                  "flex min-h-10 w-full items-center rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-accent md:min-h-9",
                  item.id === section && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
