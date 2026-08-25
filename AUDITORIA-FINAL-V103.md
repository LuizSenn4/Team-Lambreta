# Auditoria final V103 — integrações públicas

Data: 25 de agosto de 2026
Escopo: `home.html`, `team.html`, `forum.html`, `streamers.html`, `eventos.html`, `buddy.html`, `profile.html` e `profile-edit.html`.

## Responsabilidades globais

| Responsabilidade | Implementação oficial | Duplicidade encontrada | Ação |
|---|---|---|---|
| Supabase | `supabase-client.js` → `window.teamSupabase` | Nenhuma nas páginas auditadas | OK. A CDN fornece a biblioteca; somente o cliente oficial chama `createClient`. |
| Auth | `auth-manager.js` → `window.TeamAuth` | Nenhuma nas páginas auditadas | OK. Uma única chamada a `onAuthStateChange` e uma implementação de OAuth. |
| Presence | `presence-manager.js` → `window.TeamPresence` | Rotina auto-away de `script-v89.js` era carregada em Eventos | `script-v89.js` removido de Eventos. `community-progress-v938.js` mede atividade/XP, mas não escreve status e não é Presence concorrente. |
| Profile | `services/profile-service.js` → `window.TeamProfiles` | Nenhuma implementação concorrente ativa | OK. `profile-v102.js`, Buddy e shell consomem o serviço. |
| Permissions | `services/permission-service.js` → `window.TeamPermissions` | Nenhuma implementação concorrente ativa | OK. Cache visual não concede permissões. |
| Notifications | `services/notification-service.js` → `window.TeamNotifications` | Nenhuma nas páginas auditadas | OK. O shell carrega uma instância e o serviço encerra o canal anterior antes de reconectar. |
| Header/menu | `tl-shell-v102.js` + `tl-shell-v102.css` | Markup HTML antigo existe como bootstrap em quatro documentos, mas é substituído no mesmo nó, não cria segundo shell | Mantido temporariamente por segurança de no-JS/estrutura. Não há `navigation-v93` ou `navigation-v100` ativo nestas páginas. |
| Avatar/cache visual | `TeamProfiles` + `TeamVisualImages`; bootstrap visual do shell para a conta atual | Nenhum cache concorrente com autoridade | OK. `tl_profile_cache_v102` guarda identidade visual; `tl_visual_collections_v103` guarda coleções visuais, ambos sem autoridade. |
| Realtime | Serviço da funcionalidade proprietária | Nenhuma subscription duplicada comprovada | Buddy: um canal de relações, um de mensagens e um de typing. Team/Streamers: um canal público próprio. Fórum preservado. |
| CSS global | Design system + shell V102 | `style-v92.css` e `ui-core-v93.css` ainda fornecem layouts reais de Team/Fórum/Streamers/Eventos/Buddy | **Legacy mas necessário.** Retirá-los agora quebraria cards, timeline e board; não foi criado override adicional. |

## Assets por página

Legenda: **N** necessário, **LN** legacy mas necessário, **D** duplicado removido, **R** removível depois de migração visual.

### HOME

- **N:** `tl-shell-v102.css`, `tl-components-v102.css`, `tl-page-v102.css`, `home-v102.css`, `home-streamers-v102.css`.
- **N:** cliente/Auth/Presence/Profile/Permissions/Shell, `visual-image-service.js`, `home-v102.js`.
- Duplicidade ativa: nenhuma.

### TEAM

- **LN:** `style-v92.css`, `ui-core-v93.css` — cards, grelha e estruturas históricas ainda consumidas.
- **N:** `team-mobile-v99.css`, design/polish, modal/hero V102.
- **N:** core V102/V103, `team-public-v92.js`, `participation-v96.js`, modal e progresso.
- Duplicidade ativa: nenhuma; os nomes de versão são históricos, mas os módulos de negócio continuam necessários.

### FÓRUM

- **LN:** `style-v92.css`, `ui-core-v93.css` — base visual ainda usada pelo board aprovado.
- **N:** `forum-board-v2.css`, picker, design/polish/hero.
- **N:** core V102/V103, catálogo, adapter de rota de perfil, `forum-board-v2.js`, progresso.
- A mecânica do Fórum não foi alterada. O adapter é temporário e necessário para URLs antigas.

### STREAMERS

- **LN:** `style-v92.css`, `ui-core-v93.css` — seletores de cards/perfis ainda consumidos.
- **N:** design/polish, estilos de cards Home, galeria e hero.
- **N:** core V102/V103, imagens visuais, `streamer-public-v86.js`, progresso.
- Duplicidade ativa: nenhuma.

### EVENTOS

- **LN:** `style-v92.css`, `ui-core-v93.css` — timeline e cards atuais dependem destas regras.
- **N:** design/polish/hero, `data.js`, core V102/V103 e progresso.
- **D removido:** `script-v89.js` carregava chat local, Presence antigo, sliders, moderação e listeners sem relação com Eventos.
- **D removido:** `error-codes-v92.js` não tinha consumidor nesta página e adicionava um listener global de erro.
- **N novo:** `events-public-v103.js`, responsável somente pela renderização segura dos eventos estáticos; o check-in continua no serviço de progresso existente.

### BUDDY

- **LN:** `style-v92.css`, `ui-core-v93.css` — base global ainda usada; o layout funcional está em `buddy-v100.css`.
- **N:** core V102/V103, catálogo, ícones, FriendsService, MessagesService e BuddyApp.
- Realtime centralizado nos dois serviços do Buddy; nenhuma implementação antiga `buddy-v93`/`buddy-presence-v95` é carregada.

### PROFILE / PROFILE-EDIT

- **N:** shell/components/page/profile V102, core V102/V103, catálogo e `profile-v102.js`.
- Duplicidade ativa: nenhuma. Ambas as rotas usam o mesmo controller e ProfileService.

## Legacy que permanece

1. `style-v92.css` e `ui-core-v93.css`: permanecem em páginas cuja marcação funcional ainda usa os seus seletores. Remoção segura exige extrair os estilos efetivamente usados para módulos próprios e comparar visualmente; isso é migração CSS, não remoção de duplicidade global.
2. Nomes como `team-public-v92.js`, `streamer-public-v86.js`, `community-progress-v938.js` e `forum-board-v2.js`: a versão no nome é histórica. Eles não recriam Auth/Supabase/Presence e continuam sendo os módulos de negócio ativos.
3. `legacy/profile-route-adapter.js`: compatibilidade temporária para links antigos do Fórum; encaminha ao perfil oficial e não cria um segundo perfil.

## Critério de saída

- Uma única instância ativa de Supabase/Auth/Presence/Profile/Permissions/Shell.
- Nenhum `navigation-v93`, Auth antigo, Presence antigo ou `supabase-integration-v92.js` carregado nas oito páginas.
- Nenhuma alteração de schema, RLS ou dados.
- Fórum mantido integralmente.
