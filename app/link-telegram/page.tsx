import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { LinkTelegram } from "@/components/LinkTelegram";

export const dynamic = "force-dynamic";

export default async function LinkTelegramPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const admin = createSupabaseAdmin();
  const { data: telegramLink } = await admin
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <LinkTelegram initialLinked={!!telegramLink?.chat_id} />
      </div>
    </DashboardLayout>
  );
}
