-- Parte 2 do Fórum: perfil social, avatar privado, citações e edição segura.
begin;

create extension if not exists citext with schema extensions;

create table if not exists public.forum_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  forum_nickname extensions.citext not null unique,
  avatar_path text,
  country text not null default '',
  main_game text not null default '',
  platform text not null default '',
  preferred_mode text not null default '',
  bio text not null default '',
  discord text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(forum_nickname::text) between 3 and 32),
  check (forum_nickname::text ~ '^[[:alnum:]_. -]+$'),
  check (char_length(country) <= 56),
  check (char_length(main_game) <= 56),
  check (char_length(platform) <= 56),
  check (char_length(preferred_mode) <= 56),
  check (char_length(bio) <= 500),
  check (char_length(discord) <= 64)
);

alter table public.forum_profiles enable row level security;
drop policy if exists forum_profiles_members_read on public.forum_profiles;
create policy forum_profiles_members_read on public.forum_profiles for select to authenticated using (true);
drop policy if exists forum_profiles_own_insert on public.forum_profiles;
create policy forum_profiles_own_insert on public.forum_profiles for insert to authenticated with check (user_id=auth.uid());
drop policy if exists forum_profiles_own_update on public.forum_profiles;
create policy forum_profiles_own_update on public.forum_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
revoke all on public.forum_profiles from anon;
grant select,insert,update on public.forum_profiles to authenticated;

-- Migra identidades já existentes sem expor e-mail e sem substituir conflitos.
insert into public.forum_profiles(user_id,forum_nickname,avatar_path)
select p.id,trim(p.game_nickname),null
from public.profiles p
where char_length(trim(coalesce(p.game_nickname,''))) between 3 and 32
  and trim(p.game_nickname) ~ '^[[:alnum:]_. -]+$'
  and lower(trim(p.game_nickname)) not in ('team lambreta','admin','administrator','support','suporte','moderador','moderator')
on conflict do nothing;

alter table public.forum_posts add column if not exists quote_post_id text references public.forum_posts(id) on delete set null;
alter table public.forum_posts add column if not exists edited_at timestamptz;
alter table public.forum_posts add column if not exists edited_by uuid references public.profiles(id) on delete set null;
alter table public.forum_posts add column if not exists render_format text not null default 'tlmark' check (render_format in ('plain','tlmark'));
alter table public.forum_topics add column if not exists render_format text not null default 'tlmark' check (render_format in ('plain','tlmark'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('forum-avatars','forum-avatars',false,2097152,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists forum_avatar_members_read on storage.objects;
create policy forum_avatar_members_read on storage.objects for select to authenticated
using (bucket_id='forum-avatars');
drop policy if exists forum_avatar_own_insert on storage.objects;
create policy forum_avatar_own_insert on storage.objects for insert to authenticated
with check (bucket_id='forum-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists forum_avatar_own_update on storage.objects;
create policy forum_avatar_own_update on storage.objects for update to authenticated
using (bucket_id='forum-avatars' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='forum-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists forum_avatar_own_delete on storage.objects;
create policy forum_avatar_own_delete on storage.objects for delete to authenticated
using (bucket_id='forum-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.tl_forum_save_profile(
  p_nickname text,
  p_avatar_path text default null,
  p_country text default '',
  p_main_game text default '',
  p_platform text default '',
  p_preferred_mode text default '',
  p_bio text default '',
  p_discord text default ''
) returns public.forum_profiles
language plpgsql security definer set search_path=public,extensions
as $$
declare v_uid uuid:=auth.uid(); v_nick text:=trim(coalesce(p_nickname,'')); v_row public.forum_profiles;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if char_length(v_nick) not between 3 and 32 or v_nick !~ '^[[:alnum:]_. -]+$' then
    raise exception 'Use um nick de 3 a 32 caracteres com letras, números, espaço, ponto, hífen ou underscore';
  end if;
  if lower(v_nick) in ('team lambreta','admin','administrator','support','suporte','moderador','moderator') then
    raise exception 'Este nick é reservado';
  end if;
  if p_avatar_path is not null and p_avatar_path<>'' and split_part(p_avatar_path,'/',1)<>v_uid::text then
    raise exception 'Caminho de avatar inválido';
  end if;
  insert into public.forum_profiles(user_id,forum_nickname,avatar_path,country,main_game,platform,preferred_mode,bio,discord)
  values(v_uid,v_nick,nullif(p_avatar_path,''),trim(coalesce(p_country,'')),trim(coalesce(p_main_game,'')),
    trim(coalesce(p_platform,'')),trim(coalesce(p_preferred_mode,'')),trim(coalesce(p_bio,'')),trim(coalesce(p_discord,'')))
  on conflict(user_id) do update set
    forum_nickname=excluded.forum_nickname,avatar_path=excluded.avatar_path,country=excluded.country,
    main_game=excluded.main_game,platform=excluded.platform,preferred_mode=excluded.preferred_mode,
    bio=excluded.bio,discord=excluded.discord,updated_at=now()
  returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'Este nick já está em uso';
end;
$$;

create or replace function public.tl_forum_create_topic_v3(p_section_id bigint,p_title text,p_body text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid();v_id text;v_post_id text;v_private boolean;v_status text;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if not exists(select 1 from public.forum_profiles where user_id=v_uid) then raise exception 'Complete seu perfil do Fórum'; end if;
  if char_length(trim(p_title)) not between 1 and 120 or char_length(trim(p_body)) not between 1 and 5000 then raise exception 'Conteúdo do tópico inválido'; end if;
  select is_private into v_private from public.forum_sections where id=p_section_id and is_active;
  if not found then raise exception 'Pasta inválida'; end if;
  if (select count(*) from public.forum_topics where author_id=v_uid and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de tópicos por hora atingido'; end if;
  v_id:='topic_'||replace(gen_random_uuid()::text,'-','');v_post_id:='post_'||replace(gen_random_uuid()::text,'-','');
  v_status:=case when public.tl_is_forum_moderator(v_uid) then 'approved' else 'pending' end;
  insert into public.forum_topics(id,section_id,author_id,title,body,status,is_private,approved_by,approved_at,render_format)
  values(v_id,p_section_id,v_uid,trim(p_title),trim(p_body),v_status,v_private,case when v_status='approved' then v_uid end,case when v_status='approved' then now() end,'tlmark');
  insert into public.forum_posts(id,topic_id,author_id,body,is_original,is_private,render_format)
  values(v_post_id,v_id,v_uid,trim(p_body),true,v_private,'tlmark');
  if v_status='approved' then perform public.tl_award_forum_xp(v_uid,'forum_topic','topic:'||v_id,20); end if;
  return jsonb_build_object('id',v_id,'post_id',v_post_id,'status',v_status);
end;
$$;

create or replace function public.tl_forum_create_post_v3(p_topic_id text,p_body text,p_quote_post_id text default null)
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
  update public.forum_posts set body=trim(p_body),edited_at=now(),edited_by=v_uid,updated_at=now(),render_format='tlmark'
  where id=p_post_id returning * into v_post;
  if v_post.is_original then update public.forum_topics set body=v_post.body,updated_at=now(),render_format='tlmark' where id=v_post.topic_id; end if;
  return v_post;
end;
$$;

revoke all on function public.tl_forum_save_profile(text,text,text,text,text,text,text,text) from public;
revoke all on function public.tl_forum_create_topic_v3(bigint,text,text) from public;
revoke all on function public.tl_forum_create_post_v3(text,text,text) from public;
revoke all on function public.tl_forum_edit_post(text,text) from public;
grant execute on function public.tl_forum_save_profile(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.tl_forum_create_topic_v3(bigint,text,text) to authenticated;
grant execute on function public.tl_forum_create_post_v3(text,text,text) to authenticated;
grant execute on function public.tl_forum_edit_post(text,text) to authenticated;

commit;
