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
        <header className="mb-2">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase transform-gpu">
            Tabungan <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-400 will-change-transform">Masa Depan</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] transform-gpu">
            Uang dingin — setor dan tarik kapan saja. Pencatatan terpisah dari arus kas harian.
          </p>
        </header>
        <TabunganContent userId={user.id} initialTelegramLinked={isTelegramLinked} />
      </div>
    </DashboardLayout>
  );
}
