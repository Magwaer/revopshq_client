import { EmptyState, PageHeader } from "@/components/portal/ui"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"
import { isHubSpotConfigured } from "@/lib/hubspot/client"
import { TicketForm } from "./ticket-form"

export const metadata = {
  title: "New ticket",
}

export default async function NewTicketPage() {
  const user = await requireUser()
  const linked = Boolean(user.hubspot_contact_id || user.hubspot_company_id)

  let unavailable: string | null = null
  if (!isHubSpotConfigured()) {
    unavailable = "Online tickets are temporarily unavailable. Email contact@rohq.io and we will get back to you."
  } else if (!linked) {
    unavailable = "Your account is not linked to our support system yet. Email contact@rohq.io and we will get back to you."
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New ticket" subtitle={organizationName(user)} code="SUPPORT" />
      {unavailable ? <EmptyState title="Tickets are not available yet" description={unavailable} /> : <TicketForm />}
    </div>
  )
}
