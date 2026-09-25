"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { consumeMagicLink } from "@/lib/auth/magic-link"
import { clientIp } from "@/lib/auth/rate-limit"
import { createSession } from "@/lib/auth/session"
import { markLoggedIn } from "@/lib/auth/users"

export async function completeSignIn(formData: FormData) {
  const token = String(formData.get("token") ?? "")
  const userId = token ? await consumeMagicLink(token) : null
  if (!userId) redirect("/login?error=expired")

  const requestHeaders = await headers()
  await createSession(userId, { ip: clientIp(requestHeaders), userAgent: requestHeaders.get("user-agent") })
  await markLoggedIn(userId)
  redirect("/")
}
