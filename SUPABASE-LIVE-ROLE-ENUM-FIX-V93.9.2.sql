-- TEAM LAMBRETA V93.9.2
-- Corrige: function lower(user_role) does not exist

create or replace function public.tl_set_streamer_live_info(p_streamer text,p_game text,p_mode text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_streamer text:=lower(regexp_replace(coalesce(p_streamer,''),'^@','')); v_game text:=btrim(coalesce(p_game,'')); v_mode text:=btrim(coalesce(p_mode,'')); v_id uuid;
begin
  select lower(coalesce(role::text,'member')) into v_role from public.profiles where id=auth.uid();
  if v_role not in ('master','dev','admin','moderator') then raise exception 'Sem permissão para alterar a transmissão.'; end if;
  if v_streamer='' or v_game='' or v_mode='' then raise exception 'Streamer, jogo e modo são obrigatórios.'; end if;
  select s.id into v_id from public.streamers s where s.is_archived=false and (lower(coalesce(s.tiktok_url,'')) like '%/@'||v_streamer||'%' or lower(coalesce(s.live_url,'')) like '%/@'||v_streamer||'%') order by s.is_published desc,s.updated_at desc nulls last limit 1;
  if v_id is null then raise exception 'Streamer TikTok @% não encontrado.',v_streamer; end if;
  update public.streamers set main_game=left(v_game,60),live_game_mode=left(v_mode,60),updated_by=auth.uid(),updated_at=now() where id=v_id;
  return jsonb_build_object('game',left(v_game,60),'mode',left(v_mode,60));
end;$$;

create or replace function public.tl_register_live_game(p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_name text:=btrim(coalesce(p_name,''));
begin
  select lower(coalesce(role::text,'member')) into v_role from public.profiles where id=auth.uid();
  if v_role not in ('master','dev','admin') then raise exception 'Apenas Admin/DEV pode cadastrar novos jogos.'; end if;
  if v_name='' then raise exception 'Informe o nome do jogo.'; end if;
  insert into public.live_game_catalog(name,is_active,created_by) values(left(v_name,60),true,auth.uid()) on conflict(name) do update set is_active=true;
  return jsonb_build_object('name',left(v_name,60));
end;$$;

create or replace function public.tl_register_live_mode(p_game text,p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_game text:=btrim(coalesce(p_game,'')); v_name text:=btrim(coalesce(p_name,''));
begin
  select lower(coalesce(role::text,'member')) into v_role from public.profiles where id=auth.uid();
  if v_role not in ('master','dev','admin') then raise exception 'Apenas Admin/DEV pode cadastrar novos modos.'; end if;
  if v_game='' or v_name='' then raise exception 'Jogo e modo são obrigatórios.'; end if;
  insert into public.live_mode_catalog(game_name,name,is_active,created_by) values(left(v_game,60),left(v_name,60),true,auth.uid()) on conflict(game_name,name) do update set is_active=true;
  return jsonb_build_object('game',left(v_game,60),'mode',left(v_name,60));
end;$$;

revoke all on function public.tl_set_streamer_live_info(text,text,text) from public;
revoke all on function public.tl_register_live_game(text) from public;
revoke all on function public.tl_register_live_mode(text,text) from public;
grant execute on function public.tl_set_streamer_live_info(text,text,text) to authenticated;
grant execute on function public.tl_register_live_game(text) to authenticated;
grant execute on function public.tl_register_live_mode(text,text) to authenticated;
