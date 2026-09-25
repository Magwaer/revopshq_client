"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Project, ProjectTask } from "@/lib/revprojects"
import { PHASE_STATUS, PROJECT_STATUS, TASK_STATUS } from "./project-labels"
import { ProjectsCalendar } from "./projects-calendar"
import {
  BAR,
  DOT,
  LEGEND,
  TEXT,
  isTaskDone,
  phaseTone,
  projectTone,
  shortDate,
  taskTone,
  type Tone,
} from "./project-tones"

type View = "list" | "timeline" | "calendar"
type TaskFilter = "all" | "open" | "done" | "waiting"

const VIEWS: View[] = ["list", "timeline", "calendar"]
const VIEW_KEY = "rohq.projects.view"
const DAY = 864e5

interface Row {
  key: string
  depth: 0 | 1 | 2 | 3
  label: string
  href: string
  tone: Tone
  status: string
  from: string | null
  to: string | null
  detail?: string
  done?: boolean
  projectId?: string
}

function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden />
}

function matchesFilter(task: ProjectTask, filter: TaskFilter): boolean {
  if (filter === "open") return !isTaskDone(task)
  if (filter === "done") return isTaskDone(task)
  if (filter === "waiting") return task.waitingOn === "CLIENT" && !isTaskDone(task)
  return true
}

/**
 * A parent is kept when it matches OR any of its subtasks do, so filtering never orphans a
 * visible subtask under a hidden parent.
 */
function filterTasks(tasks: ProjectTask[], filter: TaskFilter): ProjectTask[] {
  if (filter === "all") return tasks
  const kept = new Set(tasks.filter((task) => matchesFilter(task, filter)).map((task) => task.id))
  for (const task of tasks) if (task.parentTaskId && kept.has(task.id)) kept.add(task.parentTaskId)
  return tasks.filter((task) => kept.has(task.id))
}

function projectLabel(project: Project): string {
  const status = PROJECT_STATUS[project.status]?.label ?? project.status
  if (project.status !== "ACTIVE") return status
  return { ON_TRACK: "On track", AT_RISK: "At risk", OFF_TRACK: "Off track" }[project.health] ?? status
}

function taskLabel(task: ProjectTask): string {
  if (task.waitingOn === "CLIENT" && !isTaskDone(task)) return "Waiting on you"
  return TASK_STATUS[task.status]?.label ?? task.status
}

/** Earliest start and latest end across tasks, for a phase with no dates of its own. */
function spanOf(tasks: ProjectTask[]): { from: string | null; to: string | null } {
  const starts = tasks.map((task) => task.plannedStart ?? task.plannedEnd).filter((v): v is string => Boolean(v))
  const ends = tasks.map((task) => task.plannedEnd ?? task.plannedStart).filter((v): v is string => Boolean(v))
  const min = (values: string[]) => values.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b))
  const max = (values: string[]) => values.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b))
  return { from: starts.length ? min(starts) : null, to: ends.length ? max(ends) : null }
}

export function ProjectsExplorer({ projects, list }: { projects: Project[]; list: ReactNode }) {
  const [view, setView] = useState<View>("list")
  const [filter, setFilter] = useState<TaskFilter>("all")
  /** Pixels per day. Higher = wider chart; the timeline scrolls rather than compressing. */
  const [zoom, setZoom] = useState(4)
  // A client usually has a handful of projects, so small lists open expanded.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(projects.length <= 3 ? projects.map((project) => project.id) : []),
  )

  // Restored after mount so the server render (always the list) matches the first client render.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY)
    if (saved && (VIEWS as string[]).includes(saved)) setView(saved as View)
  }, [])

  const choose = (next: View) => {
    setView(next)
    window.localStorage.setItem(VIEW_KEY, next)
  }

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const visibleByProject = useMemo(
    () => new Map(projects.map((project) => [project.id, filterTasks(project.tasks, filter)])),
    [projects, filter],
  )

  const rows = useMemo(() => {
    const out: Row[] = []
    for (const project of projects) {
      const tasks = visibleByProject.get(project.id) ?? []
      const all = project.tasks.filter((task) => !task.parentTaskId)
      out.push({
        key: `p-${project.id}`,
        depth: 0,
        label: project.name,
        href: `/projects/${project.id}`,
        tone: projectTone(project),
        status: projectLabel(project),
        from: project.startDate,
        to: project.endDate,
        detail: all.length ? `${all.filter(isTaskDone).length}/${all.length}` : undefined,
        projectId: project.id,
      })
      if (!expanded.has(project.id)) continue

      const ids = new Set(tasks.map((task) => task.id))
      const children = new Map<string, ProjectTask[]>()
      for (const task of tasks) {
        if (task.parentTaskId && ids.has(task.parentTaskId)) {
          children.set(task.parentTaskId, [...(children.get(task.parentTaskId) ?? []), task])
        }
      }
      // A subtask whose parent is not client-visible is shown as a task in its own right.
      const topLevel = tasks.filter((task) => !task.parentTaskId || !ids.has(task.parentTaskId))

      const pushTask = (task: ProjectTask, depth: 2 | 3) => {
        out.push({
          key: `t-${task.id}`,
          depth,
          label: task.title,
          href: `/projects/${project.id}`,
          tone: taskTone(task),
          status: taskLabel(task),
          from: task.plannedStart,
          to: task.plannedEnd,
          done: isTaskDone(task),
        })
        if (depth === 2) for (const child of children.get(task.id) ?? []) pushTask(child, 3)
      }

      const phaseIds = new Set(project.phases.map((phase) => phase.id))
      for (const phase of [...project.phases].sort((a, b) => a.order - b.order)) {
        const phaseTasks = topLevel.filter((task) => task.phaseId === phase.id)
        if (filter !== "all" && phaseTasks.length === 0) continue
        const derived = spanOf(project.tasks.filter((task) => task.phaseId === phase.id))
        out.push({
          key: `ph-${phase.id}`,
          depth: 1,
          label: phase.name,
          href: `/projects/${project.id}`,
          tone: phaseTone(phase),
          status: PHASE_STATUS[phase.status] ?? phase.status,
          from: phase.startDate ?? derived.from,
          to: phase.endDate ?? derived.to,
        })
        for (const task of phaseTasks) pushTask(task, 2)
      }
      for (const task of topLevel.filter((task) => !task.phaseId || !phaseIds.has(task.phaseId))) pushTask(task, 2)
    }
    return out
  }, [projects, visibleByProject, expanded, filter])

  /**
   * Timeline bounds across everything with a date. Falls back to a 90-day window around
   * today when nothing has dates, so the chart renders an empty grid rather than dividing
   * by zero.
   */
  const timeline = useMemo(() => {
    const stamps: number[] = []
    const add = (value: string | null) => {
      const parsed = value ? Date.parse(value) : Number.NaN
      if (!Number.isNaN(parsed)) stamps.push(parsed)
    }
    for (const project of projects) {
      add(project.startDate)
      add(project.endDate)
      for (const phase of project.phases) {
        add(phase.startDate)
        add(phase.endDate)
      }
      for (const task of project.tasks) {
        add(task.plannedStart)
        add(task.plannedEnd)
      }
    }
    const now = Date.now()
    stamps.push(now)
    const start = Math.min(...stamps)
    const end = Math.max(...stamps)
    const padding = Math.max(end - start, 90 * DAY) * 0.04
    const from = start - padding
    const to = Math.max(end + padding, start + 90 * DAY)

    const months: Date[] = []
    const cursor = new Date(from)
    cursor.setUTCDate(1)
    cursor.setUTCHours(0, 0, 0, 0)
    while (cursor.getTime() <= to) {
      months.push(new Date(cursor))
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }

    const weeks: Date[] = []
    const week = new Date(from)
    week.setUTCHours(0, 0, 0, 0)
    week.setUTCDate(week.getUTCDate() - week.getUTCDay())
    while (week.getTime() <= to) {
      weeks.push(new Date(week))
      week.setUTCDate(week.getUTCDate() + 7)
    }
    return { start: from, end: to, months, weeks, now }
  }, [projects])

  const span = timeline.end - timeline.start
  const pct = (value: number) => ((value - timeline.start) / span) * 100
  const chartWidth = Math.max(640, Math.round((span / DAY) * zoom))
  // Week lines only once there is room for them; below that they turn the chart into hatching.
  const showWeeks = zoom >= 3

  function barFor(from: string | null, to: string | null) {
    const startAt = from ? Date.parse(from) : Number.NaN
    const endAt = to ? Date.parse(to) : Number.NaN
    if (Number.isNaN(startAt) && Number.isNaN(endAt)) return null
    // Only one of the two dates renders as a short marker rather than an invented duration.
    const left = Number.isNaN(startAt) ? pct(endAt) - 0.6 : pct(startAt)
    const right = Number.isNaN(endAt) ? pct(startAt) + 0.6 : pct(endAt + DAY)
    return { left: Math.max(0, left), width: Math.max(0.8, right - left) }
  }

  const gridLines = (
    <>
      {showWeeks &&
        timeline.weeks.map((week) => (
          <div
            key={`w-${week.getTime()}`}
            className="absolute bottom-0 top-0 w-px bg-border/60"
            style={{ left: `${pct(week.getTime())}%` }}
            aria-hidden
          />
        ))}
      {timeline.months.map((month) => (
        <div
          key={`m-${month.getTime()}`}
          className="absolute bottom-0 top-0 w-px bg-foreground/25"
          style={{ left: `${pct(month.getTime())}%` }}
          aria-hidden
        />
      ))}
      <div className="absolute bottom-0 top-0 w-px bg-primary" style={{ left: `${pct(timeline.now)}%` }} aria-hidden />
    </>
  )

  const calendarTasks = useMemo(
    () =>
      projects.flatMap((project) =>
        (visibleByProject.get(project.id) ?? []).map((task) => ({ task, project })),
      ),
    [projects, visibleByProject],
  )

  const indent = ["pl-3", "pl-8", "pl-12", "pl-16"] as const
  const barHeight = ["h-2.5", "h-2", "h-2", "h-1.5"] as const

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-md border border-border p-0.5" role="tablist" aria-label="Project view">
          {VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => choose(option)}
              className={`rounded px-3 py-1 font-mono text-xs uppercase transition-colors ${
                view === option ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {view !== "list" && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter tasks"
              value={filter}
              onChange={(event) => setFilter(event.target.value as TaskFilter)}
              className="h-8 rounded-md border border-border bg-background px-2 font-mono text-xs text-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="all">All tasks</option>
              <option value="open">Not done</option>
              <option value="done">Done</option>
              <option value="waiting">Waiting on you</option>
            </select>

            {view === "timeline" && (
              <>
                <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  WIDTH
                  <input
                    type="range"
                    min={1}
                    max={14}
                    step={1}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    aria-label="Timeline width"
                    className="h-1 w-24 cursor-pointer accent-primary"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) =>
                      current.size === 0 ? new Set(projects.map((project) => project.id)) : new Set(),
                    )
                  }
                  className="font-mono text-xs text-muted-foreground hover:text-primary"
                >
                  {expanded.size === 0 ? "EXPAND ALL" : "COLLAPSE ALL"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {view === "list" && list}

      {view === "calendar" && <ProjectsCalendar projects={projects} tasks={calendarTasks} />}

      {view === "timeline" && (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[11px] text-primary/70">
                      <th className="sticky left-0 z-10 min-w-[280px] max-w-[280px] bg-card px-3 py-2 font-normal">
                        NAME
                      </th>
                      <th className="w-32 whitespace-nowrap px-3 py-2 font-normal">STATUS</th>
                      <th className="px-3 py-2 font-normal">
                        <div className="relative h-4 text-[10px]" style={{ width: chartWidth }}>
                          {timeline.months.map((month) => (
                            <span
                              key={month.getTime()}
                              className="absolute whitespace-nowrap border-l border-border pl-1 text-muted-foreground"
                              style={{ left: `${pct(month.getTime())}%` }}
                            >
                              {month.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })}
                            </span>
                          ))}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const bar = barFor(row.from, row.to)
                      const isProject = row.depth === 0
                      const isOpen = row.projectId ? expanded.has(row.projectId) : false
                      const range = [shortDate(row.from), shortDate(row.to)].filter(Boolean).join(" → ")
                      return (
                          <tr
                            key={row.key}
                            className={isProject ? "border-b border-t border-border" : "border-b border-border/40"}
                          >
                            <td
                              className={`sticky left-0 z-10 min-w-[280px] max-w-[280px] bg-card py-1.5 pr-3 ${indent[row.depth]}`}
                            >
                              <div className="flex min-w-0 items-center gap-1.5">
                                {isProject && row.projectId && (
                                  <button
                                    type="button"
                                    onClick={() => toggle(row.projectId!)}
                                    aria-expanded={isOpen}
                                    aria-label={isOpen ? "Collapse project" : "Expand project"}
                                    className="shrink-0 text-muted-foreground hover:text-primary"
                                  >
                                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                                <Link
                                  href={row.href}
                                  title={row.label}
                                  className={`truncate hover:text-primary ${
                                    isProject
                                      ? "font-medium text-primary"
                                      : row.depth === 1
                                        ? "font-mono text-xs uppercase text-primary/80"
                                        : row.done
                                          ? "text-muted-foreground line-through decoration-muted-foreground/40"
                                          : row.depth === 3
                                            ? "text-xs text-muted-foreground"
                                            : ""
                                  }`}
                                >
                                  {row.label}
                                </Link>
                                {row.detail && (
                                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{row.detail}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-flex items-center gap-2 whitespace-nowrap text-xs ${TEXT[row.tone]}`}>
                                <StatusDot tone={row.tone} />
                                {row.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="relative h-4" style={{ width: chartWidth }}>
                                {gridLines}
                                {bar && (
                                  <div
                                    className={`absolute top-1/2 -translate-y-1/2 rounded-sm ${barHeight[row.depth]} ${BAR[row.tone]}`}
                                    style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                                    title={`${row.label}: ${range}`}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {LEGEND.map((item) => (
              <span key={item.tone} className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2 w-3 rounded-sm ${BAR[item.tone]}`} aria-hidden />
                {item.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-px bg-primary" aria-hidden />
              Today
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bars span planned start to planned end. An item with only one of the two dates appears as a marker
            rather than an invented duration; a phase without dates spans its tasks.
          </p>
        </>
      )}
    </div>
  )
}
