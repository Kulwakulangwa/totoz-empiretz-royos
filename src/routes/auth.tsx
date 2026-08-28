import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Toto Empire Retail" },
      {
        name: "description",
        content:
          "Sign in to Toto Empire to run the point of sale, manage inventory, returns, VAT receipts and branch reports.",
      },
      { property: "og:title", content: "Sign in | Toto Empire Retail" },
      {
        property: "og:description",
        content: "Secure staff sign-in for Toto Empire point of sale and shop management.",
      },
    ],
  }),
  component: AuthPage,
});

const field =
  "min-h-10 w-full rounded-md border border-[#e5e7eb] bg-[#f7f7fa] px-3 text-sm text-[#1f2333] outline-none transition focus:border-[#5b3a96] focus:ring-2 focus:ring-[#e9d6ff]";

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit() {
    if (!email.trim() || !password) {
      toast("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b0b10] px-4 py-12">
      <div className="w-full max-w-4xl rounded-[20px] bg-[#f3f3f5] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="grid items-center gap-6 md:grid-cols-[1.05fr_1fr]">
          <div className="rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
            <div className="mx-auto mb-5 flex w-[76px] items-center justify-center rounded-xl border border-[#e4e3ea] bg-[#f4f2fa] px-2 py-2.5">
              <div className="grid size-9 place-items-center rounded-md bg-gradient-to-br from-[#5B3A96] to-[#E93FA0] text-xs font-bold text-white">
                TE
              </div>
            </div>

            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a728c]">Toto Empire</div>
              <h1 className="mt-3 text-2xl font-bold text-[#23232d]">Staff sign in</h1>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-[#2b2b35]">Email</span>
                <input
                  className={field}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-[#2b2b35]">Password</span>
                <input
                  className={field}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Password"
                />
              </label>

              <button
                disabled={busy}
                onClick={submit}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#5B3A96] to-[#E93FA0] px-3.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(91,58,150,0.25)] transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {busy ? "Please wait…" : "Sign in"}
              </button>
            </div>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-[#6c6678]">
              Accounts are created by the owner. Contact the owner if you need access.
            </p>
          </div>

          <div className="hidden min-h-[420px] flex-col justify-center rounded-[18px] bg-[#f0f0f2] p-6 ring-1 ring-black/5 md:flex">
            <div className="mx-auto flex w-full max-w-xs flex-col gap-4 rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-[#7d7789]">
                <span>Toto Empire</span>
                <span className="rounded-full bg-[#efeaff] px-2 py-1 text-[#5B3A96]">Staff</span>
              </div>

              <div className="rounded-lg bg-[#f7f4fc] p-3">
                <div className="mb-2 text-xs font-medium text-[#5c5868]">Email</div>
                <div className="h-10 rounded-md border border-[#e4e1eb] bg-white" />
                <div className="mt-3 text-xs font-medium text-[#5c5868]">Password</div>
                <div className="mt-1 h-10 rounded-md border border-[#e4e1eb] bg-white" />
              </div>

              <button className="rounded-md bg-gradient-to-r from-[#5B3A96] to-[#E93FA0] px-4 py-2.5 text-sm font-semibold text-white">
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
