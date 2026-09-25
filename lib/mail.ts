import "server-only"
import nodemailer from "nodemailer"
import { MAGIC_LINK_TTL_MINUTES } from "@/lib/auth/magic-link"
import { env } from "@/lib/env"

function transport() {
  const config = env()
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
  })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
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

  await transport().sendMail({
    from: env().MAIL_FROM,
    to,
    subject: "Your RevOps HQ portal sign-in link",
    text,
    html,
  })
}
