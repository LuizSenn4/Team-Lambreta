(() => {
  'use strict';
  if (window.__TL_SITE_SHELL_V102__) return;
  window.__TL_SITE_SHELL_V102__ = true;

  const VERSION = '102.0';
  const loadScript = src => new Promise((resolve, reject) => {
    const clean = src.split('?')[0];
    const existing = [...document.scripts].find(s => s.src && s.src.includes(clean));
    if (existing) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.defer = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });

  async function ensureCore() {
    if (!window.teamSupabase) await loadScript(`supabase-client.js?v=${VERSION}`);
    if (!window.TeamAuth) await loadScript(`auth-manager.js?v=${VERSION}`);
    if (!window.TeamPresence) await loadScript(`presence-manager.js?v=${VERSION}`);
    if (!window.__TL_SHELL_V101__) await loadScript(`navigation-v101.js?v=${VERSION}`);
  }

  function upgradeAdminRoute() {
    document.querySelectorAll('a[href="admin.html"]').forEach(link => {
      link.href = 'admin-v102.html';
      link.textContent = 'Painel administrativo';
    });
  }

  function markPage() {
    document.documentElement.dataset.tlShell = 'v102';
    document.body?.classList.add('tl-v102-page');
  }

  async function boot() {
    markPage();
    await ensureCore();
    upgradeAdminRoute();
    const observer = new MutationObserver(upgradeAdminRoute);
    observer.observe(document.documentElement, { subtree: true, childList: true });
    window.dispatchEvent(new CustomEvent('tl:v102-ready'));
  }

  boot().catch(error => {
    console.error('[V102 SHELL]', error);
    document.documentElement.dataset.tlShellError = '1';
  });
})();