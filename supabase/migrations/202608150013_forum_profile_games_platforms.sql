-- Perfil expandido: catálogo canônico, até 3 jogos, plataformas, modos e avatar externo.
begin;

create table if not exists public.forum_game_catalog (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  short_name text not null,
  aliases text[] not null default '{}',
  modes text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.forum_game_catalog(slug,name,short_name,aliases,modes,sort_order) values
('league-of-legends','League of Legends','LoL',array['league','lol'],array['Summoner''s Rift','ARAM','Ranked Solo/Duo','Flex'],10),
('grand-theft-auto-v','Grand Theft Auto V','GTA V',array['gta','gta 5','gtav'],array['Online','Story Mode'],20),
('valorant','VALORANT','VALORANT',array['val'],array['Competitive','Unrated','Swiftplay'],30),
('counter-strike-2','Counter-Strike 2','CS2',array['counter strike','cs2'],array['Competitive','Premier','Wingman'],40),
('dota-2','Dota 2','Dota 2',array['dota'],array['All Pick','Ranked','Turbo'],50),
('minecraft','Minecraft','Minecraft',array['mc'],array['Survival','Creative','Hardcore'],60),
('overwatch','Overwatch','Overwatch',array['ow','ow2'],array['Quick Play','Competitive','Arcade'],70),
('fortnite','Fortnite','Fortnite',array['fn'],array['Battle Royale','Zero Build','Reload','Ranked'],80),
('dead-by-daylight','Dead by Daylight','DBD',array['dbd'],array['Survivor','Killer'],90),
('marvel-rivals','Marvel Rivals','Marvel Rivals',array['rivals'],array['Quick Match','Competitive'],100),
('apex-legends','Apex Legends','Apex',array['apex'],array['Battle Royale','Ranked','Mixtape'],110),
('world-of-warcraft','World of Warcraft','WoW',array['wow'],array['Retail','Classic','Mythic+','PvP'],120),
('call-of-duty','Call of Duty','CoD',array['cod'],array['Multiplayer','Ranked'],130),
('call-of-duty-warzone','Call of Duty: Warzone','Warzone',array['cod warzone','wz'],array['Battle Royale','Resurgence','Ranked'],140),
('path-of-exile-2','Path of Exile 2','PoE 2',array['poe2'],array['Standard','Hardcore'],150),
('hearthstone','Hearthstone','Hearthstone',array['hs'],array['Standard','Wild','Battlegrounds'],160),
('escape-from-tarkov','Escape from Tarkov','Tarkov',array['eft','tarkov'],array['PvP','PvE'],170),
('palworld','Palworld','Palworld',array['pal world'],array['Solo','Co-op'],180),
('rust','Rust','Rust',array[]::text[],array['PvP','PvE'],190),
('rocket-league','Rocket League','RL',array['rl'],array['Casual','Competitive','Tournaments'],200),
('rainbow-six-siege','Rainbow Six Siege','R6',array['r6','siege'],array['Standard','Ranked','Quick Match'],210),
('pubg-battlegrounds','PUBG: Battlegrounds','PUBG',array['pubg'],array['Battle Royale','Ranked'],220),
('ea-sports-fc','EA Sports FC','EA FC',array['fifa','fc'],array['Ultimate Team','Clubs','Career'],230),
('the-finals','The Finals','The Finals',array['finals'],array['Quick Cash','Cashout','Ranked'],240),
('destiny-2','Destiny 2','Destiny 2',array['d2'],array['PvE','Crucible','Gambit'],250),
('warframe','Warframe','Warframe',array[]::text[],array['PvE','Conclave'],260),
('diablo-iv','Diablo IV','Diablo IV',array['diablo 4','d4'],array['Seasonal','Eternal','Hardcore'],270),
('diablo-ii-resurrected','Diablo II: Resurrected','D2R',array['diablo 2','d2r'],array['Online','Offline','Hardcore'],280),
('final-fantasy-xiv','Final Fantasy XIV','FFXIV',array['ff14','ffxiv'],array['PvE','PvP','Raids'],290),
('lost-ark','Lost Ark','Lost Ark',array[]::text[],array['PvE','PvP','Raids'],300),
('new-world','New World','New World',array[]::text[],array['PvE','PvP'],310),
('black-desert-online','Black Desert Online','BDO',array['bdo'],array['PvE','PvP'],320),
('guild-wars-2','Guild Wars 2','GW2',array['gw2'],array['PvE','PvP','WvW'],330),
('elden-ring','Elden Ring','Elden Ring',array[]::text[],array['Solo','Co-op','PvP'],340),
('dark-souls-iii','Dark Souls III','Dark Souls III',array['dark souls 3','ds3'],array['Solo','Co-op','PvP'],350),
('monster-hunter-wilds','Monster Hunter Wilds','MH Wilds',array['mhwilds'],array['Solo','Co-op'],360),
('monster-hunter-world','Monster Hunter World','MH World',array['mhw'],array['Solo','Co-op'],370),
('cyberpunk-2077','Cyberpunk 2077','Cyberpunk 2077',array['cyberpunk'],array[]::text[],380),
('red-dead-redemption-2','Red Dead Redemption 2','RDR2',array['rdr2'],array['Story','Online'],390),
('genshin-impact','Genshin Impact','Genshin',array['genshin'],array['Solo','Co-op'],400),
('honkai-star-rail','Honkai: Star Rail','HSR',array['hsr'],array[]::text[],410),
('zenless-zone-zero','Zenless Zone Zero','ZZZ',array['zzz'],array[]::text[],420),
('roblox','Roblox','Roblox',array[]::text[],array[]::text[],430),
('brawl-stars','Brawl Stars','Brawl Stars',array[]::text[],array['Ranked','Trophy Events'],440),
('clash-royale','Clash Royale','Clash Royale',array['cr'],array['Ladder','Ranked','Challenges'],450),
('clash-of-clans','Clash of Clans','Clash of Clans',array['coc'],array['Home Village','Builder Base','Clan Wars'],460),
('mobile-legends','Mobile Legends','MLBB',array['mlbb'],array['Classic','Ranked','Brawl'],470),
('free-fire','Free Fire','Free Fire',array['ff'],array['Battle Royale','Clash Squad','Ranked'],480),
('pokemon','Pokémon','Pokémon',array['pokemon'],array[]::text[],490),
('street-fighter-6','Street Fighter 6','SF6',array['sf6'],array['Ranked','Casual','Battle Hub'],500),
('tekken-8','Tekken 8','Tekken 8',array['t8'],array['Ranked','Quick Match'],510),
('mortal-kombat-1','Mortal Kombat 1','MK1',array['mk1'],array['Ranked','Kasual'],520),
('super-smash-bros-ultimate','Super Smash Bros. Ultimate','Smash Ultimate',array['smash','ssbu'],array['Singles','Doubles','Arena'],530),
('teamfight-tactics','Teamfight Tactics','TFT',array['tft'],array['Normal','Ranked','Double Up'],540),
('legends-of-runeterra','Legends of Runeterra','LoR',array['lor'],array['Standard','Eternal','Path of Champions'],550),
('starcraft-ii','StarCraft II','SC2',array['sc2'],array['Ladder','Co-op','Arcade'],560),
('age-of-empires-iv','Age of Empires IV','AoE IV',array['aoe4','aoe iv'],array['Ranked','Quick Match'],570),
('civilization-vii','Civilization VII','Civ VII',array['civ 7','civ vii'],array['Single Player','Multiplayer'],580),
('football-manager','Football Manager','Football Manager',array['fm'],array['Career','Online Career'],590),
('nba-2k','NBA 2K','NBA 2K',array['2k'],array['MyCAREER','MyTEAM','Play Now'],600),
('madden-nfl','Madden NFL','Madden',array['madden'],array['Ultimate Team','Franchise','Online H2H'],610),
('f1','F1','F1',array['formula 1'],array['Career','Grand Prix','Ranked'],620),
('forza-horizon','Forza Horizon','Forza Horizon',array['forza'],array['Solo','Online','Rivals'],630),
('gran-turismo','Gran Turismo','Gran Turismo',array['gt'],array['Sport','World Circuits','Online'],640),
('assetto-corsa','Assetto Corsa','Assetto Corsa',array['ac'],array['Single Player','Multiplayer'],650),
('iracing','iRacing','iRacing',array['iracing'],array['Official Racing','Hosted Racing'],660),
('dayz','DayZ','DayZ',array[]::text[],array['Official','Community'],670),
('ark-survival-ascended','ARK: Survival Ascended','ARK',array['ark','asa'],array['PvE','PvP'],680),
('project-zomboid','Project Zomboid','Project Zomboid',array['pz'],array['Solo','Multiplayer'],690),
('terraria','Terraria','Terraria',array[]::text[],array['Classic','Expert','Master'],700),
('stardew-valley','Stardew Valley','Stardew Valley',array['stardew'],array['Solo','Co-op'],710),
('the-sims-4','The Sims 4','The Sims 4',array['sims 4'],array[]::text[],720),
('no-mans-sky','No Man''s Sky','No Man''s Sky',array['nms'],array['Solo','Multiplayer'],730),
('sea-of-thieves','Sea of Thieves','Sea of Thieves',array['sot'],array['High Seas','Safer Seas'],740),
('helldivers-2','Helldivers 2','Helldivers 2',array['hd2'],array['Co-op'],750),
('war-thunder','War Thunder','War Thunder',array[]::text[],array['Arcade','Realistic','Simulator'],760),
('world-of-tanks','World of Tanks','WoT',array['wot'],array['Random Battles','Ranked'],770),
('world-of-warships','World of Warships','WoWS',array['wows'],array['Co-op','Random','Ranked'],780),
('fall-guys','Fall Guys','Fall Guys',array[]::text[],array['Solos','Duos','Squads'],790),
('among-us','Among Us','Among Us',array[]::text[],array['Classic','Hide n Seek'],800),
('phasmophobia','Phasmophobia','Phasmophobia',array['phasm'],array['Solo','Co-op'],810),
('lethal-company','Lethal Company','Lethal Company',array['lethal'],array['Co-op'],820),
('content-warning','Content Warning','Content Warning',array[]::text[],array['Co-op'],830),
('fivem','FiveM','FiveM',array['gta rp','fivem'],array['Roleplay','Freeroam'],840),
('garrys-mod','Garry''s Mod','Garry''s Mod',array['gmod'],array['Sandbox','Trouble in Terrorist Town','DarkRP'],850),
('osu','osu!','osu!',array['osu'],array['osu!standard','Taiko','Catch','Mania'],860),
('geometry-dash','Geometry Dash','Geometry Dash',array['gd'],array[]::text[],870),
('old-school-runescape','Old School RuneScape','OSRS',array['osrs'],array['Main','Ironman','PvP'],880),
('runescape','RuneScape','RuneScape',array['rs3'],array['Main','Ironman'],890),
('maplestory','MapleStory','MapleStory',array['maple'],array['Interactive','Heroic'],900),
('albion-online','Albion Online','Albion',array['albion'],array['PvE','PvP'],910),
('eve-online','EVE Online','EVE',array['eve'],array['PvE','PvP','Industry'],920),
('smite','Smite','Smite',array[]::text[],array['Conquest','Arena','Joust'],930),
('smite-2','Smite 2','Smite 2',array[]::text[],array['Conquest','Arena'],940),
('heroes-of-the-storm','Heroes of the Storm','HotS',array['hots'],array['Quick Match','Ranked','ARAM'],950),
('pokemon-unite','Pokémon Unite','Pokémon Unite',array['unite'],array['Standard','Ranked','Quick'],960),
('arena-breakout','Arena Breakout','Arena Breakout',array['ab'],array['Tactical Ops','Covert Ops'],970),
('delta-force','Delta Force','Delta Force',array['df'],array['Warfare','Operations'],980),
('escape-from-tarkov-arena','Escape from Tarkov: Arena','Tarkov Arena',array['eft arena'],array['TeamFight','BlastGang'],990),
('trackmania','Trackmania','Trackmania',array['tm'],array['Campaign','Ranked','Cup of the Day'],1000),
('deadlock','Deadlock','Deadlock',array[]::text[],array['Standard'],1010),
('path-of-exile','Path of Exile','PoE',array['poe'],array['Standard','League','Hardcore'],1020),
('balatro','Balatro','Balatro',array[]::text[],array[]::text[],1030),
('warcraft-iii','Warcraft III','Warcraft III',array['wc3'],array['Versus','Custom Games'],1040),
('battlefield','Battlefield','Battlefield',array['bf'],array['Conquest','Breakthrough'],1050),
('halo-infinite','Halo Infinite','Halo Infinite',array['halo'],array['Arena','Big Team Battle','Ranked'],1060)
on conflict(slug) do update set name=excluded.name,short_name=excluded.short_name,aliases=excluded.aliases,modes=excluded.modes,sort_order=excluded.sort_order,is_active=true;

alter table public.forum_game_catalog enable row level security;
drop policy if exists forum_game_catalog_members_read on public.forum_game_catalog;
create policy forum_game_catalog_members_read on public.forum_game_catalog for select to authenticated using(is_active);
revoke all on public.forum_game_catalog from public,anon;
grant select on public.forum_game_catalog to authenticated;

alter table public.forum_profiles
  add column if not exists avatar_external_url text,
  add column if not exists games text[] not null default '{}',
  add column if not exists platforms text[] not null default '{}',
  add column if not exists game_modes text[] not null default '{}';

alter table public.forum_profiles
  add constraint forum_profiles_games_limit check(cardinality(games)<=3),
  add constraint forum_profiles_platforms_limit check(cardinality(platforms)<=10),
  add constraint forum_profiles_modes_limit check(cardinality(game_modes)<=20),
  add constraint forum_profiles_avatar_external_url_check check(
    avatar_external_url is null or (
      char_length(avatar_external_url)<=1000 and
      avatar_external_url ~* '^https?://[^[:space:]]+$'
    )
  );

update public.forum_profiles fp set games=array[c.slug]
from public.forum_game_catalog c
where cardinality(fp.games)=0 and fp.main_game<>''
  and (lower(c.name)=lower(fp.main_game) or lower(c.short_name)=lower(fp.main_game));

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
  if cardinality(v_games)>3 or cardinality(v_games)<>cardinality(array(select distinct unnest(v_games))) then raise exception 'Selecione até 3 jogos sem duplicidades'; end if;
  if exists(select 1 from unnest(v_games) g where not exists(select 1 from public.forum_game_catalog c where c.slug=g and c.is_active)) then raise exception 'Jogo inválido'; end if;
  if cardinality(v_platforms)>10 or exists(select 1 from unnest(v_platforms) p where not(p=any(v_platform_allowlist))) then raise exception 'Plataforma inválida'; end if;
  if cardinality(v_modes)>20 or exists(select 1 from unnest(v_modes) m where split_part(m,'::',1)<>all(v_games)) then raise exception 'Modo de jogo inválido'; end if;
  if exists(select 1 from unnest(v_modes) m where split_part(m,'::',2)<>'Outro' and not exists(select 1 from public.forum_game_catalog c where c.slug=split_part(m,'::',1) and split_part(m,'::',2)=any(c.modes))) then raise exception 'Modo de jogo inválido'; end if;
  if p_avatar_path is not null and p_avatar_path<>'' and split_part(p_avatar_path,'/',1)<>v_uid::text then raise exception 'Caminho de avatar inválido'; end if;
  if v_url is not null and (char_length(v_url)>1000 or v_url!~* '^https?://[^[:space:]]+$') then raise exception 'URL de avatar inválida'; end if;
  insert into public.forum_profiles(user_id,forum_nickname,avatar_path,avatar_external_url,country,games,platforms,game_modes,bio,discord)
  values(v_uid,v_nick,nullif(p_avatar_path,''),v_url,trim(coalesce(p_country,'')),v_games,v_platforms,v_modes,trim(coalesce(p_bio,'')),trim(coalesce(p_discord,'')))
  on conflict(user_id) do update set forum_nickname=excluded.forum_nickname,avatar_path=excluded.avatar_path,
    avatar_external_url=excluded.avatar_external_url,country=excluded.country,games=excluded.games,platforms=excluded.platforms,
    game_modes=excluded.game_modes,bio=excluded.bio,discord=excluded.discord,updated_at=now()
  returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'Este nick já está em uso';
end;
$$;

revoke insert,update,delete on public.forum_profiles from authenticated;
revoke all on function public.tl_forum_save_profile_v2(text,text,text,text,text[],text[],text[],text,text) from public,anon;
grant execute on function public.tl_forum_save_profile_v2(text,text,text,text,text[],text[],text[],text,text) to authenticated;

commit;
