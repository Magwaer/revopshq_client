-- Portal users, magic-link tokens, sessions and login throttling.
--
-- HubSpot stays the source of truth for invoices and tickets; RevProjects for projects.
-- This database only records who a portal user is and which HubSpot records they map to.

create extension if not exists citext;

create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  hubspot_contact_id text unique,
  hubspot_company_id text,
  first_name text,
  last_name text,
  company_name text,
  hubspot_synced_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_hubspot_company_idx on users (hubspot_company_id);

-- Only the SHA-256 of a token is stored, so a database leak yields nothing usable.
create table login_tokens (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  requested_ip inet,
  created_at timestamptz not null default now()
);

create index login_tokens_user_idx on login_tokens (user_id, created_at desc);

create table sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index sessions_user_idx on sessions (user_id);

-- One row per magic-link request, whether or not a link was sent. Throttling counts these.
create table login_requests (
  id bigint generated always as identity primary key,
  email citext not null,
  ip inet,
  outcome text not null check (outcome in ('sent', 'unknown_contact', 'throttled', 'error')),
  created_at timestamptz not null default now()
);

create index login_requests_email_idx on login_requests (email, created_at desc);
create index login_requests_ip_idx on login_requests (ip, created_at desc);
