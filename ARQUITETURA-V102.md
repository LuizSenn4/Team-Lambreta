# Arquitetura Team Lambreta V102

## Regra central

Uma função global tem uma implementação oficial. As páginas consomem o core e não criam clientes, listeners de Auth, presença ou autorização próprios.

## Implementações oficiais

| Função | Implementação oficial | API global | Legado a remover após o último consumidor |
|---|---|---|---|
| Cliente Supabase | `supabase-client.js` | `window.teamSupabase` | fallbacks `createClient` históricos |
| Auth | `auth-manager.js` | `window.TeamAuth` | `auth-local-mobile-fix.js`, Auth de `forum-auth-v90.js` |
| Perfil | `services/profile-service.js` | `window.TeamProfiles` | perfil interno do Fórum |
| Perfil público | `profile.html?user=<UUID>` | — | `forum.html?profile=` |
| Editor | `profile-edit.html` | — | editor específico do Fórum |
| Permissões | `services/permission-service.js` | `window.TeamPermissions` | verificações de cargo espalhadas |
| Presença | `presence-manager.js` | `window.TeamPresence` | `buddy-presence-v95.js`, presença v89/v92 |
| Navegação | `tl-shell-v102.js` | `window.TeamShell` | `navigation-v100.js`, `navigation-v93.js` |
| Buddy | `buddy/friends-service.js`, `buddy/messages-service.js` | services Buddy | `buddy-v93.js` |
| Gate Admin | `admin-gate.js` + PermissionService | — | `tl_admin_unlocked`, `admin=locked` |

## Supabase e Auth

`supabase-client.js` é o único criador do cliente nas páginas V102. Usa chave publicável; nenhuma `service_role` é exposta. `auth-manager.js` é o único responsável pelo Google OAuth, origem dinâmica, callback, restauração/refresh da sessão, logout e `onAuthStateChange`.

## Perfil

O ProfileService combina `profiles` e `forum_profiles`, consulta `forum_game_catalog`, grava pelo RPC existente `tl_forum_save_profile_v2` e usa o bucket privado existente `forum-avatars`. O avatar guardado é prioritário; Google é fallback. O limite de três jogos é aplicado na UI e confirmado no RPC. Nenhuma migration foi necessária.

## Permissões

A matriz central define `admin.full`, `moderator.panel`, eventos, rankings, moderação de live/chat/Fórum e denúncias. Apenas Master/Admin possuem `admin.full`. Cache visual nunca autoriza; RLS/RPC permanecem a autoridade final.

## Presença

O PresenceManager gere Online, Ocupado, Ausente e Offline, atividade, heartbeat e Realtime. Ausente é automático após cinco minutos somente quando o estado manual é Online. Ocupado não vira Ausente.

## Shell e cache visual

`tl-shell-v102.js` gere header, navegação, conta, status, dropdowns, menu mobile e Buddy. O cache `tl_profile_cache_v102` guarda apenas identidade visual confirmada, tem validade limitada e é revalidado em background. Nunca participa em autorização.

O menu público oficial possui somente Home, Team, Fórum, Streamers e Eventos. Buddy é um atalho global junto ao perfil, nunca um item de navegação. O rodapé oficial expõe Suporte, Regras da Comunidade, Privacidade e Atualizações.

## Compatibilidade

`legacy/profile-route-adapter.js` redireciona temporariamente `forum.html?profile=<UUID>` para o perfil global. Remover quando a auditoria não encontrar mais links externos antigos.

## Proteção do Fórum

`forum-board-v2.js` continua a ser a mecânica aprovada. Apenas Auth/sessão e destinos de perfil foram adaptados. Tópicos, posts, formulários, RPCs, reações, pesquisa, edição, aprovação, XP e moderação não foram reescritos.
