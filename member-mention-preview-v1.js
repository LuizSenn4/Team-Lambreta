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
  const triggerSelector='.tl-chat-mention,.tl-global-mention,.tl-profile-trigger';

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
        c.from('profiles').select('id,game_nickname,game_nickname_public,full_name,role,custom_avatar_url,avatar_url,main_game,level,is_streamer,vip_until,profile_public').limit(500),
        c.from('forum_profiles').select('user_id,forum_nickname,country,games,avatar_path,avatar_external_url').limit(500)
      ]);
      if(p.error) throw p.error;
      if(f.error) throw f.error;
      profiles=(p.data||[]).filter(x=>x.profile_public!==false);
      forumProfiles=f.data||[];
      const paths=[...new Set(forumProfiles.map(x=>x.avatar_path).filter(Boolean))];
      if(paths.length){
        const signed=await Promise.all(paths.map(async path=>{
          const {data,error}=await c.storage.from('forum-avatars').createSignedUrl(path,3600);
          return [path,error?'':(data?.signedUrl||'')];
        }));
        const map=new Map(signed);
        forumProfiles=forumProfiles.map(x=>({...x,avatar_signed_url:x.avatar_path?map.get(x.avatar_path)||'':''}));
      }
      loaded=true;
    })().catch(error=>{console.error('[TL member preview]',error);loaded=false}).finally(()=>loading=null);
    return loading;
  }
  function mergeProfile(p){
    if(!p)return null;
    const f=forumProfiles.find(x=>String(x.user_id)===String(p.id));
    return {...p,...(f||{}),id:p.id};
  }
  function mergedById(id){return mergeProfile(profiles.find(x=>String(x.id)===String(id)))}
  function mergedByNick(nick){
    const key=normalize(nick);
    const fp=forumProfiles.find(x=>normalize(x.forum_nickname)===key);
    let p=fp?profiles.find(x=>String(x.id)===String(fp.user_id)):null;
    if(!p)p=profiles.find(x=>[x.game_nickname_public,x.game_nickname,x.full_name].some(v=>normalize(v)===key));
    return mergeProfile(p);
  }
  function displayName(p){return p.forum_nickname||p.game_nickname_public||p.game_nickname||p.full_name||'Membro'}
  function avatar(p){return p.avatar_external_url||p.avatar_signed_url||p.custom_avatar_url||p.avatar_url||''}
  function country(p){return String(p.country||'').toUpperCase()}
  function game(p){return Array.isArray(p.games)&&p.games[0]?p.games[0]:(p.main_game||'')}

  function ensureStyle(){if(document.getElementById('tl-member-mention-style'))return;const s=document.createElement('style');s.id='tl-member-mention-style';s.textContent=`
.tl-chat-mention,.tl-global-mention{cursor:pointer;text-decoration:none;font:inherit;color:#5ef3ff;border:0;background:none;padding:0;text-shadow:0 0 2px #5ef3ff,0 0 7px rgba(94,243,255,.78),0 0 13px rgba(94,243,255,.34);transition:color .14s ease,text-shadow .14s ease}
.tl-chat-mention:hover,.tl-global-mention:hover,.tl-chat-mention:focus-visible,.tl-global-mention:focus-visible{color:#baffff;text-shadow:0 0 3px #baffff,0 0 9px rgba(94,243,255,.95),0 0 18px rgba(94,243,255,.55);outline:none}
.tl-profile-trigger{cursor:pointer;text-decoration:none}.tl-profile-trigger:hover{text-decoration:underline;text-underline-offset:3px}.tl-profile-trigger:focus-visible{outline:1px solid currentColor;outline-offset:2px;border-radius:3px}
.tl-member-preview{position:fixed;z-index:10050;width:min(310px,calc(100vw - 20px));padding:12px;border:1px solid rgba(94,243,255,.38);border-radius:14px;background:rgba(7,11,9,.97);box-shadow:0 18px 50px rgba(0,0,0,.5);color:#eef7f0;backdrop-filter:blur(12px)}
.tl-member-preview[hidden]{display:none!important}.tl-member-preview-head{display:grid;grid-template-columns:52px 1fr 34px;gap:10px;align-items:center}.tl-member-preview-avatar,.tl-member-preview-fallback{width:52px;height:52px;border-radius:11px;object-fit:cover;background:#121713;border:1px solid rgba(200,164,72,.3)}.tl-member-preview-fallback{display:grid;place-items:center;color:#c8a448;font-weight:900;font-size:20px}
.tl-member-preview h3{margin:0;color:#5ef3ff;font-size:16px;line-height:1.1}.tl-member-preview-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:5px;font-size:11px;color:#b9c5bb}.tl-member-preview-role{padding:2px 7px;border:1px solid currentColor;border-radius:999px;color:#5ef3ff;font-size:9px;font-weight:800;letter-spacing:.08em}.tl-member-preview-go{display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(94,243,255,.5);border-radius:50%;background:#0b120d;color:#5ef3ff;text-decoration:none;font-size:20px}.tl-member-preview-game{margin:9px 0 0;color:#cbd5cd;font-size:12px}.tl-member-preview-go:hover{border-color:#5ef3ff;color:#baffff;box-shadow:0 0 12px rgba(94,243,255,.28);transform:translateX(1px)}
html[data-theme="light"] .tl-member-preview{background:#111612;color:#f2f6f3;border-color:#39ddea;box-shadow:0 18px 44px rgba(0,0,0,.34)}html[data-theme="light"] .tl-member-preview h3{color:#5ef3ff}html[data-theme="light"] .tl-member-preview-meta,html[data-theme="light"] .tl-member-preview-game{color:#c5cec7}html[data-theme="light"] .tl-member-preview-role{color:#fff;background:#092329;border-color:#5ef3ff}html[data-theme="light"] .tl-member-preview-go{background:#102013;color:#5ef3ff;border-color:#5ef3ff}
@media(max-width:650px){.tl-member-preview{position:fixed;left:10px!important;right:10px!important;bottom:14px!important;top:auto!important;width:auto}}
`;document.head.appendChild(s)}
  function ensureCard(){if(card)return card;ensureStyle();card=document.createElement('aside');card.className='tl-member-preview';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-label','Resumo do membro');document.body.appendChild(card);card.addEventListener('pointerenter',()=>clearTimeout(hideTimer));card.addEventListener('pointerleave',()=>hide());return card}
  function position(trigger){if(!card||card.hidden||innerWidth<=650)return;const r=trigger.getBoundingClientRect(),gap=8,w=card.offsetWidth||310,h=card.offsetHeight||130;let left=r.left,top=r.bottom+gap;if(left+w>innerWidth-10)left=innerWidth-w-10;if(top+h>innerHeight-10)top=r.top-h-gap;card.style.left=Math.max(10,left)+'px';card.style.top=Math.max(10,top)+'px'}
  function hide(delay=120){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(card)card.hidden=true;active=null},delay)}
  async function show(trigger){
    clearTimeout(hideTimer);await loadProfiles();
    const userId=trigger.dataset.memberUserId||trigger.dataset.userId||'';
    const nick=trigger.dataset.memberNick||trigger.textContent;
    const p=userId?mergedById(userId):mergedByNick(nick);
    if(!p)return;
    active=trigger;const c=ensureCard(),cc=country(p),flag=countryFlag(cc),g=game(p),src=avatar(p),label=displayName(p);
    const avatarHtml=src?`<img class="tl-member-preview-avatar" src="${esc(src)}" alt="Avatar de ${esc(label)}">`:`<span class="tl-member-preview-fallback" aria-hidden="true">${esc(label.slice(0,1).toUpperCase())}</span>`;
    c.innerHTML=`<div class="tl-member-preview-head">${avatarHtml}<div><h3>${esc(label)}</h3><div class="tl-member-preview-meta"><span class="tl-member-preview-role">${esc(roleLabel(p.role))}</span>${cc?`<span>${flag} ${esc(cc)}</span>`:''}</div></div><a class="tl-member-preview-go" href="forum.html?profile=${encodeURIComponent(p.id)}" aria-label="Visitar perfil de ${esc(label)}" title="Visitar perfil">→</a></div>${g?`<p class="tl-member-preview-game">Jogo: ${esc(g)}</p>`:''}`;
    c.hidden=false;requestAnimationFrame(()=>position(trigger));
  }
  function enhancePublicMentions(root=document){root.querySelectorAll?.('.tl-chat-mention:not([data-member-preview-ready])').forEach(el=>{el.dataset.memberPreviewReady='1';el.dataset.memberNick=el.textContent.replace(/^@/,'');el.setAttribute('role','button');el.tabIndex=0})}
  function enhanceChatNames(root=document){
    const names=[];if(root.matches?.('.tl-chat-name'))names.push(root);root.querySelectorAll?.('.tl-chat-name:not([data-profile-preview-ready])').forEach(el=>names.push(el));
    names.forEach(el=>{if(el.dataset.profilePreviewReady)return;el.dataset.profilePreviewReady='1';el.dataset.memberNick=String(el.textContent||'').trim();if(el.dataset.userId)el.dataset.memberUserId=el.dataset.userId;el.classList.add('tl-profile-trigger');el.setAttribute('role','button');el.setAttribute('aria-label',`Ver perfil de ${el.dataset.memberNick}`);el.tabIndex=0})
  }
  function enhanceBuddy(root=document){
    const containers=[];if(root.matches?.('#buddyMessages p'))containers.push(root);root.querySelectorAll?.('#buddyMessages p:not([data-member-scan])').forEach(x=>containers.push(x));
    containers.forEach(el=>{if(el.dataset.memberScan)return;el.dataset.memberScan='1';const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('small,.tl-global-mention')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{const text=node.nodeValue||'',re=/(^|\s)@([A-Za-z0-9_.-]{2,32})/g;if(!re.test(text))return;re.lastIndex=0;const frag=document.createDocumentFragment();let last=0,m;while((m=re.exec(text))){frag.append(text.slice(last,m.index)+m[1]);const b=document.createElement('button');b.type='button';b.className='tl-global-mention';b.dataset.memberNick=m[2];b.textContent='@'+m[2];frag.append(b);last=m.index+m[0].length}frag.append(text.slice(last));node.replaceWith(frag)})})
  }
  function enhance(root=document){enhancePublicMentions(root);enhanceChatNames(root);enhanceBuddy(root)}

  document.addEventListener('pointerover',e=>{const t=e.target.closest?.(triggerSelector);if(t&&matchMedia('(hover:hover)').matches)show(t)});
  document.addEventListener('pointerout',e=>{const t=e.target.closest?.(triggerSelector);if(t&&matchMedia('(hover:hover)').matches&&!card?.contains(e.relatedTarget))hide()});
  document.addEventListener('click',e=>{const t=e.target.closest?.(triggerSelector);if(t){e.preventDefault();e.stopPropagation();if(active===t&&!card?.hidden)hide(0);else show(t);return}if(card&&!card.hidden&&!card.contains(e.target))hide(0)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide(0);if((e.key==='Enter'||e.key===' ')&&e.target.matches?.(triggerSelector)){e.preventDefault();show(e.target)}});
  window.addEventListener('resize',()=>active&&position(active),{passive:true});window.addEventListener('scroll',()=>{if(active&&innerWidth>650)position(active)},{passive:true,capture:true});

  const loadForumEnhancements=()=>{if(!document.getElementById('forumProfileForm')||document.querySelector('script[data-forum-profile-enhancements]'))return;const script=document.createElement('script');script.src='forum-profile-enhancements-v1.js?v=1.0';script.defer=true;script.dataset.forumProfileEnhancements='1';document.body.appendChild(script)};
  const start=()=>{ensureStyle();enhance();loadForumEnhancements();const mo=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1){enhance(n);loadForumEnhancements()}})));mo.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();