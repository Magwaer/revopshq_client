import "server-only"
import { cache } from "react"
import type { PortalUser } from "@/lib/auth/users"
import { env } from "@/lib/env"
import { batchRead, hubspot, isHubSpotConfigured, listAssociations } from "./client"

/**
 * Invoices and tickets for a portal user: everything associated with their contact or
 * their company. Records are read live on each request; the ids are always derived from
 * the session's user, never from the URL.
 */

const INVOICE_PROPERTIES = [
  "hs_number",
  "hs_invoice_status",
  "hs_invoice_link",
  "hs_balance_due",
  "hs_amount_billed",
  "hs_currency",
  "hs_invoice_date",
  "hs_due_date",
] as const

const TICKET_PROPERTIES = [
  "subject",
  "content",
  "hs_pipeline",
  "hs_pipeline_stage",
  "hs_ticket_priority",
  "createdate",
  "closed_date",
] as const

/** Drafts are unsent bills and must never be shown. */
const VISIBLE_INVOICE_STATUSES = new Set(["open", "paid", "voided"])

/** Hosts an invoice link may point at. Anything else is not rendered as a link. */
const DEFAULT_INVOICE_HOSTS = ["clients.revopshq.com"]

export interface Invoice {
  id: string
  number: string | null
  status: string
  url: string | null
  amount: number | null
  balanceDue: number | null
  currency: string
  invoiceDate: string | null
  dueDate: string | null
}

export interface Ticket {
  id: string
  subject: string | null
  content: string | null
  stage: string
  isClosed: boolean
  priority: string | null
  createdAt: string | null
  closedAt: string | null
}

async function associatedIds(user: PortalUser, toType: string): Promise<string[]> {
  const sources: Array<Promise<Array<{ id: string }>>> = []
  if (user.hubspot_contact_id) sources.push(listAssociations("contacts", user.hubspot_contact_id, toType))
  if (user.hubspot_company_id) sources.push(listAssociations("companies", user.hubspot_company_id, toType))
  const results = await Promise.all(sources)
  return [...new Set(results.flat().map((entry) => entry.id))]
}

function parseNumber(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function safeInvoiceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:" || url.username || url.password) return null
    const configured = env().HUBSPOT_INVOICE_URL_HOSTS
    const hosts = (configured.length > 0 ? configured : DEFAULT_INVOICE_HOSTS).map((host) => host.toLowerCase())
    const host = url.hostname.toLowerCase()
    return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? raw : null
  } catch {
    return null
  }
}

export const listInvoices = cache(async (user: PortalUser): Promise<Invoice[]> => {
  if (!isHubSpotConfigured()) return []
  const ids = await associatedIds(user, "invoices")
  if (ids.length === 0) return []

  const objects = await batchRead("invoices", ids, INVOICE_PROPERTIES)
  return objects
    .filter((object) => VISIBLE_INVOICE_STATUSES.has(object.properties.hs_invoice_status ?? ""))
    .map((object) => {
      const p = object.properties
      return {
        id: object.id,
        number: p.hs_number ?? null,
        status: p.hs_invoice_status ?? "",
        url: safeInvoiceUrl(p.hs_invoice_link),
        amount: parseNumber(p.hs_amount_billed),
        balanceDue: parseNumber(p.hs_balance_due),
        currency: p.hs_currency || "USD",
        invoiceDate: p.hs_invoice_date ?? null,
        dueDate: p.hs_due_date ?? null,
      }
    })
})

interface PipelineStage {
  id: string
  label: string
  displayOrder: number
  metadata?: { ticketState?: string }
}

const ticketPipelines = cache(async () => {
  const response = await hubspot<{ results: Array<{ id: string; stages: PipelineStage[] }> }>("/crm/v3/pipelines/tickets")
  return response.results
})

const ticketStages = cache(async (): Promise<Map<string, PipelineStage>> => {
  const pipelines = await ticketPipelines()
  return new Map(pipelines.flatMap((pipeline) => pipeline.stages.map((stage) => [stage.id, stage] as const)))
})

/**
 * Only pipelines on the allowlist are shown. HubSpot accounts commonly have pipelines for
 * internal escalation whose stage names are not for customers' eyes. Defaults to "0", the
 * default Support Pipeline.
 */
function visiblePipelines(): string[] {
  const configured = env().HUBSPOT_TICKET_PIPELINE_IDS
  return configured.length > 0 ? configured : ["0"]
}

export const listTickets = cache(async (user: PortalUser): Promise<Ticket[]> => {
  if (!isHubSpotConfigured()) return []
  const ids = await associatedIds(user, "tickets")
  if (ids.length === 0) return []

  const [objects, stages] = await Promise.all([batchRead("tickets", ids, TICKET_PROPERTIES), ticketStages()])
  const pipelines = new Set(visiblePipelines())

  return objects
    .filter((object) => pipelines.has(object.properties.hs_pipeline ?? ""))
    .map((object) => {
      const p = object.properties
      const stage = stages.get(p.hs_pipeline_stage ?? "")
      return {
        id: object.id,
        subject: p.subject ?? null,
        content: p.content ?? null,
        stage: stage?.label ?? "Open",
        isClosed: stage?.metadata?.ticketState === "CLOSED" || Boolean(p.closed_date),
        priority: p.hs_ticket_priority ?? null,
        createdAt: p.createdate ?? null,
        closedAt: p.closed_date ?? null,
      }
    })
    .sort((a, b) => Number(a.isClosed) - Number(b.isClosed) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
})

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

// HubSpot-defined association types from ticket to contact and to its primary company.
const TICKET_TO_CONTACT = 16
const TICKET_TO_PRIMARY_COMPANY = 26

export class TicketCreationError extends Error {}

/**
 * Where new tickets go. The pipeline must be one the portal shows, or the client would
 * never see the ticket they just raised; the stage defaults to the pipeline's first.
 */
async function newTicketTarget(): Promise<{ pipeline: string; stage: string }> {
  const config = env()
  const visible = visiblePipelines()
  const pipelineId = config.HUBSPOT_NEW_TICKET_PIPELINE_ID ?? visible[0]
  if (!visible.includes(pipelineId)) {
    throw new TicketCreationError(`Pipeline ${pipelineId} is not in HUBSPOT_TICKET_PIPELINE_IDS`)
  }
  const pipeline = (await ticketPipelines()).find((entry) => entry.id === pipelineId)
  if (!pipeline) throw new TicketCreationError(`Ticket pipeline ${pipelineId} does not exist`)

  if (config.HUBSPOT_NEW_TICKET_STAGE_ID) {
    if (!pipeline.stages.some((stage) => stage.id === config.HUBSPOT_NEW_TICKET_STAGE_ID)) {
      throw new TicketCreationError(`Stage ${config.HUBSPOT_NEW_TICKET_STAGE_ID} is not in pipeline ${pipelineId}`)
    }
    return { pipeline: pipelineId, stage: config.HUBSPOT_NEW_TICKET_STAGE_ID }
  }
  const [first] = [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder)
  if (!first) throw new TicketCreationError(`Ticket pipeline ${pipelineId} has no stages`)
  return { pipeline: pipelineId, stage: first.id }
}

/** Raise a ticket on behalf of a portal user, associated with their contact and company. */
export async function createTicket(
  user: PortalUser,
  input: { subject: string; description: string; priority: TicketPriority },
): Promise<string> {
  if (!user.hubspot_contact_id && !user.hubspot_company_id) {
    throw new TicketCreationError("User has no HubSpot contact or company to associate the ticket with")
  }
  const target = await newTicketTarget()

  const associations: Array<{ to: { id: string }; types: Array<{ associationCategory: string; associationTypeId: number }> }> = []
  if (user.hubspot_contact_id) {
    associations.push({
      to: { id: user.hubspot_contact_id },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: TICKET_TO_CONTACT }],
    })
  }
  if (user.hubspot_company_id) {
    associations.push({
      to: { id: user.hubspot_company_id },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: TICKET_TO_PRIMARY_COMPANY }],
    })
  }

  const created = await hubspot<{ id: string }>("/crm/v3/objects/tickets", {
    method: "POST",
    creates: true,
    body: {
      properties: {
        subject: input.subject,
        content: `${input.description}\n\n— Submitted through the client portal by ${user.email}`,
        hs_pipeline: target.pipeline,
        hs_pipeline_stage: target.stage,
        hs_ticket_priority: input.priority,
      },
      associations,
    },
  })
  return created.id
}

/** A single ticket, only if it is one of this user's visible tickets. */
export async function getTicket(user: PortalUser, ticketId: string): Promise<Ticket | null> {
  const tickets = await listTickets(user)
  return tickets.find((ticket) => ticket.id === ticketId) ?? null
}
