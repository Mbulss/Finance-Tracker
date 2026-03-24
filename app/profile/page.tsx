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
      <div className="mx-auto max-w-6xl pb-20 px-4 sm:px-6">
        <ProfileContent email={user.email ?? ""} isGoogleUser={isGoogleUser} />
      </div>
    </DashboardLayout>
  );
}
