(() => {
  'use strict';
  const deny = () => {
    document.documentElement.classList.add('admin-denied');
    const target = new URL('home.html', location.href);
    target.searchParams.set('access', 'denied');
    location.replace(target.href);
  };
  const leave = () => { location.href = 'home.html'; };
  async function verify() {
    await window.TeamAuth?.ready;
    if (!await window.TeamPermissions?.can('admin.full')) return deny();
    document.getElementById('exitAdminBtn')?.addEventListener('click', leave);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leave);
    document.documentElement.classList.remove('admin-pending');
    window.dispatchEvent(new CustomEvent('tl:admin-ready'));
  }
  verify().catch(error => { console.error('[ADMIN] acesso', error.message); deny(); });
})();
