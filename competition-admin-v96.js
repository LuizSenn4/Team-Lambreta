(() => {
  'use strict';
  const sb=window.teamSupabase;
  const list=document.getElementById('competitionApplicationsList');
  if(!sb||!list)return;
  let rows=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const field=(label,value)=>value!==null&&value!==undefined&&value!==''?`<div><small>${esc(label)}</small><span>${esc(value)}</span></div>`:'';
  const statusLabel=value=>({pending:'Pendente',sending:'Enviando…',sent:'E-mail enviado ✓',failed:'E-mail não enviado'}[value]||value||'Pendente');

  function emailAudit(row,kind,label){
    const status=row[`${kind}_email_status`]||'pending';
    const sentAt=row[`${kind}_email_sent_at`];
    const failed=status==='failed';
    return `<div class="competition-email-audit status-${esc(status)}"><span><small>${esc(label)}</small><b>${esc(statusLabel(status))}</b>${sentAt?`<time>${new Date(sentAt).toLocaleString('pt-PT')}</time>`:''}</span>${failed?`<button type="button" data-email-retry="${kind==='boss'?'boss':'decision'}">Tentar novamente</button>`:''}</div>`;
  }

  function render(){
    const q=document.getElementById('competitionApplicationSearch').value.trim().toLowerCase();
    const status=document.getElementById('competitionApplicationStatus').value;
    const filtered=rows.filter(r=>(status==='all'||r.status===status)&&(!q||[r.epic_nickname,r.full_name,r.discord,r.country,r.authenticated_email,r.profiles?.game_nickname,r.profiles?.full_name].some(v=>String(v||'').toLowerCase().includes(q))));
    list.innerHTML=filtered.length?filtered.map(r=>`<article class="competition-admin-item" data-id="${r.id}">
      <button class="competition-admin-summary" type="button"><span class="competition-status status-${esc(r.status)}">${esc(r.status)}</span><strong>${esc(r.epic_nickname)}</strong><small>${esc(r.full_name)} · ${new Date(r.created_at).toLocaleString('pt-PT')}</small><b aria-hidden="true">⌄</b></button>
      <div class="competition-admin-details" hidden>
        <div class="competition-detail-grid">
          ${field('Conta',r.profiles?.game_nickname||r.profiles?.full_name||r.user_id)}${field('E-mail Google',r.authenticated_email)}${field('Nome Google',r.authenticated_name)}${field('Idade',r.age)}${field('País',r.country)}${field('Discord',r.discord)}${field('Plataforma',r.platform)}${field('Comando',r.input_method)}${field('Região',r.region)}${field('Build',r.build_preference)}${field('Modo',r.main_mode)}${field('PR',r.power_ranking)}${field('Tracker',r.tracker_links)}${field('Disponibilidade',r.availability)}${field('Experiência',r.competitive_experience)}${field('Motivação',r.motivation)}${field('Observações',r.notes)}
        </div>
        <div class="competition-email-audits">${emailAudit(r,'boss','Notificação ao BOSS')}${r.status!=='pendente'?emailAudit(r,'decision','Decisão ao inscrito'):''}</div>
        ${r.status==='pendente'?`<footer><button data-review="aprovado">Aprovar</button><button class="danger" data-review="recusado">Recusar</button></footer>`:''}
      </div>
    </article>`).join(''):'<p class="empty-admin">Nenhuma inscrição encontrada.</p>';
  }

  async function load(){
    const [{data,error},{data:profiles}]=await Promise.all([
      sb.from('competition_applications').select('*').order('created_at',{ascending:false}),
      sb.from('profiles').select('id,game_nickname,full_name')
    ]);
    if(error){list.innerHTML=`<p class="empty-admin">${esc(error.message)}</p>`;return;}
    const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
    rows=(data||[]).map(row=>({...row,profiles:profileMap.get(row.user_id)||null}));
    render();
  }

  const sendEmail=(applicationId,kind,action='notify')=>sb.functions.invoke('competition-email',{body:{action,kind,application_id:applicationId}});

  list.onclick=async event=>{
    const item=event.target.closest('[data-id]');if(!item)return;
    const applicationId=Number(item.dataset.id);
    const retry=event.target.closest('[data-email-retry]');
    if(retry){
      retry.disabled=true;retry.textContent='Enviando…';
      await sendEmail(applicationId,retry.dataset.emailRetry,'retry');
      await load();return;
    }
    const review=event.target.closest('[data-review]');
    if(review){
      item.querySelectorAll('[data-review]').forEach(button=>button.disabled=true);
      const {error}=await sb.rpc('review_competition_application',{p_application_id:applicationId,p_status:review.dataset.review});
      if(error){alert(error.message);item.querySelectorAll('[data-review]').forEach(button=>button.disabled=false);return;}
      await sendEmail(applicationId,'decision');
      await load();return;
    }
    if(event.target.closest('.competition-admin-summary')){
      const details=item.querySelector('.competition-admin-details');details.hidden=!details.hidden;
    }
  };
  ['competitionApplicationSearch','competitionApplicationStatus'].forEach(id=>document.getElementById(id).addEventListener(id.includes('Search')?'input':'change',render));
  document.getElementById('refreshCompetitionApplications').onclick=load;
  load();
})();
