-- TOP DA SALA: configuração persistente por streamer e ranking TL público.
alter table public.streamers
  add column if not exists top_enabled boolean not null default false,
  add column if not exists top_limit smallint not null default 3,
  add column if not exists top_pos_x numeric(6,3) not null default 8,
  add column if not exists top_pos_y numeric(6,3) not null default 12;

alter table public.streamers drop constraint if exists streamers_top_limit_check;
alter table public.streamers add constraint streamers_top_limit_check check (top_limit in (3,5,10));
alter table public.streamers drop constraint if exists streamers_top_pos_x_check;
alter table public.streamers add constraint streamers_top_pos_x_check check (top_pos_x between 0 and 100);
alter table public.streamers drop constraint if exists streamers_top_pos_y_check;
alter table public.streamers add constraint streamers_top_pos_y_check check (top_pos_y between 0 and 100);

drop function if exists public.tl_live_top_ranking(integer);
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.tl_live_top_ranking(p_streamer text, p_limit integer default 3)
returns table(name text, tl numeric)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select s.id from public.streamers s
    where s.is_archived=false and (
      lower(coalesce(s.tiktok_url,'')) like '%/@'||lower(regexp_replace(btrim(coalesce(p_streamer,'')),'^@',''))||'%'
      or lower(coalesce(s.live_url,'')) like '%/@'||lower(regexp_replace(btrim(coalesce(p_streamer,'')),'^@',''))||'%'
      or lower(coalesce(s.game_nickname,''))=lower(regexp_replace(btrim(coalesce(p_streamer,'')),'^@',''))
      or lower(coalesce(s.display_name,''))=lower(regexp_replace(btrim(coalesce(p_streamer,'')),'^@',''))
    ) order by s.is_published desc,s.updated_at desc nulls last limit 1
  )
  select coalesce(nullif(btrim(p.game_nickname),''),nullif(btrim(p.full_name),''),'Membro') as name,
         sum(g.total_cost)::numeric as tl
  from public.tl_gift_events g
  join target t on t.id=g.streamer_id
  join public.profiles p on p.id=g.sender_user_id
  group by g.sender_user_id,p.game_nickname,p.full_name
  order by sum(g.total_cost) desc,p.game_nickname nulls last
  limit case when p_limit in (3,5,10) then p_limit else 3 end
$$;

revoke all on function private.tl_live_top_ranking(text,integer) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.tl_live_top_ranking(text,integer) to anon,authenticated;

create or replace function public.tl_live_top_ranking(p_streamer text,p_limit integer default 3)
returns table(name text,tl numeric)
language sql stable security invoker
set search_path=public,private
as $$ select * from private.tl_live_top_ranking(p_streamer,p_limit) $$;

revoke all on function public.tl_live_top_ranking(text,integer) from public;
grant execute on function public.tl_live_top_ranking(text,integer) to anon, authenticated;

create or replace function public.tl_set_live_top_config(
  p_streamer text,
  p_enabled boolean,
  p_limit integer,
  p_pos_x numeric,
  p_pos_y numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_is_streamer boolean;
  v_streamer text := lower(regexp_replace(btrim(coalesce(p_streamer,'')), '^@', ''));
  v_row public.streamers;
begin
  select lower(coalesce(p.role::text,'member')), coalesce(p.is_streamer,false)
    into v_actor_role, v_is_streamer
  from public.profiles p
  where p.id = auth.uid();

  if auth.uid() is null or not (v_actor_role in ('master','dev','admin','moderator') or v_is_streamer) then
    raise exception 'Apenas streamer, moderador ou admin pode alterar o TOP.';
  end if;
  if v_streamer = '' or p_limit not in (3,5,10) then
    raise exception 'Configuração do TOP inválida.';
  end if;

  update public.streamers s
  set top_enabled = coalesce(p_enabled,false),
      top_limit = p_limit,
      top_pos_x = least(100,greatest(0,coalesce(p_pos_x,8))),
      top_pos_y = least(100,greatest(0,coalesce(p_pos_y,12))),
      updated_by = auth.uid(),
      updated_at = now()
  where s.id = (
    select candidate.id from public.streamers candidate
    where candidate.is_archived = false and (
      lower(coalesce(candidate.tiktok_url,'')) like '%/@' || v_streamer || '%'
      or lower(coalesce(candidate.live_url,'')) like '%/@' || v_streamer || '%'
      or lower(coalesce(candidate.game_nickname,'')) = v_streamer
      or lower(coalesce(candidate.display_name,'')) = v_streamer
    )
    order by candidate.is_published desc, candidate.updated_at desc nulls last
    limit 1
  )
  returning s.* into v_row;

  if v_row.id is null then raise exception 'Sala/streamer não encontrado.'; end if;
  return jsonb_build_object('top_enabled',v_row.top_enabled,'top_limit',v_row.top_limit,'top_pos_x',v_row.top_pos_x,'top_pos_y',v_row.top_pos_y);
end;
$$;

revoke all on function public.tl_set_live_top_config(text,boolean,integer,numeric,numeric) from public;
grant execute on function public.tl_set_live_top_config(text,boolean,integer,numeric,numeric) to authenticated;
