-- Team Lambreta V93.6.9 — salas isoladas de chat
-- Execute uma vez no Supabase SQL Editor.

alter table public.chat_messages
  add column if not exists room text;

update public.chat_messages
set room = 'lobby'
where room is null or btrim(room) = '';

alter table public.chat_messages
  alter column room set default 'lobby';

alter table public.chat_messages
  alter column room set not null;

create index if not exists chat_messages_room_created_at_idx
  on public.chat_messages (room, created_at desc);

comment on column public.chat_messages.room is
  'Sala lógica do chat. lobby = Home; live:<tiktok_user> = chat exclusivo de cada live.';
