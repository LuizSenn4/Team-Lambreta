-- Team Lambreta V93.1 — cargos pelo chat
-- Execute UMA VEZ no Supabase > SQL Editor.

begin;

-- Remove constraints antigos da coluna role para permitir os novos cargos.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  alter column role set default 'member';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member','supporter','vip','staff','moderator','admin','master'));

create table if not exists public.role_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  target_id uuid not null references auth.users(id),
  old_role text not null,
  new_role text not null,
  created_at timestamptz not null default now()
);

alter table public.role_audit_log enable row level security;

create or replace function public.assign_role_by_nickname(
  target_nickname text,
  new_role text
)
returns table(target_user_id uuid, nickname text, role text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  target_row public.profiles%rowtype;
  normalized_role text := lower(trim(new_role));
  matches integer;
begin
  if actor is null then
    raise exception 'É necessário entrar com Google.';
  end if;

  select p.role into actor_role
  from public.profiles p
  where p.id = actor;

  if actor_role not in ('master','admin') then
    raise exception 'Apenas DEV ou ADMIN podem atribuir cargos.';
  end if;

  normalized_role := case normalized_role
    when 'dev' then 'master'
    when 'moderador' then 'moderator'
    when 'apoiador' then 'supporter'
    when 'membro' then 'member'
    else normalized_role
  end;

  if normalized_role not in ('member','supporter','vip','staff','moderator','admin','master') then
    raise exception 'Cargo inválido.';
  end if;

  if actor_role = 'admin' and normalized_role = 'master' then
    raise exception 'ADMIN não pode criar ou alterar um DEV.';
  end if;

  select count(*) into matches
  from public.profiles p
  where lower(p.game_nickname) = lower(trim(target_nickname));

  if matches = 0 then
    raise exception 'Nickname @% não encontrado.', target_nickname;
  elsif matches > 1 then
    raise exception 'Existe mais de um jogador com esse nickname. Corrija os nicknames duplicados.';
  end if;

  select * into target_row
  from public.profiles p
  where lower(p.game_nickname) = lower(trim(target_nickname))
  limit 1;

  if target_row.id = actor then
    raise exception 'Você não pode alterar o próprio cargo pelo chat.';
  end if;

  if target_row.role = 'master' and actor_role <> 'master' then
    raise exception 'ADMIN não pode alterar, punir ou rebaixar um DEV.';
  end if;

  update public.profiles
  set role = normalized_role,
      updated_at = now()
  where id = target_row.id;

  insert into public.role_audit_log(actor_id,target_id,old_role,new_role)
  values(actor,target_row.id,coalesce(target_row.role,'member'),normalized_role);

  return query
  select target_row.id,
         target_row.game_nickname,
         normalized_role;
end;
$$;

revoke all on function public.assign_role_by_nickname(text,text) from public;
grant execute on function public.assign_role_by_nickname(text,text) to authenticated;

commit;

-- Exemplos no chat:
-- /cargo @Boss admin
-- /cargo @Jogador moderador
-- /cargo @Jogador staff
-- /cargo @Jogador vip
-- /cargo @Jogador apoiador
-- /cargo @Jogador membro
