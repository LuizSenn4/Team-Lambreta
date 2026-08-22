(() => {
  'use strict';

  // Mantém a coluna de conversa presa ao shell do Buddy.
  // Sem min-height:0 nos itens flex/grid, o histórico cresce para baixo,
  // empurra o composer para fora da box e dá a impressão de que as
  // mensagens novas não chegaram.
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

  function openProfile(id) {
    if (!id) return;
    const opened = window.open(profileUrl(id), '_blank', 'noopener,noreferrer');
    // Fallback para browsers que bloqueiem window.open mesmo num clique direto.
    if (!opened) {
      const link = document.createElement('a');
      link.href = profileUrl(id);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-view-profile]');
    if (button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openProfile(button.dataset.viewProfile);
      return;
    }

    const link = event.target.closest?.('a[href^="forum.html?profile="]');
    if (!link) return;

    // Todos os "VER PERFIL" dentro do Buddy abrem numa nova aba,
    // para não fechar a conversa atual.
    event.preventDefault();
    event.stopImmediatePropagation();
    const href = new URL(link.getAttribute('href'), window.location.href);
    const id = href.searchParams.get('profile');
    openProfile(id);
  }, true);
})();