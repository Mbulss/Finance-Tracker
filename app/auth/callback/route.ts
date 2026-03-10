import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Base URL untuk redirect (sama dengan origin yang user pakai). */
function getBaseUrl(request: NextRequest): string {
  try {
    const u = new URL(request.url);
    if (u.origin && u.origin !== "null") return u.origin;
  } catch {
    // ignore
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Supabase redirects here after email confirmation or password reset.
 * - Email confirmation: tukar code (supaya email terkonfirmasi), lalu sign out & redirect ke login.
 *   User harus masuk lagi dengan password yang ia daftarkan.
 * - Password reset (type=recovery): tukar code, redirect ke app (bisa ganti password di Akun).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "recovery" = reset password (dari Supabase)
  const flow = searchParams.get("flow"); // "recovery" = kita kirim sendiri di redirectTo agar tetap ke form password baru
  const errorCode = searchParams.get("error_code");
  const errorDesc = searchParams.get("error_description");
  const baseUrl = getBaseUrl(request);

  if (!code) {
    const params = new URLSearchParams({ error: "missing_code" });
    if (errorCode === "otp_expired" || (errorDesc && /expired/i.test(errorDesc))) params.set("detail", "expired");
    return NextResponse.redirect(`${baseUrl}/auth?${params.toString()}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message, error.code);
    const isExpired = /expired|otp_expired/i.test(error.message) || error.code === "otp_expired";
    const params = new URLSearchParams({ error: "invalid_code" });
    if (isExpired) params.set("detail", "expired");
    return NextResponse.redirect(`${baseUrl}/auth?${params.toString()}`);
  }

  if (type === "recovery" || flow === "recovery") {
    return NextResponse.redirect(`${baseUrl}/auth/update-password`);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(`${baseUrl}/auth?confirmed=1`);
}
