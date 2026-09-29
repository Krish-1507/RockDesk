-- Seed: assignable team (duplicate Rahul records are intentional for
-- ambiguous-assignee testing) + a few sample tickets. No credentials here;
-- the demo admin Auth user is created via Supabase Auth and linked by email.

insert into public.app_users (name, email, role, department, active) values
  ('Priya Menon', 'priya.menon@example.com', 'member', 'Backend', true),
  ('Rahul Sharma', 'rahul.sharma@example.com', 'member', 'Backend', true),
  ('Rahul Verma', 'rahul.verma@example.com', 'member', 'Frontend', true),
  ('Amit Kumar', 'amit.kumar@example.com', 'member', 'DevOps', true),
  ('Neha Singh', 'neha.singh@example.com', 'member', 'QA', true),
  ('Admin', 'admin@rockdesk.demo', 'admin', 'Operations', true)
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  department = excluded.department,
  active = excluded.active;
