-- Time Boxing App 스키마
-- Supabase 대시보드 → SQL Editor에 전체 붙여넣고 Run 하세요.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  category text not null default 'deep' check (category in ('deep', 'shallow', 'rest')),
  default_duration_min int not null default 60 check (default_duration_min between 5 and 480),
  archived boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.time_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  date date not null,
  start_min int not null check (start_min between 0 and 1439),
  end_min int not null check (end_min between 1 and 1440),
  created_at timestamptz not null default now(),
  check (end_min > start_min)
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  time_box_id uuid not null references public.time_boxes(id) on delete cascade,
  state text not null default 'running' check (state in ('running', 'paused', 'done')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  focused_seconds int not null default 0,
  last_resumed_at timestamptz default now(),
  pause_count int not null default 0
);

create index if not exists idx_time_boxes_user_date on public.time_boxes (user_id, date);
create index if not exists idx_focus_sessions_user_state on public.focus_sessions (user_id, state);
create index if not exists idx_focus_sessions_time_box on public.focus_sessions (time_box_id);

alter table public.tasks enable row level security;
alter table public.time_boxes enable row level security;
alter table public.focus_sessions enable row level security;

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own time_boxes" on public.time_boxes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own focus_sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
