import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/sessionToken";

const SESSION_COOKIE_NAME = "aa_app_session";
// Paths reachable without a valid app session.
const PUBLIC_PATHS = ["/login", "/api/health"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets, Next internals, and the PDF route's
  // own public favicon/logo files under /public.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg|icon.jpg).*)"],
};
