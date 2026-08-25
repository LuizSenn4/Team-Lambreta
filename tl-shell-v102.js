(() => {
  'use strict';
  if (window.TeamShell) return;

  if (!document.querySelector('link[href*="tl-shell-v102.css"]')) {
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'tl-shell-v102.css?v=102.6'; style.dataset.tlShellV102 = 'true'; document.head.appendChild(style);
  }

  const auth = window.TeamAuth;
  const profiles = window.TeamProfiles;
  const permissions = window.TeamPermissions;
  const presence = window.TeamPresence;
  const cachedProfile = profiles?.readLastCache() || null;
  const STATUS_VISUAL_CACHE_KEY = 'tl_presence_visual_v102';
  const STATUS_VISUAL_CACHE_TTL = 10 * 60 * 1000;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const statusLabel = value => ({ online:'Online', busy:'Ocupado', away:'Ausente', offline:'Offline', loading:'A ligar' }[value] || 'A ligar');
  const visualStatusAllowed = value => ['online', 'busy', 'away'].includes(value);
  const readVisualStatus = userId => {
    if (!userId) return '';
    try {
      const cached = JSON.parse(sessionStorage.getItem(STATUS_VISUAL_CACHE_KEY) || 'null');
      const fresh = cached && Date.now() - Number(cached.savedAt || 0) <= STATUS_VISUAL_CACHE_TTL;
      return cached?.userId === userId && fresh && visualStatusAllowed(cached.status) ? cached.status : '';
    } catch { return ''; }
  };
  const writeVisualStatus = (userId, status) => {
    if (!userId || !visualStatusAllowed(status)) return;
    try { sessionStorage.setItem(STATUS_VISUAL_CACHE_KEY, JSON.stringify({ userId, status, savedAt: Date.now() })); } catch {}
  };
  const clearVisualStatus = () => { try { sessionStorage.removeItem(STATUS_VISUAL_CACHE_KEY); } catch {} };
  const avatarUrl = value => { const raw=String(value||'');if(/^data:image\/(?:webp|png|jpeg);base64,/i.test(raw))return raw;try { const url=new URL(raw,location.href); return ['http:','https:'].includes(url.protocol)?url.href:''; } catch { return ''; } };
  const avatarKey = value => String(value?.avatar_external_url || value?.avatar_path || value?.custom_avatar_url || value?.avatar_url || value?.avatar_display_url || '').trim();
  const cachedAvatarUrl = avatarUrl(profiles?.getAvatarUrl(cachedProfile));
  const cachedAvatarKey = avatarKey(cachedProfile);
  const cachedUserId = String(cachedProfile?.user_id || cachedProfile?.id || '');
  const initialVisualStatus = readVisualStatus(cachedUserId) || 'loading';
  let session = null;
  let profile = cachedProfile;
  let roleConfirmed = false;
  let confirmedRole = '';
  let presenceConfirmed = false;
  let bootVersion = 0;
  let presenceBound = false;
  let avatarPaintVersion = 0;

  const header = document.querySelector('.site-header');
  if (!header) return;
  header.className = 'site-header tl-header-v100 tl-header-v102';
  header.innerHTML = `
    <a href="home.html" class="brand brand-logo-link" aria-label="Team Lambreta — página inicial"><img class="brand-logo-image" src="img/team-lambreta-header-logo.svg" alt="Team Lambreta"></a>
    <button class="tl-mobile-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="tl-mobile-menu-backdrop" hidden></div>
    <nav class="tl-main-nav" aria-label="Menu principal">
      <a href="home.html">Home</a><a href="team.html">Team</a><a href="forum.html">Fórum</a><a href="streamers.html">Streamers</a><a href="eventos.html">Eventos</a>
    </nav>
    <div class="tl-user-cluster">
      <div class="tl-status-wrap"><button class="tl-status-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><i class="tl-presence-dot ${initialVisualStatus}"></i><span>${statusLabel(initialVisualStatus)}</span></button><div class="tl-dropdown tl-status-menu" role="menu" hidden><button data-presence="online"><i class="tl-presence-dot online"></i>Online</button><button data-presence="busy"><i class="tl-presence-dot busy"></i>Ocupado</button></div></div>
      <div class="tl-user-wrap"><button class="tl-account-trigger" type="button" aria-haspopup="menu" aria-expanded="false">${cachedAvatarUrl?`<img class="tl-user-avatar" src="${esc(cachedAvatarUrl)}" data-avatar-key="${esc(cachedAvatarKey)}" alt="">`:'<span class="tl-user-avatar tl-avatar-skeleton" aria-hidden="true"></span>'}<span class="tl-account-copy"><strong>${esc(profile?.display_name || 'Entrar')}</strong><small class="tl-role-slot" aria-live="polite"></small></span><span aria-hidden="true">⌄</span></button><div class="tl-dropdown tl-account-menu" role="menu" hidden></div></div>
      <a class="tl-header-icon" href="buddy.html" aria-label="Abrir Buddy e mensagens"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" aria-hidden="true"><path d="M20.5 14.5a4 4 0 0 1-4 4H9l-5.5 3v-14a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z"/><path d="M8 9.5h8M8 13h5"/></svg><b id="tlHeaderUnread" hidden>0</b></a>
    </div>`;

  const initialAvatar=header.querySelector('img.tl-user-avatar');
  if(initialAvatar){
    const confirmInitialAvatar=()=>{initialAvatar.alt=`Avatar de ${profile?.display_name||'membro'}`;initialAvatar.dataset.avatarReady='true';};
    if(initialAvatar.complete&&initialAvatar.naturalWidth>0)confirmInitialAvatar();
    else initialAvatar.addEventListener('load',confirmInitialAvatar,{once:true});
    initialAvatar.addEventListener('error',event=>event.currentTarget.replaceWith(neutralAvatar()),{once:true});
  }

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

  const primaryPages = Object.freeze(['home.html', 'team.html', 'forum.html', 'streamers.html', 'eventos.html']);
  primaryPages.forEach(path => {
    if (path === current || document.querySelector(`link[rel="prefetch"][href="${path}"]`)) return;
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = path;
    prefetch.fetchPriority = 'low';
    prefetch.dataset.tlNavigationPrefetch = 'true';
    document.head.appendChild(prefetch);
  });

  let navigationPending = false;
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href, location.href);
    const destinationPage = destination.pathname.split('/').pop() || 'home.html';
    if (destination.origin !== location.origin || !primaryPages.includes(destinationPage) || destination.href === location.href || navigationPending) return;

    event.preventDefault();
    navigationPending = true;
    setMobile(false);
    closeMenus();

    const content = document.querySelector('.site-content > main');
    let navigationCommitted = false;
    const navigate = () => {
      if (navigationCommitted) return;
      navigationCommitted = true;
      location.assign(destination.href);
    };
    if (!content || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate();
      return;
    }

    document.documentElement.classList.add('tl-document-is-leaving');
    requestAnimationFrame(() => {
      const opacityTransition = content.getAnimations().find(animation => animation.transitionProperty === 'opacity');
      if (!opacityTransition) {
        navigate();
        return;
      }
      opacityTransition.finished.then(navigate, navigate);
    });
  });

  const footer = document.querySelector('.site-footer');
  if (footer) footer.innerHTML = `<nav class="tl-footer-nav" aria-label="Rodapé"><a href="suporte.html">Suporte</a><a href="regras.html">Regras da Comunidade</a><a href="privacidade.html">Privacidade</a><a href="atualizacoes.html">Atualizações</a></nav><p>© ${new Date().getFullYear()} Team Lambreta — Juntos somos mais fortes.</p>`;

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
  nav.querySelectorAll('.tl-menu-toggle').forEach(toggle => toggle.addEventListener('click', event => { event.stopPropagation(); const group = event.currentTarget.closest('.tl-menu-group'); const open = !group.classList.contains('is-open'); closeMenus(); group.classList.toggle('is-open', open); event.currentTarget.setAttribute('aria-expanded', String(open)); }));
  document.addEventListener('pointerdown', event => { if (!header.contains(event.target)) closeMenus(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenus(); setMobile(false); } });
  menuButton.addEventListener('click', () => setMobile(!nav.classList.contains('is-mobile-open')));
  backdrop.addEventListener('click', () => setMobile(false));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMobile(false)));

  function paintStatus(value) {
    const status = value || 'loading';
    statusButton.querySelector('i').className = `tl-presence-dot ${status}`;
    statusButton.querySelector('span').textContent = statusLabel(status);
  }
  function neutralAvatar() {
    const node=document.createElement('span');node.className='tl-user-avatar tl-avatar-skeleton';node.setAttribute('aria-hidden','true');return node;
  }
  async function paintAvatar({clear=false}={}) {
    const version=++avatarPaintVersion;
    const current=header.querySelector('.tl-user-avatar');
    const nextUrl=avatarUrl(profiles?.getAvatarUrl(profile));
    const nextKey=avatarKey(profile);
    if(!current)return;
    if(!nextUrl){if(clear&&current.tagName==='IMG')current.replaceWith(neutralAvatar());return;}
    if(current.tagName==='IMG'&&current.dataset.avatarKey===nextKey){
      if(current.dataset.avatarReady==='true'||current.naturalWidth>0)return;
      if(!current.complete&&current.src===nextUrl)return;
    }
    const preload=new Image();preload.decoding='async';
    const loaded=new Promise(resolve=>{preload.onload=()=>resolve(true);preload.onerror=()=>resolve(false);});
    preload.src=nextUrl;
    const imageReady=await Promise.race([loaded,new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);
    if(version!==avatarPaintVersion||!imageReady||!preload.naturalWidth)return;
    const active=header.querySelector('.tl-user-avatar');
    if(active?.tagName==='IMG'){
      active.classList.add('is-avatar-updating');
      active.src=nextUrl;active.dataset.avatarKey=nextKey;active.dataset.avatarReady='true';active.alt=`Avatar de ${profile?.display_name||'membro'}`;
      requestAnimationFrame(()=>active.classList.remove('is-avatar-updating'));
    }else{
      const image=document.createElement('img');image.className='tl-user-avatar is-avatar-entering';image.src=nextUrl;image.dataset.avatarKey=nextKey;image.dataset.avatarReady='true';image.alt=`Avatar de ${profile?.display_name||'membro'}`;
      active?.replaceWith(image);requestAnimationFrame(()=>image.classList.remove('is-avatar-entering'));
    }
  }
  async function paintAccount(options={}) {
    const copy = header.querySelector('.tl-account-copy');
    copy.querySelector('strong').textContent = profile?.display_name || session?.user?.email || 'Entrar';
    const roleSlot = copy.querySelector('.tl-role-slot');
    roleSlot.textContent = roleConfirmed ? permissions?.roleLabel(confirmedRole) : (!session ? 'MEMBRO' : '');
    roleSlot.classList.toggle('is-confirmed', roleConfirmed || !session);
    await paintAvatar(options);
    if (!session) {
      accountMenu.innerHTML = '<button type="button" data-login>Entrar com Google</button>';
      accountMenu.querySelector('[data-login]').addEventListener('click', () => auth.signInWithGoogle().catch(error => console.error('[AUTH] login', error.message)));
      return;
    }
    const admin = roleConfirmed ? await permissions.can('admin.full') : false;
    accountMenu.innerHTML = `<a href="profile.html?user=${encodeURIComponent(session.user.id)}">Ver perfil</a><a href="profile-edit.html">Editar perfil</a>${admin ? '<a href="admin.html">Painel administrativo</a>' : ''}<button type="button" data-logout>Terminar sessão</button>`;
    accountMenu.querySelector('[data-logout]').addEventListener('click', async () => { profiles.clearCurrentCache(); await auth.signOut(); });
  }
  async function boot(nextSession) {
    const version = ++bootVersion;
    session = nextSession || null;
    if (!session) {
      profile = null; roleConfirmed=false; confirmedRole=''; presenceConfirmed=true; clearVisualStatus(); presence?.disconnect(); paintStatus('offline'); await paintAccount({clear:true});
      window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail: { session: null, profile: null } })); return;
    }
    presenceConfirmed=false;
    const carriedStatus = readVisualStatus(session.user.id);
    paintStatus(carriedStatus || 'loading');
    const visual = profiles.readCurrentCache(session.user.id);
    roleConfirmed=false; confirmedRole='';
    if (visual) { profile = visual; await paintAccount(); }
    else { profile=null; await paintAccount({clear:true}); }
    try { profile = await profiles.getCurrentProfile({ fresh: true }); } catch (error) { console.error('[PROFILE] shell', error.message); }
    if (version !== bootVersion) return;
    await permissions.refresh();
    roleConfirmed=true;
    confirmedRole=permissions.getRole();
    await presence.connect(window.teamSupabase, session.user.id, profile?.presence);
    presenceConfirmed=true;
    const presenceState=presence.getState();
    paintStatus(presenceState.status);
    writeVisualStatus(session.user.id, presenceState.status);
    await paintAccount();
    window.dispatchEvent(new CustomEvent('tl:shell-ready', { detail: { session, profile } }));
  }
  if (!presenceBound) {
    presenceBound = true;
    presence.subscribe(state => {
      if (state.status === 'offline' && !presenceConfirmed) return;
      paintStatus(state.status);
      if (session) writeVisualStatus(session.user.id, state.status);
    });
  }
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
