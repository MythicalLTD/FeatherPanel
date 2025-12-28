import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[DEBUG] [SSR] [proxy] Requested route:", pathname);

  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/setup-2fa",
    "/auth/verify-2fa",
    "/auth/logout",
  ];

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  /* If the requested route is a public route (non-authenticated route) then we can pass the request onto further logic. */
  if (isPublicRoute) return NextResponse.next();

  const token = request.cookies.get("remember_token")?.value;

  /* Check if the user has a remember token cookie. */
  if (!token) {
    const redirectedLoginUrl = request.nextUrl.clone();

    console.log(
      "[DEBUG] [SSR] [proxy] Failed to validate authentication on route: ",
      pathname
    );

    redirectedLoginUrl.pathname = "/auth/login";
    redirectedLoginUrl.searchParams.set("redirect", pathname);

    /* Redirect the users request to the authentication login page with a redirect parameter to the page they wanted to access in said request. */
    return NextResponse.redirect(redirectedLoginUrl);
  }

  /* Pass the request onto further logic. */
  return NextResponse.next();
}

export const config = {
  /* A simple regex to allow known asset/cdn paths. */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|locales/).*)"],
};
