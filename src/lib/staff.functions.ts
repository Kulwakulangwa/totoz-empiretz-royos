import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBranchUuid, getBranchIdFromUuid } from "@/lib/toto-data";

export type StaffAccount = {
  id: string;
  email: string;
  fullName: string;
  branch: string;
  role: "owner" | "cashier";
  createdAt: string;
  isActive: boolean;
};

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

    // Normalize email
    const email = data.email.toLowerCase().trim();
    const branchUuid = getBranchUuid(data.branch);
    if (!branchUuid) {
      throw new Error(`Invalid branch: ${data.branch}`);
    }

    // 1. Find existing staff via RPC (case‑insensitive)
    const { data: existingStaff, error: findError } = await supabaseAdmin
      .rpc('find_staff_by_email', { email_input: email });

    if (findError) {
      console.error("Error finding staff by email:", findError);
      throw new Error("Database error while checking staff");
    }

    if (existingStaff && existingStaff.length > 0) {
      const staff = existingStaff[0];
      if (staff.is_active) {
        throw new Error(`A staff account with email ${email} already exists and is active.`);
      } else {
        // Reactivate and update
        const { error: updateError } = await supabaseAdmin
          .from("staff")
          .update({
            full_name: data.fullName,
            branch_id: branchUuid,
            role: data.role,
            is_active: true,
          })
          .eq("id", staff.id);
        if (updateError) throw updateError;
        console.log(`✅ Reactivated inactive staff: ${email}`);
        return { id: staff.id, email: email };
      }
    }

    // 2. No staff – check if auth user exists (to link)
    let userId: string;
    try {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
      if (existingAuthUser) {
        userId = existingAuthUser.id;
        // Create staff record for existing auth user
        const { error: staffError } = await supabaseAdmin
          .from("staff")
          .insert({
            user_id: userId,
            branch_id: branchUuid,
            full_name: data.fullName,
            email: email,
            role: data.role,
            is_active: true,
          });
        if (staffError) {
          throw new Error(staffError.message);
        }
        console.log(`✅ Created staff for existing auth user: ${email}`);
        return { id: userId, email: email };
      }
    } catch (err: any) {
      console.warn("Could not list auth users, creating new one:", err.message);
    }

    // 3. Create new auth user and staff record
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: data.role },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Could not create the account");
    }
    userId = created.user.id;

    const { error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        user_id: userId,
        branch_id: branchUuid,
        full_name: data.fullName,
        email: email,
        role: data.role,
        is_active: true,
      });
    if (staffError) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(staffError.message);
    }

    console.log(`✅ Created new staff account: ${email}`);
    return { id: userId, email: email };
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

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staff.user_id);
    if (deleteAuthError) throw new Error(deleteAuthError.message);

    const { error: deleteStaffError } = await supabaseAdmin
      .from("staff")
      .delete()
      .eq("id", data.id);
    if (deleteStaffError) throw new Error(deleteStaffError.message);

    return { ok: true };
  });
