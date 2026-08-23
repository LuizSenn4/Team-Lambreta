(() => {
  'use strict';
  if (window.TeamShell) return;

  if (!document.querySelector('link[href*="tl-shell-v102.css"]')) {
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'tl-shell-v102.css?v=102.0'; style.dataset.tlShellV102 = 'true'; document.head.appendChild(style);
  }

  const auth = window.TeamAuth;
  const profiles = window.TeamProfiles;
  const permissions = window.TeamPermissions;
  const presence = window.TeamPresence;
  const cachedProfile = profiles?.readLastCache() || null;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const statusLabel = value => ({ online:'Online', busy:'Ocupado', away:'Ausente', offline:'Offline' }[value] || 'Offline');
  let session = null;
  let profile = cachedProfile;
  let bootVersion = 0;
  let presenceBound = false;

  const header = document.querySelector('.site-header');
  if (!header) return;
  header.className = 'site-header tl-header-v100 tl-header-v102';
  header.innerHTML = `
    <a href="home.html" class="brand brand-logo-link" aria-label="Team Lambreta — página inicial"><img class="brand-logo-image" src="img/team-lambreta-header-logo.svg" alt="Team Lambreta"></a>
    <button class="tl-mobile-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="tl-mobile-menu-backdrop" hidden></div>
    <nav class="tl-main-nav" aria-label="Menu principal">
      <a href="home.html">Home</a><a href="team.html">Team</a><a href="forum.html">Fórum</a><a href="streamers.html">Streamers</a><a href="eventos.html">Eventos</a><a href="loja.html">Loja</a>
      <div class="tl-menu-group"><button class="tl-menu-toggle" type="button" aria-expanded="false">Mais <b>⌄</b></button><div class="tl-submenu"><a href="buddy.html">Buddy</a><a href="regras.html">Regras</a><a href="ajuda.html">Ajuda</a><a href="contacto.html">Contacto</a><a href="midia.html">Mídia</a><a href="conquistas.html">Conquistas</a><a href="participe.html">Participe</a><a href="atualizacoes.html">Atualizações</a></div></div>
    </nav>
    <div class="tl-user-cluster">
      <div class="tl-status-wrap"><button class="tl-status-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><i class="tl-presence-dot offline"></i><span>Offline</span></button><div class="tl-dropdown tl-status-menu" role="menu" hidden><button data-presence="online"><i class="tl-presence-dot online"></i>Online</button><button data-presence="busy"><i class="tl-presence-dot busy"></i>Ocupado</button><button data-presence="away"><i class="tl-presence-dot away"></i>Ausente</button></div></div>
      <div class="tl-user-wrap"><button class="tl-account-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span class="tl-user-avatar" data-avatar-fallback>${esc(profile?.avatar_fallback || 'TL')}</span><span class="tl-account-copy"><strong>${esc(profile?.display_name || 'Entrar')}</strong><small>${esc(permissions?.roleLabel(profile?.role))}</small></span><span aria-hidden="true">⌄</span></button><div class="tl-dropdown tl-account-menu" role="menu" hidden></div></div>
      <a class="tl-header-icon" href="buddy.html" aria-label="Buddy e mensagens"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><b id="tlHeaderUnread" hidden>0</b></a>
    </div>`;

  const nav = header.querySelector('.tl-main-nav');
  const menuButton = header.querySelector('.tl-mobile-menu-button');
  const backdrop = header.querySelector('.tl-mobile-menu-backdrop');
  const statusButton = header.querySelector('.tl-status-trigger');
  const statusMenu = header.querySelector('.tl-status-menu');
  const accountButton = header.querySelector('.tl-account-trigger');
  const accountMenu = header.querySelector('.tl-account-menu');
  const mobile = matchMedia('(max-width:900px)');
  const current = location.pathname.split('/').pop() || 'home.html';
  nav.querySelectorAll('a').forEach(link => link.classList.toggle('is-current', link.getAttribute('href') === current));

  const setOpen = (button, menu, open) => { button.setAttribute('aria-expanded', String(open)); menu.hidden = !open; };
  const closeMenus = except => {
    if (except !== statusMenu) setOpen(statusButton, statusMenu, false);
    if (except !== accountMenu) setOpen(accountButton, accountMenu, false);
    nav.querySelectorAll('.tl-menu-group').forEach(group => { group.classList.remove('is-open'); group.querySelector('.tl-menu-toggle')?.setAttribute('aria-expanded', 'false'); });
  };
  const setMobile = open => {
    const active = Boolean(open && mobile.matches);
    nav.classList.toggle('is-mobile-open', active);
    backdrop.hidden = !active;
    menuButton.setAttribute('aria-expanded', String(active));
    document.body.classList.toggle('tl-mobile-menu-open', active);
  };
  statusButton.addEventListener('click', event => { event.stopPropagation(); const open = statusMenu.hidden; closeMenus(statusMenu); setOpen(statusButton, statusMenu, open); });
  accountButton.addEventListener('click', event => { event.stopPropagation(); const open = accountMenu.hidden; closeMenus(accountMenu); setOpen(accountButton, accountMenu, open); });
  nav.querySelector('.tl-menu-toggle').addEventListener('click', event => { event.stopPropagation(); const group = event.currentTarget.closest('.tl-menu-group'); const open = !group.classList.contains('is-open'); closeMenus(); group.classList.toggle('is-open', open); event.currentTarget.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('pointerdown', event => { if (!header.contains(event.target)) closeMenus(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenus(); setMobile(false); } });
  menuButton.addEventListener('click', () => setMobile(!nav.classList.contains('is-mobile-open')));
  backdrop.addEventListener('click', () => setMobile(false));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMobile(false)));

  function paintStatus(value) {
    const status = value || 'offline';
    statusButton.querySelector('i').className = `tl-presence-dot ${status}`;
    statusButton.querySelector('span').textContent = statusLabel(status);
  }
  function paintAvatar() {
    const old = header.querySelector('.tl-user-avatar');
    const name = profile?.display_name || 'TL';
    if (!old) return;
    if (profile?.avatar_display_url) {
      const image = document.createElement('img'); image.className = 'tl-user-avatar'; image.alt = `Avatar de ${name}`; image.src = profile.avatar_display_url;
      image.addEventListener('error', () => { image.replaceWith(makeFallback(name)); }, { once: true }); old.replaceWith(image);
    } else old.replaceWith(makeFallback(name));
  }
  function makeFallback(name) {
    const node = document.createElement('span'); node.className = 'tl-user-avatar'; node.dataset.avatarFallback = ''; node.textContent = String(name).slice(0, 2).toUpperCase(); return node;
  }
  async function paintAccount() {
    const copy = header.querySelector('.tl-account-copy');
    copy.querySelector('strong').textContent = profile?.display_name || session?.user?.email || 'Entrar';
    copy.querySelector('small').textContent = permissions?.roleLabel(profile?.role);
    paintAvatar();
    if (!session) {
      accountMenu.innerHTML = '<button type="button" data-login>Entrar com Google</button>';
      accountMenu.querySelector('[data-login]').addEventListener('click', () => auth.signInWithGoogle().catch(error => console.error('[AUTH] login', error.message)));
      return;
    }
    const admin = await permissions.can('admin.full');
    accountMenu.innerHTML = `<a href="profile.html?user=${encodeURIComponent(session.user.id)}">Ver perfil</a><a href="profile-edit.html">Editar perfil</a>${admin ? '<a href="admin.html">Painel administrativo</a>' : ''}<button type="button" data-logout>Terminar sessão</button>`;
    accountMenu.querySelector('[data-logout]').addEventListener('click', async () => { profiles.clearCurrentCache(); await auth.signOut(); });
  }
  async function boot(nextSession) {
    const version = ++bootVersion;
    session = nextSession || null;
    if (!session) {
      profile = null; presence?.disconnect(); paintStatus('offline'); await paintAccount();
      window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail: { session: null, profile: null } })); return;
    }
    const visual = profiles.readCurrentCache(session.user.id);
    if (visual) { profile = visual; await paintAccount(); }
    try { profile = await profiles.getCurrentProfile({ fresh: true }); } catch (error) { console.error('[PROFILE] shell', error.message); }
    if (version !== bootVersion) return;
    await permissions.refresh();
    await presence.connect(window.teamSupabase, session.user.id, profile?.presence);
    await paintAccount();
    window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail: { session, profile } }));
  }
  if (!presenceBound) { presenceBound = true; presence.subscribe(state => paintStatus(state.status)); }
  statusMenu.querySelectorAll('[data-presence]').forEach(button => button.addEventListener('click', async () => { await presence.setManual(button.dataset.presence); setOpen(statusButton, statusMenu, false); }));
  auth.subscribe(nextSession => boot(nextSession));

  const notificationScript = document.createElement('script');
  notificationScript.src = 'services/notification-service.js?v=102.0';
  notificationScript.dataset.tlNotifications = 'true';
  notificationScript.addEventListener('load', () => window.TeamNotifications?.subscribe(({ unread }) => {
    const badge = header.querySelector('#tlHeaderUnread');
    badge.hidden = !unread; badge.textContent = unread > 99 ? '99+' : String(unread || 0);
  }));
  if (!window.TeamNotifications && !document.querySelector('script[data-tl-notifications]')) document.body.appendChild(notificationScript);
  else window.TeamNotifications?.subscribe(({ unread }) => { const badge=header.querySelector('#tlHeaderUnread'); badge.hidden=!unread; badge.textContent=unread>99?'99+':String(unread||0); });

  window.TeamShell = Object.freeze({ getSession: () => session, getProfile: () => profile, refresh: () => boot(session) });
})();
