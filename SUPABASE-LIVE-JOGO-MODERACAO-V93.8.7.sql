-- TEAM LAMBRETA V93.8.7 — jogo atual da transmissão
-- DEV/Admin/Moderador podem alterar somente o campo main_game do streamer pela RPC.

create or replace function public.tl_set_streamer_live_game(
  p_streamer text,
  p_game text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_streamer text := lower(regexp_replace(coalesce(p_streamer,''), '^@', ''));
  v_game text := btrim(coalesce(p_game,''));
  v_id uuid;
begin
  select lower(coalesce(role,'member')) into v_role
  from public.profiles
  where id = auth.uid();

  if v_role not in ('master','admin','moderator') then
    raise exception 'Sem permissão para alterar o jogo da transmissão.';
  end if;

  if v_streamer = '' or v_game = '' then
    raise exception 'Streamer e jogo são obrigatórios.';
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
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_id;

  return left(v_game,60);
end;
$$;

revoke all on function public.tl_set_streamer_live_game(text,text) from public;
grant execute on function public.tl_set_streamer_live_game(text,text) to authenticated;
