-- TEAM LAMBRETA V93.9.5
-- Automação definitiva para streamers:
-- 1) Streamers cadastrados no painel continuam normalizados automaticamente pelo trigger V93.9.4.
-- 2) Streamers fixos no código também passam a ser criados automaticamente no Supabase
--    na primeira edição de JOGO / MODO / TIPO feita por DEV / ADMIN / MODERADOR.
-- Nenhum SQL individual por streamer é necessário depois deste arquivo.

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
  v_created boolean := false;
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

  -- Streamer fixo no código ainda não existe no banco:
  -- cria automaticamente usando o handle TikTok como vínculo estável.
  if v_id is null then
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
      display_order,
      created_by,
      updated_by
    ) values (
      case when v_streamer = 'rv3113' then 'INK31' else '@' || v_streamer end,
      case when v_streamer = 'rv3113' then 'oklm_31_ink' else v_streamer end,
      left(v_game,60),
      left(v_mode,60),
      'https://www.tiktok.com/@' || v_streamer,
      'https://www.tiktok.com/@' || v_streamer || '/live',
      'tiktok',
      'automatic',
      true,
      true,
      true,
      false,
      100,
      auth.uid(),
      auth.uid()
    )
    returning id, display_name into v_id, v_display_name;

    v_created := true;
  else
    update public.streamers
    set main_game = left(v_game,60),
        live_game_mode = left(v_mode,60),
        tiktok_url = coalesce(nullif(tiktok_url,''), 'https://www.tiktok.com/@' || v_streamer),
        live_url = coalesce(nullif(live_url,''), 'https://www.tiktok.com/@' || v_streamer || '/live'),
        live_platform = coalesce(live_platform,'tiktok'),
        allow_embed = true,
        allow_live_chat = true,
        updated_by = auth.uid(),
        updated_at = now()
    where id = v_id;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'streamer', v_display_name,
    'created_automatically', v_created,
    'tiktok', '@' || v_streamer,
    'game', left(v_game,60),
    'mode', left(v_mode,60)
  );
end;
$$;

revoke all on function public.tl_set_streamer_live_info(text,text,text) from public;
grant execute on function public.tl_set_streamer_live_info(text,text,text) to authenticated;
