-- Estatísticas públicas mínimas do Fórum, sem depender da consulta do Hall.
begin;

create or replace function public.tl_forum_profile_stats()
returns table(user_id uuid,xp bigint,forum_topics integer,forum_replies integer)
language sql stable security definer set search_path=public
as $$
  select cp.user_id,cp.xp,cp.forum_topics,cp.forum_replies
  from public.community_progress cp
  where auth.uid() is not null;
$$;

revoke all on function public.tl_forum_profile_stats() from public,anon;
grant execute on function public.tl_forum_profile_stats() to authenticated;

commit;
