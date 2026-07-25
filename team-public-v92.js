(() => {
  'use strict';

  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const feature=document.getElementById('teamBossFeature');
  const grid=document.getElementById('teamRosterGrid');
  const modal=document.getElementById('teamProfileModal');
  const modalContent=document.getElementById('teamModalContent');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  let members=[];
  let currentIndex=0;
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

  function featureMarkup(row,index){
    const nickname=row.nickname||row.name||'INK31';
    const [flag,code]=countryInfo(row.country);
    return `<article class="team-boss-card role-${roleClass(row.role)}">
      <div class="team-boss-photo">${avatar(row)}</div>
      <div class="team-boss-copy">
        <span class="team-boss-kicker">DESTAQUE DO TEAM</span>
        <h2>${esc(nickname)}</h2>
        <strong>${esc(row.role||'BOSS')}</strong>
        <p>${esc(row.bio||'Perfil oficial do Team Lambreta.')}</p>
        <div class="team-boss-meta">
          ${row.country?`<span>${flag} ${code}</span>`:''}
          ${row.main_game?`<span>${esc(row.main_game)}</span>`:''}
          ${row.play_style?`<span>${esc(row.play_style)}</span>`:''}
        </div>
        <button type="button" class="team-open-profile" data-team-index="${index}">Ver perfil completo</button>
      </div>
    </article>`;
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

  function render(){
    if(!grid||!feature) return;
    if(!members.length){
      feature.innerHTML='';
      grid.innerHTML='<article class="team-esports-empty"><h2>Nenhum perfil nesta área</h2></article>';
      return;
    }
    const bossIndex=Math.max(0,members.findIndex(row=>row.is_featured||/boss/i.test(String(row.role||''))||/ink31/i.test(String(row.nickname||row.name||''))));
    const boss=members[bossIndex];
    feature.innerHTML=featureMarkup(boss,bossIndex);
    grid.innerHTML=members.map((row,index)=>index===bossIndex?'':cardMarkup(row,index)).join('');
    bindCards();
  }

  async function load(){
    if(!grid||!feature) return;
    const {data,error}=await sb.from('team_members').select('*').eq('is_published',true).eq('is_archived',false)
      .order('is_featured',{ascending:false}).order('display_order').order('created_at');
    if(error){
      feature.innerHTML='';
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
    sb.channel('team-public-v92').on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh).subscribe();
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
