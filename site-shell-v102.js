(() => {
  'use strict';
  if (window.__TL_SITE_SHELL_V102__) return;
  window.__TL_SITE_SHELL_V102__ = true;

  const VERSION = '102.3';
  const waitFor = (check, timeout = 8000) => new Promise((resolve, reject) => {
    if (check()) return resolve();
    const started = Date.now();
    const timer = setInterval(() => {
      if (check()) { clearInterval(timer); resolve(); return; }
      if (Date.now() - started >= timeout) { clearInterval(timer); reject(new Error('Tempo esgotado ao iniciar núcleo V102')); }
    }, 40);
  });
  const loadScript = (src, ready) => new Promise((resolve, reject) => {
    const clean = src.split('?')[0];
    const existing = [...document.scripts].find(s => s.src && s.src.includes(clean));
    if (existing) {
      if (!ready || ready()) return resolve();
      existing.addEventListener('load', resolve, { once:true });
      existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once:true });
      waitFor(ready).then(resolve).catch(reject);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => ready ? waitFor(ready).then(resolve).catch(reject) : resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });

  async function ensureCore() {
    if (!window.supabase?.createClient) {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', () => Boolean(window.supabase?.createClient));
    }
    if (!window.teamSupabase) {
      await loadScript(`supabase-client.js?v=${VERSION}`, () => Boolean(window.teamSupabase));
    }
    if (!window.teamSupabase) throw new Error('Cliente Supabase V102 indisponível');
    if (!window.TeamAuth) await loadScript(`auth-manager.js?v=${VERSION}`, () => Boolean(window.TeamAuth));
    if (!window.TeamPresence) await loadScript(`presence-manager.js?v=${VERSION}`, () => Boolean(window.TeamPresence));
    if (!window.__TL_SHELL_V101__) await loadScript(`navigation-v101.js?v=${VERSION}`, () => Boolean(window.__TL_SHELL_V101__));
  }

  function upgradeAdminRoute() {
    document.querySelectorAll('a[href="admin.html"],a[href$="/admin.html"]').forEach(link => {
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
    observer.observe(document.documentElement, { subtree:true, childList:true });
    window.dispatchEvent(new CustomEvent('tl:v102-ready'));
  }

  boot().catch(error => {
    console.error('[V102 SHELL]', error);
    document.documentElement.dataset.tlShellError = '1';
  });
})();