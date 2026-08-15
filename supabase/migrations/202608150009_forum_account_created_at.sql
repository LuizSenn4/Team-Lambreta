-- Expõe somente a antiguidade original da conta Google, nunca a tabela auth.users.
begin;

drop function if exists public.tl_forum_profile_stats();
create function public.tl_forum_profile_stats()
returns table(
  user_id uuid,
  xp bigint,
  forum_topics integer,
  forum_replies integer,
  account_created_at timestamptz
)
language sql stable security definer set search_path=public,auth
as $$
  select cp.user_id,cp.xp,cp.forum_topics,cp.forum_replies,u.created_at
  from public.community_progress cp
  join auth.users u on u.id=cp.user_id
  where auth.uid() is not null;
$$;

revoke all on function public.tl_forum_profile_stats() from public,anon;
grant execute on function public.tl_forum_profile_stats() to authenticated;

commit;
