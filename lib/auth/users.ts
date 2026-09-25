import "server-only"
import { query, queryOne } from "@/lib/db"

export interface PortalUser {
  id: string
  email: string
  hubspot_contact_id: string | null
  hubspot_company_id: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  hubspot_synced_at: string | null
  last_login_at: string | null
}

const USER_COLUMNS = `id, email, hubspot_contact_id, hubspot_company_id, first_name, last_name,
  company_name, hubspot_synced_at, last_login_at`

export interface HubSpotIdentity {
  contactId: string | null
  companyId: string | null
  firstName: string | null
  lastName: string | null
  companyName: string | null
}

/** Create or refresh the portal user for an email from what HubSpot currently says. */
export async function upsertUserFromHubSpot(email: string, identity: HubSpotIdentity): Promise<PortalUser> {
  const user = await queryOne<PortalUser>(
    `insert into users (email, hubspot_contact_id, hubspot_company_id, first_name, last_name, company_name, hubspot_synced_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (email) do update set
       hubspot_contact_id = excluded.hubspot_contact_id,
       hubspot_company_id = excluded.hubspot_company_id,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       company_name = excluded.company_name,
       hubspot_synced_at = now(),
       updated_at = now()
     returning ${USER_COLUMNS}`,
    [email, identity.contactId, identity.companyId, identity.firstName, identity.lastName, identity.companyName],
  )
  if (!user) throw new Error("Could not upsert user")
  return user
}

export async function getUserById(id: string): Promise<PortalUser | null> {
  return queryOne<PortalUser>(`select ${USER_COLUMNS} from users where id = $1`, [id])
}

export async function markLoggedIn(userId: string): Promise<void> {
  await query("update users set last_login_at = now(), updated_at = now() where id = $1", [userId])
}

export function displayName(user: PortalUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ")
  return name || user.email
}

export function organizationName(user: PortalUser): string {
  return user.company_name || displayName(user)
}
