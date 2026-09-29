-- 003: chat_sessions (public token-hash isolation + pending draft state)
-- Database state is authoritative; Vercel functions are ephemeral.

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.app_users (id) on delete set null,
  public_access_token_hash text not null,
  pending_ticket jsonb null,
  pending_state text not null default 'idle' check (pending_state in ('idle', 'awaiting_clarification', 'ready_to_create')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_chat_sessions_updated on public.chat_sessions;
create trigger trg_chat_sessions_updated
  before update on public.chat_sessions
  for each row execute function public.touch_updated_at();
