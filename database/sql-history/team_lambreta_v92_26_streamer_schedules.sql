-- TEAM LAMBRETA V92.26 — HORÁRIOS DE LIVE ESTRUTURADOS
-- Execute uma vez no SQL Editor do Supabase.

alter table public.streamers
add column if not exists schedule_json jsonb not null default '[]'::jsonb;

comment on column public.streamers.schedule_json is
'Lista de horários de live: weekly/date, dias, data, início, fim, folga e fuso.';
