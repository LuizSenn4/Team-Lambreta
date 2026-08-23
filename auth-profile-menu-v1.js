(() => {
  'use strict';
  if (window.TLAuthProfileMenuLoaded) return;
  window.TLAuthProfileMenuLoaded = true;

  /*
    LEGACY -> V101 ACCOUNT BRIDGE
    ----------------------------
    Páginas ainda não migradas mantêm o header antigo, mas passam a usar:
    - window.teamSupabase
    - TeamAuth
    - rotas de perfil do Fórum V101
    - o mesmo critério real de acesso ao Admin (master/admin)
  */

  const normalizeRole = value => ({
    dev:'master', developer:'master', owner:'master', boss:'master',
    administrador:'admin', moderador:'moderator', mod:'moderator',
    apoiador:'supporter', support:'supporter', membro:'member', user:'member'
  }[String(value || '').trim().toLowerCase()] || String(value || 'member').trim().toLowerCase());
  const isFullAdmin = value => ['master','admin'].includes(normalizeRole(value));

  const style = document.createElement('style');
  style.textContent = `
    #supabaseAuthBar.tl-account-ready{overflow:visible!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;right:18px!important;bottom:18px!important;z-index:10020!important}
    #supabaseAuthBar .tl-account-shell{position:relative;min-width:190px}
    #supabaseAuthBar .tl-account-trigger{width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) 18px;align-items:center;gap:9px;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:#080909;color:#fff;box-shadow:0 12px 28px rgba(0,0,0,.28);cursor:pointer;text-align:left}
    #supabaseAuthBar .tl-account-trigger:hover{border-color:rgba(115,255,24,.35)}
    #supabaseAuthBar .tl-account-trigger img{width:36px!important;height:36px!important;border-radius:50%;object-fit:cover;border:2px solid #19d100;box-shadow:none!important}
    #supabaseAuthBar .tl-account-meta{display:grid;min-width:0;line-height:1.05}
    #supabaseAuthBar .tl-account-name{color:#5ef3ff;font-size:12px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #supabaseAuthBar .tl-account-status{display:inline-flex;align-items:center;gap:5px;margin-top:4px;color:#9eff81;font-size:10px;font-weight:700}
    #supabaseAuthBar .tl-account-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#20d810;box-shadow:0 0 7px rgba(32,216,16,.6)}
    #supabaseAuthBar .tl-account-chevron{font-size:15px;color:#d7d7d7;transition:transform .16s ease}
    #supabaseAuthBar .tl-account-shell.is-open .tl-account-chevron{transform:rotate(180deg)}
    #supabaseAuthBar .tl-account-menu{position:absolute;right:0;bottom:calc(100% + 8px);width:220px;padding:6px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(10,10,10,.98);box-shadow:0 18px 45px rgba(0,0,0,.5);backdrop-filter:blur(10px);display:none;overflow:hidden}
    #supabaseAuthBar .tl-account-shell.is-open .tl-account-menu{display:block}
    #supabaseAuthBar .tl-account-item{width:100%;display:flex;align-items:center;gap:10px;padding:12px 11px;border:0!important;border-radius:9px;background:transparent!important;color:#f2f2f2;text-decoration:none;font:800 13px/1.2 Inter,Arial,sans-serif;box-shadow:none!important;cursor:pointer}
    #supabaseAuthBar .tl-account-item:hover{background:rgba(255,255,255,.07)!important}
    #supabaseAuthBar .tl-account-item svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
    #supabaseAuthBar .tl-account-item.tl-account-admin{color:#b8ff7f}
    #supabaseAuthBar .tl-account-item.tl-account-logout{color:#ff4d61;border-top:1px solid rgba(255,255,255,.08)!important;border-radius:0;margin-top:4px;padding-top:13px}
    @media(max-width:700px){#supabaseAuthBar.tl-account-ready{right:10px!important;bottom:10px!important}#supabaseAuthBar .tl-account-shell{min-width:168px}#supabaseAuthBar .tl-account-menu{width:210px}}
  `;
  document.head.appendChild(style);

  const iconProfile = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"></path></svg>';
  const iconEdit = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"></path><path d="m13.8 7.2 3 3"></path></svg>';
  const iconAdmin = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z"></path><path d="M9 12h6M12 9v6"></path></svg>';
  const iconLogout = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5"></path><path d="M14 8l4 4-4 4"></path><path d="M8 12h10"></path></svg>';

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const base = src.split('?')[0];
      const existing = [...document.scripts].find(script => script.src && script.src.includes(base));
      if (existing) {
        if ((base.includes('supabase-client') && window.teamSupabase) || (base.includes('auth-manager') && window.TeamAuth)) return resolve();
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once:true });
        setTimeout(resolve, 500);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.dataset.tlV101Bridge = '1';
      script.addEventListener('load', resolve, { once:true });
      script.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once:true });
      document.body.appendChild(script);
    });
  }

  async function ensureOfficialAuth() {
    for (let i = 0; i < 40 && !window.supabase?.createClient; i += 1) await sleep(100);
    if (!window.supabase?.createClient) return null;
    if (!window.teamSupabase) await loadScript('supabase-client.js?v=101.0');
    if (!window.TeamAuth) await loadScript('auth-manager.js?v=101.0');
    if (window.TeamAuth?.ready) await window.TeamAuth.ready;
    return window.TeamAuth || null;
  }

  async function getIdentity() {
    try {
      const auth = await ensureOfficialAuth();
      const session = await auth?.getSession?.();
      const userId = session?.user?.id || null;
      if (!userId || !window.teamSupabase) return { session:null, userId:null, role:'member' };
      const { data } = await window.teamSupabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      return { session, userId, role:normalizeRole(data?.role) };
    } catch (error) {
      console.warn('[LEGACY V101 BRIDGE] identidade:', error?.message || error);
      return { session:null, userId:null, role:'member' };
    }
  }

  let working = false;
  const upgrade = async () => {
    if (working) return;
    const bar = document.getElementById('supabaseAuthBar');
    if (!bar || bar.hidden) return;
    if (bar.querySelector('.tl-account-shell')) return;

    const user = bar.querySelector('.sb-user');
    const logout = bar.querySelector('#sbLogout');
    if (!user || !logout) return;

    working = true;
    try {
      const img = user.querySelector('img')?.getAttribute('src') || 'img/brasao.png';
      const name = user.querySelector('span')?.textContent?.trim() || 'Perfil';
      const identity = await getIdentity();
      const uid = identity.userId ? encodeURIComponent(identity.userId) : '';
      const profileHref = uid ? `forum.html?profile=${uid}` : 'forum.html';
      const editHref = uid ? `forum.html?profile=${uid}&edit=1` : 'forum.html';
      const adminItem = isFullAdmin(identity.role)
        ? `<a class="tl-account-item tl-account-admin" href="admin.html" role="menuitem">${iconAdmin}<span>Painel administrativo</span></a>`
        : '';

      bar.classList.add('tl-account-ready');
      bar.dataset.v101Bridge = 'true';
      bar.innerHTML = `
        <div class="tl-account-shell">
          <button class="tl-account-trigger" type="button" aria-expanded="false" aria-haspopup="menu">
            <img src="${img.replace(/"/g,'&quot;')}" alt="">
            <span class="tl-account-meta"><strong class="tl-account-name"></strong><small class="tl-account-status">Online</small></span>
            <span class="tl-account-chevron">⌄</span>
          </button>
          <div class="tl-account-menu" role="menu">
            <a class="tl-account-item" href="${profileHref}" role="menuitem">${iconProfile}<span>Ver perfil</span></a>
            <a class="tl-account-item" href="${editHref}" role="menuitem">${iconEdit}<span>Editar perfil</span></a>
            ${adminItem}
            <button class="tl-account-item tl-account-logout" type="button" role="menuitem">${iconLogout}<span>Sair</span></button>
          </div>
        </div>`;
      bar.querySelector('.tl-account-name').textContent = name;

      const shell = bar.querySelector('.tl-account-shell');
      const trigger = bar.querySelector('.tl-account-trigger');
      const doClose = () => { shell.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); };
      trigger.addEventListener('click', ev => {
        ev.stopPropagation();
        const open = !shell.classList.contains('is-open');
        shell.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', String(open));
      });
      bar.querySelector('.tl-account-logout').addEventListener('click', async () => {
        try {
          if (window.TeamAuth?.signOut) await window.TeamAuth.signOut();
          else await window.teamSupabase?.auth?.signOut();
        } catch (_) {}
        location.href = 'home.html';
      });
      document.addEventListener('pointerdown', ev => { if (!shell.contains(ev.target)) doClose(); });
      document.addEventListener('keydown', ev => { if (ev.key === 'Escape') doClose(); });
    } finally {
      working = false;
    }
  };

  const observer = new MutationObserver(() => setTimeout(upgrade, 0));
  observer.observe(document.documentElement, {subtree:true, childList:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', upgrade); else upgrade();
  setInterval(upgrade, 700);
})();