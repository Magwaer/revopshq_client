import "server-only"
import { Pool, type QueryResultRow } from "pg"
import { env } from "./env"

// Survives dev-server hot reloads, which would otherwise open a new pool per edit.
const globalForPool = globalThis as unknown as { portalPool?: Pool }

function pool(): Pool {
  if (!globalForPool.portalPool) {
    globalForPool.portalPool = new Pool({ connectionString: env().DATABASE_URL, max: 10 })
  }
  return globalForPool.portalPool
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool().query<T>(text, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
