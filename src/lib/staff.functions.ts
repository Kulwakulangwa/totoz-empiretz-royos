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

    const email = data.email.toLowerCase().trim();
    const branchUuid = getBranchUuid(data.branch);
    if (!branchUuid) {
      throw new Error(`Invalid branch: ${data.branch}`);
    }

    // 1. Check existing staff by email (case‑insensitive)
    let { data: staffByEmail, error: findError } = await supabaseAdmin
      .from("staff")
      .select("id, user_id, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (findError) {
      console.error("Error checking staff by email:", findError);
      throw new Error("Database error while checking staff");
    }

    // If we found a staff record by email, handle it.
    if (staffByEmail) {
      if (staffByEmail.is_active) {
        throw new Error(`A staff account with email ${email} already exists and is active.`);
      } else {
        // Reactivate
        const { error: updateError } = await supabaseAdmin
          .from("staff")
          .update({
            full_name: data.fullName,
            branch_id: branchUuid,
            role: data.role,
            is_active: true,
          })
          .eq("id", staffByEmail.id);
        if (updateError) throw updateError;
        console.log(`✅ Reactivated inactive staff: ${email}`);
        return { id: staffByEmail.id, email: email };
      }
    }

    // 2. No staff by email – find auth user by email (case‑insensitive)
    let authUserId: string | null = null;
    try {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
      }
    } catch (err) {
      console.warn("Could not list auth users, will create new one:", err);
    }

    // If we found an auth user, check if there is already a staff record for that user_id
    if (authUserId) {
      const { data: staffByUserId, error: userIdCheckError } = await supabaseAdmin
        .from("staff")
        .select("id, is_active")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (userIdCheckError) {
        console.error("Error checking staff by user_id:", userIdCheckError);
      }

      if (staffByUserId) {
        // Staff record exists for this user_id – update it (reactivate)
        const { error: updateError } = await supabaseAdmin
          .from("staff")
          .update({
            full_name: data.fullName,
            branch_id: branchUuid,
            role: data.role,
            email: email, // ensure email is updated to the lowercased version
            is_active: true,
          })
          .eq("id", staffByUserId.id);
        if (updateError) throw updateError;
        console.log(`✅ Updated existing staff for auth user: ${email}`);
        return { id: staffByUserId.id, email: email };
      }

      // No staff record – create one for this auth user
      const { error: staffError } = await supabaseAdmin
        .from("staff")
        .insert({
          user_id: authUserId,
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
      return { id: authUserId, email: email };
    }

    // 3. No auth user – create new auth user and staff record
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: data.role },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Could not create the account");
    }
    const newUserId = created.user.id;

    const { error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        user_id: newUserId,
        branch_id: branchUuid,
        full_name: data.fullName,
        email: email,
        role: data.role,
        is_active: true,
      });
    if (staffError) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(staffError.message);
    }

    console.log(`✅ Created new staff account: ${email}`);
    return { id: newUserId, email: email };
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
