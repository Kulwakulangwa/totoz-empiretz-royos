import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        shop_id: z.string().uuid(),
        items: z
          .array(
            z.object({
              product_id: z.string().uuid(),
              source_location_id: z.string().uuid(),
              qty: z.number().int().positive(),
            }),
          )
          .min(1),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify staff record and permissions
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("role, branch_id, is_active")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (staffError || !staff || !staff.is_active) {
      throw new Response("Forbidden - staff access required", { status: 403 });
    }

    if (staff.role === "manager" && staff.branch_id !== data.shop_id) {
      throw new Response("Forbidden - managers can only create orders for their branch", { status: 403 });
    }

    // Call the DB RPC to reserve the order atomically
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("rpc_reserve_order", {
      shop_id: data.shop_id,
      created_by: context.userId,
      items: data.items,
    });

    if (rpcError) {
      console.error("rpc_reserve_order failed:", rpcError);
      throw new Error(rpcError.message || "Could not reserve order");
    }

    return rpcData;
  });
