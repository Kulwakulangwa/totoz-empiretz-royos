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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${colors.gradientMint} 0%, ${colors.gradientPink} 45%, ${colors.gradientDeepPurple} 100%)` }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-40 right-60 w-16 h-16 rounded-full bg-white/5" />
        <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-white/8" />
        <div className="absolute bottom-40 left-40 w-12 h-12 rounded-full bg-white/5" />
      </div>

      <div className="w-full max-w-md rounded-[28px] border border-white/30 bg-white/90 p-7 shadow-[0_20px_60px_rgba(91,58,150,0.22)] backdrop-blur-sm">
        <div className="text-center">
          <div
            className="mx-auto size-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            TE
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight" style={{ color: colors.textDark }}>
            Toto Empire
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: colors.textMuted }}>
            Staff sign in
          </p>
        </div>

        <div className="mt-6">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium" style={{ color: colors.textDark }}>
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5" style={{ color: colors.textMuted }} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#F0EEF4] bg-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#E93FA0] focus:border-transparent transition"
                    style={{ color: colors.textDark }}
                  />
                </div>
              </div>

              {authError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white font-semibold transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: colors.textDark }}>
                Check your inbox
              </h3>
              <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>
                We sent a sign-in link to <strong className="text-gray-900">{email}</strong>.
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

        <div className="mt-6 text-center text-xs" style={{ color: colors.textMuted }}>
          Accounts are created by the owner. Contact the owner if you need access.
        </div>
      </div>
    </div>
  );
}
