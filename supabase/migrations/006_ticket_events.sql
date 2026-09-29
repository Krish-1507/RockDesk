-- 006: ticket_events (audit/activity timeline)

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid null references public.app_users (id) on delete set null,
  event_type text not null check (event_type in (
    'TICKET_CREATED', 'ASSIGNEE_CHANGED', 'DUE_DATE_CHANGED',
    'PRIORITY_CHANGED', 'STATUS_CHANGED', 'TICKET_UPDATED'
  )),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ticket_events_ticket_created_idx
  on public.ticket_events (ticket_id, created_at asc);
