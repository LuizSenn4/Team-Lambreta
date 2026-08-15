-- Restrições também no nível da tabela: não dependem da UI nem da RPC.
begin;

alter table public.forum_profiles
  add constraint forum_profiles_reserved_nickname_check
  check (lower(forum_nickname::text) not in ('team lambreta','admin','administrator','support','suporte','moderador','moderator'));

alter table public.forum_profiles
  add constraint forum_profiles_avatar_owner_check
  check (avatar_path is null or split_part(avatar_path,'/',1)=user_id::text);

commit;
