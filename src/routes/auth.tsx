import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

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
  "min-h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name.trim() || email.trim() },
          },
        });
        if (error) throw error;
        toast("Account created", { description: "You can sign in now." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            TE
          </div>
          <div>
            <h1 className="text-[15px] leading-none font-semibold tracking-tight">Toto Empire</h1>
            <p className="mt-1.5 text-[12px] text-muted-foreground">Staff sign in</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-border bg-card p-1">
          {(["signin", "signup"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={cn(
                "min-h-8 rounded-md text-[13px] font-medium transition-colors",
                mode === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {option === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {mode === "signup" && (
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium text-muted-foreground">Full name</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground">Email</span>
            <input
              className={field}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground">Password</span>
            <input
              className={field}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </label>
          <button
            disabled={busy}
            onClick={submit}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <div className="relative py-1 text-center text-[11px] text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>
          <button
            onClick={google}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent"
          >
            Continue with Google
          </button>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          The first account created becomes the Owner. Every account after that starts as a Cashier
          limited to the point of sale.
        </p>
      </div>
    </main>
  );
}
