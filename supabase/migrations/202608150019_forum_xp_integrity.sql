-- XP do Fórum passa a ser derivado exclusivamente do conteúdo/reação válidos atuais.
begin;

create unique index if not exists community_progress_event_dedupe
  on public.community_progress_events(user_id,event_type,dedupe_key)
  where dedupe_key is not null;

create or replace function public.tl_forum_reconcile_user_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_old_forum_xp bigint:=0;
  v_topics integer:=0;
  v_replies integer:=0;
  v_likes integer:=0;
  v_new_forum_xp bigint:=0;
  v_progress public.community_progress;
begin
  if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id) then return; end if;

  select coalesce(sum(xp_awarded),0)::bigint into v_old_forum_xp
  from public.community_progress_events
  where user_id=p_user_id and event_type in ('forum_topic','forum_reply','forum_thank','forum_thanks');

  delete from public.community_progress_events
  where user_id=p_user_id and event_type in ('forum_topic','forum_reply','forum_thank','forum_thanks');

  insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
  select p_user_id,'forum_topic',1,20,'topic:'||t.id,
    jsonb_build_object('source','forum_reconciliation','topic_id',t.id)
  from public.forum_topics t
  join public.forum_posts original on original.topic_id=t.id and original.is_original and original.deleted_at is null
  where t.author_id=p_user_id and t.status='approved'
  on conflict do nothing;

  insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
  select p_user_id,'forum_reply',1,8,'reply:'||p.id,
    jsonb_build_object('source','forum_reconciliation','post_id',p.id,'topic_id',p.topic_id)
  from public.forum_posts p
  join public.forum_topics t on t.id=p.topic_id and t.status='approved'
  where p.author_id=p_user_id and not p.is_original and p.deleted_at is null
    and exists(select 1 from public.forum_posts original
      where original.topic_id=p.topic_id and original.is_original and original.deleted_at is null)
  on conflict do nothing;

  insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
  select p_user_id,'forum_thank',1,5,
    'forum_like:'||r.post_id||':from:'||r.user_id::text,
    jsonb_build_object('source','forum_reconciliation','post_id',r.post_id,'given_by',r.user_id)
  from public.forum_post_reactions r
  join public.forum_posts p on p.id=r.post_id and p.deleted_at is null
  join public.forum_topics t on t.id=p.topic_id and t.status='approved'
  where p.author_id=p_user_id and r.reaction='like' and r.user_id<>p.author_id
    and exists(select 1 from public.forum_posts original
      where original.topic_id=p.topic_id and original.is_original and original.deleted_at is null)
  on conflict do nothing;

  select
    count(*) filter(where event_type='forum_topic')::integer,
    count(*) filter(where event_type='forum_reply')::integer,
    count(*) filter(where event_type='forum_thank')::integer,
    coalesce(sum(xp_awarded),0)::bigint
  into v_topics,v_replies,v_likes,v_new_forum_xp
  from public.community_progress_events
  where user_id=p_user_id and event_type in ('forum_topic','forum_reply','forum_thank');

  insert into public.community_progress(user_id) values(p_user_id) on conflict(user_id) do nothing;
  update public.community_progress
  set xp=greatest(0,xp-v_old_forum_xp+v_new_forum_xp),
      forum_topics=v_topics,
      forum_replies=v_replies,
      forum_thanks=v_likes,
      updated_at=now()
  where user_id=p_user_id;
  update public.community_progress
  set level=public.tl_progress_level(xp)
  where user_id=p_user_id
  returning * into v_progress;

  update public.profiles
  set xp=v_progress.xp,
      level=v_progress.level,
      forum_topics_count=v_progress.forum_topics,
      forum_replies_count=v_progress.forum_replies,
      forum_thanks_count=v_progress.forum_thanks
  where id=p_user_id;
end;
$$;

revoke all on function public.tl_forum_reconcile_user_progress(uuid) from public,anon,authenticated;

create or replace function public.tl_award_forum_xp(
  p_user_id uuid,p_event_type text,p_dedupe_key text,p_xp integer
) returns public.community_progress
language plpgsql security definer set search_path=public
as $$
declare v_row public.community_progress;
begin
  if p_event_type not in ('forum_topic','forum_reply','forum_thank') then raise exception 'Evento de XP inválido'; end if;
  if p_xp<>(case p_event_type when 'forum_topic' then 20 when 'forum_reply' then 8 else 5 end) then raise exception 'Valor de XP inválido'; end if;
  perform public.tl_forum_reconcile_user_progress(p_user_id);
  select * into v_row from public.community_progress where user_id=p_user_id;
  return v_row;
end;
$$;
revoke all on function public.tl_award_forum_xp(uuid,text,text,integer) from public,anon,authenticated;

create or replace function public.tl_forum_post_reaction_summary()
returns table(post_id text,likes bigint,dislikes bigint,my_reaction text)
language sql stable security definer set search_path=public
as $$
  select p.id,
    count(r.user_id) filter(where r.reaction='like')::bigint,
    count(r.user_id) filter(where r.reaction='dislike')::bigint,
    max(r.reaction) filter(where r.user_id=auth.uid())
  from public.forum_posts p
  join public.forum_topics t on t.id=p.topic_id and t.status='approved'
  left join public.forum_post_reactions r on r.post_id=p.id
  where auth.uid() is not null and p.deleted_at is null
    and exists(select 1 from public.forum_posts original
      where original.topic_id=p.topic_id and original.is_original and original.deleted_at is null)
  group by p.id;
$$;

create or replace function public.tl_forum_set_post_reaction(p_post_id text,p_reaction text default null)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();v_post public.forum_posts;
  v_like_count bigint;v_dislike_count bigint;v_current text;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if p_reaction is not null and p_reaction not in ('like','dislike') then raise exception 'Reação inválida'; end if;
  select p.* into v_post from public.forum_posts p
  join public.forum_topics t on t.id=p.topic_id and t.status='approved'
  where p.id=p_post_id and p.deleted_at is null
    and exists(select 1 from public.forum_posts original
      where original.topic_id=p.topic_id and original.is_original and original.deleted_at is null)
  for share of p;
  if not found then raise exception 'Post não disponível'; end if;
  if v_post.author_id=v_uid then raise exception 'Não pode reagir ao próprio post'; end if;

  select reaction into v_current from public.forum_post_reactions where post_id=p_post_id and user_id=v_uid;
  if p_reaction is null then
    delete from public.forum_post_reactions where post_id=p_post_id and user_id=v_uid;
  elsif v_current is distinct from p_reaction then
    insert into public.forum_post_reactions(post_id,user_id,reaction)
    values(p_post_id,v_uid,p_reaction)
    on conflict(post_id,user_id) do update set reaction=excluded.reaction,updated_at=now();
  end if;
  perform public.tl_forum_reconcile_user_progress(v_post.author_id);

  select count(*) filter(where reaction='like'),count(*) filter(where reaction='dislike')
  into v_like_count,v_dislike_count from public.forum_post_reactions where post_id=p_post_id;
  return jsonb_build_object('post_id',p_post_id,'likes',v_like_count,'dislikes',v_dislike_count,'my_reaction',p_reaction);
end;
$$;

revoke all on function public.tl_forum_post_reaction_summary() from public,anon;
revoke all on function public.tl_forum_set_post_reaction(text,text) from public,anon;
grant execute on function public.tl_forum_post_reaction_summary() to authenticated;
grant execute on function public.tl_forum_set_post_reaction(text,text) to authenticated;

create or replace function public.tl_forum_delete_post(p_post_id text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();v_post public.forum_posts;v_placeholder text;
  v_affected uuid[];v_author uuid;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  select * into v_post from public.forum_posts where id=p_post_id for update;
  if not found then raise exception 'Post não encontrado'; end if;
  if v_post.deleted_at is not null then raise exception 'Post já removido'; end if;
  if v_post.author_id<>v_uid and not public.tl_is_forum_moderator(v_uid) then raise exception 'Sem permissão para apagar este post'; end if;

  if v_post.is_original then
    select array_agg(distinct author_id) into v_affected from public.forum_posts where topic_id=v_post.topic_id;
    delete from public.forum_post_mentions where post_id in (select id from public.forum_posts where topic_id=v_post.topic_id);
    delete from public.forum_post_reactions where post_id in (select id from public.forum_posts where topic_id=v_post.topic_id);
    v_placeholder:='Esta publicação foi removida.';
  else
    v_affected:=array[v_post.author_id];
    delete from public.forum_post_mentions where post_id=p_post_id;
    delete from public.forum_post_reactions where post_id=p_post_id;
    v_placeholder:='Esta resposta foi removida.';
  end if;

  update public.forum_posts set body=v_placeholder,deleted_at=now(),deleted_by=v_uid,updated_at=now() where id=p_post_id;
  if v_post.is_original then update public.forum_topics set body=v_placeholder,updated_at=now() where id=v_post.topic_id; end if;

  foreach v_author in array coalesce(v_affected,array[]::uuid[]) loop
    perform public.tl_forum_reconcile_user_progress(v_author);
  end loop;
  update public.forum_topics t set last_activity_at=coalesce(
    (select max(p.created_at) from public.forum_posts p where p.topic_id=v_post.topic_id and p.deleted_at is null),t.created_at),updated_at=now()
  where t.id=v_post.topic_id;
  return jsonb_build_object('id',p_post_id,'topic_id',v_post.topic_id,'deleted',true,'kind',case when v_post.is_original then 'topic' else 'reply' end);
end;
$$;
revoke all on function public.tl_forum_delete_post(text) from public,anon;
grant execute on function public.tl_forum_delete_post(text) to authenticated;

-- Impede que o endpoint genérico volte a fabricar eventos de Fórum.
create or replace function public.tl_record_progress_v2(
  p_event_type text,p_amount integer default 1,p_dedupe_key text default null,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public
as $$
begin
  if p_event_type in ('forum_topic','forum_reply','forum_thank','forum_thanks') then
    raise exception 'XP de Fórum só pode ser concedido pelas ações transacionais do Fórum';
  end if;
  return to_jsonb(public.tl_record_progress(p_event_type,p_amount,p_dedupe_key,p_metadata));
end;
$$;
revoke all on function public.tl_record_progress_v2(text,integer,text,jsonb) from public,anon;
grant execute on function public.tl_record_progress_v2(text,integer,text,jsonb) to authenticated;

create or replace function public.give_community_forum_thank_v2(p_target uuid,p_topic_key text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid();v_post public.forum_posts;v_previous text;
begin
  if v_actor is null then raise exception 'Login necessário'; end if;
  select p.* into v_post from public.forum_posts p join public.forum_topics t on t.id=p.topic_id
  where t.id=p_topic_key and t.status='approved' and p.is_original and p.deleted_at is null;
  if not found or v_post.author_id<>p_target or v_post.author_id=v_actor then return false; end if;
  select reaction into v_previous from public.forum_post_reactions where post_id=v_post.id and user_id=v_actor;
  if v_previous='like' then return false; end if;
  insert into public.forum_post_reactions(post_id,user_id,reaction) values(v_post.id,v_actor,'like')
  on conflict(post_id,user_id) do update set reaction='like',updated_at=now();
  perform public.tl_forum_reconcile_user_progress(v_post.author_id);
  return true;
end;
$$;

create or replace function public.tl_give_forum_thank_v2(p_target uuid,p_topic_key text)
returns boolean language sql security definer set search_path=public
as $$ select public.give_community_forum_thank_v2(p_target,p_topic_key) $$;

revoke all on function public.give_community_forum_thank_v2(uuid,text) from public,anon;
revoke all on function public.tl_give_forum_thank_v2(uuid,text) from public,anon;
grant execute on function public.give_community_forum_thank_v2(uuid,text) to authenticated;
grant execute on function public.tl_give_forum_thank_v2(uuid,text) to authenticated;

create or replace function public.tl_forum_like_topic(p_topic_key text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_post public.forum_posts;v_result jsonb;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  select p.* into v_post from public.forum_posts p join public.forum_topics t on t.id=p.topic_id
  where t.id=p_topic_key and t.status='approved' and p.is_original and p.deleted_at is null;
  if not found then raise exception 'Tópico indisponível'; end if;
  if v_post.author_id=v_uid then raise exception 'Não pode reagir ao próprio tópico'; end if;
  v_result:=public.tl_forum_set_post_reaction(v_post.id,'like');
  return v_result;
end;
$$;

create or replace function public.tl_forum_unlike_topic(p_topic_key text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_post_id text;v_owner uuid;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  select p.id,p.author_id into v_post_id,v_owner from public.forum_posts p
  where p.topic_id=p_topic_key and p.is_original;
  if v_post_id is null then return false; end if;
  delete from public.forum_post_reactions where post_id=v_post_id and user_id=v_uid;
  if found then perform public.tl_forum_reconcile_user_progress(v_owner);return true; end if;
  return false;
end;
$$;
revoke all on function public.tl_forum_like_topic(text) from public,anon;
revoke all on function public.tl_forum_unlike_topic(text) from public,anon;
grant execute on function public.tl_forum_like_topic(text) to authenticated;
grant execute on function public.tl_forum_unlike_topic(text) to authenticated;

-- Corrige imediatamente qualquer progresso histórico divergente/farmado.
do $$ declare r record;
begin
  for r in select distinct user_id from public.community_progress loop
    perform public.tl_forum_reconcile_user_progress(r.user_id);
  end loop;
end $$;

commit;
