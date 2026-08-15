-- Preserva likes reais já registados nos tópicos, associando-os ao post original.
begin;

insert into public.forum_post_reactions(post_id,user_id,reaction,created_at,updated_at)
select p.id,l.user_id,'like',l.created_at,l.created_at
from public.forum_activity_likes l
join public.forum_posts p
  on p.topic_id=l.topic_key and p.is_original=true and p.deleted_at is null
on conflict(post_id,user_id) do nothing;

commit;
