import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Supabase redirects here after email confirmation or password reset.
 * - Email confirmation: tukar code (supaya email terkonfirmasi), lalu sign out & redirect ke login.
 *   User harus masuk lagi dengan password yang ia daftarkan.
 * - Password reset (type=recovery): tukar code, redirect ke app (bisa ganti password di Profil).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type"); // "recovery" = reset password

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message, error.code);
    const isExpired = /expired|otp_expired/i.test(error.message) || error.code === "otp_expired";
    const params = new URLSearchParams({ error: "invalid_code" });
    if (isExpired) params.set("detail", "expired");
    return NextResponse.redirect(new URL(`/auth?${params.toString()}`, request.url));
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth/update-password", request.url));
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth?confirmed=1", request.url));
}
