(() => {
  'use strict';
  if (window.__TL_NAV_V111__) return;
  window.__TL_NAV_V111__ = true;

  const nav = document.querySelector('[data-tl-bottom-nav]');
  if (!nav) return;
  document.body.classList.add('tl-nav-v111-enabled');

  const file = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
  const current = file.startsWith('profile') ? 'profile' : file.startsWith('forum') ? 'forum' : file.startsWith('stream') || file.startsWith('live') ? 'streamers' : file.startsWith('buddy') || file.startsWith('chat') ? 'chat' : 'home';
  nav.querySelectorAll('[data-nav-key]').forEach(link => link.classList.toggle('is-active', link.dataset.navKey === current));

  const avatar = nav.querySelector('[data-bottom-avatar]');
  const avatarImg = avatar?.querySelector('img');
  const badge = nav.querySelector('[data-bottom-unread]');

  function setAvatar(url) {
    const clean = String(url || '').trim();
    if (!avatar || !avatarImg || !clean) return false;
    if (avatarImg.getAttribute('src') !== clean) avatarImg.src = clean;
    avatarImg.onload = () => avatar.classList.add('has-photo');
    avatarImg.onerror = () => avatar.classList.remove('has-photo');
    if (avatarImg.complete && avatarImg.naturalWidth > 0) avatar.classList.add('has-photo');
    return true;
  }

  function profileAvatar(profile) {
    const url = window.TeamProfiles?.getAvatarUrl?.(profile) || profile?.avatar_display_url || profile?.avatar_external_url || profile?.custom_avatar_url || profile?.avatar_url || '';
    return url ? setAvatar(url) : false;
  }

  function readAvatarFromDom() {
    const candidates = [
      document.querySelector('.tl-profile-avatar-inner-v106 img'),
      document.querySelector('.tl-user-avatar img'),
      document.querySelector('.tl-account-trigger img')
    ].filter(Boolean);
    for (const img of candidates) {
      const src = img.currentSrc || img.src;
      if (src && setAvatar(src)) return true;
    }

    const shellAvatar = document.querySelector('.tl-user-avatar');
    if (shellAvatar) {
      const bg = getComputedStyle(shellAvatar).backgroundImage;
      const match = bg && bg.match(/^url\(["']?(.*?)["']?\)$/);
      if (match?.[1]) return setAvatar(match[1]);
    }
    return false;
  }

  function readAvatarFromShell() {
    try {
      const profile = window.TeamShell?.getProfile?.();
      if (profile) return profileAvatar(profile);
    } catch (_) {}
    return false;
  }

  function syncUnread() {
    if (!badge) return;
    const source = document.getElementById('tlHeaderUnread') || document.querySelector('[data-profile-unread-bottom]');
    const value = Number(source?.textContent || 0);
    badge.textContent = value > 99 ? '99+' : String(value || 0);
    badge.hidden = !value;
  }

  window.addEventListener('tl:shell-ready', event => {
    profileAvatar(event.detail?.profile);
    syncUnread();
  });

  /* Observe somente conteúdo do perfil. Nunca observe classes do body/nav: evita loop de mutações. */
  const profileRoot = document.getElementById('profileRoot');
  if (profileRoot) {
    const profileObserver = new MutationObserver(() => readAvatarFromDom());
    profileObserver.observe(profileRoot, {subtree:true, childList:true});
  }

  readAvatarFromShell();
  readAvatarFromDom();
  syncUnread();
  [300,900,1800].forEach(delay => setTimeout(() => {
    if (!readAvatarFromDom()) readAvatarFromShell();
    syncUnread();
  }, delay));
})();