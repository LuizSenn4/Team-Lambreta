(() => {
  'use strict';
  if (window.__TL_SITE_CHROME_V113__) return;
  window.__TL_SITE_CHROME_V113__ = true;

  const menuButton = document.querySelector('[data-tl113-menu]');
  const drawer = document.querySelector('[data-tl113-drawer]');
  const nav = document.querySelector('[data-tl113-bottom-nav]');

  if (menuButton && drawer) {
    const close = () => { drawer.hidden = true; menuButton.setAttribute('aria-expanded','false'); };
    const open = () => { drawer.hidden = false; menuButton.setAttribute('aria-expanded','true'); };
    menuButton.addEventListener('click', event => {
      event.stopPropagation();
      drawer.hidden ? open() : close();
    });
    drawer.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', close);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  if (!nav) return;
  document.body.classList.add('tl113-has-bottom-nav');

  const file = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
  const current = file.startsWith('profile') ? 'profile'
    : file.startsWith('forum') ? 'forum'
    : (file.startsWith('stream') || file.startsWith('live')) ? 'streamers'
    : (file.startsWith('buddy') || file.startsWith('chat')) ? 'chat'
    : 'home';

  nav.querySelectorAll('[data-nav-key]').forEach(link => {
    link.classList.toggle('is-active', link.dataset.navKey === current);
  });

  const avatar = nav.querySelector('[data-tl113-avatar]');
  const avatarImg = avatar?.querySelector('img');
  const badge = nav.querySelector('[data-tl113-unread]');

  const applyAvatar = url => {
    const src = String(url || '').trim();
    if (!avatar || !avatarImg || !src) return false;
    avatarImg.onload = () => avatar.classList.add('has-photo');
    avatarImg.onerror = () => avatar.classList.remove('has-photo');
    avatarImg.src = src;
    return true;
  };

  const getAvatarUrl = profile => window.TeamProfiles?.getAvatarUrl?.(profile)
    || profile?.avatar_display_url
    || profile?.avatar_external_url
    || profile?.custom_avatar_url
    || profile?.avatar_url
    || '';

  async function loadOwnAvatar() {
    try {
      const session = await window.TeamAuth?.getSession?.();
      if (!session?.user || !window.TeamProfiles?.getPublicProfile) return;
      const profile = await window.TeamProfiles.getPublicProfile(session.user.id, {fresh:false});
      applyAvatar(getAvatarUrl(profile));
    } catch (_) {}
  }

  function syncUnread() {
    if (!badge) return;
    let value = 0;
    try { value = Number(localStorage.getItem('tl_buddy_unread_count') || 0); } catch (_) {}
    badge.textContent = value > 99 ? '99+' : String(value);
    badge.hidden = value <= 0;
  }

  const pageAvatar = document.querySelector('.tl-profile-avatar-inner-v106 img');
  if (pageAvatar?.src) applyAvatar(pageAvatar.currentSrc || pageAvatar.src);
  loadOwnAvatar();
  syncUnread();
})();
