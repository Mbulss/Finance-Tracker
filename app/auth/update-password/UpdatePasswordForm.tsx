"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password minimal 8 karakter demi keamanan." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Password konfirmasi tidak cocok." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/auth?password_updated=1");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah password.";
      const code = typeof (err as { code?: string })?.code === "string" ? (err as { code: string }).code : "";
      let text = msg;
      if (code === "over_email_send_limit" || /rate limit|too many|1 hour|try again/i.test(msg)) {
        text = "Terlalu banyak percobaan. Tunggu sekitar 1 jam.";
      } else if (/weak password|password.*weak|terlalu lemah/i.test(msg)) {
        text = "Password terlalu lemah. Gunakan kombinasi lebih rumit.";
      }
      setMessage({ type: "error", text });
      
      const form = document.getElementById("update-pass-card");
      if (form) {
        form.classList.add("animate-shake");
        setTimeout(() => form.classList.remove("animate-shake"), 500);
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="ml-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Password Baru
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-[1.25rem] border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 dark:text-slate-100 px-5 py-3 pr-12 text-sm font-bold shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
            placeholder="Min. 8 Karakter"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            {showPassword ? (
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        
        {password.length > 0 && (
          <div className="mt-2 px-5 space-y-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step <= strength ? 
                    (strength <= 1 ? "bg-rose-500" : strength <= 3 ? "bg-amber-500" : "bg-emerald-500") : 
                    "bg-slate-100 dark:bg-slate-800"}`} 
                />
              ))}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Keamanan: {strength <= 1 ? "Lemah" : strength <= 3 ? "Medium" : "Tinggi"}</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="ml-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Konfirmasi Password
        </label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-[1.25rem] border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 dark:text-slate-100 px-5 py-3 pr-12 text-sm font-bold shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
            placeholder="Ulangi Password Baru"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            {showConfirm ? (
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mx-1 rounded-xl border p-3 animate-in slide-in-from-bottom-2 duration-300 ${
          message.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
        }`}>
          <p className="text-[10px] font-black text-center leading-relaxed">
            {message.text}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group relative h-14 w-full overflow-hidden rounded-[1.25rem] bg-primary font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-xl shadow-primary/30 transition-all hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <span className="relative z-10 flex items-center justify-center gap-2 text-center w-full">
          {loading ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : null}
          {loading ? "Menyimpan..." : "Update & Akses"}
        </span>
      </button>

    </form>
  );
}
