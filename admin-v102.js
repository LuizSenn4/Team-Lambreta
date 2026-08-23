(() => {
  'use strict';
  if (window.__TL_ADMIN_V102__) return;
  window.__TL_ADMIN_V102__ = true;

  const normalizeRole = value => ({dev:'master',developer:'master',owner:'master',boss:'master',administrador:'admin'}[String(value||'').trim().toLowerCase()] || String(value||'').trim().toLowerCase());
  const allowed = role => ['master','admin'].includes(normalizeRole(role));
  const guard = document.getElementById('adminV102Guard');
  const app = document.getElementById('adminV102App');
  const title = document.getElementById('adminV102Title');
  const roleNode = document.getElementById('adminV102Role');
  const nameNode = document.getElementById('adminV102Name');
  const TEST_MODE = /git-v102-unified-site/i.test(location.hostname);

  function deny(reason) {
    console.warn('[ADMIN V102] acesso negado:', reason);
    sessionStorage.setItem('tl_admin_v102_denial', String(reason || 'acesso negado'));
    location.replace('home.html');
  }

  function displayName(session, profile) {
    return profile?.game_nickname_public || profile?.game_nickname || profile?.full_name || session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.full_name || session?.user?.email || 'Administrador';
  }

  function bindNavigation() {
    document.querySelectorAll('#adminV102Nav [data-section]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.section;
        document.querySelectorAll('#adminV102Nav [data-section]').forEach(item => item.classList.toggle('is-active', item === button));
        document.querySelectorAll('[data-admin-section]').forEach(section => section.classList.toggle('is-active', section.dataset.adminSection === key));
        title.textContent = button.textContent.trim();
        history.replaceState(null, '', `#${key}`);
      });
    });
    const initial = location.hash.slice(1);
    if (initial) document.querySelector(`#adminV102Nav [data-section="${CSS.escape(initial)}"]`)?.click();
  }

  async function boot() {
    if (TEST_MODE) {
      roleNode.textContent = 'DEV / PREVIEW';
      nameNode.textContent = 'Preview V102';
      document.documentElement.classList.remove('admin-v102-pending');
      document.documentElement.dataset.adminRole = 'master';
      document.documentElement.dataset.previewMode = '1';
      guard.hidden = true;
      app.hidden = false;
      bindNavigation();
      window.dispatchEvent(new CustomEvent('tl:admin-v102-ready', { detail:{ userId:null, role:'master', profile:{ role:'master' }, testMode:true } }));
      return;
    }

    if (!window.teamSupabase || !window.TeamAuth) return deny('núcleo V102 indisponível');
    await window.TeamAuth.ready;
    const session = await window.TeamAuth.getSession();
    const userId = session?.user?.id;
    if (!userId) return deny('sem sessão autenticada');

    const { data: profile, error } = await window.teamSupabase.from('profiles').select('role,full_name,game_nickname,game_nickname_public').eq('id', userId).maybeSingle();
    if (error) return deny(error.message || 'falha ao validar perfil');
    const role = normalizeRole(profile?.role);
    if (!allowed(role)) return deny(`cargo sem acesso: ${role || 'vazio'}`);

    roleNode.textContent = role === 'master' ? 'DEV / MASTER' : 'ADMIN';
    nameNode.textContent = displayName(session, profile);
    document.documentElement.classList.remove('admin-v102-pending');
    document.documentElement.dataset.adminRole = role;
    guard.hidden = true;
    app.hidden = false;
    bindNavigation();
    sessionStorage.removeItem('tl_admin_v102_denial');
    window.dispatchEvent(new CustomEvent('tl:admin-v102-ready', { detail:{ userId, role, profile } }));
  }

  boot().catch(error => TEST_MODE ? console.error(error) : deny(error?.message || String(error)));
})();