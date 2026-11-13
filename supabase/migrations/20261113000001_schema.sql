-- Unscroll — Phase 2 / 1 of 3: schema (tables, constraints, indexes, triggers)
-- Business rules live in the database; the client only reads what the server returns.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- constants
create or replace function private.max_balance_seconds() returns integer
language sql immutable set search_path = '' as $$ select 7200 $$;          -- 120 min

create or replace function private.max_tasks_created_per_day() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text check (char_length(display_name) <= 40),
  timezone            text not null default 'America/Sao_Paulo',
  balance_seconds     integer not null default 0 check (balance_seconds between 0 and 7200),
  xp                  integer not null default 0 check (xp >= 0),
  gems                integer not null default 0 check (gems >= 0),
  streak_days         integer not null default 0 check (streak_days >= 0),
  last_completed_date date,
  streak_freeze_count smallint not null default 0 check (streak_freeze_count between 0 and 2),
  is_pro              boolean not null default false,
  active_mascot_skin  text not null default 'default',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_created_at_idx on public.profiles (created_at);

-- ---------------------------------------------------------------- shop_items
create table public.shop_items (
  sku           text primary key,
  kind          text not null check (kind in ('streak_freeze', 'free_pass', 'mascot_skin')),
  price_gems    integer not null check (price_gems > 0),
  grant_seconds integer check (grant_seconds is null or grant_seconds > 0),  -- free_pass only
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check ((kind = 'free_pass') = (grant_seconds is not null))
);

insert into public.shop_items (sku, kind, price_gems, grant_seconds) values
  ('streak_freeze',    'streak_freeze', 200, null),
  ('free_pass_30m',    'free_pass',     350, 1800),
  ('mascot_skin_fire', 'mascot_skin',   500, null),
  ('mascot_skin_zen',  'mascot_skin',   500, null);

-- ---------------------------------------------------------------- tasks
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 80),
  description     text check (char_length(description) <= 280),
  recurrence      text not null default 'once' check (recurrence in ('once', 'daily')),
  status          text not null default 'pending' check (status in ('pending', 'verifying', 'completed')),
  verifying_since timestamptz,
  reward_minutes  integer not null default 20,
  reward_xp       integer not null default 50,
  reward_gems     integer not null default 25,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_created_at_idx on public.tasks (user_id, created_at);

-- ---------------------------------------------------------------- task_completions
-- task_id is SET NULL on delete so deleting a task never frees the daily reward limit.
create table public.task_completions (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid references public.tasks (id) on delete set null,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  local_date      date not null,
  minutes_granted integer not null check (minutes_granted >= 0),
  xp_awarded      integer not null check (xp_awarded >= 0),
  gems_awarded    integer not null check (gems_awarded >= 0),
  created_at      timestamptz not null default now(),
  unique (task_id, local_date)
);
create index task_completions_user_date_idx on public.task_completions (user_id, local_date);
create index task_completions_created_at_idx on public.task_completions (created_at);

-- ---------------------------------------------------------------- task_verifications
create table public.task_verifications (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks (id) on delete set null,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  image_path  text not null,
  image_hash  text not null,
  local_date  date,                       -- filled by trigger from the user's timezone
  approved    boolean not null,
  confidence  numeric(4, 3) check (confidence between 0 and 1),
  code        text not null check (code in
                ('APPROVED','REJECTED','LOW_QUALITY','AI_UNAVAILABLE','DAILY_LIMIT','ALREADY_COMPLETED')),
  feedback    text,
  created_at  timestamptz not null default now()
);
create index task_verifications_user_id_idx on public.task_verifications (user_id);
create index task_verifications_created_at_idx on public.task_verifications (created_at);
create index task_verifications_task_date_idx on public.task_verifications (task_id, local_date);
-- A photo (by hash) can only ever back one approved verification per user.
create unique index task_verifications_hash_approved_uq
  on public.task_verifications (user_id, image_hash) where approved;

-- ---------------------------------------------------------------- screen_time_logs (audit)
create table public.screen_time_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  delta_seconds   integer not null,
  balance_after   integer not null check (balance_after >= 0),
  reason          text not null check (reason in ('task_reward', 'shop_free_pass', 'app_usage')),
  ref_id          uuid,
  client_event_id text,
  created_at      timestamptz not null default now()
);
create index screen_time_logs_user_id_idx on public.screen_time_logs (user_id);
create index screen_time_logs_created_at_idx on public.screen_time_logs (user_id, created_at);
create unique index screen_time_logs_event_uq
  on public.screen_time_logs (user_id, client_event_id) where client_event_id is not null;

-- ---------------------------------------------------------------- shop_purchases
create table public.shop_purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  sku         text not null references public.shop_items (sku),
  kind        text not null,
  price_gems  integer not null check (price_gems > 0),
  created_at  timestamptz not null default now()
);
create index shop_purchases_user_id_idx on public.shop_purchases (user_id);
create index shop_purchases_created_at_idx on public.shop_purchases (user_id, created_at);
create unique index shop_purchases_skin_once_uq
  on public.shop_purchases (user_id, sku) where kind = 'mascot_skin';

-- ---------------------------------------------------------------- triggers
create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger tasks_touch before update on public.tasks
  for each row execute function private.touch_updated_at();

-- Reward values are fixed server-side regardless of what the client sends.
create or replace function private.tasks_enforce_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tz    text;
  v_today date;
  v_count integer;
begin
  new.reward_minutes := 20;
  new.reward_xp      := 50;
  new.reward_gems    := 25;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    select timezone into v_tz from public.profiles where id = new.user_id;
    v_tz := coalesce(v_tz, 'America/Sao_Paulo');
    v_today := (now() at time zone v_tz)::date;
    select count(*) into v_count from public.tasks
      where user_id = new.user_id and (created_at at time zone v_tz)::date = v_today;
    if v_count >= private.max_tasks_created_per_day() then
      raise exception 'TASK_CREATE_LIMIT';
    end if;
  else
    if new.status = 'verifying' and old.status <> 'verifying' then
      new.verifying_since := now();
    elsif new.status <> 'verifying' then
      new.verifying_since := null;
    end if;
  end if;
  return new;
end $$;

create trigger tasks_enforce_rules before insert or update on public.tasks
  for each row execute function private.tasks_enforce_rules();

create or replace function private.verifications_set_local_date() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tz text;
begin
  if new.local_date is null then
    select timezone into v_tz from public.profiles where id = new.user_id;
    new.local_date := (now() at time zone coalesce(v_tz, 'America/Sao_Paulo'))::date;
  end if;
  return new;
end $$;

create trigger task_verifications_local_date before insert on public.task_verifications
  for each row execute function private.verifications_set_local_date();

-- Create the profile when an auth user is created.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
