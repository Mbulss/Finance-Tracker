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

  async function handleSubmit(e: React.FormEvent) {
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
      await supabase.auth.signOut();
      router.push("/auth?password_updated=1");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah password.";
      const code = typeof (err as { code?: string })?.code === "string" ? (err as { code: string }).code : "";
      let text = msg;
      if (code === "over_email_send_limit" || /rate limit|too many|1 hour|try again/i.test(msg)) {
        text = "Terlalu banyak percobaan. Tunggu sekitar 1 jam lalu coba lagi.";
      } else if (/weak password|password.*weak|terlalu lemah/i.test(msg)) {
        text = "Password terlalu lemah. Gunakan minimal 6 karakter dan kombinasi huruf/angka.";
      }
      setMessage({ type: "error", text });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Password baru
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 pr-11 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Min. 6 karakter"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
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
      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Konfirmasi password baru
        </label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 pr-11 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ulangi password baru"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200"
            aria-label={showConfirm ? "Sembunyikan" : "Tampilkan"}
          >
            {showConfirm ? (
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
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-income" : "text-expense"}`}>{message.text}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/30 disabled:opacity-50 active:scale-[0.98]"
      >
        {loading ? "Memproses..." : "Simpan password & masuk"}
      </button>
    </form>
  );
}
