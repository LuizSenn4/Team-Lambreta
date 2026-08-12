(() => {
  'use strict';
  const sb=window.teamSupabase;
  const form=document.getElementById('participationForm');
  if(!sb||!form)return;
  const feedback=document.getElementById('participationFeedback');
  const current=document.getElementById('participationCurrent');
  let session=null;
  const say=(text,error=false)=>{feedback.textContent=text;feedback.classList.toggle('error',error)};
  const statusLabel=value=>({pendente:'Pendente',aprovado:'Aprovada',recusado:'Recusada'}[value]||value);

  async function load(){
    const auth=await sb.auth.getSession(); session=auth.data.session;
    if(!session){form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);say('Entre com Google no topo da página para enviar a inscrição.',true);return;}
    const {data,error}=await sb.from('competition_applications').select('id,status,created_at,epic_nickname').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error){say('A área de inscrições aguarda a aplicação da migration no Supabase.',true);return;}
    if(data){current.innerHTML=`<small>ÚLTIMA INSCRIÇÃO</small><strong>${statusLabel(data.status)}</strong><span>${new Date(data.created_at).toLocaleString('pt-PT')} · ${data.epic_nickname}</span>`;}
    if(data?.status==='pendente'){form.querySelector('button[type="submit"]').disabled=true;say('Você já possui uma inscrição pendente. Aguarde a análise da equipa.');}
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault(); if(!session)return;
    const button=form.querySelector('button[type="submit"]'); button.disabled=true; say('Enviando…');
    const values=Object.fromEntries(new FormData(form));
    const row={...values,user_id:session.user.id,age:Number(values.age),power_ranking:values.power_ranking?Number(values.power_ranking):null,status:'pendente'};
    const {error}=await sb.from('competition_applications').insert(row);
    if(error){button.disabled=false;say(error.code==='23505'?'Você já possui uma inscrição pendente.':`Não foi possível enviar: ${error.message}`,true);return;}
    form.reset();say('Inscrição enviada. A resposta aparecerá na sua Caixa de entrada.');await load();
  });
  document.getElementById('year').textContent=new Date().getFullYear();
  load();
})();
