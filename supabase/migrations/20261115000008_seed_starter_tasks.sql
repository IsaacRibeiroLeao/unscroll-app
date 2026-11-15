-- Unscroll — new accounts start with 3 starter tasks so the app is never empty.
-- Rewards/limits still come from tasks_enforce_rules (the trigger fires for these inserts too).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  if not exists (select 1 from public.tasks where user_id = new.id) then
    insert into public.tasks (user_id, title, description, recurrence, category) values
      (new.id, 'Arrumar a cama', 'Tire uma foto da cama arrumada.', 'once', 'home'),
      (new.id, 'Caminhar ou se alongar por 10 minutos', 'Mostre o resultado em uma foto: tênis, tapete ou o lugar onde se mexeu.', 'once', 'exercise'),
      (new.id, 'Ler 10 páginas de um livro', 'Escreva um resumo curto do que leu.', 'once', 'reading');
  end if;
  return new;
end $$;
