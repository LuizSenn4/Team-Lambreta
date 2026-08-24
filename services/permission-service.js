(() => {
  'use strict';
  if (window.TeamPermissions) return;

  const ROLE_ALIASES = Object.freeze({ dev:'master', moderador:'moderator', administrador:'admin', apoiador:'supporter', membro:'member', user:'member' });
  const ROLE_LABELS = Object.freeze({ master: 'DEV', admin: 'ADMIN', staff: 'STAFF', moderator: 'MODERADOR', streamer: 'STREAMER', vip: 'VIP', supporter: 'APOIADOR', member: 'MEMBRO' });
  // Metadados exclusivamente visuais. MATRIX/can() continuam a ser a única
  // fonte de autoridade e nunca consultam esta lista.
  const VISUAL_ROLES = Object.freeze({
    boss: Object.freeze({ key:'boss', label:'Boss', color:'#ffd700', order:1, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/></svg>' }),
    administrator: Object.freeze({ key:'administrator', label:'Administrador', color:'#ff2d55', order:2, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/></svg>' }),
    developer: Object.freeze({ key:'developer', label:'Desenvolvedor', color:'#00e6ff', order:3, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></svg>' }),
    moderator: Object.freeze({ key:'moderator', label:'Moderador', color:'#207bff', order:4, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="M8.5 12h7M12 8.5v7"/></svg>' }),
    streamer: Object.freeze({ key:'streamer', label:'Streamer', color:'#b64dff', order:5, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/></svg>' }),
    supporter: Object.freeze({ key:'supporter', label:'Apoiador', color:'#32ff7e', order:6, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M12 14v7"/></svg>' }),
    vip: Object.freeze({ key:'vip', label:'VIP', color:'#ff8a00', order:7, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 7-8 11L4 10l8-7Z"/><path d="M4 10h16M8 4l4 6 4-6"/></svg>' }),
    member: Object.freeze({ key:'member', label:'Membro', color:'#f4f7fa', order:99, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>' }),
    staff: Object.freeze({ key:'staff', label:'Staff', color:'#75b8ff', order:4.5, icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/></svg>' })
  });
  const VISUAL_ALIASES = Object.freeze({ boss:'boss', administrador:'administrator', administrator:'administrator', admin:'administrator', desenvolvedor:'developer', developer:'developer', dev:'developer', master:'developer', moderador:'moderator', moderator:'moderator', streamer:'streamer', apoiador:'supporter', supporter:'supporter', vip:'vip', membro:'member', member:'member', staff:'staff' });
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
  const visualRoleKey = role => VISUAL_ALIASES[String(role || '').trim().toLowerCase()] || '';
  function getVisualRoles(profile = {}) {
    const raw = [];
    const supplied = profile.roles || profile.visual_roles || profile.badges;
    if (Array.isArray(supplied)) raw.push(...supplied);
    else if (supplied) raw.push(...String(supplied).split(/[|,;/]+/));
    if (profile.role) raw.push(profile.role);
    if (profile.is_boss === true) raw.push('boss');
    if (profile.is_admin === true) raw.push('admin');
    if (profile.is_developer === true) raw.push('developer');
    if (profile.is_moderator === true) raw.push('moderator');
    if (profile.is_streamer === true || String(profile.is_streamer).toLowerCase() === 'true') raw.push('streamer');
    if (profile.is_supporter === true) raw.push('supporter');
    const vipUntil = profile.vip_until ? new Date(profile.vip_until).getTime() : 0;
    if (profile.is_vip === true || (Number.isFinite(vipUntil) && vipUntil > Date.now())) raw.push('vip');
    const keys = [...new Set(raw.map(visualRoleKey).filter(Boolean).filter(key => key !== 'member'))];
    return (keys.length ? keys : ['member']).map(key => VISUAL_ROLES[key]).sort((a, b) => a.order - b.order).slice(0, 3);
  }
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
  window.TeamPermissions = Object.freeze({ MATRIX, VISUAL_ROLES, normalizeRole, roleLabel, getVisualRoles, canForRole, can, require, refresh, getRole: () => normalizeRole(verifiedProfile?.role) });
})();
