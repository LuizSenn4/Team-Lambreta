(() => {
  'use strict';

  const loadCss = (selector, href, dataKey) => {
    if (document.querySelector(selector)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (dataKey) link.dataset[dataKey] = 'true';
    document.head.appendChild(link);
  };
  const loadScript = (selector, src, dataKey) => {
    if (document.querySelector(selector)) return;
    const script = document.createElement('script');
    script.src = src;
    if (dataKey) script.dataset[dataKey] = 'true';
    document.body.appendChild(script);
  };

  loadCss('link[data-tl-theme]', 'theme-v1.css?v=1.2', 'tlTheme');
  loadCss('link[data-tl-light-polish]', 'theme-light-polish-v2.css?v=2.0', 'tlLightPolish');
  loadCss('link[data-tl-tour]', 'tour-v1.css?v=1.2', 'tlTour');
  loadScript('script[data-tl-tour]', 'tour-v1.js?v=1.4', 'tlTour');
  loadScript('script[data-tl-member-mention-preview]', 'member-mention-preview-v1.js?v=1.1', 'tlMemberMentionPreview');

  const systemTheme = () => matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const storedTheme = localStorage.getItem('tl_theme');
  const savedTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : systemTheme();
  const applyTheme = value => {
    const resolved = value === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = resolved;
  };
  applyTheme(savedTheme);

  if (typeof window.normalizeChatName !== 'function') {
    window.normalizeChatName = name => String(name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  if (!document.getElementById('tl-header-compact-v1')) {
    const style = document.createElement('style');
    style.id = 'tl-header-compact-v1';
    style.textContent = `
      .chat-head h2{position:static;margin:4px 0 0;width:auto;max-width:100%;text-align:left;font-family:Cinzel,serif;color:var(--gold);line-height:1.15;transform:none;white-space:normal}
      .tl-enter-toggle>input,.tl-chat-remember input{width:1px!important;height:1px!important}
      .tl-menu-link[data-updates-new] b{margin-left:3px;color:#73ff18;font-size:8px;letter-spacing:.03em}

      .tl-header-actions{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;flex:0 0 auto!important;margin-left:2px!important;white-space:nowrap!important}
      .tl-theme-icons{display:inline-flex!important;align-items:center!important;gap:2px!important;padding:3px!important;margin:0!important;border:1px solid rgba(217,164,65,.34)!important;border-radius:10px!important;background:rgba(9,8,6,.92)!important;box-sizing:border-box!important}
      .tl-theme-icon{appearance:none!important;display:grid!important;place-items:center!important;width:27px!important;height:27px!important;min-width:27px!important;min-height:27px!important;padding:0!important;margin:0!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#bfb39a!important;font:700 15px/1 system-ui!important;cursor:pointer!important}
      .tl-theme-icon:hover,.tl-theme-icon:focus-visible{color:#fff0a8!important;background:rgba(217,164,65,.10)!important;outline:none!important}
      .tl-theme-icon.is-active{color:#ffe06a!important;background:rgba(217,164,65,.15)!important;box-shadow:inset 0 0 0 1px rgba(217,164,65,.30),0 0 7px rgba(217,164,65,.10)!important}

      .tl-admin-key-mini{display:none;place-items:center;width:25px;height:25px;min-width:25px;min-height:25px;padding:0;margin:0;border:0;border-radius:8px;background:transparent;color:#d5ad3e;text-decoration:none;opacity:.72;cursor:pointer;transition:opacity .16s ease,background .16s ease,color .16s ease,transform .16s ease}
      .tl-admin-key-mini.is-visible{display:grid}
      .tl-admin-key-mini:hover,.tl-admin-key-mini:focus-visible{opacity:1;color:#ffe171;background:rgba(217,164,65,.10);transform:translateY(-1px);outline:none}
      .tl-admin-key-mini svg{width:16px;height:16px;fill:currentColor;filter:drop-shadow(0 0 3px rgba(217,164,65,.22))}

      html[data-theme="light"] .tl-theme-icons{background:#f4efe4!important;border-color:rgba(111,86,30,.34)!important}
      html[data-theme="light"] .tl-theme-icon{color:#5d584f!important}
      html[data-theme="light"] .tl-theme-icon.is-active{color:#966900!important;background:#fff7d8!important}
      html[data-theme="light"] .tl-admin-key-mini{color:#775918}

      @media(min-width:901px){
        .site-header.tl-header-v88{gap:10px!important;padding-left:clamp(12px,2vw,30px)!important;padding-right:clamp(12px,2vw,30px)!important}
        .tl-header-v88 .tl-main-nav{justify-content:flex-end!important;gap:clamp(5px,.65vw,10px)!important;flex-wrap:nowrap!important;white-space:nowrap!important;min-width:0!important}
        .tl-main-nav .tl-menu-link,.tl-main-nav .tl-menu-toggle{padding-left:1px!important;padding-right:1px!important;font-size:clamp(16px,1.25vw,21px)!important;white-space:nowrap!important}
        .tl-main-nav .tl-menu-toggle b{margin-left:4px!important}
      }

      @media(max-width:900px){
        .tl-header-actions{width:100%;justify-content:flex-start;margin:4px 0 0!important;padding:4px 2px 0;border-top:1px solid rgba(217,164,65,.12)}
        .tl-admin-key-mini{width:29px;height:29px;min-width:29px;min-height:29px}
      }
    `;
    document.head.appendChild(style);
  }

  const nav = document.getElementById('tlMainNav');
  const button = document.getElementById('tlMenuButton');
  const backdrop = document.getElementById('tlMenuBackdrop');
  if (!nav || !button || !backdrop || nav.dataset.navigationReady === 'true') return;

  nav.innerHTML = `
    <a class="tl-menu-link" href="home.html"><span>Início</span></a>
    <div class="tl-menu-group"><button class="tl-menu-toggle" type="button" aria-expanded="false"><span>Lambreta</span><b aria-hidden="true">⌄</b></button><div class="tl-submenu"><a href="team.html"><span>Team</span></a><a href="streamers.html"><span>Streamers</span></a></div></div>
    <div class="tl-menu-group"><button class="tl-menu-toggle" type="button" aria-expanded="false"><span>Comunidade</span><b aria-hidden="true">⌄</b></button><div class="tl-submenu"><a href="forum.html"><span>Fórum</span></a><a href="buddy.html"><span>Buddy</span></a><a href="atualizacoes.html"><span>Atualizações</span></a><a href="regras.html"><span>Regras</span></a><a href="ajuda.html"><span>Ajuda</span></a><a href="contacto.html"><span>Contacto</span></a></div></div>
    <div class="tl-menu-group"><button class="tl-menu-toggle" type="button" aria-expanded="false"><span>Destaques</span><b aria-hidden="true">⌄</b></button><div class="tl-submenu"><a href="eventos.html"><span>Eventos</span></a><a href="conquistas.html"><span>Conquistas</span></a><a href="midia.html"><span>Mídia</span></a></div></div>
    <a class="tl-menu-link" href="participe.html"><span>Participe</span></a>
    <a class="tl-menu-link" href="loja.html"><span>Loja</span></a>
    <div class="tl-header-actions">
      <div class="tl-theme-icons" role="group" aria-label="Escolher tema"><button class="tl-theme-icon" type="button" data-theme-choice="light" aria-label="Tema claro" title="Tema claro">☀</button><button class="tl-theme-icon" type="button" data-theme-choice="dark" aria-label="Tema escuro" title="Tema escuro">☾</button></div>
      <a class="tl-admin-key-mini" href="admin.html" aria-label="Admin" title="Admin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 13.7a5.7 5.7 0 1 1 4.9-2.8L22 11v3h-2v2h-2v2h-3.2l-3.4-3.4a5.7 5.7 0 0 1-3.2-.9Zm0-3.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg></a>
    </div>`;

  const themeButtons = [...nav.querySelectorAll('[data-theme-choice]')];
  const syncThemeButtons = value => themeButtons.forEach(el => {
    const active = el.dataset.themeChoice === value;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-pressed', String(active));
  });
  syncThemeButtons(savedTheme);
  themeButtons.forEach(el => el.addEventListener('click', () => {
    const value = el.dataset.themeChoice;
    localStorage.setItem('tl_theme', value);
    applyTheme(value);
    syncThemeButtons(value);
  }));

  const revealAdminKey = async () => {
    const key = nav.querySelector('.tl-admin-key-mini');
    if (!key) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const sb = window.teamSupabase;
      if (!sb) { if (tries > 50) clearInterval(timer); return; }
      clearInterval(timer);
      try {
        const {data:{session}} = await sb.auth.getSession();
        if (!session?.user?.id) return;
        const {data} = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        const role = String(data?.role || '').trim().toLowerCase();
        if (['master','dev','developer','owner','boss','admin','administrador'].includes(role)) key.classList.add('is-visible');
      } catch (_) {}
    }, 120);
  };
  revealAdminKey();

  const updatesLink = nav.querySelector('a[href="atualizacoes.html"]');
  if (updatesLink && localStorage.getItem('tl_seen_update_2026.08.16') !== '1') {
    updatesLink.dataset.updatesNew = 'true';
    updatesLink.querySelector('span')?.insertAdjacentHTML('beforeend', ' <b aria-label="Novidade">• NOVO</b>');
  }
  const currentPage = decodeURIComponent(location.pathname.split('/').pop() || 'home.html');
  nav.querySelectorAll('a[href]').forEach(link => link.classList.toggle('is-current', link.getAttribute('href') === currentPage));
  nav.dataset.navigationReady = 'true';

  let inboxAttempts = 0;
  const loadInbox = () => {
    if (window.TLUserInboxLoaded || document.querySelector('script[src*="user-inbox-v96.js"]')) return true;
    if (!window.supabase) return false;
    const s = document.createElement('script'); s.src = 'user-inbox-v96.js?v=96.0'; s.defer = true; document.body.appendChild(s); return true;
  };
  if (!loadInbox()) {
    const inboxWait = setInterval(() => { inboxAttempts += 1; if (loadInbox() || inboxAttempts >= 40) clearInterval(inboxWait); }, 250);
  }

  const mobile = matchMedia('(max-width: 900px)');
  const groups = [...nav.querySelectorAll('.tl-menu-group')];
  let previousFocus = null;
  const setGroup = (group, open) => { group.classList.toggle('is-open', open); group.querySelector('.tl-menu-toggle')?.setAttribute('aria-expanded', String(open)); };
  const closeGroups = except => groups.forEach(group => group !== except && setGroup(group, false));
  const setMenu = open => {
    const active = Boolean(open && mobile.matches);
    if (active) previousFocus = document.activeElement;
    nav.classList.toggle('is-mobile-open', active); button.classList.toggle('is-open', active);
    button.setAttribute('aria-expanded', String(active)); button.setAttribute('aria-label', active ? 'Fechar menu' : 'Abrir menu');
    backdrop.hidden = !active; document.body.classList.toggle('tl-mobile-menu-open', active);
    if (active) nav.querySelector('a,button')?.focus({preventScroll:true}); else { closeGroups(); if (previousFocus === button) button.focus({preventScroll:true}); }
  };
  button.setAttribute('aria-controls', 'tlMainNav'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-label', 'Abrir menu'); backdrop.hidden = true;
  button.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); setMenu(!nav.classList.contains('is-mobile-open')); });
  backdrop.addEventListener('click', () => setMenu(false));
  groups.forEach(group => {
    const toggle = group.querySelector('.tl-menu-toggle'); if (!toggle) return;
    toggle.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const open = !group.classList.contains('is-open'); closeGroups(open ? group : null); setGroup(group, open); });
    group.addEventListener('mouseenter', () => { if (!mobile.matches) { closeGroups(group); setGroup(group, true); } });
    group.addEventListener('mouseleave', () => { if (!mobile.matches) setGroup(group, false); });
  });
  nav.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('pointerdown', e => { if (!mobile.matches && !nav.contains(e.target)) closeGroups(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setMenu(false);
    if (e.key === 'Tab' && nav.classList.contains('is-mobile-open')) {
      const focusable = [...nav.querySelectorAll('a[href],button:not([disabled])')].filter(el => el.offsetParent !== null); if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener?.('change', () => setMenu(false));
  window.addEventListener('pageshow', () => setMenu(false));
})();