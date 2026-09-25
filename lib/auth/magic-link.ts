import "server-only"
import { query, queryOne } from "@/lib/db"
import { env } from "@/lib/env"
import { generateToken, hashToken } from "./tokens"

export const MAGIC_LINK_TTL_MINUTES = 15

export async function issueMagicLink(userId: string, ip: string | null): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000)

  // A new link supersedes any earlier unused one, so only the most recent email works.
  await query("update login_tokens set used_at = now() where user_id = $1 and used_at is null", [userId])
  await query(
    "insert into login_tokens (token_hash, user_id, expires_at, requested_ip) values ($1, $2, $3, $4)",
    [hashToken(token), userId, expiresAt, ip],
  )

  return `${env().APP_URL.replace(/\/$/, "")}/auth/verify?token=${encodeURIComponent(token)}`
}

/**
 * Single use: `used_at is null` in the same statement that sets it means a double-submit
 * or a replayed link cannot produce two sessions.
 */
export async function consumeMagicLink(token: string): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    `update login_tokens set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning user_id`,
    [hashToken(token)],
  )
  return row?.user_id ?? null
}
