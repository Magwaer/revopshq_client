import { AuthCard, FormAlert, primaryButtonClass } from "@/components/auth-card"
import { MAGIC_LINK_TTL_MINUTES } from "@/lib/auth/magic-link"
import { requestMagicLink } from "./actions"

export const metadata = {
  title: "Sign in",
}

const ERRORS: Record<string, string> = {
  invalid: "Enter a valid email address.",
  throttled: "Too many sign-in requests. Wait a few minutes and try again.",
  server: "Something went wrong sending your link. Please try again.",
  expired: "That sign-in link has expired or was already used. Request a new one.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>
}) {
  const params = await searchParams

  if (params.sent) {
    return (
      <AuthCard
        code="CHECK YOUR INBOX"
        title="Sign-in link sent"
        description={`If ${params.email ?? "that address"} belongs to a RevOps HQ client, a sign-in link is on its way. It expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`}
      >
        <a href="/login" className="font-mono text-xs text-primary hover:text-primary/80">
          ← USE A DIFFERENT EMAIL
        </a>
      </AuthCard>
    )
  }

  const error = params.error ? ERRORS[params.error] : null

  return (
    <AuthCard
      code="CLIENT PORTAL"
      title="Sign in"
      description="Enter your email and we will send you a link to sign in. No password needed."
    >
      {error && <FormAlert>{error}</FormAlert>}

      <form action={requestMagicLink} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="block font-mono text-sm text-primary/70">
            EMAIL
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            defaultValue={params.email}
            className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <button type="submit" className={primaryButtonClass}>
          SEND SIGN-IN LINK
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-6">
        <span className="font-mono text-xs text-primary/40">CLIENTS OF REVOPS HQ ONLY</span>
      </div>
    </AuthCard>
  )
}
