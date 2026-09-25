import "server-only"
import { env } from "@/lib/env"

const API_BASE = "https://api.hubapi.com"
const MAX_ATTEMPTS = 4
const TIMEOUT_MS = 15_000

export class HubSpotError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly body?: unknown,
  ) {
    super(message)
    this.name = "HubSpotError"
  }
}

export function isHubSpotConfigured(): boolean {
  return Boolean(env().HUBSPOT_ACCESS_TOKEN)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 429 and 5xx are retried with jittered backoff (honouring Retry-After). 401/403 and other
 * 4xx are not: a revoked or under-scoped token will not fix itself.
 *
 * Pass `creates: true` for requests that create a record. Those are retried only on 429,
 * which HubSpot rejects before processing; a timeout or 5xx may have created the record
 * already, and retrying would duplicate it.
 */
export async function hubspot<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string>; creates?: boolean } = {},
): Promise<T> {
  const token = env().HUBSPOT_ACCESS_TOKEN
  if (!token) throw new HubSpotError("HUBSPOT_ACCESS_TOKEN is not set", null)

  const url = new URL(`${API_BASE}${path}`)
  for (const [key, value] of Object.entries(init.query ?? {})) url.searchParams.set(key, value)

  for (let attempt = 1; ; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        method: init.method ?? "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      })
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || init.creates) {
        throw new HubSpotError(error instanceof Error ? error.message : "HubSpot request failed", null)
      }
      await sleep(Math.random() * 500 * 2 ** attempt)
      continue
    }

    if (response.ok) return (await response.json()) as T

    const retryable = response.status === 429 || (response.status >= 500 && !init.creates)
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      const body = await response.json().catch(() => null)
      throw new HubSpotError(`HubSpot ${init.method ?? "GET"} ${path} failed with ${response.status}`, response.status, body)
    }

    const retryAfter = Number(response.headers.get("retry-after"))
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20_000) : Math.random() * 500 * 2 ** attempt)
  }
}

export interface HubSpotObject {
  id: string
  properties: Record<string, string | null>
}

interface AssociationPage {
  results: Array<{ toObjectId: number | string; associationTypes: Array<{ typeId: number; label: string | null }> }>
  paging?: { next?: { after: string } }
}

export interface AssociatedId {
  id: string
  primary: boolean
}

/** Every record of `toType` associated with one record, following pagination. */
export async function listAssociations(fromType: string, fromId: string, toType: string): Promise<AssociatedId[]> {
  const ids: AssociatedId[] = []
  let after: string | undefined

  do {
    const page = await hubspot<AssociationPage>(`/crm/v4/objects/${fromType}/${fromId}/associations/${toType}`, {
      query: { limit: "500", ...(after ? { after } : {}) },
    })
    for (const result of page.results) {
      ids.push({
        id: String(result.toObjectId),
        primary: result.associationTypes.some((type) => type.label === "Primary"),
      })
    }
    after = page.paging?.next?.after
  } while (after)

  return ids
}

/** Batch read in chunks of 100, the API's limit. */
export async function batchRead(objectType: string, ids: string[], properties: readonly string[]): Promise<HubSpotObject[]> {
  const unique = [...new Set(ids)]
  const objects: HubSpotObject[] = []

  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100)
    const response = await hubspot<{ results: HubSpotObject[] }>(`/crm/v3/objects/${objectType}/batch/read`, {
      method: "POST",
      body: { properties, inputs: chunk.map((id) => ({ id })) },
    })
    objects.push(...response.results)
  }

  return objects
}
