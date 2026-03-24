import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Query with regular client (RLS)
  const { data: withRLS, error: rlsError } = await supabase
    .from("telegram_links")
    .select("*")
    .eq("user_id", user.id);

  // Query with admin client (bypass RLS)
  const admin = createSupabaseAdmin();
  const { data: withAdmin, error: adminError } = await admin
    .from("telegram_links")
    .select("*")
    .eq("user_id", user.id);

  // Also check all rows (admin) to see what's actually in the table
  const { data: allRows } = await admin
    .from("telegram_links")
    .select("user_id, chat_id, created_at")
    .limit(10);

  return NextResponse.json({
    user_id: user.id,
    withRLS,
    rlsError,
    withAdmin,
    adminError,
    allRows_sample: allRows,
  });
}
