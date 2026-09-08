(() => {
  'use strict';
  if (window.TeamProfileV122Position) return;
  window.TeamProfileV122Position = true;

  const clamp=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));
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
      const x=clamp(profile?.cover_position_x,0,100,72),y=clamp(profile?.cover_position_y,0,100,50),zoom=clamp(profile?.cover_zoom,100,180,118);
      hero.style.setProperty('--cover-x',`${x}%`);hero.style.setProperty('--cover-y',`${y}%`);hero.style.setProperty('--cover-zoom',`${zoom}%`);
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
