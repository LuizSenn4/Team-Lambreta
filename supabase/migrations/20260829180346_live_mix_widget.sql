-- MIX DA LIVE: preferências por streamer + sala, sem duplicar a estrutura existente.
alter table public.tl_live_room_settings
  add column if not exists mix_visible boolean not null default true,
  add column if not exists mix_pos_x numeric(6,3) not null default 68,
  add column if not exists mix_pos_y numeric(6,3) not null default 64;

alter table public.tl_live_room_settings drop constraint if exists tl_live_room_settings_mix_pos_x_check;
alter table public.tl_live_room_settings add constraint tl_live_room_settings_mix_pos_x_check check (mix_pos_x between 0 and 100);
alter table public.tl_live_room_settings drop constraint if exists tl_live_room_settings_mix_pos_y_check;
alter table public.tl_live_room_settings add constraint tl_live_room_settings_mix_pos_y_check check (mix_pos_y between 0 and 100);

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.tl_set_live_mix_config(
  p_streamer_id uuid,
  p_room text,
  p_visible boolean,
  p_pos_x numeric,
  p_pos_y numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_is_streamer boolean;
  v_row public.tl_live_room_settings;
  v_room text := left(btrim(coalesce(p_room,'')),120);
begin
  select lower(coalesce(p.role::text,'member')),coalesce(p.is_streamer,false)
    into v_role,v_is_streamer
  from public.profiles p
  where p.id=(select auth.uid());

  if (select auth.uid()) is null
     or not (v_role in ('master','dev','admin','moderator','staff') or v_is_streamer) then
    raise exception 'Apenas streamer, moderador ou admin pode alterar o MIX.';
  end if;
  if p_streamer_id is null or v_room='' or not exists(
    select 1 from public.streamers s where s.id=p_streamer_id and s.is_archived=false
  ) then
    raise exception 'Sala/streamer inválido.';
  end if;

  insert into public.tl_live_room_settings(streamer_id,room,mix_visible,mix_pos_x,mix_pos_y,updated_by,updated_at)
  values(p_streamer_id,v_room,coalesce(p_visible,true),least(100,greatest(0,coalesce(p_pos_x,68))),least(100,greatest(0,coalesce(p_pos_y,64))),(select auth.uid()),now())
  on conflict(streamer_id,room) do update
  set mix_visible=excluded.mix_visible,mix_pos_x=excluded.mix_pos_x,mix_pos_y=excluded.mix_pos_y,
      updated_by=excluded.updated_by,updated_at=now()
  returning * into v_row;

  return jsonb_build_object('mix_visible',v_row.mix_visible,'mix_pos_x',v_row.mix_pos_x,'mix_pos_y',v_row.mix_pos_y);
end;
$$;

revoke all on function private.tl_set_live_mix_config(uuid,text,boolean,numeric,numeric) from public;
grant usage on schema private to authenticated;
grant execute on function private.tl_set_live_mix_config(uuid,text,boolean,numeric,numeric) to authenticated;

create or replace function public.tl_set_live_mix_config(p_streamer_id uuid,p_room text,p_visible boolean,p_pos_x numeric,p_pos_y numeric)
returns jsonb
language sql
security invoker
set search_path=public,private
as $$ select private.tl_set_live_mix_config(p_streamer_id,p_room,p_visible,p_pos_x,p_pos_y) $$;

revoke all on function public.tl_set_live_mix_config(uuid,text,boolean,numeric,numeric) from public;
grant execute on function public.tl_set_live_mix_config(uuid,text,boolean,numeric,numeric) to authenticated;
