import type { Project, ProjectPhase, ProjectTask } from "@/lib/revprojects"

/**
 * Status colours for the timeline and calendar, as on revopshq.com's portal.
 *
 * The one deliberate exception to the semantic-token rule: a status needs to read as a
 * status, and "green means done" is not something a theme token can express. Mid-tone
 * palette values stay legible on all three themes (light, dark, matrix) without `dark:`.
 */
export type Tone = "done" | "progress" | "waiting" | "blocked" | "idle" | "ontrack"

export const DOT: Record<Tone, string> = {
  done: "bg-emerald-500",
  progress: "bg-blue-500",
  waiting: "bg-amber-500",
  blocked: "bg-red-500",
  ontrack: "bg-foreground",
  idle: "bg-muted-foreground/40",
}

export const TEXT: Record<Tone, string> = {
  done: "text-emerald-600",
  progress: "text-blue-600",
  waiting: "text-amber-600",
  blocked: "text-red-600",
  ontrack: "text-foreground",
  idle: "text-muted-foreground",
}

export const BAR: Record<Tone, string> = {
  done: "bg-emerald-500/70",
  progress: "bg-blue-500/70",
  waiting: "bg-amber-500/70",
  blocked: "bg-red-500/70",
  ontrack: "bg-foreground/80",
  idle: "bg-muted-foreground/30",
}

export const CHIP: Record<Tone, string> = {
  done: "bg-emerald-500/15 text-emerald-500 line-through decoration-emerald-500/50",
  progress: "bg-blue-500/15 text-blue-500",
  waiting: "bg-amber-500/15 text-amber-500",
  blocked: "bg-red-500/15 text-red-500",
  ontrack: "bg-muted text-foreground",
  idle: "bg-muted text-muted-foreground",
}

export function isTaskDone(task: ProjectTask): boolean {
  return task.status === "DONE"
}

/** Waiting on the client outranks the workflow status: it is the thing they can act on. */
export function taskTone(task: ProjectTask): Tone {
  if (task.status === "DONE") return "done"
  if (task.status === "BLOCKED") return "blocked"
  if (task.waitingOn === "CLIENT") return "waiting"
  if (task.status === "IN_PROGRESS" || task.status === "IN_REVIEW") return "progress"
  return "idle"
}

export function phaseTone(phase: ProjectPhase): Tone {
  if (phase.status === "DONE") return "done"
  if (phase.health === "OFF_TRACK") return "blocked"
  if (phase.health === "AT_RISK") return "waiting"
  return phase.status === "IN_PROGRESS" ? "progress" : "idle"
}

export function projectTone(project: Project): Tone {
  if (project.status === "COMPLETED") return "done"
  if (project.status === "ON_HOLD") return "idle"
  if (project.health === "OFF_TRACK") return "blocked"
  if (project.health === "AT_RISK") return "waiting"
  return "ontrack"
}

export const LEGEND: Array<{ tone: Tone; label: string }> = [
  { tone: "progress", label: "In progress" },
  { tone: "waiting", label: "Waiting on you / at risk" },
  { tone: "blocked", label: "Blocked / off track" },
  { tone: "done", label: "Done" },
  { tone: "idle", label: "Not started" },
]

/** Calendar-day key in UTC, matching how RevProjects stores planned dates. */
export function dayKey(value: string | null): string | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10)
}

export function shortDate(value: string | null): string {
  if (!value) return ""
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return ""
  return new Date(parsed).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}
