alter table public.chat_messages add column if not exists original_message text;
alter table public.chat_messages add column if not exists translated_message text;
alter table public.chat_messages add column if not exists source_language text;
alter table public.chat_messages add column if not exists target_language text;
