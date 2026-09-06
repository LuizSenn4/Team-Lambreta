(() => {
  'use strict';
  if (window.__TL_SHELL_V115__) return;
  window.__TL_SHELL_V115__ = true;
  window.TL_CORE_V102 = true;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  const key=file.startsWith('profile')?'profile':file.startsWith('forum')?'forum':(file.startsWith('stream')||file.startsWith('live'))?'streamers':(file.startsWith('buddy')||file.startsWith('chat'))?'chat':'home';
  let session=null,profile=null,nav=null;

  const icons={
    menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    forum:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h6"/></svg>',
    streamers:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15"/></svg>',
    chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>'
  };

  function ensureStyle(){
    if(q('link[href*="tl-shell-v115.css"]')) return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='tl-shell-v115.css?v=115.0';document.head.appendChild(link);
  }
  function removeLegacy(){
    qa('.tl113-header,.tl114-header,.tl115-header,.tl113-bottom-nav,.tl114-bottom-nav,.tl115-bottom-nav').forEach(n=>n.remove());
    document.body.classList.remove('tl113-has-bottom-nav','tl114-has-bottom-nav','tl115-has-bottom-nav','tl-mobile-menu-open');
  }
  function avatarUrl(p){return window.TeamProfiles?.getAvatarUrl?.(p)||p?.avatar_display_url||p?.avatar_external_url||p?.custom_avatar_url||p?.avatar_url||''}
  function statusLabel(s){return s==='online'?'Online':s==='busy'?'Ocupado':s==='away'?'Ausente':'Offline'}

  function buildHeader(){
    const placeholder=q('.site-header');
    const h=document.createElement('header');h.className='tl115-header';h.setAttribute('aria-label','Cabeçalho Team Lambreta');
    h.innerHTML=`<button class="tl115-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false">${icons.menu}</button><a class="tl115-logo" href="home.html" aria-label="Team Lambreta — ir para Home"></a><button class="tl115-account-button" type="button" aria-label="Abrir conta" aria-expanded="false">${icons.user}</button><nav class="tl115-drawer" hidden aria-label="Menu principal"><a href="home.html">Home</a><a href="team.html">Team</a><a href="forum.html">Fórum</a><a href="streamers.html">Streamers</a><a href="eventos.html">Eventos</a><a href="profile.html#profileSocial">Redes</a><a href="profile.html">Perfil</a><a href="buddy.html">Mensagens</a><a href="atualizacoes.html">Atualizações</a></nav><div class="tl115-account-menu" hidden></div>`;
    if(placeholder) placeholder.replaceWith(h); else (q('.site-content')||q('.tl-profile-app-v106')||document.body).prepend(h);
    const menu=q('.tl115-menu-button',h),drawer=q('.tl115-drawer',h),account=q('.tl115-account-button',h),accountMenu=q('.tl115-account-menu',h);
    qa('.tl115-drawer a',h).forEach(a=>{const f=(a.getAttribute('href')||'').split('#')[0].toLowerCase();a.classList.toggle('is-current',f===file||(key==='streamers'&&f==='streamers.html')||(key==='profile'&&f==='profile.html'))});
    const set=(button,panel,open)=>{button?.setAttribute('aria-expanded',String(open));if(panel)panel.hidden=!open};
    const bottomButton=()=>q('[data-tl115-bottom-menu]');
    const close=()=>{set(menu,drawer,false);set(account,accountMenu,false);bottomButton()?.setAttribute('aria-expanded','false')};
    const toggleMenu=()=>{const open=drawer.hidden;close();set(menu,drawer,open);bottomButton()?.setAttribute('aria-expanded',String(open))};
    menu.addEventListener('click',e=>{e.stopPropagation();toggleMenu()});
    account.addEventListener('click',e=>{e.stopPropagation();const open=accountMenu.hidden;close();set(account,accountMenu,open)});
    h.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    qa('a',drawer).forEach(a=>a.addEventListener('click',close));
    return {h,account,accountMenu,drawer,close,toggleMenu};
  }

  function buildBottom(toggleMenu){
    const n=document.createElement('nav');n.className='tl115-bottom-nav';n.setAttribute('aria-label','Navegação principal');
    n.innerHTML=`<button type="button" data-tl115-bottom-menu aria-label="Abrir menu" aria-expanded="false">${icons.menu}<span>Menu</span></button><a href="forum.html" data-key="forum">${icons.forum}<span>Fórum</span></a><a href="streamers.html" data-key="streamers">${icons.streamers}<span>Streamers</span></a><a href="buddy.html" data-key="chat">${icons.chat}<span>Chat</span><b class="tl115-badge" data-tl115-unread hidden>0</b></a><a href="profile.html" data-key="profile"><span class="tl115-nav-avatar" data-tl115-avatar><img alt="" decoding="async">${icons.user}</span><span>Perfil</span></a>`;
    document.body.appendChild(n);document.body.classList.add('tl115-has-bottom-nav');
    qa('[data-key]',n).forEach(a=>a.classList.toggle('is-active',a.dataset.key===key));
    q('[data-tl115-bottom-menu]',n)?.addEventListener('click',e=>{e.stopPropagation();toggleMenu()});
    return n;
  }

  function paintAvatar(p,account){
    const src=String(avatarUrl(p)||'').trim();account.innerHTML=src?`<img src="${esc(src)}" alt="Avatar">`:icons.user;
    const wrap=q('[data-tl115-avatar]',nav),img=wrap?.querySelector('img');if(!wrap||!img)return;
    if(!src){wrap.classList.remove('has-photo');img.removeAttribute('src');return}
    img.onload=()=>wrap.classList.add('has-photo');img.onerror=()=>wrap.classList.remove('has-photo');img.src=src;
  }
  function paintUnread(){
    const badge=q('[data-tl115-unread]',nav);if(!badge)return;
    const set=v=>{const count=Math.max(0,Number(v||0));badge.hidden=count<=0;badge.textContent=count>99?'99+':String(count)};
    try{set(localStorage.getItem('tl_buddy_unread_count'))}catch{set(0)}
    window.TeamNotifications?.subscribe?.(({unread})=>set(unread));
  }

  async function hydrate(account,accountMenu,drawer,close,nextSession){
    if(nextSession===undefined){try{session=await window.TeamAuth?.getSession?.()||null}catch{session=null}}else session=nextSession||null;
    profile=null;
    if(session?.user){
      try{profile=await window.TeamProfiles?.getCurrentProfile?.({fresh:false})||await window.TeamProfiles?.getPublicProfile?.(session.user.id,{fresh:false})||null}catch{}
      paintAvatar(profile,account);try{await window.TeamPresence?.connect?.(window.teamSupabase,session.user.id,profile?.presence)}catch{}
    }else{paintAvatar(null,account);try{window.TeamPresence?.disconnect?.()}catch{}}
    const name=profile?.display_name||session?.user?.email||'Visitante';const st=String(window.TeamPresence?.getState?.()?.status||profile?.presence||'offline').toLowerCase();
    accountMenu.innerHTML=`<div class="tl115-account-summary"><strong>${esc(name)}</strong><small><i class="tl115-presence ${esc(st)}"></i>${esc(statusLabel(st))}</small></div>`;
    qa('[data-tl115-admin-link],[data-tl115-drawer-account]',drawer).forEach(node=>node.remove());
    if(session?.user){
      let canAdmin=false;try{canAdmin=await window.TeamPermissions?.can?.('admin.full')||false}catch{}
      if(canAdmin){drawer.insertAdjacentHTML('beforeend','<a href="admin.html" data-tl115-admin-link>Admin</a>');q('[data-tl115-admin-link]',drawer)?.addEventListener('click',close)}
      drawer.insertAdjacentHTML('beforeend','<button type="button" data-tl115-drawer-account data-tl115-drawer-logout>Sair</button>');
      accountMenu.insertAdjacentHTML('beforeend','<a href="profile.html">Ver perfil</a><a href="profile-edit.html">Editar perfil</a><button type="button" data-tl115-logout>Sair</button>');
      const logout=async()=>{try{await window.TeamAuth?.signOut?.();location.href='home.html'}catch{}};
      q('[data-tl115-logout]',accountMenu)?.addEventListener('click',logout);q('[data-tl115-drawer-logout]',drawer)?.addEventListener('click',()=>{close();logout()});
    }else{
      drawer.insertAdjacentHTML('beforeend','<button type="button" data-tl115-drawer-account data-tl115-drawer-login>Entrar com Google</button><button type="button" data-tl115-drawer-account data-tl115-drawer-tiktok>Entrar com TikTok</button>');
      accountMenu.insertAdjacentHTML('beforeend','<button type="button" data-tl115-login>Entrar com Google</button><button type="button" data-tl115-tiktok>Entrar com TikTok</button>');
      const google=()=>window.TeamAuth?.signInWithGoogle?.();const tiktok=()=>{location.href='/auth/tiktok/start'};
      q('[data-tl115-login]',accountMenu)?.addEventListener('click',google);q('[data-tl115-tiktok]',accountMenu)?.addEventListener('click',tiktok);q('[data-tl115-drawer-login]',drawer)?.addEventListener('click',()=>{close();google()});q('[data-tl115-drawer-tiktok]',drawer)?.addEventListener('click',()=>{close();tiktok()});
    }
    window.dispatchEvent(new CustomEvent('tl:shell-ready',{detail:{version:'115.0',session,profile}}));
  }

  ensureStyle();removeLegacy();
  const {account,accountMenu,drawer,close,toggleMenu}=buildHeader();nav=buildBottom(toggleMenu);paintUnread();
  window.TeamShell=Object.freeze({version:'115.0',getSession:()=>session,getProfile:()=>profile,refresh:()=>hydrate(account,accountMenu,drawer,close)});
  const subscribed=window.TeamAuth?.subscribe?.(s=>hydrate(account,accountMenu,drawer,close,s));if(!subscribed)hydrate(account,accountMenu,drawer,close);
})();
