import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBranchUuid, getBranchIdFromUuid } from "@/lib/toto-data";

export type StaffAccount = {
  id: string;
  email: string;
  fullName: string;
  branch: string; // short name (e.g., "toto")
  role: "owner" | "cashier";
  createdAt: string;
  isActive: boolean;
};

// Helper to check if current user is an owner
async function assertOwner(context: any) {
  const { supabase, userId } = context;
  const { data, error } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (error || !data || data.role !== "owner") {
    throw new Response("Forbidden – owner access required", { status: 403 });
  }
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAccount[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch all staff records
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("*");
    if (staffError) throw new Error(staffError.message);

    // Map branch UUID to short name for frontend
    return staff.map((s) => ({
      id: s.id,
      email: s.email,
      fullName: s.full_name,
      branch: getBranchIdFromUuid(s.branch_id), // convert UUID to short name
      role: s.role,
      createdAt: s.created_at,
      isActive: s.is_active,
    }));
  });

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6).max(72),
        fullName: z.string().trim().min(1).max(80),
        branch: z.string(), // short name (e.g., "toto") – will convert to UUID
        role: z.enum(["owner", "cashier"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Convert branch short name to UUID
    const branchUuid = getBranchUuid(data.branch);
    if (!branchUuid) {
      throw new Error(`Invalid branch: ${data.branch}`);
    }

    // 1. Create the auth user
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: data.role },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Could not create the account");
    }
    const userId = created.user.id;

    // 2. Insert the staff record
    const { error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        user_id: userId,
        branch_id: branchUuid,
        full_name: data.fullName,
        email: data.email,
        role: data.role,
        is_active: true,
      });
    if (staffError) {
      // Rollback: delete the auth user if staff insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(staffError.message);
    }

    return { id: userId, email: data.email };
  });

export const deleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get the user_id from the staff record
    const { data: staff, error: staffFindError } = await supabaseAdmin
      .from("staff")
      .select("user_id")
      .eq("id", data.id)
      .single();
    if (staffFindError || !staff) {
      throw new Error("Staff record not found");
    }

    // Prevent self-deletion
    if (staff.user_id === context.userId) {
      throw new Error("You cannot remove your own account");
    }

    // Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staff.user_id);
    if (deleteAuthError) throw new Error(deleteAuthError.message);

    // Delete the staff record (cascade – but we delete explicitly)
    const { error: deleteStaffError } = await supabaseAdmin
      .from("staff")
      .delete()
      .eq("id", data.id);
    if (deleteStaffError) throw new Error(deleteStaffError.message);

    return { ok: true };
  });
