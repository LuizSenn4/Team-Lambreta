(() => {
  'use strict';

  const deny = () => {
    document.documentElement.classList.add('admin-denied');
    document.documentElement.classList.remove('admin-pending');

    const root = document.body || document.documentElement;
    if (!document.getElementById('adminAccessDenied')) {
      const notice = document.createElement('main');
      notice.id = 'adminAccessDenied';
      notice.setAttribute('role', 'alert');
      notice.style.cssText = 'min-height:100dvh;display:grid;place-items:center;padding:24px;background:#090c12;color:#fff;font-family:system-ui,sans-serif;text-align:center;';
      notice.innerHTML = '<div><h1 style="margin:0 0 10px;font-size:24px">Acesso restrito</h1><p style="margin:0;color:#9fb0bc">Esta conta não tem permissão para abrir o painel Admin.</p></div>';
      root.replaceChildren(notice);
    }
  };

  const leave = () => { location.href = 'home.html'; };

  const permissionsAreCurrent = () => {
    const permissions = window.TeamPermissions;
    return Boolean(
      permissions?.can &&
      permissions?.normalizeRole?.('developer') === 'master' &&
      permissions?.normalizeRole?.('dev') === 'master'
    );
  };

  async function ensureCurrentPermissions() {
    if (permissionsAreCurrent()) return;

    try { delete window.TeamPermissions; } catch (_) { window.TeamPermissions = undefined; }

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'services/permission-service.js?v=102.3';
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar o serviço de permissões atual.'));
      document.head.appendChild(script);
    });

    if (!permissionsAreCurrent()) throw new Error('Serviço de permissões desatualizado.');
  }

  async function verify() {
    await window.TeamAuth?.ready;
    await ensureCurrentPermissions();
    if (!await window.TeamPermissions?.can('admin.full')) return deny();

    document.getElementById('exitAdminBtn')?.addEventListener('click', leave);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leave);
    document.documentElement.classList.remove('admin-pending', 'admin-denied');
    window.dispatchEvent(new CustomEvent('tl:admin-ready'));
  }

  verify().catch(error => {
    console.error('[ADMIN] acesso', error.message);
    deny();
  });
})();