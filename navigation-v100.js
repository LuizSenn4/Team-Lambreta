(() => {
  'use strict';
  if (window.__TL_SHELL_V100__) return;
  window.__TL_SHELL_V100__ = true;

  const sb = window.teamSupabase;
  const ensureAuth = () => window.TeamAuth ? Promise.resolve(window.TeamAuth) : new Promise(resolve => {
    const existing = document.querySelector('script[data-tl-auth]');
    if (existing) { existing.addEventListener('load', () => resolve(window.TeamAuth), { once:true }); return; }
    const script = document.createElement('script'); script.src = 'auth-manager.js?v=100.0'; script.dataset.tlAuth = 'true'; script.onload = () => resolve(window.TeamAuth); document.head.appendChild(script);
  });
  const ensurePresence = () => window.TeamPresence ? Promise.resolve(window.TeamPresence) : new Promise(resolve => {
    const existing = document.querySelector('script[data-tl-presence]');
    if (existing) { existing.addEventListener('load', () => resolve(window.TeamPresence), { once:true }); return; }
    const script = document.createElement('script'); script.src = 'presence-manager.js?v=100.0'; script.dataset.tlPresence = 'true'; script.onload = () => resolve(window.TeamPresence); document.head.appendChild(script);
  });
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const roleLabel = role => ({master:'DEV',admin:'ADMIN',staff:'STAFF',moderator:'MODERADOR',streamer:'STREAMER',vip:'VIP',supporter:'APOIADOR',member:'MEMBRO'}[String(role||'member').toLowerCase()] || 'MEMBRO');
  const statusLabel = value => ({online:'Online',busy:'Ocupado',away:'Ausente',offline:'Offline'}[value] || 'Offline');
  const cached = (() => { try { return JSON.parse(localStorage.getItem('tl_profile_cache_v100') || 'null'); } catch { return null; } })();
  let session = null;
  let profile = cached;
  let status = 'offline';

  const header = document.querySelector('.site-header');
  if (!header) return;
  header.className = 'site-header tl-header-v100';
  header.innerHTML = `
    <a href="home.html" class="brand brand-logo-link" aria-label="Team Lambreta — página inicial"><img class="brand-logo-image" src="img/team-lambreta-header-logo.svg" alt="Team Lambreta"></a>
    <button id="tlMenuButton" class="tl-mobile-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div id="tlMenuBackdrop" class="tl-mobile-menu-backdrop" hidden></div>
    <nav id="tlMainNav" class="tl-main-nav" aria-label="Menu principal">
      <a href="home.html">Home</a><a href="team.html">Team</a><a href="forum.html">Fórum</a><a href="streamers.html">Streamers</a><a href="eventos.html">Eventos</a>
    </nav>
    <div class="tl-user-cluster">
      <div class="tl-status-wrap"><button class="tl-status-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><i class="tl-presence-dot offline"></i><span>Offline</span></button><div class="tl-dropdown tl-status-menu" role="menu" hidden><button data-presence="online"><i class="tl-presence-dot online"></i>Online</button><button data-presence="busy"><i class="tl-presence-dot busy"></i>Ocupado</button><button data-presence="away"><i class="tl-presence-dot away"></i>Ausente</button></div></div>
      <div class="tl-user-wrap"><button class="tl-account-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span class="tl-user-avatar" data-avatar-fallback></span><span class="tl-account-copy"><strong>${esc(cached?.game_nickname || cached?.full_name || 'Entrar')}</strong><small>${roleLabel(cached?.role)}</small></span><span>⌄</span></button><div class="tl-dropdown tl-account-menu" role="menu" hidden></div></div>
      <a class="tl-header-icon" href="buddy.html" aria-label="Chat e notificações"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><b id="tlHeaderUnread" hidden>0</b></a>
    </div>`;

  const nav = header.querySelector('#tlMainNav');
  const menuButton = header.querySelector('#tlMenuButton');
  const backdrop = header.querySelector('#tlMenuBackdrop');
  const statusButton = header.querySelector('.tl-status-trigger');
  const statusMenu = header.querySelector('.tl-status-menu');
  const accountButton = header.querySelector('.tl-account-trigger');
  const accountMenu = header.querySelector('.tl-account-menu');
  const mobile = matchMedia('(max-width:900px)');
  const current = location.pathname.split('/').pop() || 'home.html';
  nav.querySelectorAll('a').forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === current));

  function setOpen(button, menu, open) {
    button.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }
  function closeFloating(except) {
    if (except !== statusMenu) setOpen(statusButton, statusMenu, false);
    if (except !== accountMenu) setOpen(accountButton, accountMenu, false);
    nav.querySelectorAll('.tl-menu-group').forEach(group => group.classList.remove('is-open'));
  }
  statusButton.onclick = event => { event.stopPropagation(); const open=statusMenu.hidden; closeFloating(statusMenu); setOpen(statusButton,statusMenu,open); };
  accountButton.onclick = event => { event.stopPropagation(); const open=accountMenu.hidden; closeFloating(accountMenu); setOpen(accountButton,accountMenu,open); };
  nav.querySelectorAll('.tl-menu-toggle').forEach(toggle => { toggle.onclick = event => { event.stopPropagation(); const group=event.currentTarget.closest('.tl-menu-group'); const open=!group.classList.contains('is-open'); closeFloating(); group.classList.toggle('is-open',open); event.currentTarget.setAttribute('aria-expanded',String(open)); }; });
  document.addEventListener('pointerdown', event => { if(!header.contains(event.target)) closeFloating(); });
  document.addEventListener('keydown', event => { if(event.key==='Escape'){closeFloating();setMobile(false);} });
  function setMobile(open){nav.classList.toggle('is-mobile-open',open&&mobile.matches);backdrop.hidden=!(open&&mobile.matches);menuButton.setAttribute('aria-expanded',String(open&&mobile.matches));document.body.classList.toggle('tl-mobile-menu-open',open&&mobile.matches)}
  menuButton.onclick=()=>setMobile(!nav.classList.contains('is-mobile-open'));backdrop.onclick=()=>setMobile(false);nav.querySelectorAll('a').forEach(a=>a.onclick=()=>setMobile(false));

  function avatarMarkup() {
    const holder=header.querySelector('.tl-user-avatar');
    if(!holder)return;
    const name=profile?.game_nickname||profile?.full_name||session?.user?.email||'TL';
    if(profile?.avatar_url){const img=document.createElement('img');img.className='tl-user-avatar';img.src=profile.avatar_url;img.alt=`Avatar de ${name}`;img.onerror=()=>{img.replaceWith(fallback(name))};holder.replaceWith(img)}
    else {const node=fallback(name);holder.replaceWith(node)}
  }
  function fallback(name){const node=document.createElement('span');node.className='tl-user-avatar';node.dataset.avatarFallback='';node.textContent=String(name).slice(0,2).toUpperCase();node.style.display='grid';node.style.placeItems='center';node.style.fontSize='11px';node.style.fontWeight='800';return node}
  function paintStatus(next){status=next||'offline';statusButton.querySelector('i').className=`tl-presence-dot ${status}`;statusButton.querySelector('span').textContent=statusLabel(status)}
  function paintAccount(){const copy=header.querySelector('.tl-account-copy');if(copy){copy.querySelector('strong').textContent=profile?.game_nickname||profile?.full_name||session?.user?.email||'Entrar';copy.querySelector('small').textContent=roleLabel(profile?.role)}avatarMarkup();accountMenu.innerHTML=session?`<a href="forum.html?profile=${encodeURIComponent(session.user.id)}">Ver perfil</a><a href="forum.html?profile=${encodeURIComponent(session.user.id)}&edit=1">Editar perfil</a>${['master','admin','staff','moderator'].includes(profile?.role)?'<a href="admin.html">Painel administrativo</a>':''}<button type="button" data-logout>Terminar sessão</button>`:'<button type="button" data-login>Entrar com Google</button>';accountMenu.querySelector('[data-login]')?.addEventListener('click',login);accountMenu.querySelector('[data-logout]')?.addEventListener('click',logout)}
  async function login(){const auth=await ensureAuth();try{await auth?.signInWithGoogle()}catch(error){console.error('[AUTH] login',error?.message||error)}}
  async function logout(){const auth=await ensureAuth();try{await auth?.signOut();localStorage.removeItem('tl_profile_cache_v100')}catch(error){console.error('[AUTH] logout',error?.message||error)}}
  statusMenu.querySelectorAll('[data-presence]').forEach(button=>button.onclick=async()=>{const manager=await ensurePresence();manager?.setManual(button.dataset.presence);setOpen(statusButton,statusMenu,false)});

  let presenceSubscribed=false;
  let bootVersion=0;
  async function boot(nextSession){const version=++bootVersion;const manager=await ensurePresence();if(!presenceSubscribed&&manager){presenceSubscribed=true;manager.subscribe(state=>{paintStatus(state.status);document.querySelectorAll('#userStatus').forEach(select=>select.value=state.status)})}session=nextSession||null;if(!sb){paintAccount();return}if(session){const row=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();if(version!==bootVersion)return;profile=row.data||profile||{};localStorage.setItem('tl_profile_cache_v100',JSON.stringify(profile));await manager?.connect(sb,session.user.id,profile?.presence)}else{profile=null;manager?.disconnect();paintStatus('offline')}paintAccount();window.dispatchEvent(new CustomEvent('tl:shell-ready',{detail:{session,profile}}))}
  ensureAuth().then(auth=>auth?.subscribe(next=>boot(next)));

})();
