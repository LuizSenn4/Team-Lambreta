(() => {
  'use strict';
  if (window.__TL_SHELL_V101__) return;
  window.__TL_SHELL_V101__ = true;

  /*
    TEAM LAMBRETA SHELL V101 — OFICIAL
    -----------------------------------
    Este é o shell novo para páginas migradas.
    Responsável por: navegação, sessão, avatar, menu de conta, status e acesso Admin.

    Regras importantes:
    - usa somente window.teamSupabase + TeamAuth + TeamPresence;
    - não cria cliente Supabase paralelo;
    - Ver perfil e Editar perfil são ações diferentes;
    - painel Admin completo aparece somente para master/admin;
    - foto personalizada do Fórum/perfil tem prioridade sobre avatar Google;
    - páginas antigas serão migradas para este shell uma por vez.
  */

  const sb = window.teamSupabase || null;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normalizeRole = value => ({
    dev:'master', developer:'master', owner:'master', boss:'master',
    administrador:'admin', moderador:'moderator', mod:'moderator',
    apoiador:'supporter', support:'supporter', membro:'member', user:'member'
  }[String(value || '').trim().toLowerCase()] || String(value || 'member').trim().toLowerCase());
  const roleLabel = value => ({master:'DEV',admin:'ADMIN',staff:'STAFF',moderator:'MODERADOR',streamer:'STREAMER',vip:'VIP',supporter:'APOIADOR',member:'MEMBRO'}[normalizeRole(value)] || 'MEMBRO');
  const statusLabel = value => ({online:'Online',busy:'Ocupado',away:'Ausente',offline:'Offline'}[value] || 'Offline');
  const isFullAdmin = value => ['master','admin'].includes(normalizeRole(value));

  const header = document.querySelector('.site-header');
  if (!header) return;

  let session = null;
  let profile = null;
  let forumProfile = null;
  let presenceSubscribed = false;
  let bootVersion = 0;

  try {
    const cached = JSON.parse(localStorage.getItem('tl_profile_cache_v101') || 'null');
    if (cached) {
      profile = cached.profile || null;
      forumProfile = cached.forumProfile || null;
    }
  } catch (_) {}

  header.className = 'site-header tl-header-v100 tl-header-v101';
  header.innerHTML = `
    <a href="home.html" class="brand brand-logo-link" aria-label="Team Lambreta — página inicial">
      <img class="brand-logo-image" src="img/team-lambreta-header-logo.svg" alt="Team Lambreta">
    </a>
    <button id="tlMenuButton" class="tl-mobile-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div id="tlMenuBackdrop" class="tl-mobile-menu-backdrop" hidden></div>
    <nav id="tlMainNav" class="tl-main-nav" aria-label="Menu principal">
      <a href="home.html">Home</a>
      <a href="team.html">Team</a>
      <a href="forum.html">Fórum</a>
      <a href="streamers.html">Streamers</a>
      <a href="eventos.html">Eventos</a>
      <a href="loja.html">Loja</a>
      <div class="tl-menu-group">
        <button class="tl-menu-toggle" type="button" aria-expanded="false">Mais <b>⌄</b></button>
        <div class="tl-submenu">
          <a href="buddy.html">Buddy</a><a href="regras.html">Regras</a><a href="ajuda.html">Ajuda</a><a href="contacto.html">Contacto</a><a href="midia.html">Mídia</a><a href="conquistas.html">Conquistas</a><a href="participe.html">Participe</a><a href="atualizacoes.html">Atualizações</a>
        </div>
      </div>
    </nav>
    <div class="tl-user-cluster">
      <div class="tl-status-wrap">
        <button class="tl-status-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><i class="tl-presence-dot offline"></i><span>Offline</span></button>
        <div class="tl-dropdown tl-status-menu" role="menu" hidden>
          <button data-presence="online"><i class="tl-presence-dot online"></i>Online</button>
          <button data-presence="busy"><i class="tl-presence-dot busy"></i>Ocupado</button>
          <button data-presence="away"><i class="tl-presence-dot away"></i>Ausente</button>
        </div>
      </div>
      <div class="tl-user-wrap">
        <button class="tl-account-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
          <span class="tl-user-avatar" data-avatar-fallback>TL</span>
          <span class="tl-account-copy"><strong>Entrar</strong><small>MEMBRO</small></span>
          <span class="tl-account-chevron">⌄</span>
        </button>
        <div class="tl-dropdown tl-account-menu" role="menu" hidden></div>
      </div>
      <a class="tl-header-icon" href="buddy.html" aria-label="Abrir Buddy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><b id="tlHeaderUnread" hidden>0</b></a>
    </div>`;

  const nav = header.querySelector('#tlMainNav');
  const menuButton = header.querySelector('#tlMenuButton');
  const backdrop = header.querySelector('#tlMenuBackdrop');
  const statusButton = header.querySelector('.tl-status-trigger');
  const statusMenu = header.querySelector('.tl-status-menu');
  const accountButton = header.querySelector('.tl-account-trigger');
  const accountMenu = header.querySelector('.tl-account-menu');
  const mobile = matchMedia('(max-width:900px)');

  const currentPage = decodeURIComponent(location.pathname.split('/').pop() || 'home.html');
  nav.querySelectorAll('a[href]').forEach(link => link.classList.toggle('is-current', link.getAttribute('href') === currentPage));

  function setOpen(button, menu, open) {
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', String(Boolean(open)));
    menu.hidden = !open;
  }

  function closeFloating(except = null) {
    if (except !== statusMenu) setOpen(statusButton, statusMenu, false);
    if (except !== accountMenu) setOpen(accountButton, accountMenu, false);
    nav.querySelectorAll('.tl-menu-group').forEach(group => {
      group.classList.remove('is-open');
      group.querySelector('.tl-menu-toggle')?.setAttribute('aria-expanded', 'false');
    });
  }

  statusButton.addEventListener('click', event => {
    event.stopPropagation();
    const open = statusMenu.hidden;
    closeFloating(statusMenu);
    setOpen(statusButton, statusMenu, open);
  });

  accountButton.addEventListener('click', event => {
    event.stopPropagation();
    const open = accountMenu.hidden;
    closeFloating(accountMenu);
    setOpen(accountButton, accountMenu, open);
  });

  nav.querySelector('.tl-menu-toggle')?.addEventListener('click', event => {
    event.stopPropagation();
    const group = event.currentTarget.closest('.tl-menu-group');
    const open = !group.classList.contains('is-open');
    closeFloating();
    group.classList.toggle('is-open', open);
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) closeFloating();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeFloating();
      setMobile(false);
    }
  });

  function setMobile(open) {
    const active = Boolean(open && mobile.matches);
    nav.classList.toggle('is-mobile-open', active);
    backdrop.hidden = !active;
    menuButton.setAttribute('aria-expanded', String(active));
    document.body.classList.toggle('tl-mobile-menu-open', active);
  }
  menuButton.addEventListener('click', () => setMobile(!nav.classList.contains('is-mobile-open')));
  backdrop.addEventListener('click', () => setMobile(false));
  nav.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => setMobile(false)));
  mobile.addEventListener?.('change', () => setMobile(false));

  async function authManager() {
    if (window.TeamAuth) return window.TeamAuth;
    throw new Error('TeamAuth não carregado antes do shell v101.');
  }
  async function presenceManager() {
    return window.TeamPresence || null;
  }

  function displayName() {
    return forumProfile?.forum_nickname || profile?.game_nickname_public || profile?.game_nickname || profile?.full_name || session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.full_name || session?.user?.email || 'Entrar';
  }

  async function resolvedAvatar() {
    if (!session) return '';
    if (forumProfile?.avatar_external_url) return forumProfile.avatar_external_url;
    if (forumProfile?.avatar_path && sb) {
      try {
        const { data } = await sb.storage.from('forum-avatars').createSignedUrl(forumProfile.avatar_path, 3600);
        if (data?.signedUrl) return data.signedUrl;
      } catch (_) {}
    }
    return profile?.custom_avatar_url || profile?.avatar_url || session.user?.user_metadata?.avatar_url || '';
  }

  function avatarFallback(name) {
    const node = document.createElement('span');
    node.className = 'tl-user-avatar';
    node.dataset.avatarFallback = '';
    node.textContent = String(name || 'TL').slice(0, 2).toUpperCase();
    node.style.display = 'grid';
    node.style.placeItems = 'center';
    node.style.fontSize = '11px';
    node.style.fontWeight = '800';
    return node;
  }

  async function paintAvatar() {
    const old = header.querySelector('.tl-account-trigger > .tl-user-avatar');
    if (!old) return;
    const name = displayName();
    const url = await resolvedAvatar();
    if (!url) {
      old.replaceWith(avatarFallback(name));
      return;
    }
    const img = document.createElement('img');
    img.className = 'tl-user-avatar';
    img.alt = `Avatar de ${name}`;
    img.src = url;
    img.addEventListener('error', () => img.replaceWith(avatarFallback(name)), { once: true });
    old.replaceWith(img);
  }

  function paintStatus(next) {
    const status = next || 'offline';
    statusButton.querySelector('i').className = `tl-presence-dot ${status}`;
    statusButton.querySelector('span').textContent = statusLabel(status);
  }

  async function login() {
    try {
      const auth = await authManager();
      await auth.signInWithGoogle();
    } catch (error) {
      console.error('[SHELL V101] login', error?.message || error);
    }
  }

  async function logout() {
    try {
      const auth = await authManager();
      await auth.signOut();
      localStorage.removeItem('tl_profile_cache_v101');
    } catch (error) {
      console.error('[SHELL V101] logout', error?.message || error);
    }
  }

  async function paintAccount() {
    const copy = header.querySelector('.tl-account-copy');
    if (copy) {
      copy.querySelector('strong').textContent = displayName();
      copy.querySelector('small').textContent = session ? roleLabel(profile?.role) : 'MEMBRO';
    }
    await paintAvatar();

    if (!session) {
      accountMenu.innerHTML = '<button type="button" data-login>Entrar com Google</button>';
      accountMenu.querySelector('[data-login]')?.addEventListener('click', login);
      return;
    }

    const uid = encodeURIComponent(session.user.id);
    const adminItem = isFullAdmin(profile?.role) ? '<a href="admin.html">Painel administrativo</a>' : '';
    accountMenu.innerHTML = `
      <a href="forum.html?profile=${uid}">Ver perfil</a>
      <a href="forum.html?profile=${uid}&edit=1">Editar perfil</a>
      ${adminItem}
      <button type="button" data-logout>Terminar sessão</button>`;
    accountMenu.querySelector('[data-logout]')?.addEventListener('click', logout);
  }

  statusMenu.querySelectorAll('[data-presence]').forEach(button => {
    button.addEventListener('click', async () => {
      const manager = await presenceManager();
      await manager?.setManual(button.dataset.presence);
      setOpen(statusButton, statusMenu, false);
    });
  });

  async function loadIdentity(userId) {
    if (!sb || !userId) return { profile:null, forumProfile:null };
    const [base, forum] = await Promise.all([
      sb.from('profiles').select('id,game_nickname,game_nickname_public,full_name,role,custom_avatar_url,avatar_url,presence').eq('id', userId).maybeSingle(),
      sb.from('forum_profiles').select('user_id,forum_nickname,avatar_path,avatar_external_url').eq('user_id', userId).maybeSingle()
    ]);
    if (base.error) console.warn('[SHELL V101] profile', base.error.message);
    if (forum.error) console.warn('[SHELL V101] forum profile', forum.error.message);
    return { profile:base.data || null, forumProfile:forum.data || null };
  }

  async function boot(nextSession) {
    const version = ++bootVersion;
    session = nextSession || null;
    const manager = await presenceManager();

    if (!presenceSubscribed && manager) {
      presenceSubscribed = true;
      manager.subscribe(state => paintStatus(state.status));
    }

    if (!session) {
      profile = null;
      forumProfile = null;
      manager?.disconnect();
      paintStatus('offline');
      await paintAccount();
      window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail:{ session:null, profile:null } }));
      return;
    }

    const identity = await loadIdentity(session.user.id);
    if (version !== bootVersion) return;
    profile = identity.profile || profile || {};
    forumProfile = identity.forumProfile || forumProfile || {};

    try {
      localStorage.setItem('tl_profile_cache_v101', JSON.stringify({ profile, forumProfile }));
    } catch (_) {}

    await manager?.connect(sb, session.user.id, profile?.presence);
    await paintAccount();
    window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail:{ session, profile, forumProfile } }));
  }

  async function refreshIdentity() {
    if (!session?.user?.id) return;
    const identity = await loadIdentity(session.user.id);
    profile = identity.profile || profile || {};
    forumProfile = identity.forumProfile || forumProfile || {};
    try { localStorage.setItem('tl_profile_cache_v101', JSON.stringify({ profile, forumProfile })); } catch (_) {}
    await paintAccount();
  }

  window.addEventListener('pageshow', () => { setMobile(false); refreshIdentity(); });
  document.addEventListener('tl:profile-updated', () => setTimeout(refreshIdentity, 80));

  authManager().then(auth => {
    auth.subscribe(next => boot(next));
  }).catch(error => console.error('[SHELL V101] auth', error?.message || error));
})();
