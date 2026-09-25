import { AuthCard, primaryButtonClass } from "@/components/auth-card"
import { completeSignIn } from "./actions"

export const metadata = {
  title: "Confirm sign-in",
}

/**
 * The emailed link lands here and the token is only consumed on POST. Mail security
 * scanners (Outlook Safe Links, Mimecast) fetch every link in a message, and a GET that
 * signed in would burn the token before the recipient ever clicked it.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  return (
    <AuthCard code="CLIENT PORTAL" title="Confirm sign-in" description="Continue to open your RevOps HQ client portal.">
      {token ? (
        <form action={completeSignIn}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={primaryButtonClass}>
            CONTINUE TO PORTAL
          </button>
        </form>
      ) : (
        <a href="/login" className="font-mono text-xs text-primary hover:text-primary/80">
          This link is incomplete. REQUEST A NEW ONE →
        </a>
      )}
    </AuthCard>
  )
}
