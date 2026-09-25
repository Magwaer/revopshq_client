import Link from "next/link"
import { BrandLogo, ThemeToggle } from "./theme"

export function SiteHeader({ email }: { email: string | null }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center" aria-label="RevOps HQ client portal">
          <BrandLogo className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          {email && (
            <>
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{email}</span>
              <form action="/auth/logout" method="post">
                <button type="submit" className="font-mono text-xs text-foreground/80 transition-colors hover:text-primary">
                  SIGN OUT
                </button>
              </form>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
        <span className="font-mono">© {new Date().getFullYear()} RevOps HQ</span>
        <nav className="flex gap-6 font-mono">
          <a href="https://revopshq.com" className="hover:text-primary">
            REVOPSHQ.COM
          </a>
          <a href="https://revopshq.com/privacy" className="hover:text-primary">
            PRIVACY
          </a>
          <a href="https://revopshq.com/contact" className="hover:text-primary">
            CONTACT
          </a>
        </nav>
      </div>
    </footer>
  )
}
