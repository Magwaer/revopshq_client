"use client"

import Link from "next/link"
import { useActionState } from "react"
import { FormAlert } from "@/components/auth-card"
import { Card, CardContent } from "@/components/ui/card"
import { createTicketAction, type NewTicketState } from "./actions"

const INITIAL: NewTicketState = { error: null, values: { subject: "", description: "", priority: "MEDIUM" } }

const PRIORITIES = [
  { value: "LOW", label: "Low — whenever you get to it" },
  { value: "MEDIUM", label: "Medium — affects our work" },
  { value: "HIGH", label: "High — something is broken" },
]

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"

export function TicketForm() {
  const [state, action, pending] = useActionState(createTicketAction, INITIAL)

  return (
    <Card>
      <CardContent className="pt-6">
        {state.error && <FormAlert>{state.error}</FormAlert>}
        {/* Keyed on the submitted values so the fields show them after a failed submit. */}
        <form key={JSON.stringify(state.values)} action={action} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="subject" className="block font-mono text-xs text-primary/70">
              SUBJECT
            </label>
            <input
              id="subject"
              name="subject"
              required
              maxLength={200}
              autoFocus
              defaultValue={state.values.subject}
              placeholder="e.g. Deal stages are not syncing to the dashboard"
              className={`${fieldClass} h-10`}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="block font-mono text-xs text-primary/70">
              DESCRIPTION
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={8}
              maxLength={10_000}
              defaultValue={state.values.description}
              placeholder="What happened, what you expected, and any links or record names that help us reproduce it."
              className={`${fieldClass} py-2`}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="priority" className="block font-mono text-xs text-primary/70">
              PRIORITY
            </label>
            <select id="priority" name="priority" defaultValue={state.values.priority} className={`${fieldClass} h-10 sm:max-w-xs`}>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md border border-primary/20 bg-primary/5 px-6 font-mono text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {pending ? "SUBMITTING…" : "SUBMIT TICKET"}
            </button>
            <Link href="/support" className="font-mono text-xs text-muted-foreground hover:text-primary">
              CANCEL
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
