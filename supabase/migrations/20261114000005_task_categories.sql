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
