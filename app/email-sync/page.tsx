import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { EmailSyncManager } from "@/components/EmailSyncManager";

export const dynamic = "force-dynamic";

export default async function EmailSyncPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">Email Otomatis (Gmail API)</h1>
          <p className="mt-1 text-sm text-muted dark:text-slate-400">
            Hubungkan akun Gmail Anda agar sistem otomatis melacak dan merekam setiap pengeluaran dari notifikasi email BCA dan Mandiri Anda.
          </p>
        </header>

        <section className="rounded-2xl border border-border dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 text-sm text-slate-700 dark:text-slate-200">
          <p className="font-medium text-slate-800 dark:text-slate-100 mb-2">Penting sebelum mulai:</p>
          <ul className="list-disc list-inside space-y-1 text-muted dark:text-slate-300">
             <li>Pastikan Anda sudah mengaktifkan e-receipt/Notifikasi Email di aplikasi <strong>Livin&apos; Mandiri</strong> dan <strong>myBCA</strong> Anda.</li>
             <li>Sistem akan menyaring email masuk yang hanya berasal dari BCA dan Mandiri terkait bukti transfer/QRIS, lalu menambahkannya ke rekap pengeluaran.</li>
          </ul>
        </section>

        {/* Client Component Button & State */}
        <EmailSyncManager />
      </div>
    </DashboardLayout>
  );
}


