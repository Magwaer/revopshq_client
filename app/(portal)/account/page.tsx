import { PageHeader, formatDate } from "@/components/portal/ui"
import { Card, CardContent } from "@/components/ui/card"
import { requireUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/users"

export const metadata = {
  title: "Account",
}

export default async function AccountPage() {
  const user = await requireUser()

  const rows = [
    { label: "NAME", value: displayName(user) },
    { label: "EMAIL", value: user.email },
    { label: "COMPANY", value: user.company_name ?? "—" },
    { label: "LAST SIGN-IN", value: formatDate(user.last_login_at) },
  ]

  return (
    <div className="max-w-2xl">
      <PageHeader title="Account" subtitle="Your details, as RevOps HQ has them on file." code="ACCOUNT" />

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="font-mono text-xs text-primary/70">{row.label}</dt>
                <dd className="mt-1 text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Something out of date? Contact your RevOps HQ team and we will update it.
      </p>

      <form action="/auth/logout" method="post" className="mt-8">
        <button type="submit" className="font-mono text-xs text-primary hover:text-primary/80">
          SIGN OUT →
        </button>
      </form>
    </div>
  )
}
