-- Preserve the exact result of each submission, including its ticket, for retries.
alter table public.chat_messages add column if not exists outcome jsonb;

-- SECURITY DEFINER functions must not be callable with public browser keys.
revoke execute on function public.create_ticket_from_chat(text,text,text,uuid,date,text,text[],text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_ticket_from_chat(text,text,text,uuid,date,text,text[],text,uuid,uuid) to service_role;

create or replace function public.consume_rate_limit(p_bucket text, p_window_start timestamptz)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limits(bucket, count, window_start)
  values (p_bucket, 1, p_window_start)
  on conflict (bucket) do update set count = rate_limits.count + 1
  returning count;
$$;
revoke execute on function public.consume_rate_limit(text,timestamptz) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,timestamptz) to service_role;
