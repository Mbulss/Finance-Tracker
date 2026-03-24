"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

function getAuthRedirectUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
  return process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    : "https://finance-tracker-gamma-livid.vercel.app/auth/callback";
}

const CALLBACK_ERROR_MSG: Record<string, string> = {
  missing_code: "Link tidak lengkap. Coba klik lagi dari email atau minta kirim ulang.",
  invalid_code: "Link kedaluwarsa atau sudah dipakai. Gunakan Masuk (jika sudah punya akun) atau minta link baru lewat Daftar / Lupa password.",
};

/** Pesan error auth Supabase → teks Indonesia yang konsisten */
function getFriendlyAuthError(err: unknown, context: "login" | "signup" | "forgot"): string {
  const msg = err instanceof Error ? err.message : String(err ?? "Terjadi kesalahan.");
  const code = typeof (err as { code?: string })?.code === "string" ? (err as { code: string }).code : "";
  const lower = msg.toLowerCase();

  // Rate limit (kirim email terlalu sering / coba login terlalu sering)
  if (
    code === "over_email_send_limit" ||
    /rate limit|too many|terlalu banyak|try again in|1 hour|1 jam|429/i.test(msg) ||
    lower.includes("hour") && /try again|tunggu|coba lagi/i.test(msg)
  ) {
    return "Terlalu banyak percobaan. Tunggu sekitar 1 jam lalu coba lagi.";
  }

  // Email sudah terdaftar (biasanya saat daftar)
  if (
    code === "user_already_exists" ||
    /already registered|already exists|sudah terdaftar|sering digunakan|in use/i.test(lower)
  ) {
    return "Email ini sudah terdaftar. Silakan Masuk atau gunakan Lupa password.";
  }

  // Email belum dikonfirmasi (saat login)
  if (code === "email_not_confirmed" || /email not confirmed|belum dikonfirmasi|confirm your email/i.test(lower)) {
    return "Email belum dikonfirmasi. Cek inbox (dan folder spam) untuk link konfirmasi dari kami.";
  }

  // Kredensial salah (login)
  if (
    code === "invalid_credentials" ||
    /invalid login|invalid credentials|email.*password|credentials/i.test(lower)
  ) {
    return "Email atau password salah. Cek lagi atau gunakan Lupa password.";
  }

  // Link/OTP kedaluwarsa
  if (code === "otp_expired" || /expired|kedaluwarsa|invalid.*link/i.test(lower)) {
    return "Link sudah kedaluwarsa. Minta link baru lewat Daftar ulang atau Lupa password.";
  }

  return msg || "Terjadi kesalahan. Coba lagi atau gunakan Lupa password.";
}

function getHashError(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const code = params.get("error_code");
  if (code === "otp_expired" || params.get("error") === "access_denied") {
    return "Link dari email sudah kedaluwarsa (link cuma berlaku ±1 jam). Minta kirim ulang: daftar ulang atau pakai \"Lupa password?\".";
  }
  return params.get("error_description")?.replace(/\+/g, " ") ?? "Link tidak valid. Coba minta kirim ulang.";
}

export function AuthForm({
  callbackError,
  callbackErrorDetail,
  confirmed,
  passwordUpdated,
}: {
  callbackError?: string | null;
  callbackErrorDetail?: string | null;
  confirmed?: boolean;
  passwordUpdated?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const getInitialMessage = () => {
    if (passwordUpdated) return "Password berhasil diubah. Silakan masuk dengan password baru.";
    if (confirmed) return "Email berhasil dikonfirmasi. Silakan masuk dengan email dan password yang kamu daftarkan.";
    if (callbackError) {
      if (callbackError === "invalid_code" && callbackErrorDetail === "expired") {
        return "Link sudah kedaluwarsa (link hanya berlaku ±1 jam). Minta link baru lewat Lupa password atau Daftar ulang.";
      }
      return CALLBACK_ERROR_MSG[callbackError] ?? "Terjadi kesalahan.";
    }
    return "";
  };
  const [message, setMessage] = useState(getInitialMessage());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const hashError = getHashError();
    if (hashError) {
      setMessage(hashError);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const redirectTo = getAuthRedirectUrl();
    let willRedirect = false;
    try {
      if (isForgotPassword) {
        const resetRedirectTo = `${redirectTo}?flow=recovery`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectTo });
        if (error) throw error;
        setMessage("Cek email kamu untuk link reset password. Kalau belum muncul, cek folder spam.");
        setEmail("");
        setIsForgotPassword(false);
      } else if (isSignUp) {
        if (password !== confirmPassword) {
          setMessage("Password dan konfirmasi password tidak sama.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setMessage("Password minimal 6 karakter.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        setMessage("Cek email kamu untuk konfirmasi pendaftaran. Link akan mengarah ke dashboard.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        willRedirect = true;
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const context = isForgotPassword ? "forgot" : isSignUp ? "signup" : "login";
      setMessage(getFriendlyAuthError(err, context));
    } finally {
      if (!willRedirect) setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage("");
    setLoading(true);
    const redirectTo = getAuthRedirectUrl();
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err: unknown) {
      setMessage(getFriendlyAuthError(err, "login"));
    }
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-auth-hero p-4">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
        <div className="absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
      </div>
      <div className="relative w-full max-w-md animate-fade-in-up rounded-2xl border border-border dark:border-slate-700 bg-card/95 dark:bg-slate-800/95 p-8 shadow-card backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="" className="h-14 w-14 rounded-2xl object-contain" />
          <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Finance Tracker AI</span>
        </div>
        <p className="mb-6 text-center text-sm text-muted dark:text-slate-400">Kelola keuangan kamu dengan mudah</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 py-3.5 font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 active:scale-[0.98]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "Sedang mengalihkan..." : "Masuk dengan Google"}
        </button>

        <div className="relative py-2">
          <span className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border dark:border-slate-600" />
          </span>
          <span className="relative flex justify-center text-xs text-muted dark:text-slate-400">
            atau dengan email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="kamu@example.com"
            />
          </div>
          {!isForgotPassword && (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setMessage(""); }}
                    className="text-xs text-primary hover:underline dark:text-sky-400"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 pr-11 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Konfirmasi password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={isSignUp}
                      className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 pr-11 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ulangi password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                      aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {message && (
            <p
              className={`text-sm ${
                message.includes("Cek email") ||
                  message.includes("spam") ||
                  message.includes("berhasil dikonfirmasi") ||
                  message.includes("berhasil diubah")
                  ? "text-income"
                  : "text-expense"
              }`}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/30 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading
              ? (isForgotPassword ? "Mengirim..." : isSignUp ? "Mendaftar..." : "Sedang masuk...")
              : isForgotPassword
                ? "Kirim link reset"
                : isSignUp
                  ? "Daftar"
                  : "Masuk"}
          </button>
        </form>
        {isForgotPassword ? (
          <button
            type="button"
            onClick={() => { setIsForgotPassword(false); setMessage(""); }}
            className="mt-4 w-full text-sm text-muted transition hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400"
          >
            ← Kembali ke masuk
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setIsSignUp((v) => !v); setMessage(""); setConfirmPassword(""); }}
            className="mt-4 w-full text-sm text-muted transition hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400"
          >
            {isSignUp ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
          </button>
        )}
      </div>
    </div>
  );
}
