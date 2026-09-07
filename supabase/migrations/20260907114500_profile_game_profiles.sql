create table if not exists public.profile_game_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null references public.forum_game_catalog(slug) on update cascade on delete restrict,
  nickname text not null default '',
  character_path text,
  character_external_url text,
  position_x smallint not null default 50 check (position_x between 0 and 100),
  position_y smallint not null default 58 check (position_y between 0 and 100),
  scale smallint not null default 100 check (scale between 55 and 180),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_slug),
  constraint profile_game_profiles_nickname check (char_length(nickname) <= 32),
  constraint profile_game_profiles_external_url check (
    character_external_url is null or (
      char_length(character_external_url) <= 1000 and
      character_external_url ~* '^https?://[^[:space:]]+$'
    )
  )
);

alter table public.profile_game_profiles enable row level security;

drop policy if exists profile_game_profiles_read on public.profile_game_profiles;
create policy profile_game_profiles_read
on public.profile_game_profiles for select
to authenticated
using (true);

drop policy if exists profile_game_profiles_write_own on public.profile_game_profiles;
create policy profile_game_profiles_write_own
on public.profile_game_profiles for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profile_game_profiles to authenticated;

create or replace function public.tl_save_profile_game(
  p_game_slug text,
  p_nickname text default '',
  p_character_path text default null,
  p_character_external_url text default null,
  p_position_x integer default 50,
  p_position_y integer default 58,
  p_scale integer default 100
)
returns public.profile_game_profiles
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_uid uuid := auth.uid();
  v_slug text := trim(coalesce(p_game_slug, ''));
  v_nick text := trim(coalesce(p_nickname, ''));
  v_path text := nullif(trim(coalesce(p_character_path, '')), '');
  v_url text := nullif(trim(coalesce(p_character_external_url, '')), '');
  v_row public.profile_game_profiles;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  if v_slug = '' then raise exception 'Jogo inválido'; end if;
  if not exists (
    select 1 from public.forum_profiles fp
    where fp.user_id = v_uid and v_slug = any(coalesce(fp.games, '{}'))
  ) then raise exception 'O jogo não pertence ao perfil'; end if;
  if char_length(v_nick) > 32 then raise exception 'Nickname muito longo'; end if;
  if v_path is not null and split_part(v_path, '/', 1) <> v_uid::text then
    raise exception 'Caminho de imagem inválido';
  end if;
  if v_url is not null and (char_length(v_url) > 1000 or v_url !~* '^https?://[^[:space:]]+$') then
    raise exception 'URL de imagem inválida';
  end if;

  insert into public.profile_game_profiles(
    user_id, game_slug, nickname, character_path, character_external_url,
    position_x, position_y, scale, updated_at
  ) values (
    v_uid, v_slug, v_nick, v_path, v_url,
    greatest(0, least(100, p_position_x)),
    greatest(0, least(100, p_position_y)),
    greatest(55, least(180, p_scale)), now()
  )
  on conflict (user_id, game_slug) do update set
    nickname = excluded.nickname,
    character_path = excluded.character_path,
    character_external_url = excluded.character_external_url,
    position_x = excluded.position_x,
    position_y = excluded.position_y,
    scale = excluded.scale,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$function$;

grant execute on function public.tl_save_profile_game(text,text,text,text,integer,integer,integer) to authenticated;
