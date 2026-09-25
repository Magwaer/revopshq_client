import type React from "react"
import { PortalNav, type PortalNavItem } from "@/components/portal/portal-nav"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"

// Services and Team exist on revopshq.com's portal but are hidden here for now.
const NAV_ITEMS: PortalNavItem[] = [
  { href: "/", label: "Overview", icon: "overview", exact: true },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/documents", label: "Documents", icon: "documents" },
  { href: "/invoices", label: "Invoices", icon: "invoices" },
  { href: "/support", label: "Support", icon: "tickets" },
  { href: "/account", label: "Account", icon: "account" },
]

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="container mx-auto px-4 pb-20 pt-16">
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside>
          <div className="mb-4 hidden lg:block">
            <div className="font-mono text-xs text-primary/60">CLIENT PORTAL</div>
            <div className="mt-1 text-sm font-medium text-primary">{organizationName(user)}</div>
          </div>
          <PortalNav items={NAV_ITEMS} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
