"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProfileContentProps {
  email: string;
  isGoogleUser?: boolean;
}

// --- ANIMATED TYPEWRITER COMPONENT ---
function Typewriter({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const fullText = phrases[index];
      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      if (!isDeleting && displayText === fullText) {
        setTimeout(() => setIsDeleting(true), 1500);
        setSpeed(100);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % phrases.length);
        setSpeed(150);
      }
    };

    const timer = setTimeout(handleType, speed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, phrases, speed]);

  return (
    <span className="text-slate-900 dark:text-white border-r-4 border-primary animate-blink pr-2">
      {displayText}
    </span>
  );
}

export function ProfileContent({ email, isGoogleUser = false }: ProfileContentProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password minimal 6 karakter." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Password dan konfirmasi tidak sama." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: "success", text: "Password berhasil dibuat. Sekarang kamu bisa masuk dengan email + password juga." });
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal membuat password.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!oldPassword.trim()) {
      setMessage({ type: "error", text: "Masukkan password lama untuk konfirmasi." });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password baru minimal 6 karakter." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Password baru dan konfirmasi tidak sama." });
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (signInError) {
        setMessage({ type: "error", text: "Password lama salah. Coba lagi." });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: "success", text: "Password berhasil diubah." });
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal mengubah password.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-8 sm:p-14 lg:p-16 animate-fade-in-up">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-40 dark:opacity-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
          <div className="space-y-8 flex-1">
            <div className="space-y-6">
               <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] border border-slate-200 dark:border-slate-700 mx-auto lg:mx-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Keamanan & Profil
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
               </div>
               <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                 Akun Kamu.
               </h1>
               <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 font-medium text-lg leading-relaxed">
                 Kelola informasi akun dan tingkatkan keamanan akses Anda. Data Anda tersimpan aman dan terenkripsi menggunakan teknologi Supabase.
               </p>
            </div>
          </div>

          <div className="shrink-0 relative group animate-float mx-auto lg:mx-0">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] group-hover:scale-110 transition-transform duration-700" />
             <div className="relative bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-[3.5rem] shadow-2xl ring-2 ring-slate-100 dark:ring-slate-800">
                <div className="text-slate-200 dark:text-slate-700">
                  <svg className="w-16 h-16 sm:w-24 sm:h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl shadow-lg">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* --- INFO AKUN CARD --- */}
        <section className="group relative flex flex-col rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-xl transition-all hover:-translate-y-1.5 hover:shadow-2xl animate-fade-in-up [animation-delay:200ms]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative flex flex-col gap-10 h-full">
            <div className="space-y-8 flex-1">
              <div className="flex items-center gap-5">
                <span className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-slate-50 dark:bg-slate-800 text-slate-400 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700/50 group-hover:rotate-12 transition-transform">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Info Akun</h2>
                  <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mt-2">Personal Identity</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group-hover:border-primary/20 transition-all">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">Email Address</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200 break-all">{email}</p>
                </div>

                <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-widest">Status Keamanan</p>
                    <p className="text-sm font-bold">Terproteksi SSL & AES-256</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                Tips: Jaga kerahasiaan password Anda dan jangan gunakan password yang sama dengan layanan lain.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECURITY & PASSWORD CARD --- */}
        <section className="group relative flex flex-col rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-xl transition-all hover:-translate-y-1.5 hover:shadow-2xl animate-fade-in-up [animation-delay:400ms]">
          <div className="relative flex flex-col gap-10 h-full">
            <div className="space-y-8 flex-1">
              <div className="flex items-center gap-5">
                <span className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10 group-hover:rotate-12 transition-transform">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </span>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {isGoogleUser ? "Buat Password" : "Ubah Password"}
                  </h2>
                  <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.25em] mt-2">Security Center</p>
                </div>
              </div>

              {isGoogleUser && (
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Kamu masuk dengan Google. Buat password baru jika ingin login menggunakan Email + Password juga.
                </p>
              )}

              {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-200 ${
                  message.type === "success" 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
                }`}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    {message.type === "success" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                  <p className="text-sm font-black">{message.text}</p>
                </div>
              )}

              <form onSubmit={isGoogleUser ? handleSetPassword : handleChangePassword} className="space-y-5">
                {!isGoogleUser && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password Lama</label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full pl-6 pr-12 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Masukkan password saat ini"
                        disabled={loading}
                      />
                      <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                        {showOldPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.046m2.458-2.547A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 12-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-6 pr-12 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Minimal 6 karakter"
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.046m2.458-2.547A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 12-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-6 pr-12 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Konfirmasi password baru"
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.046m2.458-2.547A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 12-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 rounded-[2rem] bg-primary text-white font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/25 disabled:opacity-50 relative overflow-hidden group/btn mt-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                  {loading ? "MEMPROSES..." : isGoogleUser ? "BUAT PASSWORD SEKARANG" : "SIMPAN PERUBAHAN"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
