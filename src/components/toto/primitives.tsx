import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("panel p-4 sm:p-5 min-w-0", className)}>{children}</section>;
}

export function PanelHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Pill({
  tone = "ok",
  children,
}: {
  tone?: "ok" | "warn" | "low";
  children: ReactNode;
}) {
  const tones = {
    ok: "bg-success/12 text-success",
    warn: "bg-amber/14 text-amber",
    low: "bg-danger/12 text-danger",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-extrabold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Thumb({ children, size = "md" }: { children: ReactNode; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid flex-none place-items-center rounded-md border border-foreground/5 bg-[linear-gradient(135deg,oklch(0.88_0.04_70),oklch(0.955_0.016_79))] font-black text-foreground/80",
        size === "md" ? "size-10 text-lg" : "size-12 text-xl",
      )}
    >
      {children}
    </span>
  );
}

export function MiniCard({ title, copy, top }: { title: string; copy: string; top?: ReactNode }) {
  return (
    <article className="rounded-md border border-border bg-card/70 p-4">
      {top}
      <strong className="mt-2 block text-sm">{title}</strong>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{copy}</p>
    </article>
  );
}