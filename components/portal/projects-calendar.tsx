"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Project, ProjectTask } from "@/lib/revprojects"
import { CHIP, dayKey, taskTone } from "./project-tones"

/**
 * Month calendar over the same project and task data as the timeline.
 *
 * A task appears on its planned end date, because that is the date a client cares about.
 * Tasks without one do not appear at all rather than being parked on an arbitrary day — a
 * made-up position on a calendar reads as fact.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const PER_DAY = 3

interface CalendarTask {
  task: ProjectTask
  project: Project
}

export function ProjectsCalendar({ projects, tasks }: { projects: Project[]; tasks: CalendarTask[] }) {
  // Open on the month with the nearest upcoming work, not always today: a plan that
  // finished last quarter would otherwise open on an empty grid.
  const initial = useMemo(() => {
    const due = tasks
      .map(({ task }) => (task.plannedEnd ? Date.parse(task.plannedEnd) : Number.NaN))
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b)
    const now = Date.now()
    const next = due.find((value) => value >= now) ?? due[due.length - 1] ?? now
    const date = new Date(next)
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  }, [tasks])

  const [month, setMonth] = useState<Date>(initial)

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    for (const entry of tasks) {
      const key = dayKey(entry.task.plannedEnd)
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(entry)
      map.set(key, list)
    }
    return map
  }, [tasks])

  // Project end dates are shown as milestones on their day.
  const endsByDay = useMemo(() => {
    const map = new Map<string, Project[]>()
    for (const project of projects) {
      const key = dayKey(project.endDate)
      if (!key) continue
      map.set(key, [...(map.get(key) ?? []), project])
    }
    return map
  }, [projects])

  const grid = useMemo(() => {
    const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
    start.setUTCDate(start.getUTCDate() - start.getUTCDay())
    // Six rows always, so the grid does not jump height between months.
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 864e5))
  }, [month])

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const todayKey = new Date().toISOString().slice(0, 10)
  const undated = tasks.filter(({ task }) => !dayKey(task.plannedEnd)).length

  const shift = (delta: number) =>
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + delta, 1)))

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="rounded-md border border-border p-1 text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[9rem] text-center font-heading text-sm text-primary">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="rounded-md border border-border p-1 text-muted-foreground hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setMonth(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)))}
          className="font-mono text-xs text-muted-foreground hover:text-primary"
        >
          TODAY
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-1.5 font-mono text-[10px] uppercase text-primary/70">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {grid.map((day) => {
              const key = day.toISOString().slice(0, 10)
              const inMonth = day.getUTCMonth() === month.getUTCMonth()
              const items = byDay.get(key) ?? []
              const ends = endsByDay.get(key) ?? []

              return (
                <div
                  key={key}
                  className={`min-h-[6rem] border-b border-r border-border/50 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                    inMonth ? "" : "bg-muted/20"
                  }`}
                >
                  <div
                    className={`mb-1 font-mono text-[10px] ${
                      key === todayKey
                        ? "font-semibold text-primary"
                        : inMonth
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {day.getUTCDate()}
                  </div>

                  <ul className="space-y-0.5">
                    {ends.map((project) => (
                      <li key={`end-${project.id}`}>
                        <Link
                          href={`/projects/${project.id}`}
                          title={`${project.name} — planned end`}
                          className="block truncate rounded border border-primary/30 px-1 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/5"
                        >
                          ◆ {project.name}
                        </Link>
                      </li>
                    ))}
                    {items.slice(0, PER_DAY).map(({ task, project }) => (
                      <li key={task.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          title={`${project.name} — ${task.title}`}
                          className={`block truncate rounded px-1 py-0.5 text-[11px] hover:opacity-80 ${CHIP[taskTone(task)]}`}
                        >
                          {task.title}
                        </Link>
                      </li>
                    ))}
                    {items.length > PER_DAY && (
                      <li
                        className="px-1 font-mono text-[10px] text-muted-foreground"
                        title={items
                          .slice(PER_DAY)
                          .map(({ task }) => task.title)
                          .join("\n")}
                      >
                        +{items.length - PER_DAY} more
                      </li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Tasks appear on their planned end date; ◆ marks a project&apos;s planned end.
        {undated > 0 && ` ${undated} task${undated === 1 ? " has" : "s have"} no planned date and do not appear.`}
      </p>
    </div>
  )
}
