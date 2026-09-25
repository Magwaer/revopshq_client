"use client"

import { useActionState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { uploadDocumentAction, type UploadState } from "./actions"

const INITIAL: UploadState = { status: "idle", message: null }

const fieldClass =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"

export function UploadForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(uploadDocumentAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <form ref={formRef} action={action} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="file" className="block font-mono text-xs text-primary/70">
              FILE
            </label>
            <input
              id="file"
              name="file"
              type="file"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:font-mono file:text-xs file:text-primary hover:file:bg-primary/5"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="projectId" className="block font-mono text-xs text-primary/70">
              PROJECT
            </label>
            <select id="projectId" name="projectId" defaultValue="" className={fieldClass}>
              <option value="">General — not project-specific</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md border border-primary/20 bg-primary/5 px-6 font-mono text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            {pending ? "UPLOADING…" : "UPLOAD"}
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          PDF, Office documents, images, CSV, text and ZIP files up to 25 MB. Uploads are visible to the RevOps HQ team.
        </p>
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mt-3 font-mono text-sm ${state.status === "error" ? "text-destructive" : "text-primary"}`}
          >
            {state.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
