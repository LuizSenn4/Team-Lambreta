(() => {
  'use strict';
  const modal = document.getElementById('teamJoinModal');
  if (!modal) return;
  let returnFocus = null;
  let lockedScrollY = 0;
  let previousBodyStyle = null;

  const lockPageScroll = () => {
    if (previousBodyStyle) return;
    lockedScrollY = window.scrollY;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    previousBodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    };
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${lockedScrollY}px`,
      left: '0',
      right: '0',
      width: '100%',
      overflow: 'hidden',
      paddingRight: scrollbarWidth ? `${scrollbarWidth}px` : previousBodyStyle.paddingRight
    });
    document.body.classList.add('team-join-open');
  };

  const unlockPageScroll = () => {
    if (!previousBodyStyle) return;
    const restore = previousBodyStyle;
    previousBodyStyle = null;
    document.body.classList.remove('team-join-open');
    Object.assign(document.body.style, restore);
    window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'instant' });
  };

  const open = trigger => {
    if (!modal.hidden) return;
    returnFocus = trigger || document.activeElement;
    lockPageScroll();
    modal.hidden = false;
    history.replaceState(null, '', `${location.pathname}${location.search}#juntar-team`);
    requestAnimationFrame(() => modal.querySelector('[data-team-join-close]')?.focus({ preventScroll:true }));
  };

  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    if (location.hash === '#juntar-team') history.replaceState(null, '', `${location.pathname}${location.search}`);
    unlockPageScroll();
    returnFocus?.focus?.({ preventScroll:true });
  };
  document.querySelectorAll('[data-team-join-open]').forEach(button => button.addEventListener('click', () => open(button)));
  modal.querySelectorAll('[data-team-join-close]').forEach(button => button.addEventListener('click', close));
  document.addEventListener('keydown', event => { if (!modal.hidden && event.key === 'Escape') close(); });
  if (location.hash === '#juntar-team') open(null);
})();
