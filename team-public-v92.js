(() => {
  'use strict';

  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const grid=document.getElementById('teamRosterGrid');
  const pager=document.getElementById('teamRosterPager');
  const modal=document.getElementById('teamProfileModal');
  const modalContent=document.getElementById('teamModalContent');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  let members=[];
  let currentIndex=0;
  let currentPage=1;
  let configuredPerPage=10;
  let lastFocus=null;

  function avatar(row,compact=false){
    const label=row.nickname||row.name||'L';
    if(row.image_url) return `<img src="${esc(row.image_url)}" alt="${esc(row.name||label)}" loading="lazy">`;
    return `<span class="${compact?'is-compact':''}">${esc(label.charAt(0).toUpperCase())}</span>`;
  }

  function countryInfo(country){
    const value=String(country||'').trim().toLowerCase();
    const countries={
      'brasil':['🇧🇷','BR'],'brazil':['🇧🇷','BR'],'portugal':['🇵🇹','PT'],
      'espanha':['🇪🇸','ES'],'spain':['🇪🇸','ES'],'polónia':['🇵🇱','PL'],'polonia':['🇵🇱','PL'],'poland':['🇵🇱','PL'],
      'frança':['🇫🇷','FR'],'franca':['🇫🇷','FR'],'france':['🇫🇷','FR'],'alemanha':['🇩🇪','DE'],'germany':['🇩🇪','DE'],
      'itália':['🇮🇹','IT'],'italia':['🇮🇹','IT'],'italy':['🇮🇹','IT'],'países baixos':['🇳🇱','NL'],'paises baixos':['🇳🇱','NL'],
      'holanda':['🇳🇱','NL'],'netherlands':['🇳🇱','NL'],'reino unido':['🇬🇧','GB'],'united kingdom':['🇬🇧','GB'],
      'inglaterra':['🇬🇧','GB'],'england':['🇬🇧','GB'],'estados unidos':['🇺🇸','US'],'usa':['🇺🇸','US'],'united states':['🇺🇸','US']
    };
    return countries[value]||['🌍','--'];
  }

  function facts(row){
    return [
      ['Idade',row.age ? `${row.age} anos` : ''],['Jogo',row.main_game],['Modo',row.favorite_mode],
      ['Tipo de armas',row.favorite_weapons],['Estilo',row.play_style],['País',row.country]
    ].filter(([,value])=>value);
  }

  function links(row){
    const dynamic=Array.isArray(row.social_links)?row.social_links.filter(item=>item&&item.label&&item.url).slice(0,4):[];
    if(dynamic.length) return dynamic.map(item=>[item.label,item.url,item.type||'other']);
    return [['Instagram',row.instagram_url,'instagram'],['TikTok',row.tiktok_url,'tiktok'],['Facebook',row.facebook_url,'facebook']].filter(([,url])=>url);
  }

  function roleClass(role){
    const value=String(role||'membro').toLowerCase();
    if(value.includes('boss')) return 'boss';
    if(value.includes('dev')||value.includes('desenvolv')) return 'dev';
    if(value.includes('admin')) return 'admin';
    if(value.includes('moder')) return 'moderator';
    if(value.includes('staff')) return 'staff';
    if(value.includes('stream')) return 'streamer';
    if(value.includes('vip')) return 'vip';
    return 'member';
  }

  function cardMarkup(row,index){
    const nickname=row.nickname||row.name||'Membro';
    const [flag,code]=countryInfo(row.country);
    return `<button type="button" class="team-preview-card role-${roleClass(row.role)}" data-team-index="${index}" aria-label="Abrir perfil de ${esc(nickname)}">
      <span class="team-preview-photo">${avatar(row,true)}</span>
      <span class="team-preview-copy">
        <strong>${esc(nickname)}</strong>
        <small>${esc(row.role||'Membro')}</small>
        <span>${row.country?`${flag} ${code}`:'TEAM LAMBRETA'}</span>
      </span>
      <i aria-hidden="true">+</i>
    </button>`;
  }

  function modalMarkup(row){
    const nickname=row.nickname||row.name||'Membro';
    const factMarkup=facts(row).map(([label,value])=>{
      const shown=label==='País'?(()=>{const [flag,code]=countryInfo(value);return `<span class="team-country-value"><span aria-hidden="true">${flag}</span><b>${code}</b></span>`})():esc(value);
      return `<div><small>${esc(label)}</small><strong>${shown}</strong></div>`;
    }).join('');
    const linkMarkup=links(row).map(([label,url,type])=>`<a class="team-social-link is-${esc(type||'other')}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`).join('');
    return `<div class="team-modal-photo role-${roleClass(row.role)}">${avatar(row)}</div>
      <div class="team-modal-copy">
        <span class="team-modal-kicker">PERFIL OFICIAL</span>
        <h2 id="teamModalName">${esc(nickname)}</h2>
        <strong class="team-modal-role role-text-${roleClass(row.role)}">${esc(row.role||'Membro')}</strong>
        ${factMarkup?`<div class="team-modal-facts">${factMarkup}</div>`:''}
        <p>${esc(row.bio||'Perfil oficial do Team Lambreta.')}</p>
        ${linkMarkup?`<div class="team-modal-links">${linkMarkup}</div>`:''}
      </div>`;
  }

  function openModal(index){
    if(!members.length||!modal||!modalContent) return;
    currentIndex=(index+members.length)%members.length;
    lastFocus=document.activeElement;
    modalContent.innerHTML=modalMarkup(members[currentIndex]);
    modal.hidden=false; modal.setAttribute('aria-hidden','false');
    document.body.classList.add('team-modal-open');
    modal.querySelector('.team-modal-close')?.focus();
  }
  function closeModal(){
    if(!modal) return;
    modal.hidden=true; modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('team-modal-open');
    lastFocus?.focus?.();
  }
  function moveModal(step){
    if(!members.length) return;
    currentIndex=(currentIndex+step+members.length)%members.length;
    modalContent.innerHTML=modalMarkup(members[currentIndex]);
  }

  function bindCards(){
    document.querySelectorAll('[data-team-index]').forEach(button=>button.addEventListener('click',()=>openModal(Number(button.dataset.teamIndex)||0)));
  }

  function effectivePerPage(){
    return matchMedia('(max-width: 600px)').matches ? Math.min(configuredPerPage,5) : configuredPerPage;
  }

  function renderPager(totalPages){
    if(!pager) return;
    if(totalPages<=1){pager.hidden=true;pager.innerHTML='';return;}
    pager.hidden=false;
    const buttons=[];
    buttons.push(`<button type="button" data-page-step="-1" aria-label="Página anterior">‹</button>`);
    for(let page=1;page<=totalPages;page++) buttons.push(`<button type="button" data-page="${page}" class="${page===currentPage?'is-active':''}" aria-label="Página ${page}">${page}</button>`);
    buttons.push(`<button type="button" data-page-step="1" aria-label="Próxima página">›</button>`);
    pager.innerHTML=buttons.join('');
    pager.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{currentPage=Number(button.dataset.page)||1;render();scrollToRoster();}));
    pager.querySelectorAll('[data-page-step]').forEach(button=>button.addEventListener('click',()=>{currentPage=((currentPage-1+Number(button.dataset.pageStep)+totalPages)%totalPages)+1;render();scrollToRoster();}));
  }

  function scrollToRoster(){
    document.querySelector('.team-roster-section')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function render(){
    if(!grid) return;
    if(!members.length){
      grid.innerHTML='<article class="team-esports-empty"><h2>Nenhum perfil nesta área</h2></article>';
      renderPager(0);
      return;
    }
    const perPage=effectivePerPage();
    const totalPages=Math.max(1,Math.ceil(members.length/perPage));
    currentPage=Math.min(Math.max(1,currentPage),totalPages);
    const start=(currentPage-1)*perPage;
    grid.innerHTML=members.slice(start,start+perPage).map((row,offset)=>cardMarkup(row,start+offset)).join('');
    renderPager(totalPages);
    bindCards();
  }

  async function loadSettings(){
    try{
      const {data}=await sb.from('team_display_settings').select('members_per_page').eq('id',1).maybeSingle();
      configuredPerPage=Math.min(10,Math.max(1,Number(data?.members_per_page)||10));
    }catch(_){configuredPerPage=10;}
  }

  async function load(){
    if(!grid) return;
    await loadSettings();
    const {data,error}=await sb.from('team_members').select('*').eq('is_published',true).eq('is_archived',false)
      .order('display_order').order('created_at');
    if(error){
      grid.innerHTML=`<article class="team-esports-empty"><h2>Não foi possível carregar o Team</h2><p>${esc(error.message)}</p></article>`;
      return;
    }
    members=data||[]; render();
  }

  modal?.querySelectorAll('[data-team-close]').forEach(button=>button.addEventListener('click',closeModal));
  modal?.querySelector('[data-team-prev]')?.addEventListener('click',()=>moveModal(-1));
  modal?.querySelector('[data-team-next]')?.addEventListener('click',()=>moveModal(1));
  document.addEventListener('keydown',event=>{
    if(modal?.hidden!==false) return;
    if(event.key==='Escape') closeModal();
    if(event.key==='ArrowLeft') moveModal(-1);
    if(event.key==='ArrowRight') moveModal(1);
  });

  let timer=null;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(load,120);};
  async function boot(){
    await load();
    sb.channel('team-public-v92')
      .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'team_display_settings'},refresh)
      .subscribe();
    let resizeTimer=null;
    addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{currentPage=1;render();},120);});
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
