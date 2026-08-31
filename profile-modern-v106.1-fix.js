(() => {
  'use strict';

  if (window.__TL_PROFILE_1061_ROLE_FIX__) return;
  window.__TL_PROFILE_1061_ROLE_FIX__ = true;

  const ROLE_KEYS = Object.freeze({
    BOSS: 'boss',
    ADMIN: 'administrator',
    ADMINISTRADOR: 'administrator',
    DEV: 'developer',
    DESENVOLVEDOR: 'developer',
    MODERADOR: 'moderator',
    STAFF: 'staff',
    STREAMER: 'streamer',
    APOIADOR: 'supporter',
    VIP: 'vip',
    MEMBRO: 'member'
  });

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  function repairRoleIcon(role) {
    const host = role.querySelector('.role-icon');
    const label = normalize(role.querySelector('b')?.textContent);
    const key = ROLE_KEYS[label];
    if (!host || !key || host.querySelector('svg')) return;

    const trustedIcon = window.TeamPermissions?.VISUAL_ROLES?.[key]?.icon;
    if (typeof trustedIcon !== 'string') return;

    const svg = trustedIcon.trim();
    if (!/^<svg\b[\s\S]*<\/svg>$/.test(svg)) return;

    // O SVG vem exclusivamente do catálogo interno congelado de cargos.
    // Nunca usamos conteúdo de perfil/usuário como HTML.
    host.innerHTML = svg;
    host.setAttribute('aria-hidden', 'true');
  }

  function repairAll() {
    document.querySelectorAll('.tl-profile-role-v106').forEach(repairRoleIcon);
  }

  const profileRoot = document.getElementById('profileRoot');
  if (profileRoot) {
    new MutationObserver(repairAll).observe(profileRoot, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', repairAll, { once: true });
  } else {
    repairAll();
  }
})();
