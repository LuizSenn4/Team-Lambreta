-- V57: STREAMER e VIP são níveis visuais exclusivos.
create or replace function public.set_profile_badge(target_user_id uuid, badge_name text, enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
declare actor_role public.user_role;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role not in ('admin','master') then raise exception 'Sem permissão para gerir selos'; end if;

  if badge_name='streamer' then
    update public.profiles
       set is_streamer=enabled,
           streamer_since=case when enabled then coalesce(streamer_since,now()) else null end,
           vip_until=case when enabled then null else vip_until end,
           updated_at=now()
     where id=target_user_id;
  elsif badge_name='vip' then
    update public.profiles
       set vip_until=case when enabled then now()+interval '365 days' else null end,
           is_streamer=case when enabled then false else is_streamer end,
           streamer_since=case when enabled then null else streamer_since end,
           updated_at=now()
     where id=target_user_id;
  else
    raise exception 'Selo inválido';
  end if;
end $$;
grant execute on function public.set_profile_badge(uuid,text,boolean) to authenticated;
