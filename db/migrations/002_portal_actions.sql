-- Writes a signed-in client makes to other systems (HubSpot tickets, RevProjects uploads).
-- Kept for rate limiting and as a record of who created what from the portal.
create table portal_actions (
  id bigserial primary key,
  user_id uuid not null references users (id) on delete cascade,
  action text not null check (action in ('ticket_created', 'document_uploaded')),
  external_id text,
  created_at timestamptz not null default now()
);

create index portal_actions_user_action_idx on portal_actions (user_id, action, created_at desc);
