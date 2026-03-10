import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { FAQContent } from "@/components/FAQContent";

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">FAQ</h1>
          <p className="mt-1 text-sm text-muted dark:text-slate-400">
            Panduan singkat agar kamu bisa memakai Finance Tracker dengan lancar.
          </p>
        </header>
        <FAQContent />
      </div>
    </DashboardLayout>
  );
}
