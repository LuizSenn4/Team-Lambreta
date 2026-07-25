-- Team Lambreta V92.36 — configuração pública da paginação do Team

create table if not exists public.team_display_settings (
  id smallint primary key default 1 check (id = 1),
  members_per_page smallint not null default 10 check (members_per_page between 1 and 10),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.team_display_settings (id, members_per_page)
values (1, 10)
on conflict (id) do nothing;

alter table public.team_display_settings enable row level security;

drop policy if exists "Public can view team display settings" on public.team_display_settings;
create policy "Public can view team display settings"
on public.team_display_settings for select
using (true);

drop policy if exists "Admins can update team display settings" on public.team_display_settings;
create policy "Admins can update team display settings"
on public.team_display_settings for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

grant select on public.team_display_settings to anon, authenticated;
grant update on public.team_display_settings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='team_display_settings'
  ) then
    alter publication supabase_realtime add table public.team_display_settings;
  end if;
end $$;
