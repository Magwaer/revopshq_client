import Link from "next/link"
import { HEALTH, PROJECT_STATUS } from "@/components/portal/project-labels"
import { Badge, EmptyState, PageHeader, SourceError, formatDate } from "@/components/portal/ui"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"
import { listProjects, taskProgress, type Project } from "@/lib/revprojects"

export const metadata = {
  title: "Projects",
}

export default async function ProjectsPage() {
  const user = await requireUser()

  let projects: Project[]
  try {
    projects = await listProjects(user)
  } catch (error) {
    console.error("[projects] RevProjects read failed", error)
    return (
      <div>
        <PageHeader title="Projects" subtitle={organizationName(user)} code="DELIVERY" />
        <SourceError source="RevProjects" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Projects" subtitle={organizationName(user)} code="DELIVERY" />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Projects RevOps HQ is delivering for you will appear here with their phases and progress."
        />
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const status = PROJECT_STATUS[project.status]
            const health = HEALTH[project.health]
            const { done, total } = taskProgress(project)
            const percent = Math.round(project.percentComplete)

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="block">
                <Card className="hover-glow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        {project.code && <div className="mb-1 font-mono text-xs text-primary/60">{project.code}</div>}
                        <CardTitle className="mb-1 text-lg">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {status && <Badge tone={status.tone}>{status.label}</Badge>}
                        {health && project.status === "ACTIVE" && <Badge tone={health.tone}>{health.label}</Badge>}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
                        <span>{percent}% COMPLETE</span>
                        <span>
                          {total > 0 ? `${done} / ${total} TASKS · ` : ""}
                          {formatDate(project.startDate)} → {formatDate(project.endDate)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
