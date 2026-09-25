"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard, FileText, FolderKanban, LayoutDashboard, LifeBuoy, UserCog, type LucideIcon } from "lucide-react"

export interface PortalNavItem {
  href: string
  label: string
  icon: "overview" | "projects" | "documents" | "invoices" | "tickets" | "account"
  exact?: boolean
}

const ICONS: Record<PortalNavItem["icon"], LucideIcon> = {
  overview: LayoutDashboard,
  projects: FolderKanban,
  documents: FileText,
  invoices: CreditCard,
  tickets: LifeBuoy,
  account: UserCog,
}

export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Portal sections" className="lg:sticky lg:top-28">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
        {items.map((item) => {
          const Icon = ICONS[item.icon]
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-muted font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
