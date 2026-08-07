-- Team Lambreta V93.7.0 — sessão nova a cada transmissão
-- Execute UMA VEZ no Supabase SQL Editor, depois do SUPABASE-CHAT-SALAS-V93.6.9.sql.
--
-- Objetivo:
--   lobby = Home
--   live:<streamer>:<session_id> = uma sala exclusiva para UMA transmissão
--
-- A sessão é compartilhada entre todos os espectadores da mesma live.
-- Se não houver player ativo/heartbeat por 5 minutos, a próxima entrada cria uma nova sessão.

create table if not exists public.live_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  streamer text not null,
  room text not null unique,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz null
);

create index if not exists live_chat_sessions_streamer_active_idx
  on public.live_chat_sessions (streamer, ended_at, last_seen_at desc);

alter table public.live_chat_sessions enable row level security;

create or replace function public.tl_claim_live_chat_session(p_streamer text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streamer text;
  v_room text;
  v_id uuid;
begin
  v_streamer := lower(regexp_replace(coalesce(p_streamer,''), '[^a-zA-Z0-9._-]', '', 'g'));
  v_streamer := left(v_streamer, 32);
  if v_streamer = '' then
    v_streamer := 'live';
  end if;

  -- Serializa a criação por streamer para dois espectadores simultâneos
  -- nunca receberem duas salas diferentes.
  perform pg_advisory_xact_lock(hashtext(v_streamer));

  -- Fecha sessões antigas sem atividade. O heartbeat só é mantido enquanto
  -- o player da live está realmente ativo no site.
  update public.live_chat_sessions
     set ended_at = now()
   where streamer = v_streamer
     and ended_at is null
     and last_seen_at < now() - interval '5 minutes';

  select room
    into v_room
    from public.live_chat_sessions
   where streamer = v_streamer
     and ended_at is null
   order by started_at desc
   limit 1
   for update;

  if v_room is not null then
    update public.live_chat_sessions
       set last_seen_at = now()
     where room = v_room;
    return v_room;
  end if;

  v_id := gen_random_uuid();
  v_room := 'live:' || v_streamer || ':' || replace(v_id::text, '-', '');

  insert into public.live_chat_sessions(id, streamer, room, started_at, last_seen_at)
  values (v_id, v_streamer, v_room, now(), now());

  return v_room;
end;
$$;

create or replace function public.tl_touch_live_chat_session(p_room text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_chat_sessions
     set last_seen_at = now()
   where room = lower(coalesce(p_room,''))
     and ended_at is null;
  return found;
end;
$$;

create or replace function public.tl_close_live_chat_session(p_room text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_chat_sessions
     set ended_at = coalesce(ended_at, now()),
         last_seen_at = now()
   where room = lower(coalesce(p_room,''))
     and ended_at is null;
  return found;
end;
$$;

grant execute on function public.tl_claim_live_chat_session(text) to anon, authenticated;
grant execute on function public.tl_touch_live_chat_session(text) to anon, authenticated;
grant execute on function public.tl_close_live_chat_session(text) to anon, authenticated;

comment on table public.live_chat_sessions is
  'Sessões temporárias do chat das transmissões. Cada nova live recebe uma sala própria.';
