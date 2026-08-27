import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/toto-data";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { signInWithMagicLink, error: authError, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${colors.gradientMint} 0%, ${colors.gradientPink} 50%, ${colors.gradientDeepPurple} 100%)` }}>
      {/* Decorative circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-40 right-60 w-16 h-16 rounded-full bg-white/5" />
        <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-white/8" />
        <div className="absolute bottom-40 left-40 w-12 h-12 rounded-full bg-white/5" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden p-8">
        <div className="text-center">
          <div
            className="mx-auto size-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            TE
          </div>
          <h1 className="mt-4 text-2xl font-bold" style={{ color: colors.textDark }}>
            Toto Empire
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Retail Management
          </p>
        </div>

        <div className="mt-6">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium" style={{ color: colors.textDark }}>
                  Email address
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
                    className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#F0EEF4] bg-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#5B3A96] focus:border-transparent transition"
                    style={{ color: colors.textDark }}
                  />
                </div>
                <p className="mt-2 text-xs" style={{ color: colors.textMuted }}>
                  We'll send you a magic link to sign in instantly.
                </p>
              </div>

              {authError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: colors.primary }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Magic Link
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
                We sent a magic link to <strong className="text-gray-900">{email}</strong>.
                Click the link to sign in.
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
          Only authorized staff can sign in. Contact your administrator if you need access.
        </div>
      </div>
    </div>
  );
}
