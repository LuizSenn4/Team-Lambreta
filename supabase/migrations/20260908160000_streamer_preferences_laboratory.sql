create table if not exists public.streamer_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  streamer_key text not null check (char_length(streamer_key) between 1 and 120),
  position smallint not null check (position between 1 and 4),
  notify_live boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, streamer_key),
  unique (user_id, position)
);

create index if not exists streamer_preferences_stats_idx
  on public.streamer_preferences (streamer_key, position);

alter table public.streamer_preferences enable row level security;

drop policy if exists "Users read own streamer preferences" on public.streamer_preferences;
create policy "Users read own streamer preferences"
  on public.streamer_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own streamer preferences" on public.streamer_preferences;
create policy "Users insert own streamer preferences"
  on public.streamer_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own streamer preferences" on public.streamer_preferences;
create policy "Users update own streamer preferences"
  on public.streamer_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own streamer preferences" on public.streamer_preferences;
create policy "Users delete own streamer preferences"
  on public.streamer_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.streamer_preferences to authenticated;
revoke all on public.streamer_preferences from anon;

create or replace function public.tl_save_streamer_preferences(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item_count integer;
  key_count integer;
  position_count integer;
  valid_items boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Lista inválida' using errcode = '22023';
  end if;

  select count(*), count(distinct streamer_key), count(distinct position),
         coalesce(bool_and(char_length(trim(streamer_key)) between 1 and 120 and position between 1 and 4), true)
    into item_count, key_count, position_count, valid_items
  from jsonb_to_recordset(p_items) as x(streamer_key text, position smallint, notify_live boolean);

  if item_count > 4 or item_count <> key_count or item_count <> position_count or not valid_items then
    raise exception 'Preferências inválidas' using errcode = '22023';
  end if;

  delete from public.streamer_preferences
  where user_id = (select auth.uid());

  insert into public.streamer_preferences (user_id, streamer_key, position, notify_live, updated_at)
  select (select auth.uid()), trim(streamer_key), position, coalesce(notify_live, false), now()
  from jsonb_to_recordset(p_items) as x(streamer_key text, position smallint, notify_live boolean);
end;
$$;

revoke all on function public.tl_save_streamer_preferences(jsonb) from public, anon;
grant execute on function public.tl_save_streamer_preferences(jsonb) to authenticated;