# Team Lambreta — códigos de diagnóstico

Os códigos abaixo são emitidos por `tl-diagnostics-v104.js`. Pesquise pelo código no console e no repositório. O payload inclui módulo, descrição, contexto técnico, erro original normalizado e timestamp.

| Código | Área | Significado | Causa provável | Onde investigar |
|---|---|---|---|---|
| `TL-NAV-001` | Navegação | Falha ao carregar destino interno | HTML ausente, resposta inválida ou navegação interrompida | `tl-shell-v102.js`, rota HTML e Network |
| `TL-IMG-001` | Imagens | Imagem crítica não carregou | URL inválida, asset ausente ou formato não suportado | HTML da página, `img/`, Storage e Network |
| `TL-IMG-003` | Imagens | Imagem dinâmica não carregou | URL do registro inválida, Storage indisponível ou CORS | `visual-image-service.js`, módulo da página e Storage |
| `TL-BANNER-001` | Banners | Configuração dos banners não pôde ser lida | LocalStorage inválido ou indisponível | `tl-banner-admin-v104.js` e Application Storage |
| `TL-BANNER-002` | Banners | Configuração não pôde ser guardada | Quota do navegador excedida ou Storage bloqueado | `tl-banner-admin-v104.js` e Application Storage |
| `TL-BANNER-003/004` | Banners | Formato ou tamanho inválido | Tipo não suportado ou arquivo acima de 2 MB | `tl-banner-admin-v104.js` e seletor de ficheiro |
| `TL-BANNER-005/006` | Banners | Imagem não pôde ser preparada | Leitura/canvas falhou ou proporção inadequada | `tl-banner-admin-v104.js` e imagem original |
| `TL-BANNER-007` | Banners | Fallback do slider usado | Configuração local inválida na Home | `home-v102.js` e Application Storage |
| `TL-BANNER-010` | Banners | Armazenamento local indisponível/erro ao abrir IndexedDB | IndexedDB bloqueado, indisponível ou não suportado | `tl-banner-storage-v104.js` e browser storage |
| `TL-BANNER-011` | Banners | Blob não pôde ser guardado | Falha de transação IndexedDB ou quota local | `tl-banner-storage-v104.js` |
| `TL-BANNER-012` | Banners | Imagem do banner não encontrada | Chave existe na configuração, mas Blob não existe | `home-v102.js` / IndexedDB |
| `TL-BANNER-013` | Banners | Erro ao ler/remover imagem persistida | Falha de transação ou carregamento do módulo de storage | `home-v102.js`, `tl-banner-admin-v104.js` |
| `TL-BANNER-014` | Banners | URL temporária não pôde ser criada/revogada | Blob inválido ou API URL indisponível | `tl-banner-storage-v104.js` |
| `TL-BANNER-015` | Banners | Falha ao carregar imagem do banner | URL/blob inválido, recurso corrompido ou bloqueado | `home-v102.js` e Network |
| `TL-AUTH-001` | Autenticação | Sessão não pôde ser restaurada | Storage bloqueado, token inválido ou indisponibilidade de Auth | `auth-manager.js` e painel Network/Auth |
| `TL-AUTH-002` | Autenticação | Login Google não iniciou | Redirect inválido, OAuth ou cliente indisponível | `auth-manager.js`, configuração OAuth e console |
| `TL-SUPA-001` | Supabase | SDK/cliente não inicializou | CDN indisponível, versão incompatível ou configuração ausente | `supabase-client.js` e request do SDK |
| `TL-SUPA-002` | Supabase | Consulta pública falhou | Rede, RLS, Data API ou schema cache | Módulo proprietário e resposta PostgREST |
| `TL-PRES-001` | Presence | Sincronização de presença falhou | Canal Realtime, sessão ou update de perfil | `presence-manager.js`, Realtime e tabela `profiles` |
| `TL-CHAT-001` | Chat | Canal/mensagem falhou | Realtime, permissão, sala ou sessão | serviços em `buddy/`, chat e RLS |
| `TL-FORUM-001` | Fórum | Operação do Fórum falhou | RPC, RLS, sessão ou dados inconsistentes | `forum-board-v2.js` e resposta Supabase |
| `TL-ADMIN-001` | Administração | Gate ou ação administrativa falhou | Permissão insuficiente, sessão ou RPC | `admin-gate.js`, `admin.js` e PermissionService |
| `TL-ASSET-001` | Assets/core | Código inválido ou falha não classificada | Chamada incorreta ao diagnóstico ou asset ausente | Payload completo e arquivo chamador |
| `TL-PERF-001` | Performance | Recurso duplicado ou bloqueio detectado | Preload redundante, cache incorreto ou inicialização repetida | Network, Performance e módulo proprietário |

## Uso

```js
TeamDiagnostics.error(
  'TL-IMG-003',
  'streamers',
  'Falha ao carregar imagem do streamer',
  { streamerId, url },
  error
);
```

Não registrar sucesso rotineiro. Use `error` para falhas que impedem uma função e `warn` para degradação recuperável.
