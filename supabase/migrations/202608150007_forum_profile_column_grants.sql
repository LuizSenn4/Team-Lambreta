-- O utilizador edita apenas campos sociais; identidade e datas ficam protegidas.
begin;

revoke insert,update on public.forum_profiles from authenticated;
grant insert(user_id,forum_nickname,avatar_path,country,main_game,platform,preferred_mode,bio,discord)
  on public.forum_profiles to authenticated;
grant update(forum_nickname,avatar_path,country,main_game,platform,preferred_mode,bio,discord)
  on public.forum_profiles to authenticated;

commit;
