(() => {
  'use strict';
  if (window.__TL_SHELL_V114__) return;
  window.__TL_SHELL_V114__ = true;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  const key=file.startsWith('profile')?'profile':file.startsWith('forum')?'forum':(file.startsWith('stream')||file.startsWith('live'))?'streamers':(file.startsWith('buddy')||file.startsWith('chat'))?'chat':'home';
  let session=null,profile=null;

  const icons={
    menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9h-6v-6H9v6H3Z"/></svg>',
    forum:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h6"/></svg>',
    streamers:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15"/></svg>',
    chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>'
  };

  function avatarUrl(p){return window.TeamProfiles?.getAvatarUrl?.(p)||p?.avatar_display_url||p?.avatar_external_url||p?.custom_avatar_url||p?.avatar_url||''}
  function ensureStyle(){if(q('link[href*="tl-shell-v114.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='tl-shell-v114.css?v=114.2';document.head.appendChild(l)}
  function removeLegacy(){qa('.tl113-bottom-nav,.tl114-bottom-nav').forEach(n=>n.remove());document.body.classList.remove('tl113-has-bottom-nav','tl-mobile-menu-open')}

  function buildHeader(){
    const old=q('.tl114-header,.tl113-header,.site-header');
    const h=document.createElement('header');h.className='tl114-header';h.setAttribute('aria-label','Cabeçalho Team Lambreta');
    h.innerHTML=`<button class="tl114-menu-button" type="button" aria-label="Abrir menu" aria-expanded="false">${icons.menu}</button><a class="tl114-logo" href="home.html" aria-label="Team Lambreta — início"></a><button class="tl114-account-button" type="button" aria-label="Abrir conta" aria-expanded="false">${icons.user}</button><nav class="tl114-drawer" hidden aria-label="Menu principal"><a href="home.html">Home</a><a href="team.html">Team</a><a href="forum.html">Fórum</a><a href="streamers.html">Streamers</a><a href="eventos.html">Eventos</a><a href="profile.html#profileSocial">Redes</a><a href="profile.html">Perfil</a><a href="buddy.html">Mensagens</a></nav><div class="tl114-account-menu" hidden></div>`;
    if(old) old.replaceWith(h); else (q('.site-content')||q('.tl-profile-app-v106')||document.body).prepend(h);
    const menu=q('.tl114-menu-button',h),drawer=q('.tl114-drawer',h),account=q('.tl114-account-button',h),accountMenu=q('.tl114-account-menu',h);
    qa('.tl114-drawer a',h).forEach(a=>{const f=(a.getAttribute('href')||'').split('#')[0].toLowerCase();a.classList.toggle('is-current',f===file||(key==='streamers'&&f==='streamers.html')||(key==='profile'&&f==='profile.html'))});
    const set=(b,p,o)=>{b.setAttribute('aria-expanded',String(o));p.hidden=!o};const close=()=>{set(menu,drawer,false);set(account,accountMenu,false)};
    menu.addEventListener('click',e=>{e.stopPropagation();const o=drawer.hidden;close();set(menu,drawer,o)});account.addEventListener('click',e=>{e.stopPropagation();const o=accountMenu.hidden;close();set(account,accountMenu,o)});h.addEventListener('click',e=>e.stopPropagation());document.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});qa('a',drawer).forEach(a=>a.addEventListener('click',close));
    return {account,accountMenu};
  }

  function buildBottom(){
    const n=document.createElement('nav');n.className='tl114-bottom-nav';n.setAttribute('aria-label','Navegação principal');n.innerHTML=`<a href="home.html" data-key="home">${icons.home}<span>Home</span></a><a href="forum.html" data-key="forum">${icons.forum}<span>Fórum</span></a><a href="streamers.html" data-key="streamers">${icons.streamers}<span>Streamers</span></a><a href="buddy.html" data-key="chat">${icons.chat}<span>Chat</span><b class="tl114-badge" data-tl114-unread hidden>0</b></a><a href="profile.html" data-key="profile"><span class="tl114-nav-avatar" data-tl114-avatar><img alt="" decoding="async">${icons.user}</span><span>Perfil</span></a>`;document.body.appendChild(n);document.body.classList.add('tl114-has-bottom-nav');qa('[data-key]',n).forEach(a=>a.classList.toggle('is-active',a.dataset.key===key));return n
  }

  function paintAvatar(p,account,nav){const src=String(avatarUrl(p)||'').trim();account.innerHTML=src?`<img src="${esc(src)}" alt="Avatar">`:icons.user;const wrap=q('[data-tl114-avatar]',nav),img=wrap?.querySelector('img');if(!wrap||!img||!src)return;img.onload=()=>wrap.classList.add('has-photo');img.onerror=()=>wrap.classList.remove('has-photo');img.src=src}
  function paintUnread(nav){const b=q('[data-tl114-unread]',nav);if(!b)return;const set=v=>{const c=Math.max(0,Number(v||0));b.hidden=c<=0;b.textContent=c>99?'99+':String(c)};try{set(localStorage.getItem('tl_buddy_unread_count'))}catch{set(0)}window.TeamNotifications?.subscribe?.(({unread})=>set(unread))}
  function statusLabel(s){return s==='online'?'Online':s==='busy'?'Ocupado':s==='away'?'Ausente':'Offline'}

  async function hydrate(account,accountMenu,nav,nextSession){
    if(nextSession===undefined){try{session=await window.TeamAuth?.getSession?.()||null}catch{session=null}}else session=nextSession||null;
    profile=null;
    if(session?.user){try{profile=await window.TeamProfiles?.getCurrentProfile?.({fresh:false})||await window.TeamProfiles?.getPublicProfile?.(session.user.id,{fresh:false})||null}catch{};paintAvatar(profile,account,nav);try{await window.TeamPresence?.connect?.(window.teamSupabase,session.user.id,profile?.presence)}catch{}}
    else{paintAvatar(null,account,nav);try{window.TeamPresence?.disconnect?.()}catch{}}
    const name=profile?.display_name||session?.user?.email||'Visitante';const st=String(window.TeamPresence?.getState?.()?.status||profile?.presence||'offline').toLowerCase();accountMenu.innerHTML=`<div class="tl114-account-summary"><strong>${esc(name)}</strong><small><i class="tl114-presence ${esc(st)}"></i>${esc(statusLabel(st))}</small></div>`;
    if(session?.user){accountMenu.insertAdjacentHTML('beforeend','<a href="profile.html">Ver perfil</a><a href="profile-edit.html">Editar perfil</a><button type="button" data-tl114-logout>Sair</button>');q('[data-tl114-logout]',accountMenu)?.addEventListener('click',async()=>{try{await window.TeamAuth?.signOut?.();location.href='home.html'}catch{}})}else{accountMenu.insertAdjacentHTML('beforeend','<button type="button" data-tl114-login>Entrar com Google</button><button type="button" data-tl114-tiktok>Entrar com TikTok</button>');q('[data-tl114-login]',accountMenu)?.addEventListener('click',()=>window.TeamAuth?.signInWithGoogle?.());q('[data-tl114-tiktok]',accountMenu)?.addEventListener('click',()=>{location.href='/auth/tiktok/start'})}
    window.dispatchEvent(new CustomEvent('tl:shell-ready',{detail:{version:'114.2',session,profile}}));
  }

  ensureStyle();removeLegacy();const {account,accountMenu}=buildHeader();const nav=buildBottom();paintUnread(nav);
  window.TeamShell=Object.freeze({version:'114.2',getSession:()=>session,getProfile:()=>profile,refresh:()=>hydrate(account,accountMenu,nav)});
  window.TeamAuth?.subscribe?.(s=>hydrate(account,accountMenu,nav,s));
  hydrate(account,accountMenu,nav);
})();
