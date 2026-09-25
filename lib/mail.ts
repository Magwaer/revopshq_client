import "server-only"
import { MAGIC_LINK_TTL_MINUTES } from "@/lib/auth/magic-link"
import { env } from "@/lib/env"

const SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send"

export class MailError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message)
    this.name = "MailError"
  }
}

/** `RevOps HQ <portal@revopshq.com>` or a bare address. */
function parseAddress(raw: string): { email: string; name?: string } {
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (!match) return { email: raw.trim() }
  const name = match[1].trim()
  return name ? { email: match[2].trim(), name } : { email: match[2].trim() }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

async function send(message: { to: string; subject: string; text: string; html: string; category: string }) {
  const config = env()
  if (!config.SENDGRID_API_KEY) {
    if (config.NODE_ENV === "production") throw new MailError("SENDGRID_API_KEY is not set", null)
    console.warn(`[mail] SENDGRID_API_KEY not set — not sending "${message.subject}" to ${message.to}:\n${message.text}`)
    return
  }

  const response = await fetch(SENDGRID_SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: message.to }] }],
      from: parseAddress(config.MAIL_FROM),
      subject: message.subject,
      // SendGrid requires text/plain before text/html.
      content: [
        { type: "text/plain", value: message.text },
        { type: "text/html", value: message.html },
      ],
      categories: [message.category],
      // Click tracking would rewrite the sign-in link into a SendGrid redirect, and open
      // tracking adds a pixel; neither belongs in an authentication email.
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      },
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new MailError(`SendGrid rejected the message with ${response.status}: ${body.slice(0, 500)}`, response.status)
  }
}

export async function sendMagicLinkEmail(to: string, link: string, firstName: string | null) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,"
  const text = `${greeting}

Use the link below to sign in to the RevOps HQ client portal. It expires in ${MAGIC_LINK_TTL_MINUTES} minutes and can be used once.

${link}

If you did not request this, you can ignore this email.

RevOps HQ`

  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
  <p>${escapeHtml(greeting)}</p>
  <p>Use the button below to sign in to the RevOps HQ client portal. It expires in ${MAGIC_LINK_TTL_MINUTES} minutes and can be used once.</p>
  <p style="margin:28px 0">
    <a href="${escapeHtml(link)}" style="background:#111;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">Sign in to the portal</a>
  </p>
  <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
  <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
</div>`

  await send({ to, subject: "Your RevOps HQ portal sign-in link", text, html, category: "portal-magic-link" })
}
