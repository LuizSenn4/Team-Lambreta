-- TEAM LAMBRETA V93.8.8 — jogo + modo atual da transmissão
-- DEV/Admin/Moderador podem atualizar apenas esses dois campos da live.

alter table public.streamers
  add column if not exists live_game_mode text;

update public.streamers
set live_game_mode = 'Battle Royale'
where live_game_mode is null or btrim(live_game_mode) = '';

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
  v_streamer text := lower(regexp_replace(coalesce(p_streamer,''), '^@', ''));
  v_game text := btrim(coalesce(p_game,''));
  v_mode text := btrim(coalesce(p_mode,''));
  v_id uuid;
begin
  select lower(coalesce(role,'member')) into v_role
  from public.profiles
  where id = auth.uid();

  if v_role not in ('master','dev','admin','moderator') then
    raise exception 'Sem permissão para alterar a transmissão.';
  end if;

  if v_streamer = '' or v_game = '' or v_mode = '' then
    raise exception 'Streamer, jogo e modo são obrigatórios.';
  end if;

  select s.id into v_id
  from public.streamers s
  where s.is_archived = false
    and (
      lower(coalesce(s.tiktok_url,'')) like '%/@' || v_streamer || '%'
      or lower(coalesce(s.live_url,'')) like '%/@' || v_streamer || '%'
    )
  order by s.is_published desc, s.updated_at desc nulls last
  limit 1;

  if v_id is null then
    raise exception 'Streamer TikTok @% não encontrado.', v_streamer;
  end if;

  update public.streamers
  set main_game = left(v_game,60),
      live_game_mode = left(v_mode,60),
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_id;

  return jsonb_build_object('game', left(v_game,60), 'mode', left(v_mode,60));
end;
$$;

revoke all on function public.tl_set_streamer_live_info(text,text,text) from public;
grant execute on function public.tl_set_streamer_live_info(text,text,text) to authenticated;
