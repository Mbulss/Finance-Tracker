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
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
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
        if (!otpRequested) {
          if (!email.includes("@")) throw new Error("Format email tidak valid.");
          const resetRedirectTo = `${redirectTo}?flow=recovery`;
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectTo });
          if (error) throw error;
          setMessage(""); // Kosongkan pesan notifikasi hijau agar tidak double dengan box orange
          setOtpRequested(true);
        } else {
          if (otp.length !== 8) throw new Error("Kode OTP harus 8 digit angka.");
          const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
          if (error) throw error;
          willRedirect = true;
          setMessage("Kode berhasil diverifikasi! Mengalihkan ke pembaruan sandi...");
          router.push('/auth/update-password');
          return;
        }
      } else if (isSignUp) {
        if (!otpRequested) {
          if (password !== confirmPassword) throw new Error("Password konfirmasi tidak cocok.");
          if (password.length < 8) throw new Error("Password minimal 8 karakter demi keamanan.");
          const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
          if (error) throw error;
          setOtpRequested(true);
          setMessage("");
        } else {
          if (otp.length !== 8) throw new Error("Kode OTP harus 8 digit angka.");
          const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
          if (error) throw error;
          willRedirect = true;
          setMessage("Akun berhasil diverifikasi! Mengalihkan ke Dashboard...");
          router.push("/");
          router.refresh();
          return;
        }
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
      // Triger shake animation on error
      const form = document.getElementById("auth-form-card");
      if (form) {
        form.classList.add("animate-shake");
        setTimeout(() => form.classList.remove("animate-shake"), 500);
      }
    } finally {
      if (!willRedirect) setLoading(false);
    }
  }

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(password);

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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500 overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-white/5 dark:bg-slate-900/5 blur-[100px]" />
      </div>
      
      <div 
        id="auth-form-card"
        className="relative w-full max-w-sm rounded-[2.5rem] border border-white/50 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl transition-all duration-300"
      >
        {/* Theme Toggle Inside Card */}
        <div className="absolute right-6 top-6 z-20">
          <ThemeToggle />
        </div>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <img src="/logo.png" alt="" className="relative h-14 w-14 rounded-[1.5rem] object-contain shadow-lg" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">
            Finance Tracker AI
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Secure Wealth Assistant
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="group relative flex w-full items-center justify-center gap-2.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 py-3 font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="h-4 w-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "Menghubungkan..." : "Masuk dengan Google"}
        </button>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-100 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-center">
            <span className="bg-white dark:bg-slate-900 px-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-300 dark:text-slate-600">
              Otentikasi Email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {otpRequested ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 relative py-2">
              <label htmlFor="otp" className="text-center block text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
                {isSignUp ? "Verifikasi Akun Baru" : "Masukkan Kode OTP"}
              </label>
              
              <div className="relative flex justify-center gap-1.5 sm:gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
                  const digit = otp[index] || "";
                  const isActive = otp.length === index;
                  return (
                    <div 
                      key={index}
                      className={`relative flex h-12 w-9 sm:h-14 sm:w-10 items-center justify-center rounded-xl border-2 text-xl font-black transition-all duration-300 ${
                        isActive 
                          ? "border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] scale-110 z-10" 
                          : digit 
                            ? "border-primary/50 bg-primary/5 text-slate-900 dark:text-white"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400"
                      }`}
                    >
                      {digit}
                      {isActive && <div className="absolute w-0.5 h-1/2 bg-primary animate-pulse rounded-full" />}
                    </div>
                  );
                })}
                {/* Hidden overlay input to capture typing naturally (works with iOS AutoFill OTP) */}
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData("text");
                    const digits = pastedText.replace(/\D/g, "");
                    if (digits) {
                      e.preventDefault();
                      setOtp(digits.slice(0, 8));
                    }
                  }}
                  required
                  className="absolute inset-0 w-full h-full cursor-text z-20 outline-none border-none focus:ring-0 bg-transparent text-transparent caret-transparent"
                  style={{ color: "transparent", textShadow: "0 0 0 transparent" }}
                />
              </div>

              <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-center">
                 <p className="text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-500 leading-relaxed">
                   Cek pesan masuk di email <span className="text-slate-900 dark:text-white font-black">{email}</span>. <br className="hidden sm:block" />
                   {isSignUp ? "Gunakan 8 angka pendaftaran kamu." : "Ketik 8 angkanya di atas." } <br />
                   <span className="underline decoration-amber-500/50 underline-offset-2">Abaikan tombol link di email.</span>
                 </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="email" className="ml-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-[1.25rem] border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 dark:text-slate-100 px-5 py-3 text-sm font-bold shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                placeholder="nama@email.com"
              />
            </div>
          )}

          {!otpRequested && !isForgotPassword && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label htmlFor="password" className="ml-3 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setMessage(""); }}
                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
                  >
                    Lupa?
                  </button>
                </div>
                <div className="relative group">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-[1.25rem] border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 dark:text-slate-100 px-5 py-3 pr-12 text-sm font-bold shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {isSignUp && password.length > 0 && (
                  <div className="mt-1.5 px-4 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div 
                          key={step} 
                          className={`h-1 flex-1 rounded-full transition-all duration-500 ${step <= strength ? 
                            (strength <= 1 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : 
                             strength <= 3 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : 
                             "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]") : 
                            "bg-slate-100 dark:bg-slate-800"}`} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-1.5 animate-in slide-in-from-top-4 duration-300">
                  <label htmlFor="confirmPassword" className="ml-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Konfirmasi
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={isSignUp}
                      className="w-full rounded-[1.25rem] border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 dark:text-slate-100 px-5 py-3 pr-12 text-sm font-bold shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {message && (
            <div className={`mx-1 rounded-xl border p-3 animate-in slide-in-from-bottom-2 duration-300 ${
              message.includes("dikirim") || message.includes("berhasil") 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            }`}>
              <p className="text-[10px] font-black text-center leading-relaxed">
                {message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative h-14 w-full overflow-hidden rounded-[1.25rem] bg-primary font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-xl shadow-primary/30 transition-all hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : null}
              {loading
                ? (isForgotPassword ? (otpRequested ? "Memverifikasi..." : "Mengirim...") : isSignUp ? "Mendaftar..." : "Proses...")
                : isForgotPassword
                  ? (otpRequested ? "Verifikasi OTP" : "Kirim Kode OTP")
                  : isSignUp
                    ? "Buat Akun"
                    : "Akses Dashboard"}
            </span>
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-3 text-center">
          {isForgotPassword || (isSignUp && otpRequested) ? (
            <button
              type="button"
              onClick={() => { 
                setIsForgotPassword(false); 
                setIsSignUp(false);
                setOtpRequested(false); 
                setOtp(""); 
                setMessage(""); 
              }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all underline underline-offset-4 decoration-slate-200 dark:decoration-slate-800"
            >
              ← Kembali ke Menu Awal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setIsSignUp((v) => !v); setMessage(""); setConfirmPassword(""); }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all underline underline-offset-4 decoration-slate-200 dark:decoration-slate-800"
            >
              {isSignUp ? "Jadi Anggota? Masuk" : "Belum Bergabung? Daftar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
