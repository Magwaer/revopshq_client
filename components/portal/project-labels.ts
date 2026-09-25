import type { BadgeTone } from "./ui"

export const PROJECT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "positive" },
  ON_HOLD: { label: "On hold", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "neutral" },
}

export const HEALTH: Record<string, { label: string; tone: BadgeTone }> = {
  ON_TRACK: { label: "On track", tone: "positive" },
  AT_RISK: { label: "At risk", tone: "warning" },
  OFF_TRACK: { label: "Off track", tone: "danger" },
}

export const PHASE_STATUS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
}

export const TASK_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  TODO: { label: "To do", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "positive" },
  IN_REVIEW: { label: "In review", tone: "positive" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  DONE: { label: "Done", tone: "neutral" },
}
