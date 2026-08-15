-- Defesa no nível da tabela: arrays canônicos mesmo fora da RPC principal.
begin;

create or replace function public.tl_forum_profile_catalog_guard()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_platform_allowlist constant text[]:=array['pc','playstation-5','playstation-4','xbox-series','xbox-one','nintendo-switch','nintendo-switch-2','android','ios','cloud-gaming'];
begin
  if cardinality(new.games)>3 or cardinality(new.games)<>cardinality(array(select distinct unnest(new.games))) then
    raise exception 'Selecione até 3 jogos sem duplicidades';
  end if;
  if exists(select 1 from unnest(new.games) g where not exists(select 1 from public.forum_game_catalog c where c.slug=g and c.is_active)) then
    raise exception 'Jogo inválido';
  end if;
  if cardinality(new.platforms)>10 or cardinality(new.platforms)<>cardinality(array(select distinct unnest(new.platforms)))
    or exists(select 1 from unnest(new.platforms) p where not(p=any(v_platform_allowlist))) then
    raise exception 'Plataforma inválida';
  end if;
  if cardinality(new.game_modes)>20 or cardinality(new.game_modes)<>cardinality(array(select distinct unnest(new.game_modes)))
    or exists(select 1 from unnest(new.game_modes) m where split_part(m,'::',1)<>all(new.games)) then
    raise exception 'Modo de jogo inválido';
  end if;
  if exists(select 1 from unnest(new.game_modes) m where split_part(m,'::',2)<>'Outro'
    and not exists(select 1 from public.forum_game_catalog c where c.slug=split_part(m,'::',1) and split_part(m,'::',2)=any(c.modes))) then
    raise exception 'Modo de jogo inválido';
  end if;
  return new;
end;
$$;

drop trigger if exists forum_profile_catalog_guard on public.forum_profiles;
create trigger forum_profile_catalog_guard
before insert or update of games,platforms,game_modes on public.forum_profiles
for each row execute function public.tl_forum_profile_catalog_guard();

revoke all on function public.tl_forum_profile_catalog_guard() from public,anon,authenticated;

commit;
