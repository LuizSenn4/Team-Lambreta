-- Team Lambreta V93.8.6
-- Dá +5 XP ao AUTOR do tópico quando outra pessoa dá like.
-- Cada utilizador só pode premiar o mesmo tópico uma vez.

create unique index if not exists community_progress_events_dedupe_unique
on public.community_progress_events (dedupe_key)
where dedupe_key is not null;

create or replace function public.give_community_forum_thank_v2(
  p_target uuid,
  p_topic_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_key text;
  v_new_xp bigint;
begin
  if v_actor is null then
    raise exception 'Utilizador não autenticado';
  end if;
  if p_target is null or p_target = v_actor then
    return false;
  end if;

  v_key := 'forum_thank:' || p_topic_key || ':from:' || v_actor::text;

  -- Dedupe: se este utilizador já premiou este tópico, não soma novamente.
  if exists (
    select 1 from public.community_progress_events
    where dedupe_key = v_key
  ) then
    return false;
  end if;

  insert into public.community_progress(user_id,xp,level,forum_thanks,last_active_at)
  values (p_target,5,1,1,now())
  on conflict (user_id) do update
  set xp = public.community_progress.xp + 5,
      forum_thanks = public.community_progress.forum_thanks + 1,
      level = floor((public.community_progress.xp + 5) / 250.0)::integer + 1,
      last_active_at = now();

  select xp into v_new_xp
  from public.community_progress where user_id=p_target;

  insert into public.community_progress_events(
    user_id,event_type,amount,xp_awarded,dedupe_key,metadata,created_at
  ) values (
    p_target,'forum_thanks',1,5,v_key,
    jsonb_build_object('topic',p_topic_key,'given_by',v_actor),now()
  );

  return true;
end;
$$;

grant execute on function public.give_community_forum_thank_v2(uuid,text) to authenticated;
