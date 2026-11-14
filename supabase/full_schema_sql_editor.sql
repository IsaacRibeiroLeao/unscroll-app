-- GENERATED: concatenation of supabase/migrations/*.sql (paste into the Supabase SQL Editor, run once on an empty project)

-- ===== 20261113000001_schema.sql =====
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

-- ===== 20261113000002_rls_storage.sql =====
-- Unscroll — Phase 2 / 2 of 3: privileges, RLS, private Storage bucket

-- Start from zero: the client gets only what is granted below.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;
revoke all on all tables in schema public from anon, authenticated;

alter table public.profiles          enable row level security;
alter table public.shop_items        enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_completions  enable row level security;
alter table public.task_verifications enable row level security;
alter table public.screen_time_logs  enable row level security;
alter table public.shop_purchases    enable row level security;

-- Read-only for the owner. No INSERT/UPDATE/DELETE policy on profiles (writes go through RPCs).
grant select on public.profiles, public.task_completions, public.task_verifications,
                public.screen_time_logs, public.shop_purchases, public.shop_items to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy task_completions_select_own on public.task_completions
  for select to authenticated using (user_id = (select auth.uid()));
create policy task_verifications_select_own on public.task_verifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy screen_time_logs_select_own on public.screen_time_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy shop_purchases_select_own on public.shop_purchases
  for select to authenticated using (user_id = (select auth.uid()));
create policy shop_items_select_active on public.shop_items
  for select to authenticated using (active);

-- tasks: the client may only write title / description / recurrence (column privileges).
grant select, delete on public.tasks to authenticated;
grant insert (title, description, recurrence) on public.tasks to authenticated;
grant update (title, description, recurrence) on public.tasks to authenticated;

create policy tasks_select_own on public.tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy tasks_insert_own on public.tasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy tasks_update_own on public.tasks
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tasks_delete_own on public.tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- Storage: private proofs bucket
-- Path convention: proofs/{auth.uid()}/{file}. The client can only upload into its own folder;
-- reads/deletes are done by the Edge Function with service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

create policy proofs_insert_own_folder on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ===== 20261113000003_functions.sql =====
-- Unscroll — Phase 2 / 3 of 3: RPCs (all SECURITY DEFINER, search_path = '', fully-qualified names)
-- Errors are raised as plain codes (message = code) so the Edge Function / client can map them:
--   PROFILE_NOT_FOUND, TASK_NOT_FOUND, ALREADY_COMPLETED, DAILY_LIMIT, FORBIDDEN, ITEM_NOT_FOUND,
--   INSUFFICIENT_GEMS, FREEZE_LIMIT, BALANCE_CAP, ALREADY_OWNED, SKIN_NOT_OWNED,
--   INVALID_SECONDS, INVALID_EVENT_ID, INVALID_TIMEZONE

-- ------------------------------------------------------------------ complete_task_and_reward
-- Core takes p_now so the day boundary / streak rules can be tested; the public wrapper uses now().
create or replace function private.complete_task_core(p_task_id uuid, p_user_id uuid, p_now timestamptz)
returns table (
  new_balance_seconds integer, new_xp integer, new_gems integer, new_streak_days integer,
  streak_incremented boolean, minutes_awarded integer, xp_awarded integer, gems_awarded integer
)
language plpgsql security definer set search_path = '' as $$
declare
  v_profile     public.profiles%rowtype;
  v_task        public.tasks%rowtype;
  v_today       date;
  v_limit       integer;
  v_gap         integer;
  v_streak      integer;
  v_freeze      integer;
  v_granted     integer;
  v_balance     integer;
  v_gems        integer;
  v_xp          integer;
  v_completion  uuid;
begin
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  select * into v_task from public.tasks where id = p_task_id and user_id = p_user_id for update;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;

  v_today := (p_now at time zone v_profile.timezone)::date;

  if exists (select 1 from public.task_completions c
             where c.task_id = p_task_id and c.local_date = v_today) then
    raise exception 'ALREADY_COMPLETED';
  end if;

  v_limit := case when v_profile.is_pro then 5 else 1 end;
  if (select count(*) from public.task_completions c
      where c.user_id = p_user_id and c.local_date = v_today) >= v_limit then
    raise exception 'DAILY_LIMIT';
  end if;

  -- streak
  v_streak := v_profile.streak_days;
  v_freeze := v_profile.streak_freeze_count;
  if v_profile.last_completed_date is null then
    v_streak := 1;
  elsif v_profile.last_completed_date >= v_today then
    null;                                           -- same day: nothing changes
  else
    v_gap := v_today - v_profile.last_completed_date - 1;   -- missed days
    if v_gap = 0 then
      v_streak := v_streak + 1;
    elsif v_freeze >= v_gap then
      v_freeze := v_freeze - v_gap;
      v_streak := v_streak + 1;
    else
      v_streak := 1;                                -- reset, no freeze consumed
    end if;
  end if;

  -- rewards (balance capped; xp/gems always granted)
  v_granted := least(v_task.reward_minutes * 60, private.max_balance_seconds() - v_profile.balance_seconds);
  v_balance := v_profile.balance_seconds + v_granted;
  v_gems    := v_task.reward_gems * case when v_profile.is_pro then 2 else 1 end;
  v_xp      := v_task.reward_xp;

  insert into public.task_completions (task_id, user_id, local_date, minutes_granted, xp_awarded, gems_awarded)
  values (p_task_id, p_user_id, v_today, v_granted / 60, v_xp, v_gems)
  returning id into v_completion;

  insert into public.screen_time_logs (user_id, delta_seconds, balance_after, reason, ref_id)
  values (p_user_id, v_granted, v_balance, 'task_reward', v_completion);

  update public.profiles set
    balance_seconds     = v_balance,
    xp                  = xp + v_xp,
    gems                = gems + v_gems,
    streak_days         = v_streak,
    streak_freeze_count = v_freeze,
    last_completed_date = greatest(coalesce(last_completed_date, v_today), v_today)
  where id = p_user_id;

  update public.tasks set status = case when recurrence = 'once' then 'completed' else 'pending' end
  where id = p_task_id;

  return query select v_balance, v_profile.xp + v_xp, v_profile.gems + v_gems, v_streak,
                      v_streak > v_profile.streak_days, v_granted / 60, v_xp, v_gems;
end $$;

create or replace function public.complete_task_and_reward(p_task_id uuid, p_user_id uuid)
returns table (
  new_balance_seconds integer, new_xp integer, new_gems integer, new_streak_days integer,
  streak_incremented boolean, minutes_awarded integer, xp_awarded integer, gems_awarded integer
)
language sql security definer set search_path = '' as $$
  select * from private.complete_task_core(p_task_id, p_user_id, now());
$$;

-- ------------------------------------------------------------------ purchase_shop_item
create or replace function public.purchase_shop_item(p_user_id uuid, p_item_sku text)
returns table (new_gems integer, new_balance_seconds integer, new_streak_freeze_count integer, sku text)
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
  v_item    public.shop_items%rowtype;
  v_balance integer;
  v_freeze  integer;
begin
  if p_user_id is distinct from (select auth.uid()) then raise exception 'FORBIDDEN'; end if;

  select * into v_item from public.shop_items i where i.sku = p_item_sku and i.active;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  v_balance := v_profile.balance_seconds;
  v_freeze  := v_profile.streak_freeze_count;

  if v_item.kind = 'streak_freeze' then
    if v_freeze >= 2 then raise exception 'FREEZE_LIMIT'; end if;
  elsif v_item.kind = 'free_pass' then
    if v_balance + v_item.grant_seconds > private.max_balance_seconds() then
      raise exception 'BALANCE_CAP';
    end if;
  elsif v_item.kind = 'mascot_skin' then
    if exists (select 1 from public.shop_purchases p where p.user_id = p_user_id and p.sku = v_item.sku) then
      raise exception 'ALREADY_OWNED';
    end if;
  end if;

  if v_profile.gems < v_item.price_gems then raise exception 'INSUFFICIENT_GEMS'; end if;

  if v_item.kind = 'streak_freeze' then
    v_freeze := v_freeze + 1;
  elsif v_item.kind = 'free_pass' then
    v_balance := v_balance + v_item.grant_seconds;
    insert into public.screen_time_logs (user_id, delta_seconds, balance_after, reason)
    values (p_user_id, v_item.grant_seconds, v_balance, 'shop_free_pass');
  end if;

  insert into public.shop_purchases (user_id, sku, kind, price_gems)
  values (p_user_id, v_item.sku, v_item.kind, v_item.price_gems);

  update public.profiles set
    gems = gems - v_item.price_gems,
    balance_seconds = v_balance,
    streak_freeze_count = v_freeze
  where id = p_user_id;

  return query select v_profile.gems - v_item.price_gems, v_balance, v_freeze, v_item.sku;
end $$;

-- ------------------------------------------------------------------ consume_screen_time
create or replace function public.consume_screen_time(p_user_id uuid, p_seconds integer, p_client_event_id text)
returns table (new_balance_seconds integer, applied_seconds integer, duplicate boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
  v_applied integer;
  v_balance integer;
begin
  if p_user_id is distinct from (select auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_seconds is null or p_seconds <= 0 or p_seconds > 86400 then raise exception 'INVALID_SECONDS'; end if;
  if p_client_event_id is null or char_length(p_client_event_id) not between 1 and 100 then
    raise exception 'INVALID_EVENT_ID';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if exists (select 1 from public.screen_time_logs l
             where l.user_id = p_user_id and l.client_event_id = p_client_event_id) then
    return query select v_profile.balance_seconds, 0, true;
    return;
  end if;

  v_applied := least(p_seconds, v_profile.balance_seconds);
  v_balance := v_profile.balance_seconds - v_applied;

  insert into public.screen_time_logs (user_id, delta_seconds, balance_after, reason, client_event_id)
  values (p_user_id, -v_applied, v_balance, 'app_usage', p_client_event_id);

  update public.profiles set balance_seconds = v_balance where id = p_user_id;

  return query select v_balance, v_applied, false;
end $$;

-- ------------------------------------------------------------------ small setters (profiles has no UPDATE policy)
create or replace function public.set_profile_timezone(p_user_id uuid, p_timezone text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is distinct from (select auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = p_timezone) then
    raise exception 'INVALID_TIMEZONE';
  end if;
  update public.profiles set timezone = p_timezone where id = p_user_id;
  return p_timezone;
end $$;

create or replace function public.set_active_mascot_skin(p_user_id uuid, p_skin text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is distinct from (select auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_skin <> 'default' and not exists (
       select 1 from public.shop_purchases p
       where p.user_id = p_user_id and p.sku = p_skin and p.kind = 'mascot_skin') then
    raise exception 'SKIN_NOT_OWNED';
  end if;
  update public.profiles set active_mascot_skin = p_skin where id = p_user_id;
  return p_skin;
end $$;

-- ------------------------------------------------------------------ grants
revoke all on function public.complete_task_and_reward(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_task_and_reward(uuid, uuid) to service_role;

revoke all on function public.purchase_shop_item(uuid, text) from public, anon;
revoke all on function public.consume_screen_time(uuid, integer, text) from public, anon;
revoke all on function public.set_profile_timezone(uuid, text) from public, anon;
revoke all on function public.set_active_mascot_skin(uuid, text) from public, anon;
grant execute on function public.purchase_shop_item(uuid, text) to authenticated;
grant execute on function public.consume_screen_time(uuid, integer, text) to authenticated;
grant execute on function public.set_profile_timezone(uuid, text) to authenticated;
grant execute on function public.set_active_mascot_skin(uuid, text) to authenticated;

-- ===== 20261113000004_pro_status.sql =====
-- Unscroll — Phase 6: Pro status written ONLY by the RevenueCat webhook (service_role).
-- pro_event_at guards against out-of-order webhook deliveries (e.g. a late EXPIRATION arriving
-- after a RENEWAL): an older event never overwrites a newer one.

alter table public.profiles add column pro_event_at timestamptz;

create or replace function public.apply_pro_status(p_user_id uuid, p_is_pro boolean, p_event_at timestamptz)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_rows integer;
begin
  update public.profiles
     set is_pro = p_is_pro, pro_event_at = p_event_at
   where id = p_user_id
     and (pro_event_at is null or p_event_at >= pro_event_at);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end $$;

revoke all on function public.apply_pro_status(uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_pro_status(uuid, boolean, timestamptz) to service_role;

-- ===== 20261114000005_task_categories.sql =====
-- Unscroll — task categories. Photo categories (home, exercise) and text categories
-- (reading, study) differ in how they are proven AND how much they pay. Rewards stay
-- server-side: the client can only pick the category, never the amounts.

alter table public.tasks
  add column category text not null default 'home'
  check (category in ('home', 'exercise', 'reading', 'study'));

-- The client may choose the category when creating a task (not change it afterwards).
grant insert (category) on public.tasks to authenticated;

alter table public.task_verifications
  add column proof_kind text not null default 'photo' check (proof_kind in ('photo', 'text'));

create or replace function private.tasks_enforce_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tz    text;
  v_today date;
  v_count integer;
begin
  if new.category in ('reading', 'study') then
    new.reward_minutes := 20;
    new.reward_xp      := 75;
    new.reward_gems    := 40;
  else
    new.reward_minutes := 20;
    new.reward_xp      := 50;
    new.reward_gems    := 25;
  end if;

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
    new.category := old.category;   -- immutable after creation
    if new.status = 'verifying' and old.status <> 'verifying' then
      new.verifying_since := now();
    elsif new.status <> 'verifying' then
      new.verifying_since := null;
    end if;
  end if;
  return new;
end $$;

-- ===== 20261114000006_web_payments.sql =====
-- Unscroll — Pro sold outside the app stores (Mercado Pago: Pix / card).
-- The Mercado Pago webhook (service_role) is the only writer. One row per approved payment makes
-- webhook retries idempotent; profiles.pro_until / pro_lifetime hold the resulting entitlement.

alter table public.profiles
  add column pro_until timestamptz,
  add column pro_lifetime boolean not null default false;

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  provider            text not null default 'mercadopago',
  provider_payment_id text not null,
  plan                text not null check (plan in ('monthly', 'annual', 'lifetime')),
  amount_cents        integer not null check (amount_cents > 0),
  status              text not null default 'approved' check (status in ('approved', 'refunded')),
  created_at          timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_user_idx on public.payments (user_id);
-- RLS on with no policy: clients cannot read or write payments; only service_role can.
alter table public.payments enable row level security;

create or replace function public.plan_days(p_plan text)
returns integer language sql immutable set search_path = '' as $$
  select case p_plan when 'monthly' then 30 when 'annual' then 365 else null end
$$;

-- Records an approved payment once and extends the entitlement. Returns false for a duplicate.
create or replace function public.apply_web_payment(
  p_user_id uuid, p_plan text, p_provider_payment_id text, p_amount_cents integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_rows integer;
begin
  if p_plan not in ('monthly', 'annual', 'lifetime') then
    raise exception 'INVALID_PLAN';
  end if;
  insert into public.payments (user_id, plan, provider_payment_id, amount_cents)
  values (p_user_id, p_plan, p_provider_payment_id, p_amount_cents)
  on conflict (provider, provider_payment_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;

  update public.profiles
     set is_pro = true,
         pro_lifetime = pro_lifetime or p_plan = 'lifetime',
         pro_until = case when p_plan = 'lifetime' then pro_until
                          else greatest(coalesce(pro_until, now()), now())
                               + make_interval(days => public.plan_days(p_plan)) end
   where id = p_user_id;
  return true;
end $$;

-- Refund / chargeback: takes back exactly what that payment granted.
create or replace function public.revoke_web_payment(p_provider_payment_id text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid; v_plan text; v_lifetime boolean; v_until timestamptz;
begin
  update public.payments set status = 'refunded'
   where provider = 'mercadopago' and provider_payment_id = p_provider_payment_id
     and status = 'approved'
  returning user_id, plan into v_user, v_plan;
  if not found then return false; end if;

  select pro_lifetime, pro_until into v_lifetime, v_until from public.profiles where id = v_user;
  if v_plan = 'lifetime' then
    v_lifetime := false;
  elsif v_until is not null then
    v_until := v_until - make_interval(days => public.plan_days(v_plan));
  end if;
  update public.profiles
     set pro_lifetime = v_lifetime,
         pro_until = v_until,
         is_pro = v_lifetime or coalesce(v_until > now(), false)
   where id = v_user;
  return true;
end $$;

-- Time-limited web Pro lapses on its own; lifetime and store (RevenueCat) Pro are untouched.
create or replace function public.expire_lapsed_pro()
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_rows integer;
begin
  update public.profiles set is_pro = false
   where is_pro and not pro_lifetime and pro_until is not null and pro_until <= now();
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

-- A store EXPIRATION must not wipe an entitlement bought on the web.
create or replace function public.apply_pro_status(p_user_id uuid, p_is_pro boolean, p_event_at timestamptz)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_rows integer;
begin
  update public.profiles
     set is_pro = p_is_pro or pro_lifetime or coalesce(pro_until > now(), false),
         pro_event_at = p_event_at
   where id = p_user_id
     and (pro_event_at is null or p_event_at >= pro_event_at);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end $$;

revoke all on function public.plan_days(text) from public, anon, authenticated;
revoke all on function public.apply_web_payment(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.revoke_web_payment(text) from public, anon, authenticated;
revoke all on function public.expire_lapsed_pro() from public, anon, authenticated;
grant execute on function public.apply_web_payment(uuid, text, text, integer) to service_role;
grant execute on function public.revoke_web_payment(text) to service_role;
grant execute on function public.expire_lapsed_pro() to service_role;

create extension if not exists pg_cron;
select cron.schedule('expire-lapsed-pro', '*/15 * * * *', 'select public.expire_lapsed_pro()');

-- ===== 20261114000007_keep_payment_records.sql =====
-- Deleting an account must not erase the financial record of a payment (retention for tax and
-- chargeback purposes, LGPD art. 16 I). The row is kept but detached from the person.
alter table public.payments alter column user_id drop not null;
alter table public.payments drop constraint payments_user_id_fkey;
alter table public.payments
  add constraint payments_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;
