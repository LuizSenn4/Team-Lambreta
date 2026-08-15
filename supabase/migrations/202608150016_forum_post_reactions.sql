-- Reações por post: um voto por utilizador, totais públicos sem expor votantes.
begin;

create table if not exists public.forum_post_reactions (
  post_id text not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create index if not exists forum_post_reactions_post_reaction_idx
  on public.forum_post_reactions(post_id,reaction);

alter table public.forum_post_reactions enable row level security;
revoke all on public.forum_post_reactions from anon,authenticated;

create or replace function public.tl_forum_post_reaction_summary()
returns table(post_id text,likes bigint,dislikes bigint,my_reaction text)
language sql stable security definer set search_path=public
as $$
  select p.id,
    count(r.user_id) filter (where r.reaction='like')::bigint,
    count(r.user_id) filter (where r.reaction='dislike')::bigint,
    max(r.reaction) filter (where r.user_id=auth.uid())
  from public.forum_posts p
  left join public.forum_post_reactions r on r.post_id=p.id
  where auth.uid() is not null and p.deleted_at is null
  group by p.id;
$$;

create or replace function public.tl_forum_set_post_reaction(p_post_id text,p_reaction text default null)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_post public.forum_posts;
  v_like_count bigint;
  v_dislike_count bigint;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if p_reaction is not null and p_reaction not in ('like','dislike') then
    raise exception 'Reação inválida';
  end if;

  select * into v_post from public.forum_posts where id=p_post_id for share;
  if not found or v_post.deleted_at is not null then raise exception 'Post não disponível'; end if;

  if p_reaction is null then
    delete from public.forum_post_reactions where post_id=p_post_id and user_id=v_uid;
  else
    insert into public.forum_post_reactions(post_id,user_id,reaction)
    values(p_post_id,v_uid,p_reaction)
    on conflict(post_id,user_id) do update
      set reaction=excluded.reaction,updated_at=now();
  end if;

  select count(*) filter(where reaction='like'),count(*) filter(where reaction='dislike')
    into v_like_count,v_dislike_count
  from public.forum_post_reactions where post_id=p_post_id;

  return jsonb_build_object(
    'post_id',p_post_id,
    'likes',v_like_count,
    'dislikes',v_dislike_count,
    'my_reaction',p_reaction
  );
end;
$$;

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
    coalesce((select count(*)
      from public.forum_post_reactions r
      join public.forum_posts p on p.id=r.post_id
      where p.author_id=cp.user_id and p.deleted_at is null and r.reaction='like'),0)::bigint,
    u.created_at
  from public.community_progress cp
  join auth.users u on u.id=cp.user_id
  where auth.uid() is not null;
$$;

revoke all on function public.tl_forum_post_reaction_summary() from public,anon;
revoke all on function public.tl_forum_set_post_reaction(text,text) from public,anon;
revoke all on function public.tl_forum_profile_stats() from public,anon;
grant execute on function public.tl_forum_post_reaction_summary() to authenticated;
grant execute on function public.tl_forum_set_post_reaction(text,text) to authenticated;
grant execute on function public.tl_forum_profile_stats() to authenticated;

commit;
