V92.23 — CORREÇÃO DE CARREGAMENTO DOS STREAMERS

- Corrige regressão da V92.22 que podia deixar a página vazia com “0 perfis ativos”.
- O perfil fixo do INK31 é renderizado imediatamente.
- Os perfis cadastrados são carregados depois pelo Supabase.
- Se a conexão atrasar ou falhar, a página preserva o conteúdo já exibido.
- Mantém as notificações, o mobile sem scroll lateral e a correção da Área de live.
