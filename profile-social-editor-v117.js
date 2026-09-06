(() => {
  'use strict';
  if(window.__TL_PROFILE_SOCIAL_EDITOR_V117__)return;window.__TL_PROFILE_SOCIAL_EDITOR_V117__=true;
  const TYPES=[['tiktok','TikTok','https://www.tiktok.com/@...'],['youtube','YouTube','https://www.youtube.com/@...'],['twitch','Twitch','https://www.twitch.tv/...']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowed=value=>{const raw=String(value||'').trim();if(!raw)return'';try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}};
  const normalize=profile=>{const map=new Map(TYPES.map(([type])=>[type,'']));const raw=profile?.social_links;const rows=Array.isArray(raw)?raw:(raw&&typeof raw==='object'?Object.entries(raw).map(([type,value])=>typeof value==='object'?{type,...value}:{type,url:value}):[]);rows.forEach(item=>{const type=String(item?.type||item?.platform||'').toLowerCase().replace(/[^a-z]/g,'');if(map.has(type))map.set(type,allowed(item?.url||item?.href))});return map};
  const waitForm=()=>new Promise(resolve=>{const existing=document.getElementById('profileEditForm');if(existing)return resolve(existing);const observer=new MutationObserver(()=>{const form=document.getElementById('profileEditForm');if(!form)return;observer.disconnect();resolve(form)});observer.observe(document.documentElement,{childList:true,subtree:true})});
  async function install(){
    const form=await waitForm();const profile=await window.TeamProfiles?.getCurrentProfile?.({fresh:true}).catch(()=>null);const current=normalize(profile);const discord=form.elements.discord?.closest('.tl-profile-edit-v117__field');
    const block=document.createElement('div');block.className='tl-profile-edit-v117__field';block.innerHTML=`<span>Redes de stream</span><small>TikTok, YouTube e Twitch.</small>${TYPES.map(([type,label,placeholder])=>`<label style="display:grid;gap:6px"><b>${label}</b><input type="url" name="social_${type}" inputmode="url" autocomplete="url" placeholder="${esc(placeholder)}" value="${esc(current.get(type)||'')}"></label>`).join('')}`;(discord||form.firstElementChild).insertAdjacentElement('afterend',block);
    form.addEventListener('submit',async()=>{setTimeout(async()=>{const session=await window.TeamAuth?.getSession?.();if(!session?.user?.id)return;const links=TYPES.map(([type,label])=>{const url=allowed(form.elements[`social_${type}`]?.value);return url?{type,label,url}:null}).filter(Boolean);const {error}=await window.teamSupabase.from('profiles').update({social_links:links}).eq('id',session.user.id);if(error)console.error('[Profile social V117]',error)},0)},{capture:true});
  }
  Promise.resolve(window.TeamAuth?.ready).then(install).catch(error=>console.error('[Profile social V117]',error));
})();
