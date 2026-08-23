(() => {
  'use strict';

  /*
    NAVEGACAO V93 — LEGADO EM MIGRACAO
    ----------------------------------
    Este ficheiro ainda e usado por paginas que nao foram migradas para o header v100.
    O acesso administrativo antigo por icone/chave foi REMOVIDO de proposito.
    O unico acesso Admin permitido deve vir do menu de conta do header v100.
    Nao reintroduzir .tl-admin-key / .tl-admin-key-mini aqui.
  */

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

  loadCss('link[data-tl-theme]', 'theme-v1.css?v=1.3', 'tlTheme');
  loadCss('link[data-tl-tour]', 'tour-v1.css?v=1.2', 'tlTour');
  loadScript('script[data-tl-tour]', 'tour-v1.js?v=1.4', 'tlTour');
  loadScript('script[data-tl-member-mention-preview]', 'member-mention-preview-v1.js?v=1.1', 'tlMemberMentionPreview');
  loadScript('script[data-tl-auth-profile-menu]', 'auth-profile-menu-v1.js?v=1.0', 'tlAuthProfileMenu');
  if (/home\.html$/i.test(location.pathname) || location.pathname === '/' || location.pathname === '') {
    loadScript('script[data-tl-home-profile-editor]', 'home-profile-editor-v1.js?v=1.0', 'tlHomeProfileEditor');
  }

  localStorage.setItem('tl_theme', 'dark');
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.dataset.themePreference = 'dark';

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
      @media(min-width:901px){
        .site-header.tl-header-v88{gap:12px!important;padding-left:clamp(14px,2vw,30px)!important;padding-right:clamp(14px,2vw,30px)!important;align-items:center!important}
        .tl-header-v88 .tl-main-nav{justify-content:center!important;align-items:center!important;align-self:center!important;gap:clamp(7px,.72vw,11px)!important;flex-wrap:nowrap!important;white-space:nowrap!important;min-width:0!important;height:44px!important}
        .tl-main-nav>.tl-menu-link,.tl-main-nav>.tl-menu-group>.tl-menu-toggle{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:40px!important;height:40px!important;padding:5px 2px!important;margin:0!important;font-size:clamp(18px,1.42vw,23px)!important;line-height:1!important;white-space:nowrap!important}
        .tl-main-nav .tl-menu-toggle b{margin-left:4px!important;line-height:1!important}
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
    <a class="tl-menu-link" href="loja.html"><span>Loja</span></a>`;

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