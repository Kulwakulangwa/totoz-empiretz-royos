import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBranchIdFromUuid, getBranchUuid, shopIds, type ShopId } from "@/lib/toto-data";

export type StaffAccount = {
  id: string;
  email: string;
  fullName: string;
  branch: string;
  role: "owner" | "manager" | "cashier";
  createdAt: string;
  isActive: boolean;
};

type ActorProfile = {
  role: "owner" | "manager" | "cashier";
  branchId: string;
};

const branchSchema = z.custom<ShopId>(
  (value) => typeof value === "string" && shopIds.includes(value as ShopId),
  "Invalid branch",
);

async function getActorProfile(context: any): Promise<ActorProfile> {
  const { supabase, userId } = context;
  const { data, error } = await supabase
    .from("staff")
    .select("role, branch_id")
    .eq("user_id", userId)
    .single();
  if (error || !data) {
    throw new Response("Forbidden - staff access required", { status: 403 });
  }

  return {
    role: data.role as "owner" | "manager" | "cashier",
    branchId: data.branch_id,
  };
}

async function assertStaffAdmin(context: any) {
  const actor = await getActorProfile(context);
  if (actor.role !== "owner" && actor.role !== "manager") {
    throw new Response("Forbidden - owner or manager access required", { status: 403 });
  }
  return actor;
}

function assertManagerCanManageBranch(actor: ActorProfile, branchUuid: string) {
  if (actor.role === "manager" && actor.branchId !== branchUuid) {
    throw new Response("Forbidden - managers can only manage their assigned branch", { status: 403 });
  }
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAccount[]> => {
    const actor = await assertStaffAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("staff")
      .select("*");
    if (actor.role === "manager") {
      query = query.eq("branch_id", actor.branchId).eq("role", "cashier");
    }

    const { data: staff, error: staffError } = await query;
    if (staffError) throw new Error(staffError.message);
    const staffRows = staff ?? [];

    return staffRows.map((s) => ({
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
        branch: branchSchema,
        role: z.enum(["owner", "manager", "cashier"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const actor = await assertStaffAdmin(context);
    if (actor.role === "manager" && data.role !== "cashier") {
      throw new Response("Forbidden - managers can only create cashier accounts", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase().trim();
    const branchUuid = getBranchUuid(data.branch);
    assertManagerCanManageBranch(actor, branchUuid);

    // 1. Check existing staff by email (case-insensitive)
    let { data: staffByEmail, error: findError } = await supabaseAdmin
      .from("staff")
      .select("id, user_id, branch_id, role, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (findError) {
      console.error("Error checking staff by email:", findError);
      throw new Error("Database error while checking staff");
    }

    if (staffByEmail) {
      if (actor.role === "manager" && (staffByEmail.branch_id !== actor.branchId || staffByEmail.role !== "cashier")) {
        throw new Response("Forbidden - managers can only reactivate cashiers in their assigned branch", { status: 403 });
      }

      if (staffByEmail.is_active) {
        throw new Error(`A staff account with email ${email} already exists and is active.`);
      }

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
      console.info("Reactivated inactive staff account");
      return { id: staffByEmail.id, email };
    }

    // 2. No staff by email – find auth user by email (case-insensitive)
    let authUserId: string | null = null;
    try {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingAuthUser = authUsers?.users?.find((u) => u.email?.toLowerCase() === email);
      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
      }
    } catch (err) {
      console.warn("Could not list auth users, will create new one:", err);
    }

    if (authUserId) {
      const { data: staffByUserId, error: userIdCheckError } = await supabaseAdmin
        .from("staff")
        .select("id, branch_id, role, is_active")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (userIdCheckError) {
        console.error("Error checking staff by user_id:", userIdCheckError);
      }

      if (staffByUserId) {
        if (actor.role === "manager" && (staffByUserId.branch_id !== actor.branchId || staffByUserId.role !== "cashier")) {
          throw new Response("Forbidden - managers can only update cashiers in their assigned branch", { status: 403 });
        }

        const { error: updateError } = await supabaseAdmin
          .from("staff")
          .update({
            full_name: data.fullName,
            branch_id: branchUuid,
            role: data.role,
            email,
            is_active: true,
          })
          .eq("id", staffByUserId.id);
        if (updateError) throw updateError;
        console.info("Updated existing staff account");
        return { id: staffByUserId.id, email };
      }

      const { error: staffError } = await supabaseAdmin
        .from("staff")
        .upsert(
          {
            user_id: authUserId,
            branch_id: branchUuid,
            full_name: data.fullName,
            email,
            role: data.role,
            is_active: true,
          },
          { onConflict: "user_id" },
        );
      if (staffError) {
        throw new Error(staffError.message);
      }
      console.info("Created staff profile for existing auth user");
      return { id: authUserId, email };
    }

    // 3. No auth user – create new auth user and staff record
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
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
      .upsert(
        {
          user_id: newUserId,
          branch_id: branchUuid,
          full_name: data.fullName,
          email,
          role: data.role,
          is_active: true,
        },
        { onConflict: "user_id" },
      );
    if (staffError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(staffError.message);
    }

    console.info("Created new staff account");
    return { id: newUserId, email };
  });

export const deleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const actor = await assertStaffAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: staff, error: staffFindError } = await supabaseAdmin
      .from("staff")
      .select("user_id, role, branch_id")
      .eq("id", data.id)
      .single();
    if (staffFindError || !staff) {
      throw new Error("Staff record not found");
    }

    if (staff.user_id === context.userId) {
      throw new Error("You cannot remove your own account");
    }

    if (actor.role === "manager") {
      if (staff.role !== "cashier") {
        throw new Response("Forbidden - managers can only remove cashier accounts", { status: 403 });
      }
      if (staff.branch_id !== actor.branchId) {
        throw new Response("Forbidden - managers can only remove cashiers in their assigned branch", { status: 403 });
      }
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staff.user_id);
    if (deleteAuthError) throw new Error(deleteAuthError.message);

    const { error: deleteStaffError } = await supabaseAdmin.from("staff").delete().eq("id", data.id);
    if (deleteStaffError) throw new Error(deleteStaffError.message);

    return { ok: true };
  });
