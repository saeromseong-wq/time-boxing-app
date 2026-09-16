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
  end_min int not null check (end_min between 1 and 2880), -- 2880 = 자정을 넘겨 다음날 24:00까지 표현
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

-- 마이그레이션: 자정 넘김(다음날까지) 타임박스 입력 지원 (2026-07-10)
-- 테이블이 이미 있는 환경(create table if not exists가 스킵됨)에서도 반영되도록 별도 적용.
alter table public.time_boxes drop constraint if exists time_boxes_end_min_check;
alter table public.time_boxes add constraint time_boxes_end_min_check check (end_min between 1 and 2880);

-- 마이그레이션: 주간 몰입 목표 (2026-08-31)
-- 특정 주에 명시적으로 설정된 값이 없으면, 그 주 이전에 가장 최근에 설정된 값을 그대로 적용한다
-- (목표를 바꾸면 그 시점 이후 주부터만 새 값이 적용되고, 과거 주의 목표는 유지됨).
create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null, -- 해당 주의 월요일
  target_minutes int not null check (target_minutes > 0),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists idx_weekly_goals_user_week on public.weekly_goals (user_id, week_start);
alter table public.weekly_goals enable row level security;
create policy "own weekly_goals" on public.weekly_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 마이그레이션: Task 수동 정렬 + '바로 시작' 노출 선택 (2026-09-08)
-- sort_order: 낮을수록 위 (Task 라이브러리 목록 수동 정렬)
-- quick_start_order: null이면 '바로 시작'에 노출 안 함, 값이 있으면 그 순서대로 노출
alter table public.tasks add column if not exists sort_order int not null default 0;
alter table public.tasks add column if not exists quick_start_order int;

-- 기존 행에 한해, 현재 화면에 보이던 순서(최근 사용순)를 그대로 sort_order로 백필
with ranked as (
  select id, row_number() over (
    partition by user_id order by last_used_at desc nulls last, created_at desc
  ) as rn
  from public.tasks
)
update public.tasks t set sort_order = ranked.rn
from ranked
where t.id = ranked.id and t.sort_order = 0;

-- 마이그레이션: 타임박스별 목표/한 일 선택 입력 (2026-09-09)
alter table public.time_boxes add column if not exists goal text;
alter table public.time_boxes add column if not exists note text;

-- 마이그레이션: 목표를 체크리스트로 변경, 한 일은 제거 (2026-09-09)
-- goal(단일 텍스트) 대신 goals({text, done}[], 최대 10개, 클라이언트에서 제한) 사용.
-- 목표 체크리스트를 체크해나가는 것으로 한 일 기록을 대신하기로 해서 note는 제거.
-- 기존에 입력해둔 목표/한 일 텍스트는 사라진다 (아직 테스트 데이터뿐이라 마이그레이션 없이 교체).
alter table public.time_boxes drop column if exists goal;
alter table public.time_boxes drop column if exists note;
alter table public.time_boxes add column if not exists goals jsonb not null default '[]'::jsonb;

-- 마이그레이션: 데일리 할 일 + 타임박스별 할 일 정규화 (2026-09-16)
-- time_boxes.goals(jsonb) 체크리스트를 없애고, 하루 단위로 독립된 daily_todos와
-- 타임박스별 time_box_todos 두 테이블로 분리한다.
-- time_box_todos.daily_todo_id가 있으면 데일리 할 일을 이 타임박스에 "가져오기"한 항목으로,
-- 완료 여부는 daily_todos.done을 그대로 따른다(양쪽 중 어디서 체크해도 같은 항목이 체크됨) —
-- 그래서 daily_todo_id가 있는 행의 자체 done 컬럼 값은 쓰지 않는다.
-- 기존 goals 체크리스트 데이터는 아직 테스트 데이터뿐이라 마이그레이션 없이 버린다.
create table if not exists public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  text text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_daily_todos_user_date on public.daily_todos (user_id, date);
alter table public.daily_todos enable row level security;
create policy "own daily_todos" on public.daily_todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.time_box_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  time_box_id uuid not null references public.time_boxes(id) on delete cascade,
  daily_todo_id uuid references public.daily_todos(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_time_box_todos_box on public.time_box_todos (time_box_id);
create index if not exists idx_time_box_todos_daily on public.time_box_todos (daily_todo_id);
alter table public.time_box_todos enable row level security;
create policy "own time_box_todos" on public.time_box_todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.time_boxes drop column if exists goals;
