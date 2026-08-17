(()=>{
  'use strict';
  if(window.TLAccountProfileEntryLoaded)return;
  window.TLAccountProfileEntryLoaded=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleKey=role=>({dev:'master',developer:'master',owner:'master',boss:'master',administrador:'admin',mod:'moderator',moderador:'moderator',helper:'staff',suporte:'staff',apoiador:'supporter',support:'supporter',user:'member',usuario:'member',membro:'member'}[String(role||'').trim().toLowerCase()]||String(role||'member').trim().toLowerCase()||'member');
  const roleLabel=role=>({master:'DEV',admin:'ADMIN',moderator:'MODERADOR',staff:'STAFF',vip:'VIP',supporter:'APOIADOR',streamer:'STREAMER',member:'MEMBRO'}[roleKey(role)]||'MEMBRO');

  function ensureStyles(){
    if(document.getElementById('tl-account-profile-entry-style'))return;
    const s=document.createElement('style');
    s.id='tl-account-profile-entry-style';
    s.textContent=`
      .forum-profile-cover-edit-profile{display:none!important}
      .tl-home-account-card{grid-column:3;grid-row:1;justify-self:end;align-self:center;display:grid;grid-template-columns:42px minmax(0,1fr);grid-template-areas:'avatar identity' 'avatar action';column-gap:10px;row-gap:6px;min-width:250px;max-width:310px;padding:10px 12px;border:1px solid rgba(217,164,65,.46);border-radius:18px;background:linear-gradient(145deg,rgba(12,12,10,.96),rgba(6,7,6,.94));box-shadow:inset 0 0 0 1px rgba(255,255,255,.025),0 10px 30px rgba(0,0,0,.28);color:#f7f4ea;box-sizing:border-box}
      .tl-home-account-card[hidden]{display:none!important}
      .tl-home-account-avatar,.tl-home-account-fallback{grid-area:avatar;width:42px;height:42px;border-radius:50%;object-fit:cover;align-self:center;border:1px solid rgba(217,164,65,.55);background:#11130f;color:#f1d36f;box-shadow:0 0 10px rgba(217,164,65,.12)}
      .tl-home-account-fallback{display:grid;place-items:center;font:900 14px system-ui}
      .tl-home-account-identity{grid-area:identity;display:flex;align-items:center;min-width:0;gap:7px}
      .tl-home-account-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:850 12px/1.1 system-ui;color:#eef2ee}
      .tl-home-account-role{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-height:18px;padding:0 7px;border:1px solid currentColor;border-radius:999px;font:950 8px/16px system-ui;letter-spacing:.07em;color:#d8b354;background:#16130a}
      .tl-home-account-card.role-master .tl-home-account-name,.tl-home-account-card.role-dev .tl-home-account-name{color:#5ef3ff;text-shadow:0 0 7px rgba(94,243,255,.35)}
      .tl-home-account-card.role-master .tl-home-account-role,.tl-home-account-card.role-dev .tl-home-account-role{color:#5ef3ff;background:#082026}
      .tl-home-account-card.role-admin .tl-home-account-name,.tl-home-account-card.role-admin .tl-home-account-role{color:#ff6073}
      .tl-home-account-card.role-moderator .tl-home-account-name,.tl-home-account-card.role-moderator .tl-home-account-role{color:#66b7ff}
      .tl-home-account-card.role-staff .tl-home-account-name,.tl-home-account-card.role-staff .tl-home-account-role{color:#c296ff}
      .tl-home-account-card.role-vip .tl-home-account-name,.tl-home-account-card.role-vip .tl-home-account-role{color:#ffd45d}
      .tl-home-account-card.role-supporter .tl-home-account-name,.tl-home-account-card.role-supporter .tl-home-account-role{color:#73ff18}
      .tl-home-account-edit{grid-area:action;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:30px;padding:0 12px;border:1px solid rgba(217,164,65,.52);border-radius:999px;background:#0b0b09;color:#f1e4be;text-decoration:none;font:800 11px/1 system-ui;transition:border-color .16s ease,color .16s ease,transform .16s ease}
      .tl-home-account-edit:hover,.tl-home-account-edit:focus-visible{border-color:#f4c951;color:#fff0a8;transform:translateY(-1px);outline:none}
      .tl-home-account-edit svg{width:13px;height:13px;fill:currentColor}
      html[data-theme='light'] .tl-home-account-card{background:#151713;border-color:#9b7b2c;box-shadow:0 8px 20px rgba(43,36,18,.22)}
      html[data-theme='light'] .tl-home-account-card.role-member .tl-home-account-name{color:#f4f6f3}
      @media(max-width:900px){
        .site-header.tl-header-v88>.tl-home-account-card{grid-column:1/-1;grid-row:2;width:100%;max-width:none;justify-self:stretch;grid-template-columns:38px minmax(0,1fr) auto;grid-template-areas:'avatar identity action';align-items:center;padding:8px 10px;border-radius:14px}
        .tl-home-account-avatar,.tl-home-account-fallback{width:38px;height:38px}
        .tl-home-account-edit{min-width:112px}
      }
      @media(max-width:480px){
        .site-header.tl-header-v88>.tl-home-account-card{grid-template-columns:36px minmax(0,1fr);grid-template-areas:'avatar identity' 'avatar action';column-gap:9px;row-gap:4px}
        .tl-home-account-avatar,.tl-home-account-fallback{width:36px;height:36px}
        .tl-home-account-edit{justify-self:start;min-width:0;min-height:28px;padding-inline:10px;font-size:10px}
      }
    `;
    document.head.appendChild(s);
  }

  function client(){return window.teamSupabase||null}

  async function forumAvatarUrl(c,fp){
    if(fp?.avatar_external_url)return fp.avatar_external_url;
    if(fp?.avatar_path){
      const {data}=await c.storage.from('forum-avatars').createSignedUrl(fp.avatar_path,3600);
      if(data?.signedUrl)return data.signedUrl;
    }
    return '';
  }

  async function renderHomeCard(){
    if(!/home\.html$/i.test(location.pathname)&&location.pathname!=='/'&&location.pathname!=='')return;
    const header=document.querySelector('.site-header.tl-header-v88');
    if(!header)return;
    const c=client();
    if(!c)return;
    const {data:{session}}=await c.auth.getSession();
    let card=document.getElementById('tlHomeAccountCard');
    if(!session){if(card)card.hidden=true;return}
    const uid=session.user.id;
    const [{data:p},{data:fp}]=await Promise.all([
      c.from('profiles').select('id,game_nickname,game_nickname_public,full_name,role,custom_avatar_url,avatar_url').eq('id',uid).maybeSingle(),
      c.from('forum_profiles').select('user_id,forum_nickname,avatar_path,avatar_external_url').eq('user_id',uid).maybeSingle()
    ]);
    const nick=fp?.forum_nickname||p?.game_nickname_public||p?.game_nickname||p?.full_name||session.user.user_metadata?.preferred_username||session.user.user_metadata?.full_name||'Membro';
    const avatar=(await forumAvatarUrl(c,fp))||p?.custom_avatar_url||p?.avatar_url||session.user.user_metadata?.avatar_url||'';
    const rk=roleKey(p?.role);
    if(!card){card=document.createElement('section');card.id='tlHomeAccountCard';header.appendChild(card)}
    card.className=`tl-home-account-card role-${esc(rk)}`;
    const avatarHtml=avatar?`<img class="tl-home-account-avatar" src="${esc(avatar)}" alt="Avatar de ${esc(nick)}">`:`<span class="tl-home-account-fallback" aria-hidden="true">${esc(nick.slice(0,1).toUpperCase())}</span>`;
    card.innerHTML=`${avatarHtml}<div class="tl-home-account-identity"><strong class="tl-home-account-name">${esc(nick)}</strong><span class="tl-home-account-role">${esc(roleLabel(p?.role))}</span></div><a class="tl-home-account-edit" href="forum.html?profile=${encodeURIComponent(uid)}&edit=1" aria-label="Editar meu perfil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 15.8-.8 5 5-.8L19.5 8.7l-4.2-4.2L4 15.8Zm12.7-12.7 4.2 4.2 1-1a1.5 1.5 0 0 0 0-2.1l-2.1-2.1a1.5 1.5 0 0 0-2.1 0l-1 1Z"/></svg>Editar perfil</a>`;
    card.hidden=false;
  }

  function openForumEditorFromHome(){
    if(!/forum\.html$/i.test(location.pathname))return;
    const q=new URLSearchParams(location.search);
    if(q.get('edit')!=='1')return;
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      const trigger=document.querySelector('[data-edit-profile]');
      if(trigger){
        clearInterval(timer);
        trigger.click();
        q.delete('edit');
        const search=q.toString();
        const next=`${location.pathname}${search?`?${search}`:''}${location.hash}`;
        history.replaceState({},'',next);
      }else if(tries>80){clearInterval(timer)}
    },100);
  }

  async function start(){
    ensureStyles();
    let tries=0;
    const wait=setInterval(async()=>{
      tries+=1;
      if(client()){
        clearInterval(wait);
        await renderHomeCard();
        openForumEditorFromHome();
        client().auth.onAuthStateChange(()=>setTimeout(renderHomeCard,0));
      }else if(tries>60){clearInterval(wait)}
    },100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();