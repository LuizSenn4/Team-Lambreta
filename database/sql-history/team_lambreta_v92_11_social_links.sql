-- Team Lambreta V92.11
-- Execute uma vez no Supabase SQL Editor.

alter table public.team_members
  add column if not exists social_links jsonb not null default '[]'::jsonb;

comment on column public.team_members.social_links is
  'Até quatro redes: [{type,label,url,country_code}]';

-- Migra automaticamente as três redes antigas quando o novo campo ainda estiver vazio.
update public.team_members
set social_links = (
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  from (
    select jsonb_build_object('type','instagram','label','Instagram','url',instagram_url) item where instagram_url is not null and btrim(instagram_url) <> ''
    union all
    select jsonb_build_object('type','tiktok','label','TikTok','url',tiktok_url) where tiktok_url is not null and btrim(tiktok_url) <> ''
    union all
    select jsonb_build_object('type','facebook','label','Facebook','url',facebook_url) where facebook_url is not null and btrim(facebook_url) <> ''
  ) legacy
)
where social_links = '[]'::jsonb;
