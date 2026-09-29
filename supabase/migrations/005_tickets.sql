-- 005: tickets (human-readable ticket_number from a DB sequence)

create sequence public.ticket_number_seq start 100;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint not null unique default nextval('public.ticket_number_seq'),
  organization_id uuid null,
  title text not null check (char_length(title) between 3 and 200),
  description text not null check (char_length(description) between 1 and 4000),
  original_title text null,
  assignee_id uuid null references public.app_users (id) on delete set null,
  due_date date null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  tags text[] not null default '{}',
  language text null,
  source_message_id uuid null references public.chat_messages (id) on delete set null,
  source_session_id uuid null references public.chat_sessions (id) on delete set null,
  source_type text not null default 'chat',
  created_by uuid null references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tickets_updated on public.tickets;
create trigger trg_tickets_updated
  before update on public.tickets
  for each row execute function public.touch_updated_at();
