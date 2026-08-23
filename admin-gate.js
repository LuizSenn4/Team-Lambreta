(() => {
  'use strict';

  /*
    ADMIN GATE V101 — NÃO REINTRODUZIR GATE/CHAVE LEGADOS
    -----------------------------------------------------
    Entrada oficial: menu de conta do navigation-v101.js.
    Usa somente o cliente partilhado window.teamSupabase.
    O acesso completo é permitido apenas para master/admin.

    IMPORTANTE:
    - nunca autorizar por localStorage/cache visual;
    - nunca criar cliente Supabase próprio aqui;
    - STAFF/MODERADOR terão painel próprio no futuro;
    - não usar ?admin=locked nem chaves antigas no header.
  */

  const normalizeRole = value => ({
    dev:'master', developer:'master', owner:'master', boss:'master',
    administrador:'admin'
  }[String(value || '').trim().toLowerCase()] || String(value || '').trim().toLowerCase());

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      const bySrc = [...document.scripts].find(item => item.src && item.src.includes(src.split('?')[0]));
      if (bySrc) {
        if (src.includes('supabase-client') && window.teamSupabase) return resolve();
        if (src.includes('auth-manager') && window.TeamAuth) return resolve();
        bySrc.addEventListener('load', resolve, { once:true });
        bySrc.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once:true });
        setTimeout(() => {
          if ((src.includes('supabase-client') && window.teamSupabase) || (src.includes('auth-manager') && window.TeamAuth)) resolve();
        }, 0);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.dataset[marker] = '1';
      script.addEventListener('load', resolve, { once:true });
      script.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once:true });
      document.head.appendChild(script);
    });
  }

  async function ensureOfficialClient() {
    if (!window.teamSupabase) await loadScript('supabase-client.js?v=101.0', 'tlAdminSupabase');
    if (!window.TeamAuth) await loadScript('auth-manager.js?v=101.0', 'tlAdminAuth');
    if (!window.teamSupabase) throw new Error('cliente oficial indisponível');
    if (window.TeamAuth?.ready) await window.TeamAuth.ready;
    return window.teamSupabase;
  }

  async function recoverSession(client) {
    // Primeiro pergunta diretamente ao mesmo cliente que a Home usa.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data, error } = await client.auth.getSession();
      if (error) console.warn('[ADMIN GATE] getSession:', error.message);
      if (data?.session?.user?.id) return data.session;

      // TeamAuth pode terminar a restauração entre uma tentativa e outra.
      const shared = await window.TeamAuth?.getSession?.();
      if (shared?.user?.id) return shared;
      await sleep(250);
    }
    return null;
  }

  function returnPage() {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && !ref.pathname.endsWith('/admin.html')) return `${ref.pathname}${ref.search}${ref.hash}`;
    } catch (_) {}
    return 'home.html';
  }

  function deny(reason) {
    console.warn('[ADMIN GATE] acesso negado:', reason || 'sem detalhe');
    sessionStorage.setItem('tl_admin_last_denial_v101', String(reason || 'sem detalhe'));
    location.replace(returnPage());
  }

  function leaveAdmin() {
    location.href = 'home.html';
  }

  function bindExitButtons() {
    document.getElementById('exitAdminBtn')?.addEventListener('click', leaveAdmin);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leaveAdmin);
  }

  async function verifyAccess() {
    const client = await ensureOfficialClient();
    const session = await recoverSession(client);
    const userId = session?.user?.id;
    if (!userId) return deny('sessão autenticada não restaurada');

    const { data: profile, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) return deny(`falha ao consultar cargo: ${error.message || 'erro'}`);

    const role = normalizeRole(profile?.role);
    if (!['master','admin'].includes(role)) return deny(`cargo sem acesso ao painel completo: ${role || 'vazio'}`);

    sessionStorage.removeItem('tl_admin_last_denial_v101');
    bindExitButtons();
    document.documentElement.classList.remove('admin-pending');
    document.documentElement.dataset.adminRole = role;
    window.dispatchEvent(new CustomEvent('tl:admin-ready', { detail:{ role, userId } }));
    console.info('[ADMIN GATE] acesso autorizado:', role);
  }

  verifyAccess().catch(error => deny(error?.message || String(error)));
})();