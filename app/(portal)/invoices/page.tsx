import { DataTable, EmptyState, PageHeader, SourceError, formatDate, formatMoney } from "@/components/portal/ui"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"
import { listInvoices, type Invoice } from "@/lib/hubspot/records"

export const metadata = {
  title: "Invoices",
}

export default async function InvoicesPage() {
  const user = await requireUser()

  let invoices: Invoice[]
  try {
    invoices = await listInvoices(user)
  } catch (error) {
    console.error("[invoices] HubSpot read failed", error)
    return (
      <div>
        <PageHeader title="Invoices" subtitle={organizationName(user)} code="BILLING" />
        <SourceError source="HubSpot" />
      </div>
    )
  }

  // Open only: a paid invoice is a receipt, not something the client needs to act on.
  const open = invoices
    .filter((invoice) => invoice.status === "open")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))

  return (
    <div>
      <PageHeader title="Invoices" subtitle={organizationName(user)} code="BILLING" />

      {open.length === 0 ? (
        <EmptyState
          title="Nothing outstanding"
          description="You have no open invoices. Anything new will appear here when it is issued."
        />
      ) : (
        <DataTable headers={["INVOICE", "DUE", "TOTAL", "BALANCE", ""]}>
          {open.map((invoice) => (
            <tr key={invoice.id} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{invoice.number ?? invoice.id}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatDate(invoice.dueDate)}</td>
              <td className="px-3 py-2">{formatMoney(invoice.amount, invoice.currency)}</td>
              <td className="px-3 py-2 font-medium">{formatMoney(invoice.balanceDue, invoice.currency)}</td>
              <td className="px-3 py-2 text-right">
                {invoice.url ? (
                  <a
                    href={invoice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-slide font-mono text-xs text-primary"
                  >
                    VIEW &amp; PAY
                  </a>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground" title="No verified link available">
                    UNAVAILABLE
                  </span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Payments are handled on RevOps HQ&apos;s secure invoice pages. We never take card details in this portal.
      </p>
    </div>
  )
}
