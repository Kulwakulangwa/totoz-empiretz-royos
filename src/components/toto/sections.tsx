import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listStaff,
  createStaffAccount,
  deleteStaffAccount,
  type StaffAccount,
} from "@/lib/staff.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { productImagePreview } from "@/lib/product-images";
import { Panel, PanelHead, Pill, EmptyState, MiniCard } from "./primitives";
import { Scanner } from "./Scanner";
import { ProductQRCode } from "./QRCode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  branches,
  expenseCategories,
  money,
  reports,
  shopIds,
  stockOf,
  colors,
  type BranchId,
  type Product,
  type ShopId,
} from "@/lib/toto-data";
import { branchLabel, useToto, type SaleLine, type SaveResult } from "@/lib/toto-store";
import { Camera, ImageIcon, Scan, QrCode, Upload, X } from "lucide-react";

// Keep existing btn/btnPrimary/field definitions...
export const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent";
export const btnPrimary =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90";

const field =
  "min-h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

const realBranches = branches.slice(1);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ProductThumb({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground",
        className ?? "size-10",
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <ImageIcon className="size-4" aria-hidden="true" />
      )}
    </div>
  );
}

/* ---------------- Overview ---------------- */

export function OverviewSection({ shop }: { shop: BranchId }) {
  const { sales, expenses, activities } = useToto();
  const scopedName = shop === "all" ? "all shops" : branchLabel(shop);

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cost = sales.reduce((sum, s) => sum + s.cost, 0);
  const spend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = revenue - cost - spend;
  const vat = sales.reduce((sum, s) => sum + s.vat, 0);

  const metrics = [
    {
      label: "Revenue",
      value: money(revenue),
      icon: "📈",
      bg: colors.pinkBg,
      color: colors.secondary,
    },
    {
      label: "Expenses",
      value: money(spend),
      icon: "💳",
      bg: colors.lavenderLight,
      color: colors.primary,
    },
    {
      label: "Profit",
      value: money(profit),
      icon: "💎",
      bg: colors.tealLight,
      color: colors.accent,
    },
    {
      label: "VAT",
      value: money(vat),
      icon: "🧾",
      bg: "#FCE8E8",
      color: "#E93FA0",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 transition-all hover:shadow-md"
            style={{ background: metric.bg || colors.white }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{metric.icon}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  {metric.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: colors.textDark }}>
                  {metric.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Branch Performance & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branch Performance */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EEF4]">
          <h3 className="text-lg font-semibold" style={{ color: colors.textDark }}>
            Branch Performance
          </h3>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Sales and margin comparison for {scopedName}.
          </p>
          <div className="mt-4 space-y-3">
            {realBranches.map((b) => {
              const branchSales = sales.filter((s) => s.branch === b.id);
              const rev = branchSales.reduce((sum, s) => sum + s.total, 0);
              const profitMargin = branchSales.reduce((sum, s) => sum + s.total - s.cost, 0);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 border-b border-[#F0EEF4] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.textDark }}>
                      {b.name}
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      {branchSales.length} receipts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                      {money(rev)}
                    </p>
                    <p className="text-xs" style={{ color: profitMargin > 0 ? colors.accent : colors.secondary }}>
                      {profitMargin > 0 ? `+${money(profitMargin)}` : money(profitMargin)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EEF4]">
          <h3 className="text-lg font-semibold" style={{ color: colors.textDark }}>
            Recent Activity
          </h3>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Sales, stock and price changes.
          </p>
          <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto">
            {activities.length ? (
              activities.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F0EEF4] last:border-0">
                  <div className="size-2 rounded-full" style={{ background: colors.accent }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: colors.textDark }}>
                      {a.title}
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      {a.desc} · {a.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-8" style={{ color: colors.textMuted }}>
                No activity yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Point of sale ---------------- */

// ... keep the rest of the file unchanged (PosSection, InventorySection, etc.)
// They remain exactly as they were in your original file.
