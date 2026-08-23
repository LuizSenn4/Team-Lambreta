(() => {
  'use strict';
  if (window.__TL_FORUM_ROUTE_ACTIONS_V101__) return;
  window.__TL_FORUM_ROUTE_ACTIONS_V101__ = true;

  /*
    Adaptador temporário da migração v100/v101.
    O Fórum ainda usa o board legado, mas o header novo envia:
      forum.html?profile=<uid>          -> ver perfil público
      forum.html?profile=<uid>&edit=1   -> editar o próprio perfil

    Não cria editor novo. Reutiliza o botão [data-edit-profile] que o
    forum-board-v2.js só renderiza quando o perfil aberto pertence à sessão.
  */

  const query = new URLSearchParams(location.search);
  if (query.get('edit') !== '1' || !query.get('profile')) return;

  let attempts = 0;
  const MAX_ATTEMPTS = 100; // ~10 s

  const timer = setInterval(() => {
    attempts += 1;
    const button = document.querySelector('[data-edit-profile]');

    if (button) {
      clearInterval(timer);

      // Remove a ação efêmera da URL antes de abrir para impedir reabertura
      // após salvar/recarregar os dados do perfil.
      const clean = new URL(location.href);
      clean.searchParams.delete('edit');
      history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`);

      button.click();
      return;
    }

    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(timer);
      console.warn('[FORUM ROUTE] editor não disponível para este perfil/sessão');
    }
  }, 100);
})();
