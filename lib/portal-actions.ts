import "server-only"
import { query, queryOne } from "@/lib/db"

export type PortalAction = "ticket_created" | "document_uploaded"

// Generous for a person, low enough that a stolen session cannot flood HubSpot or storage.
const LIMITS: Record<PortalAction, { max: number; windowMinutes: number }> = {
  ticket_created: { max: 10, windowMinutes: 60 },
  document_uploaded: { max: 40, windowMinutes: 60 },
}

export async function isActionThrottled(userId: string, action: PortalAction): Promise<boolean> {
  const { max, windowMinutes } = LIMITS[action]
  const row = await queryOne<{ count: number }>(
    `select count(*)::int as count from portal_actions
     where user_id = $1 and action = $2 and created_at > now() - make_interval(mins => $3)`,
    [userId, action, windowMinutes],
  )
  return (row?.count ?? 0) >= max
}

export async function recordAction(userId: string, action: PortalAction, externalId: string) {
  await query("insert into portal_actions (user_id, action, external_id) values ($1, $2, $3)", [
    userId,
    action,
    externalId,
  ])
}
