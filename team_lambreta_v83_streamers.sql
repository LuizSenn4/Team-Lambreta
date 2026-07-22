-- TEAM LAMBRETA V83 — GESTÃO DE STREAMERS
-- Execute uma vez no SQL Editor do Supabase.

create table if not exists public.streamers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  game_nickname text,
  main_game text,
  title text,
  description text,
  photo_url text,
  tiktok_url text,
  twitch_url text,
  youtube_url text,
  instagram_url text,
  live_url text,
  live_platform text check (live_platform in ('tiktok','twitch','youtube','outro') or live_platform is null),
  live_mode text not null default 'manual' check (live_mode in ('manual','automatic')),
  manual_live boolean not null default false,
  auto_live boolean not null default false,
  force_live boolean not null default false,
  allow_embed boolean not null default true,
  allow_live_chat boolean not null default true,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  is_archived boolean not null default false,
  display_order integer not null default 100,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists streamers_public_idx
on public.streamers (is_archived, is_published, is_featured, display_order);

alter table public.streamers enable row level security;

drop policy if exists "Public can view published streamers" on public.streamers;
create policy "Public can view published streamers"
on public.streamers for select
using (is_published = true and is_archived = false);

drop policy if exists "Admins can view all streamers" on public.streamers;
create policy "Admins can view all streamers"
on public.streamers for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can insert streamers" on public.streamers;
create policy "Admins can insert streamers"
on public.streamers for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can update streamers" on public.streamers;
create policy "Admins can update streamers"
on public.streamers for update
to authenticated
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

drop policy if exists "Admins can delete streamers" on public.streamers;
create policy "Admins can delete streamers"
on public.streamers for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

insert into storage.buckets (id, name, public)
values ('streamer-images', 'streamer-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view streamer images" on storage.objects;
create policy "Public can view streamer images"
on storage.objects for select
using (bucket_id = 'streamer-images');

drop policy if exists "Admins can upload streamer images" on storage.objects;
create policy "Admins can upload streamer images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'streamer-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can update streamer images" on storage.objects;
create policy "Admins can update streamer images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'streamer-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);

drop policy if exists "Admins can delete streamer images" on storage.objects;
create policy "Admins can delete streamer images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'streamer-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('master','admin')
  )
);
