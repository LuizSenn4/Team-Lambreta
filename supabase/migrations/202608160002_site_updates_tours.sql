-- Metadados opcionais para demonstrar uma novidade no componente real.
alter table public.site_update_items
  add column if not exists tour_url text,
  add column if not exists tour_target text,
  add column if not exists tour_enabled boolean not null default false;

alter table public.site_update_items
  drop constraint if exists site_update_items_tour_url_check;
alter table public.site_update_items
  add constraint site_update_items_tour_url_check
  check (tour_url is null or tour_url ~ '^[a-zA-Z0-9_./?=&%#-]+$');

-- Targets demonstráveis da release inicial. Itens de backend continuam sem tour.
update public.site_update_items
set tour_url = 'forum.html', tour_target = 'forum-structure', tour_enabled = true
where title = 'Fórum com estrutura de comunidade';

update public.site_update_items
set tour_url = 'forum.html', tour_target = 'forum-profile', tour_enabled = true
where title = 'Perfis e editor do Fórum';

update public.site_update_items
set tour_url = 'forum.html', tour_target = 'forum-share', tour_enabled = true
where title = 'Reações, partilhas e moderação';

update public.site_update_items
set tour_url = 'buddy.html', tour_target = 'buddy-list', tour_enabled = true
where title = 'Buddy com experiência de lista de amigos';

update public.site_update_items
set tour_url = 'atualizacoes.html', tour_target = 'updates-page', tour_enabled = true
where title = 'Team mais consistente em qualquer tela';

grant select on public.site_update_items to anon, authenticated;
