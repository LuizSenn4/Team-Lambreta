-- TEAM LAMBRETA V87 — TEAM GLOBAL NA NUVEM
-- Execute uma vez no SQL Editor do Supabase.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  member_group text not null default 'Gamers' check (member_group in ('Gamers','Staff')),
  bio text,
  image_url text,
  instagram_url text,
  tiktok_url text,
  facebook_url text,
  is_published boolean not null default true,
  is_archived boolean not null default false,
  display_order integer not null default 100,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_public_idx
on public.team_members (is_archived, is_published, member_group, display_order);

alter table public.team_members enable row level security;

drop policy if exists "Public can view team members" on public.team_members;
create policy "Public can view team members"
on public.team_members for select
using (is_published = true and is_archived = false);

drop policy if exists "Admins can view all team members" on public.team_members;
create policy "Admins can view all team members"
on public.team_members for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can insert team members" on public.team_members;
create policy "Admins can insert team members"
on public.team_members for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can update team members" on public.team_members;
create policy "Admins can update team members"
on public.team_members for update to authenticated
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

drop policy if exists "Admins can delete team members" on public.team_members;
create policy "Admins can delete team members"
on public.team_members for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

grant select on public.team_members to anon;
grant select, insert, update, delete on public.team_members to authenticated;

insert into storage.buckets (id,name,public)
values ('team-member-images','team-member-images',true)
on conflict (id) do update set public=true;

drop policy if exists "Public can view team member images" on storage.objects;
create policy "Public can view team member images"
on storage.objects for select
using (bucket_id='team-member-images');

drop policy if exists "Admins can upload team member images" on storage.objects;
create policy "Admins can upload team member images"
on storage.objects for insert to authenticated
with check (
  bucket_id='team-member-images'
  and exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can update team member images" on storage.objects;
create policy "Admins can update team member images"
on storage.objects for update to authenticated
using (
  bucket_id='team-member-images'
  and exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can delete team member images" on storage.objects;
create policy "Admins can delete team member images"
on storage.objects for delete to authenticated
using (
  bucket_id='team-member-images'
  and exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role in ('master','admin')
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='team_members'
  ) then
    alter publication supabase_realtime add table public.team_members;
  end if;
end
$$;

select schemaname,tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
  and tablename='team_members';
