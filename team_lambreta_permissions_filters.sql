-- TEAM LAMBRETA — PERMISSÕES, MODERAÇÃO E FILTRO V47
create extension if not exists unaccent;
-- Executar uma vez no Supabase > SQL Editor > New query.

alter table public.profiles add column if not exists muted_until timestamptz;
alter table public.profiles add column if not exists is_banned boolean not null default false;

-- Fecha a brecha que permitiria a um membro alterar o próprio cargo.
revoke update on public.profiles from authenticated;
grant update (game_nickname, presence, last_seen, updated_at) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own safe profile fields"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.role_rank(r public.user_role)
returns integer language sql immutable as $$
  select case r when 'member' then 0 when 'staff' then 1 when 'moderator' then 2 when 'admin' then 3 when 'master' then 4 else -1 end;
$$;

create or replace function public.set_team_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path=public as $$
declare
  actor_role public.user_role;
  target_role public.user_role;
  desired public.user_role;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  select role into target_role from public.profiles where id=target_user_id;
  desired := new_role::public.user_role;
  if actor_role not in ('admin','master') then raise exception 'Sem permissão para gerir cargos'; end if;
  if desired='master' then raise exception 'Admin Master só pode ser definido diretamente pelo proprietário no SQL'; end if;
  if public.role_rank(target_role) >= public.role_rank(actor_role) then raise exception 'Não pode alterar alguém do mesmo nível ou superior'; end if;
  if public.role_rank(desired) >= public.role_rank(actor_role) then raise exception 'Não pode atribuir cargo igual ou superior ao seu'; end if;
  update public.profiles set role=desired,updated_at=now() where id=target_user_id;
end; $$;

grant execute on function public.set_team_role(uuid,text) to authenticated;

create or replace function public.moderate_user(target_user_id uuid, mute_minutes integer)
returns void language plpgsql security definer set search_path=public as $$
declare actor_role public.user_role; target_role public.user_role;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  select role into target_role from public.profiles where id=target_user_id;
  if actor_role not in ('moderator','admin','master') then raise exception 'Sem permissão para moderar'; end if;
  if public.role_rank(target_role) >= public.role_rank(actor_role) then raise exception 'Não pode moderar alguém do mesmo nível ou superior'; end if;
  update public.profiles set muted_until=case when mute_minutes<=0 then null else now()+make_interval(mins=>mute_minutes) end,updated_at=now() where id=target_user_id;
end; $$;

grant execute on function public.moderate_user(uuid,integer) to authenticated;

create or replace function public.moderate_chat_message(target_message_id bigint)
returns void language plpgsql security definer set search_path=public as $$
declare actor_role public.user_role; owner_id uuid; owner_role public.user_role;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  select user_id into owner_id from public.chat_messages where id=target_message_id;
  select role into owner_role from public.profiles where id=owner_id;
  if actor_role not in ('moderator','admin','master') then raise exception 'Sem permissão para apagar mensagens'; end if;
  if public.role_rank(owner_role) >= public.role_rank(actor_role) and owner_id<>auth.uid() then raise exception 'Não pode moderar alguém do mesmo nível ou superior'; end if;
  update public.chat_messages set is_deleted=true where id=target_message_id;
end; $$;

grant execute on function public.moderate_chat_message(bigint) to authenticated;

create or replace function public.validate_team_chat()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.profiles; normalized text;
begin
  select * into p from public.profiles where id=new.user_id;
  if p.is_banned then raise exception 'Conta bloqueada no chat'; end if;
  if p.muted_until is not null and p.muted_until>now() then raise exception 'Você está silenciado até %',p.muted_until; end if;
  normalized:=lower(unaccent(new.message));
  if normalized ~ '(pornhub|xvideos|xnxx|redtube|youporn|pornografia|porno|hentai|onlyfans|nudes?)' then raise exception 'Conteúdo pornográfico bloqueado'; end if;
  if normalized ~ '(^|[^a-z])(puta|puto|caralho|fdp|merda|porra|buceta|foder|nigger|faggot|cunt|motherfucker|pendejo|cabron)([^a-z]|$)' then raise exception 'Linguagem ofensiva bloqueada'; end if;
  return new;
end; $$;

drop trigger if exists validate_team_chat_trigger on public.chat_messages;
create trigger validate_team_chat_trigger before insert or update of message on public.chat_messages for each row execute function public.validate_team_chat();

-- Staff pode ler/responder contatos; moderadores também. O RLS existente já limita esta área aos cargos da equipe.
