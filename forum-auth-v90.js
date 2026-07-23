(() => {
  'use strict';
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const form=document.getElementById('userTopicFormV90');
  const notice=document.getElementById('forumLoginNotice');
  const identity=document.getElementById('forumAuthorIdentity');
  const feedback=document.getElementById('topicFeedback');
  let session=null, profile=null;

  const update=()=>{
    const logged=!!session;
    if(form) form.hidden=!logged;
    if(notice){ notice.hidden=logged; notice.textContent='Entra com o Google para criar um tópico.'; }
    if(identity && logged){
      const name=profile?.game_nickname||profile?.full_name||session.user.email||'Utilizador';
      identity.innerHTML=`${profile?.avatar_url?`<img src="${profile.avatar_url}" alt="">`:''}<div><small>PUBLICAR COMO</small><strong>${name}</strong></div>`;
    }
  };

  async function loadUser(){
    const result=await sb.auth.getSession();
    session=result.data.session;
    profile=null;
    if(session){
      const res=await sb.from('profiles').select('full_name,game_nickname,avatar_url').eq('id',session.user.id).maybeSingle();
      profile=res.data||null;
    }
    update();
  }

  form?.addEventListener('submit',event=>{
    event.preventDefault();
    if(!session){ update(); return; }
    const title=document.getElementById('topicTitle')?.value.trim().slice(0,60)||'';
    const description=document.getElementById('topicDescription')?.value.trim().slice(0,280)||'';
    if(!title||!description){
      feedback.textContent='Preenche o título e a descrição antes de enviar.';
      feedback.classList.add('error'); return;
    }
    const author=(profile?.game_nickname||profile?.full_name||session.user.email||'Utilizador').slice(0,40);
    const data=typeof getTeamData==='function'?getTeamData():null;
    if(!data||!Array.isArray(data.pendingForum)){
      feedback.textContent='Não foi possível preparar o tópico agora.';
      feedback.classList.add('error'); return;
    }
    data.pendingForum.push({title,description,author,userId:session.user.id,status:'Aberto',fixed:false,approved:false,createdAt:new Date().toISOString()});
    saveTeamData(data);
    document.getElementById('topicTitle').value='';
    document.getElementById('topicDescription').value='';
    feedback.textContent='Tópico enviado. Agora fica pendente de aprovação do admin.';
    feedback.classList.remove('error');
  });

  sb.auth.onAuthStateChange(async()=>loadUser());
  loadUser();
})();
