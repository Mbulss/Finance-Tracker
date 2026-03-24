import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { TabunganContent } from "@/components/TabunganContent";

export const dynamic = "force-dynamic";

export default async function TabunganPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Gunakan admin client untuk bypass RLS pada tabel telegram_links
  const admin = createSupabaseAdmin();
  const { data: telegramLink } = await admin
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isTelegramLinked = !!telegramLink?.chat_id;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">Tabungan</h1>
          <p className="mt-1 text-sm text-muted dark:text-slate-400">
            Uang dingin — setor dan tarik kapan saja. Pencatatan terpisah dari pemasukan/pengeluaran harian.
          </p>
        </header>
        <TabunganContent userId={user.id} initialTelegramLinked={isTelegramLinked} />
      </div>
    </DashboardLayout>
  );
}
