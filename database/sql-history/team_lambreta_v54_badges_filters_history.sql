-- TEAM LAMBRETA V54 — selos, VIP 365 dias, filtro reforçado, bans e histórico
create extension if not exists unaccent;

alter table public.profiles add column if not exists is_streamer boolean not null default false;
alter table public.profiles add column if not exists streamer_since timestamptz;
alter table public.profiles add column if not exists vip_until timestamptz;
alter table public.chat_messages add column if not exists is_important boolean not null default false;
alter table public.chat_messages add column if not exists is_reported boolean not null default false;

grant select on public.profiles to authenticated;

create or replace function public.set_profile_badge(target_user_id uuid, badge_name text, enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
declare actor_role public.user_role;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role not in ('admin','master') then raise exception 'Sem permissão para gerir selos'; end if;
  if badge_name='streamer' then
    update public.profiles set is_streamer=enabled, streamer_since=case when enabled then coalesce(streamer_since,now()) else null end, updated_at=now() where id=target_user_id;
  elsif badge_name='vip' then
    update public.profiles set vip_until=case when enabled then now()+interval '365 days' else null end, updated_at=now() where id=target_user_id;
  else raise exception 'Selo inválido'; end if;
end $$;
grant execute on function public.set_profile_badge(uuid,text,boolean) to authenticated;

create or replace function public.set_chat_ban(target_user_id uuid, banned boolean)
returns void language plpgsql security definer set search_path=public as $$
declare actor_role public.user_role; target_role public.user_role;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  select role into target_role from public.profiles where id=target_user_id;
  if actor_role not in ('moderator','admin','master') then raise exception 'Sem permissão para bloquear'; end if;
  if public.role_rank(target_role) >= public.role_rank(actor_role) then raise exception 'Não pode bloquear alguém do mesmo nível ou superior'; end if;
  update public.profiles set is_banned=banned, muted_until=case when banned then 'infinity'::timestamptz else null end, updated_at=now() where id=target_user_id;
end $$;
grant execute on function public.set_chat_ban(uuid,boolean) to authenticated;

create table if not exists public.blocked_chat_terms (
  term text primary key,
  category text not null default 'offensive',
  active boolean not null default true
);
alter table public.blocked_chat_terms enable row level security;
revoke all on public.blocked_chat_terms from anon, authenticated;

insert into public.blocked_chat_terms(term,category) values
('puta','offensive'),('puto','offensive'),('putaria','offensive'),('caralho','offensive'),('fdp','offensive'),('filhodaputa','offensive'),('merda','offensive'),('porra','offensive'),('cabrao','offensive'),('buceta','offensive'),('pica','offensive'),('foder','offensive'),('fodase','offensive'),('cuzao','offensive'),('desgracado','offensive'),
('nigger','hate'),('faggot','hate'),('cunt','offensive'),('motherfucker','offensive'),('pendejo','offensive'),('cabron','offensive'),('mierda','offensive'),
('porn','adult'),('porno','adult'),('pornografia','adult'),('hentai','adult'),('onlyfans','adult'),('nude','adult'),('nudes','adult'),('xxx','adult'),('sexoexplicito','adult'),('pornhub','adult'),('xvideos','adult'),('xnxx','adult'),('redtube','adult'),('youporn','adult')
on conflict(term) do update set category=excluded.category,active=true;

create or replace function public.normalize_chat_word(v text)
returns text language sql immutable as $$
  select regexp_replace(
    regexp_replace(
      translate(lower(unaccent(coalesce(v,''))), '0123456789@$!+', 'oizeasgtbgsait'),
      '[^a-z]', '', 'g'),
    '(.)\1+', '\1', 'g');
$$;

create or replace function public.validate_team_chat()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.profiles; raw_word text; normalized_word text; rebuilt text := ''; separator text := ''; is_bad boolean;
begin
  select * into p from public.profiles where id=new.user_id;
  if p.is_banned then raise exception 'Conta bloqueada no chat'; end if;
  if p.muted_until is not null and p.muted_until>now() then raise exception 'Você está silenciado até %',p.muted_until; end if;

  if new.message ~ '(.)\1{12,}' then raise exception 'Flood de caracteres bloqueado'; end if;
  for raw_word in select regexp_split_to_table(new.message, E'\\s+') loop
    normalized_word := public.normalize_chat_word(raw_word);
    select exists(select 1 from public.blocked_chat_terms b where b.active and (normalized_word=b.term or normalized_word like b.term||'%')) into is_bad;
    rebuilt := rebuilt || separator || case when is_bad then '####' else raw_word end;
    separator := ' ';
  end loop;
  new.message := rebuilt;
  return new;
end $$;

drop trigger if exists validate_team_chat_trigger on public.chat_messages;
create trigger validate_team_chat_trigger before insert or update of message on public.chat_messages for each row execute function public.validate_team_chat();

create or replace function public.cleanup_old_chat_messages()
returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  delete from public.chat_messages where created_at < now()-interval '30 days' and not is_important and not is_reported;
  get diagnostics affected = row_count;
  return affected;
end $$;
revoke all on function public.cleanup_old_chat_messages() from public;

-- Para automatizar a limpeza diária, ative pg_cron no Supabase e rode uma vez:
-- select cron.schedule('team-chat-cleanup','15 4 * * *','select public.cleanup_old_chat_messages();');
