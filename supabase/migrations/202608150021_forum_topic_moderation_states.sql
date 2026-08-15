begin;

alter table public.forum_topics
  add column if not exists is_closed boolean not null default false;

create or replace function public.tl_forum_set_topic_state(
  p_topic_id text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_topic public.forum_topics;
  v_action text:=lower(trim(coalesce(p_action,'')));
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if not public.tl_is_forum_moderator(v_uid) then raise exception 'Sem permissão'; end if;
  if v_action not in ('pin','unpin','lock','unlock','close','reopen') then
    raise exception 'Ação de moderação inválida';
  end if;

  select * into v_topic from public.forum_topics where id=p_topic_id for update;
  if not found then raise exception 'Tópico não encontrado'; end if;

  update public.forum_topics
  set is_pinned=case
        when v_action='pin' then true
        when v_action='unpin' then false
        else is_pinned
      end,
      is_locked=case
        when v_action='lock' then true
        when v_action='unlock' then false
        else is_locked
      end,
      is_closed=case
        when v_action='close' then true
        when v_action='reopen' then false
        else is_closed
      end,
      updated_at=now()
  where id=p_topic_id
  returning * into v_topic;

  return jsonb_build_object(
    'id',v_topic.id,
    'is_pinned',v_topic.is_pinned,
    'is_locked',v_topic.is_locked,
    'is_closed',v_topic.is_closed,
    'updated_at',v_topic.updated_at
  );
end;
$$;

revoke all on function public.tl_forum_set_topic_state(text,text) from public,anon;
grant execute on function public.tl_forum_set_topic_state(text,text) to authenticated;

create or replace function public.tl_forum_create_post_v3(
  p_topic_id text,
  p_body text,
  p_quote_post_id text default null
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_id text;
  v_topic public.forum_topics;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if not exists(select 1 from public.forum_profiles where user_id=v_uid) then raise exception 'Complete seu perfil do Fórum'; end if;
  if char_length(trim(p_body)) not between 1 and 5000 then raise exception 'Resposta inválida'; end if;

  select * into v_topic from public.forum_topics
  where id=p_topic_id
    and (not is_private or author_id=v_uid or public.tl_is_forum_moderator(v_uid));
  if not found then raise exception 'Tópico indisponível'; end if;
  if v_topic.status<>'approved' then raise exception 'Tópico ainda não aprovado'; end if;
  if v_topic.is_locked then raise exception 'Tópico trancado. Novas respostas não são permitidas.'; end if;
  if v_topic.is_closed then raise exception 'Este tópico foi encerrado.'; end if;
  if not exists(
    select 1 from public.forum_posts
    where topic_id=p_topic_id and is_original and deleted_at is null
  ) then raise exception 'Este tópico foi removido.'; end if;
  if p_quote_post_id is not null and not exists(
    select 1 from public.forum_posts
    where id=p_quote_post_id and topic_id=p_topic_id and deleted_at is null
  ) then raise exception 'Citação inválida'; end if;
  if (select count(*) from public.forum_posts where author_id=v_uid and created_at>now()-interval '1 hour')>=50 then
    raise exception 'Limite de respostas por hora atingido';
  end if;

  v_id:='post_'||replace(gen_random_uuid()::text,'-','');
  insert into public.forum_posts(id,topic_id,author_id,body,is_private,quote_post_id,render_format)
  values(v_id,p_topic_id,v_uid,trim(p_body),v_topic.is_private,p_quote_post_id,'tlmark');
  perform public.tl_forum_sync_mentions(v_id,p_topic_id,trim(p_body));
  update public.forum_topics set updated_at=now(),last_activity_at=now() where id=p_topic_id;
  perform public.tl_award_forum_xp(v_uid,'forum_reply','reply:'||v_id,8);
  return jsonb_build_object('id',v_id,'topic_id',p_topic_id);
end;
$$;

create or replace function public.tl_forum_create_post_v2(p_topic_id text,p_body text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_id text;
  v_topic public.forum_topics;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if char_length(trim(p_body)) not between 1 and 5000 then raise exception 'Resposta inválida'; end if;
  select * into v_topic from public.forum_topics
  where id=p_topic_id
    and (not is_private or author_id=v_uid or public.tl_is_forum_moderator(v_uid));
  if not found then raise exception 'Tópico indisponível'; end if;
  if v_topic.status<>'approved' then raise exception 'Tópico ainda não aprovado'; end if;
  if v_topic.is_locked then raise exception 'Tópico trancado. Novas respostas não são permitidas.'; end if;
  if v_topic.is_closed then raise exception 'Este tópico foi encerrado.'; end if;
  if not exists(
    select 1 from public.forum_posts
    where topic_id=p_topic_id and is_original and deleted_at is null
  ) then raise exception 'Este tópico foi removido.'; end if;
  if (select count(*) from public.forum_posts where author_id=v_uid and created_at>now()-interval '1 hour')>=50 then
    raise exception 'Limite de respostas por hora atingido';
  end if;
  v_id:='post_'||replace(gen_random_uuid()::text,'-','');
  insert into public.forum_posts(id,topic_id,author_id,body,is_private)
  values(v_id,p_topic_id,v_uid,trim(p_body),v_topic.is_private);
  update public.forum_topics set updated_at=now(),last_activity_at=now() where id=p_topic_id;
  perform public.tl_award_forum_xp(v_uid,'forum_reply','reply:'||v_id,8);
  return jsonb_build_object('id',v_id,'topic_id',p_topic_id);
end;
$$;

create or replace function public.tl_forum_create_reply(
  p_topic_key text,
  p_reply_key text,
  p_body text,
  p_private boolean default false
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_progress public.community_progress;
  v_topic public.forum_topics;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if p_reply_key !~ '^forum_[0-9]{10,}_[a-z0-9]{4,}$' or char_length(trim(p_body)) not between 1 and 2000 then
    raise exception 'Resposta inválida';
  end if;
  select * into v_topic from public.forum_topics where id=p_topic_key;
  if not found or v_topic.status<>'approved' then raise exception 'Tópico não registrado ou ainda não aprovado'; end if;
  if v_topic.is_locked then raise exception 'Tópico trancado. Novas respostas não são permitidas.'; end if;
  if v_topic.is_closed then raise exception 'Este tópico foi encerrado.'; end if;
  if not exists(
    select 1 from public.forum_posts
    where topic_id=p_topic_key and is_original and deleted_at is null
  ) then raise exception 'Este tópico foi removido.'; end if;
  if (select count(*) from public.forum_activity_replies where user_id=v_uid and created_at>now()-interval '1 hour')>=50 then
    raise exception 'Limite de respostas por hora atingido';
  end if;
  insert into public.forum_activity_replies(reply_key,topic_key,user_id,body,is_private)
  values(p_reply_key,p_topic_key,v_uid,trim(p_body),coalesce(p_private,false));
  if not p_private then v_progress:=public.tl_award_forum_xp(v_uid,'forum_reply','reply:'||p_reply_key,8); end if;
  return to_jsonb(v_progress);
exception when unique_violation then raise exception 'Esta resposta já foi registrada';
end;
$$;

revoke all on function public.tl_forum_create_post_v3(text,text,text) from public,anon;
revoke all on function public.tl_forum_create_post_v2(text,text) from public,anon;
revoke all on function public.tl_forum_create_reply(text,text,text,boolean) from public,anon;
grant execute on function public.tl_forum_create_post_v3(text,text,text) to authenticated;
grant execute on function public.tl_forum_create_post_v2(text,text) to authenticated;
grant execute on function public.tl_forum_create_reply(text,text,text,boolean) to authenticated;

commit;
