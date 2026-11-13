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
