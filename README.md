# RevOps HQ client portal

Client-facing portal for RevOps HQ customers. Clients sign in with a magic link sent to their
email; the portal then shows:

| Section   | Source                                                                          |
|-----------|---------------------------------------------------------------------------------|
| Projects  | RevProjects client-portal API (client-visible phases and tasks)                 |
| Documents | RevProjects files shared with the client; uploads are stored in RevProjects     |
| Invoices  | HubSpot invoices associated with the contact **or** its company                 |
| Support   | HubSpot tickets associated with the contact **or** its company; new tickets    |
| Account   | The portal's own database (mirrored from HubSpot at sign-in)                    |

Next.js 15 (App Router, server components and actions), Tailwind with the revopshq.com design
tokens, and its own Postgres database.

## Running locally

```bash
pnpm install
cp .env.example .env     # fill in HubSpot and RevProjects values, see below
pnpm db:up               # Postgres on :5433
pnpm db:migrate
pnpm dev                 # http://localhost:3001
```

Magic links are emailed through SendGrid. Without `SENDGRID_API_KEY`, development prints the
link to the `pnpm dev` console instead (look for `[mail] SENDGRID_API_KEY not set`).

Without `HUBSPOT_ACCESS_TOKEN`, development sign-in accepts any email and shows no HubSpot
data. Production refuses to start a sign-in without it.

## Sign-in flow

1. The client enters an email on `/login`.
2. The portal searches HubSpot for a contact with that email. **No contact, no email** — but
   the page says "link sent" either way, so the form cannot be used to discover who is a client.
3. The contact id, its primary company id and company name are upserted into `users`.
4. A single-use link valid for 15 minutes is emailed. Only its SHA-256 hash is stored.
5. The link opens `/auth/verify`, which signs in on a button press (POST), not on page load:
   mail scanners open every link in a message and would otherwise burn the token.
6. A 30-day session cookie is issued; sessions are stored hashed in `sessions`.

Requests are throttled to 5 per email and 20 per IP per 15 minutes (`login_requests`).

## HubSpot app

`hubspot/` is a HubSpot developer project defining a **private app with a static token**:

| Scope                        | Used for                                                              |
|------------------------------|-----------------------------------------------------------------------|
| `crm.objects.contacts.read`  | Finding the contact by email; its associations; linking new tickets  |
| `crm.objects.companies.read` | The contact's company; its associations; linking new tickets         |
| `crm.objects.invoices.read`  | Invoices                                                              |
| `tickets`                    | Reading **and creating** tickets; ticket pipelines (stage labels)     |

`tickets` is HubSpot's combined read/write ticket scope — there is no separate ticket write
scope, so opening tickets needs nothing extra. New tickets are associated with the contact
(type 16) and, as primary, the company (type 26) in the same create call; that needs only read
access to the contact and company. Nothing is ever written to contacts or companies, so no
`*.write` CRM scopes are requested.

To install it into the RevOps HQ account:

```bash
cd hubspot
hs project upload --account <account-name-or-id>   # the account holding client data
```

Then in HubSpot: **Development → Projects → revopshq-client-portal → the app → Distribution:
install**, and copy the access token from the app's **Auth** tab into `HUBSPOT_ACCESS_TOKEN`.

Visibility rules:

- Invoices: drafts are never shown; the Invoices page lists `open` ones. "View & pay" links
  render only for hosts in `HUBSPOT_INVOICE_URL_HOSTS` (default `clients.revopshq.com`).
- Tickets: only pipelines listed in `HUBSPOT_TICKET_PIPELINE_IDS` (default `0`, the default
  Support Pipeline). Internal escalation pipelines must not be added.
- New tickets (`/support/new`) go to `HUBSPOT_NEW_TICKET_PIPELINE_ID` (default: the first
  visible pipeline, and it must be a visible one) at `HUBSPOT_NEW_TICKET_STAGE_ID` (default:
  that pipeline's first stage). Limited to 10 per user per hour. Ticket creation is never
  retried after a timeout or 5xx, since HubSpot may already have created it.

## RevProjects

The portal calls `GET {REVPROJECTS_API_URL}/client-portal/projects` and `/projects/:id` with an
`rppt_` portal token, passing the user's HubSpot company id (stored at sign-in: the contact's
primary company). RevProjects finds the client whose **HubSpot company id** matches and returns
all of its projects — linked directly, through an engagement, or tagged with the same company
id — except `DRAFT`, `CANCELLED` and `ARCHIVED` ones. Email and contact id are not used for
matching. Inside a project, only phases and tasks flagged client-visible are returned.

So for a client to see projects, set **HubSpot company ID** on the client in RevProjects to the
company id in HubSpot. A user whose HubSpot contact has no company sees no projects.

Create the token in RevProjects under **Settings → Client portal** (owner or admin), then set:

```
REVPROJECTS_API_URL=http://localhost:3010        # production: https://app.revprojects.io (/api is appended)
REVPROJECTS_API_TOKEN=rppt_...
```

A project is listed as soon as it belongs to the client; its tasks appear once they are marked
client-visible in RevProjects.

### Documents

Documents are RevProjects attachments (`Attachment` rows, stored in RevProjects' object
storage). The portal uses `GET /client-portal/documents`, `GET /client-portal/documents/:id` and
`POST /client-portal/documents` (multipart `file`, optional `projectId`).

- **Shared with the client:** files on the client's record or one of their portal-visible
  projects that a team member marked **Share** in the record's Files panel. Files are
  internal until shared.
- **Uploaded by the client:** stored on the chosen project, or on the client record for
  "General". They are shared automatically and show in RevProjects as
  `client@… (client portal)`.
- Downloads go through `/documents/:id/download`, which re-checks access with RevProjects on
  every request and streams the file, so storage URLs never reach the browser. External links
  (Drive, SharePoint) redirect instead.
- Up to 25 MB per file, same type allowlist as RevProjects; 40 uploads per user per hour.

## Production notes

- Set `APP_URL` to the public origin; it is used to build magic links.
- Set `SENDGRID_API_KEY` (a restricted key with only the **Mail Send** permission) and a
  `MAIL_FROM` on a domain authenticated in SendGrid (SPF/DKIM), or links land in spam. Click
  and open tracking are disabled per message, so SendGrid never rewrites the sign-in link.
- `DATABASE_URL` should point at a dedicated Postgres database; run `pnpm db:migrate` on deploy.
