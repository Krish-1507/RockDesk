-- 004: chat_messages (original user text is preserved verbatim)

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  detected_language text null,
  client_message_id text null,
  created_at timestamptz not null default now(),
  constraint chat_messages_client_id_unique unique (session_id, client_message_id)
);

create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at asc);
