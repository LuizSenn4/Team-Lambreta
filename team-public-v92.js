(() => {
  'use strict';

  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const grid=document.getElementById('teamRosterGrid');
  const pager=document.getElementById('teamRosterPager');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  let members=[];
  let currentPage=1;
  const PAGE_SIZE=10;

  function avatar(row){
    const label=row.nickname||row.name||'L';
    if(row.image_url) return `<img src="${esc(row.image_url)}" alt="${esc(row.name||label)}" loading="lazy">`;
    return `<span>${esc(label.charAt(0).toUpperCase())}</span>`;
  }

  function countryFlag(country){
    const value=String(country||'').trim().toLowerCase();
    const flags={
      'brasil':'🇧🇷','brazil':'🇧🇷','portugal':'🇵🇹','espanha':'🇪🇸','spain':'🇪🇸',
      'polónia':'🇵🇱','polonia':'🇵🇱','poland':'🇵🇱','frança':'🇫🇷','franca':'🇫🇷','france':'🇫🇷',
      'alemanha':'🇩🇪','germany':'🇩🇪','itália':'🇮🇹','italia':'🇮🇹','italy':'🇮🇹',
      'países baixos':'🇳🇱','paises baixos':'🇳🇱','holanda':'🇳🇱','netherlands':'🇳🇱',
      'reino unido':'🇬🇧','united kingdom':'🇬🇧','inglaterra':'🇬🇧','england':'🇬🇧',
      'estados unidos':'🇺🇸','usa':'🇺🇸','united states':'🇺🇸'
    };
    return flags[value]||'🌍';
  }

  function facts(row){
    return [
      ['Idade',row.age ? `${row.age} anos` : ''],
      ['Jogo',row.main_game],
      ['Modo',row.favorite_mode],
      ['Tipo de armas',row.favorite_weapons],
      ['Estilo',row.play_style],
      ['País',row.country]
    ].filter(([,value])=>value);
  }

  function links(row){
    return [
      ['Instagram',row.instagram_url],
      ['TikTok',row.tiktok_url],
      ['Rede',row.facebook_url]
    ].filter(([,url])=>url);
  }

  function profile(row,index){
    const nickname=row.nickname||row.name||'Membro';
    const identity=row.role||'';
    const nickLength=Math.min(16,Array.from(nickname).length);
    const factMarkup=facts(row).map(([label,value])=>{
      const shown=label==='País'
        ? `<span class="team-country-value"><span aria-hidden="true">${countryFlag(value)}</span>${esc(value)}</span>`
        : esc(value);
      return `<div><small>${esc(label)}</small><strong>${shown}</strong></div>`;
    }).join('');
    const linkMarkup=links(row).map(([label,url])=>
      `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`
    ).join('');

    return `<article class="team-inline-profile ${row.is_featured?'is-featured':''}">
      <div class="team-inline-number">${String(index+1).padStart(2,'0')}</div>
      <div class="team-inline-photo">${avatar(row)}</div>
      <div class="team-inline-copy">
        <h2 title="${esc(nickname)}" style="--nick-length:${nickLength}">${esc(nickname)}</h2>
        ${identity?`<strong class="team-inline-role">${esc(identity)}</strong>`:''}
        ${factMarkup?`<div class="team-inline-facts">${factMarkup}</div>`:''}
        <p class="team-inline-bio">${esc(row.bio||'Perfil oficial do Team Lambreta.')}</p>
        ${linkMarkup?`<div class="team-inline-links">${linkMarkup}</div>`:''}
      </div>
    </article>`;
  }

  function renderPager(totalPages){
    if(!pager) return;
    if(totalPages<=1){ pager.innerHTML=''; pager.hidden=true; return; }
    pager.hidden=false;
    pager.innerHTML=Array.from({length:totalPages},(_,i)=>i+1).map(page=>
      `<button type="button" class="${page===currentPage?'is-active':''}" data-page="${page}">${page}</button>`
    ).join('');
    pager.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
      currentPage=Number(button.dataset.page)||1;
      render();
      document.querySelector('.team-esports-hero')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }

  function render(){
    if(!grid) return;
    const totalPages=Math.max(1,Math.ceil(members.length/PAGE_SIZE));
    if(currentPage>totalPages) currentPage=totalPages;
    const start=(currentPage-1)*PAGE_SIZE;
    const pageRows=members.slice(start,start+PAGE_SIZE);
    grid.innerHTML=pageRows.length
      ? pageRows.map((row,i)=>profile(row,start+i)).join('')
      : `<article class="team-esports-empty"><h2>Nenhum perfil nesta área</h2></article>`;
    renderPager(totalPages);
  }

  async function load(){
    if(!grid) return;
    const {data,error}=await sb.from('team_members').select('*')
      .eq('is_published',true).eq('is_archived',false)
      .order('is_featured',{ascending:false}).order('display_order').order('created_at');
    if(error){
      grid.innerHTML=`<article class="team-esports-empty"><h2>Não foi possível carregar o Team</h2><p>${esc(error.message)}</p></article>`;
      return;
    }
    members=data||[];
    render();
  }

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
