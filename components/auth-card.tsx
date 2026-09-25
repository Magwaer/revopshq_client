import type React from "react"

/** Framed card used by the sign-in screens, matching revopshq.com's login. */
export function AuthCard({
  code,
  title,
  description,
  children,
}: {
  code: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-md border border-border bg-card/50 p-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center">
            <div className="mr-4 h-px w-8 bg-primary/30" />
            <span className="font-mono text-xs text-primary/60">{code}</span>
          </div>
          <h1 className="mb-2 text-2xl font-heading">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-3" role="alert">
      <p className="font-mono text-sm text-destructive">{children}</p>
    </div>
  )
}

export const primaryButtonClass =
  "flex h-12 w-full items-center justify-center rounded-md border border-primary/20 bg-primary/5 px-8 text-sm font-heading text-primary transition-colors hover:bg-primary/10"
