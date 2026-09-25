import "server-only"
import { cache } from "react"
import type { PortalUser } from "@/lib/auth/users"
import { env } from "@/lib/env"

/**
 * RevProjects client-portal API (`/api/client-portal/*` in the RevProjects backend).
 *
 * Authenticated with an `rppt_` portal token, created in RevProjects under Settings →
 * Client portal. The token scopes every call to one RevProjects workspace; RevProjects then
 * matches projects to this client by HubSpot company id, HubSpot contact id or email, and
 * returns only phases and tasks marked client-visible.
 */

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED"
export type ProjectHealth = "ON_TRACK" | "AT_RISK" | "OFF_TRACK"
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE"

export interface ProjectPhase {
  id: string
  name: string
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE"
  health: ProjectHealth | null
  order: number
  startDate: string | null
  endDate: string | null
}

export interface ProjectTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  waitingOn: "NONE" | "CLIENT" | "INTERNAL"
  plannedStart: string | null
  plannedEnd: string | null
  completedAt: string | null
  phaseId: string | null
  parentTaskId: string | null
  order: number
  assignee: string | null
}

export interface Project {
  id: string
  name: string
  code: string | null
  description: string | null
  status: ProjectStatus
  health: ProjectHealth
  percentComplete: number
  startDate: string | null
  endDate: string | null
  phases: ProjectPhase[]
  tasks: ProjectTask[]
}

export class RevProjectsError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message)
    this.name = "RevProjectsError"
  }
}

export function isRevProjectsConfigured(): boolean {
  const config = env()
  return Boolean(config.REVPROJECTS_API_URL && config.REVPROJECTS_API_TOKEN)
}

function identityQuery(user: PortalUser): URLSearchParams {
  const params = new URLSearchParams({ email: user.email })
  if (user.hubspot_contact_id) params.set("hubspotContactId", user.hubspot_contact_id)
  if (user.hubspot_company_id) params.set("hubspotCompanyIds", user.hubspot_company_id)
  return params
}

/** Accepts either the app origin (https://app.revprojects.io) or its /api root. */
function apiBase(): string {
  const origin = env().REVPROJECTS_API_URL!.replace(/\/+$/, "")
  return origin.endsWith("/api") ? origin : `${origin}/api`
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env().REVPROJECTS_API_TOKEN}`, Accept: "application/json" }
}

async function request<T>(path: string, user: PortalUser): Promise<T | null> {
  const response = await fetch(`${apiBase()}${path}?${identityQuery(user)}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })

  if (response.status === 404) return null
  if (!response.ok) throw new RevProjectsError(`RevProjects GET ${path} failed with ${response.status}`, response.status)
  return (await response.json()) as T
}

export const listProjects = cache(async (user: PortalUser): Promise<Project[]> => {
  if (!isRevProjectsConfigured()) return []
  const body = await request<{ projects: Project[] }>("/client-portal/projects", user)
  return body?.projects ?? []
})

export async function getProject(user: PortalUser, projectId: string): Promise<Project | null> {
  if (!isRevProjectsConfigured()) return null
  const body = await request<{ project: Project }>(`/client-portal/projects/${encodeURIComponent(projectId)}`, user)
  return body?.project ?? null
}

/**
 * Files shared with the client in RevProjects: attachments on their client record or on
 * one of their projects that a team member marked "Shared", plus everything the client
 * uploaded here.
 */
export interface PortalDocument {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  /** A link to something stored elsewhere (Drive, SharePoint) rather than an upload. */
  isExternal: boolean
  project: { id: string; name: string } | null
  uploadedByClient: boolean
  uploadedBy: string | null
}

export interface DocumentList {
  documents: PortalDocument[]
  projects: { id: string; name: string }[]
  canUpload: boolean
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024

export const listDocuments = cache(async (user: PortalUser): Promise<DocumentList> => {
  const empty: DocumentList = { documents: [], projects: [], canUpload: false }
  if (!isRevProjectsConfigured()) return empty
  return (await request<DocumentList>("/client-portal/documents", user)) ?? empty
})

export async function getDocument(user: PortalUser, id: string): Promise<(PortalDocument & { url: string }) | null> {
  if (!isRevProjectsConfigured()) return null
  return request<PortalDocument & { url: string }>(`/client-portal/documents/${encodeURIComponent(id)}`, user)
}

/** Rejections RevProjects explains (type not allowed, too large) come back as `message`. */
export async function uploadDocument(
  user: PortalUser,
  file: File,
  projectId: string | null,
): Promise<{ ok: true; document: PortalDocument } | { ok: false; message: string }> {
  const form = new FormData()
  form.set("file", file, file.name)
  for (const [key, value] of identityQuery(user)) form.set(key, value)
  if (projectId) form.set("projectId", projectId)

  const response = await fetch(`${apiBase()}/client-portal/documents`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  })
  if (response.ok) return { ok: true, document: (await response.json()) as PortalDocument }
  if (response.status >= 400 && response.status < 500) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null
    const message = typeof body?.message === "string" ? body.message : "That file could not be uploaded."
    return { ok: false, message }
  }
  throw new RevProjectsError(`RevProjects upload failed with ${response.status}`, response.status)
}

/**
 * Fetch the bytes of an uploaded document. RevProjects stores uploads on its CDN, or
 * serves them from `/api/uploads/local/…` when object storage is not configured, so a
 * relative URL resolves against the API origin. Only call this for non-external documents:
 * external links point at arbitrary hosts and are redirected to instead.
 */
export async function fetchDocumentContent(url: string): Promise<Response> {
  const response = await fetch(new URL(url, apiBase()), {
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  })
  if (!response.ok || !response.body) {
    throw new RevProjectsError(`Document download failed with ${response.status}`, response.status)
  }
  return response
}

/** Top-level tasks only; subtasks would double-count the work. */
export function taskProgress(project: Project): { done: number; total: number } {
  const tasks = project.tasks.filter((task) => !task.parentTaskId)
  return { done: tasks.filter((task) => task.status === "DONE").length, total: tasks.length }
}
