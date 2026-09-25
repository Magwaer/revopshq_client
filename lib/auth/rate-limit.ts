import "server-only"
import { query, queryOne } from "@/lib/db"

const WINDOW_MINUTES = 15
const MAX_PER_EMAIL = 5
const MAX_PER_IP = 20

export type LoginOutcome = "sent" | "unknown_contact" | "throttled" | "error"

export async function isLoginThrottled(email: string, ip: string | null): Promise<boolean> {
  const counts = await queryOne<{ by_email: number; by_ip: number }>(
    `select
       count(*) filter (where email = $1)::int as by_email,
       count(*) filter (where $2::inet is not null and ip = $2::inet)::int as by_ip
     from login_requests
     where created_at > now() - make_interval(mins => $3)`,
    [email, ip, WINDOW_MINUTES],
  )
  return (counts?.by_email ?? 0) >= MAX_PER_EMAIL || (counts?.by_ip ?? 0) >= MAX_PER_IP
}

export async function recordLoginRequest(email: string, ip: string | null, outcome: LoginOutcome) {
  await query("insert into login_requests (email, ip, outcome) values ($1, $2, $3)", [email, ip, outcome])
}

/** First hop of x-forwarded-for, or null. Invalid values become null rather than failing the insert. */
export function clientIp(headers: Headers): string | null {
  const raw = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim()
  if (!raw) return null
  return /^[0-9a-fA-F:.]+$/.test(raw) ? raw : null
}
