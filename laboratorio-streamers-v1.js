(() => {
'use strict';
const sb=window.teamSupabase,grid=document.getElementById('labStreamerGrid'),login=document.getElementById('labLogin'),feedback=document.getElementById('labFeedback');
if(!sb||!grid)return;
let session=null,items=[],saving=false,holdTimer=0,drag=null,startX=0,startY=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyOf=r=>String(r.id||r.slug||r.display_name||'streamer');
const staticInk={id:'ink31-static',display_name:'INK31',main_game:'Fortnite',photo_url:'img/streamers/ink31-profile-720.webp'};
function toast(message,state='success'){feedback.textContent=message;feedback.dataset.state=state;feedback.classList.add('is-visible');clearTimeout(feedback._t);feedback._t=setTimeout(()=>feedback.classList.remove('is-visible'),2200)}
function render(){
 grid.innerHTML=items.map((r,i)=>`<article class="lab-card" data-key="${esc(keyOf(r))}" tabindex="0"><b class="lab-rank">${i+1}</b><div class="lab-photo">${r.photo_url?`<img src="${esc(r.photo_url)}" alt="" draggable="false">`:''}</div><div class="lab-copy"><h2>${esc(r.display_name||'Streamer')}</h2><p>${esc(r.main_game||'Jogo em atualização')}</p><button class="lab-notify ${r.notify_live?'is-on':''}" type="button" data-notify>${r.notify_live?'🔔 Aviso ligado':'🔕 Avisar quando entrar ao vivo'}</button></div></article>`).join('');
 bindCards();
}
function orderedPayload(){return items.map((r,i)=>({streamer_key:keyOf(r),position:i+1,notify_live:Boolean(r.notify_live)}))}
async function save(){
 if(!session||saving)return;
 saving=true;
 try{const{error}=await sb.rpc('tl_save_streamer_preferences',{p_items:orderedPayload()});if(error)throw error;toast('Ordem guardada ✓')}
 catch(error){console.error('[LAB-STR-002]',error);window.TeamDiagnostics?.error?.('LAB-STR-002','streamer-lab','Falha ao guardar preferências',{},error);toast('Não foi possível guardar · LAB-STR-002','error')}
 finally{saving=false}
}
function moveBefore(source,target){
 if(!source||!target||source===target)return;
 const from=items.findIndex(x=>keyOf(x)===source.dataset.key),to=items.findIndex(x=>keyOf(x)===target.dataset.key);
 if(from<0||to<0)return;
 const [row]=items.splice(from,1);items.splice(to,0,row);
 items.forEach((item,index)=>{const node=[...grid.querySelectorAll('.lab-card')].find(card=>card.dataset.key===keyOf(item));if(node){grid.appendChild(node);node.querySelector('.lab-rank').textContent=String(index+1)}});
}
function stop(){
 clearTimeout(holdTimer);
 if(!drag)return;
 drag.classList.remove('is-dragging','is-holding');drag=null;render();void save();
}
function bindCards(){
 grid.querySelectorAll('.lab-card').forEach(card=>{
  card.addEventListener('pointerdown',e=>{
   if(e.target.closest('button'))return;if(!session){toast('Inicia sessão para organizar · LAB-STR-001','error');return}
   startX=e.clientX;startY=e.clientY;card.classList.add('is-holding');
   holdTimer=setTimeout(()=>{drag=card;card.classList.add('is-dragging');card.setPointerCapture?.(e.pointerId);navigator.vibrate?.(25)},280);
  });
  card.addEventListener('pointermove',e=>{
   if(!drag){if(Math.hypot(e.clientX-startX,e.clientY-startY)>9){clearTimeout(holdTimer);card.classList.remove('is-holding')}return}
   e.preventDefault();const dx=e.clientX-startX;drag.style.setProperty('--tilt-x',`${Math.max(-8,Math.min(8,dx/18))}deg`);drag.style.setProperty('--tilt-z',`${Math.max(-3,Math.min(3,dx/45))}deg`);
   const under=document.elementFromPoint(e.clientX,e.clientY)?.closest('.lab-card');if(under&&grid.contains(under))moveBefore(drag,under);
  });
  card.addEventListener('pointerup',stop);card.addEventListener('pointercancel',stop);
  card.querySelector('[data-notify]')?.addEventListener('click',()=>{if(!session){toast('Inicia sessão para ativar avisos · LAB-STR-001','error');return}const row=items.find(x=>keyOf(x)===card.dataset.key);if(row){row.notify_live=!row.notify_live;render();void save()}});
 });
}
async function load(){
 session=await window.TeamAuth?.getSession?.();login.hidden=Boolean(session);document.getElementById('labLoginButton')?.addEventListener('click',()=>window.TeamAuth?.signInWithGoogle?.());
 const{data,error}=await sb.from('streamers').select('id,display_name,main_game,photo_url,is_featured,display_order').eq('is_published',true).eq('is_archived',false).order('is_featured',{ascending:false}).order('display_order');
 if(error){grid.innerHTML='<p>Não foi possível carregar · LAB-STR-003</p>';return}
 let rows=[staticInk,...(data||[])];const seen=new Set();rows=rows.filter(r=>{const k=keyOf(r);if(seen.has(k))return false;seen.add(k);return true});
 let prefs=[];if(session){const result=await sb.from('streamer_preferences').select('streamer_key,position,notify_live').order('position');if(!result.error)prefs=result.data||[]}
 const map=new Map(prefs.map(p=>[p.streamer_key,p]));rows.forEach(r=>{r.notify_live=Boolean(map.get(keyOf(r))?.notify_live)});
 rows.sort((a,b)=>(map.get(keyOf(a))?.position??99)-(map.get(keyOf(b))?.position??99));items=rows.slice(0,4);render();
}
Promise.resolve(window.TeamAuth?.ready).then(load);
})();