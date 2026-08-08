-- Team Lambreta V93.8.4 — RPC V2 de progresso
-- Corrige contabilização de tópicos, respostas, likes/agradecimentos, presença e live.

create or replace function public.tl_record_progress_v2(
  p_event_type text,
  p_amount integer default 1,
  p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_amount integer := greatest(coalesce(p_amount,1),0);
  v_xp integer := 0;
  v_before_active bigint := 0;
  v_before_live bigint := 0;
  v_row public.community_progress;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;

  -- O utilizador autenticado precisa ter perfil real no Team.
  if not exists(select 1 from public.profiles where id=v_uid) then
    raise exception 'Perfil do Team não encontrado para o utilizador autenticado';
  end if;

  insert into public.community_progress(user_id)
  values(v_uid)
  on conflict(user_id) do nothing;

  select active_seconds, live_seconds
  into v_before_active, v_before_live
  from public.community_progress
  where user_id=v_uid;

  if p_event_type in ('active_seconds','afk_seconds','live_seconds') then
    v_amount := least(v_amount,120);
  else
    v_amount := 1;
  end if;

  v_xp := case p_event_type
    when 'active_seconds' then (floor((v_before_active+v_amount)/120.0)-floor(v_before_active/120.0))::int
    when 'live_seconds' then (floor((v_before_live+v_amount)/60.0)-floor(v_before_live/60.0))::int
    when 'forum_topic' then 20
    when 'forum_reply' then 8
    when 'event_participation' then 50
    else 0
  end;

  begin
    insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
    values(v_uid,p_event_type,v_amount,v_xp,nullif(p_dedupe_key,''),coalesce(p_metadata,'{}'::jsonb));
  exception when unique_violation then
    select * into v_row from public.community_progress where user_id=v_uid;
    return to_jsonb(v_row);
  end;

  update public.community_progress
  set
    xp=xp+v_xp,
    active_seconds=active_seconds+case when p_event_type='active_seconds' then v_amount else 0 end,
    afk_seconds=afk_seconds+case when p_event_type='afk_seconds' then v_amount else 0 end,
    live_seconds=live_seconds+case when p_event_type='live_seconds' then v_amount else 0 end,
    forum_topics=forum_topics+case when p_event_type='forum_topic' then 1 else 0 end,
    forum_replies=forum_replies+case when p_event_type='forum_reply' then 1 else 0 end,
    event_participations=event_participations+case when p_event_type='event_participation' then 1 else 0 end,
    last_active_at=case when p_event_type in ('active_seconds','live_seconds') then now() else last_active_at end,
    updated_at=now()
  where user_id=v_uid;

  update public.community_progress
  set level=public.tl_progress_level(xp)
  where user_id=v_uid
  returning * into v_row;

  update public.profiles
  set
    xp=v_row.xp,
    level=v_row.level,
    active_seconds=v_row.active_seconds,
    afk_seconds=v_row.afk_seconds,
    live_seconds=v_row.live_seconds,
    forum_topics_count=v_row.forum_topics,
    forum_replies_count=v_row.forum_replies,
    event_participations=v_row.event_participations
  where id=v_uid;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.tl_record_progress_v2(text,integer,text,jsonb) to authenticated;

create or replace function public.tl_give_forum_thank_v2(p_target uuid,p_topic_key text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_key text;
  v_row public.community_progress;
begin
  if v_actor is null or p_target is null or p_target=v_actor then return false; end if;
  if not exists(select 1 from public.profiles where id=p_target) then return false; end if;

  v_key := v_actor::text || ':' || coalesce(p_topic_key,'topic');
  insert into public.community_progress(user_id) values(p_target) on conflict(user_id) do nothing;

  begin
    insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
    values(p_target,'forum_thank',1,5,v_key,jsonb_build_object('from',v_actor,'topic',p_topic_key));
  exception when unique_violation then
    return false;
  end;

  update public.community_progress
  set forum_thanks=forum_thanks+1,xp=xp+5,updated_at=now()
  where user_id=p_target;

  update public.community_progress
  set level=public.tl_progress_level(xp)
  where user_id=p_target
  returning * into v_row;

  update public.profiles
  set xp=v_row.xp,level=v_row.level,forum_thanks_count=v_row.forum_thanks
  where id=p_target;

  return true;
end;
$$;

grant execute on function public.tl_give_forum_thank_v2(uuid,text) to authenticated;

-- Diagnóstico rápido do utilizador atual.
create or replace function public.tl_progress_me()
returns jsonb
language sql
security definer
set search_path=public
as $$
  select coalesce(to_jsonb(cp),'{}'::jsonb)
  from public.community_progress cp
  where cp.user_id=auth.uid();
$$;
grant execute on function public.tl_progress_me() to authenticated;
