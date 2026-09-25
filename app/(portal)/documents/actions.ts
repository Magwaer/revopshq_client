"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import { isActionThrottled, recordAction } from "@/lib/portal-actions"
import { MAX_DOCUMENT_BYTES, isRevProjectsConfigured, listDocuments, uploadDocument } from "@/lib/revprojects"

export interface UploadState {
  status: "idle" | "success" | "error"
  message: string | null
}

export async function uploadDocumentAction(_previous: UploadState, formData: FormData): Promise<UploadState> {
  const user = await requireUser()
  if (!isRevProjectsConfigured()) return { status: "error", message: "Document uploads are not available yet." }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a file to upload." }
  if (file.size > MAX_DOCUMENT_BYTES) return { status: "error", message: "Files can be up to 25 MB." }

  // Only projects this user can already see; RevProjects enforces the same rule.
  const rawProject = formData.get("projectId")
  const projectId = typeof rawProject === "string" && rawProject ? rawProject : null

  if (await isActionThrottled(user.id, "document_uploaded")) {
    return { status: "error", message: "You have uploaded a lot of files recently. Please try again later." }
  }

  try {
    const { projects } = await listDocuments(user)
    if (projectId && !projects.some((project) => project.id === projectId)) {
      return { status: "error", message: "Choose one of your projects." }
    }
    const result = await uploadDocument(user, file, projectId)
    if (!result.ok) return { status: "error", message: result.message }
    await recordAction(user.id, "document_uploaded", result.document.id)
  } catch (error) {
    console.error("[documents] upload failed", error instanceof Error ? error.message : error)
    return { status: "error", message: "The upload failed. Please try again in a few minutes." }
  }

  revalidatePath("/documents")
  return { status: "success", message: `${file.name} was uploaded and shared with the RevOps HQ team.` }
}
