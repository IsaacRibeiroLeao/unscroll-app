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
