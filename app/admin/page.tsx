import { getAdminStats } from "@/app/actions/admin-actions";
import { AdminOverview } from "@/components/Admin/AdminOverview";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  // Triple-check security at the page level
  if (!(await isAdmin())) {
    redirect("/");
  }

  const data = await getAdminStats();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <AdminOverview data={data} />
      </div>
    </DashboardLayout>
  );
}
