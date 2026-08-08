-- TEAM LAMBRETA V89 — PERFIS TEAM ESPORTS EDITÁVEIS
-- Execute uma vez no SQL Editor do Supabase.

alter table public.team_members
  add column if not exists nickname text,
  add column if not exists age smallint,
  add column if not exists country text,
  add column if not exists main_game text,
  add column if not exists favorite_mode text,
  add column if not exists favorite_weapons text,
  add column if not exists play_style text,
  add column if not exists is_featured boolean not null default false;

do $$
begin
  if not exists (
    select 1 from public.team_members
    where lower(coalesce(nickname,'')) = 'electricmagneti'
  ) then
    insert into public.team_members (
      name,
      nickname,
      age,
      role,
      member_group,
      country,
      main_game,
      favorite_mode,
      favorite_weapons,
      play_style,
      bio,
      instagram_url,
      tiktok_url,
      facebook_url,
      is_featured,
      is_published,
      is_archived,
      display_order
    ) values (
      'ElectricMagneti',
      'electricmagneti',
      32,
      'DEV',
      'Staff',
      'Brasil',
      'Fortnite',
      'Battle Royale',
      'Pistola • Shotgun',
      'Atacante • Suporte',
      'DEV do Team Lambreta. Perfil inicial de demonstração, totalmente editável pelo painel Admin.',
      'about:blank',
      'about:blank',
      'about:blank',
      true,
      true,
      false,
      1
    );
  end if;
end
$$;

grant select on public.team_members to anon;
grant select, insert, update, delete on public.team_members to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='team_members'
  ) then
    alter publication supabase_realtime add table public.team_members;
  end if;
end
$$;
