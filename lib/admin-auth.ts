import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Checks if the current authenticated user matches the ADMIN_EMAIL.
 * This is meant for server-side verification (Server Actions/Components).
 */
export async function isAdmin() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!user || !adminEmail) return false;
  
  return user.email === adminEmail;
}
