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
    <div className="relative flex min-h-screen items-center justify-center bg-auth-hero p-4">
      <div className="relative w-full max-w-md animate-fade-in-up rounded-2xl border border-border dark:border-slate-700 bg-card/95 dark:bg-slate-800/95 p-8 shadow-card backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg shadow-primary/25">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Password baru</span>
        </div>
        <p className="mb-6 text-center text-sm text-muted dark:text-slate-400">
          Kamu buka link reset password. Isi password baru di bawah, lalu masuk dengan password itu.
        </p>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
