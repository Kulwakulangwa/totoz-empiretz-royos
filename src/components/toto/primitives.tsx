import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("panel min-w-0 p-5", className)}>{children}</section>;
}

export function PanelHead({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Pill({
  tone = "ok",
  children,
}: {
  tone?: "ok" | "warn" | "low" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    ok: "bg-success/10 text-success",
    warn: "bg-amber/12 text-amber",
    low: "bg-danger/10 text-danger",
    neutral: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        {copy}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function MiniCard({ title, copy, top }: { title: string; copy: string; top?: ReactNode }) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      {top}
      <strong className="mt-2 block text-sm font-semibold">{title}</strong>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
    </article>
  );
}
