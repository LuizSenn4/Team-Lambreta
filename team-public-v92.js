(() => {
  'use strict';
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;
  const grid=document.getElementById('teamRosterGrid');
  const pager=document.getElementById('teamRosterPager');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let members=[]; let currentPage=1; const PAGE_SIZE=10;

  function avatar(row){
    const label=row.nickname||row.name||'L';
    return row.image_url?`<img src="${esc(row.image_url)}" alt="${esc(row.name||label)}" loading="lazy">`:`<span>${esc(label.charAt(0).toUpperCase())}</span>`;
  }
  function countryInfo(country){
    const value=String(country||'').trim().toLowerCase();
    const map={'brasil':['🇧🇷','BR'],'brazil':['🇧🇷','BR'],'portugal':['🇵🇹','PT'],'espanha':['🇪🇸','ES'],'spain':['🇪🇸','ES'],'polónia':['🇵🇱','PL'],'polonia':['🇵🇱','PL'],'poland':['🇵🇱','PL'],'frança':['🇫🇷','FR'],'franca':['🇫🇷','FR'],'france':['🇫🇷','FR'],'alemanha':['🇩🇪','DE'],'germany':['🇩🇪','DE'],'itália':['🇮🇹','IT'],'italia':['🇮🇹','IT'],'italy':['🇮🇹','IT'],'holanda':['🇳🇱','NL'],'netherlands':['🇳🇱','NL'],'reino unido':['🇬🇧','GB'],'united kingdom':['🇬🇧','GB'],'estados unidos':['🇺🇸','US'],'usa':['🇺🇸','US']};
    return map[value]||['🌍','--'];
  }
  function facts(row){return [['Idade',row.age?`${row.age} anos`:''],['Jogo',row.main_game],['Modo',row.favorite_mode],['Tipo de armas',row.favorite_weapons],['Estilo',row.play_style],['País',row.country]].filter(([,v])=>v)}
  function links(row){
    const dynamic=Array.isArray(row.social_links)?row.social_links.filter(x=>x&&x.label&&x.url).slice(0,4):[];
    if(dynamic.length) return dynamic.map(x=>[x.label,x.url,x.type||'other']);
    return [['Instagram',row.instagram_url,'instagram'],['TikTok',row.tiktok_url,'tiktok'],['Facebook',row.facebook_url,'facebook']].filter(([,u])=>u);
  }
  function compactCard(row,index){
    const nickname=row.nickname||row.name||'Membro'; const [flag,code]=countryInfo(row.country);
    return `<button type="button" class="team-roster-card tone-${index%2===0?'green':'red'}" data-member-index="${index}" aria-label="Abrir perfil de ${esc(nickname)}">
      <span class="team-roster-accent"></span>
      <span class="team-roster-avatar">${avatar(row)}</span>
      <span class="team-roster-copy"><strong>${esc(nickname)}</strong><small>${esc(row.role||'MEMBRO')}</small><em><span aria-hidden="true">${flag}</span> ${code}</em></span>
      <span class="team-roster-plus" aria-hidden="true">＋</span>
    </button>`;
  }
  function ensureModal(){
    let modal=document.getElementById('teamProfileModal'); if(modal) return modal;
    modal=document.createElement('div'); modal.id='teamProfileModal'; modal.className='team-esports-modal'; modal.hidden=true;
    modal.innerHTML=`<div class="team-esports-backdrop" data-close-profile></div><article class="team-esports-profile" role="dialog" aria-modal="true" aria-labelledby="teamProfileName"><button type="button" class="team-esports-close" data-close-profile aria-label="Fechar">×</button><div id="teamProfileContent"></div></article>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-profile]').forEach(el=>el.addEventListener('click',closeModal));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
    return modal;
  }
  function openModal(row){
    const modal=ensureModal(), content=modal.querySelector('#teamProfileContent');
    const nickname=row.nickname||row.name||'Membro';
    const factMarkup=facts(row).map(([label,value])=>{const shown=label==='País'?(()=>{const [f,c]=countryInfo(value);return `<span class="team-country-value"><span>${f}</span><b>${c}</b></span>`})():esc(value);return `<div><small>${esc(label)}</small><strong>${shown}</strong></div>`}).join('');
    const linkMarkup=links(row).map(([label,url,type])=>`<a class="team-social-link is-${esc(type)}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`).join('');
    content.innerHTML=`<div class="team-esports-profile-photo">${avatar(row)}</div><div class="team-esports-profile-copy"><p class="tag">PERFIL OFICIAL</p><h2 id="teamProfileName">${esc(nickname)}</h2><strong>${esc(row.role||'MEMBRO')}</strong>${factMarkup?`<div class="team-esports-facts">${factMarkup}</div>`:''}<p class="team-esports-bio">${esc(row.bio||'Perfil oficial do Team Lambreta.')}</p>${linkMarkup?`<div class="team-esports-links">${linkMarkup}</div>`:''}</div>`;
    modal.hidden=false; document.body.classList.add('team-modal-open'); modal.querySelector('.team-esports-close')?.focus();
  }
  function closeModal(){const modal=document.getElementById('teamProfileModal'); if(!modal)return; modal.hidden=true; document.body.classList.remove('team-modal-open')}
  function renderPager(totalPages){
    if(!pager)return; if(totalPages<=1){pager.hidden=true;pager.innerHTML='';return} pager.hidden=false;
    pager.innerHTML=Array.from({length:totalPages},(_,i)=>i+1).map(page=>`<button type="button" class="${page===currentPage?'is-active':''}" data-page="${page}">${page}</button>`).join('');
    pager.querySelectorAll('[data-page]').forEach(btn=>btn.onclick=()=>{currentPage=Number(btn.dataset.page)||1;render();document.querySelector('.team-esports-hero')?.scrollIntoView({behavior:'smooth',block:'start'})});
  }
  function render(){
    if(!grid)return; const totalPages=Math.max(1,Math.ceil(members.length/PAGE_SIZE)); if(currentPage>totalPages)currentPage=totalPages; const start=(currentPage-1)*PAGE_SIZE; const rows=members.slice(start,start+PAGE_SIZE);
    grid.innerHTML=rows.length?rows.map((row,i)=>compactCard(row,start+i)).join(''):`<article class="team-esports-empty"><h2>Nenhum perfil nesta área</h2></article>`;
    grid.querySelectorAll('[data-member-index]').forEach(btn=>btn.onclick=()=>openModal(members[Number(btn.dataset.memberIndex)])); renderPager(totalPages);
  }
  async function load(){
    if(!grid)return; const {data,error}=await sb.from('team_members').select('*').eq('is_published',true).eq('is_archived',false).order('is_featured',{ascending:false}).order('display_order').order('created_at');
    if(error){grid.innerHTML=`<article class="team-esports-empty"><h2>Não foi possível carregar o Team</h2><p>${esc(error.message)}</p></article>`;return} members=data||[];render();
  }
  let timer=null; const refresh=()=>{clearTimeout(timer);timer=setTimeout(load,120)};
  async function boot(){await load();sb.channel('team-public-v92').on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh).subscribe();addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
