TEAM LAMBRETA — V92.39.4.4

FOCO DESTA VERSÃO
- Som de mensagem Buddy carregado globalmente em todas as páginas principais.
- O sino ligado toca uma vez por mensagem recebida; desligado apenas contabiliza.
- Estado Ocupado/Busy silencia o som, mantendo contador e aviso visual.
- Botão "Testar som" na página Buddy para confirmar permissão/caminho do áudio.
- Pedido de Buddy reversível: tocar em "Solicitado" cancela o pedido.
- Perfil mostra ações conforme a relação real (Adicionar, Cancelar, Aceitar, Conversar/Remover).
- No próprio perfil aparece apenas "Editar perfil" (editor completo fica para o passo seguinte).
- Ícones principais do Buddy refeitos em SVG vetorial.
- Seletor visual de Buddies ao clicar em adicionar pessoas à conversa.
- Presença básica real com last_seen_at: online, away, ocupado e offline.

SQL OBRIGATÓRIO DESTA VERSÃO
Execute no Supabase SQL Editor:
  database/sql-history/team_lambreta_v92_39_4_4_presence.sql

ÁUDIO LOCAL
  assets/sounds/buddy-message.wav

OBSERVAÇÃO SOBRE SEGUNDO PLANO
Enquanto o navegador mantém a página ativa, o listener global pode tocar o som em qualquer página.
No iPhone/Android, o sistema pode suspender páginas minimizadas para economizar bateria. Para som garantido
com o navegador realmente suspenso/fechado será necessária uma futura etapa PWA + Web Push.

TESTE RECOMENDADO
1. Execute o SQL acima.
2. Entre com duas contas, PC e telemóvel.
3. No telemóvel, abra Buddy e ative o sino da conta do PC.
4. Toque em "Testar som". Deve tocar o WAV local.
5. Vá para Home, Fórum ou outra página e envie uma mensagem pelo PC.
6. Confirme: badge + toast + som.
7. Desative o sino e envie outra: badge/toast continuam, sem som.
8. Envie pedido Buddy; toque novamente em "Solicitado" para cancelar.
