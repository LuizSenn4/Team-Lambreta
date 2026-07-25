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
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  let members=[];
  let currentPage=1;
  let currentIndex=0;

  const isMobile=()=>matchMedia('(max-width: 640px)').matches;
  const pageSize=()=>isMobile()?5:8;

  function avatar(row){
    const label=row.nickname||row.name||'L';
    return row.image_url
      ? `<img src="${esc(row.image_url)}" alt="${esc(row.name||label)}" loading="lazy">`
      : `<span>${esc(label.charAt(0).toUpperCase())}</span>`;
  }

  function countryInfo(country){
    const value=String(country||'').trim().toLowerCase();
    const countries={
      'brasil':['🇧🇷','BR'],'brazil':['🇧🇷','BR'],'portugal':['🇵🇹','PT'],
      'espanha':['🇪🇸','ES'],'spain':['🇪🇸','ES'],'polónia':['🇵🇱','PL'],'polonia':['🇵🇱','PL'],'poland':['🇵🇱','PL'],
      'frança':['🇫🇷','FR'],'franca':['🇫🇷','FR'],'france':['🇫🇷','FR'],'alemanha':['🇩🇪','DE'],'germany':['🇩🇪','DE'],
      'itália':['🇮🇹','IT'],'italia':['🇮🇹','IT'],'italy':['🇮🇹','IT'],'holanda':['🇳🇱','NL'],'netherlands':['🇳🇱','NL'],
      'reino unido':['🇬🇧','GB'],'united kingdom':['🇬🇧','GB'],'estados unidos':['🇺🇸','US'],'usa':['🇺🇸','US']
    };
    return countries[value]||['🌍','--'];
  }

  function roleClass(role){
    return String(role||'member').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
  }

  function card(row,index){
    const nickname=row.nickname||row.name||'Membro';
    const [flag,code]=countryInfo(row.country);
    return `<button type="button" class="team-member-card-v39" data-team-index="${index}" aria-label="Abrir perfil de ${esc(nickname)}">
      <span class="team-member-photo-v39">${avatar(row)}</span>
      <span class="team-member-copy-v39">
        <strong>${esc(nickname)}</strong>
        <small>${esc(row.role||'Membro')}</small>
        <span><i aria-hidden="true">${flag}</i> ${code}</span>
      </span>
      <b class="team-member-plus-v39" aria-hidden="true">+</b>
    </button>`;
  }

  function facts(row){
    return [['Idade',row.age?`${row.age} anos`:''],['Jogo',row.main_game],['Modo',row.favorite_mode],['Armas',row.favorite_weapons],['Estilo',row.play_style],['País',row.country]].filter(([,v])=>v);
  }

  function links(row){
    const dynamic=Array.isArray(row.social_links)?row.social_links.filter(x=>x&&x.label&&x.url).slice(0,4):[];
    if(dynamic.length) return dynamic.map(x=>[x.label,x.url]);
    return [['Instagram',row.instagram_url],['TikTok',row.tiktok_url],['Facebook',row.facebook_url]].filter(([,u])=>u);
  }

  function modalMarkup(row){
    const nickname=row.nickname||row.name||'Membro';
    const factMarkup=facts(row).map(([l,v])=>`<div><small>${esc(l)}</small><strong>${esc(v)}</strong></div>`).join('');
    const linkMarkup=links(row).map(([l,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('');
    return `<div class="team-modal-photo-v39">${avatar(row)}</div>
      <div class="team-modal-copy-v39">
        <span>PERFIL OFICIAL</span>
        <h2 id="teamModalName">${esc(nickname)}</h2>
        <strong class="role-${roleClass(row.role)}">${esc(row.role||'Membro')}</strong>
        ${factMarkup?`<div class="team-modal-facts-v39">${factMarkup}</div>`:''}
        <p>${esc(row.bio||'Perfil oficial do Team Lambreta.')}</p>
        ${linkMarkup?`<div class="team-modal-links-v39">${linkMarkup}</div>`:''}
      </div>`;
  }

  function openModal(index){
    if(!members.length||!modal||!modalContent) return;
    currentIndex=((index%members.length)+members.length)%members.length;
    modalContent.innerHTML=modalMarkup(members[currentIndex]);
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('team-modal-open-v39');
    modal.querySelector('.team-modal-close-v39')?.focus();
  }

  function closeModal(){
    if(!modal) return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('team-modal-open-v39');
  }

  function moveModal(step){ openModal(currentIndex+step); }

  function renderPager(totalPages){
    if(!pager) return;
    if(totalPages<=1){pager.hidden=true;pager.innerHTML='';return;}
    pager.hidden=false;
    const previous=`<button type="button" data-page="${Math.max(1,currentPage-1)}" aria-label="Página anterior" ${currentPage===1?'disabled':''}>‹</button>`;
    const pages=Array.from({length:totalPages},(_,i)=>i+1).map(page=>`<button type="button" data-page="${page}" class="${page===currentPage?'is-active':''}">${page}</button>`).join('');
    const next=`<button type="button" data-page="${Math.min(totalPages,currentPage+1)}" aria-label="Próxima página" ${currentPage===totalPages?'disabled':''}>›</button>`;
    pager.innerHTML=previous+pages+next;
    pager.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{
      currentPage=Number(btn.dataset.page)||1;render();document.querySelector('.team-roster-hero-v39')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }

  function bindCards(){
    grid?.querySelectorAll('[data-team-index]').forEach(btn=>btn.addEventListener('click',()=>openModal(Number(btn.dataset.teamIndex)||0)));
  }

  function render(){
    if(!grid) return;
    const size=pageSize();
    const totalPages=Math.max(1,Math.ceil(members.length/size));
    currentPage=Math.min(currentPage,totalPages);
    const start=(currentPage-1)*size;
    const rows=members.slice(start,start+size);
    grid.innerHTML=rows.length?rows.map((row,i)=>card(row,start+i)).join(''):`<article class="team-roster-empty-v39">Nenhum membro publicado.</article>`;
    bindCards();
    renderPager(totalPages);
  }

  async function load(){
    if(!grid) return;
    const {data,error}=await sb.from('team_members').select('*').eq('is_published',true).eq('is_archived',false).order('is_featured',{ascending:false}).order('display_order').order('created_at');
    if(error){grid.innerHTML=`<article class="team-roster-empty-v39">Não foi possível carregar o Team.</article>`;return;}
    members=data||[];render();
  }

  modal?.querySelectorAll('[data-team-close]').forEach(btn=>btn.addEventListener('click',closeModal));
  modal?.querySelector('[data-team-prev]')?.addEventListener('click',()=>moveModal(-1));
  modal?.querySelector('[data-team-next]')?.addEventListener('click',()=>moveModal(1));
  document.addEventListener('keydown',event=>{
    if(modal?.hidden!==false) return;
    if(event.key==='Escape') closeModal();
    if(event.key==='ArrowLeft') moveModal(-1);
    if(event.key==='ArrowRight') moveModal(1);
  });
  let resizeTimer;
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{currentPage=1;render();},150)});

  let timer;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(load,120)};
  async function boot(){
    await load();
    sb.channel('team-public-v39').on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh).subscribe();
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
