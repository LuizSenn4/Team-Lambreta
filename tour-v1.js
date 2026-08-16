(()=>{
  'use strict';
  const KEY='tl_update_tour_v1';
  const steps=[
    {target:'forum-structure',url:'forum.html',kind:'NOVO',title:'Fórum renovado',body:'Categorias, pastas, tópicos e respostas agora ficam organizados como uma comunidade real.'},
    {target:'forum-profile',url:'forum.html',kind:'NOVO',title:'Perfil do Fórum',body:'Abra o seu perfil para configurar nickname, avatar e informações públicas.'},
    {target:'forum-share',url:'forum.html',kind:'MELHORIA',title:'Compartilhar publicação',body:'Use o compartilhamento para copiar ou enviar o deep link exato de um tópico ou resposta.'},
    {target:'topic-moderation',url:'forum.html',kind:'MELHORIA',title:'Moderação de tópicos',body:'Moderadores podem fixar, trancar e fechar tópicos sem apagar o conteúdo.'},
    {target:'buddy-list',url:'buddy.html',kind:'NOVO',title:'Buddy System',body:'Encontre Buddies, acompanhe presença e abra conversas privadas somente por texto.'},
    {target:'updates-page',url:'atualizacoes.html',kind:'COMUNIDADE',title:'Atualizações',body:'Consulte o histórico de novidades e reveja este tour quando quiser.'}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page=()=>location.pathname.split('/').pop()||'home.html';
  function targetEl(id){
    const selectors={
      'forum-structure':['[data-tour="forum-structure"]','#forumBoardView','#forumApplication'],
      'forum-profile':['[data-tour="forum-profile"]','#forumMyProfileButton'],
      'forum-share':['[data-tour="forum-share"]','[data-share-topic]','#forumBoardView'],
      'topic-moderation':['[data-tour="topic-moderation"]','[data-topic-moderation-toggle]','#forumBoardView'],
      'buddy-list':['[data-tour="buddy-list"]','#buddyApp','.buddy-sidebar'],
      'team-roster':['[data-tour="team-roster"]','#teamRosterGrid','.team-esports-grid'],
      'updates-page':['[data-tour="updates-page"]','.updates-page']
    };
    return (selectors[id]||[`[data-tour="${CSS.escape(id)}"]`]).map(s=>document.querySelector(s)).find(Boolean);
  }
  function close(){const root=document.querySelector('.tl-tour-root');root?.remove();document.querySelectorAll('.tl-tour-target').forEach(el=>{el.classList.remove('tl-tour-target');el.style.removeProperty('z-index')});window.dispatchEvent(new CustomEvent('tl-tour-closed'));}
  function save(state){sessionStorage.setItem(KEY,JSON.stringify(state));}
  function current(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}}
  function go(state,index){const step=steps[index];save({...state,index});const currentPage=page();if(currentPage!==step.url){location.href=`${step.url}?tlTour=1`;return}setTimeout(()=>open(state,index),80)}
  function open(state,index,customStep=null){const step=customStep||steps[index];const individual=Boolean(customStep);const el=targetEl(step.target);if(!el){if(!individual&&index<steps.length-1)return go(state,index+1);close();return}document.querySelector('.tl-tour-root')?.remove();el.classList.add('tl-tour-target');el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});const root=document.createElement('div');root.className='tl-tour-root';root.innerHTML=`<div class="tl-tour-overlay is-open" aria-hidden="true"></div><aside class="tl-tour-card" role="dialog" aria-label="Tour da atualização"><small>${esc(step.kind||'NOVIDADE')}${individual?'':' · '+(index+1)+' de '+steps.length}</small><h2>${esc(step.title)}</h2><p>${esc(step.body)}</p><div class="tl-tour-actions"><button type="button" data-tour-skip>${individual?'Fechar':'Pular tour'}</button>${!individual&&index?'<button type="button" data-tour-prev>Voltar</button>':''}<button type="button" data-tour-next>${individual||index===steps.length-1?'Concluir':'Próximo →'}</button></div></aside>`;document.body.appendChild(root);root.querySelector('[data-tour-skip]').onclick=()=>{if(!individual)localStorage.setItem('tl_update_tour_seen','1');sessionStorage.removeItem(KEY);close()};root.querySelector('[data-tour-prev]')?.addEventListener('click',()=>go(state,Math.max(0,index-1)));root.querySelector('[data-tour-next]').onclick=()=>{if(individual||index===steps.length-1){if(!individual)localStorage.setItem('tl_update_tour_seen','1');sessionStorage.removeItem(KEY);close()}else go(state,index+1)};root.querySelector('.tl-tour-overlay').onclick=close;}
  function startFull(){save({release:'2026.08.15',index:0});go({release:'2026.08.15'},0)}
  function startItem(meta){const state={release:'2026.08.15',index:0,individual:meta};sessionStorage.setItem(KEY,JSON.stringify(state));if(meta.url!==page()){location.href=`${meta.url}?tlTour=1`;return}setTimeout(()=>{const el=targetEl(meta.target);if(!el)return;open({...state},0)},80)}
  window.TLStartUpdateTour=startFull;window.TLStartUpdateItem=startItem;window.TLCloseTour=close;
  function init(){const state=current();const q=new URLSearchParams(location.search);if(!state||q.get('tlTour')!=='1')return;if(state.individual){const el=targetEl(state.individual.target);if(el){open({release:state.release,individual:state.individual},0,state.individual)}else setTimeout(init,300);return}const index=Number(state.index)||0;if(steps[index]?.url!==page()){location.href=`${steps[index].url}?tlTour=1`;return}const el=targetEl(steps[index].target);if(!el){setTimeout(init,350);return}open(state,index)}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.tl-tour-root')){sessionStorage.removeItem(KEY);close()}});document.addEventListener('DOMContentLoaded',init);if(document.readyState!=='loading')init();
})();
