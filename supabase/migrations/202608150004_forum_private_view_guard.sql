-- Uma visualização privada só pode ser registrada por quem pode abrir o tópico.
begin;

create or replace function public.tl_forum_register_view(p_topic_id text)
returns integer language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_inserted integer;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if not exists(
    select 1 from public.forum_topics
    where id=p_topic_id and status='approved'
      and (not is_private or author_id=v_uid or public.tl_is_forum_moderator(v_uid))
  ) then raise exception 'Tópico indisponível'; end if;
  insert into public.forum_topic_views(topic_id,user_id) values(p_topic_id,v_uid) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=1 then update public.forum_topics set view_count=view_count+1 where id=p_topic_id; end if;
  return (select view_count from public.forum_topics where id=p_topic_id);
end;
$$;

revoke all on function public.tl_forum_register_view(text) from public;
grant execute on function public.tl_forum_register_view(text) to authenticated;

commit;
