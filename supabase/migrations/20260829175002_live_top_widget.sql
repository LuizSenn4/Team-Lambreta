-- TOP DA SALA: posição percentual no registo por streamer + sala já usado pelo ranking.
alter table public.tl_live_room_settings
  add column if not exists top_pos_x numeric(6,3) not null default 8,
  add column if not exists top_pos_y numeric(6,3) not null default 12;

alter table public.tl_live_room_settings drop constraint if exists tl_live_room_settings_top_pos_x_check;
alter table public.tl_live_room_settings add constraint tl_live_room_settings_top_pos_x_check check (top_pos_x between 0 and 100);
alter table public.tl_live_room_settings drop constraint if exists tl_live_room_settings_top_pos_y_check;
alter table public.tl_live_room_settings add constraint tl_live_room_settings_top_pos_y_check check (top_pos_y between 0 and 100);

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.tl_set_live_top_position(p_streamer uuid,p_room text,p_pos_x numeric,p_pos_y numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_role text;
  v_is_streamer boolean;
  v_room text := left(btrim(coalesce(p_room,'')),120);
  v_row public.tl_live_room_settings;
begin
  select lower(coalesce(p.role::text,'member')),coalesce(p.is_streamer,false)
    into v_role,v_is_streamer from public.profiles p where p.id=auth.uid();
  if auth.uid() is null or not (v_role in ('master','dev','admin','moderator','staff') or v_is_streamer) then
    raise exception 'Apenas streamer ou moderação pode mover o TOP.';
  end if;
  if p_streamer is null or v_room='' then raise exception 'Sala/streamer inválido.'; end if;

  insert into public.tl_live_room_settings(streamer_id,room,top_pos_x,top_pos_y,updated_by,updated_at)
  values(p_streamer,v_room,least(100,greatest(0,coalesce(p_pos_x,8))),least(100,greatest(0,coalesce(p_pos_y,12))),auth.uid(),now())
  on conflict(streamer_id,room) do update
  set top_pos_x=excluded.top_pos_x,top_pos_y=excluded.top_pos_y,updated_by=excluded.updated_by,updated_at=now()
  returning * into v_row;
  return jsonb_build_object('top_pos_x',v_row.top_pos_x,'top_pos_y',v_row.top_pos_y);
end;
$$;

revoke all on function private.tl_set_live_top_position(uuid,text,numeric,numeric) from public;
grant usage on schema private to authenticated;
grant execute on function private.tl_set_live_top_position(uuid,text,numeric,numeric) to authenticated;

create or replace function public.tl_set_live_top_position(p_streamer uuid,p_room text,p_pos_x numeric,p_pos_y numeric)
returns jsonb language sql security invoker set search_path=public,private
as $$ select private.tl_set_live_top_position(p_streamer,p_room,p_pos_x,p_pos_y) $$;

revoke all on function public.tl_set_live_top_position(uuid,text,numeric,numeric) from public;
grant execute on function public.tl_set_live_top_position(uuid,text,numeric,numeric) to authenticated;
