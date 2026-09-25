"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { issueMagicLink } from "@/lib/auth/magic-link"
import { clientIp, isLoginThrottled, recordLoginRequest } from "@/lib/auth/rate-limit"
import { upsertUserFromHubSpot, type HubSpotIdentity } from "@/lib/auth/users"
import { env } from "@/lib/env"
import { isHubSpotConfigured } from "@/lib/hubspot/client"
import { findIdentityByEmail } from "@/lib/hubspot/contacts"
import { sendMagicLinkEmail } from "@/lib/mail"

const emailSchema = z.string().trim().toLowerCase().email().max(320)

async function resolveIdentity(email: string): Promise<HubSpotIdentity | null> {
  if (isHubSpotConfigured()) return findIdentityByEmail(email)

  // Lets the portal be exercised locally before the HubSpot app is installed.
  if (env().NODE_ENV !== "production") {
    console.warn("[login] HUBSPOT_ACCESS_TOKEN not set — signing in without a HubSpot contact")
    return { contactId: null, companyId: null, firstName: null, lastName: null, companyName: null }
  }
  throw new Error("HUBSPOT_ACCESS_TOKEN is not set")
}

export async function requestMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"))
  if (!parsed.success) redirect("/login?error=invalid")
  const email = parsed.data
  const ip = clientIp(await headers())

  if (await isLoginThrottled(email, ip)) {
    await recordLoginRequest(email, ip, "throttled")
    redirect("/login?error=throttled")
  }

  try {
    const identity = await resolveIdentity(email)

    // Unknown addresses get the same response as known ones, so the form cannot be used
    // to discover who is a client.
    if (!identity) {
      await recordLoginRequest(email, ip, "unknown_contact")
    } else {
      const user = await upsertUserFromHubSpot(email, identity)
      const link = await issueMagicLink(user.id, ip)
      await sendMagicLinkEmail(email, link, user.first_name)
      await recordLoginRequest(email, ip, "sent")
    }
  } catch (error) {
    console.error("[login] could not issue magic link", error instanceof Error ? error.message : error)
    await recordLoginRequest(email, ip, "error").catch(() => {})
    redirect("/login?error=server")
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`)
}
