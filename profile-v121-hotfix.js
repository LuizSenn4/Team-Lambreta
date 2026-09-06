(() => {
  'use strict';
  if (window.TeamProfileV121Hotfix) return;
  window.TeamProfileV121Hotfix = true;

  const MAX_STATUS = 26;
  const MAX_NICK = 16;

  const polish = () => {
    const root = document.getElementById('profileRoot');
    if (!root) return;

    const nick = root.querySelector('.p120-identity h1');
    if (nick && !nick.dataset.v121Done) {
      const full = (nick.textContent || '').replace(/\s+/g, ' ').trim();
      nick.title = full;
      if (full.length > MAX_NICK) nick.textContent = full.slice(0, MAX_NICK);
      nick.dataset.v121Done = '1';
    }

    const status = root.querySelector('.p120-identity > p');
    if (status && !status.dataset.v121Done) {
      const full = (status.textContent || '').replace(/\s+/g, ' ').trim();
      status.title = full;
      status.textContent = full.slice(0, MAX_STATUS) || 'Sem status definido';
      status.setAttribute('aria-label', `Status: ${status.textContent}`);
      status.dataset.v121Done = '1';
    }

    root.querySelectorAll('.p120-role').forEach(role => {
      const label = role.querySelector('b');
      if (!label) return;
      role.style.whiteSpace = 'nowrap';
      role.style.flexWrap = 'nowrap';
      if ((label.textContent || '').trim().toUpperCase() === 'DESENVOLVEDOR') {
        label.textContent = 'DEV';
        role.classList.add('is-developer');
        role.dataset.role = 'developer';
      }
    });

    root.querySelectorAll('.p120-game-media img').forEach(img => {
      if (img.dataset.v121Fallback) return;
      img.dataset.v121Fallback = '1';
      img.addEventListener('error', () => {
        const card = img.closest('.p120-game');
        const label = card?.querySelector('b')?.textContent?.trim();
        if (!label) return;
        const slug = label
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const next = `assets/game-covers/${slug}.webp`;
        if (!img.dataset.v121Retried && img.getAttribute('src') !== next) {
          img.dataset.v121Retried = '1';
          img.src = next;
        }
      });
    });
  };

  const observer = new MutationObserver(polish);
  const start = () => {
    const root = document.getElementById('profileRoot');
    if (!root) return setTimeout(start, 60);
    observer.observe(root, { childList: true, subtree: true });
    polish();
  };
  start();
})();
