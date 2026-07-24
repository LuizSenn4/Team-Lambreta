(() => {
  'use strict';
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const ROOMS={
    all:'Todas',geral:'Geral',suporte:'Suporte',loja:'Loja',sugestoes:'Sugestões',duvidas:'Dúvidas',ajuda:'Ajuda',
    candidaturas:'Candidaturas',eventos:'Eventos e Torneios',fortnite:'Fortnite',denuncias:'Denúncias'
  };
  const PRIVATE_ROOMS=new Set(['candidaturas','denuncias']);
  const MOD_ROLES=new Set(['master','admin','moderator','staff']);
  const ROLE_LABEL={master:'DEV',admin:'ADMIN',moderator:'MODERADOR',staff:'STAFF',streamer:'STREAMER',vip1:'VIP I',vip2:'VIP II',vip3:'VIP III',member:'MEMBRO'};

  const $=id=>document.getElementById(id);
  const form=$('userTopicFormV90'),notice=$('forumLoginNotice'),identity=$('forumAuthorIdentity'),feedback=$('topicFeedback');
  let session=null,profile=null,filter='approved',room='all';

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const now=()=>new Date().toISOString();
  const roleOf=p=>p?.role||'member';
  const isBoss=()=>/^(ink31|oklm_31_ink)$/i.test(String(profile?.game_nickname||profile?.full_name||''));
  const canModerate=()=>MOD_ROLES.has(roleOf(profile))||isBoss();
  const currentName=()=>profile?.game_nickname||profile?.full_name||session?.user?.email||'Utilizador';
  const uid=()=>session?.user?.id||'';
  const roleLabel=role=>ROLE_LABEL[role]||'MEMBRO';
  const roleClass=role=>String(role||'member').replace(/[^a-z0-9_-]/gi,'');
  const makeId=()=>`forum_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  function getData(){return typeof getTeamData==='function'?getTeamData():null}
  function save(data,message=''){
    if(typeof saveTeamData==='function') saveTeamData(data);
    if(typeof renderPublicSite==='function') renderPublicSite();
    renderForumBoard();
    if(message) showFeedback(message,false);
  }
  function normalizeTopic(t,index,pending=false){
    t.id=t.id||makeId();t.category=t.category||'geral';t.replies=Array.isArray(t.replies)?t.replies:[];
    t.authorRole=t.authorRole||'member';t.private=typeof t.private==='boolean'?t.private:PRIVATE_ROOMS.has(t.category);
    t.approved=pending?false:(t.approved!==false);t.status=t.status||'Aberto';t.fixed=!!t.fixed;t.createdAt=t.createdAt||now();
    return t;
  }
  function canSeeTopic(t){return !t.private||canModerate()||t.userId===uid()}
  function showFeedback(message,error=false){
    if(!feedback)return;feedback.textContent=message;feedback.classList.toggle('error',error);feedback.classList.add('is-visible');
    setTimeout(()=>feedback.classList.remove('is-visible'),3500);
  }
  function updateAuth(){
    const logged=!!session;
    if(form)form.hidden=!logged;
    if(notice){notice.hidden=logged;notice.textContent='Entra com o Google para criar um tópico.'}
    if(identity&&logged){
      const role=roleOf(profile);identity.innerHTML=`${profile?.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:''}<div><small>PUBLICAR COMO</small><strong>${esc(currentName())}</strong><span class="forum-role role-${roleClass(role)}">${esc(isBoss()?'BOSS':roleLabel(role))}</span></div>`;
    }
    document.querySelectorAll('[data-moderator-only]').forEach(el=>el.hidden=!canModerate());
    renderRooms();renderForumBoard();
  }
  async function loadUser(){
    const result=await sb.auth.getSession();session=result.data.session;profile=null;
    if(session){
      const res=await sb.from('profiles').select('full_name,game_nickname,avatar_url,role').eq('id',session.user.id).maybeSingle();profile=res.data||null;
    }
    updateAuth();
  }

  function renderRooms(){
    const host=$('forumRooms');if(!host)return;
    host.innerHTML=Object.entries(ROOMS).map(([key,label])=>`<button type="button" data-room="${key}" class="${room===key?'is-active':''}">${esc(label)}</button>`).join('');
    host.querySelectorAll('[data-room]').forEach(btn=>btn.onclick=()=>{room=btn.dataset.room;renderRooms();renderForumBoard()});
  }
  function replyMarkup(reply,t){
    if(reply.private&&!canModerate()&&t.userId!==uid())return'';
    const label=reply.private?'PRIVADA':'RESPOSTA';
    return `<div class="forum-reply ${reply.private?'is-private':''}"><div class="forum-reply-head"><strong>${esc(reply.author||'Equipa')}</strong><span class="forum-role role-${roleClass(reply.authorRole)}">${esc(reply.authorLabel||roleLabel(reply.authorRole))}</span><small>${label}</small></div><p>${esc(reply.text||'')}</p></div>`;
  }
  function controls(t,pending){
    if(!canModerate())return'';
    if(pending)return `<div class="forum-mod-actions"><button data-action="approve">Aprovar</button><button data-action="reject" class="danger">Recusar</button><button data-action="edit">Editar</button><button data-action="private-reply">Responder em privado</button><button data-action="move">Mover</button></div>`;
    return `<div class="forum-mod-actions"><button data-action="reply">Responder</button><button data-action="private-reply">Privado</button><button data-action="edit">Editar</button><button data-action="move">Mover</button><button data-action="fix">${t.fixed?'Desfixar':'Fixar'}</button><button data-action="close">${t.status==='Fechado'?'Reabrir':'Fechar'}</button><button data-action="remove" class="danger">Remover</button></div>`;
  }
  function card(t,pending=false){
    const role=t.authorRole||'member';
    return `<article class="forum-topic ${t.fixed?'is-fixed':''} ${t.private?'is-private':''}" data-topic-id="${esc(t.id)}" data-pending="${pending?'1':'0'}">
      <div class="topic-meta"><span class="${pending?'pending':t.status==='Fechado'?'closed':'open'}">${pending?'Pendente':esc(t.status)}</span>${t.fixed?'<span class="fixed">FIXADO</span>':''}<span class="forum-room-pill">${esc(ROOMS[t.category]||'Geral')}</span>${t.private?'<span class="private-pill">PRIVADO</span>':''}</div>
      <div class="forum-author-line"><strong>${esc(t.author||'Equipa')}</strong><span class="forum-role role-${roleClass(role)}">${esc(t.authorLabel||roleLabel(role))}</span></div>
      <h3>${esc(t.title||'Sem título')}</h3><p>${esc(t.description||'Sem descrição')}</p>
      ${Array.isArray(t.replies)&&t.replies.length?`<div class="forum-replies">${t.replies.map(r=>replyMarkup(r,t)).join('')}</div>`:''}
      ${controls(t,pending)}
    </article>`;
  }
  function renderForumBoard(){
    const grid=$('forumGrid');if(!grid)return;const data=getData();if(!data)return;
    data.forum=(data.forum||[]).map((t,i)=>normalizeTopic(t,i,false));data.pendingForum=(data.pendingForum||[]).map((t,i)=>normalizeTopic(t,i,true));
    let items=filter==='pending'&&canModerate()?data.pendingForum.map(t=>({t,pending:true})):data.forum.map(t=>({t,pending:false}));
    if(filter==='fixed')items=items.filter(x=>x.t.fixed);else if(filter==='closed')items=items.filter(x=>x.t.status==='Fechado');else if(filter==='approved')items=items.filter(x=>x.t.status!=='Fechado');
    items=items.filter(x=>canSeeTopic(x.t)&&(room==='all'||x.t.category===room));
    items.sort((a,b)=>Number(b.t.fixed)-Number(a.t.fixed)||String(b.t.createdAt).localeCompare(String(a.t.createdAt)));
    grid.innerHTML=items.length?items.map(x=>card(x.t,x.pending)).join(''):'<article class="empty-card safe-card"><h3>Nenhum tópico nesta sala</h3><p>Escolhe outra sala ou cria o primeiro tópico.</p></article>';
    bindActions(grid,data);
  }
  function askText(label,current=''){const value=window.prompt(label,current);return value===null?null:value.trim()}
  function chooseRoom(current){const list=Object.entries(ROOMS).filter(([k])=>k!=='all').map(([k,v])=>`${k} = ${v}`).join('\n');const value=window.prompt(`Mover para qual sala?\n${list}`,current||'geral');return value&&ROOMS[value]?value:null}
  function addReply(t,privateReply){const text=askText(privateReply?'Resposta privada para o autor:':'Resposta pública:');if(!text)return false;t.replies.push({id:makeId(),text,private:privateReply,author:currentName(),authorRole:roleOf(profile),authorLabel:isBoss()?'BOSS':roleLabel(roleOf(profile)),createdAt:now()});return true}
  function bindActions(grid,data){
    grid.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>{
      const cardEl=btn.closest('[data-topic-id]'),id=cardEl.dataset.topicId,pending=cardEl.dataset.pending==='1';const list=pending?data.pendingForum:data.forum;const index=list.findIndex(t=>t.id===id);if(index<0)return;const t=list[index],action=btn.dataset.action;
      if(action==='approve'){list.splice(index,1);t.approved=true;t.status='Aberto';data.forum.push(t);return save(data,'Tópico aprovado.')}
      if(action==='reject'){if(confirm('Recusar este tópico?')){list.splice(index,1);save(data,'Tópico recusado.')}return}
      if(action==='remove'){if(confirm('Remover este tópico definitivamente?')){list.splice(index,1);save(data,'Tópico removido.')}return}
      if(action==='edit'){const title=askText('Editar título:',t.title);if(title===null)return;const description=askText('Editar conteúdo:',t.description);if(description===null)return;t.title=title.slice(0,60);t.description=description.slice(0,1000);return save(data,'Tópico editado.')}
      if(action==='move'){const next=chooseRoom(t.category);if(!next)return;t.category=next;t.private=PRIVATE_ROOMS.has(next);return save(data,'Tópico movido.')}
      if(action==='fix'){t.fixed=!t.fixed;return save(data,t.fixed?'Tópico fixado.':'Tópico desfixado.')}
      if(action==='close'){t.status=t.status==='Fechado'?'Aberto':'Fechado';return save(data,t.status==='Fechado'?'Tópico fechado.':'Tópico reaberto.')}
      if(action==='reply'||action==='private-reply'){if(addReply(t,action==='private-reply'))save(data,action==='private-reply'?'Resposta privada enviada.':'Resposta publicada.');return}
    });
  }

  form?.addEventListener('submit',event=>{
    event.preventDefault();if(!session){updateAuth();return}
    const title=$('topicTitle')?.value.trim().slice(0,60)||'',description=$('topicDescription')?.value.trim().slice(0,280)||'',category=$('topicCategory')?.value||'geral';
    if(!title||!description)return showFeedback('Preenche o título e a descrição antes de enviar.',true);
    const data=getData();if(!data||!Array.isArray(data.pendingForum))return showFeedback('Não foi possível preparar o tópico agora.',true);
    data.pendingForum.push({id:makeId(),title,description,category,private:PRIVATE_ROOMS.has(category),author:currentName().slice(0,40),authorRole:roleOf(profile),authorLabel:isBoss()?'BOSS':roleLabel(roleOf(profile)),userId:uid(),status:'Aberto',fixed:false,approved:false,replies:[],createdAt:now()});
    saveTeamData(data);$('topicTitle').value='';$('topicDescription').value='';showFeedback('Tópico enviado para aprovação.',false);renderForumBoard();
  });

  $('forumTabs')?.querySelectorAll('[data-forum-filter]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.forumFilter;$('forumTabs').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));renderForumBoard()});
  window.addEventListener('storage',renderForumBoard);
  sb.auth.onAuthStateChange(loadUser);loadUser();
})();
