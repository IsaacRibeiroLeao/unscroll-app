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
