-- TEAM LAMBRETA V85 — STREAMERS 100% NA NUVEM
-- Execute uma vez no SQL Editor do Supabase.

grant select, insert, update, delete
on table public.streamers
to authenticated;

grant select
on table public.streamers
to anon;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'streamers'
  ) then
    alter publication supabase_realtime add table public.streamers;
  end if;
end
$$;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'streamers';
