import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const session = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const authPaths = ["/login", "/register"];
  const protectedPaths = [
    "/recipes/new",
    "/recipes/import-url",
    "/fridge",
    "/suggestions",
    "/shopping",
    "/profile",
  ];

  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  const isProtectedPage = protectedPaths.some((p) => pathname.startsWith(p));

  // Pages auth -> rediriger vers accueil si déjà connecté
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/fridge", request.url));
  }

  // Pages protégées -> rediriger vers login si pas connecté
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/recipes/new",
    "/recipes/import-url",
    "/fridge",
    "/suggestions",
    "/shopping",
    "/profile",
  ],
};
