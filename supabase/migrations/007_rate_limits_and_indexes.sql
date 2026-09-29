-- 007: rate_limits (DB-backed sliding window; serverless-safe, no in-memory Maps)

create table public.rate_limits (
  bucket text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- 008 (indexes consolidated here for a deterministic order)
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_assignee_idx on public.tickets (assignee_id);
create index if not exists tickets_priority_idx on public.tickets (priority);
create index if not exists tickets_due_date_idx on public.tickets (due_date);
create index if not exists tickets_source_message_idx on public.tickets (source_message_id);
create index if not exists chat_sessions_user_updated_idx on public.chat_sessions (user_id, updated_at desc);
create index if not exists app_users_name_lower_idx on public.app_users ((lower(name)));
