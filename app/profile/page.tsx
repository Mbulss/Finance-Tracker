import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { ProfileContent } from "@/components/ProfileContent";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const isGoogleUser = (user.identities ?? []).some(
    (id: { provider?: string }) => id.provider === "google"
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">Akun</h1>
          <p className="mt-1 text-sm text-muted dark:text-slate-400">Lihat info akun dan ubah password.</p>
        </header>
        <ProfileContent email={user.email ?? ""} isGoogleUser={isGoogleUser} />
      </div>
    </DashboardLayout>
  );
}
