import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            response.cookies.set(name, value)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL;
  const isUserAdmin = user && adminEmail && user.email === adminEmail;

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    if (!isUserAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Handle Home and other User routes for Admin users
  // We allow /profile and /faq to be accessed by Admin
  const isUserRoute = 
    request.nextUrl.pathname === "/" || 
    request.nextUrl.pathname === "/tabungan" || 
    request.nextUrl.pathname === "/email-sync" || 
    request.nextUrl.pathname === "/link-telegram";

  if (isUserAdmin && isUserRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Redirect to dashboard if trying to access auth while logged in
  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    // If admin is logging in, they should go straight to /admin
    if (isUserAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
