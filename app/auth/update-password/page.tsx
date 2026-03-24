import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/app/auth/update-password/UpdatePasswordForm";

export const dynamic = "force-dynamic";

/**
 * Halaman ini muncul setelah user klik link "Reset password" di email.
 * User punya session sementara; isi password baru di sini, lalu diarahkan ke login.
 */
export default async function UpdatePasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?error=missing_code");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500 overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow delay-700" />
      </div>

      <div 
        id="update-pass-card"
        className="relative w-full max-w-sm rounded-[2.5rem] border border-white/50 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl transition-all duration-300"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">
            Reset Password
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 leading-relaxed max-w-[240px]">
            Mode pemulihan aman. Perbarui akses kamu.
          </p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
