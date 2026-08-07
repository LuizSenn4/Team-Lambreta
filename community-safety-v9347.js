(()=>{
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const TERMS_VERSION='2026-08-07-v1';
  if(!window.supabase?.createClient) return;
  const sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  let currentSession=null;
  let termsAccepted=false;
  let termsPromise=null;
  let noticesPromise=null;

  const RULES=[
    ['1. Respeito acima de tudo','Todos os membros devem tratar os outros com respeito. Não são permitidos insultos, humilhações, ameaças, provocações ofensivas ou ataques pessoais.'],
    ['2. Proibição de discriminação','É proibido conteúdo racista, xenófobo, homofóbico, transfóbico, misógino, discriminatório por religião, nacionalidade, deficiência ou qualquer outra forma de preconceito ou discurso de ódio.'],
    ['3. Comunidade com menores de idade','Esta comunidade pode incluir menores. É proibido publicar ou solicitar conteúdo sexual, explícito, pornográfico, de exploração, sexualização de menores, violência gráfica ou qualquer material inadequado para menores.'],
    ['4. Assédio, perseguição e intimidação','Não é permitido assediar, ameaçar, perseguir, constranger ou pressionar outros membros, inclusive por menções repetidas, mensagens privadas ou tentativas de contornar bloqueios.'],
    ['5. Privacidade e dados pessoais','Não publiques dados pessoais de terceiros sem autorização, incluindo morada, telefone, documentos, localização precisa, informações privadas, imagens íntimas ou credenciais de acesso.'],
    ['6. Spam, flood e publicidade','É proibido spam, flood, mensagens repetidas, correntes, publicidade excessiva, links maliciosos ou qualquer comportamento que prejudique o uso normal do chat.'],
    ['7. Conteúdo ilegal ou perigoso','Não é permitido usar a comunidade para incentivar crimes, fraudes, ameaças, violência, exploração, golpes, distribuição de malware ou outras atividades ilegais ou perigosas.'],
    ['8. Uso responsável de menções','As menções servem para comunicação. Não as uses para perseguir, provocar, pressionar ou incomodar repetidamente outros membros.'],
    ['9. Denúncias e bloqueios','Os membros podem denunciar mensagens e bloquear utilizadores. Denúncias falsas ou abusivas também podem ser analisadas pela moderação.'],
    ['10. Moderação e medidas disciplinares','A administração pode remover mensagens, emitir advertências, silenciar temporariamente ou banir contas quando houver violação das regras. As medidas devem respeitar a hierarquia e os registos do sistema.'],
    ['11. Contorno de punições','Criar novas contas, usar contas de terceiros ou outros meios para contornar silenciamentos, bloqueios ou banimentos pode resultar em medidas adicionais.'],
    ['12. Aceitação e atualizações','Ao usar o chat, confirmas que leste e aceitas estas regras. Se houver uma nova versão relevante, poderemos solicitar nova leitura e aceitação antes de voltares a enviar mensagens.']
  ];

  function escapeHtml(value=''){
    return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function rulesHtml(){
    return RULES.map(([title,text],i)=>`<section class="tl-rules-item" data-rule-index="${i}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></section>`).join('');
  }

  function ensureRulesModal(){
    let modal=document.getElementById('tlMandatoryRulesModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='tlMandatoryRulesModal';
    modal.className='tl-mandatory-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="tl-mandatory-card" role="dialog" aria-modal="true" aria-labelledby="tlRulesTitle">
        <div class="tl-mandatory-head">
          <span class="tl-mandatory-kicker">TEAM LAMBRETA • COMUNIDADE</span>
          <h2 id="tlRulesTitle">Regras obrigatórias do chat</h2>
          <p>Para usar o chat, lê as regras até ao fim. O botão de aceitação só será libertado depois de chegares à última regra.</p>
        </div>
        <div class="tl-rules-scroll" id="tlRulesScroll" tabindex="0">
          ${rulesHtml()}
          <section class="tl-rules-item tl-rules-final"><h3>Termos de utilização do chat</h3><p>Ao continuar, comprometes-te a usar o chat de forma responsável e reconheces que violações podem resultar em advertência, remoção de mensagens, silenciamento ou banimento. Menores devem utilizar a comunidade de acordo com a orientação e supervisão dos seus responsáveis quando aplicável.</p></section>
          <div id="tlRulesEnd" class="tl-rules-end">Fim das regras ✓</div>
        </div>
        <div class="tl-rules-progress"><span id="tlRulesProgressBar"></span></div>
        <div class="tl-rules-actions">
          <button id="tlRulesAdvance" type="button">Avançar</button>
          <a href="regras.html" target="_blank" rel="noopener">Abrir regras completas</a>
        </div>
        <label class="tl-rules-check is-locked" id="tlRulesCheckLabel">
          <input id="tlRulesAcceptCheck" type="checkbox" disabled>
          <span>Li as regras até ao fim e aceito os termos de utilização do chat.</span>
        </label>
        <button id="tlRulesAcceptButton" class="tl-rules-accept" type="button" disabled>OK — Aceitar e entrar no chat</button>
        <p id="tlRulesFeedback" class="tl-rules-feedback"></p>
      </div>`;
    document.body.appendChild(modal);
    const scroller=modal.querySelector('#tlRulesScroll');
    const advance=modal.querySelector('#tlRulesAdvance');
    const check=modal.querySelector('#tlRulesAcceptCheck');
    const accept=modal.querySelector('#tlRulesAcceptButton');
    const label=modal.querySelector('#tlRulesCheckLabel');
    const progress=modal.querySelector('#tlRulesProgressBar');

    const update=()=>{
      const max=Math.max(1,scroller.scrollHeight-scroller.clientHeight);
      const ratio=Math.min(1,Math.max(0,scroller.scrollTop/max));
      progress.style.width=`${Math.round(ratio*100)}%`;
      const atEnd=scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-8;
      if(atEnd && check.disabled){
        check.disabled=false;
        label.classList.remove('is-locked');
        advance.textContent='Chegaste ao fim ✓';
      }
    };
    scroller.addEventListener('scroll',update,{passive:true});
    advance.addEventListener('click',()=>{
      scroller.scrollBy({top:Math.max(220,scroller.clientHeight*.82),behavior:'smooth'});
      setTimeout(update,450);
    });
    check.addEventListener('change',()=>{accept.disabled=!check.checked;});
    accept.addEventListener('click',async()=>{
      if(!check.checked || check.disabled) return;
      accept.disabled=true;
      const feedback=modal.querySelector('#tlRulesFeedback');
      feedback.textContent='A guardar a tua aceitação…';
      const {error}=await sb.rpc('accept_chat_terms',{accepted_version:TERMS_VERSION});
      if(error){feedback.textContent=error.message;accept.disabled=false;return;}
      termsAccepted=true;
      window.TL_CHAT_TERMS_ACCEPTED=true;
      modal.hidden=true;
      document.documentElement.classList.remove('tl-modal-lock');
      feedback.textContent='';
      document.getElementById('chatInput')?.focus();
    });
    document.addEventListener('keydown',e=>{
      if(!modal.hidden && e.key==='Escape') e.preventDefault();
    },true);
    return modal;
  }

  async function enforceTerms(){
    if(!document.getElementById('chatForm')) return true;
    if(!currentSession) return false;
    if(termsAccepted) return true;
    const {data,error}=await sb.rpc('get_my_chat_terms_status',{required_version:TERMS_VERSION});
    if(!error && data===true){
      termsAccepted=true;
      window.TL_CHAT_TERMS_ACCEPTED=true;
      return true;
    }
    window.TL_CHAT_TERMS_ACCEPTED=false;
    const modal=ensureRulesModal();
    const scroll=modal.querySelector('#tlRulesScroll');
    const check=modal.querySelector('#tlRulesAcceptCheck');
    const accept=modal.querySelector('#tlRulesAcceptButton');
    check.checked=false;check.disabled=true;accept.disabled=true;
    modal.querySelector('#tlRulesCheckLabel').classList.add('is-locked');
    modal.querySelector('#tlRulesAdvance').textContent='Avançar';
    modal.querySelector('#tlRulesProgressBar').style.width='0%';
    scroll.scrollTop=0;
    modal.hidden=false;
    document.documentElement.classList.add('tl-modal-lock');
    return false;
  }

  function actionCopy(notice){
    const map={
      warning:['Advertência da Administração','A tua mensagem foi analisada e recebeste uma advertência.'],
      mute:['Silenciamento temporário',`A tua conta foi silenciada no chat por ${notice.duration_minutes||15} minutos.`],
      ban:['Banimento do chat','A tua conta foi banida do chat por violação das regras da comunidade.'],
      message_removed:['Mensagem removida','A administração removeu uma mensagem associada a uma denúncia.']
    };
    return map[notice.action_type]||['Aviso da Administração','A administração aplicou uma medida à tua conta.'];
  }

  function ensureNoticeModal(){
    let modal=document.getElementById('tlAdminNoticeModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='tlAdminNoticeModal';
    modal.className='tl-mandatory-modal tl-admin-notice-modal';
    modal.hidden=true;
    modal.innerHTML=`<div class="tl-mandatory-card tl-admin-notice-card" role="alertdialog" aria-modal="true">
      <div class="tl-admin-notice-icon">!</div>
      <span class="tl-mandatory-kicker">COMUNICADO OFICIAL</span>
      <h2 id="tlAdminNoticeTitle">Aviso da Administração</h2>
      <p id="tlAdminNoticeLead"></p>
      <div class="tl-admin-notice-grid">
        <div><span>Motivo</span><strong id="tlAdminNoticeReason"></strong></div>
        <div><span>Data</span><strong id="tlAdminNoticeDate"></strong></div>
      </div>
      <div class="tl-offending-message-wrap">
        <span>Comentário em causa</span>
        <blockquote id="tlAdminNoticeMessage"></blockquote>
      </div>
      <p id="tlAdminNoticeNote" class="tl-admin-notice-note"></p>
      <p class="tl-admin-notice-rules">Esta medida foi aplicada com base nas <a href="regras.html" target="_blank" rel="noopener">Regras da Comunidade</a>.</p>
      <button id="tlAdminNoticeAcknowledge" class="tl-rules-accept" type="button">Entendi</button>
      <p id="tlAdminNoticeFeedback" class="tl-rules-feedback"></p>
    </div>`;
    document.body.appendChild(modal);
    document.addEventListener('keydown',e=>{if(!modal.hidden&&e.key==='Escape')e.preventDefault();},true);
    return modal;
  }

  async function presentNotice(notice){
    const modal=ensureNoticeModal();
    const [title,lead]=actionCopy(notice);
    modal.querySelector('#tlAdminNoticeTitle').textContent=title;
    modal.querySelector('#tlAdminNoticeLead').textContent=lead;
    modal.querySelector('#tlAdminNoticeReason').textContent=notice.reason||'Violação das regras de utilização do chat';
    modal.querySelector('#tlAdminNoticeDate').textContent=new Date(notice.created_at).toLocaleString('pt-PT');
    modal.querySelector('#tlAdminNoticeMessage').textContent=`“${notice.message_text||'[mensagem indisponível]'}”`;
    const note=modal.querySelector('#tlAdminNoticeNote');
    note.textContent=notice.admin_note?`Observação da moderação: ${notice.admin_note}`:'';
    note.hidden=!notice.admin_note;
    modal.hidden=false;
    document.documentElement.classList.add('tl-modal-lock');
    return new Promise(resolve=>{
      const btn=modal.querySelector('#tlAdminNoticeAcknowledge');
      const feedback=modal.querySelector('#tlAdminNoticeFeedback');
      btn.disabled=false;feedback.textContent='';
      btn.onclick=async()=>{
        btn.disabled=true;
        const {error}=await sb.rpc('acknowledge_admin_notice',{target_notice_id:notice.notice_id});
        if(error){feedback.textContent=error.message;btn.disabled=false;return;}
        modal.hidden=true;
        document.documentElement.classList.remove('tl-modal-lock');
        resolve();
      };
    });
  }

  async function showPendingNotices(){
    if(!currentSession) return;
    const {data,error}=await sb.rpc('get_my_admin_notices');
    if(error){console.warn('[TL Safety] Avisos:',error.message);return;}
    for(const notice of (data||[])) await presentNotice(notice);
  }

  async function bootForSession(session){
    currentSession=session;
    if(!session){termsAccepted=false;window.TL_CHAT_TERMS_ACCEPTED=false;return;}
    if(!noticesPromise){noticesPromise=showPendingNotices().finally(()=>{noticesPromise=null;});}
    await noticesPromise;
    if(document.getElementById('chatForm')){
      if(!termsPromise){termsPromise=enforceTerms().finally(()=>{termsPromise=null;});}
      await termsPromise;
    }
  }

  window.TLChatRequireTerms=async()=>{
    if(!currentSession){const {data}=await sb.auth.getSession();currentSession=data.session;}
    return enforceTerms();
  };
  window.TLCommunityRules={version:TERMS_VERSION,rules:RULES};

  sb.auth.getSession().then(({data})=>bootForSession(data.session));
  sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>bootForSession(session),0);});
})();
