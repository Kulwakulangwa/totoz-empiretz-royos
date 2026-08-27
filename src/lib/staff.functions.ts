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

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("*");
    if (staffError) throw new Error(staffError.message);

    return staff.map((s) => ({
      id: s.id,
      email: s.email,
      fullName: s.full_name,
      branch: getBranchIdFromUuid(s.branch_id),
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
        branch: z.string(),
        role: z.enum(["owner", "cashier"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const branchUuid = getBranchUuid(data.branch);
    if (!branchUuid) {
      throw new Error(`Invalid branch: ${data.branch}`);
    }

    // 1. Check if staff already exists with this email
    const { data: existingStaff, error: checkError } = await supabaseAdmin
      .from("staff")
      .select("id, user_id, is_active")
      .eq("email", data.email)
      .maybeSingle();

    if (existingStaff) {
      // Staff exists with this email
      if (existingStaff.is_active) {
        throw new Error(`A staff account with email ${data.email} already exists and is active.`);
      } else {
        // Reactivate and update the staff record
        const { error: updateError } = await supabaseAdmin
          .from("staff")
          .update({
            full_name: data.fullName,
            branch_id: branchUuid,
            role: data.role,
            is_active: true,
          })
          .eq("id", existingStaff.id);
        if (updateError) throw updateError;
        return { id: existingStaff.id, email: data.email };
      }
    }

    // 2. No existing staff – create auth user
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

    // 3. Insert staff record
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
      // Rollback: delete the auth user
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

    const { data: staff, error: staffFindError } = await supabaseAdmin
      .from("staff")
      .select("user_id")
      .eq("id", data.id)
      .single();
    if (staffFindError || !staff) {
      throw new Error("Staff record not found");
    }

    if (staff.user_id === context.userId) {
      throw new Error("You cannot remove your own account");
    }

    // Delete auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staff.user_id);
    if (deleteAuthError) throw new Error(deleteAuthError.message);

    // Delete staff record (explicit)
    const { error: deleteStaffError } = await supabaseAdmin
      .from("staff")
      .delete()
      .eq("id", data.id);
    if (deleteStaffError) throw new Error(deleteStaffError.message);

    return { ok: true };
  });
