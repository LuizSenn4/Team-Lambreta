-- TEAM LAMBRETA V93.9.4
-- Automatiza o vínculo de qualquer streamer TikTok salvo no painel.
-- Basta informar @handle, handle ou URL do TikTok; o banco normaliza sozinho.

create or replace function public.tl_normalize_streamer_tiktok()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_raw text;
  v_handle text;
begin
  v_raw := btrim(coalesce(new.tiktok_url, new.live_url, ''));

  if v_raw = '' then
    return new;
  end if;

  -- URL TikTok com @handle
  v_handle := substring(v_raw from '(?i)tiktok\\.com/@([A-Za-z0-9._-]+)');

  -- @handle puro
  if coalesce(v_handle,'') = '' and v_raw ~ '^@[A-Za-z0-9._-]+$' then
    v_handle := substring(v_raw from 2);
  end if;

  -- handle puro
  if coalesce(v_handle,'') = '' and v_raw ~ '^[A-Za-z0-9._-]+$' then
    v_handle := v_raw;
  end if;

  v_handle := btrim(coalesce(v_handle,''));
  if v_handle = '' then
    return new;
  end if;

  new.tiktok_url := 'https://www.tiktok.com/@' || v_handle;
  new.live_url := 'https://www.tiktok.com/@' || v_handle || '/live';
  new.live_platform := 'tiktok';

  if new.main_game is null or btrim(new.main_game) = '' then
    new.main_game := 'Fortnite';
  end if;

  if new.live_game_mode is null or btrim(new.live_game_mode) = '' then
    new.live_game_mode := 'Battle Royale [Zero Build]';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_streamers_normalize_tiktok on public.streamers;
create trigger trg_streamers_normalize_tiktok
before insert or update of tiktok_url, live_url, main_game, live_game_mode
on public.streamers
for each row
execute function public.tl_normalize_streamer_tiktok();

-- Normaliza também os streamers que já existem.
update public.streamers
set tiktok_url = tiktok_url
where coalesce(tiktok_url,'') <> '' or coalesce(live_url,'') <> '';

-- RPC definitiva para editar info da live online ou offline.
create or replace function public.tl_set_streamer_live_info(
  p_streamer text,
  p_game text,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_streamer text := lower(regexp_replace(btrim(coalesce(p_streamer,'')), '^@', ''));
  v_game text := btrim(coalesce(p_game,''));
  v_mode text := btrim(coalesce(p_mode,''));
  v_id uuid;
  v_display_name text;
begin
  select lower(coalesce(p.role::text,'member'))
  into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role not in ('master','dev','admin','moderator') then
    raise exception 'Sem permissão para alterar a transmissão.';
  end if;

  if v_streamer = '' or v_game = '' or v_mode = '' then
    raise exception 'Streamer, jogo e modo são obrigatórios.';
  end if;

  select s.id, s.display_name
  into v_id, v_display_name
  from public.streamers s
  where s.is_archived = false
    and (
      lower(coalesce(s.tiktok_url,'')) like '%/@' || v_streamer || '%'
      or lower(coalesce(s.live_url,'')) like '%/@' || v_streamer || '%'
      or lower(coalesce(s.game_nickname,'')) = v_streamer
      or lower(coalesce(s.display_name,'')) = v_streamer
      or regexp_replace(lower(coalesce(s.game_nickname,'')), '[^a-z0-9]+', '', 'g') = regexp_replace(v_streamer, '[^a-z0-9]+', '', 'g')
      or regexp_replace(lower(coalesce(s.display_name,'')), '[^a-z0-9]+', '', 'g') = regexp_replace(v_streamer, '[^a-z0-9]+', '', 'g')
    )
  order by
    case when lower(coalesce(s.tiktok_url,'')) like '%/@' || v_streamer || '%' then 0 else 1 end,
    s.is_published desc,
    s.updated_at desc nulls last
  limit 1;

  if v_id is null then
    raise exception 'Streamer @% não encontrado. Cadastre o TikTok no painel de Streamers.', v_streamer;
  end if;

  update public.streamers
  set main_game = left(v_game,60),
      live_game_mode = left(v_mode,60),
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_id;

  return jsonb_build_object(
    'id', v_id,
    'streamer', v_display_name,
    'game', left(v_game,60),
    'mode', left(v_mode,60)
  );
end;
$$;

revoke all on function public.tl_set_streamer_live_info(text,text,text) from public;
grant execute on function public.tl_set_streamer_live_info(text,text,text) to authenticated;
