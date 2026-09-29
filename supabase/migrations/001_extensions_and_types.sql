-- 001: extensions and shared helpers
create extension if not exists "pgcrypto";

-- Updated-at trigger helper (shared by all tables).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
