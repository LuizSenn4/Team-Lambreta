create or replace function public.tl_forum_profile_catalog_guard()
returns trigger language plpgsql set search_path to 'public' as $function$
declare
  v_platform_allowlist constant text[]:=array['pc','playstation-5','playstation-4','xbox-series','xbox-one','nintendo-switch','nintendo-switch-2','android','ios','cloud-gaming'];
begin
  if cardinality(new.games)>4 or cardinality(new.games)<>cardinality(array(select distinct unnest(new.games))) then raise exception 'Selecione até 4 jogos sem duplicidades'; end if;
  if exists(select 1 from unnest(new.games) g where not exists(select 1 from public.forum_game_catalog c where c.slug=g and c.is_active)) then raise exception 'Jogo inválido'; end if;
  if cardinality(new.platforms)>10 or cardinality(new.platforms)<>cardinality(array(select distinct unnest(new.platforms))) or exists(select 1 from unnest(new.platforms) p where not(p=any(v_platform_allowlist))) then raise exception 'Plataforma inválida'; end if;
  if cardinality(new.game_modes)>30 or cardinality(new.game_modes)<>cardinality(array(select distinct unnest(new.game_modes))) or exists(select 1 from unnest(new.game_modes) m where split_part(m,'::',1)<>all(new.games)) then raise exception 'Modo de jogo inválido'; end if;
  if exists(select 1 from unnest(new.game_modes) m where split_part(m,'::',2)<>'Outro' and not exists(select 1 from public.forum_game_catalog c where c.slug=split_part(m,'::',1) and split_part(m,'::',2)=any(c.modes))) then raise exception 'Modo de jogo inválido'; end if;
  return new;
end;
$function$;

alter table public.forum_profiles add column if not exists cover_position_y smallint not null default 50;
alter table public.forum_profiles add column if not exists cover_zoom smallint not null default 118;
alter table public.forum_profiles drop constraint if exists forum_profiles_cover_position_y_check;
alter table public.forum_profiles add constraint forum_profiles_cover_position_y_check check (cover_position_y between 0 and 100);
alter table public.forum_profiles drop constraint if exists forum_profiles_cover_zoom_check;
alter table public.forum_profiles add constraint forum_profiles_cover_zoom_check check (cover_zoom between 100 and 180);

create or replace function public.tl_set_profile_cover_transform(p_x integer,p_y integer,p_zoom integer)
returns public.forum_profiles language plpgsql security definer set search_path=public,extensions as $$
declare v_uid uuid:=auth.uid(); v_row public.forum_profiles;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  update public.forum_profiles set cover_position_x=greatest(0,least(100,coalesce(p_x,50)))::smallint,cover_position_y=greatest(0,least(100,coalesce(p_y,50)))::smallint,cover_zoom=greatest(100,least(180,coalesce(p_zoom,118)))::smallint,updated_at=now() where user_id=v_uid returning * into v_row;
  if v_row is null then raise exception 'Perfil não encontrado'; end if;
  return v_row;
end;
$$;
revoke all on function public.tl_set_profile_cover_transform(integer,integer,integer) from public,anon;
grant execute on function public.tl_set_profile_cover_transform(integer,integer,integer) to authenticated;
