(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const deny = () => {
    sessionStorage.removeItem('tl_admin_unlocked');
    location.replace('home.html?admin=locked');
  };

  function leaveAdmin() {
    sessionStorage.removeItem('tl_admin_unlocked');
    location.href = 'home.html';
  }

  function bindExitButtons() {
    document.getElementById('exitAdminBtn')?.addEventListener('click', leaveAdmin);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leaveAdmin);
  }

  async function verifyAccess() {
    if (!sb || sessionStorage.getItem('tl_admin_unlocked') !== '1') return deny();

    const { data: { session } } = await sb.auth.getSession();
    if (!session) return deny();

    const { data: profile, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (error || !['admin', 'master'].includes(profile?.role)) return deny();

    bindExitButtons();
    document.documentElement.classList.remove('admin-pending');
  }

  verifyAccess().catch(deny);
})();
