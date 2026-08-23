(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';

  /*
    ADMIN GATE — sessão v100
    ------------------------
    O header novo usa a sessão Supabase persistida no mesmo domínio.
    O gate antigo podia redirecionar cedo demais para home.html antes de
    a sessão ser restaurada. Aqui esperamos a restauração, validamos o
    utilizador no Auth e só depois consultamos o cargo real em profiles.

    Nunca conceder acesso apenas por localStorage/cache visual.
    Painel completo: master/DEV ou admin.
  */

  const normalizeRole = role => ({
    dev: 'master',
    developer: 'master',
    owner: 'master',
    boss: 'master',
    administrador: 'admin'
  }[String(role || '').trim().toLowerCase()] || String(role || '').trim().toLowerCase());

  function getClient() {
    if (window.teamSupabase) return window.teamSupabase;
    if (!window.supabase?.createClient) return null;
    window.teamSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    return window.teamSupabase;
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const deny = reason => {
    console.warn('[ADMIN GATE] acesso negado:', reason || 'sem detalhe');
    let target = 'home-v101-preview.html';
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        if (ref.origin === location.origin) target = ref.href;
      }
    } catch {}
    location.replace(target);
  };

  function leaveAdmin() {
    location.href = 'home-v101-preview.html';
  }

  function bindExitButtons() {
    document.getElementById('exitAdminBtn')?.addEventListener('click', leaveAdmin);
    document.getElementById('exitAdminSidebarBtn')?.addEventListener('click', leaveAdmin);
  }

  async function restoreSession(sb) {
    // Alguns navegadores restauram a sessão persistida alguns instantes após o parse da página.
    // Fazer tentativas curtas evita expulsar um admin válido prematuramente.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await sb.auth.getSession();
      const session = result?.data?.session || null;
      if (session?.user?.id) return session;
      if (attempt < 4) await sleep(350);
    }
    return null;
  }

  async function verifyAccess() {
    const sb = getClient();
    if (!sb) return deny('supabase indisponível');

    const session = await restoreSession(sb);
    if (!session?.user?.id) return deny('sessão não encontrada');

    // Valida o JWT no servidor; não confiar somente na sessão guardada localmente.
    const userResult = await sb.auth.getUser();
    const userId = userResult?.data?.user?.id;
    if (userResult?.error || !userId || userId !== session.user.id) {
      return deny('sessão inválida');
    }

    const { data: profile, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) return deny(`perfil: ${error.message || 'erro'}`);

    const role = normalizeRole(profile?.role);
    if (!['admin', 'master'].includes(role)) return deny(`cargo ${role || 'vazio'}`);

    bindExitButtons();
    document.documentElement.classList.remove('admin-pending');
    document.documentElement.dataset.adminRole = role;
    console.info('[ADMIN GATE] acesso autorizado:', role);
  }

  verifyAccess().catch(error => deny(error?.message || error));
})();
