(() => {
  'use strict';
  if(window.TLUserInboxLoaded)return; window.TLUserInboxLoaded=true;
  const sb=window.teamSupabase;
  if(!sb)return;
  let session=null,rows=[],view='active',channel=null;
  const expandedIds=new Set();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleInfo=role=>{
    const key=String(role||'member').trim().toLowerCase();
    return {
      master:['DEV','dev','master'],dev:['DEV','dev','master'],admin:['ADMIN','admin','admin'],
      boss:['BOSS','boss','boss'],moderator:['MODERADOR','moderador','moderator'],moderador:['MODERADOR','moderador','moderator'],
      staff:['STAFF','staff','staff'],streamer:['STREAMER','streamer','streamer'],vip:['VIP','vip','vip'],
      supporter:['APOIADOR','apoiador','member'],apoiador:['APOIADOR','apoiador','member'],member:['MEMBRO','membro','member']
    }[key]||['MEMBRO','membro','member'];
  };
  const reviewerMarkup=row=>{
    const metadata=row.metadata||{};
    if(!metadata.reviewer_name)return '';
    const [label,badgeClass,textClass]=roleInfo(metadata.reviewer_role);
    const action=metadata.status==='recusado'?'Recusada':'Aprovada';
    return `<span class="tl-inbox-reviewer"><span class="team-role-badge role-${badgeClass}">${label}</span><span>${action} por <b class="role-text-${textClass}">${esc(metadata.reviewer_name)}</b></span></span>`;
  };
  const shell=document.createElement('div');shell.className='tl-inbox-root';shell.innerHTML=`<button class="tl-inbox-trigger" type="button" aria-label="Abrir Caixa de entrada">✉<span hidden>0</span></button><div class="tl-inbox-modal" hidden><button class="tl-inbox-backdrop" data-close aria-label="Fechar"></button><section class="tl-inbox-panel" role="dialog" aria-modal="true" aria-label="Caixa de entrada"><header><div><small>MENSAGENS</small><h2>Caixa de entrada</h2></div><button data-close aria-label="Fechar">×</button></header><nav><button data-view="active" class="active">Caixa de entrada</button><button data-view="deleted">Excluídos</button></nav><div class="tl-inbox-list"></div></section></div>`;document.body.appendChild(shell);
  const trigger=shell.querySelector('.tl-inbox-trigger'),badge=trigger.querySelector('span'),modal=shell.querySelector('.tl-inbox-modal'),list=shell.querySelector('.tl-inbox-list');
  const render=()=>{const visible=rows.filter(x=>view==='deleted'?x.deleted_at:!x.deleted_at);list.innerHTML=visible.length?visible.map(x=>{const expanded=expandedIds.has(x.id);return `<article class="tl-inbox-item ${x.read_at?'':'unread'} ${expanded?'expanded':''}" data-id="${x.id}"><button class="tl-inbox-open" type="button" aria-expanded="${expanded}" aria-label="${expanded?'Fechar':'Abrir'} mensagem: ${esc(x.subject)}"><span>${esc(x.sender_label)}</span><strong>${esc(x.subject)}</strong>${reviewerMarkup(x)}<small>${new Date(x.created_at).toLocaleString('pt-PT')}</small><span class="tl-inbox-toggle">${expanded?'Fechar mensagem ↑':'Abrir mensagem →'}</span><p>${esc(x.content)}</p></button><button class="tl-inbox-delete" type="button">${view==='deleted'?'Restaurar':'Excluir'}</button></article>`}).join(''):'<p class="tl-inbox-empty">Nenhuma mensagem nesta pasta.</p>';const unread=rows.filter(x=>!x.read_at&&!x.deleted_at).length;badge.hidden=!unread;badge.textContent=unread>99?'99+':unread;};
  async function load(){if(!session)return;const {data,error}=await sb.from('user_inbox_messages').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false});if(!error){rows=data||[];render();}}
  trigger.onclick=()=>{modal.hidden=false;document.body.classList.add('tl-modal-open');load()};shell.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>{modal.hidden=true;document.body.classList.remove('tl-modal-open')});
  shell.querySelector('nav').onclick=e=>{const b=e.target.closest('[data-view]');if(!b)return;view=b.dataset.view;expandedIds.clear();shell.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));render()};
  list.onclick=async e=>{const item=e.target.closest('[data-id]');if(!item)return;const id=Number(item.dataset.id),row=rows.find(x=>x.id===id);if(!row)return;const deleteButton=e.target.closest('.tl-inbox-delete');if(deleteButton){e.preventDefault();e.stopPropagation();expandedIds.delete(id);await sb.from('user_inbox_messages').update({deleted_at:view==='deleted'?null:new Date().toISOString()}).eq('id',id);return load();}expandedIds.has(id)?expandedIds.delete(id):expandedIds.add(id);if(!row.read_at){row.read_at=new Date().toISOString();render();await sb.from('user_inbox_messages').update({read_at:row.read_at}).eq('id',id);return;}render()};
  window.TeamAuth?.subscribe(nextSession=>{session=nextSession;if(channel){sb.removeChannel(channel);channel=null;}if(!session){trigger.hidden=true;return;}trigger.hidden=false;load();channel=sb.channel(`user-inbox-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'user_inbox_messages',filter:`user_id=eq.${session.user.id}`},load).subscribe()});
})();
