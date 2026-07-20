-- TEAM LAMBRETA V52 — presença inteligente + VIP por doações

alter table public.profiles
  add column if not exists donation_total numeric(10,2) not null default 0;

alter table public.profiles
  drop constraint if exists profiles_donation_total_nonnegative;

alter table public.profiles
  add constraint profiles_donation_total_nonnegative check (donation_total >= 0);

grant select on public.profiles to authenticated;

create or replace function public.set_donation_total(target_user_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare actor_role public.user_role;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if actor_role not in ('admin','master') then
    raise exception 'Sem permissão para gerir VIP';
  end if;
  if amount < 0 then
    raise exception 'Valor inválido';
  end if;
  update public.profiles
     set donation_total = amount,
         updated_at = now()
   where id = target_user_id;
end;
$$;

grant execute on function public.set_donation_total(uuid,numeric) to authenticated;

-- VIP aparece automaticamente no site quando donation_total >= 150.00.
-- Exemplo manual para um utilizador:
-- select public.set_donation_total('UUID-DO-USUARIO', 150.00);
