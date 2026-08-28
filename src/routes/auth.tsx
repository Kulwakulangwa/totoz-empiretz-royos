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
      <div className="w-full max-w-[780px] rounded-[28px] bg-[#f3f3f5] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="rounded-[20px] bg-[#f7f7f9] p-5 shadow-[inset_0_0_0_1px_rgba(29,30,38,0.05)] sm:p-8">
          <div className="mx-auto mb-5 flex w-[76px] items-center justify-center rounded-xl border border-[#e4e3ea] bg-[#f3ecff] px-2 py-2.5">
            <div className="grid size-10 place-items-center rounded-md bg-gradient-to-br from-[#5B3A96] to-[#E93FA0] text-sm font-bold text-white">
              TE
            </div>
          </div>

          <div className="text-center">
            <div className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7a728c]">Toto Empire</div>
            <h1 className="mt-4 text-[34px] font-bold leading-tight text-[#23232d]">Staff sign in</h1>
          </div>

          <div className="mt-7 grid gap-5">
            <label className="grid gap-2">
              <span className="text-[15px] font-medium text-[#2b2b35]">Email</span>
              <input
                className={field}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[15px] font-medium text-[#2b2b35]">Password</span>
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
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#5B3A96] to-[#E93FA0] px-4 text-base font-semibold text-white shadow-[0_12px_24px_rgba(91,58,150,0.25)] transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "Please wait…" : "Sign in"}
            </button>
          </div>

          <p className="mt-7 text-center text-[14px] leading-relaxed text-[#6c6678]">
            Accounts are created by the owner. Contact the owner if you need access.
          </p>
        </div>
      </div>
    </main>
  );
}
