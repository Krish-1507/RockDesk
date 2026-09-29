-- 002: app_users (assignable people + application roles)
-- Supabase Auth owns credentials; this table owns profile/authorization data.

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid null unique references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null unique check (char_length(email) between 3 and 200),
  role text not null default 'member' check (role in ('admin', 'member')),
  department text null check (department is null or char_length(department) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_users_updated on public.app_users;
create trigger trg_app_users_updated
  before update on public.app_users
  for each row execute function public.touch_updated_at();
