(() => {
  'use strict';

  const themeLink = document.querySelector('link[data-tl-theme]') || (() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'theme-v1.css?v=1.2';
    link.dataset.tlTheme = 'true';
    document.head.appendChild(link);
    return link;
  })();
  if (!document.querySelector('link[data-tl-light-polish]')) {
    const polishLink = document.createElement('link');
    polishLink.rel = 'stylesheet';
    polishLink.href = 'theme-light-polish-v2.css?v=2.0';
    polishLink.dataset.tlLightPolish = 'true';
    document.head.appendChild(polishLink);
  }
  if (!document.querySelector('script[data-tl-tour]')) {
    const tourScript = document.createElement('script');
    tourScript.src = 'tour-v1.js?v=1.4';
    tourScript.dataset.tlTour = 'true';
    document.body.appendChild(tourScript);
    const tourStyle = document.createElement('link');
    tourStyle.rel = 'stylesheet'; tourStyle.href = 'tour-v1.css?v=1.2'; tourStyle.dataset.tlTour = 'true';
    document.head.appendChild(tourStyle);
  }
  if (!document.querySelector('script[data-tl-member-mention-preview]')) {
    const mentionPreviewScript = document.createElement('script');
    mentionPreviewScript.src = 'member-mention-preview-v1.js?v=1.0';
    mentionPreviewScript.dataset.tlMemberMentionPreview = 'true';
    document.body.appendChild(mentionPreviewScript);
  }
  const savedTheme = localStorage.getItem('tl_theme') || 'system';
  const applyTheme = value => {
    const resolved = value === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : value;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = value;
  };
  applyTheme(savedTheme);

  /* V93.9.6 — patch de correção preservado sobre a versão atual.
     1) Normaliza nomes/nicks usados por cargos e moderação.
     2) Corrige o título do chat para não ficar absoluto/sobreposto em telas menores.
     3) Evita overflow horizontal causado por checkboxes visuais ocultos. */
  if (typeof window.normalizeChatName !== 'function') {
    window.normalizeChatName = function normalizeChatName(name) {
      return String(name || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    };
  }

  if (!document.getElementById('tl-v9396-chat-fix')) {
    const patchStyle = document.createElement('style');
    patchStyle.id = 'tl-v9396-chat-fix';
    patchStyle.textContent = `
      .chat-head h2 {
        position: static;
        margin: 4px 0 0;
        width: auto;
        max-width: 100%;
        text-align: left;
        font-family: Cinzel, serif;
        color: var(--gold);
        line-height: 1.15;
        transform: none;
        white-space: normal;
      }

      .tl-enter-toggle > input,
      .tl-chat-remember input {
        width: 1px !important;
        height: 1px !important;
      }

      .tl-menu-link[data-updates-new] b{margin-left:4px;color:#73ff18;font-size:9px;letter-spacing:.04em}
    `;
    document.head.appendChild(patchStyle);
  }

  const nav = document.getElementById('tlMainNav');
  const button = document.getElementById('tlMenuButton');
  const backdrop = document.getElementById('tlMenuBackdrop');
  if (!nav || !button || !backdrop || nav.dataset.navigationReady === 'true') return;

  const globalNavigation = `
    <a class="tl-menu-link" href="home.html"><span>Início</span></a>
    <div class="tl-menu-group">
      <button class="tl-menu-toggle" type="button" aria-expanded="false"><span>Lambreta</span><b aria-hidden="true">⌄</b></button>
      <div class="tl-submenu"><a href="team.html"><span>Team</span></a><a href="streamers.html"><span>Streamers</span></a></div>
    </div>
    <div class="tl-menu-group">
      <button class="tl-menu-toggle" type="button" aria-expanded="false"><span>Comunidade</span><b aria-hidden="true">⌄</b></button>
      <div class="tl-submenu"><a href="forum.html"><span>Fórum</span></a><a href="buddy.html"><span>Buddy</span></a><a href="atualizacoes.html"><span>Atualizações</span></a><a href="regras.html"><span>Regras</span></a><a href="ajuda.html"><span>Ajuda</span></a><a href="contacto.html"><span>Contacto</span></a></div>
    </div>
    <div class="tl-menu-group">
      <button class="tl-menu-toggle" type="button" aria-expanded="false"><span>Destaques</span><b aria-hidden="true">⌄</b></button>
      <div class="tl-submenu"><a href="eventos.html"><span>Eventos</span></a><a href="conquistas.html"><span>Conquistas</span></a><a href="midia.html"><span>Mídia</span></a></div>
    </div>
    <a class="tl-menu-link" href="participe.html"><span>Participe</span></a>
    <a class="tl-menu-link" href="loja.html"><span>Loja</span></a>
    <label class="tl-theme-control"><span>Tema</span><select id="tlThemeSelect" aria-label="Escolher tema"><option value="system">◐ Sistema</option><option value="light">☀ Claro</option><option value="dark">🌙 Escuro</option></select></label>`;

  nav.innerHTML = globalNavigation;
  const themeSelect = nav.querySelector('#tlThemeSelect');
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', () => { localStorage.setItem('tl_theme', themeSelect.value); applyTheme(themeSelect.value); });
  }
  const mediaTheme = matchMedia('(prefers-color-scheme: light)');
  mediaTheme.addEventListener?.('change', () => { if ((localStorage.getItem('tl_theme') || 'system') === 'system') applyTheme('system'); });
  const updatesLink = nav.querySelector('a[href="atualizacoes.html"]');
  if (updatesLink && localStorage.getItem('tl_seen_update_2026.08.16') !== '1') {
    updatesLink.dataset.updatesNew = 'true';
    updatesLink.querySelector('span').insertAdjacentHTML('beforeend', ' <b aria-label="Novidade">• NOVO</b>');
  }
  const currentPage = decodeURIComponent(location.pathname.split('/').pop() || 'home.html');
  nav.querySelectorAll('a[href]').forEach(link => {
    link.classList.toggle('is-current', link.getAttribute('href') === currentPage);
  });
  nav.dataset.navigationReady = 'true';

  let inboxAttempts = 0;
  const loadInbox = () => {
    if (window.TLUserInboxLoaded || document.querySelector('script[src*="user-inbox-v96.js"]')) return true;
    if (!window.supabase) return false;
    const inboxScript = document.createElement('script');
    inboxScript.src = 'user-inbox-v96.js?v=96.0';
    inboxScript.defer = true;
    document.body.appendChild(inboxScript);
    return true;
  };
  if (!loadInbox()) {
    const inboxWait = setInterval(() => {
      inboxAttempts += 1;
      if (loadInbox() || inboxAttempts >= 40) clearInterval(inboxWait);
    }, 250);
  }

  const mobile = window.matchMedia('(max-width: 900px)');
  const groups = [...nav.querySelectorAll('.tl-menu-group')];
  let previousFocus = null;

  const setGroup = (group, open) => {
    group.classList.toggle('is-open', open);
    group.querySelector('.tl-menu-toggle')?.setAttribute('aria-expanded', String(open));
  };
  const closeGroups = except => groups.forEach(group => group !== except && setGroup(group, false));
  const setMenu = open => {
    const active = Boolean(open && mobile.matches);
    if (active) previousFocus = document.activeElement;
    nav.classList.toggle('is-mobile-open', active);
    button.classList.toggle('is-open', active);
    button.setAttribute('aria-expanded', String(active));
    button.setAttribute('aria-label', active ? 'Fechar menu' : 'Abrir menu');
    backdrop.hidden = !active;
    document.body.classList.toggle('tl-mobile-menu-open', active);
    if (active) nav.querySelector('a,button')?.focus({preventScroll:true});
    else {
      closeGroups();
      if (previousFocus === button) button.focus({preventScroll:true});
    }
  };

  button.setAttribute('aria-controls', 'tlMainNav');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Abrir menu');
  backdrop.hidden = true;

  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    setMenu(!nav.classList.contains('is-mobile-open'));
  });
  backdrop.addEventListener('click', () => setMenu(false));

  groups.forEach(group => {
    const toggle = group.querySelector('.tl-menu-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const open = !group.classList.contains('is-open');
      closeGroups(open ? group : null);
      setGroup(group, open);
    });
    group.addEventListener('mouseenter', () => { if (!mobile.matches) { closeGroups(group); setGroup(group, true); } });
    group.addEventListener('mouseleave', () => { if (!mobile.matches) setGroup(group, false); });
  });

  nav.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('pointerdown', event => { if (!mobile.matches && !nav.contains(event.target)) closeGroups(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false);
    if (event.key === 'Tab' && nav.classList.contains('is-mobile-open')) {
      const focusable = [...nav.querySelectorAll('a[href],button:not([disabled])')].filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener?.('change', () => setMenu(false));
  window.addEventListener('pageshow', () => setMenu(false));
})();