(() => {
  'use strict';
  if (window.__TL_FORUM_PROFILE_LOADER_V101__) return;
  window.__TL_FORUM_PROFILE_LOADER_V101__ = true;

  /*
    LOADER DE MIGRAÇÃO DO PERFIL V101
    ---------------------------------
    O Fórum ainda usa a página/board legado, então navigation-v93 carrega este
    adaptador. A lógica real de perfil fica somente em forum-profile-v101.js.
    Quando o Fórum for migrado para o shell novo, este loader pode ser removido.
  */

  if (!document.querySelector('link[data-forum-profile-v101]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'forum-profile-v101.css?v=101.1';
    link.dataset.forumProfileV101 = '1';
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[data-forum-profile-v101]')) {
    const script = document.createElement('script');
    script.src = 'forum-profile-v101.js?v=101.1';
    script.defer = true;
    script.dataset.forumProfileV101 = '1';
    document.body.appendChild(script);
  }
})();
