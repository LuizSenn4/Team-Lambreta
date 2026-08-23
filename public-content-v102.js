(() => {
'use strict';
if(window.__TL_PUBLIC_CONTENT_V102__)return;window.__TL_PUBLIC_CONTENT_V102__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const waitForCore=()=>new Promise(resolve=>{
  if(window.teamSupabase)return resolve(window.teamSupabase);
  const ready=()=>{window.removeEventListener('tl:v102-ready',ready);resolve(window.teamSupabase||null)};
  window.addEventListener('tl:v102-ready',ready,{once:true});
  setTimeout(()=>resolve(window.teamSupabase||null),6000);
});
function img(url,alt){return url?`<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`:''}
async function loadEvents(sb){
  const grid=document.getElementById('eventsGrid');if(!grid)return;
  const {data,error}=await sb.from('site_events').select('*').eq('status','published').order('event_date',{ascending:true,nullsFirst:false});
  if(error){console.warn('[V102 EVENTS]',error.message);return}if(!data?.length)return;
  grid.innerHTML=data.map(row=>`<article class="event-card tl-card v102-content-card">${img(row.image_url,row.title)}<div class="v102-content-copy"><small>${row.event_date?new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(row.event_date)):'EM BREVE'}</small><h2>${esc(row.title)}</h2><p>${esc(row.description||'')}</p></div></article>`).join('');
}
async function loadStore(sb){
  const grid=document.getElementById('storeGrid');if(!grid)return;
  const {data,error}=await sb.from('site_store_products').select('*').eq('is_published',true).order('display_order',{ascending:true});
  if(error){console.warn('[V102 STORE]',error.message);return}if(!data?.length)return;
  grid.innerHTML=data.map(row=>`<article class="store-card tl-card v102-content-card">${img(row.image_url,row.name)}<div class="v102-content-copy"><small>${esc(row.category||'GERAL')}</small><h2>${esc(row.name)}</h2><p>${esc(row.description||'')}</p><strong class="v102-price">${Number(row.price||0).toFixed(2).replace('.',',')} €</strong>${row.product_url?`<a class="v102-content-action" href="${esc(row.product_url)}" target="_blank" rel="noopener">VER PRODUTO →</a>`:''}</div></article>`).join('');
}
async function loadMedia(sb){
  const grid=document.getElementById('mediaGrid');if(!grid)return;
  const {data,error}=await sb.from('site_media_items').select('*').eq('is_published',true).order('display_order',{ascending:true});
  if(error){console.warn('[V102 MEDIA]',error.message);return}if(!data?.length)return;
  grid.innerHTML=data.map(row=>`<article class="media-card tl-card v102-content-card">${img(row.image_url,row.title)}<div class="v102-content-copy"><small>${esc(String(row.media_type||'photo').toUpperCase())}</small><h2>${esc(row.title)}</h2><p>${esc(row.description||'')}</p>${row.media_url?`<a class="v102-content-action" href="${esc(row.media_url)}" target="_blank" rel="noopener">ABRIR →</a>`:''}</div></article>`).join('');
}
function ensureCss(){if(document.getElementById('v102-public-content-css'))return;const s=document.createElement('style');s.id='v102-public-content-css';s.textContent=`.v102-content-card{overflow:hidden}.v102-content-card>img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.v102-content-copy{padding:18px;display:grid;gap:8px}.v102-content-copy small{color:var(--tl-cyan,#39d9ff);font-size:10px;font-weight:900;letter-spacing:.12em}.v102-content-copy h2{margin:0}.v102-content-copy p{margin:0;color:var(--tl-muted,#8fa2b1);line-height:1.6}.v102-price{font-size:20px}.v102-content-action{display:inline-flex;width:max-content;margin-top:4px;color:var(--tl-cyan,#39d9ff);font-weight:800;text-decoration:none}`;document.head.appendChild(s)}
async function boot(){const sb=await waitForCore();if(!sb)return;ensureCss();await Promise.all([loadEvents(sb),loadStore(sb),loadMedia(sb)])}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();