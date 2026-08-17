import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const branchIds = ["toto", "sunnozy1", "sunnozy2", "mimis", "marc"] as const;

export type StaffAccount = {
  id: string;
  email: string;
  fullName: string;
  branch: string;
  role: "owner" | "cashier";
  createdAt: string;
};

async function assertOwner(supabase: {
  from: (t: "user_roles") => {
    select: (c: string) => { eq: (c: string, v: string) => Promise<{ data: { role: string }[] | null }> };
  };
}, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isOwner = (data ?? []).some((r) => r.role === "owner");
  if (!isOwner) throw new Response("Forbidden", { status: 403 });
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAccount[]> => {
    await assertOwner(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: users, error: usersError }, profilesRes, rolesRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("profiles").select("id, full_name, branch, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (usersError) throw usersError;
    if (profilesRes.error) throw profilesRes.error;
    if (rolesRes.error) throw rolesRes.error;

    const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const roles = new Map<string, "owner" | "cashier">();
    for (const r of rolesRes.data ?? []) {
      const role = r.role as "owner" | "cashier";
      if (role === "owner" || !roles.has(r.user_id)) roles.set(r.user_id, role);
    }

    return (users.users ?? []).map((u) => {
      const profile = profiles.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        fullName: profile?.full_name ?? u.email ?? "",
        branch: profile?.branch ?? "toto",
        role: roles.get(u.id) ?? "cashier",
        createdAt: u.created_at,
      };
    });
  });

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6).max(72),
        fullName: z.string().trim().min(1).max(80),
        branch: z.enum(branchIds),
        role: z.enum(["owner", "cashier"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");
    const id = created.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id, full_name: data.fullName, branch: data.branch });
    if (profileError) throw profileError;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: id, role: data.role });
    if (roleError) throw roleError;

    return { id, email: data.email };
  });

export const deleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertOwner(context.supabase as never, context.userId);
    if (data.id === context.userId) throw new Error("You cannot remove your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw error;
    return { ok: true };
  });
