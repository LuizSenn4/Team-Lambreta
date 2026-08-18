(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const normalizeRole = role => ({
    dev: 'master',
    developer: 'master',
    owner: 'master',
    boss: 'master',
    administrador: 'admin'
  }[String(role || '').trim().toLowerCase()] || String(role || '').trim().toLowerCase());

  const deny = () => {
    location.replace('home.html?admin=locked');
  };

  function leaveAdmin() {
    location.href = 'home.html';
  }

  function bindExitButtons() {
    document.getElementById('exitAdminBtn')?.addEventListener('click', leaveAdmin);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leaveAdmin);
  }

  async function verifyAccess() {
    if (!sb) return deny();

    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user?.id) return deny();

    const { data: profile, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    const role = normalizeRole(profile?.role);
    if (error || !['admin', 'master'].includes(role)) return deny();

    bindExitButtons();
    document.documentElement.classList.remove('admin-pending');
  }

  verifyAccess().catch(deny);
})();
