import "server-only"
import { z } from "zod"

const list = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  )

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3001"),
  DATABASE_URL: z.string().min(1),

  SENDGRID_API_KEY: z.string().optional(),
  // Must be a verified sender or on an authenticated domain in SendGrid.
  MAIL_FROM: z.string().default("RevOps HQ <portal@revopshq.com>"),

  HUBSPOT_ACCESS_TOKEN: z.string().optional(),
  HUBSPOT_TICKET_PIPELINE_IDS: list,
  HUBSPOT_NEW_TICKET_PIPELINE_ID: z.string().optional(),
  HUBSPOT_NEW_TICKET_STAGE_ID: z.string().optional(),
  HUBSPOT_INVOICE_URL_HOSTS: list,

  REVPROJECTS_API_URL: z.string().url().optional(),
  REVPROJECTS_API_TOKEN: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

export function env(): Env {
  if (!cached) {
    // A key left blank in .env (`FOO=`) means unset, not an empty value.
    const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""))
    cached = schema.parse(defined)
  }
  return cached
}
