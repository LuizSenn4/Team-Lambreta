-- Estatística pública somente leitura: likes reais recebidos nos tópicos do usuário.
begin;

drop function if exists public.tl_forum_profile_stats();
create function public.tl_forum_profile_stats()
returns table(
  user_id uuid,
  xp bigint,
  forum_topics integer,
  forum_replies integer,
  forum_likes bigint,
  account_created_at timestamptz
)
language sql stable security definer set search_path=public,auth
as $$
  select cp.user_id,cp.xp,cp.forum_topics,cp.forum_replies,
    coalesce((select count(*) from public.forum_activity_likes l
      join public.forum_activity_topics t on t.topic_key=l.topic_key
      where t.user_id=cp.user_id),0)::bigint,
    u.created_at
  from public.community_progress cp
  join auth.users u on u.id=cp.user_id
  where auth.uid() is not null;
$$;

revoke all on function public.tl_forum_profile_stats() from public,anon;
grant execute on function public.tl_forum_profile_stats() to authenticated;

commit;
