import { NextResponse, type NextRequest } from "next/server"
import { destroySession } from "@/lib/auth/session"

// POST only, so a prefetch or an <img src> on another site cannot sign someone out.
export async function POST(request: NextRequest) {
  await destroySession()
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 })
}
