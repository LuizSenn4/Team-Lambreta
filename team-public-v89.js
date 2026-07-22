(() => {
  'use strict';

  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  let members=[];
  let currentFilter='all';

  function avatarMarkup(row, large=false){
    const label=row.nickname||row.name||'L';
    if(row.image_url){
      return `<img src="${esc(row.image_url)}" alt="${esc(row.name||label)}">`;
    }
    return `<span class="${large?'is-large':''}">${esc(label.charAt(0).toUpperCase())}</span>`;
  }

  function facts(row){
    return [
      ['Idade',row.age ? `${row.age} anos` : ''],
      ['Jogo',row.main_game],
      ['Modo',row.favorite_mode],
      ['Armas',row.favorite_weapons],
      ['Estilo',row.play_style],
      ['País',row.country]
    ].filter(([,value])=>value);
  }

  function card(row,index){
    const nickname=row.nickname||row.name||'Membro';
    const preview=[
      row.main_game,
      row.favorite_mode,
      row.favorite_weapons
    ].filter(Boolean).join(' • ');

    return `<article class="team-esports-card ${row.is_featured?'is-featured':''}"
      tabindex="0" data-team-id="${row.id}">
      <div class="team-esports-number">${String(index+1).padStart(2,'0')}</div>
      <div class="team-esports-card-photo">${avatarMarkup(row)}</div>
      <div class="team-esports-card-body">
        <small>${esc(row.member_group||'Team')}</small>
        <h2>${esc(nickname)}</h2>
        ${row.role?`<strong>${esc(row.role)}</strong>`:''}
        ${row.main_game?`<span class="team-esports-game">${esc(row.main_game)}</span>`:''}
        ${preview?`<p>${esc(preview)}</p>`:''}
        <button type="button" data-open-profile="${row.id}">Abrir perfil</button>
      </div>
    </article>`;
  }

  function render(){
    const grid=$('teamRosterGrid');
    if(!grid) return;

    const filtered=members.filter(row=>
      currentFilter==='all' || row.member_group===currentFilter
    );

    grid.innerHTML=filtered.length
      ? filtered.map(card).join('')
      : `<article class="team-esports-empty"><h2>Nenhum perfil nesta área</h2></article>`;

    grid.querySelectorAll('[data-team-id]').forEach(element=>{
      const row=members.find(item=>item.id===element.dataset.teamId);
      if(!row) return;

      element.addEventListener('mouseenter',event=>showPreview(row,event.currentTarget));
      element.addEventListener('mouseleave',hidePreview);
      element.addEventListener('focus',event=>showPreview(row,event.currentTarget));
      element.addEventListener('blur',hidePreview);
      element.addEventListener('click',event=>{
        if(event.target.closest('[data-open-profile]')) openProfile(row);
      });
    });
  }

  function showPreview(row,anchor){
    if(matchMedia('(hover:none)').matches) return;
    const preview=$('teamQuickPreview');
    if(!preview) return;
    preview.querySelector('.team-quick-preview-photo').innerHTML=avatarMarkup(row);
    preview.querySelector('strong').textContent=row.nickname||row.name||'Membro';
    preview.querySelector('span').textContent=row.role||row.member_group||'Team';
    preview.querySelector('p').textContent=[
      row.favorite_mode,row.favorite_weapons,row.play_style
    ].filter(Boolean).join(' • ');

    const rect=anchor.getBoundingClientRect();
    preview.hidden=false;
    const width=preview.offsetWidth;
    let left=rect.right+12;
    if(left+width>innerWidth-12) left=Math.max(12,rect.left-width-12);
    preview.style.left=`${left}px`;
    preview.style.top=`${Math.max(12,Math.min(innerHeight-preview.offsetHeight-12,rect.top+30))}px`;
  }

  function hidePreview(){
    const preview=$('teamQuickPreview');
    if(preview) preview.hidden=true;
  }

  function safeLink(url){
    return url || '';
  }

  function openProfile(row){
    hidePreview();
    const modal=$('teamProfileModal');
    if(!modal) return;

    modal.querySelector('.team-esports-profile-photo').innerHTML=avatarMarkup(row,true);
    $('teamProfileName').textContent=row.nickname||row.name||'Membro';
    $('teamProfileRole').textContent=[row.role,row.name&&row.nickname?row.name:''].filter(Boolean).join(' • ');

    $('teamProfileFacts').innerHTML=facts(row).map(([label,value])=>
      `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`
    ).join('');

    $('teamProfileBio').textContent=row.bio||'Perfil oficial do Team Lambreta.';

    const links=[
      ['Instagram',safeLink(row.instagram_url)],
      ['TikTok',safeLink(row.tiktok_url)],
      ['Rede',safeLink(row.facebook_url)]
    ].filter(([,url])=>url);

    $('teamProfileLinks').innerHTML=links.map(([label,url])=>
      `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`
    ).join('');

    modal.hidden=false;
    document.body.classList.add('team-modal-open');
    modal.querySelector('.team-esports-close')?.focus();
  }

  function closeProfile(){
    const modal=$('teamProfileModal');
    if(modal) modal.hidden=true;
    document.body.classList.remove('team-modal-open');
  }

  async function load(){
    const grid=$('teamRosterGrid');
    if(!grid) return;

    const {data,error}=await sb.from('team_members').select('*')
      .eq('is_published',true)
      .eq('is_archived',false)
      .order('is_featured',{ascending:false})
      .order('display_order')
      .order('created_at');

    if(error){
      grid.innerHTML=`<article class="team-esports-empty"><h2>Não foi possível carregar o Team</h2><p>${esc(error.message)}</p></article>`;
      return;
    }

    members=data||[];
    render();
  }

  document.querySelectorAll('[data-team-filter]').forEach(button=>{
    button.addEventListener('click',()=>{
      currentFilter=button.dataset.teamFilter;
      document.querySelectorAll('[data-team-filter]').forEach(item=>
        item.classList.toggle('is-active',item===button)
      );
      render();
    });
  });

  document.querySelectorAll('[data-team-close]').forEach(button=>
    button.addEventListener('click',closeProfile)
  );

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape') closeProfile();
  });

  let timer=null;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(load,120);};

  async function boot(){
    await load();
    sb.channel('team-public-v89')
      .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh)
      .subscribe();
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
