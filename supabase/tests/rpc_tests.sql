-- Unscroll — database tests (plain SQL asserts, no pgTAP needed).
-- Run ONLY against a local/dev database (everything is rolled back at the end):
--   psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rpc_tests.sql
-- Local default (supabase start): postgresql://postgres:postgres@127.0.0.1:54322/postgres
\set ON_ERROR_STOP on
\set QUIET on
begin;

grant all on all tables in schema public to service_role;   -- no-op on Supabase, needed on plain Postgres

create function pg_temp.u(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;

create function pg_temp.mk_task(uid uuid, t text default 'Tarefa', rec text default 'once') returns uuid
language sql as $$ insert into public.tasks (user_id, title, recurrence) values (uid, t, rec) returning id $$;

create function pg_temp.login(n int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', pg_temp.u(n)::text, true) $$;

-- runs a statement, returns 'OK' or the error message
create function pg_temp.err(stmt text) returns text language plpgsql as $$
begin execute stmt; return 'OK'; exception when others then return sqlerrm; end $$;

-- 1..: users (profile created by trigger)
insert into auth.users (id) select pg_temp.u(n) from generate_series(1, 20) n;

do $$ begin
  assert (select count(*) from public.profiles where id in (select pg_temp.u(n) from generate_series(1,20) n)) = 20,
    'profile trigger: every auth user gets a profile';
  assert (select timezone from public.profiles where id = pg_temp.u(1)) = 'America/Sao_Paulo', 'default tz';
end $$;

-- ===================================================== streak / rewards (core with injected clock)
-- User 1: first completion, same day, next day.   2026-03-10 15:00Z = 12:00 in São Paulo
do $$ declare r record; t1 uuid; t2 uuid; t3 uuid; begin
  t1 := pg_temp.mk_task(pg_temp.u(1)); t2 := pg_temp.mk_task(pg_temp.u(1)); t3 := pg_temp.mk_task(pg_temp.u(1));
  select * into r from private.complete_task_core(t1, pg_temp.u(1), '2026-03-10 15:00Z');
  assert r.new_balance_seconds = 1200 and r.minutes_awarded = 20, 'first: 20 min';
  assert r.new_xp = 50 and r.xp_awarded = 50 and r.new_gems = 25 and r.gems_awarded = 25, 'first: xp/gems';
  assert r.new_streak_days = 1 and r.streak_incremented, 'first: streak 1';

  assert pg_temp.err(format('select private.complete_task_core(%L,%L,%L)', t1, pg_temp.u(1), '2026-03-10 20:00Z'))
         = 'ALREADY_COMPLETED', 'same task same day (idempotent)';
  assert pg_temp.err(format('select private.complete_task_core(%L,%L,%L)', t2, pg_temp.u(1), '2026-03-10 20:00Z'))
         = 'DAILY_LIMIT', 'free: 1 reward/day';
  assert (select balance_seconds from public.profiles where id = pg_temp.u(1)) = 1200, 'no double reward';
  assert (select count(*) from public.screen_time_logs where user_id = pg_temp.u(1)) = 1, 'single log row';

  select * into r from private.complete_task_core(t2, pg_temp.u(1), '2026-03-11 15:00Z');
  assert r.new_streak_days = 2 and r.streak_incremented, 'consecutive day: streak 2';
  assert (select status from public.tasks where id = t2) = 'completed', 'once-task completed';
end $$;

-- User 2: gap with enough freezes (gap 1) and then insufficient freezes (gap 2, 1 freeze)
update public.profiles set streak_days = 5, streak_freeze_count = 2, last_completed_date = '2026-03-11' where id = pg_temp.u(2);
do $$ declare r record; begin
  select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(2)), pg_temp.u(2), '2026-03-13 15:00Z');
  assert r.new_streak_days = 6 and r.streak_incremented, 'gap1 with freezes: streak+1';
  assert (select streak_freeze_count from public.profiles where id = pg_temp.u(2)) = 1, 'gap1 consumes 1 freeze';

  select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(2)), pg_temp.u(2), '2026-03-16 15:00Z');
  assert r.new_streak_days = 1 and not r.streak_incremented, 'gap2 with 1 freeze: reset to 1';
  assert (select streak_freeze_count from public.profiles where id = pg_temp.u(2)) = 1, 'reset consumes no freeze';
end $$;

-- User 3: gap 2 with exactly 2 freezes
update public.profiles set streak_days = 4, streak_freeze_count = 2, last_completed_date = '2026-03-10' where id = pg_temp.u(3);
do $$ declare r record; begin
  select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(3)), pg_temp.u(3), '2026-03-13 15:00Z');
  assert r.new_streak_days = 5, 'gap2 with 2 freezes: streak+1';
  assert (select streak_freeze_count from public.profiles where id = pg_temp.u(3)) = 0, 'gap2 consumes 2 freezes';
end $$;

-- User 4 (São Paulo, UTC-3): two completions on the SAME UTC day but DIFFERENT local days
do $$ declare r record; begin
  perform private.complete_task_core(pg_temp.mk_task(pg_temp.u(4)), pg_temp.u(4), '2026-03-11 02:30Z'); -- local 03-10 23:30
  select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(4)), pg_temp.u(4), '2026-03-11 03:30Z'); -- local 03-11 00:30
  assert r.new_streak_days = 2, 'local day rollover (UTC-3) counts as consecutive day';
  assert (select last_completed_date from public.profiles where id = pg_temp.u(4)) = '2026-03-11', 'last date is local';
end $$;

-- User 5 (Tokyo, UTC+9): 14:30Z is still 03-10 local, 15:30Z is already 03-11 local
update public.profiles set timezone = 'Asia/Tokyo' where id = pg_temp.u(5);
do $$ declare r record; begin
  perform private.complete_task_core(pg_temp.mk_task(pg_temp.u(5)), pg_temp.u(5), '2026-03-10 14:30Z');
  select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(5)), pg_temp.u(5), '2026-03-10 15:30Z');
  assert r.new_streak_days = 2, 'UTC+9 rollover';
end $$;

-- User 6 (Pro): 5/day, gems x2, 6th blocked; same-day completions do not change the streak
update public.profiles set is_pro = true where id = pg_temp.u(6);
do $$ declare r record; i int; begin
  for i in 1..5 loop
    select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(6)), pg_temp.u(6), '2026-03-10 15:00Z');
    assert r.gems_awarded = 50, 'pro gems x2';
  end loop;
  assert r.new_streak_days = 1 and not r.streak_incremented, 'same-day: streak unchanged';
  assert pg_temp.err(format('select private.complete_task_core(%L,%L,%L)', pg_temp.mk_task(pg_temp.u(6)), pg_temp.u(6), '2026-03-10 16:00Z'))
         = 'DAILY_LIMIT', 'pro: 6th blocked';
  assert (select gems from public.profiles where id = pg_temp.u(6)) = 250, 'pro total gems';
  assert (select balance_seconds from public.profiles where id = pg_temp.u(6)) = 6000, '5 x 20 min';
end $$;

-- User 7: balance cap (120 min)
update public.profiles set balance_seconds = 7000 where id = pg_temp.u(7);
do $$ declare r record; begin
  select * into r from private.complete_task_core(pg_temp.mk_task(pg_temp.u(7)), pg_temp.u(7), '2026-03-10 15:00Z');
  assert r.new_balance_seconds = 7200, 'cap at 7200 s';
  assert r.minutes_awarded = 3 and r.xp_awarded = 50, 'granted minutes capped, xp still awarded';
end $$;

-- User 8: deleting a task never frees the daily limit; foreign task / user checks
do $$ declare t uuid; begin
  t := pg_temp.mk_task(pg_temp.u(8));
  perform private.complete_task_core(t, pg_temp.u(8), '2026-03-10 15:00Z');
  delete from public.tasks where id = t;
  assert pg_temp.err(format('select private.complete_task_core(%L,%L,%L)', pg_temp.mk_task(pg_temp.u(8)), pg_temp.u(8), '2026-03-10 16:00Z'))
         = 'DAILY_LIMIT', 'delete + recreate does not farm rewards';
  assert pg_temp.err(format('select private.complete_task_core(%L,%L,%L)', pg_temp.mk_task(pg_temp.u(8)), pg_temp.u(9), '2026-03-12 16:00Z'))
         = 'TASK_NOT_FOUND', 'task of another user';
end $$;

-- Daily recurring task returns to pending
do $$ declare t uuid; begin
  t := pg_temp.mk_task(pg_temp.u(10), 'Diária', 'daily');
  perform private.complete_task_core(t, pg_temp.u(10), '2026-03-10 15:00Z');
  assert (select status from public.tasks where id = t) = 'pending', 'daily task back to pending';
  assert pg_temp.err(format('select private.complete_task_core(%L,%L,%L)', t, pg_temp.u(10), '2026-03-10 18:00Z'))
         = 'ALREADY_COMPLETED', 'daily task: once per local day';
end $$;

-- ===================================================== tasks: triggers, column privileges, RLS
do $$ declare t uuid; begin
  t := pg_temp.mk_task(pg_temp.u(11));
  update public.tasks set reward_xp = 999, status = 'verifying' where id = t;
  assert (select reward_xp from public.tasks where id = t) = 50, 'reward fixed by trigger';
  assert (select verifying_since from public.tasks where id = t) is not null, 'verifying_since set';
end $$;

do $$ declare i int; begin
  for i in 1..10 loop perform pg_temp.mk_task(pg_temp.u(12), 't' || i); end loop;
  assert pg_temp.err(format('insert into public.tasks (user_id, title) values (%L, %L)', pg_temp.u(12), 'x'))
         = 'TASK_CREATE_LIMIT', 'max 10 tasks created per day';
end $$;

-- as an authenticated client
\o /dev/null
select pg_temp.login(13);
\o
set local role authenticated;
do $$ declare t uuid; begin
  insert into public.tasks (title, description) values ('Lavar a louça', 'cozinha') returning id into t;
  assert (select user_id from public.tasks where id = t) = '00000000-0000-0000-0000-000000000013', 'user_id defaults to auth.uid()';
  update public.tasks set title = 'Lavar a louça toda' where id = t;
  assert pg_temp.err('update public.profiles set gems = 99999') like 'permission denied%', 'no UPDATE on profiles';
  assert pg_temp.err(format('update public.tasks set status = %L', 'completed')) like 'permission denied%', 'no status update';
  assert pg_temp.err(format('update public.tasks set reward_xp = 1 where id = %L', t)) like 'permission denied%', 'no reward update';
  assert pg_temp.err(format('insert into public.tasks (title, reward_xp) values (%L, 1)', 'x')) like 'permission denied%', 'no reward insert';
  assert pg_temp.err(format('insert into public.tasks (user_id, title) values (%L, %L)', pg_temp.u(14), 'x')) like 'permission denied%', 'no user_id spoof';
  assert pg_temp.err('insert into public.screen_time_logs (user_id, delta_seconds, balance_after, reason) values (gen_random_uuid(), 1, 1, ''app_usage'')') like 'permission denied%', 'logs read-only';
  assert pg_temp.err(format('select public.complete_task_and_reward(%L,%L)', t, pg_temp.u(13))) like 'permission denied%', 'complete_task_and_reward: service_role only';
  assert (select count(*) from public.profiles) = 1, 'RLS: only own profile';
  assert (select count(*) from public.shop_items) = 4, 'shop_items readable';
end $$;
reset role;

-- user 14 cannot see / change user 13's tasks
\o /dev/null
select pg_temp.login(14);
\o
set local role authenticated;
do $$ declare n int; begin
  assert (select count(*) from public.tasks) = 0, 'RLS: tasks isolated';
  update public.tasks set title = 'hack';
  get diagnostics n = row_count;
  assert n = 0, 'RLS: cannot update others tasks';
  delete from public.tasks;
  get diagnostics n = row_count;
  assert n = 0, 'RLS: cannot delete others tasks';
end $$;
reset role;

-- anon cannot call anything
set local role anon;
do $$ begin
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(1), 'streak_freeze')) like 'permission denied%', 'anon blocked';
  assert pg_temp.err('select * from public.profiles') like 'permission denied%', 'anon has no table access';
end $$;
reset role;

-- service_role can call the wrapper (uses now())
set local role service_role;
do $$ declare r record; begin
  select * into r from public.complete_task_and_reward(pg_temp.mk_task(pg_temp.u(15)), pg_temp.u(15));
  assert r.new_streak_days = 1 and r.minutes_awarded = 20, 'service_role wrapper works';
end $$;
reset role;

-- ===================================================== shop
update public.profiles set gems = 1500 where id = pg_temp.u(16);
update public.profiles set gems = 0 where id = pg_temp.u(17);
update public.profiles set gems = 1000, balance_seconds = 6000 where id = pg_temp.u(18);

\o /dev/null
select pg_temp.login(16);
\o
set local role authenticated;
do $$ declare r record; begin
  select * into r from public.purchase_shop_item(pg_temp.u(16), 'streak_freeze');
  assert r.new_gems = 1300 and r.new_streak_freeze_count = 1, 'freeze #1 (200)';
  perform public.purchase_shop_item(pg_temp.u(16), 'streak_freeze');
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(16), 'streak_freeze')) = 'FREEZE_LIMIT', 'max 2 freezes';
  assert (select gems from public.profiles) = 1100, 'no charge on FREEZE_LIMIT';

  select * into r from public.purchase_shop_item(pg_temp.u(16), 'free_pass_30m');
  assert r.new_balance_seconds = 1800 and r.new_gems = 750, 'free pass: +1800 s, 350 gems';
  assert (select count(*) from public.screen_time_logs where reason = 'shop_free_pass') = 1, 'free pass logged';

  perform public.purchase_shop_item(pg_temp.u(16), 'mascot_skin_fire');
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(16), 'mascot_skin_fire')) = 'ALREADY_OWNED', 'duplicate skin';
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(16), 'nope')) = 'ITEM_NOT_FOUND', 'unknown sku';
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(17), 'streak_freeze')) = 'FORBIDDEN', 'other user_id';

  assert pg_temp.err(format('select public.set_active_mascot_skin(%L,%L)', pg_temp.u(16), 'mascot_skin_zen')) = 'SKIN_NOT_OWNED', 'skin not owned';
  assert pg_temp.err(format('select public.set_active_mascot_skin(%L,%L)', pg_temp.u(16), 'mascot_skin_fire')) = 'OK', 'owned skin';
  assert (select active_mascot_skin from public.profiles) = 'mascot_skin_fire', 'skin active';
  assert pg_temp.err(format('select public.set_profile_timezone(%L,%L)', pg_temp.u(16), 'Mars/Phobos')) = 'INVALID_TIMEZONE', 'bad tz';
  assert pg_temp.err(format('select public.set_profile_timezone(%L,%L)', pg_temp.u(16), 'America/New_York')) = 'OK', 'tz set';
end $$;
reset role;

\o /dev/null
select pg_temp.login(17);
\o
set local role authenticated;
do $$ begin
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(17), 'streak_freeze')) = 'INSUFFICIENT_GEMS', 'no gems';
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(17), 'mascot_skin_zen')) = 'INSUFFICIENT_GEMS', 'no gems (skin)';
end $$;
reset role;

\o /dev/null
select pg_temp.login(18);
\o
set local role authenticated;
do $$ begin
  assert pg_temp.err(format('select public.purchase_shop_item(%L,%L)', pg_temp.u(18), 'free_pass_30m')) = 'BALANCE_CAP', 'free pass over cap';
  assert (select gems from public.profiles) = 1000, 'no charge on BALANCE_CAP';
end $$;
reset role;

-- ===================================================== consume_screen_time
update public.profiles set balance_seconds = 100 where id = pg_temp.u(19);
\o /dev/null
select pg_temp.login(19);
\o
set local role authenticated;
do $$ declare r record; begin
  select * into r from public.consume_screen_time(pg_temp.u(19), 60, 'e1');
  assert r.new_balance_seconds = 40 and r.applied_seconds = 60 and not r.duplicate, 'consume 60';
  select * into r from public.consume_screen_time(pg_temp.u(19), 60, 'e1');
  assert r.new_balance_seconds = 40 and r.duplicate, 'idempotent by client_event_id';
  select * into r from public.consume_screen_time(pg_temp.u(19), 100, 'e2');
  assert r.new_balance_seconds = 0 and r.applied_seconds = 40, 'never negative';
  select * into r from public.consume_screen_time(pg_temp.u(19), 10, 'e3');
  assert r.new_balance_seconds = 0 and r.applied_seconds = 0, 'consume at 0';
  assert (select count(*) from public.screen_time_logs where reason = 'app_usage') = 3, 'audit rows';
  assert pg_temp.err(format('select public.consume_screen_time(%L,0,%L)', pg_temp.u(19), 'e4')) = 'INVALID_SECONDS', 'zero seconds';
  assert pg_temp.err(format('select public.consume_screen_time(%L,5,%L)', pg_temp.u(1), 'e5')) = 'FORBIDDEN', 'other user_id';
end $$;
reset role;

-- ===================================================== verifications
do $$ begin
  insert into public.task_verifications (user_id, image_path, image_hash, approved, code)
    values (pg_temp.u(20), 'proofs/x/1.jpg', 'h1', false, 'REJECTED'),
           (pg_temp.u(20), 'proofs/x/2.jpg', 'h1', false, 'LOW_QUALITY'),
           (pg_temp.u(20), 'proofs/x/3.jpg', 'h1', true, 'APPROVED');
  assert (select bool_and(local_date is not null) from public.task_verifications where user_id = pg_temp.u(20)), 'local_date trigger';
  assert pg_temp.err(format('insert into public.task_verifications (user_id,image_path,image_hash,approved,code) values (%L,%L,%L,true,%L)',
         pg_temp.u(20), 'proofs/x/4.jpg', 'h1', 'APPROVED')) like 'duplicate key%', 'approved hash cannot be reused';
end $$;

do $$ begin raise notice 'ALL DATABASE TESTS PASSED'; end $$;
rollback;
