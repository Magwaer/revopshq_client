// Applies db/migrations/*.sql in filename order, each once, each in its own transaction.
//
//   npm run db:migrate
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations")
const client = new pg.Client({ connectionString: url })
await client.connect()

try {
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`)

  const { rows } = await client.query("select name from schema_migrations")
  const applied = new Set(rows.map((row) => row.name))
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(dir, file), "utf8")
    console.log(`applying ${file}`)
    await client.query("begin")
    try {
      await client.query(sql)
      await client.query("insert into schema_migrations (name) values ($1)", [file])
      await client.query("commit")
    } catch (error) {
      await client.query("rollback")
      throw error
    }
  }

  console.log("migrations up to date")
} finally {
  await client.end()
}
