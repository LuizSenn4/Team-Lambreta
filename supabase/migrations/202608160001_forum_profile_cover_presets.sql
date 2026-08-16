-- Presets de capa do perfil do Fórum; guarda apenas a referência do tema.
begin;

alter table public.forum_profiles
  add column if not exists cover_preset text not null default 'cover_green_black';

alter table public.forum_profiles
  drop constraint if exists forum_profiles_cover_preset_check;
alter table public.forum_profiles
  add constraint forum_profiles_cover_preset_check check (
    cover_preset in (
      'cover_gold',
      'cover_green_black',
      'cover_neon',
      'cover_lambretta_classic',
      'cover_competitive',
      'cover_cyber_gamer',
      'cover_minimal'
    )
  );

create or replace function public.tl_forum_save_profile_v2(
  p_nickname text,
  p_avatar_path text default null,
  p_avatar_external_url text default null,
  p_country text default '',
  p_games text[] default '{}',
  p_platforms text[] default '{}',
  p_game_modes text[] default '{}',
  p_bio text default '',
  p_discord text default '',
  p_cover_preset text default 'cover_green_black'
) returns public.forum_profiles
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_nick text:=trim(coalesce(p_nickname,''));
  v_country text:=upper(trim(coalesce(p_country,'')));
  v_games text[]:=coalesce(p_games,'{}');
  v_platforms text[]:=coalesce(p_platforms,'{}');
  v_modes text[]:=coalesce(p_game_modes,'{}');
  v_url text:=nullif(trim(coalesce(p_avatar_external_url,'')),'');
  v_cover text:=coalesce(nullif(trim(p_cover_preset),''),'cover_green_black');
  v_row public.forum_profiles;
  v_platform_allowlist constant text[]:=array['pc','playstation-5','playstation-4','xbox-series','xbox-one','nintendo-switch','nintendo-switch-2','android','ios','cloud-gaming'];
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if char_length(v_nick) not between 3 and 32 or v_nick !~ '^[[:alnum:]_. -]+$' then raise exception 'Nick inválido'; end if;
  if lower(v_nick) in ('team lambreta','admin','administrator','support','suporte','moderador','moderator') then raise exception 'Este nick é reservado'; end if;
  if v_country<>'' and not exists(select 1 from public.forum_country_catalog where code=v_country) then raise exception 'País inválido'; end if;
  if v_cover not in ('cover_gold','cover_green_black','cover_neon','cover_lambretta_classic','cover_competitive','cover_cyber_gamer','cover_minimal') then raise exception 'Capa inválida'; end if;
  if cardinality(v_games)>3 or cardinality(v_games)<>cardinality(array(select distinct unnest(v_games))) then raise exception 'Selecione até 3 jogos sem duplicidades'; end if;
  if exists(select 1 from unnest(v_games) g where not exists(select 1 from public.forum_game_catalog c where c.slug=g and c.is_active)) then raise exception 'Jogo inválido'; end if;
  if cardinality(v_platforms)>10 or exists(select 1 from unnest(v_platforms) p where not(p=any(v_platform_allowlist))) then raise exception 'Plataforma inválida'; end if;
  if cardinality(v_modes)>20 or exists(select 1 from unnest(v_modes) m where split_part(m,'::',1)<>all(v_games)) then raise exception 'Modo de jogo inválido'; end if;
  if exists(select 1 from unnest(v_modes) m where split_part(m,'::',2)<>'Outro' and not exists(select 1 from public.forum_game_catalog c where c.slug=split_part(m,'::',1) and split_part(m,'::',2)=any(c.modes))) then raise exception 'Modo de jogo inválido'; end if;
  if p_avatar_path is not null and p_avatar_path<>'' and split_part(p_avatar_path,'/',1)<>v_uid::text then raise exception 'Caminho de avatar inválido'; end if;
  if v_url is not null and (char_length(v_url)>1000 or v_url!~* '^https?://[^[:space:]]+$') then raise exception 'URL de avatar inválida'; end if;
  insert into public.forum_profiles(user_id,forum_nickname,avatar_path,avatar_external_url,country,games,platforms,game_modes,bio,discord,cover_preset)
  values(v_uid,v_nick,nullif(p_avatar_path,''),v_url,v_country,v_games,v_platforms,v_modes,trim(coalesce(p_bio,'')),trim(coalesce(p_discord,'')),v_cover)
  on conflict(user_id) do update set forum_nickname=excluded.forum_nickname,avatar_path=excluded.avatar_path,
    avatar_external_url=excluded.avatar_external_url,country=excluded.country,games=excluded.games,platforms=excluded.platforms,
    game_modes=excluded.game_modes,bio=excluded.bio,discord=excluded.discord,cover_preset=excluded.cover_preset,updated_at=now()
  returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'Este nick já está em uso';
end;
$$;

revoke all on function public.tl_forum_save_profile_v2(text,text,text,text,text[],text[],text[],text,text,text) from public,anon;
grant execute on function public.tl_forum_save_profile_v2(text,text,text,text,text[],text[],text[],text,text,text) to authenticated;

commit;
