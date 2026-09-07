(() => {
  'use strict';
  if (window.TeamProfileV121Hotfix) return;
  window.TeamProfileV121Hotfix = true;

  const MAX_STATUS = 72;
  const MAX_NICK = 16;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let privacyBusy = false;
  let editShortcutBusy = false;

  const normalizeGameKey = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const getContext = async () => {
    const session = await window.TeamAuth?.getSession?.();
    if (!session?.user) return { session:null, userId:'', own:false };
    const userId = new URLSearchParams(location.search).get('user') || session.user.id;
    return { session, userId, own:userId === session.user.id };
  };

  const privacyMarkup = current => {
    const options = [['public','Todos podem ver'],['friends','Apenas amigos'],['private','Só para mim']];
    return `<section class="p121-friend-privacy" aria-label="Privacidade dos amigos"><strong>PRIVACIDADE DOS AMIGOS</strong><div>${options.map(([value,label]) => `<button type="button" data-friends-privacy="${value}" class="${current===value?'is-active':''}" aria-pressed="${current===value?'true':'false'}">${label}</button>`).join('')}</div></section>`;
  };

  const privacyMessage = mode => mode === 'private' ? 'Lista de amigos privada.' : mode === 'friends' ? 'Lista de amigos visível apenas para amigos.' : '';

  async function ensureEditShortcut(root) {
    if (editShortcutBusy || root.querySelector('.p121-hero-edit')) return;
    const hero = root.querySelector('.p120-hero');
    if (!hero) return;
    editShortcutBusy = true;
    try {
      const { own } = await getContext();
      if (!own || root.querySelector('.p121-hero-edit')) return;
      const link = document.createElement('a');
      link.className = 'p121-hero-edit';
      link.href = 'profile-edit.html';
      link.setAttribute('aria-label', 'Editar perfil');
      link.setAttribute('title', 'Editar perfil');
      link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.2-1 10-10-3.2-3.2-10 10L4 20Z"/><path d="M13.8 7l3.2 3.2"/></svg>';
      hero.appendChild(link);
    } finally { editShortcutBusy = false; }
  }

  async function syncPrivacy(root) {
    const { userId, own } = await getContext();
    if (!userId || !window.TeamProfiles) return;
    let profile;
    try { profile = await window.TeamProfiles.getPublicProfile(userId, { fresh:true }); } catch { return; }
    const mode = ['public','friends','private'].includes(profile?.friends_visibility) ? profile.friends_visibility : 'public';
    const friends = root.querySelector('.p120-friends');
    if (!friends) return;
    if (own) {
      let box = root.querySelector('.p121-friend-privacy');
      if (!box) { friends.insertAdjacentHTML('afterend', privacyMarkup(mode)); box = root.querySelector('.p121-friend-privacy'); }
      box.querySelectorAll('[data-friends-privacy]').forEach(btn => {
        const active = btn.dataset.friendsPrivacy === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', async () => {
          if (privacyBusy) return;
          privacyBusy = true;
          const value = btn.dataset.friendsPrivacy;
          box.querySelectorAll('button').forEach(b => b.disabled = true);
          try {
            const result = await window.teamSupabase.rpc('tl_set_friends_visibility', { p_visibility:value });
            if (result.error) throw result.error;
            box.querySelectorAll('[data-friends-privacy]').forEach(x => {
              const selected = x.dataset.friendsPrivacy === value;
              x.classList.toggle('is-active', selected);
              x.setAttribute('aria-pressed', String(selected));
            });
            window.TeamProfiles?.clearCurrentCache?.();
          } catch (error) { console.error('[Profile privacy]', error); }
          finally { box.querySelectorAll('button').forEach(b => b.disabled = false); privacyBusy = false; }
        });
      });
    } else {
      root.querySelector('.p121-friend-privacy')?.remove();
      const message = privacyMessage(mode);
      if (message && !friends.querySelector('.p121-private-message')) {
        const track = friends.querySelector('.p120-friends-track');
        const empty = friends.querySelector('.p120-friends-empty');
        if (!track || !track.children.length) {
          track?.remove();
          if (empty) empty.textContent = message;
          else friends.insertAdjacentHTML('beforeend', `<div class="p120-friends-empty p121-private-message">${esc(message)}</div>`);
        }
      }
    }
  }

  function revealGameImages(host) {
    host.querySelectorAll('.p120-game-media img').forEach(img => {
      const reveal = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) reveal();
      else img.addEventListener('load', reveal, { once:true });
      img.addEventListener('error', () => img.classList.remove('is-loaded'), { once:true });
    });
  }

  async function syncGames(root) {
    const host = root.querySelector('.p120-games');
    if (!host || host.dataset.v121Synced === '1' || !window.TeamProfiles) return;
    const { userId } = await getContext();
    if (!userId) return;
    try {
      const [profile, catalog] = await Promise.all([window.TeamProfiles.getPublicProfile(userId, { fresh:true }), window.TeamProfiles.getCatalog()]);
      const games = catalog?.games || [];
      const catalogBySlug = new Map(games.map(g => [normalizeGameKey(g.slug), g]));
      const aliasMap = new Map();
      games.forEach(g => {
        [g.slug, g.name, g.short_name, ...(Array.isArray(g.aliases) ? g.aliases : [])].filter(Boolean).forEach(v => aliasMap.set(normalizeGameKey(v), g.slug));
      });
      const raw = [...(Array.isArray(profile?.games) ? profile.games : []), profile?.main_game].filter(Boolean);
      const chosen = [];
      const seen = new Set();
      raw.forEach(value => {
        const normalized = normalizeGameKey(value);
        const canonical = aliasMap.get(normalized) || normalized;
        if (!canonical || seen.has(canonical) || chosen.length >= 4) return;
        seen.add(canonical);
        chosen.push(canonical);
      });
      if (!chosen.length) return;
      host.innerHTML = chosen.map(slug => {
        const g = catalogBySlug.get(normalizeGameKey(slug)) || { slug, name:String(slug).replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) };
        const fileSlug = normalizeGameKey(g.slug || slug);
        return `<article class="p120-game"><div class="p120-game-media"><img src="assets/game-covers/${encodeURIComponent(fileSlug)}.webp" alt="Capa de ${esc(g.name)}" decoding="async" loading="lazy"><span>${esc(g.short_name || g.name || slug)}</span></div><b>${esc(g.name || slug)}</b></article>`;
      }).join('');
      revealGameImages(host);
      host.dataset.v121Synced = '1';
      const title = root.querySelector('[data-panel="games"] h2');
      if (title && title.lastChild) title.lastChild.textContent = ` JOGOS MAIS JOGADOS (${chosen.length})`;
    } catch (error) { console.error('[Profile games V121]', error); }
  }

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
    if (presence) { presence.hidden = true; presence.setAttribute('aria-hidden','true'); }
    const status = root.querySelector('.p120-identity > p');
    if (status && !status.dataset.v121Done) {
      const full = (status.textContent || '').replace(/\s+/g, ' ').trim();
      const clean = full.slice(0, MAX_STATUS) || 'Sem status definido';
      status.title = clean; status.textContent = clean; status.setAttribute('aria-label', `Status: ${clean}`); status.dataset.v121Done = '1';
    }
    root.querySelectorAll('.p120-role').forEach(role => {
      const label = role.querySelector('b'); if (!label) return;
      role.style.whiteSpace='nowrap'; role.style.flexWrap='nowrap';
      if ((label.textContent || '').trim().toUpperCase() === 'DESENVOLVEDOR') { label.textContent='DEV'; role.classList.add('is-developer'); role.dataset.role='developer'; }
    });
    const edit = root.querySelector('.p120-edit');
    if (edit) { edit.querySelector('span')?.remove(); edit.setAttribute('aria-label','Editar perfil'); edit.setAttribute('title','Editar perfil'); edit.classList.add('is-icon-only'); }
    const standaloneFacts = Array.from(root.children).find(node => node.classList?.contains('p120-facts'));
    standaloneFacts?.remove();
    root.querySelectorAll('.p120-game.is-empty').forEach(card => card.remove());
    ensureEditShortcut(root); syncGames(root); syncPrivacy(root);
  };

  const observer = new MutationObserver(polish);
  const start = () => {
    const root = document.getElementById('profileRoot');
    if (!root) return setTimeout(start, 60);
    observer.observe(root, { childList:true,subtree:true });
    polish();
  };
  start();
})();
