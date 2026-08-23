# Auditoria da reconstrução Team Lambreta

Data: 22-08-2026. Cópia analisada: `team-lambreta-rebuild`. O original em `Documents/team_lambreta` permanece intocado.

## Superfície pública

- Entrada: `index.html` (intro) e `home.html`.
- Navegação: Home, Team, Fórum, Streamers, Eventos, Loja, Buddy, Atualizações, Regras, Ajuda, Contacto, Mídia, Conquistas e Participe.
- Rotas auxiliares: `live.html`; `membros.html` redireciona para Team.
- Administração privada: `admin.html`, protegida por sessão, cargo e password administrativa.

## Sistemas e fontes de dados

- Supabase Auth com Google e sessão persistente.
- `profiles`: identidade, avatar, nickname, cargo, presença, punições e badges.
- Chat: `chat_messages`, menções, tradução, moderação, anti-flood, termos e denúncias.
- Buddy: `buddy_relations`, `private_messages`, bloqueios, denúncias, notificações e som.
- Fórum: categorias, secções, tópicos, posts, perfis, reações, menções, estatísticas, XP, moderação e Storage `forum-avatars`.
- Team e streamers: `team_members`, `streamers`, catálogos de jogo/modo, lives e sessões.
- Comunidade: progresso, conquistas, hall da fama, inscrições competitivas e inbox.
- Conteúdo editorial: eventos, mídia, loja, redes e parte dos textos em `localStorage` via `data.js`; dados públicos de Team/streamers/fórum vêm do Supabase.
- Atualizações: `site_updates`, itens, leituras e tours.

## Problemas confirmados

- Pelo menos 15 clientes Supabase criados separadamente.
- Header copiado em quase todas as páginas e novamente reescrito por JavaScript.
- Presença distribuída entre três scripts, com colunas `last_seen` e `last_seen_at` usadas de forma inconsistente.
- Navegação antiga + nova + patches injetados em runtime.
- CSS base, UI, temas e CSS específicos competem com elevada especificidade e muitos `!important`.
- Listeners/timers numerosos: fórum (89 ocorrências), base (37), integração Supabase (35), além de polling no Buddy.
- Perfis aparecem em auth bar, chat e páginas com marcação diferente, causando flicker e inconsistência.
- Menu atual agrupa itens de modo diferente do requisito e não possui uma área de conta/status global independente.

## Contratos que não podem ser quebrados

- IDs DOM utilizados pelos módulos de chat, fórum, Buddy, admin, loja e formulários.
- Nomes de tabelas, buckets, RPCs, cargos e regras de autorização.
- `window.teamSupabase`, `window.TeamBuddyPresence`, `window.TL_CHAT_ROOM` e eventos customizados existentes.
- Conteúdo de `data.js`, conteúdo integral das páginas, migrations e SQL histórico.

## Estratégia

1. Introduzir cliente Supabase partilhado e shell global único.
2. Substituir apenas a composição visual do header, preservando os contratos DOM internos.
3. Aplicar um design system novo e isolado, carregado por último.
4. Migrar presença para um único controlador: manual Online/Ocupado; Ausente automático após 5 minutos; Ocupado nunca sofre override automático.
5. Redesenhar progressivamente Home, Team, Fórum, Streamers, Eventos, Loja e páginas institucionais sem eliminar módulos de dados.
6. Manter Admin separado e privado; modernizar sem mudar permissões.
7. Só após testes, documentar CSS/JS históricos candidatos a remoção. Nenhum será apagado nesta primeira reconstrução.

## Compatibilidade Supabase atual

- O projeto usa chave publicável no browser, não `service_role`.
- Não serão feitas alterações destrutivas nem alterações ao schema.
- A reconstrução evita tocar no schema `realtime`, atualmente bloqueado para modificações pelo Supabase.
- Runtime local deve usar Node 22+ para acompanhar o suporte atual das bibliotecas Supabase.

## Auditoria específica do Buddy

- O schema existente já cobre a reconstrução: `buddy_relations`, `user_blocks`, `private_messages`, `user_reports` e `profiles` com presença/última atividade.
- `private_messages` já inclui `read_at`, ocultação individual e RLS que limita leitura aos dois participantes; o envio é bloqueado pelas policies quando existe bloqueio em qualquer direção.
- `buddy_relations` guarda pedidos e amizades no mesmo registo (`pending`, `accepted`, `rejected`) com par único, evitando duplicados.
- O frontend anterior fazia polling de mensagens a cada 450 ms, carregava o histórico completo, não tinha paginação nem envio otimista e criava canais adicionais ao recuperar foco/visibilidade.
- `buddy-global-notifications-v94.js` mantinha outra subscription de `private_messages` e um `MutationObserver` global, podendo duplicar processamento e trabalho no DOM.
- `buddy-presence-v95.js`, `navigation-v100.js` e integrações históricas disputavam a presença. O Buddy reconstruído usa `presence-manager.js` como fonte única nesta rota.
- Os valores aceites por `user_reports.reason` são `assedio`, `spam`, `ameaca`, `conteudo_improprio`, `perfil_falso` e `outro`; a nova interface respeita exatamente esse contrato.
- As tabelas existentes são suficientes; porém o histórico não publica `buddy_relations` nem `user_blocks` no Realtime. Foi preparada a migration não destrutiva `202608220001_buddy_relations_realtime.sql`, não executada. Typing usa Broadcast efémero e não escreve no banco; anexos permanecem desativados porque o schema de mensagens é somente texto.
