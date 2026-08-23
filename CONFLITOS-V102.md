# Auditoria final de conflitos V102

## `createClient(`

- `supabase-client.js`: ocorrência oficial e necessária.
- `auth-local-mobile-fix.js`: legado não carregado; candidato a remoção após aprovação.
- `buddy-global-notifications-v94.js`: legado não carregado pelas páginas migradas; substituído por `services/notification-service.js`.
- `buddy-v93.js`: legado não carregado; Buddy V100 usa services próprios.
- `forum-auth-v90.js`: legado não carregado por `forum.html`; a mecânica oficial atual é `forum-board-v2.js` com TeamAuth.

## `signInWithOAuth(`

- `auth-manager.js`: ocorrência oficial.
- `auth-local-mobile-fix.js`: legado não carregado.

## `onAuthStateChange(`

- `auth-manager.js`: ocorrência oficial.
- `forum-auth-v90.js`: legado não carregado.

## `forum.html?profile=`

- `legacy/profile-route-adapter.js`: aparece somente no comentário que documenta a rota compatível.
- `navigation-v100.js`: shell legado não carregado pelas páginas migradas.

## `admin=locked` / `tl_admin_unlocked`

Nenhuma ocorrência funcional restante após a migração. Admin usa TeamAuth e `TeamPermissions.can('admin.full')`.

## `navigation-v93` / `buddy-presence`

- Nenhuma página da lista V102 migrada carrega estes módulos.
- `membros.html` ainda carrega presença/notificações antigas. É uma rota histórica fora da lista de páginas V102 e deve ser retirada ou redirecionada depois de confirmar se ainda recebe tráfego.

## Comparações diretas de cargo

- `script-v89.js`: labels/classes de apresentação e compatibilidade de conteúdo antigo; não autoriza Admin V102.
- `supabase-integration-v92.js`: mapeamento visual de identidade do chat legado; permissões de moderação e Admin já consultam PermissionService.
- `team-admin-v92.js`: tratamento de lista textual de múltiplos cargos dos cards, não é gate de autorização.

## Legado mantido conscientemente

Os arquivos acima não foram apagados porque o pedido exige confirmar o último consumidor antes da remoção. Nenhum deles é carregado pelas páginas V102 migradas, salvo os módulos de negócio explicitamente documentados em `MIGRACAO-V102.md`.
