-- Allow each profile to position the cover horizontally in the mobile hero.

alter table public.forum_profiles
  add column if not exists cover_position_x smallint not null default 72;

alter table public.forum_profiles
  drop constraint if exists forum_profiles_cover_position_x_check;

alter table public.forum_profiles
  add constraint forum_profiles_cover_position_x_check
  check (cover_position_x between 0 and 100);

create or replace function public.tl_set_profile_cover_position(p_x integer)
returns smallint
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_uid uuid:=auth.uid();
  v_x smallint:=greatest(0,least(100,coalesce(p_x,72)))::smallint;
begin
  if v_uid is null then raise exception 'Login necessário'; end if;
  update public.forum_profiles
     set cover_position_x=v_x, updated_at=now()
   where user_id=v_uid;
  if not found then raise exception 'Perfil não encontrado'; end if;
  return v_x;
end;
$$;

revoke all on function public.tl_set_profile_cover_position(integer) from public,anon;
grant execute on function public.tl_set_profile_cover_position(integer) to authenticated;
