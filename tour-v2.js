(()=>{
  'use strict';
  const KEY='tl_update_tour_v2';
  const RELEASE='2026.08.16';
  const SUPABASE_URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.teamSupabase || (window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY) : null);
  const PROFILE_TARGETS=new Set(['forum-profile-cover','forum-profile-header','forum-profile-identity','forum-avatar-upload','forum-custom-modes']);
  const steps=[
    {target:'forum-profile-cover',url:'forum.html',kind:'NOVO',title:'Capas personalizáveis',body:'O perfil agora tem capas prontas. Aqui está a capa real do membro, com Verde / preta como padrão da V1.'},
    {target:'forum-profile-header',url:'forum.html',kind:'VISUAL',title:'Novo header do perfil',body:'Avatar, nickname, cargo e país agora ficam integrados sobre a capa em um único header.'},
    {target:'forum-profile-identity',url:'forum.html',kind:'MELHORIA',title:'Identidade mais compacta',body:'Cargo e país ficaram mais limpos, com badge compacto e bandeira acompanhada da sigla.'},
    {target:'forum-avatar-upload',url:'forum.html',kind:'NOVO',title:'Avatar otimizado automaticamente',body:'Escolha a imagem aqui. O site prepara o avatar em 512 × 512 e comprime automaticamente quando necessário para respeitar o limite de 2 MB.'},
    {target:'forum-custom-modes',url:'forum.html',kind:'NOVO',title:'Modos de jogo personalizados',body:'Além dos modos sugeridos, agora você pode adicionar modos personalizados ao jogo sem depender de uma atualização do catálogo. Fortnite já ganhou Blitz.'},
    {target:'forum-structure',url:'forum.html',kind:'MELHORIA',title:'Contadores nas pastas',body:'As pastas do Fórum exibem tópicos e respostas para mostrar melhor a atividade da comunidade.'},
    {target:'chat-member-preview',url:'home.html',kind:'NOVO',title:'Mini perfil nas menções',body:'Ao passar o mouse ou tocar numa menção @Nick, abre este mini perfil com avatar, cargo, país e uma seta para visitar o perfil completo.'},
    {target:'updates-page',url:'atualizacoes.html',kind:'MELHORIA',title:'Tour e Me mostra',body:'Cada novidade visual pode usar ✨ Me mostra para ir direto ao recurso, enquanto o tour completo percorre as principais mudanças desta versão.'}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page=()=>location.pathname.split('/').pop()||'home.html';
  const save=s=>sessionStorage.setItem(KEY,JSON.stringify(s));
  const current=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}};
  async function currentUserId(){try{return (await sb?.auth?.getSession?.())?.data?.session?.user?.id||null}catch{return null}}
  function targetEl(id){
    const selectors={
      'forum-profile-cover':['[data-cover-art]'],
      'forum-profile-header':['[data-tour="forum-profile-header"]'],
      'forum-profile-identity':['.forum-profile-cover-copy'],
      'forum-avatar-upload':['[data-tour="forum-avatar-upload"]','.forum-profile-avatar-editor'],
      'forum-custom-modes':['[data-tour="forum-custom-modes"]','#forumModesPicker'],
      'forum-structure':['[data-tour="forum-structure"]','#forumBoardView','#forumApplication'],
      'chat-member-preview':['[data-tour="chat-member-preview"]','.tl-member-preview:not([hidden])'],
      'updates-page':['[data-tour="updates-page"]','.updates-page']
    };
    return (selectors[id]||[`[data-tour="${CSS.escape(id)}"]`]).map(s=>document.querySelector(s)).find(Boolean);
  }
  async function resolveStep(step,state={}){
    if(!step)return null;
    if(PROFILE_TARGETS.has(step.target)){
      const profileId=state.profileId||new URLSearchParams(location.search).get('profile')||await currentUserId();
      return profileId?{...step,url:`forum.html?profile=${encodeURIComponent(profileId)}`,profileId}:{...step,url:'forum.html'};
    }
    return {...step};
  }
  function sameDestination(step){
    const u=new URL(step.url,location.href);
    if(page()!==u.pathname.split('/').pop())return false;
    if(PROFILE_TARGETS.has(step.target))return new URLSearchParams(location.search).get('profile')===String(step.profileId||'');
    return true;
  }
  function close(){
    const root=document.querySelector('.tl-tour-root');
    if(root?._reposition)window.removeEventListener('resize',root._reposition);
    root?.remove();
    document.querySelectorAll('.tl-tour-target').forEach(el=>{el.classList.remove('tl-tour-target');el.style.removeProperty('z-index')});
    window.dispatchEvent(new CustomEvent('tl-tour-closed'));
  }
  function fallback(message='Esta novidade ainda não tem uma demonstração disponível.'){
    close();const root=document.createElement('div');root.className='tl-tour-root';root.innerHTML=`<div class="tl-tour-overlay is-open"></div><aside class="tl-tour-card tl-tour-fallback" role="status"><small>ATUALIZAÇÕES</small><h2>Me mostra</h2><p>${esc(message)}</p><div class="tl-tour-actions"><button type="button" data-tour-close>Fechar</button></div></aside>`;document.body.appendChild(root);root.querySelector('[data-tour-close]').onclick=close;root.querySelector('.tl-tour-overlay').onclick=close;
  }
  function showLoading(){close();const root=document.createElement('div');root.className='tl-tour-root';root.innerHTML='<div class="tl-tour-overlay is-open"></div><aside class="tl-tour-card tl-tour-loading" role="status"><span class="tl-tour-spinner"></span><span>Carregando novidade…</span></aside>';document.body.appendChild(root)}
  function placeCard(card,el){if(innerWidth<=650){card.style.top='';card.style.left='';return}const margin=18,gap=14,r=el.getBoundingClientRect(),w=Math.min(360,innerWidth-margin*2),h=Math.min(card.offsetHeight,innerHeight-margin*2);let top=r.bottom+gap,left=r.left;if(top+h>innerHeight-margin)top=r.top-h-gap;if(left+w>innerWidth-margin)left=innerWidth-w-margin;if(left<margin)left=margin;if(top<margin)top=margin;card.style.top=`${Math.round(top)}px`;card.style.left=`${Math.round(left)}px`}
  async function prepareTarget(id){
    if(id==='forum-avatar-upload'||id==='forum-custom-modes'){
      let dialog=document.getElementById('forumProfileDialog');
      if(dialog&&!dialog.open){document.querySelector('[data-edit-profile]')?.click();await new Promise(r=>setTimeout(r,120));}
      const el=id==='forum-avatar-upload'?document.querySelector('.forum-profile-avatar-editor'):document.getElementById('forumModesPicker');
      if(el)el.dataset.tour=id;
    }
    if(id==='chat-member-preview'){
      const existing=document.querySelector('.tl-member-preview:not([hidden])');if(existing){existing.dataset.tour=id;return}
      const mention=document.querySelector('.tl-chat-mention,.tl-global-mention');
      if(mention){mention.click();await new Promise(r=>setTimeout(r,450));const card=document.querySelector('.tl-member-preview:not([hidden])');if(card)card.dataset.tour=id;}
    }
  }
  async function waitForTarget(id){
    await prepareTarget(id);const started=Date.now();
    return new Promise(resolve=>{const timer=setInterval(async()=>{await prepareTarget(id);const el=targetEl(id);if(el){clearInterval(timer);resolve(el);return}if(Date.now()-started>8000){clearInterval(timer);resolve(null)}},120)});
  }
  async function open(state,index,step,individual=false){
    const el=await waitForTarget(step.target);if(!el){if(!individual&&index<steps.length-1)return go(state,index+1);return fallback('O recurso ainda não está disponível nesta página.')}
    close();el.classList.add('tl-tour-target');el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    const root=document.createElement('div');root.className='tl-tour-root';root.innerHTML=`<div class="tl-tour-overlay is-open"></div><aside class="tl-tour-card" role="dialog" aria-label="Tour da atualização"><small>${esc(step.kind||'NOVIDADE')}${individual?'':' · '+(index+1)+' de '+steps.length}</small><h2>${esc(step.title)}</h2><p>${esc(step.body)}</p><div class="tl-tour-actions"><button type="button" data-tour-skip>${individual?'Fechar':'Pular tour'}</button>${!individual&&index?'<button type="button" data-tour-prev>Voltar</button>':''}<button type="button" data-tour-next>${individual||index===steps.length-1?'Concluir':'Próximo →'}</button></div></aside>`;document.body.appendChild(root);
    const card=root.querySelector('.tl-tour-card'),reposition=()=>placeCard(card,el);root._reposition=reposition;requestAnimationFrame(()=>requestAnimationFrame(reposition));setTimeout(reposition,350);window.addEventListener('resize',reposition,{passive:true});
    root.querySelector('[data-tour-skip]').onclick=()=>{if(!individual)localStorage.setItem(`tl_update_tour_seen_${RELEASE}`,'1');sessionStorage.removeItem(KEY);close()};
    root.querySelector('[data-tour-prev]')?.addEventListener('click',()=>go(state,Math.max(0,index-1)));
    root.querySelector('[data-tour-next]').onclick=()=>{if(individual){sessionStorage.removeItem(KEY);close();return}if(index===steps.length-1){localStorage.setItem(`tl_update_tour_seen_${RELEASE}`,'1');sessionStorage.removeItem(KEY);close();location.href='home.html';return}go(state,index+1)};
    root.querySelector('.tl-tour-overlay').onclick=()=>{sessionStorage.removeItem(KEY);close()};
  }
  async function go(state,index){
    showLoading();const step=await resolveStep(steps[index],state);if(!step)return fallback();const next={...state,index,release:RELEASE,profileId:step.profileId||state.profileId};save(next);
    if(!sameDestination(step)){const u=new URL(step.url,location.href);u.searchParams.set('tlTour','1');location.href=u.href;return}open(next,index,step,false);
  }
  function startFull(){const state={release:RELEASE,index:0};save(state);go(state,0)}
  async function startItem(meta){
    if(!meta?.tour_target||!meta?.tour_url)return fallback();const step=await resolveStep({target:meta.tour_target,url:meta.tour_url,kind:meta.kind,title:meta.title,body:meta.body},{});const state={release:RELEASE,index:0,individual:step,profileId:step.profileId};save(state);
    if(!sameDestination(step)){const u=new URL(step.url,location.href);u.searchParams.set('tlTour','1');location.href=u.href;return}open(state,0,step,true);
  }
  async function init(){
    const state=current(),q=new URLSearchParams(location.search);if(!state||q.get('tlTour')!=='1')return;
    if(state.individual){const step=await resolveStep(state.individual,state);if(!sameDestination(step)){const u=new URL(step.url,location.href);u.searchParams.set('tlTour','1');location.href=u.href;return}open({...state,individual:step},0,step,true);return}
    const index=Number(state.index)||0,step=await resolveStep(steps[index],state);if(!sameDestination(step)){const u=new URL(step.url,location.href);u.searchParams.set('tlTour','1');location.href=u.href;return}open({...state,profileId:step.profileId||state.profileId},index,step,false);
  }
  window.TLStartUpdateTour=startFull;window.TLStartUpdateItem=startItem;window.TLCloseTour=close;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.tl-tour-root')){sessionStorage.removeItem(KEY);close()}});
  document.addEventListener('DOMContentLoaded',init);if(document.readyState!=='loading')init();
})();