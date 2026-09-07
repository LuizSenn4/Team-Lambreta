(() => {
  'use strict';
  const sb = window.teamSupabase;
  const visualImages = window.TeamVisualImages;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const safeUrl = value => { const raw=String(value||'').trim(); if(!raw)return ''; try { const url=new URL(raw,location.href); return ['http:','https:','blob:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const imageSource=value=>{const raw=String(value||'').trim();if(/^data:image\/webp;base64,/i.test(raw))return raw;return safeUrl(raw);};

  const fallbackStreamer={id:'ink31-static',display_name:'INK31',main_game:'Fortnite',description:'Fundador e streamer do Team Lambreta. Conteúdo focado em Fortnite, comunidade e muita resenha.',photo_url:'img/streamers/ink31-profile-720.webp',slug:'ink31',tiktok_url:'https://www.tiktok.com/@rv3113',twitch_url:'https://www.twitch.tv/oklm31rv',schedule_text:'Terça a Domingo · horários variáveis',force_live:false,manual_live:false,auto_live:false};
  const streamerRows=new Map();
  let homeStreamers=[];
  let activeStreamerIndex=0;

  const isLive=row=>Boolean(row?.force_live||row?.manual_live||row?.auto_live);
  const displayOrder=row=>{const value=Number(row?.display_order);return Number.isFinite(value)?value:999999;};
  const sortStreamerRows=(a,b)=>{
    const liveDiff=Number(isLive(b))-Number(isLive(a));
    if(liveDiff)return liveDiff;
    const featuredDiff=Number(Boolean(b?.is_featured))-Number(Boolean(a?.is_featured));
    if(featuredDiff)return featuredDiff;
    const orderDiff=displayOrder(a)-displayOrder(b);
    if(orderDiff)return orderDiff;
    return String(a?.display_name||'').localeCompare(String(b?.display_name||''),'pt',{sensitivity:'base'});
  };

  const platformIcon=name=>({
    TikTok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4c.4 2.3 1.8 3.7 4 4v3c-1.6 0-2.9-.4-4-1.2v5.7A5.5 5.5 0 1 1 10 10v3.1a2.5 2.5 0 1 0 2 2.4V4z"/></svg>',
    YouTube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12s0-4-1-5-3-1-8-1-7 0-8 1-1 5 0 10c1 1 8 1 8 1s7 0 8-1c1-1 1-5 1-5z"/><path d="m10 9 5 3-5 3z"/></svg>',
    Twitch:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H4V6zM8 6v9h3v2l2-2h4l2-2V6z"/><path d="M12 8v4M16 8v4"/></svg>'
  }[name]||'');
  const platformClass=name=>String(name||'').toLowerCase().replace(/[^a-z]/g,'');
  const platforms=row=>[
    {name:'TikTok',url:row.tiktok_url},
    {name:'YouTube',url:row.youtube_url},
    {name:'Twitch',url:row.twitch_url}
  ].filter(item=>safeUrl(item.url));
  const platformLinks=row=>platforms(row).map(item=>`<a class="home-live-platform platform-${platformClass(item.name)}" href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer" data-platform-label="${esc(item.name)}" title="${esc(item.name)}" aria-label="Abrir ${esc(item.name)} de ${esc(row.display_name||'streamer')}">${platformIcon(item.name)}<span class="sr-only">${esc(item.name)}</span></a>`).join('');

  const modes=row=>Array.isArray(row.game_mode)?row.game_mode.join(' · '):Array.isArray(row.modes)?row.modes.join(' · '):(row.game_mode||row.mode||'');
  const schedule=row=>{
    if(isLive(row))return 'AO VIVO AGORA';
    if(row.schedule_text)return String(row.schedule_text);
    const first=Array.isArray(row.schedule_json)?row.schedule_json.find(item=>!item.is_off):null;
    if(!first)return 'Horário em atualização';
    const days={monday:'Seg',tuesday:'Ter',wednesday:'Qua',thursday:'Qui',friday:'Sex',saturday:'Sáb',sunday:'Dom'};
    return `${days[first.start_day]||first.date||''}${first.start_time?` · ${first.start_time}`:''}`.trim();
  };

  const statusMarkup=row=>isLive(row)
    ? '<span class="home-live-status is-live"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><b>AO VIVO</b></span>'
    : '<span class="home-live-status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><b>PRÓXIMA LIVE</b></span>';

  const liveCard=row=>{
    const homeImage=imageSource(row.home_card_photo_url)||imageSource(row.photo_url);
    const gameMode=modes(row);
    const socials=platformLinks(row);
    return `<article class="home-live-card" data-watch-streamer="${esc(row.id)}" role="button" tabindex="0" aria-label="Ver opções para ${esc(row.display_name||'streamer')}">
      <span class="home-live-visual">${homeImage?`<img src="${esc(homeImage)}" alt="${esc(row.display_name||'Streamer')}" loading="lazy" decoding="async" width="480" height="320">`:'<span class="home-live-placeholder tl-image-skeleton" aria-hidden="true"></span>'}</span>
      <span class="home-live-copy">
        <span class="home-live-toolbar">${statusMarkup(row)}<button class="home-live-next" type="button" data-live-next aria-label="Mostrar próximo streamer" title="Próximo streamer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 5 8 7-8 7z"/><path d="M17 5v14"/></svg></button></span>
        <span class="home-live-heading"><strong>${esc(row.display_name||'Streamer')}</strong><time>${esc(schedule(row))}</time></span>
        <span class="home-live-meta"><b>${esc(row.main_game||'Jogo em atualização')}</b>${gameMode?`<span>${esc(gameMode)}</span>`:''}</span>
        ${socials?`<span class="home-live-platforms" aria-label="Redes sociais">${socials}</span>`:''}
        <span class="home-live-description">${esc(row.description||'Streamer oficial da comunidade Team Lambreta.')}</span>
      </span>
    </article>`;
  };

  const watchModal=document.getElementById('homeStreamerWatchModal');
  let watchReturnFocus=null;
  function openWatch(row,trigger){
    if(!watchModal)return;
    const available=platforms(row);
    watchReturnFocus=trigger;
    document.getElementById('homeWatchTitle').textContent=`Onde quer assistir ${row.display_name||'este streamer'}?`;
    document.getElementById('homeWatchPlatforms').innerHTML=available.length?available.map(item=>`<a class="platform-${platformClass(item.name)}" href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer" aria-label="Assistir ${esc(row.display_name||'streamer')} no ${esc(item.name)}">${platformIcon(item.name)}<span>${esc(item.name)}</span></a>`).join(''):'<span class="home-watch-empty">Plataformas externas em atualização.</span>';
    const internal=document.getElementById('homeWatchInternal');
    internal.href=safeUrl(row.live_page_url)||`live.html?streamer=${encodeURIComponent(row.id)}`;
    watchModal.hidden=false;document.body.classList.add('home-watch-open');
    requestAnimationFrame(()=>watchModal.querySelector('[data-watch-close]')?.focus());
  }
  function closeWatch(){if(!watchModal)return;watchModal.hidden=true;document.body.classList.remove('home-watch-open');watchReturnFocus?.focus?.();}
  watchModal?.querySelectorAll('[data-watch-close]').forEach(button=>button.addEventListener('click',closeWatch));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&watchModal&&!watchModal.hidden)closeWatch();});

  function renderActiveStreamer(){
    const grid=document.getElementById('homeLiveGrid');
    if(!grid)return;
    if(!homeStreamers.length){grid.innerHTML='<article class="home-empty-card"><strong>Próximas lives</strong><span>A programação será publicada aqui.</span></article>';return;}
    activeStreamerIndex=((activeStreamerIndex%homeStreamers.length)+homeStreamers.length)%homeStreamers.length;
    grid.innerHTML=liveCard(homeStreamers[activeStreamerIndex]);
  }
  function showNextStreamer(){if(homeStreamers.length<2)return;activeStreamerIndex=(activeStreamerIndex+1)%homeStreamers.length;renderActiveStreamer();}

  const liveGrid=document.getElementById('homeLiveGrid');
  liveGrid?.addEventListener('click',event=>{
    if(event.target.closest('[data-live-next]')){event.preventDefault();event.stopPropagation();showNextStreamer();return;}
    if(event.target.closest('.home-live-platform'))return;
    const card=event.target.closest('[data-watch-streamer]');
    if(!card)return;
    const row=streamerRows.get(String(card.dataset.watchStreamer));
    if(row)openWatch(row,card);
  });
  liveGrid?.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key)||event.target.closest('a,button'))return;
    const card=event.target.closest('[data-watch-streamer]');
    if(!card)return;
    event.preventDefault();
    const row=streamerRows.get(String(card.dataset.watchStreamer));
    if(row)openWatch(row,card);
  });

  function paintStreamers(rows){
    streamerRows.clear();
    homeStreamers=[...rows];
    homeStreamers.forEach(row=>streamerRows.set(String(row.id),row));
    if(activeStreamerIndex>=homeStreamers.length)activeStreamerIndex=0;
    renderActiveStreamer();
  }
  async function loadStreamers(){
    let rows=[];
    if(sb){const result=await sb.from('streamers').select('*').eq('is_published',true).eq('is_archived',false);if(!result.error)rows=result.data||[];}
    if(!rows.some(row=>String(row.display_name).toLowerCase()==='ink31'))rows.push(fallbackStreamer);
    rows=rows.sort(sortStreamerRows).slice(0,6);
    visualImages?.writeCollection?.('home-streamers',rows);
    paintStreamers(rows);
  }
  async function loadForum(){if(!sb)return;const result=await sb.from('forum_topics').select('title,last_activity_at').order('last_activity_at',{ascending:false}).limit(1).maybeSingle();if(result.data?.title)document.getElementById('homeForumSummary').textContent=`Tópico em destaque: ${result.data.title}`;}
  async function loadUpdates(){if(!sb)return;const result=await sb.from('site_updates').select('title,summary').eq('is_published',true).order('published_at',{ascending:false}).limit(1).maybeSingle();if(result.data){document.getElementById('homeUpdateTitle').textContent=result.data.title||'Novidades Team Lambreta';document.getElementById('homeUpdateSummary').textContent=result.data.summary||'Acompanha as mudanças mais recentes do site.';}}
  function loadEvents(){let rows=[];try{rows=JSON.parse(localStorage.getItem('team_lambreta_data_v1')||'{}').events||[];}catch{}if(!rows.length)return;document.getElementById('homeEventsGrid').innerHTML=rows.slice(0,3).map(row=>`<article class="home-event-card"><time>${esc(row.date||'DATA A DEFINIR')}</time><h3>${esc(row.title||'Evento Team Lambreta')}</h3><p>${esc(row.description||'Mais informações em breve.')}</p></article>`).join('');}
  async function loadSessionContent(){if(!sb)return;const session=await window.TeamAuth?.getSession?.();if(session)await Promise.allSettled([loadForum(),loadUpdates()]);}

  const cachedStreamers=visualImages?.readCollection?.('home-streamers');
  if(cachedStreamers?.length)paintStreamers(cachedStreamers);
  Promise.allSettled([loadStreamers(),loadSessionContent()]);
  loadEvents();
})();
