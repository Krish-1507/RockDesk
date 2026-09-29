-- 008: atomic ticket creation RPC + RLS policies.
--
-- The browser only talks to the Express API for business operations, so the
-- API authorizes every request server-side. RLS is enabled as an additive
-- layer on all exposed tables per Supabase guidance.

-- Atomic path: insert ticket + TICKET_CREATED event + clear session draft.
create or replace function public.create_ticket_from_chat(
  p_title text,
  p_description text,
  p_original_title text,
  p_assignee_id uuid,
  p_due_date date,
  p_priority text,
  p_tags text[],
  p_language text,
  p_source_message_id uuid,
  p_source_session_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id uuid;
begin
  insert into public.tickets (
    title, description, original_title, assignee_id, due_date,
    priority, status, tags, language,
    source_message_id, source_session_id, source_type
  ) values (
    p_title, p_description, p_original_title, p_assignee_id, p_due_date,
    coalesce(p_priority, 'Medium'), 'Open', coalesce(p_tags, '{}'), p_language,
    p_source_message_id, p_source_session_id, 'chat'
  )
  returning id into v_ticket_id;

  insert into public.ticket_events (ticket_id, event_type, metadata)
  values (v_ticket_id, 'TICKET_CREATED', jsonb_build_object('source', 'chat'));

  if p_source_session_id is not null then
    update public.chat_sessions
      set pending_ticket = null,
          pending_state = 'idle'
      where id = p_source_session_id;
  end if;

  return v_ticket_id;
end;
$$;

-- RLS -----------------------------------------------------------------------
alter table public.app_users enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.rate_limits enable row level security;

-- Application access flows through the server-side privileged client with
-- API-layer authorization, so no permissive public policies are granted.
-- Authenticated users may read the assignable-user directory (names only are
-- exposed through the API allowlist) — enforced in the API, denied by default
-- here unless explicitly granted below.

drop policy if exists "service_full_access_app_users" on public.app_users;
create policy "service_full_access_app_users" on public.app_users
  for all to service_role using (true) with check (true);

drop policy if exists "service_full_access_chat_sessions" on public.chat_sessions;
create policy "service_full_access_chat_sessions" on public.chat_sessions
  for all to service_role using (true) with check (true);

drop policy if exists "service_full_access_chat_messages" on public.chat_messages;
create policy "service_full_access_chat_messages" on public.chat_messages
  for all to service_role using (true) with check (true);

drop policy if exists "service_full_access_tickets" on public.tickets;
create policy "service_full_access_tickets" on public.tickets
  for all to service_role using (true) with check (true);

drop policy if exists "service_full_access_ticket_events" on public.ticket_events;
create policy "service_full_access_ticket_events" on public.ticket_events
  for all to service_role using (true) with check (true);

drop policy if exists "service_full_access_rate_limits" on public.rate_limits;
create policy "service_full_access_rate_limits" on public.rate_limits
  for all to service_role using (true) with check (true);
