import Link from "next/link"
import { Badge, DataTable, EmptyState, PageHeader, SourceError, StatCard, formatDate } from "@/components/portal/ui"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"
import { listTickets, type Ticket } from "@/lib/hubspot/records"

export const metadata = {
  title: "Support",
}

export default async function SupportPage() {
  const user = await requireUser()
  const header = (
    <PageHeader
      title="Support"
      subtitle={organizationName(user)}
      code="TICKETS"
      action={
        <Link
          href="/support/new"
          className="inline-flex h-10 items-center rounded-md border border-primary/20 bg-primary/5 px-5 font-mono text-xs text-primary transition-colors hover:bg-primary/10"
        >
          + NEW TICKET
        </Link>
      }
    />
  )

  let tickets: Ticket[]
  try {
    tickets = await listTickets(user)
  } catch (error) {
    console.error("[support] HubSpot read failed", error)
    return (
      <div>
        {header}
        <SourceError source="HubSpot" />
      </div>
    )
  }

  const open = tickets.filter((ticket) => !ticket.isClosed)
  const resolved = tickets.filter((ticket) => ticket.isClosed)

  return (
    <div>
      {header}

      {tickets.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="OPEN" value={String(open.length)} detail="Awaiting our response" />
          <StatCard label="RESOLVED" value={String(resolved.length)} detail="Closed tickets" />
        </div>
      )}

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="Support requests you raise with RevOps HQ will appear here with their status."
        />
      ) : (
        <DataTable headers={["SUBJECT", "STATUS", "PRIORITY", "OPENED", "RESOLVED"]}>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2">
                <Link href={`/support/${ticket.id}`} className="hover-slide text-primary">
                  {ticket.subject ?? "Untitled ticket"}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Badge tone={ticket.isClosed ? "neutral" : "positive"}>{ticket.stage}</Badge>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{ticket.priority ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatDate(ticket.createdAt)}</td>
              <td className="px-3 py-2 text-muted-foreground">{ticket.isClosed ? formatDate(ticket.closedAt) : "—"}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
