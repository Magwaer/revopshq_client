import { NextResponse, type NextRequest } from "next/server"

// Coarse gate on cookie presence only. The session itself is validated against the
// database in the portal layout, since the edge runtime cannot reach Postgres.
const SESSION_COOKIE = "rohq_client_session"

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next()
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: ["/((?!login|auth|_next|brand|favicon).*)"],
}
