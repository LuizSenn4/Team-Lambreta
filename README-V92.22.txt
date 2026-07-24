V92.22 — NOTIFICAÇÕES + MOBILE FIXO

Incluído:
- Service Worker para notificações no navegador.
- Botão "Ativar notificações" funcional no desktop e telemóvel compatível.
- Notificação de teste ao autorizar.
- Preferência salva no navegador.
- Página Streamers sem scroll horizontal no mobile.
- Blocos limitados à largura da tela.

Importante:
A base de Push está pronta, mas o aviso automático quando uma live começar ainda depende de ligar um serviço de envio/backend (por exemplo Supabase Edge Function + Web Push/VAPID). Sem essa etapa, o botão concede permissão e testa a notificação, mas não monitora lives sozinho.
