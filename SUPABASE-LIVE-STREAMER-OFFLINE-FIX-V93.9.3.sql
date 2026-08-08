-- TEAM LAMBRETA V93.9.3
-- Permite editar JOGO / MODO / TIPO mesmo com a live offline.
-- Também garante um registro Supabase para o streamer fixo INK31 (@rv3113).

-- 1) Garante que INK31 exista na tabela streamers.
do $$
begin
  if not exists (
    select 1
    from public.streamers s
    where lower(coalesce(s.tiktok_url,'')) like '%/@rv3113%'
       or lower(coalesce(s.live_url,'')) like '%/@rv3113%'
       or lower(coalesce(s.game_nickname,'')) in ('ink31','oklm_31_ink')
       or lower(coalesce(s.display_name,'')) = 'ink31'
  ) then
    insert into public.streamers (
      display_name,
      game_nickname,
      main_game,
      live_game_mode,
      tiktok_url,
      live_url,
      live_platform,
      live_mode,
      allow_embed,
      allow_live_chat,
      is_published,
      is_archived,
      display_order
    ) values (
      'INK31',
      'INK31',
      'Fortnite',
      'Battle Royale [Zero Build]',
      'https://www.tiktok.com/@rv3113',
      'https://www.tiktok.com/@rv3113/live',
      'tiktok',
      'automatic',
      true,
      true,
      true,
      false,
      1
    );
  end if;
end $$;

-- 2) RPC robusta: não depende da live estar online e procura por vários identificadores.
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
      or (v_streamer = 'rv3113' and lower(coalesce(s.display_name,'')) = 'ink31')
      or (v_streamer = 'rv3113' and lower(coalesce(s.game_nickname,'')) in ('ink31','oklm_31_ink'))
    )
  order by
    case when lower(coalesce(s.tiktok_url,'')) like '%/@' || v_streamer || '%' then 0 else 1 end,
    s.is_published desc,
    s.updated_at desc nulls last
  limit 1;

  if v_id is null then
    raise exception 'Streamer @% não encontrado no cadastro. Confirme o TikTok no painel de streamers.', v_streamer;
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
