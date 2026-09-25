"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireUser } from "@/lib/auth/session"
import { TICKET_PRIORITIES, createTicket } from "@/lib/hubspot/records"
import { isActionThrottled, recordAction } from "@/lib/portal-actions"

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Add a short subject.").max(200, "Keep the subject under 200 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the issue in a sentence or two.")
    .max(10_000, "Keep the description under 10,000 characters."),
  priority: z.enum(TICKET_PRIORITIES),
})

export interface NewTicketState {
  error: string | null
  values: { subject: string; description: string; priority: string }
}

export async function createTicketAction(_previous: NewTicketState, formData: FormData): Promise<NewTicketState> {
  const user = await requireUser()
  const values = {
    subject: String(formData.get("subject") ?? ""),
    description: String(formData.get("description") ?? ""),
    priority: String(formData.get("priority") ?? "MEDIUM"),
  }

  const parsed = ticketSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again.", values }

  if (await isActionThrottled(user.id, "ticket_created")) {
    return { error: "You have opened several tickets recently. Please try again later.", values }
  }

  let ticketId: string
  try {
    ticketId = await createTicket(user, parsed.data)
    await recordAction(user.id, "ticket_created", ticketId)
  } catch (error) {
    console.error("[support] ticket creation failed", error instanceof Error ? error.message : error)
    return { error: "We could not open your ticket just now. Please try again in a few minutes.", values }
  }

  redirect(`/support/${ticketId}?created=1`)
}
