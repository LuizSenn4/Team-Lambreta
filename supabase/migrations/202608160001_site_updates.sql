-- Central de Atualizações: releases públicas e leitura individual por membro.
create table if not exists public.site_updates (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  summary text not null,
  content text not null default '',
  category text not null default 'COMUNIDADE' check (category in ('NOVO','MELHORIA','CORREÇÃO','SEGURANÇA','VISUAL','COMUNIDADE')),
  published_at date not null default current_date,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_update_items (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.site_updates(id) on delete cascade,
  kind text not null default 'MELHORIA' check (kind in ('NOVO','MELHORIA','CORREÇÃO','SEGURANÇA','VISUAL','COMUNIDADE')),
  title text not null,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.site_update_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  update_id uuid not null references public.site_updates(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, update_id)
);

create index if not exists site_updates_published_idx on public.site_updates (is_published, published_at desc);
create index if not exists site_update_items_update_idx on public.site_update_items (update_id, sort_order);

alter table public.site_updates enable row level security;
alter table public.site_update_items enable row level security;
alter table public.site_update_reads enable row level security;

drop policy if exists site_updates_public_read on public.site_updates;
create policy site_updates_public_read on public.site_updates for select to anon, authenticated using (is_published = true or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin')));
drop policy if exists site_updates_admin_insert on public.site_updates;
create policy site_updates_admin_insert on public.site_updates for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin')) and (created_by is null or created_by = auth.uid()));
drop policy if exists site_updates_admin_update on public.site_updates;
create policy site_updates_admin_update on public.site_updates for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin')));
drop policy if exists site_updates_admin_delete on public.site_updates;
create policy site_updates_admin_delete on public.site_updates for delete to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin')));

drop policy if exists site_update_items_public_read on public.site_update_items;
create policy site_update_items_public_read on public.site_update_items for select to anon, authenticated using (exists (select 1 from public.site_updates u where u.id = update_id and (u.is_published = true or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin')))));
drop policy if exists site_update_items_admin_write on public.site_update_items;
create policy site_update_items_admin_write on public.site_update_items for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) in ('master','admin')));

drop policy if exists site_update_reads_own on public.site_update_reads;
create policy site_update_reads_own on public.site_update_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.site_updates, public.site_update_items to anon, authenticated;
grant select, insert, update, delete on public.site_updates, public.site_update_items to authenticated;
grant select, insert, update, delete on public.site_update_reads to authenticated;

insert into public.site_updates (version, title, summary, content, category, published_at, is_published)
values ('2026.08.15', 'Grande atualização da Comunidade', 'O Fórum, a Team, o Buddy e várias áreas do Team Lambreta receberam uma grande evolução.', $$A comunidade ganhou uma base mais organizada para conversar, conhecer membros, acompanhar novidades e participar do Team. Esta atualização reúne as melhorias lançadas em 15 de agosto de 2026.$$ , 'COMUNIDADE', '2026-08-15', true)
on conflict (version) do nothing;

insert into public.site_update_items (update_id, kind, title, body, sort_order)
select u.id, x.kind, x.title, x.body, x.sort_order
from public.site_updates u
cross join (values
  ('NOVO','Fórum com estrutura de comunidade','O Fórum agora organiza o conteúdo em categorias, pastas, tópicos e respostas. Cada tópico tem endereço próprio, breadcrumbs e links diretos para publicações, deixando a conversa muito mais fácil de acompanhar.',1),
  ('NOVO','Perfis e editor do Fórum','Cada membro pode configurar nickname, avatar, país, jogos, plataformas, modos de jogo e bio. Essas informações aparecem num mini perfil ao lado das publicações, com estatísticas reais e data original de entrada na comunidade.',2),
  ('NOVO','Menções e editor avançado','O editor permite formatação leve, emojis, citações e menções contextuais aos participantes do tópico. O autocomplete mostra avatar, cargo e jogo, e a menção publicada abre um preview seguro do perfil.',3),
  ('MELHORIA','Reações, partilhas e moderação','Posts agora têm likes, dislikes, partilha de deep links e ações de moderação mais claras. Respostas e publicações podem ser removidas sem quebrar os links, e tópicos podem ser fixados, trancados ou fechados quando essa moderação estiver disponível.',4),
  ('SEGURANÇA','XP baseado em atividade válida','O progresso considera apenas tópicos, respostas e likes válidos. Conteúdo removido, reações próprias e repetições não geram recompensas indevidas, evitando farm de XP.',5),
  ('VISUAL','Team mais consistente em qualquer tela','As imagens dos membros passaram a respeitar melhor o enquadramento 4:5, os cards usam o espaço da foto com mais consistência e o perfil da Team foi ajustado para mobile, tablet e desktop.',6),
  ('NOVO','Buddy com experiência de lista de amigos','O Buddy evoluiu para uma lista gamer de Pessoas, Buddies, Pedidos e Bloqueados, com presença online/offline, pedidos de amizade, perfil rápido e conversas privadas somente por texto.',7),
  ('MELHORIA','Participe, Admin e página inicial','A navegação da Participe foi alinhada ao menu global, o Admin ganhou uma Central de Ajuda própria, o carrossel mobile da Home foi restaurado e o fluxo de inscrições passou a ter notificações administrativas por e-mail quando o domínio estiver configurado.',8)
) as x(kind,title,body,sort_order) on true
where u.version='2026.08.15'
and not exists (select 1 from public.site_update_items i where i.update_id=u.id);
