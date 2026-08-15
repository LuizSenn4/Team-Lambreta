-- Menções do Fórum vinculadas a participantes reais do tópico.
begin;

create table if not exists public.forum_post_mentions (
  post_id text not null references public.forum_posts(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, mentioned_user_id)
);

create index if not exists forum_post_mentions_user_idx
  on public.forum_post_mentions(mentioned_user_id, created_at desc);

alter table public.forum_post_mentions enable row level security;

drop policy if exists forum_post_mentions_members_read on public.forum_post_mentions;
create policy forum_post_mentions_members_read on public.forum_post_mentions
for select to authenticated using (
  exists (
    select 1
    from public.forum_posts p
    join public.forum_topics t on t.id=p.topic_id
    where p.id=forum_post_mentions.post_id
      and (
        not t.is_private
        or t.author_id=auth.uid()
        or public.tl_is_forum_moderator(auth.uid())
      )
  )
);

revoke all on public.forum_post_mentions from public,anon;
revoke insert,update,delete on public.forum_post_mentions from authenticated;
grant select on public.forum_post_mentions to authenticated;

create or replace function public.tl_forum_sync_mentions(
  p_post_id text,
  p_topic_id text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_match text[];
  v_user_id uuid;
begin
  delete from public.forum_post_mentions where post_id=p_post_id;

  for v_match in
    select regexp_matches(
      p_body,
      '\[mention=([0-9a-fA-F-]{36})\][^[]*\[/mention\]',
      'g'
    )
  loop
    v_user_id:=v_match[1]::uuid;
    if not exists (
      select 1 from public.forum_topics t
      where t.id=p_topic_id and t.author_id=v_user_id
    ) and not exists (
      select 1 from public.forum_posts p
      where p.topic_id=p_topic_id and p.author_id=v_user_id
    ) then
      raise exception 'Menção inválida para este tópico';
    end if;

    insert into public.forum_post_mentions(post_id,mentioned_user_id)
    values(p_post_id,v_user_id)
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.tl_forum_sync_mentions(text,text,text) from public,anon,authenticated;

create or replace function public.tl_forum_create_post_v3(
  p_topic_id text,
  p_body text,
  p_quote_post_id text default null
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_id text;v_private boolean;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if not exists(select 1 from public.forum_profiles where user_id=v_uid) then raise exception 'Complete seu perfil do Fórum'; end if;
  if char_length(trim(p_body)) not between 1 and 5000 then raise exception 'Resposta inválida'; end if;
  select is_private into v_private from public.forum_topics where id=p_topic_id and status='approved' and not is_locked
    and (not is_private or author_id=v_uid or public.tl_is_forum_moderator(v_uid));
  if not found then raise exception 'Tópico indisponível ou fechado'; end if;
  if p_quote_post_id is not null and not exists(select 1 from public.forum_posts where id=p_quote_post_id and topic_id=p_topic_id) then raise exception 'Citação inválida'; end if;
  if (select count(*) from public.forum_posts where author_id=v_uid and created_at>now()-interval '1 hour')>=50 then raise exception 'Limite de respostas por hora atingido'; end if;
  v_id:='post_'||replace(gen_random_uuid()::text,'-','');
  insert into public.forum_posts(id,topic_id,author_id,body,is_private,quote_post_id,render_format)
  values(v_id,p_topic_id,v_uid,trim(p_body),v_private,p_quote_post_id,'tlmark');
  perform public.tl_forum_sync_mentions(v_id,p_topic_id,trim(p_body));
  update public.forum_topics set updated_at=now(),last_activity_at=now() where id=p_topic_id;
  perform public.tl_award_forum_xp(v_uid,'forum_reply','reply:'||v_id,8);
  return jsonb_build_object('id',v_id,'topic_id',p_topic_id);
end;
$$;

create or replace function public.tl_forum_edit_post(p_post_id text,p_body text)
returns public.forum_posts language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_post public.forum_posts;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if char_length(trim(p_body)) not between 1 and 5000 then raise exception 'Conteúdo inválido'; end if;
  select * into v_post from public.forum_posts where id=p_post_id for update;
  if not found then raise exception 'Post não encontrado'; end if;
  if v_post.author_id<>v_uid and not public.tl_is_forum_moderator(v_uid) then raise exception 'Sem permissão para editar este post'; end if;
  perform public.tl_forum_sync_mentions(p_post_id,v_post.topic_id,trim(p_body));
  update public.forum_posts set body=trim(p_body),edited_at=now(),edited_by=v_uid,updated_at=now(),render_format='tlmark'
  where id=p_post_id returning * into v_post;
  if v_post.is_original then update public.forum_topics set body=v_post.body,updated_at=now(),render_format='tlmark' where id=v_post.topic_id; end if;
  return v_post;
end;
$$;

revoke all on function public.tl_forum_create_post_v3(text,text,text) from public;
revoke all on function public.tl_forum_edit_post(text,text) from public;
grant execute on function public.tl_forum_create_post_v3(text,text,text) to authenticated;
grant execute on function public.tl_forum_edit_post(text,text) to authenticated;

commit;
