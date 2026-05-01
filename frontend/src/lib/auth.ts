import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "kakeibo_session";
export const ACCESS_COOKIE_NAME = "kakeibo_access";

export function isAuthGuardEnabled() {
  return process.env.AUTH_GUARD_ENABLED === "true" || process.env.NEXT_PUBLIC_AUTH_GUARD_ENABLED === "true";
}

export function hasSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(ACCESS_COOKIE_NAME)?.value || request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function getLoginPath(pathname = "/dashboard") {
  const search = new URLSearchParams({ redirect: pathname });
  return `/login?${search.toString()}`;
}
