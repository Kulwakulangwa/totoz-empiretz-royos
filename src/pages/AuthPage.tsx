import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/lib/toto-data";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { signInWithMagicLink, error: authError, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate({ to: "/dashboard" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    const { error } = await signInWithMagicLink(email);
    setIsLoading(false);
    if (!error) {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0d] px-4 py-8 text-[#1f1f26] flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-[20px] bg-[#f4f4f6] p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
        <div className="grid items-center gap-6 md:grid-cols-[1.05fr_1fr]">
          <div className="rounded-[18px] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
            <div className="mx-auto mb-5 flex w-[72px] items-center justify-center rounded-xl border border-[#e4e3ea] bg-[#f4f2fa] px-2 py-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                }}
              >
                TE
              </div>
            </div>

            <div className="text-center">
              <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#7a728c]">Toto Empire</div>
              <h1 className="mt-3 text-2xl font-bold text-[#23232d]">Staff sign in</h1>
            </div>

            <div className="mt-6">
              {!sent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#2b2b35]">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full rounded-md border border-[#dfe0e6] bg-[#f9f9fb] px-3 py-2.5 text-sm text-[#1d1d26] outline-none transition focus:border-[#6b48b5] focus:ring-2 focus:ring-[#e7d9ff]"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#2b2b35]">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="Password"
                      className="w-full rounded-md border border-[#dfe0e6] bg-[#f9f9fb] px-3 py-2.5 text-sm text-[#1d1d26] outline-none transition focus:border-[#6b48b5] focus:ring-2 focus:ring-[#e7d9ff]"
                    />
                  </div>

                  {authError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(91,58,150,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Mail className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#23232d]">Check your inbox</h3>
                  <p className="mt-2 text-sm text-[#5c5868]">
                    We sent a sign-in link to <strong className="text-[#1d1d26]">{email}</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                    }}
                    className="mt-4 text-sm font-medium text-[#5B3A96] hover:underline"
                  >
                    ← Back to login
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 text-center text-[11px] text-[#7a728c]">
              Accounts are created by the owner. Contact the owner if you need access.
            </div>
          </div>

          <div className="hidden md:flex h-full min-h-[420px] flex-col justify-center rounded-[18px] bg-[#f0f0f2] p-6 ring-1 ring-black/5">
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
              <button
                className="rounded-md px-4 py-2.5 text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
