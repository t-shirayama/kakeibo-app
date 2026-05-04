import { NextResponse, type NextRequest } from "next/server";
import { getLoginPath, hasSessionCookie, isAuthGuardEnabled } from "./src/lib/auth";

const protectedRoutes = ["/dashboard", "/calendar", "/transactions", "/upload", "/categories", "/reports", "/settings"];

export function middleware(request: NextRequest) {
  if (!isAuthGuardEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!isProtectedRoute || hasSessionCookie(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(getLoginPath(pathname), request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/calendar/:path*", "/transactions/:path*", "/upload/:path*", "/categories/:path*", "/reports/:path*", "/settings/:path*"],
};
