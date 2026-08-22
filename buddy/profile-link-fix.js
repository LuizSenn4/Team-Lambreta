(() => {
  'use strict';

  // Mantém a coluna de conversa presa ao shell do Buddy.
  const style = document.createElement('style');
  style.id = 'buddy-runtime-layout-fix-v100';
  style.textContent = `
    .buddy-conversation-v100 {
      min-height: 0 !important;
      overflow: hidden !important;
    }
    .buddy-chat-body {
      min-height: 0 !important;
      overflow: hidden !important;
    }
    .buddy-messages-v100 {
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
    }
    .buddy-composer {
      flex: 0 0 auto;
    }
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);

  const profileUrl = id => `forum.html?profile=${encodeURIComponent(id)}`;
  let profileOpenLocked = false;

  function openProfileOnce(id) {
    if (!id || profileOpenLocked) return;
    profileOpenLocked = true;

    // Chamada única. NÃO criar/clicar links programaticamente aqui,
    // pois isso pode voltar a disparar este mesmo listener em captura.
    window.open(profileUrl(id), '_blank', 'noopener,noreferrer');

    setTimeout(() => {
      profileOpenLocked = false;
    }, 900);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-view-profile]');
    if (button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openProfileOnce(button.dataset.viewProfile);
      return;
    }

    const link = event.target.closest?.('a[href^="forum.html?profile="]');
    if (!link) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const href = new URL(link.getAttribute('href'), window.location.href);
    openProfileOnce(href.searchParams.get('profile'));
  }, true);
})();
