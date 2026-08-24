(() => {
  'use strict';
  const sb=window.teamSupabase;
  const form=document.getElementById('participationForm');
  if(!sb||!form)return;
  const feedback=document.getElementById('participationFeedback');
  const current=document.getElementById('participationCurrent');
  let session=null;
  let pending=false;
  const say=(text,error=false)=>{feedback.textContent=text;feedback.classList.toggle('error',error)};
  const statusLabel=value=>({pendente:'Pendente',aprovado:'Aprovada',recusado:'Recusada'}[value]||value);
  const setFormEnabled=enabled=>form.querySelectorAll('input,select,textarea,button').forEach(el=>{el.disabled=!enabled});

  async function load(){
    session=await window.TeamAuth?.getSession();
    current.innerHTML='';
    if(!session){setFormEnabled(false);say('Entre com sua conta Google para enviar sua inscrição.',true);return;}
    setFormEnabled(true);
    const {data,error}=await sb.from('competition_applications').select('id,status,created_at,epic_nickname').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error){say('A área de inscrições aguarda a aplicação da migration no Supabase.',true);return;}
    if(data){current.innerHTML=`<small>ÚLTIMA INSCRIÇÃO</small><strong>${statusLabel(data.status)}</strong><span>${new Date(data.created_at).toLocaleString('pt-PT')} · ${data.epic_nickname}</span>`;}
    if(data?.status==='pendente'){form.querySelector('button[type="submit"]').disabled=true;say('Você já possui uma inscrição pendente. Aguarde a análise da equipa.');}
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(pending)return;
    session=await window.TeamAuth?.getSession();
    if(!session){say('Entre com sua conta Google para enviar sua inscrição.',true);return;}
    pending=true;
    const button=form.querySelector('button[type="submit"]'); button.disabled=true; say('Enviando…');
    const values=Object.fromEntries(new FormData(form));
    const row={...values,user_id:session.user.id,age:Number(values.age),power_ranking:values.power_ranking?Number(values.power_ranking):null,status:'pendente'};
    const {data,error}=await sb.from('competition_applications').insert(row).select('id').single();
    if(error){pending=false;button.disabled=false;say(error.code==='23505'?'Você já possui uma inscrição pendente.':`Não foi possível enviar: ${error.message}`,true);return;}
    form.reset();
    sb.functions.invoke('competition-email',{body:{action:'notify',kind:'boss',application_id:data.id}}).catch(()=>{});
    pending=false;await load();say('Inscrição enviada com sucesso. A resposta aparecerá na sua Caixa de Entrada.');
  });
  window.TeamAuth?.subscribe(()=>setTimeout(load,0));
  const year=document.getElementById('year');
  if(year)year.textContent=new Date().getFullYear();
  load();
})();
