import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toto Empire | Multi-Branch Retail Management" },
      {
        name: "description",
        content:
          "Toto Empire retail management: point of sale with barcode scanning, VAT/EFD receipts, returns, inventory, expenses and branch reports.",
      },
      { property: "og:title", content: "Toto Empire | Multi-Branch Retail Management" },
      {
        property: "og:description",
        content:
          "POS with barcode scanning, VAT/EFD receipts, returns, inventory and reports across all Toto Empire shops.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    title: "Point of sale",
    copy: "Barcode scanning with a camera or USB scanner, Cash and Lipa Namba payments.",
  },
  {
    title: "Returns and credit notes",
    copy: "Refund whole or partial receipts, restock items and keep profit accurate.",
  },
  {
    title: "VAT and EFD receipts",
    copy: "TIN, VRN and EFD serial on every printed receipt with an 18% VAT breakdown.",
  },
  {
    title: "Reports",
    copy: "Sales, payments, VAT, returns, stock and branch profit for any date range.",
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          TE
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Toto Empire</span>
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-5xl">
        Run every Toto Empire shop from one screen.
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Point of sale with barcode scanning, VAT and EFD-ready receipts, returns, inventory,
        expenses, staff access and reporting for all five branches.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to={signedIn ? "/dashboard" : "/auth"}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {signedIn ? "Open dashboard" : "Sign in to your shop"}
        </Link>
        <Link
          to="/auth"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-[13px] font-medium transition-colors hover:bg-accent"
        >
          Create a staff account
        </Link>
      </div>
      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <article key={f.title} className="panel p-5">
            <h2 className="text-sm font-semibold">{f.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{f.copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
