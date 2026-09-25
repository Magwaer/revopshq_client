import Link from "next/link"
import { notFound } from "next/navigation"
import { HEALTH, PHASE_STATUS, PROJECT_STATUS, TASK_STATUS } from "@/components/portal/project-labels"
import { Badge, DataTable, PageHeader, StatCard, formatDate } from "@/components/portal/ui"
import { requireUser } from "@/lib/auth/session"
import { getProject, taskProgress, type ProjectTask } from "@/lib/revprojects"

export const metadata = {
  title: "Project",
}

function TaskRows({ tasks }: { tasks: ProjectTask[] }) {
  return (
    <DataTable headers={["TASK", "STATUS", "OWNER", "DUE", "DONE"]}>
      {tasks.map((task) => {
        const status = TASK_STATUS[task.status]
        return (
          <tr key={task.id} className="border-b border-border/50 last:border-0">
            <td className="px-3 py-2">
              <div className={task.parentTaskId ? "pl-4 text-muted-foreground" : ""}>{task.title}</div>
              {task.waitingOn === "CLIENT" && task.status !== "DONE" && (
                <div className="mt-1 font-mono text-[11px] text-primary">WAITING ON YOU</div>
              )}
            </td>
            <td className="px-3 py-2">{status && <Badge tone={status.tone}>{status.label}</Badge>}</td>
            <td className="px-3 py-2 text-muted-foreground">{task.assignee ?? "—"}</td>
            <td className="px-3 py-2 text-muted-foreground">{formatDate(task.plannedEnd)}</td>
            <td className="px-3 py-2 text-muted-foreground">{formatDate(task.completedAt)}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  // RevProjects re-checks the project against this user's identity, so another client's id is a 404.
  const project = await getProject(user, id)
  if (!project) notFound()

  const status = PROJECT_STATUS[project.status]
  const health = HEALTH[project.health]
  const { done, total } = taskProgress(project)
  const waitingOnClient = project.tasks.filter((task) => task.waitingOn === "CLIENT" && task.status !== "DONE").length

  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const unphased = project.tasks.filter((task) => !task.phaseId || !phases.some((phase) => phase.id === task.phaseId))

  return (
    <div>
      <Link href="/projects" className="font-mono text-xs text-muted-foreground hover:text-primary">
        ← ALL PROJECTS
      </Link>

      <div className="mt-4">
        <PageHeader
          title={project.name}
          subtitle={project.description ?? undefined}
          code={project.code ?? "PROJECT"}
          action={
            <div className="flex gap-2">
              {status && <Badge tone={status.tone}>{status.label}</Badge>}
              {health && project.status === "ACTIVE" && <Badge tone={health.tone}>{health.label}</Badge>}
            </div>
          }
        />
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="PROGRESS" value={`${Math.round(project.percentComplete)}%`} />
        <StatCard label="TASKS DONE" value={`${done} / ${total}`} />
        <StatCard label="WAITING ON YOU" value={String(waitingOnClient)} />
        <StatCard label="TARGET DATE" value={formatDate(project.endDate)} detail={`Started ${formatDate(project.startDate)}`} />
      </div>

      <div className="space-y-10">
        {phases.map((phase) => {
          const tasks = project.tasks.filter((task) => task.phaseId === phase.id)
          return (
            <section key={phase.id}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-heading text-primary">{phase.name}</h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {PHASE_STATUS[phase.status] ?? phase.status} · {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                </span>
              </div>
              {tasks.length > 0 ? (
                <TaskRows tasks={tasks} />
              ) : (
                <p className="text-sm text-muted-foreground">No client-facing tasks in this phase.</p>
              )}
            </section>
          )
        })}

        {unphased.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-heading text-primary">{phases.length > 0 ? "Other tasks" : "Tasks"}</h2>
            <TaskRows tasks={unphased} />
          </section>
        )}
      </div>
    </div>
  )
}
