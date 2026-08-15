-- Fórum: diagnóstico verificável e retorno transacional completo do XP.
begin;

create or replace function public.tl_forum_xp_snapshot()
returns jsonb language sql security definer set search_path=public
as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'role', p.role::text,
    'progress', to_jsonb(cp),
    'recent_events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (select event_type,xp_awarded,dedupe_key,created_at
            from public.community_progress_events
            where user_id=auth.uid() order by created_at desc limit 12) e
    ), '[]'::jsonb)
  )
  from public.profiles p
  left join public.community_progress cp on cp.user_id=p.id
  where p.id=auth.uid()
$$;
revoke all on function public.tl_forum_xp_snapshot() from public;
grant execute on function public.tl_forum_xp_snapshot() to authenticated;

-- Retorna sempre o evento persistido. Se qualquer etapa não gravar, a transação falha
-- em vez de o browser exibir uma mensagem de sucesso enganosa.
create or replace function public.tl_award_forum_xp(
  p_user_id uuid,p_event_type text,p_dedupe_key text,p_xp integer
) returns public.community_progress
language plpgsql security definer set search_path=public
as $$
declare v_row public.community_progress; v_inserted integer;
begin
  if p_event_type not in ('forum_topic','forum_reply','forum_thank') then raise exception 'Evento de XP inválido'; end if;
  if p_xp <> (case p_event_type when 'forum_topic' then 20 when 'forum_reply' then 8 else 5 end) then raise exception 'Valor de XP inválido'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Perfil de XP não encontrado'; end if;
  insert into public.community_progress(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.community_progress_events(user_id,event_type,amount,xp_awarded,dedupe_key,metadata)
  values(p_user_id,p_event_type,1,p_xp,p_dedupe_key,jsonb_build_object('source','forum_transaction'))
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=1 then
    update public.community_progress set
      xp=xp+p_xp,
      forum_topics=forum_topics+case when p_event_type='forum_topic' then 1 else 0 end,
      forum_replies=forum_replies+case when p_event_type='forum_reply' then 1 else 0 end,
      forum_thanks=forum_thanks+case when p_event_type='forum_thank' then 1 else 0 end,
      updated_at=now()
    where user_id=p_user_id;
  end if;
  update public.community_progress set level=public.tl_progress_level(xp) where user_id=p_user_id returning * into v_row;
  update public.profiles set xp=v_row.xp,level=v_row.level,forum_topics_count=v_row.forum_topics,
    forum_replies_count=v_row.forum_replies,forum_thanks_count=v_row.forum_thanks where id=p_user_id;
  if v_row.user_id is null then raise exception 'XP não persistido'; end if;
  return v_row;
end;
$$;
revoke all on function public.tl_award_forum_xp(uuid,text,text,integer) from public,anon,authenticated;

commit;
