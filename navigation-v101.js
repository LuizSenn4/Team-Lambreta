(() => {
  'use strict';
  if (window.__TL_SHELL_V101__) return;
  window.__TL_SHELL_V101__ = true;

  /*
    TEAM LAMBRETA SHELL V101 — OFICIAL
    -----------------------------------
    Shell único das páginas migradas.
    - um cliente Supabase: window.teamSupabase
    - uma sessão: TeamAuth
    - uma presença: TeamPresence
    - cache visual de identidade para impedir flash de avatar/nick ao navegar
    - Admin completo somente master/admin
    - Ver perfil e Editar perfil são ações distintas
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
  const CACHE_KEY = 'tl_identity_cache_v101';
  const CACHE_TTL = 45 * 60 * 1000;

  const header = document.querySelector('.site-header');
  if (!header) return;

  let session = null;
  let profile = null;
  let forumProfile = null;
  let cachedIdentity = null;
  let presenceSubscribed = false;
  let bootVersion = 0;

  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (parsed && parsed.name && (!parsed.expiresAt || parsed.expiresAt > Date.now())) cachedIdentity = parsed;
  } catch (_) {}

  const cachedName = cachedIdentity?.name || 'Entrar';
  const cachedRole = cachedIdentity?.role || 'member';
  const cachedAvatar = cachedIdentity?.avatar || '';

  header.className = 'site-header tl-header-v100 tl-header-v101';
  header.innerHTML = `
    <a href="home.html" class="brand brand-logo-link" aria-label="Team Lambreta — página inicial">
      <img class="brand-logo-image" src="img/team-lambreta-header-logo.svg" alt="Team Lambreta">
    </a>
    <button id="tlMenuButton" class="tl-mobile-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div id="tlMenuBackdrop" class="tl-mobile-menu-backdrop" hidden></div>
    <nav id="tlMainNav" class="tl-main-nav" aria-label="Menu principal">
      <a href="home.html">Home</a><a href="team.html">Team</a><a href="forum.html">Fórum</a><a href="streamers.html">Streamers</a><a href="eventos.html">Eventos</a><a href="loja.html">Loja</a>
      <div class="tl-menu-group"><button class="tl-menu-toggle" type="button" aria-expanded="false">Mais <b>⌄</b></button><div class="tl-submenu"><a href="buddy.html">Buddy</a><a href="regras.html">Regras</a><a href="ajuda.html">Ajuda</a><a href="contacto.html">Contacto</a><a href="midia.html">Mídia</a><a href="conquistas.html">Conquistas</a><a href="participe.html">Participe</a><a href="atualizacoes.html">Atualizações</a></div></div>
    </nav>
    <div class="tl-user-cluster" data-shell-hydrated="${cachedIdentity ? '1' : '0'}" style="${cachedIdentity ? '' : 'opacity:0;pointer-events:none'}">
      <div class="tl-status-wrap"><button class="tl-status-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><i class="tl-presence-dot offline"></i><span>Offline</span></button><div class="tl-dropdown tl-status-menu" role="menu" hidden><button data-presence="online"><i class="tl-presence-dot online"></i>Online</button><button data-presence="busy"><i class="tl-presence-dot busy"></i>Ocupado</button><button data-presence="away"><i class="tl-presence-dot away"></i>Ausente</button></div></div>
      <div class="tl-user-wrap"><button class="tl-account-trigger" type="button" aria-haspopup="menu" aria-expanded="false">${cachedAvatar ? `<img class="tl-user-avatar" src="${esc(cachedAvatar)}" alt="Avatar de ${esc(cachedName)}">` : `<span class="tl-user-avatar" data-avatar-fallback>${esc(String(cachedName).slice(0,2).toUpperCase() || 'TL')}</span>`}<span class="tl-account-copy"><strong>${esc(cachedName)}</strong><small>${esc(roleLabel(cachedRole))}</small></span><span class="tl-account-chevron">⌄</span></button><div class="tl-dropdown tl-account-menu" role="menu" hidden></div></div>
      <a class="tl-header-icon" href="buddy.html" aria-label="Abrir Buddy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><b id="tlHeaderUnread" hidden>0</b></a>
    </div>`;

  const nav = header.querySelector('#tlMainNav');
  const menuButton = header.querySelector('#tlMenuButton');
  const backdrop = header.querySelector('#tlMenuBackdrop');
  const statusButton = header.querySelector('.tl-status-trigger');
  const statusMenu = header.querySelector('.tl-status-menu');
  const accountButton = header.querySelector('.tl-account-trigger');
  const accountMenu = header.querySelector('.tl-account-menu');
  const userCluster = header.querySelector('.tl-user-cluster');
  const mobile = matchMedia('(max-width:900px)');

  const currentPage = decodeURIComponent(location.pathname.split('/').pop() || 'home.html');
  nav.querySelectorAll('a[href]').forEach(link => link.classList.toggle('is-current', link.getAttribute('href') === currentPage));

  const revealCluster = () => {
    userCluster.dataset.shellHydrated = '1';
    userCluster.style.opacity = '';
    userCluster.style.pointerEvents = '';
  };

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
  const presenceManager = () => window.TeamPresence || null;

  function displayName() {
    return forumProfile?.forum_nickname || profile?.game_nickname_public || profile?.game_nickname || profile?.full_name || session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.full_name || session?.user?.email || cachedIdentity?.name || 'Entrar';
  }

  async function resolvedAvatar() {
    if (!session) return '';
    if (forumProfile?.avatar_external_url) return forumProfile.avatar_external_url;
    if (profile?.custom_avatar_url) return profile.custom_avatar_url;
    if (forumProfile?.avatar_path && sb) {
      try {
        const { data } = await sb.storage.from('forum-avatars').createSignedUrl(forumProfile.avatar_path, 3600);
        if (data?.signedUrl) return data.signedUrl;
      } catch (_) {}
    }
    return profile?.avatar_url || session.user?.user_metadata?.avatar_url || '';
  }

  function fallbackNode(name) {
    const node = document.createElement('span');
    node.className = 'tl-user-avatar';
    node.dataset.avatarFallback = '';
    node.textContent = String(name || 'TL').slice(0,2).toUpperCase();
    return node;
  }

  function replaceAvatar(url, name) {
    const old = header.querySelector('.tl-account-trigger > .tl-user-avatar');
    if (!old) return;
    if (!url) {
      if (old.tagName === 'SPAN') {
        old.textContent = String(name || 'TL').slice(0,2).toUpperCase();
        return;
      }
      old.replaceWith(fallbackNode(name));
      return;
    }
    if (old.tagName === 'IMG' && old.getAttribute('src') === url) return;
    const img = document.createElement('img');
    img.className = 'tl-user-avatar';
    img.alt = `Avatar de ${name}`;
    img.src = url;
    img.addEventListener('error', () => img.replaceWith(fallbackNode(name)), { once:true });
    old.replaceWith(img);
  }

  function paintStatus(next) {
    const status = next || 'offline';
    statusButton.querySelector('i').className = `tl-presence-dot ${status}`;
    statusButton.querySelector('span').textContent = statusLabel(status);
  }

  async function login() {
    try { await (await authManager()).signInWithGoogle(); }
    catch (error) { console.error('[SHELL V101] login', error?.message || error); }
  }

  async function logout() {
    try {
      cachedIdentity = null;
      localStorage.removeItem(CACHE_KEY);
      await (await authManager()).signOut();
    } catch (error) { console.error('[SHELL V101] logout', error?.message || error); }
  }

  function cacheIdentity(name, role, avatar) {
    cachedIdentity = { name, role:normalizeRole(role), avatar:avatar || '', expiresAt:Date.now() + CACHE_TTL };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cachedIdentity)); } catch (_) {}
  }

  async function paintAccount() {
    const name = displayName();
    const role = session ? profile?.role : 'member';
    const copy = header.querySelector('.tl-account-copy');
    if (copy) {
      copy.querySelector('strong').textContent = name;
      copy.querySelector('small').textContent = session ? roleLabel(role) : 'MEMBRO';
    }

    let avatar = '';
    if (session) avatar = await resolvedAvatar();
    replaceAvatar(avatar, name);
    if (session) cacheIdentity(name, role, avatar);

    if (!session) {
      accountMenu.innerHTML = '<button type="button" data-login>Entrar com Google</button>';
      accountMenu.querySelector('[data-login]')?.addEventListener('click', login);
      revealCluster();
      return;
    }

    const uid = encodeURIComponent(session.user.id);
    accountMenu.innerHTML = `
      <a href="forum.html?profile=${uid}">Ver perfil</a>
      <a href="forum.html?profile=${uid}&edit=1">Editar perfil</a>
      ${isFullAdmin(role) ? '<a href="admin.html">Painel administrativo</a>' : ''}
      <button type="button" data-logout>Terminar sessão</button>`;
    accountMenu.querySelector('[data-logout]')?.addEventListener('click', logout);
    revealCluster();
  }

  statusMenu.querySelectorAll('[data-presence]').forEach(button => {
    button.addEventListener('click', async () => {
      await presenceManager()?.setManual(button.dataset.presence);
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
    const manager = presenceManager();

    if (!presenceSubscribed && manager) {
      presenceSubscribed = true;
      manager.subscribe(state => paintStatus(state.status));
    }

    if (!session) {
      profile = null;
      forumProfile = null;
      cachedIdentity = null;
      try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
      manager?.disconnect();
      paintStatus('offline');
      await paintAccount();
      window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail:{ session:null, profile:null } }));
      return;
    }

    const identity = await loadIdentity(session.user.id);
    if (version !== bootVersion) return;
    profile = identity.profile || {};
    forumProfile = identity.forumProfile || {};
    await manager?.connect(sb, session.user.id, profile?.presence);
    await paintAccount();
    window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail:{ session, profile, forumProfile } }));
  }

  async function refreshIdentity() {
    if (!session?.user?.id) return;
    const identity = await loadIdentity(session.user.id);
    profile = identity.profile || profile || {};
    forumProfile = identity.forumProfile || forumProfile || {};
    await paintAccount();
  }

  window.addEventListener('pageshow', () => { setMobile(false); refreshIdentity(); });
  document.addEventListener('tl:profile-updated', () => setTimeout(refreshIdentity, 80));

  authManager().then(auth => auth.subscribe(next => boot(next)))
    .catch(error => { console.error('[SHELL V101] auth', error?.message || error); revealCluster(); });
})();
