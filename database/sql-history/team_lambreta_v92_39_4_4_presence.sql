-- Team Lambreta V92.39.4.4
-- Presença real básica para Buddy: online / away / busy / offline.

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- Mantém o campo presence já usado pelo site. Caso ainda não exista:
alter table public.profiles
  add column if not exists presence text default 'offline';

-- Normaliza valores antigos de demonstração sem atividade recente.
update public.profiles
set presence = 'offline'
where last_seen_at is null
  and coalesce(lower(presence), '') not in ('busy', 'ocupado');

create index if not exists profiles_last_seen_at_idx
  on public.profiles(last_seen_at desc);

-- Garante que cada utilizador autenticado pode atualizar apenas a própria presença.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='profiles'
      and policyname='profiles_update_own_presence_v923944'
  ) then
    create policy profiles_update_own_presence_v923944
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;
