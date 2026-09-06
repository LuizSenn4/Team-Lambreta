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

  async function verify() {
    await window.TeamAuth?.ready;
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
