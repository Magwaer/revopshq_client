import Link from "next/link"
import { PageHeader, StatCard } from "@/components/portal/ui"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"
import { listInvoices, listTickets } from "@/lib/hubspot/records"
import { listProjects } from "@/lib/revprojects"

export const metadata = {
  title: "Overview",
}

const SHORTCUTS = [
  { href: "/projects", title: "Projects", description: "Phases, tasks and progress" },
  { href: "/documents", title: "Documents", description: "Shared files, and uploads for our team" },
  { href: "/invoices", title: "Invoices", description: "View and pay outstanding invoices" },
  { href: "/support", title: "Support", description: "Raise and track support requests" },
]

function countOrDash<T>(result: PromiseSettledResult<T[]>, predicate: (item: T) => boolean): string {
  return result.status === "fulfilled" ? String(result.value.filter(predicate).length) : "—"
}

function detail(count: string, none: string, some: string): string {
  if (count === "—") return "Temporarily unavailable"
  return count === "0" ? none : some
}

export default async function OverviewPage() {
  const user = await requireUser()

  const [projects, invoices, tickets] = await Promise.allSettled([
    listProjects(user),
    listInvoices(user),
    listTickets(user),
  ])
  for (const result of [projects, invoices, tickets]) {
    if (result.status === "rejected") console.error("[overview] source failed", result.reason)
  }

  const openInvoices = countOrDash(invoices, (invoice) => invoice.status === "open")
  const openTickets = countOrDash(tickets, (ticket) => !ticket.isClosed)
  const activeProjects = countOrDash(projects, (project) => project.status === "ACTIVE")

  return (
    <div>
      <PageHeader
        title={organizationName(user)}
        subtitle="Your projects, invoices and support requests, in one place."
        code="OVERVIEW"
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="ACTIVE PROJECTS"
          value={activeProjects}
          detail={detail(activeProjects, "Nothing in flight", "In delivery")}
        />
        <StatCard
          label="OPEN INVOICES"
          value={openInvoices}
          detail={detail(openInvoices, "Nothing due", "Awaiting payment")}
        />
        <StatCard
          label="OPEN TICKETS"
          value={openTickets}
          detail={detail(openTickets, "Nothing outstanding", "Awaiting our response")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHORTCUTS.map((shortcut) => (
          <Link key={shortcut.href} href={shortcut.href} className="block">
            <Card className="hover-glow h-full">
              <CardContent className="pt-6">
                <CardTitle className="mb-1 text-lg">{shortcut.title}</CardTitle>
                <CardDescription>{shortcut.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
