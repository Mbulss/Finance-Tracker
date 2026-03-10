import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { LinkTelegram } from "@/components/LinkTelegram";

export const dynamic = "force-dynamic";

export default async function LinkTelegramPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">Link Telegram</h1>
          <p className="mt-1 text-sm text-muted dark:text-slate-400">Hubungkan akun dengan bot Telegram agar transaksi dari bot masuk ke dashboard kamu.</p>
        </header>
        <LinkTelegram />
      </div>
    </DashboardLayout>
  );
}
