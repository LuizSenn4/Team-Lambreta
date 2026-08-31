(() => {
  'use strict';
  if (window.__TL_SHELL_V114__) return;
  window.__TL_SHELL_V114__ = true;

  const q = (s, root=document) => root.querySelector(s);
  const qa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentFile = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
  const currentKey = currentFile.startsWith('profile') ? 'profile'
    : currentFile.startsWith('forum') ? 'forum'
    : (currentFile.startsWith('stream') || currentFile.startsWith('live')) ? 'streamers'
    : (currentFile.startsWith('buddy') || currentFile.startsWith('chat')) ? 'chat'
    : 'home';
  let shellSession = null;
  let shellProfile = null;
  let presenceBound = false;

  const icons = {
    menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9h-6v-6H9v6H3Z"/></svg>',
    forum:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h6"/></svg>',
    streamers:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15"/></svg>',
    chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>'
  };

  function avatarUrl(profile){
    return window.TeamProfiles?.getAvatarUrl?.(profile)
      || profile?.avatar_display_url
      || profile?.avatar_external_url
      || profile?.custom_avatar_url
      || profile?.avatar_url
      || '';
  }

  function ensureStyle(){
    if (q('link[href*="tl-shell-v114.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'tl-shell-v114.css?v=114.1';
    document.head.appendChild(link);
  }

  function buildHeader(){
    const old = q('.tl114-header, .tl113-header, .site-header');
    const header = document.createElement('header');
    header.className = 'tl114-header';
    header.setAttribute('aria-label','Cabeçalho Team Lambreta');
    header.innerHTML = `
      <button class="tl114-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false">${icons.menu}</button>
      <a class="tl114-logo" href="home.html" aria-label="Team Lambreta — início"></a>
      <button class="tl114-account-button" type="button" aria-label="Abrir conta" aria-expanded="false">${icons.user}</button>
      <nav class="tl114-drawer" hidden aria-label="Menu principal">
        <a href="home.html">Home</a>
        <a href="team.html">Team</a>
        <a href="forum.html">Fórum</a>
        <a href="streamers.html">Streamers</a>
        <a href="eventos.html">Eventos</a>
        <a href="profile.html#profileSocial">Redes</a>
        <a href="profile.html">Perfil</a>
        <a href="buddy.html">Mensagens</a>
      </nav>
      <div class="tl114-account-menu" hidden></div>`;

    if (old) old.replaceWith(header);
    else {
      const host = q('.site-content') || q('.tl-profile-app-v106') || document.body;
      host.prepend(header);
    }

    const drawer = q('.tl114-drawer', header);
    const menuButton = q('.tl114-menu-button', header);
    const accountButton = q('.tl114-account-button', header);
    const accountMenu = q('.tl114-account-menu', header);

    qa('.tl114-drawer a', header).forEach(link => {
      const file = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
      link.classList.toggle('is-current', file === currentFile || (currentKey === 'streamers' && file === 'streamers.html') || (currentKey === 'profile' && file === 'profile.html'));
    });

    const setOpen = (button, panel, open) => {
      button.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    };
    const closeAll = () => {
      setOpen(menuButton, drawer, false);
      setOpen(accountButton, accountMenu, false);
    };

    menuButton.addEventListener('click', event => {
      event.stopPropagation();
      const open = drawer.hidden;
      closeAll();
      setOpen(menuButton, drawer, open);
    });
    accountButton.addEventListener('click', event => {
      event.stopPropagation();
      const open = accountMenu.hidden;
      closeAll();
      setOpen(accountButton, accountMenu, open);
    });
    header.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAll(); });
    qa('a', drawer).forEach(link => link.addEventListener('click', closeAll));
    return {accountButton,accountMenu};
  }

  function buildBottomNav(){
    qa('.tl113-bottom-nav,.tl114-bottom-nav').forEach(node => node.remove());
    const nav = document.createElement('nav');
    nav.className = 'tl114-bottom-nav';
    nav.setAttribute('aria-label','Navegação principal');
    nav.innerHTML = `
      <a href="home.html" data-key="home">${icons.home}<span>Home</span></a>
      <a href="forum.html" data-key="forum">${icons.forum}<span>Fórum</span></a>
      <a href="streamers.html" data-key="streamers">${icons.streamers}<span>Streamers</span></a>
      <a href="buddy.html" data-key="chat">${icons.chat}<span>Chat</span><b class="tl114-badge" data-tl114-unread hidden>0</b></a>
      <a href="profile.html" data-key="profile"><span class="tl114-nav-avatar" data-tl114-avatar><img alt="" decoding="async">${icons.user}</span><span>Perfil</span></a>`;
    document.body.appendChild(nav);
    document.body.classList.add('tl114-has-bottom-nav');
    qa('[data-key]', nav).forEach(link => link.classList.toggle('is-active', link.dataset.key === currentKey));
    return nav;
  }

  function paintAvatar(profile, accountButton, nav){
    const src = String(avatarUrl(profile) || '').trim();
    if (!src) {
      accountButton.innerHTML = icons.user;
      return;
    }
    accountButton.innerHTML = `<img src="${esc(src)}" alt="Avatar">`;
    const avatar = q('[data-tl114-avatar]', nav);
    const image = avatar?.querySelector('img');
    if (avatar && image) {
      image.onload = () => avatar.classList.add('has-photo');
      image.onerror = () => avatar.classList.remove('has-photo');
      image.src = src;
    }
  }

  function paintUnread(nav){
    const badge = q('[data-tl114-unread]', nav);
    if (!badge) return;
    const apply = value => {
      const count = Math.max(0, Number(value || 0));
      badge.hidden = count <= 0;
      badge.textContent = count > 99 ? '99+' : String(count);
    };
    try { apply(localStorage.getItem('tl_buddy_unread_count')); } catch { apply(0); }
    window.TeamNotifications?.subscribe?.(({unread}) => apply(unread));
  }

  async function hydrateAccount(accountButton, accountMenu, nav, suppliedSession){
    let session = suppliedSession;
    if (session === undefined) {
      try { session = await window.TeamAuth?.getSession?.(); } catch { session = null; }
    }
    shellSession = session || null;
    shellProfile = null;

    if (shellSession?.user) {
      try {
        shellProfile = await window.TeamProfiles?.getCurrentProfile?.({fresh:false})
          || await window.TeamProfiles?.getPublicProfile?.(shellSession.user.id,{fresh:false})
          || null;
      } catch {}
      paintAvatar(shellProfile, accountButton, nav);
      try { await window.TeamPresence?.connect?.(window.teamSupabase, shellSession.user.id, shellProfile?.presence); } catch {}
    } else {
      paintAvatar(null, accountButton, nav);
      try { window.TeamPresence?.disconnect?.(); } catch {}
    }

    const name = shellProfile?.display_name || shellSession?.user?.email || 'Visitante';
    const status = String(window.TeamPresence?.getState?.()?.status || shellProfile?.presence || 'offline').toLowerCase();
    accountMenu.innerHTML = `<div class="tl114-account-summary"><strong>${esc(name)}</strong><small><i class="tl114-presence ${esc(status)}"></i>${esc(status === 'online' ? 'Online' : status === 'busy' ? 'Ocupado' : status === 'away' ? 'Ausente' : 'Offline')}</small></div>`;
    if (shellSession?.user) {
      accountMenu.insertAdjacentHTML('beforeend','<a href="profile.html">Ver perfil</a><a href="profile-edit.html">Editar perfil</a><button type="button" data-tl114-logout>Sair</button>');
      q('[data-tl114-logout]', accountMenu)?.addEventListener('click', async () => {
        try { await window.TeamAuth?.signOut?.(); location.href='home.html'; } catch {}
      });
    } else {
      accountMenu.insertAdjacentHTML('beforeend','<button type="button" data-tl114-login>Entrar com Google</button>');
      q('[data-tl114-login]', accountMenu)?.addEventListener('click', () => window.TeamAuth?.signInWithGoogle?.());
    }

    window.dispatchEvent(new CustomEvent('tl:shell-ready',{detail:{version:'114.1',session:shellSession,profile:shellProfile}}));
  }

  function removeLegacyShellArtifacts(){
    qa('.tl-mobile-menu-backdrop,.tl-main-nav,.tl-user-cluster').forEach(node => {
      if (!node.closest('.tl114-header')) node.remove();
    });
    document.body.classList.remove('tl113-has-bottom-nav','tl-mobile-menu-open');
  }

  ensureStyle();
  removeLegacyShellArtifacts();
  const {accountButton,accountMenu} = buildHeader();
  const nav = buildBottomNav();
  paintUnread(nav);

  window.TeamShell = Object.freeze({
    version:'114.1',
    getSession:() => shellSession,
    getProfile:() => shellProfile,
    refresh:() => hydrateAccount(accountButton,accountMenu,nav)
  });

  if (!presenceBound && window.TeamPresence?.subscribe) {
    presenceBound = true;
    window.TeamPresence.subscribe(() => hydrateAccount(accountButton,accountMenu,nav,shellSession));
  }
  window.TeamAuth?.subscribe?.(session => hydrateAccount(accountButton,accountMenu,nav,session));
  hydrateAccount(accountButton,accountMenu,nav);
})();
