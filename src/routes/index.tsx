import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | Totoz Empire Retail" },
      {
        name: "description",
        content:
          "Staff sign in for Totoz Empire: point of sale, returns, inventory, VAT/EFD receipts and branch reports.",
      },
      { property: "og:title", content: "Sign in | Totoz Empire Retail" },
      {
        property: "og:description",
        content: "Secure staff sign-in for Totoz Empire shop management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
