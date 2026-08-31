import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/toto/Dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Totoz Empire Retail" },
      {
        name: "description",
        content:
          "Run the Totoz Empire shops: point of sale with VAT receipts, returns, inventory, expenses, staff and branch reports.",
      },
      { property: "og:title", content: "Dashboard | Totoz Empire Retail" },
      {
        property: "og:description",
        content: "Point of sale, returns, inventory, VAT/EFD receipts and reports for every shop.",
      },
    ],
  }),
  component: Dashboard,
});
