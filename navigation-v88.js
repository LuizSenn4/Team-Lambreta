(() => {
  'use strict';

  const nav = document.getElementById('tlMainNav');
  const menuButton = document.getElementById('tlMenuButton');
  const backdrop = document.getElementById('tlMenuBackdrop');

  if (!nav || !menuButton || !backdrop) return;

  const groups = [...nav.querySelectorAll('.tl-menu-group')];
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  let touchEffectTimer = 0;

  const isMobile = () => mobileQuery.matches;

  function setGroup(group, open) {
    group.classList.toggle('is-open', open);
    group.querySelector('.tl-menu-toggle')
      ?.setAttribute('aria-expanded', String(open));
  }

  function closeGroups(except = null) {
    groups.forEach(group => {
      if (group !== except) setGroup(group, false);
    });
  }

  function setMobileMenu(open) {
    const active = Boolean(open && isMobile());
    nav.classList.toggle('is-mobile-open', active);
    menuButton.classList.toggle('is-open', active);
    menuButton.setAttribute('aria-expanded', String(active));
    menuButton.setAttribute('aria-label', active ? 'Fechar menu' : 'Abrir menu');
    backdrop.hidden = !active;
    document.body.classList.toggle('tl-mobile-menu-open', active);

    if (!active) closeGroups();
  }

  function portugalTouchEffect(element) {
    document.querySelectorAll('.is-portugal-active')
      .forEach(item => item.classList.remove('is-portugal-active'));

    element.classList.add('is-portugal-active');
    window.clearTimeout(touchEffectTimer);
    touchEffectTimer = window.setTimeout(
      () => element.classList.remove('is-portugal-active'),
      650
    );
  }

  function pixelBurst(element) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = element.getBoundingClientRect();
    const colors = ['#046a38','#da291c','#d9a441','#f7f1df'];

    for (let index = 0; index < 12; index += 1) {
      const pixel = document.createElement('i');
      pixel.className = 'tl-pixel-burst-v88';
      pixel.style.left = `${rect.left + rect.width / 2}px`;
      pixel.style.top = `${rect.top + rect.height / 2}px`;
      pixel.style.setProperty('--size', `${3 + Math.random() * 4}px`);
      pixel.style.setProperty('--pixel', colors[index % colors.length]);
      pixel.style.setProperty('--dx', `${(Math.random() - .5) * 72}px`);
      pixel.style.setProperty('--dy', `${(Math.random() - .5) * 44}px`);
      document.body.appendChild(pixel);
      pixel.addEventListener('animationend', () => pixel.remove(), { once:true });
    }
  }

  menuButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    setMobileMenu(!nav.classList.contains('is-mobile-open'));
  });

  backdrop.addEventListener('click', () => setMobileMenu(false));

  groups.forEach(group => {
    const toggle = group.querySelector('.tl-menu-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const willOpen = !group.classList.contains('is-open');
      closeGroups(willOpen ? group : null);
      setGroup(group, willOpen);

      portugalTouchEffect(toggle);
      if (willOpen) pixelBurst(toggle);
    });

    group.addEventListener('mouseenter', () => {
      if (isMobile()) return;
      closeGroups(group);
      setGroup(group, true);
    });

    group.addEventListener('mouseleave', () => {
      if (isMobile()) return;
      setGroup(group, false);
    });
  });

  nav.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('pointerdown', () => {
      if (isMobile()) portugalTouchEffect(link);
    });

    // Não existe preventDefault aqui: a navegação é HTML normal.
    link.addEventListener('click', () => {
      closeGroups();
      setMobileMenu(false);
    });
  });

  document.addEventListener('pointerdown', event => {
    if (isMobile()) return;
    if (!nav.contains(event.target)) closeGroups();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMobileMenu(false);
  });

  window.addEventListener('pageshow', () => setMobileMenu(false));
  window.addEventListener('resize', () => {
    if (!isMobile()) setMobileMenu(false);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setMobileMenu(false);
  });
})();
