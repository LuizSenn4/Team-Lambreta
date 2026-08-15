-- Alinha a leitura das menções à visibilidade real do tópico.
begin;

drop policy if exists forum_post_mentions_members_read on public.forum_post_mentions;
create policy forum_post_mentions_members_read on public.forum_post_mentions
for select to authenticated using (
  exists (
    select 1
    from public.forum_posts p
    join public.forum_topics t on t.id=p.topic_id
    where p.id=forum_post_mentions.post_id
      and (
        t.status='approved'
        or t.author_id=auth.uid()
        or public.tl_is_forum_moderator(auth.uid())
      )
      and (
        not t.is_private
        or t.author_id=auth.uid()
        or public.tl_is_forum_moderator(auth.uid())
      )
  )
);

commit;
