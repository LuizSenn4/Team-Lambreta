# Team Lambreta — Migração V102

Data da auditoria: 23-08-2026  
Branch local: `rebuild-v102`  
Golden references: `home.html` e `buddy.html` (visual e comportamento; não redesenhar).

## Estado geral confirmado

O projeto ainda é híbrido. As páginas públicas combinam `style-v92.css` (9.802 linhas), `ui-core-v93.css`, scripts `v89/v92/v93`, o shell V100 e patches posteriores. Existem 18 módulos JavaScript com chamada ou fallback para `createClient`; vários reutilizam `window.teamSupabase`, mas outros ainda podem criar clientes próprios.

Conflitos críticos encontrados:

- `home.html` ainda carrega `supabase-integration-v92.js`, `buddy-presence-v95.js` e `buddy-global-notifications-v94.js`.
- `buddy.html` carrega posteriormente `auth-local-mobile-fix.js`. Esse ficheiro pode criar `window.tlMobileAuthSupabase`, define outro fluxo Google, consulta sessão novamente e captura cliques globalmente em capture phase. Ele conflita diretamente com `auth-manager.js`.
- `supabase-integration-v92.js` mantém Auth, Presence, chat geral, contacto e renderização de conta no mesmo ficheiro; possui heartbeat de 45 segundos e outra fonte de inatividade.
- `admin-gate.js` cria cliente próprio e exige `tl_admin_unlocked`; `admin.js` repete o mesmo gate e redireciona para `home.html?admin=locked`.
- O Fórum concentra perfil, editor, catálogo, rotas e negócio num único `forum-board-v2.js` com 2.145 linhas.
- Todas as páginas públicas possuem cópias estáticas de header que depois são substituídas pelo JavaScript.
- `buddy-global-notifications-v94.js` e outros módulos mantêm listeners próprios de Auth/Realtime; a remoção só será segura depois de existir um serviço global V102 equivalente.

## Arquitetura V102 proposta

### Núcleo global

- `supabase-client.js`: única criação de `window.teamSupabase`.
- `auth-manager.js`: única subscrição Auth; login, logout, sessão inicial e eventos para consumidores.
- `presence-manager.js`: única fonte de status manual, auto-away, heartbeat e Presence.
- `tl-shell-v102.js`: header, navegação desktop/mobile, dropdowns, cache visual seguro e atalho Buddy.
- `tl-shell-v102.css`: estrutura global, header, navegação, container, footer e prevenção de FOUC.
- `tl-components-v102.css`: botões, cards, inputs, dropdowns, modais, badges, loading, empty state e toast.
- `tl-page-v102.css`: base de páginas editoriais e grids responsivos.

Ordem obrigatória no HTML migrado:

1. CSS V102.
2. SDK oficial Supabase.
3. `supabase-client.js`.
4. `auth-manager.js`.
5. `presence-manager.js`.
6. `tl-shell-v102.js`.
7. service e controlador exclusivos da página.

### Serviços novos

- `services/profile-service-v102.js`
- `services/team-service-v102.js`
- `services/streamer-service-v102.js`
- `services/forum-service-v102.js`
- `services/events-service-v102.js`
- `services/live-service-v102.js`
- `services/content-service-v102.js`
- `services/admin-access-service-v102.js`

Os services recebem `window.teamSupabase`; nenhum pode chamar `createClient`.

### Perfil independente

- `profile.html?user=<uuid>` para leitura pública.
- `profile-edit.html` para edição autenticada.
- Reutilizar `profiles`, `forum_profiles`, catálogos e RPCs existentes.
- Manter o limite real atual dos dados e aplicar máximo de três jogos na nova UI somente depois de confirmar compatibilidade com os registos existentes.
- Links de autores e cards passam progressivamente de `forum.html?profile=` para `profile.html?user=`.

## Mapa por página

| Página | Estado atual | Dependências antigas principais | Destino V102 | Observações |
|---|---|---|---|---|
| Home | Golden visual; integração híbrida | `style-v92`, `ui-core-v93`, `script-v89`, `supabase-integration-v92`, presença/notificações antigas | Shell V102 sem redesenho | Separar apenas hero/cards necessários; remover chat geral antigo após equivalência das notificações |
| Buddy | Golden visual; dados V100 | `style-v92`, `ui-core-v93`, `script-v89`, `auth-local-mobile-fix.js` | Shell V102 + services Buddy existentes | Remover primeiro o patch Auth concorrente após teste OAuth PC/mobile |
| Profile | Não existe fora do Fórum | editor/visualização dentro de `forum-board-v2.js` | `profile.html`, `profile-edit.html`, profile service | Primeira página nova funcional |
| Team | Híbrida | `style-v92`, `ui-core-v93`, `script-v89`, `team-public-v92`, safety/presença/notificações antigas | Team service + página V102 | Preservar `team_members`, fotos, cargos, redes e ordem |
| Streamers | Cards V101 aprovados; shell híbrido | `style-v92`, `ui-core-v93`, `script-v89`, `supabase-integration-v92`, `streamer-public-v86` | Streamer service + cards V102 | Reconciliar requisito novo 3:2/Home com poster vertical aprovado antes de mudar assets |
| Fórum | Funcional, fortemente acoplado | `style-v92`, `ui-core-v93`, `supabase-integration-v92`, `forum-board-v2.js/css` | Forum service + UI V102 | Migrar por fluxos; nunca reescrever negócio inteiro de uma vez |
| Eventos | Predominantemente estática/legada | `style-v92`, `ui-core-v93`, `script-v89`, safety/presença/notificações | Events service + UI V102 | Não criar inscrições/resultados fictícios |
| Live | Híbrida | chat de `supabase-integration`, `live-page-v9366`, traduções e scripts globais antigos | Live service + sala V102 | Sala por streamer; placeholder oficial; chat isolado por room |
| Regras | Estática híbrida | CSS/script base antigos e scripts globais desnecessários | Página editorial V102 | Preservar texto integral |
| Ajuda | Estática híbrida | CSS/script base antigos e scripts globais desnecessários | Página editorial V102 | Preservar todas as explicações |
| Contacto | Híbrida | `contact-v97`, `supabase-integration-v92`, scripts globais | Content/contact service | Preservar backend `contact_messages` se ativo |
| Mídia | Estática híbrida | CSS/script base antigos e scripts globais | Content service + galeria V102 | Preservar fotos, vídeos e links |
| Conquistas | Supabase + híbrida | `hall-da-fama-v96`, scripts globais antigos | Achievement service + UI V102 | Preservar ranking público e progresso |
| Participe | Supabase + híbrida | `supabase-integration-v92`, `participation-v96`, `user-inbox-v96` | Participation service | Preservar inscrições e inbox |
| Loja | Conteúdo local + híbrida | `style-v92`, `script-v89`, `store-v97`, scripts globais | Store service/UI V102 | Confirmar fonte local antes de substituir |
| Atualizações | Supabase + CSS próprio | `style-v92`, `ui-core-v93`, `updates-v1` | Updates service/UI V102 | Preservar leituras, tours e itens |
| Admin | Bloqueado por gate duplicado | `admin-gate`, `admin.js`, cliente paralelo, `tl_admin_unlocked`, integração geral | Gate por Auth oficial + role master/admin | Migrar módulo a módulo sem remover operações atuais |
| Moderator | Inexistente | — | `moderator.html` skeleton + access service | Nunca conceder acesso Admin completo |

## Arquivos a substituir progressivamente

- `navigation-v100.js` → `tl-shell-v102.js` depois de validar Home/Buddy.
- `tl-design-system-v100.css` e `tl-polish-v100.css` → três camadas CSS V102 consolidadas.
- Cópias de header dentro de cada HTML → slot único `<header data-tl-shell>`.
- Perfil dentro de `forum-board-v2.js` → páginas e service próprios.
- Gates `admin-gate.js` + início de `admin.js` → access service V102.
- Lógica de leitura Supabase de `team-public-v92.js`, `streamer-public-v86.js`, `updates-v1.js` → services pequenos por domínio.

## Arquivos que permanecem temporariamente

- `style-v92.css`, `ui-core-v93.css` e `script-v89.js`: enquanto houver uma página não migrada.
- `forum-board-v2.js/css`: até cada fluxo do Fórum passar por testes funcionais.
- `supabase-integration-v92.js`: apenas nas páginas ainda dependentes de chat/contacto/inbox; proibido em páginas V102.
- `community-safety-v9347.js`: até a lógica de segurança/moderação ser exposta por um service sem Auth próprio.
- `buddy-global-notifications-v94.js`: até o shell V102 assumir badge/toast global sem duplicar canais.
- `team-public-v92.js`, `streamer-public-v86.js`, `live-page-v9366.js`, `participation-v96.js`, `updates-v1.js`: até os services equivalentes passarem nos testes.
- `data.js`: enquanto Loja, conteúdo editorial e configurações locais ainda dependerem dele.

## Candidatos a remoção após migração comprovada

- `auth-local-mobile-fix.js` e `buddy.html.before-mobile-auth-fix`.
- `buddy-presence-v95.js` e `buddy-v93.js`.
- `navigation-v100.js`.
- Fallbacks `createClient` de módulos migrados.
- Markup duplicado de headers antigos.
- CSS histórico sem qualquer consumidor confirmado.

Nenhum candidato será apagado antes de uma busca de referências e testes de todas as rotas.

## Ordem exata da migração

1. Criar shell, componentes, page base e services centrais V102.
2. Validar Home sem alteração visual; retirar apenas conflitos globais com equivalência funcional.
3. Validar Buddy sem alteração visual; remover Auth/presença/notificações concorrentes.
4. Criar Profile público e editor; testar sessão, upload, catálogos e RLS existentes.
5. Migrar Team e links de perfis.
6. Migrar Streamers e decidir explicitamente a convivência entre poster vertical e arte Home 3:2.
7. Migrar Fórum em etapas: leitura → tópicos → respostas → reações/menções → edição/moderação.
8. Criar Live por streamer e isolar salas de chat.
9. Migrar Eventos e preparar contratos futuros sem schema fictício.
10. Migrar Regras, Ajuda e Contacto.
11. Migrar Mídia, Conquistas e Participe.
12. Migrar Loja.
13. Migrar Atualizações.
14. Corrigir gate e migrar Admin módulo a módulo.
15. Criar Moderator skeleton e autorização separada.
16. Auditar referências finais e somente então propor remoção dos legados.

## Critério para marcar uma página como migrada

- Carrega apenas o núcleo V102 e scripts específicos necessários.
- Zero `createClient` fora de `supabase-client.js`.
- Zero Auth, Presence, header ou navegação paralelos.
- Conteúdo real preservado.
- Sessão deslogada e autenticada testadas.
- Console sem erro relevante e sem 404.
- Testada em 1920, 1600, 1440, 1366, 1024, 768, 430, 390 e 360 px.
- Registro desta tabela atualizado com scripts restantes, testes e observações.

## Decisões necessárias antes da implementação visual

1. Streamers: a galeria atual aprovada é vertical 4:5, enquanto o novo pedido define arte Home 3:2. A proposta é manter cards da página em 4:5 e criar um asset/campo separado 3:2 para Home; não reutilizar a mesma imagem com crop destrutivo.
2. Perfil: preservar registos com mais de três jogos, mas limitar novas seleções a três, sem apagar escolhas antigas automaticamente.
3. Admin: remover `tl_admin_unlocked` somente quando o gate master/admin via sessão oficial estiver testado com contas reais.

## Alterações realizadas nesta fase

- Criada apenas a branch local `rebuild-v102`.
- Criado este documento de auditoria/migração.
- Nenhuma página, schema, RLS ou dado foi alterado nesta fase.
- Nenhum commit, push, merge ou deploy foi realizado.

## Progresso de implementação — 23/08/2026

| Página | Estado atual | Legado funcional preservado | Testes locais |
|---|---|---|---|
| Home | Core V102 migrado, visual preservado | `script-v89` e chat/conteúdo v92 | HTTP 200, sintaxe, visual deslogado 1366 |
| Buddy | Core V102 migrado | services Buddy aprovados | HTTP 200, sintaxe, visual deslogado 1366 |
| Profile/Profile Edit | Implementados | tabelas/RPC/bucket existentes | HTTP 200, sintaxe, gates deslogados |
| Team | Core V102 migrado | UI `team-public-v92.js` | HTTP 200, sintaxe, visual 1366 |
| Streamers | Core V102 migrado | cards `streamer-public-v86.js` | HTTP 200, sintaxe, visual 1366 |
| Fórum | Integração V102 migrada | mecânica integral `forum-board-v2.js` | HTTP 200, sintaxe, visual deslogado 1366 |
| Eventos/Live | Core V102 migrado | conteúdo e live/chat existentes | HTTP 200 e sintaxe |
| Regras/Ajuda/Contacto | Shell V102 migrada | conteúdo existente | HTTP 200 |
| Mídia/Conquistas/Participe | Shell/Auth V102 migrados | módulos de negócio existentes | HTTP 200 e sintaxe |
| Loja/Atualizações | Core V102 migrado | catálogo/updates existentes | HTTP 200 e sintaxe |
| Admin | Gate por PermissionService | módulos internos preservados | sintaxe; teste autenticado pendente |
| Moderator | Skeleton separado criado | — | HTTP 200 e sintaxe |

### Testes autenticados pendentes

OAuth Google, upload real de avatar, matriz por conta/cargo, Fórum autenticado, Buddy realtime entre duas sessões e Admin autenticado exigem sessões reais no navegador. Não são declarados como aprovados pelos testes headless.

### Requer revisão

- A Home ainda contém o lobby/chat geral do layout atual, mas o briefing também pede para não o reintroduzir. Removê-lo altera uma página golden e requer decisão visual explícita.
- O editor interno do Fórum permanece para compatibilidade funcional, embora os destinos normais já usem o editor global. A remoção exige teste autenticado completo do Fórum.
