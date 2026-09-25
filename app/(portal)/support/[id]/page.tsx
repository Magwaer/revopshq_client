import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge, EmptyState, PageHeader, formatDate } from "@/components/portal/ui"
import { requireUser } from "@/lib/auth/session"
import { getTicket } from "@/lib/hubspot/records"

export const metadata = {
  title: "Ticket",
}

const backLink = (
  <Link href="/support" className="font-mono text-xs text-muted-foreground hover:text-primary">
    ← ALL TICKETS
  </Link>
)

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams])
  const user = await requireUser()

  // Looked up within this user's own tickets, so another client's ticket id is a 404.
  const ticket = await getTicket(user, id)
  if (!ticket) {
    // HubSpot can take a moment to index a new ticket's associations.
    if (!created) notFound()
    return (
      <div className="max-w-3xl">
        {backLink}
        <div className="mt-4">
          <EmptyState
            title="Ticket submitted"
            description="Thanks — our team has your request. It will appear in your ticket list within a minute."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {backLink}

      {created && (
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3" role="status">
          <p className="font-mono text-sm text-primary">Ticket submitted. We will reply by email and update it here.</p>
        </div>
      )}

      <div className="mt-4">
        <PageHeader title={ticket.subject ?? "Untitled ticket"} />
      </div>

      <dl className="mb-8 grid gap-4 rounded-md border border-border p-5 sm:grid-cols-4">
        <div>
          <dt className="font-mono text-xs text-muted-foreground">STATUS</dt>
          <dd className="mt-1">
            <Badge tone={ticket.isClosed ? "neutral" : "positive"}>{ticket.stage}</Badge>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-muted-foreground">PRIORITY</dt>
          <dd className="mt-1 text-sm">{ticket.priority ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-muted-foreground">OPENED</dt>
          <dd className="mt-1 text-sm">{formatDate(ticket.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-muted-foreground">RESOLVED</dt>
          <dd className="mt-1 text-sm">{ticket.isClosed ? formatDate(ticket.closedAt) : "—"}</dd>
        </div>
      </dl>

      {ticket.content && (
        <div className="whitespace-pre-wrap rounded-md border border-border bg-card/50 p-5 text-sm text-muted-foreground">
          {ticket.content}
        </div>
      )}
    </div>
  )
}
