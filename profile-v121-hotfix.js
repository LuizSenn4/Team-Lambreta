(() => {
  'use strict';
  if (window.TeamProfileV121Hotfix) return;
  window.TeamProfileV121Hotfix = true;

  const MAX_STATUS = 72;
  const MAX_NICK = 16;
  const PRIVACY_KEY = 'tl_friends_privacy_v1';

  const privacyValue = () => {
    try { return localStorage.getItem(PRIVACY_KEY) || 'public'; } catch { return 'public'; }
  };
  const setPrivacy = value => {
    try { localStorage.setItem(PRIVACY_KEY, value); } catch {}
  };

  const privacyMarkup = () => {
    const current = privacyValue();
    const options = [
      ['public', 'Todos podem ver'],
      ['friends', 'Apenas amigos'],
      ['private', 'Só para mim']
    ];
    return `<section class="p121-friend-privacy" aria-label="Privacidade dos amigos">
      <strong>PRIVACIDADE DOS AMIGOS</strong>
      <div>${options.map(([value,label]) => `<button type="button" data-friends-privacy="${value}" class="${current===value?'is-active':''}" aria-pressed="${current===value?'true':'false'}">${label}</button>`).join('')}</div>
    </section>`;
  };

  const bindPrivacy = root => {
    root.querySelectorAll('[data-friends-privacy]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const value = btn.dataset.friendsPrivacy;
        setPrivacy(value);
        root.querySelectorAll('[data-friends-privacy]').forEach(x => {
          const active = x.dataset.friendsPrivacy === value;
          x.classList.toggle('is-active', active);
          x.setAttribute('aria-pressed', String(active));
        });
      });
    });
  };

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

    const presence = root.querySelector('.p120-presence');
    if (presence) {
      presence.hidden = true;
      presence.setAttribute('aria-hidden', 'true');
    }

    const status = root.querySelector('.p120-identity > p');
    if (status && !status.dataset.v121Done) {
      const full = (status.textContent || '').replace(/\s+/g, ' ').trim();
      const clean = full.slice(0, MAX_STATUS) || 'Sem status definido';
      status.title = clean;
      status.textContent = clean;
      status.setAttribute('aria-label', `Status: ${clean}`);
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

    const edit = root.querySelector('.p120-edit');
    if (edit) {
      edit.querySelector('span')?.remove();
      edit.setAttribute('aria-label', 'Editar perfil');
      edit.setAttribute('title', 'Editar perfil');
      edit.classList.add('is-icon-only');
    }

    // JOGOS | REDES | PERFIL: facts ficam somente dentro da aba PERFIL.
    const standaloneFacts = Array.from(root.children).find(node => node.classList?.contains('p120-facts'));
    standaloneFacts?.remove();

    // Não desenhar slot vazio: o perfil suporta ATÉ quatro jogos.
    root.querySelectorAll('.p120-game.is-empty').forEach(card => card.remove());

    // Tenta a capa local pelo slug original e depois pelo nome normalizado.
    root.querySelectorAll('.p120-game-media img').forEach(img => {
      if (img.dataset.v121Fallback) return;
      img.dataset.v121Fallback = '1';
      img.addEventListener('error', () => {
        const card = img.closest('.p120-game');
        const label = card?.querySelector('b')?.textContent?.trim();
        if (!label) return;
        const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const next = `assets/game-covers/${slug}.webp`;
        if (!img.dataset.v121Retried && img.getAttribute('src') !== next) {
          img.dataset.v121Retried = '1';
          img.src = next;
        }
      });
    });

    const friends = root.querySelector('.p120-friends');
    if (friends && !root.querySelector('.p121-friend-privacy')) {
      friends.insertAdjacentHTML('afterend', privacyMarkup());
    }
    bindPrivacy(root);
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
