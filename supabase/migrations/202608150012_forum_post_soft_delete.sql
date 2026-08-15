-- Soft delete preserva IDs, citações e deep links dos posts.
begin;

alter table public.forum_posts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create or replace function public.tl_forum_delete_post(p_post_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_post public.forum_posts;
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

  delete from public.forum_post_mentions where post_id=p_post_id;
  update public.forum_posts
  set body='',deleted_at=now(),deleted_by=v_uid,updated_at=now()
  where id=p_post_id;

  if v_post.is_original then
    update public.forum_topics
    set body='',updated_at=now()
    where id=v_post.topic_id;
  end if;

  return jsonb_build_object(
    'id',p_post_id,
    'topic_id',v_post.topic_id,
    'deleted',true
  );
end;
$$;

revoke all on function public.tl_forum_delete_post(text) from public,anon;
grant execute on function public.tl_forum_delete_post(text) to authenticated;

commit;
