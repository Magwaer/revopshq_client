import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { query, queryOne } from "@/lib/db"
import { env } from "@/lib/env"
import { generateToken, hashToken } from "./tokens"
import { getUserById, type PortalUser } from "./users"

export const SESSION_COOKIE = "rohq_client_session"
const SESSION_TTL_DAYS = 30

export async function createSession(userId: string, meta: { ip: string | null; userAgent: string | null }) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  await query(
    "insert into sessions (token_hash, user_id, expires_at, ip, user_agent) values ($1, $2, $3, $4, $5)",
    [hashToken(token), userId, expiresAt, meta.ip, meta.userAgent],
  )

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

/** The signed-in user, validated against the sessions table on every request. */
export const getCurrentUser = cache(async (): Promise<PortalUser | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await queryOne<{ user_id: string }>(
    `update sessions set last_seen_at = now()
     where token_hash = $1 and expires_at > now()
     returning user_id`,
    [hashToken(token)],
  )
  if (!session) return null

  return getUserById(session.user_id)
})

export async function requireUser(): Promise<PortalUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await query("delete from sessions where token_hash = $1", [hashToken(token)])
  }
  store.delete(SESSION_COOKIE)
}
