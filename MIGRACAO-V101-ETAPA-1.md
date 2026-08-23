# Team Lambreta — Migração V101 / Etapa 1 (HOME)

## Objetivo atual
Fechar completamente a HOME e o shell novo antes de reconstruir as outras páginas.

## Shell oficial das páginas migradas
Usar:
- `supabase-client.js`
- `auth-manager.js`
- `presence-manager.js`
- `navigation-v101.js`

Não criar clientes Supabase paralelos em páginas novas.

## Header / conta
Regras oficiais:
- o avatar personalizado do perfil/Fórum tem prioridade sobre a foto Google;
- a identidade visual é guardada temporariamente para impedir flash de `TL`/nome errado ao navegar;
- `Ver perfil` abre o perfil público;
- `Editar perfil` abre o editor real do próprio utilizador;
- `Painel administrativo` aparece somente para `master/admin`;
- STAFF/MODERADOR não usam o painel administrativo completo; terão painel próprio;
- status é controlado por `TeamPresence`;
- o ícone de chat abre o Buddy;
- não reintroduzir chave/ícone Admin solto no header.

## Editor de perfil
O editor atual do Fórum continua sendo a fonte de dados durante a migração.
A camada V101 organiza a interface assim:
- País: pesquisa existente;
- Jogos: pesquisa/autocomplete, máximo 3;
- Plataformas: pesquisa + lista vertical;
- Modos: pesquisa + lista vertical;
- opções roláveis, sem mural gigante de chips;
- salvar continua usando o fluxo real existente do Fórum/Supabase.

Arquivos V101:
- `forum-profile-v101.js`
- `forum-profile-v101.css`
- `forum-route-actions-v101.js` é apenas um loader temporário enquanto `forum.html` ainda estiver no sistema legado.

## Admin
Entrada oficial: menu da conta do shell V101.
`admin-gate.js` valida:
1. sessão real do Supabase;
2. cargo real em `profiles`;
3. libera somente `master/admin`.

Nunca autorizar por cache/localStorage visual.
Nunca voltar a usar `?admin=locked` ou chave administrativa antiga.

## Legado
`navigation-v93.js` ainda existe apenas porque páginas ainda não migradas dependem dele.
O acesso Admin antigo foi removido dele.
Não apagar scripts legados compartilhados sem confirmar quais páginas ainda usam.

## Ordem de migração
1. HOME / shell / perfil / Admin / status / Buddy — fechar e testar.
2. Salas dos streamers.
3. Demais etapas do mapa mestre, uma por vez.
4. Migrar páginas antigas para o shell V101 gradualmente.

## Regra de trabalho
Não avançar de etapa enquanto a atual não estiver funcional e aprovada visualmente.
