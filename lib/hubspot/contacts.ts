import "server-only"
import type { HubSpotIdentity } from "@/lib/auth/users"
import { batchRead, hubspot, listAssociations, type HubSpotObject } from "./client"

/**
 * Resolve an email to a HubSpot contact and its company.
 *
 * Returns null when no contact has this email: the portal is for existing clients only,
 * so an unknown address never receives a sign-in link.
 */
export async function findIdentityByEmail(email: string): Promise<HubSpotIdentity | null> {
  const search = await hubspot<{ results: HubSpotObject[] }>("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: {
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
      properties: ["email", "firstname", "lastname"],
      limit: 1,
    },
  })

  const contact = search.results[0]
  if (!contact) return null

  // Prefer the association HubSpot labels Primary; otherwise the first associated company.
  const companies = await listAssociations("contacts", contact.id, "companies")
  const companyId = (companies.find((company) => company.primary) ?? companies[0])?.id ?? null

  let companyName: string | null = null
  if (companyId) {
    const [company] = await batchRead("companies", [companyId], ["name"])
    companyName = company?.properties.name ?? null
  }

  return {
    contactId: contact.id,
    companyId,
    firstName: contact.properties.firstname ?? null,
    lastName: contact.properties.lastname ?? null,
    companyName,
  }
}
