(() => {
  'use strict';

  /*
    ADMIN GATE — AUTH ÚNICO
    -----------------------
    O painel administrativo deve usar EXATAMENTE a mesma sessão do novo
    header/Home/Buddy. Não criar outro cliente Supabase aqui.

    Fluxo:
    1. garantir supabase-client.js;
    2. garantir auth-manager.js;
    3. aguardar TeamAuth.ready;
    4. obter a sessão autenticada;
    5. consultar o cargo real em profiles;
    6. liberar apenas master/DEV e admin.

    Nunca liberar acesso por cache/localStorage visual.
  */

  const normalizeRole = role => ({
    dev: 'master',
    developer: 'master',
    owner: 'master',
    boss: 'master',
    administrador: 'admin'
  }[String(role || '').trim().toLowerCase()] || String(role || '').trim().toLowerCase());

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-${marker}]`);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.dataset[marker.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = '1';
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureSharedAuth() {
    if (!window.teamSupabase) {
      await loadScript('supabase-client.js?v=100.0', 'tl-admin-supabase-client');
    }
    if (!window.TeamAuth) {
      await loadScript('auth-manager.js?v=100.0', 'tl-admin-auth-manager');
    }
    if (!window.teamSupabase || !window.TeamAuth) {
      throw new Error('Auth partilhado indisponível');
    }
    await window.TeamAuth.ready;
    return { sb: window.teamSupabase, auth: window.TeamAuth };
  }

  async function getSharedSession(auth) {
    let session = await auth.getSession();
    if (session?.user?.id) return session;

    // Pequena tolerância para restauração da sessão em navegação entre páginas.
    for (let i = 0; i < 4; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
      session = await auth.getSession();
      if (session?.user?.id) return session;
    }
    return null;
  }

  function fallbackPage() {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && !ref.pathname.endsWith('/admin.html')) {
        return ref.href;
      }
    } catch {}
    return 'home-v101-preview.html';
  }

  function deny(reason) {
    console.warn('[ADMIN GATE] acesso negado:', reason || 'sem detalhe');
    location.replace(fallbackPage());
  }

  function leaveAdmin() {
    location.href = 'home-v101-preview.html';
  }

  function bindExitButtons() {
    document.getElementById('exitAdminBtn')?.addEventListener('click', leaveAdmin);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leaveAdmin);
  }

  async function verifyAccess() {
    const { sb, auth } = await ensureSharedAuth();
    const session = await getSharedSession(auth);
    const userId = session?.user?.id;
    if (!userId) return deny('sessão partilhada não encontrada');

    const { data: profile, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) return deny(`perfil: ${error.message || 'erro'}`);

    const role = normalizeRole(profile?.role);
    if (!['admin', 'master'].includes(role)) {
      return deny(`cargo ${role || 'vazio'}`);
    }

    bindExitButtons();
    document.documentElement.classList.remove('admin-pending');
    document.documentElement.dataset.adminRole = role;
    console.info('[ADMIN GATE] acesso autorizado:', role);
  }

  verifyAccess().catch(error => deny(error?.message || String(error)));
})();
