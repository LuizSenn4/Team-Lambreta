(() => {
  'use strict';
  if (window.TeamProfileV122Position) return;
  window.TeamProfileV122Position = true;

  const clamp = value => Math.max(0, Math.min(100, Number(value) || 72));
  let syncing = false;

  async function applyCoverPosition() {
    if (syncing) return;
    const hero = document.querySelector('.p120-hero');
    if (!hero || !window.TeamProfiles) return;
    syncing = true;
    try {
      const session = await window.TeamAuth?.getSession?.();
      if (!session?.user) return;
      const userId = new URLSearchParams(location.search).get('user') || session.user.id;
      const profile = await window.TeamProfiles.getPublicProfile(userId, { fresh:true });
      const x = clamp(profile?.cover_position_x ?? 72);
      hero.style.setProperty('--cover-x', `${x}%`);
    } catch (error) {
      console.error('[Profile V122 cover position]', error);
    } finally {
      syncing = false;
    }
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector('.p120-hero')) applyCoverPosition();
  });

  const start = () => {
    const root = document.getElementById('profileRoot');
    if (!root) return setTimeout(start, 80);
    observer.observe(root, { childList:true, subtree:true });
    applyCoverPosition();
  };

  Promise.resolve(window.TeamAuth?.ready).then(start);
})();
