(()=>{
  'use strict';
  if (window.TLMemberMentionPreviewLoaded) return;
  window.TLMemberMentionPreviewLoaded = true;

  const SUPABASE_URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=v=>String(v||'').trim().replace(/^@/,'').toLocaleLowerCase('pt-PT');
  const roleLabel=role=>({master:'DEV',dev:'DEV',admin:'ADMIN',moderator:'MODERADOR',moderador:'MODERADOR',staff:'STAFF',boss:'BOSS',streamer:'STREAMER',vip:'VIP',supporter:'APOIADOR',member:'MEMBRO'}[String(role||'member').toLowerCase()]||'MEMBRO');
  const countryFlag=code=>{code=String(code||'').toUpperCase();return /^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):''};

  let sb=null,profiles=[],forumProfiles=[],loaded=false,loading=null,card=null,active=null,hideTimer=null;
  function client(){
    if(sb)return sb;
    if(window.teamSupabase)return sb=window.teamSupabase;
    if(window.supabase?.createClient)return sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return null;
  }
  async function loadProfiles(){
    if(loaded)return;
    if(loading)return loading;
    const c=client(); if(!c)return;
    loading=(async()=>{
      const [p,f]=await Promise.all([
        c.from('profiles').select('id,game_nickname,game_nickname_public,full_name,role,custom_avatar_url,avatar_url,country,main_game,level,is_streamer,vip_until,profile_public').limit(500),
        c.from('forum_profiles').select('user_id,forum_nickname,country,games').limit(500)
      ]);
      profiles=(p.data||[]).filter(x=>x.profile_public!==false);
      forumProfiles=f.data||[];
      loaded=true;
    })().finally(()=>loading=null);
    return loading;
  }
  function mergedByNick(nick){
    const key=normalize(nick);
    const fp=forumProfiles.find(x=>normalize(x.forum_nickname)===key);
    let p=fp?profiles.find(x=>String(x.id)===String(fp.user_id)):null;
    if(!p)p=profiles.find(x=>[x.game_nickname_public,x.game_nickname,x.full_name].some(v=>normalize(v)===key));
    if(!p)return null;
    const f=forumProfiles.find(x=>String(x.user_id)===String(p.id));
    return {...p,...(f||{}),id:p.id};
  }
  function displayName(p){return p.forum_nickname||p.game_nickname_public||p.game_nickname||p.full_name||'Membro'}
  function avatar(p){return p.custom_avatar_url||p.avatar_url||''}
  function country(p){return String(p.country||'').toUpperCase()}
  function game(p){return Array.isArray(p.games)&&p.games[0]?p.games[0]:(p.main_game||'')}

  function ensureStyle(){if(document.getElementById('tl-member-mention-style'))return;const s=document.createElement('style');s.id='tl-member-mention-style';s.textContent=`
.tl-chat-mention,.tl-global-mention{cursor:pointer;text-decoration:none;font:inherit;color:#73ff18;border:0;background:none;padding:0}
.tl-member-preview{position:fixed;z-index:10050;width:min(310px,calc(100vw - 20px));padding:12px;border:1px solid rgba(94,243,255,.38);border-radius:14px;background:rgba(7,11,9,.97);box-shadow:0 18px 50px rgba(0,0,0,.5);color:#eef7f0;backdrop-filter:blur(12px)}
.tl-member-preview[hidden]{display:none!important}.tl-member-preview-head{display:grid;grid-template-columns:52px 1fr 34px;gap:10px;align-items:center}.tl-member-preview-avatar{width:52px;height:52px;border-radius:11px;object-fit:cover;background:#121713;border:1px solid rgba(200,164,72,.3)}
.tl-member-preview h3{margin:0;color:#5ef3ff;font-size:16px;line-height:1.1}.tl-member-preview-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:5px;font-size:11px;color:#b9c5bb}.tl-member-preview-role{padding:2px 7px;border:1px solid currentColor;border-radius:999px;color:#5ef3ff;font-size:9px;font-weight:800;letter-spacing:.08em}.tl-member-preview-go{display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(115,255,24,.4);border-radius:50%;background:#0b120d;color:#73ff18;text-decoration:none;font-size:20px}.tl-member-preview-game{margin:9px 0 0;color:#cbd5cd;font-size:12px}.tl-member-preview-go:hover{border-color:#73ff18;transform:translateX(1px)}
html[data-theme="light"] .tl-member-preview{background:rgba(255,253,247,.98);color:#182019;border-color:rgba(18,102,77,.32);box-shadow:0 18px 44px rgba(45,38,20,.2)}html[data-theme="light"] .tl-member-preview h3{color:#075f5e}html[data-theme="light"] .tl-member-preview-meta,html[data-theme="light"] .tl-member-preview-game{color:#4f5b50}html[data-theme="light"] .tl-member-preview-go{background:#f5f1e7;color:#176c2b}
@media(max-width:650px){.tl-member-preview{position:fixed;left:10px!important;right:10px!important;bottom:14px!important;top:auto!important;width:auto}}
`;document.head.appendChild(s)}
  function ensureCard(){if(card)return card;ensureStyle();card=document.createElement('aside');card.className='tl-member-preview';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-label','Resumo do membro');document.body.appendChild(card);card.addEventListener('pointerenter',()=>clearTimeout(hideTimer));card.addEventListener('pointerleave',()=>hide());return card}
  function position(trigger){if(!card||card.hidden||innerWidth<=650)return;const r=trigger.getBoundingClientRect(),gap=8,w=card.offsetWidth||310,h=card.offsetHeight||130;let left=r.left,top=r.bottom+gap;if(left+w>innerWidth-10)left=innerWidth-w-10;if(top+h>innerHeight-10)top=r.top-h-gap;card.style.left=Math.max(10,left)+'px';card.style.top=Math.max(10,top)+'px'}
  function hide(delay=120){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(card)card.hidden=true;active=null},delay)}
  async function show(trigger){
    clearTimeout(hideTimer); await loadProfiles();
    const nick=trigger.dataset.memberNick||trigger.textContent; const p=mergedByNick(nick); if(!p)return;
    active=trigger; const c=ensureCard(),cc=country(p),flag=countryFlag(cc),g=game(p);
    c.innerHTML=`<div class="tl-member-preview-head"><img class="tl-member-preview-avatar" src="${esc(avatar(p))}" alt=""><div><h3>${esc(displayName(p))}</h3><div class="tl-member-preview-meta"><span class="tl-member-preview-role">${esc(roleLabel(p.role))}</span>${cc?`<span>${flag} ${esc(cc)}</span>`:''}</div></div><a class="tl-member-preview-go" href="forum.html?profile=${encodeURIComponent(p.id)}" aria-label="Visitar perfil de ${esc(displayName(p))}" title="Visitar perfil">→</a></div>${g?`<p class="tl-member-preview-game">Jogo: ${esc(g)}</p>`:''}`;
    c.hidden=false; requestAnimationFrame(()=>position(trigger));
  }
  function enhancePublicMentions(root=document){
    root.querySelectorAll?.('.tl-chat-mention:not([data-member-preview-ready])').forEach(el=>{el.dataset.memberPreviewReady='1';el.dataset.memberNick=el.textContent.replace(/^@/,'');el.setAttribute('role','button');el.tabIndex=0});
  }
  function enhanceBuddy(root=document){
    const containers=[];
    if(root.matches?.('#buddyMessages p'))containers.push(root);
    root.querySelectorAll?.('#buddyMessages p:not([data-member-scan])').forEach(x=>containers.push(x));
    containers.forEach(el=>{
      if(el.dataset.memberScan)return;el.dataset.memberScan='1';
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('small,.tl-global-mention')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
      const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(node=>{const text=node.nodeValue||'';const re=/(^|\s)@([A-Za-z0-9_.-]{2,32})/g;if(!re.test(text))return;re.lastIndex=0;const frag=document.createDocumentFragment();let last=0,m;while((m=re.exec(text))){frag.append(text.slice(last,m.index)+m[1]);const b=document.createElement('button');b.type='button';b.className='tl-global-mention';b.dataset.memberNick=m[2];b.textContent='@'+m[2];frag.append(b);last=m.index+m[0].length}frag.append(text.slice(last));node.replaceWith(frag)})
    })
  }
  function enhance(root=document){enhancePublicMentions(root);enhanceBuddy(root)}

  document.addEventListener('pointerover',e=>{const t=e.target.closest?.('.tl-chat-mention,.tl-global-mention');if(t&&matchMedia('(hover:hover)').matches)show(t)});
  document.addEventListener('pointerout',e=>{const t=e.target.closest?.('.tl-chat-mention,.tl-global-mention');if(t&&matchMedia('(hover:hover)').matches&&!card?.contains(e.relatedTarget))hide()});
  document.addEventListener('click',e=>{const t=e.target.closest?.('.tl-chat-mention,.tl-global-mention');if(t){e.preventDefault();e.stopPropagation();if(active===t&&!card?.hidden)hide(0);else show(t);return}if(card&&!card.hidden&&!card.contains(e.target))hide(0)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide(0);if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.tl-chat-mention,.tl-global-mention')){e.preventDefault();show(e.target)}});
  window.addEventListener('resize',()=>active&&position(active),{passive:true});window.addEventListener('scroll',()=>{if(active&&innerWidth>650)position(active)},{passive:true,capture:true});

  const loadForumEnhancements=()=>{
    if(!document.getElementById('forumProfileForm')||document.querySelector('script[data-forum-profile-enhancements]'))return;
    const script=document.createElement('script');script.src='forum-profile-enhancements-v1.js?v=1.0';script.defer=true;script.dataset.forumProfileEnhancements='1';document.body.appendChild(script);
  };
  const start=()=>{ensureStyle();enhance();loadForumEnhancements();const mo=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1){enhance(n);loadForumEnhancements()}})));mo.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();