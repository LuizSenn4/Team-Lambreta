(() => {
  'use strict';
  if (window.__TL_SITE_CHROME_V112__) return;
  window.__TL_SITE_CHROME_V112__ = true;

  const nav = document.querySelector('[data-tl-bottom-nav]');
  if (!nav) return;

  document.body.classList.add('tl-bottom-nav-enabled-v112');

  const file = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
  const current = file.startsWith('profile') ? 'profile'
    : file.startsWith('forum') ? 'forum'
    : (file.startsWith('stream') || file.startsWith('live')) ? 'streamers'
    : (file.startsWith('buddy') || file.startsWith('chat')) ? 'chat'
    : 'home';

  nav.querySelectorAll('[data-nav-key]').forEach(link => {
    link.classList.toggle('is-active', link.dataset.navKey === current);
  });

  const avatar = nav.querySelector('[data-bottom-avatar]');
  const avatarImg = avatar?.querySelector('img');
  const badge = nav.querySelector('[data-bottom-unread]');

  function applyAvatar(url) {
    const src = String(url || '').trim();
    if (!avatar || !avatarImg || !src) return false;
    avatarImg.onload = () => avatar.classList.add('has-photo');
    avatarImg.onerror = () => avatar.classList.remove('has-photo');
    if (avatarImg.getAttribute('src') !== src) avatarImg.src = src;
    if (avatarImg.complete && avatarImg.naturalWidth > 0) avatar.classList.add('has-photo');
    return true;
  }

  function avatarFromProfile(profile) {
    if (!profile) return false;
    const src = window.TeamProfiles?.getAvatarUrl?.(profile)
      || profile.avatar_display_url
      || profile.avatar_external_url
      || profile.custom_avatar_url
      || profile.avatar_url
      || '';
    return applyAvatar(src);
  }

  function avatarFromShell() {
    try {
      return avatarFromProfile(window.TeamShell?.getProfile?.());
    } catch (_) {
      return false;
    }
  }

  function avatarFromPage() {
    const profileImg = document.querySelector('.tl-profile-avatar-inner-v106 img');
    if (profileImg?.src) return applyAvatar(profileImg.currentSrc || profileImg.src);

    const shellAvatar = document.querySelector('.tl-user-avatar');
    if (!shellAvatar) return false;

    const nested = shellAvatar.querySelector('img');
    if (nested?.src) return applyAvatar(nested.currentSrc || nested.src);

    const bg = getComputedStyle(shellAvatar).backgroundImage;
    const match = bg && bg.match(/^url\(["']?(.*?)["']?\)$/);
    return match?.[1] ? applyAvatar(match[1]) : false;
  }

  function syncUnread() {
    if (!badge) return;
    const source = document.getElementById('tlHeaderUnread');
    const value = Number(source?.textContent || 0);
    badge.textContent = value > 99 ? '99+' : String(value || 0);
    badge.hidden = value <= 0;
  }

  window.addEventListener('tl:shell-ready', event => {
    avatarFromProfile(event.detail?.profile);
    syncUnread();
  }, {passive:true});

  avatarFromShell();
  avatarFromPage();
  syncUnread();

  setTimeout(() => { if (!avatarFromPage()) avatarFromShell(); syncUnread(); }, 500);
  setTimeout(() => { if (!avatarFromPage()) avatarFromShell(); syncUnread(); }, 1500);
})();
