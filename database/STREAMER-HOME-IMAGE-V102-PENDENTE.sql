-- APLICADA em 2026-08-23 no projeto Supabase Team Lambreta.
-- Migration remota: streamer_home_framing_v102.
-- Mantém a imagem Home independente do poster/avatar e reutiliza a coluna
-- home_card_photo_url e as policies já existentes de public.streamers.

alter table public.streamers
  add column if not exists home_image_position_x numeric not null default 50
    check (home_image_position_x between 0 and 100),
  add column if not exists home_image_position_y numeric not null default 50
    check (home_image_position_y between 0 and 100),
  add column if not exists home_image_scale numeric not null default 1
    check (home_image_scale between 1 and 3);

comment on column public.streamers.home_image_position_x is
  'Posição horizontal do enquadramento Home, em percentagem.';
comment on column public.streamers.home_image_position_y is
  'Posição vertical do enquadramento Home, em percentagem.';
comment on column public.streamers.home_image_scale is
  'Escala relativa do enquadramento Home; mínimo 1 sempre cobre a moldura.';
