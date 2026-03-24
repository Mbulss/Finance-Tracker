import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ linked: false }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ linked: !!data?.chat_id });
}
