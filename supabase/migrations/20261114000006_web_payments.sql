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
