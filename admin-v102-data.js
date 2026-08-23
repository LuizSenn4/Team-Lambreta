(() => {
'use strict';
const sb=window.teamSupabase; if(!sb)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const specs={
 team:{table:'team_members',mount:'adminV102TeamMount',title:r=>r.nickname||r.name||'Membro',sub:r=>r.role||'MEMBRO',order:'display_order'},
 streamers:{table:'streamers',mount:'adminV102StreamersMount',title:r=>r.display_name||'Streamer',sub:r=>`${r.main_game||'—'} · ${r.is_published?'Publicado':'Oculto'}`,order:'display_order'},
 forum:{table:'forum_topics',mount:'adminV102ForumMount',title:r=>r.title||'Tópico',sub:r=>`${r.status||'—'} · ${r.is_locked?'Bloqueado':'Aberto'}`,order:'created_at',desc:true},
 eventos:{table:'site_events',mount:'adminV102EventsMount',title:r=>r.title||'Evento',sub:r=>`${r.status||'—'}${r.event_date?' · '+new Date(r.event_date).toLocaleDateString('pt-PT'):''}`,order:'event_date'},
 loja:{table:'site_store_products',mount:'adminV102StoreMount',title:r=>r.name||'Produto',sub:r=>`${Number(r.price||0).toFixed(2)} € · ${r.category||'Geral'}`,order:'display_order'},
 midia:{table:'site_media_items',mount:'adminV102MediaMount',title:r=>r.title||'Mídia',sub:r=>r.media_type||'photo',order:'display_order'},
 usuarios:{table:'profiles',mount:'adminV102UsersMount',title:r=>r.game_nickname_public||r.game_nickname||r.full_name||r.email||'Utilizador',sub:r=>String(r.role||'membro').toUpperCase(),order:'created_at',desc:true}
};
function rowHtml(row,s){return `<article class="admin102-data-row"><div><strong>${esc(s.title(row))}</strong><small>${esc(s.sub(row))}</small></div><code>${esc(String(row.id||row.key||'').slice(0,8))}</code></article>`}
async function load(key){const s=specs[key],mount=document.getElementById(s?.mount);if(!s||!mount)return;mount.innerHTML='<p>A carregar dados…</p>';let q=sb.from(s.table).select('*').limit(100);if(s.order)q=q.order(s.order,{ascending:!s.desc,nullsFirst:false});const {data,error}=await q;if(error){mount.innerHTML=`<p class="admin102-error">${esc(error.message)}</p>`;return}mount.innerHTML=`<div class="admin102-data-head"><strong>${data?.length||0} registos</strong><button type="button" data-refresh="${key}">Atualizar</button></div><div class="admin102-data-list">${(data||[]).map(r=>rowHtml(r,s)).join('')||'<p>Nenhum registo.</p>'}</div>`;mount.querySelector('[data-refresh]')?.addEventListener('click',()=>load(key));}
async function dashboard(){const cards=document.querySelector('.admin-v102-grid');if(!cards)return;const counts=await Promise.all(['team_members','streamers','forum_topics','profiles'].map(async table=>{const {count}=await sb.from(table).select('*',{count:'exact',head:true});return count||0}));cards.insertAdjacentHTML('beforeend',`<article><small>TEAM</small><strong>${counts[0]}</strong><span>membros</span></article><article><small>STREAMERS</small><strong>${counts[1]}</strong><span>perfis</span></article><article><small>FÓRUM</small><strong>${counts[2]}</strong><span>tópicos</span></article><article><small>USUÁRIOS</small><strong>${counts[3]}</strong><span>contas</span></article>`)}
window.addEventListener('tl:admin-v102-ready',()=>{dashboard();Object.keys(specs).forEach(load);});
})();