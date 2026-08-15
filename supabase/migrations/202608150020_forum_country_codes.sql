-- País do perfil passa a usar ISO-3166-1 alpha-2 canônico.
begin;

create table if not exists public.forum_country_catalog(
  code text primary key check(code ~ '^[A-Z]{2}$')
);

insert into public.forum_country_catalog(code)
select unnest(array['AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW']::text[])
on conflict do nothing;

alter table public.forum_country_catalog enable row level security;
drop policy if exists forum_country_catalog_read on public.forum_country_catalog;
create policy forum_country_catalog_read on public.forum_country_catalog for select to authenticated using(true);
revoke all on public.forum_country_catalog from anon,authenticated;
grant select on public.forum_country_catalog to authenticated;

update public.forum_profiles set country=case
  when lower(trim(country)) in ('br','brasil','brazil') then 'BR'
  when lower(trim(country)) in ('pt','portugal') then 'PT'
  when lower(trim(country)) in ('pl','polônia','polonia','poland') then 'PL'
  when lower(trim(country)) in ('es','espanha','spain') then 'ES'
  when lower(trim(country)) in ('nl','países baixos','paises baixos','holanda','netherlands') then 'NL'
  when lower(trim(country)) in ('us','usa','eua','estados unidos','united states') then 'US'
  when char_length(trim(country))=2 and exists(
    select 1 from public.forum_country_catalog c where c.code=upper(trim(forum_profiles.country))
  ) then upper(trim(country))
  else country
end
where country is not null and trim(country)<>'';

create or replace function public.tl_forum_save_profile_v2(
  p_nickname text,
  p_avatar_path text default null,
  p_avatar_external_url text default null,
  p_country text default '',
  p_games text[] default '{}',
  p_platforms text[] default '{}',
  p_game_modes text[] default '{}',
  p_bio text default '',
  p_discord text default ''
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
  v_row public.forum_profiles;
  v_platform_allowlist constant text[]:=array['pc','playstation-5','playstation-4','xbox-series','xbox-one','nintendo-switch','nintendo-switch-2','android','ios','cloud-gaming'];
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if char_length(v_nick) not between 3 and 32 or v_nick !~ '^[[:alnum:]_. -]+$' then raise exception 'Nick inválido'; end if;
  if lower(v_nick) in ('team lambreta','admin','administrator','support','suporte','moderador','moderator') then raise exception 'Este nick é reservado'; end if;
  if v_country<>'' and not exists(select 1 from public.forum_country_catalog where code=v_country) then raise exception 'País inválido'; end if;
  if cardinality(v_games)>3 or cardinality(v_games)<>cardinality(array(select distinct unnest(v_games))) then raise exception 'Selecione até 3 jogos sem duplicidades'; end if;
  if exists(select 1 from unnest(v_games) g where not exists(select 1 from public.forum_game_catalog c where c.slug=g and c.is_active)) then raise exception 'Jogo inválido'; end if;
  if cardinality(v_platforms)>10 or exists(select 1 from unnest(v_platforms) p where not(p=any(v_platform_allowlist))) then raise exception 'Plataforma inválida'; end if;
  if cardinality(v_modes)>20 or exists(select 1 from unnest(v_modes) m where split_part(m,'::',1)<>all(v_games)) then raise exception 'Modo de jogo inválido'; end if;
  if exists(select 1 from unnest(v_modes) m where split_part(m,'::',2)<>'Outro' and not exists(select 1 from public.forum_game_catalog c where c.slug=split_part(m,'::',1) and split_part(m,'::',2)=any(c.modes))) then raise exception 'Modo de jogo inválido'; end if;
  if p_avatar_path is not null and p_avatar_path<>'' and split_part(p_avatar_path,'/',1)<>v_uid::text then raise exception 'Caminho de avatar inválido'; end if;
  if v_url is not null and (char_length(v_url)>1000 or v_url!~* '^https?://[^[:space:]]+$') then raise exception 'URL de avatar inválida'; end if;
  insert into public.forum_profiles(user_id,forum_nickname,avatar_path,avatar_external_url,country,games,platforms,game_modes,bio,discord)
  values(v_uid,v_nick,nullif(p_avatar_path,''),v_url,v_country,v_games,v_platforms,v_modes,trim(coalesce(p_bio,'')),trim(coalesce(p_discord,'')))
  on conflict(user_id) do update set forum_nickname=excluded.forum_nickname,avatar_path=excluded.avatar_path,
    avatar_external_url=excluded.avatar_external_url,country=excluded.country,games=excluded.games,platforms=excluded.platforms,
    game_modes=excluded.game_modes,bio=excluded.bio,discord=excluded.discord,updated_at=now()
  returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'Este nick já está em uso';
end;
$$;

revoke all on function public.tl_forum_save_profile_v2(text,text,text,text,text[],text[],text[],text,text) from public,anon;
grant execute on function public.tl_forum_save_profile_v2(text,text,text,text,text[],text[],text[],text,text) to authenticated;

commit;
