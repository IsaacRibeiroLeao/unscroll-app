-- Deleting an account must not erase the financial record of a payment (retention for tax and
-- chargeback purposes, LGPD art. 16 I). The row is kept but detached from the person.
alter table public.payments alter column user_id drop not null;
alter table public.payments drop constraint payments_user_id_fkey;
alter table public.payments
  add constraint payments_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;
