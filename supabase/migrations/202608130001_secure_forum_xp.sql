-- Fórum: evidência persistente e XP transacional, sem aceitar valores de XP do browser.
begin;

create table if not exists public.forum_activity_topics (
  topic_key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  category text not null default 'geral',
  is_private boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_activity_replies (
  reply_key text primary key,
  topic_key text not null references public.forum_activity_topics(topic_key) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_activity_likes (
  topic_key text not null references public.forum_activity_topics(topic_key) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(topic_key,user_id)
);

alter table public.forum_activity_topics enable row level security;
alter table public.forum_activity_replies enable row level security;
alter table public.forum_activity_likes enable row level security;
revoke all on public.forum_activity_topics,public.forum_activity_replies,public.forum_activity_likes from anon,authenticated;

-- O endpoint genérico antigo aceitava forum_topic/forum_reply enviados pelo browser.
-- Ele permanece para atividade/live, mas deixa de ser uma porta para fabricar XP de fórum.
alter function public.tl_record_progress(text,integer,text,jsonb) rename to tl_record_progress_legacy_v938;
revoke all on function public.tl_record_progress_legacy_v938(text,integer,text,jsonb) from public,anon,authenticated;
create function public.tl_record_progress(p_event_type text,p_amount integer default 1,p_dedupe_key text default null,p_metadata jsonb default '{}'::jsonb)
returns public.community_progress language plpgsql security definer set search_path=public
as $$
begin
  if p_event_type in ('forum_topic','forum_reply','forum_thank','forum_thanks') then
    raise exception 'XP de fórum só pode ser concedido pelas ações transacionais do fórum';
  end if;
  return public.tl_record_progress_legacy_v938(p_event_type,p_amount,p_dedupe_key,p_metadata);
end;
$$;
revoke all on function public.tl_record_progress(text,integer,text,jsonb) from public;
grant execute on function public.tl_record_progress(text,integer,text,jsonb) to authenticated;

create or replace function public.tl_award_forum_xp(
  p_user_id uuid,p_event_type text,p_dedupe_key text,p_xp integer
) returns public.community_progress
language plpgsql security definer set search_path=public
as $$
declare v_row public.community_progress;
begin
  insert into public.community_progress(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
  values(p_user_id,p_event_type,1,p_xp,p_dedupe_key,'{}'::jsonb)
  on conflict do nothing;
  if not found then select * into v_row from public.community_progress where user_id=p_user_id; return v_row; end if;
  update public.community_progress set
    xp=xp+p_xp,
    forum_topics=forum_topics+case when p_event_type='forum_topic' then 1 else 0 end,
    forum_replies=forum_replies+case when p_event_type='forum_reply' then 1 else 0 end,
    forum_thanks=forum_thanks+case when p_event_type='forum_thank' then 1 else 0 end,
    updated_at=now()
  where user_id=p_user_id returning * into v_row;
  update public.community_progress set level=public.tl_progress_level(xp) where user_id=p_user_id returning * into v_row;
  update public.profiles set xp=v_row.xp,level=v_row.level,forum_topics_count=v_row.forum_topics,
    forum_replies_count=v_row.forum_replies,forum_thanks_count=v_row.forum_thanks where id=p_user_id;
  return v_row;
end;
$$;
revoke all on function public.tl_award_forum_xp(uuid,text,text,integer) from public,anon,authenticated;

create or replace function public.tl_forum_create_topic(
  p_topic_key text,p_title text,p_body text,p_category text,p_private boolean default false
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_role text;v_approved boolean;v_progress public.community_progress;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if p_topic_key !~ '^forum_[0-9]{10,}_[a-z0-9]{4,}$' then raise exception 'Identificador de tópico inválido'; end if;
  if char_length(trim(p_title)) not between 1 and 60 or char_length(trim(p_body)) not between 1 and 1000 then raise exception 'Conteúdo do tópico inválido'; end if;
  select role::text into v_role from public.profiles where id=v_uid;
  if v_role is null then raise exception 'Perfil não encontrado'; end if;
  if (select count(*) from public.forum_activity_topics where user_id=v_uid and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de tópicos por hora atingido'; end if;
  v_approved:=v_role in ('master','admin','staff','moderator','dev');
  insert into public.forum_activity_topics(topic_key,user_id,title,body,category,is_private,is_approved)
  values(p_topic_key,v_uid,trim(p_title),trim(p_body),coalesce(nullif(trim(p_category),''),'geral'),coalesce(p_private,false),v_approved);
  if v_approved then v_progress:=public.tl_award_forum_xp(v_uid,'forum_topic','topic:'||p_topic_key,20); end if;
  return jsonb_build_object('approved',v_approved,'progress',to_jsonb(v_progress));
exception when unique_violation then raise exception 'Este tópico já foi registrado';
end;
$$;

create or replace function public.tl_forum_approve_topic(p_topic_key text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_owner uuid;v_progress public.community_progress;
begin
  if not exists(select 1 from public.profiles where id=v_uid and role::text in ('master','admin','staff','moderator','dev')) then raise exception 'Sem permissão'; end if;
  update public.forum_activity_topics set is_approved=true where topic_key=p_topic_key and not is_approved returning user_id into v_owner;
  if v_owner is null then select user_id into v_owner from public.forum_activity_topics where topic_key=p_topic_key; end if;
  if v_owner is null then raise exception 'Tópico não encontrado'; end if;
  v_progress:=public.tl_award_forum_xp(v_owner,'forum_topic','topic:'||p_topic_key,20);
  return to_jsonb(v_progress);
end;
$$;

create or replace function public.tl_forum_create_reply(p_topic_key text,p_reply_key text,p_body text,p_private boolean default false)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_progress public.community_progress;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if p_reply_key !~ '^forum_[0-9]{10,}_[a-z0-9]{4,}$' or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Resposta inválida'; end if;
  if not exists(select 1 from public.forum_activity_topics where topic_key=p_topic_key and is_approved) then raise exception 'Tópico não registrado ou ainda não aprovado'; end if;
  if (select count(*) from public.forum_activity_replies where user_id=v_uid and created_at>now()-interval '1 hour')>=50 then raise exception 'Limite de respostas por hora atingido'; end if;
  insert into public.forum_activity_replies(reply_key,topic_key,user_id,body,is_private) values(p_reply_key,p_topic_key,v_uid,trim(p_body),coalesce(p_private,false));
  if not p_private then v_progress:=public.tl_award_forum_xp(v_uid,'forum_reply','reply:'||p_reply_key,8); end if;
  return to_jsonb(v_progress);
exception when unique_violation then raise exception 'Esta resposta já foi registrada';
end;
$$;

create or replace function public.tl_forum_like_topic(p_topic_key text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_owner uuid;v_progress public.community_progress;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  select user_id into v_owner from public.forum_activity_topics where topic_key=p_topic_key and is_approved;
  if v_owner is null then raise exception 'Tópico não registrado ou ainda não aprovado'; end if;
  if v_owner=v_uid then raise exception 'O autor não recebe XP pelo próprio like'; end if;
  insert into public.forum_activity_likes(topic_key,user_id) values(p_topic_key,v_uid);
  v_progress:=public.tl_award_forum_xp(v_owner,'forum_thank','forum_thank:'||p_topic_key||':from:'||v_uid::text,5);
  return to_jsonb(v_progress);
exception when unique_violation then raise exception 'Este like já foi contabilizado';
end;
$$;

create or replace function public.tl_forum_unlike_topic(p_topic_key text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Login necessário'; end if;
  delete from public.forum_activity_likes where topic_key=p_topic_key and user_id=auth.uid();
  return found;
end;
$$;

revoke all on function public.tl_forum_create_topic(text,text,text,text,boolean) from public;
revoke all on function public.tl_forum_approve_topic(text) from public;
revoke all on function public.tl_forum_create_reply(text,text,text,boolean) from public;
revoke all on function public.tl_forum_like_topic(text) from public;
revoke all on function public.tl_forum_unlike_topic(text) from public;
grant execute on function public.tl_forum_create_topic(text,text,text,text,boolean) to authenticated;
grant execute on function public.tl_forum_approve_topic(text) to authenticated;
grant execute on function public.tl_forum_create_reply(text,text,text,boolean) to authenticated;
grant execute on function public.tl_forum_like_topic(text) to authenticated;
grant execute on function public.tl_forum_unlike_topic(text) to authenticated;

commit;
