(() => {
  'use strict';
  if (window.TeamPermissions) return;

  const ROLE_ALIASES = Object.freeze({ dev: 'master', moderador: 'moderator', user: 'member' });
  const ROLE_LABELS = Object.freeze({ master: 'DEV', admin: 'ADMIN', staff: 'STAFF', moderator: 'MODERADOR', streamer: 'STREAMER', vip: 'VIP', supporter: 'APOIADOR', member: 'MEMBRO' });
  const MATRIX = Object.freeze({
    master: ['*'],
    admin: ['admin.full', 'moderator.panel', 'event.create', 'event.manage', 'ranking.update', 'live.moderate', 'chat.moderate', 'reports.review', 'forum.moderate'],
    staff: ['chat.moderate', 'reports.review'],
    moderator: ['moderator.panel', 'forum.moderate', 'live.moderate', 'chat.moderate'],
    streamer: [], vip: [], supporter: [], member: []
  });
  let verifiedProfile = null;

  const normalizeRole = role => ROLE_ALIASES[String(role || 'member').trim().toLowerCase()] || String(role || 'member').trim().toLowerCase();
  const roleLabel = role => ROLE_LABELS[normalizeRole(role)] || 'MEMBRO';
  const canForRole = (role, permission) => {
    const allowed = MATRIX[normalizeRole(role)] || [];
    return allowed.includes('*') || allowed.includes(permission);
  };
  async function refresh() {
    verifiedProfile = await window.TeamProfiles?.getCurrentProfile({ fresh: true }) || null;
    window.dispatchEvent(new CustomEvent('tl:permissions', { detail: { role: normalizeRole(verifiedProfile?.role) } }));
    return verifiedProfile;
  }
  async function can(permission) {
    const session = await window.TeamAuth?.getSession();
    if (!session?.user) return false;
    if (!verifiedProfile || verifiedProfile.id !== session.user.id) await refresh();
    return canForRole(verifiedProfile?.role, permission);
  }
  async function require(permission, redirectTo = 'home.html') {
    if (await can(permission)) return true;
    const target = new URL(redirectTo, window.location.href);
    target.searchParams.set('access', 'denied');
    window.location.replace(target.href);
    return false;
  }
  window.addEventListener('tl:auth', event => { if (!event.detail?.session) verifiedProfile = null; });
  window.TeamPermissions = Object.freeze({ MATRIX, normalizeRole, roleLabel, canForRole, can, require, refresh, getRole: () => normalizeRole(verifiedProfile?.role) });
})();
