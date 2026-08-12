(() => {
  'use strict';
  const nav = document.getElementById('tlMainNav');
  const button = document.getElementById('tlMenuButton');
  const backdrop = document.getElementById('tlMenuBackdrop');
  if (!nav || !button || !backdrop || nav.dataset.navigationReady === 'true') return;
  nav.dataset.navigationReady = 'true';

  if (!nav.querySelector('a[href="participe.html"]')) {
    const participate = document.createElement('a');
    participate.className = 'tl-menu-link';
    participate.href = 'participe.html';
    participate.innerHTML = '<span>Participe</span>';
    const store = nav.querySelector('a[href="loja.html"]');
    nav.insertBefore(participate, store || null);
  }

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
