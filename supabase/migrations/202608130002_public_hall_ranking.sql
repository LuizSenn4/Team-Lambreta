-- Hall público com campos mínimos; não libera leitura direta de profiles nem eventos de XP.
begin;

create or replace function public.tl_hall_ranking()
returns table(
  user_id uuid,
  display_name text,
  role text,
  avatar_url text,
  xp bigint,
  level integer,
  active_seconds bigint,
  afk_seconds bigint,
  live_seconds bigint,
  forum_topics integer,
  forum_replies integer,
  forum_thanks integer,
  event_participations integer,
  achievements_count integer,
  updated_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select cp.user_id,
    coalesce(nullif(p.game_nickname,''),nullif(p.full_name,''),'Membro')::text,
    coalesce(p.role::text,'member'),p.avatar_url::text,
    cp.xp,cp.level,cp.active_seconds,cp.afk_seconds,cp.live_seconds,
    cp.forum_topics,cp.forum_replies,cp.forum_thanks,cp.event_participations,
    cp.achievements_count,cp.updated_at
  from public.community_progress cp
  join public.profiles p on p.id=cp.user_id
  order by cp.xp desc,cp.active_seconds desc,cp.updated_at asc
  limit 100;
$$;

revoke all on function public.tl_hall_ranking() from public;
grant execute on function public.tl_hall_ranking() to anon,authenticated;

commit;
