import type React from "react"
import { Badge as UiBadge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Same presentation pieces as the revopshq.com portal, so the two look identical.

export function PageHeader({
  title,
  subtitle,
  code,
  action,
}: {
  title: string
  subtitle?: string
  code?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {code && (
          <div className="mb-2 flex items-center">
            <div className="mr-4 h-px w-12 bg-primary/30" />
            <span className="font-mono text-xs text-primary/80">{code}</span>
          </div>
        )}
        <h1 className="text-3xl font-heading leading-tight tracking-tight text-primary md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-primary/80 md:text-lg">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="hover-glow">
      <CardContent className="pt-6">
        <div className="mb-2 font-mono text-xs text-primary/70">{label}</div>
        <div className="text-3xl font-heading tracking-tight text-primary">{value}</div>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )
}

export type BadgeTone = "neutral" | "positive" | "warning" | "danger"

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: BadgeTone }) {
  const variant = tone === "danger" ? "destructive" : tone === "neutral" ? "outline" : "secondary"
  return (
    <UiBadge variant={variant} className="whitespace-nowrap font-mono text-xs uppercase">
      {children}
    </UiBadge>
  )
}

export function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-mono text-[11px] font-normal text-primary/70">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/** Shown in place of data when an upstream system is unreachable, rather than a false "nothing here". */
export function SourceError({ source }: { source: string }) {
  return (
    <EmptyState
      title={`${source} is unavailable`}
      description={`We could not load this from ${source} just now. Please try again in a few minutes.`}
    />
  )
}

export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return "—"
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return "—"
  return new Date(parsed).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}
