-- Corrige o soft delete sem violar forum_posts_body_check.
-- IDs permanecem estáveis; conteúdo, menções e reações deixam de ser públicos.
begin;

create or replace function public.tl_forum_delete_post(p_post_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_post public.forum_posts;
  v_placeholder text;
  v_event_type text;
  v_dedupe_key text;
  v_xp_removed integer:=0;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;

  select * into v_post
  from public.forum_posts
  where id=p_post_id
  for update;

  if not found then raise exception 'Post não encontrado'; end if;
  if v_post.deleted_at is not null then raise exception 'Post já removido'; end if;
  if v_post.author_id<>v_uid and not public.tl_is_forum_moderator(v_uid) then
    raise exception 'Sem permissão para apagar este post';
  end if;

  v_placeholder:=case
    when v_post.is_original then 'Esta publicação foi removida.'
    else 'Esta resposta foi removida.'
  end;
  v_event_type:=case when v_post.is_original then 'forum_topic' else 'forum_reply' end;
  v_dedupe_key:=case
    when v_post.is_original then 'topic:'||v_post.topic_id
    else 'reply:'||v_post.id
  end;

  delete from public.forum_post_mentions where post_id=p_post_id;
  delete from public.forum_post_reactions where post_id=p_post_id;

  update public.forum_posts
  set body=v_placeholder,deleted_at=now(),deleted_by=v_uid,updated_at=now()
  where id=p_post_id;

  if v_post.is_original then
    update public.forum_topics
    set body=v_placeholder,updated_at=now()
    where id=v_post.topic_id;
  end if;

  delete from public.community_progress_events
  where user_id=v_post.author_id
    and event_type=v_event_type
    and dedupe_key=v_dedupe_key
  returning xp_awarded into v_xp_removed;

  if found then
    update public.community_progress
    set xp=greatest(0,xp-coalesce(v_xp_removed,0)),
        forum_topics=greatest(0,forum_topics-case when v_post.is_original then 1 else 0 end),
        forum_replies=greatest(0,forum_replies-case when v_post.is_original then 0 else 1 end),
        updated_at=now()
    where user_id=v_post.author_id;

    update public.community_progress
    set level=public.tl_progress_level(xp)
    where user_id=v_post.author_id;

    update public.profiles p
    set xp=cp.xp,
        level=cp.level,
        forum_topics_count=cp.forum_topics,
        forum_replies_count=cp.forum_replies,
        forum_thanks_count=cp.forum_thanks
    from public.community_progress cp
    where p.id=v_post.author_id and cp.user_id=v_post.author_id;
  end if;

  update public.forum_topics t
  set last_activity_at=coalesce(
        (select max(p.created_at) from public.forum_posts p
         where p.topic_id=v_post.topic_id and p.deleted_at is null),
        t.created_at
      ),
      updated_at=now()
  where t.id=v_post.topic_id;

  return jsonb_build_object(
    'id',p_post_id,
    'topic_id',v_post.topic_id,
    'deleted',true,
    'kind',case when v_post.is_original then 'topic' else 'reply' end
  );
end;
$$;

revoke all on function public.tl_forum_delete_post(text) from public,anon;
grant execute on function public.tl_forum_delete_post(text) to authenticated;

commit;
