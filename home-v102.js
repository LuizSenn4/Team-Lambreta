(() => {
  'use strict';
  const sb = window.teamSupabase;
  const visualImages = window.TeamVisualImages;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const safeUrl = value => { const raw=String(value||'').trim(); if(!raw)return ''; try { const url=new URL(raw,location.href); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  // A Home pública aceita URLs estáveis; data URLs históricas ficam preservadas
  // no banco, mas não são renderizadas. O novo Admin grava no Storage.
  const imageSource=value=>safeUrl(value);

  const hero = document.getElementById('homeHero');
  const slides = [...hero.querySelectorAll('[data-slide]')];
  const dots = [...hero.querySelectorAll('[data-hero-dot]')];
  let index = 0;
  let timer = null;
  const show = next => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden=i!==index; slide.classList.toggle('is-active',i===index); });
    dots.forEach((dot, i) => dot.classList.toggle('is-active',i===index));
  };
  const restart = () => { clearInterval(timer); timer=setInterval(()=>show(index+1),7000); };
  hero.querySelector('[data-hero-prev]').addEventListener('click',()=>{show(index-1);restart();});
  hero.querySelector('[data-hero-next]').addEventListener('click',()=>{show(index+1);restart();});
  dots.forEach(dot=>dot.addEventListener('click',()=>{show(Number(dot.dataset.heroDot));restart();}));
  let touchX=0;
  hero.addEventListener('touchstart',event=>{touchX=event.touches[0]?.clientX||0;},{passive:true});
  hero.addEventListener('touchend',event=>{const delta=(event.changedTouches[0]?.clientX||0)-touchX;if(Math.abs(delta)>45){show(index+(delta<0?1:-1));restart();}},{passive:true});
  restart();

  const fallbackStreamer={id:'ink31-static',display_name:'INK31',main_game:'Fortnite',description:'Fundador e streamer do Team Lambreta. Conteúdo focado em Fortnite, comunidade e muita resenha.',photo_url:'img/streamers/ink31-profile.jpg',slug:'ink31',tiktok_url:'https://www.tiktok.com/@rv3113',twitch_url:'https://www.twitch.tv/oklm31rv',schedule_text:'Terça a Domingo · horários variáveis',force_live:false,manual_live:false,auto_live:false};
  const streamerRows=new Map();
  const slug=row=>String(row.slug||row.tiktok_username||row.display_name||row.id||'streamer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const platformIcon=name=>({
    TikTok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4c.4 2.3 1.8 3.7 4 4v3c-1.6 0-2.9-.4-4-1.2v5.7A5.5 5.5 0 1 1 10 10v3.1a2.5 2.5 0 1 0 2 2.4V4z"/></svg>',
    Twitch:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H4V6zM8 6v9h3v2l2-2h4l2-2V6z"/><path d="M12 8v4M16 8v4"/></svg>',
    YouTube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12s0-4-1-5-3-1-8-1-7 0-8 1-1 5 0 10c1 1 8 1 8 1s7 0 8-1c1-1 1-5 1-5z"/><path d="m10 9 5 3-5 3z"/></svg>',
    Instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r=".7"/></svg>'
  }[name]||'');
  const platforms=row=>[
    {name:'TikTok',url:row.tiktok_url},{name:'Twitch',url:row.twitch_url},{name:'YouTube',url:row.youtube_url},{name:'Instagram',url:row.instagram_url}
  ].filter(item=>safeUrl(item.url)).slice(0,3);
  const modes=row=>Array.isArray(row.game_mode)?row.game_mode.join(' · '):Array.isArray(row.modes)?row.modes.join(' · '):(row.game_mode||row.mode||'');
  const schedule=row=>{
    if(row.force_live||row.manual_live||row.auto_live)return 'AO VIVO AGORA';
    if(row.schedule_text)return row.schedule_text;
    const first=Array.isArray(row.schedule_json)?row.schedule_json.find(item=>!item.is_off):null;
    if(!first)return 'Horário em atualização';
    const days={monday:'Seg',tuesday:'Ter',wednesday:'Qua',thursday:'Qui',friday:'Sex',saturday:'Sáb',sunday:'Dom'};
    return `${days[first.start_day]||first.date||''}${first.start_time?` · ${first.start_time}`:''}`.trim();
  };
  const platformClass=name=>String(name||'').toLowerCase().replace(/[^a-z]/g,'');
  const platformButtons=row=>platforms(row).map(item=>`<span class="home-live-platform platform-${platformClass(item.name)}" data-platform-label="${esc(item.name)}" title="${esc(item.name)}">${platformIcon(item.name)}<span class="sr-only">${esc(item.name)}</span></span>`).join('');
  const liveCard=row=>{
    const live=Boolean(row.force_live||row.manual_live||row.auto_live);
    const homeImage=imageSource(row.home_card_photo_url)||imageSource(row.photo_url);
    const gameMode=modes(row);
    return `<button class="home-live-card" type="button" data-watch-streamer="${esc(row.id)}"><span class="home-live-visual">${homeImage?`<img src="${esc(homeImage)}" alt="" loading="eager" decoding="async">`:'<span class="home-live-placeholder tl-image-skeleton" aria-hidden="true"></span>'}<span class="home-live-status">${live?'● AO VIVO':'PRÓXIMA LIVE'}</span></span><span class="home-live-copy"><span class="home-live-heading"><strong>${esc(row.display_name||'Streamer')}</strong><time>${esc(schedule(row))}</time></span><span class="home-live-meta"><b>${esc(row.main_game||'Jogo em atualização')}</b>${gameMode?`<span>${esc(gameMode)}</span>`:''}</span><span class="home-live-platforms">${platformButtons(row)}</span><span class="home-live-description">${esc(row.description||'Streamer oficial da comunidade Team Lambreta.')}</span></span></button>`;
  };
  const placeholderLive=position=>`<article class="home-live-card is-placeholder"><span class="home-live-visual"><span class="home-live-placeholder">${String(position).padStart(2,'0')}</span><span class="home-live-status">EM BREVE</span></span><span class="home-live-copy"><span class="home-live-heading"><strong>Próxima live</strong><time>Agenda</time></span><span class="home-live-meta"><b>Jogo em atualização</b></span><span class="home-live-description">A programação será publicada aqui.</span></span></article>`;

  const watchModal=document.getElementById('homeStreamerWatchModal');
  let watchReturnFocus=null;
  function openWatch(row,trigger){
    const available=platforms(row);
    watchReturnFocus=trigger;
    document.getElementById('homeWatchTitle').textContent=`Onde quer assistir ${row.display_name||'este streamer'}?`;
    document.getElementById('homeWatchPlatforms').innerHTML=available.length?available.map(item=>`<a class="platform-${platformClass(item.name)}" href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer" aria-label="Assistir ${esc(row.display_name||'streamer')} no ${esc(item.name)}">${platformIcon(item.name)}<span>${esc(item.name)}</span></a>`).join(''):'<span class="home-watch-empty">Plataformas externas em atualização.</span>';
    const internal=document.getElementById('homeWatchInternal');
    internal.href=safeUrl(row.live_page_url)||`live.html?streamer=${encodeURIComponent(row.id)}`;
    watchModal.hidden=false;document.body.classList.add('home-watch-open');
    requestAnimationFrame(()=>watchModal.querySelector('[data-watch-close]')?.focus());
  }
  function closeWatch(){watchModal.hidden=true;document.body.classList.remove('home-watch-open');watchReturnFocus?.focus?.();}
  watchModal.querySelectorAll('[data-watch-close]').forEach(button=>button.addEventListener('click',closeWatch));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!watchModal.hidden)closeWatch();});
  document.getElementById('homeLiveGrid').addEventListener('click',event=>{const button=event.target.closest('[data-watch-streamer]');if(!button)return;const row=streamerRows.get(button.dataset.watchStreamer);if(row)openWatch(row,button);});

  async function paintStreamers(rows){
    await visualImages?.preloadAll?.(rows.map(row=>imageSource(row.home_card_photo_url)||imageSource(row.photo_url)));
    streamerRows.clear();rows.forEach(row=>streamerRows.set(String(row.id),row));
    document.getElementById('homeLiveGrid').innerHTML=rows.map(liveCard).join('')+Array.from({length:3-rows.length},(_,i)=>placeholderLive(rows.length+i+1)).join('');
  }
  async function loadStreamers(){
    let rows=[];
    if(sb){const result=await sb.from('streamers').select('*').eq('is_published',true).eq('is_archived',false).order('is_featured',{ascending:false}).order('display_order',{ascending:true}).limit(3);if(!result.error)rows=result.data||[];}
    if(!rows.some(row=>String(row.display_name).toLowerCase()==='ink31'))rows.unshift(fallbackStreamer);
    rows=rows.slice(0,3);visualImages?.writeCollection?.('home-streamers',rows);await paintStreamers(rows);
  }
  async function loadForum(){if(!sb)return;const result=await sb.from('forum_topics').select('title,last_activity_at').order('last_activity_at',{ascending:false}).limit(1).maybeSingle();if(result.data?.title)document.getElementById('homeForumSummary').textContent=`Tópico em destaque: ${result.data.title}`;}
  async function loadUpdates(){if(!sb)return;const result=await sb.from('site_updates').select('title,summary').eq('is_published',true).order('published_at',{ascending:false}).limit(1).maybeSingle();if(result.data){document.getElementById('homeUpdateTitle').textContent=result.data.title||'Novidades Team Lambreta';document.getElementById('homeUpdateSummary').textContent=result.data.summary||'Acompanha as mudanças mais recentes do site.';}}
  function loadEvents(){let rows=[];try{rows=JSON.parse(localStorage.getItem('team_lambreta_data_v1')||'{}').events||[];}catch{}if(!rows.length)return;document.getElementById('homeEventsGrid').innerHTML=rows.slice(0,3).map(row=>`<article class="home-event-card"><time>${esc(row.date||'DATA A DEFINIR')}</time><h3>${esc(row.title||'Evento Team Lambreta')}</h3><p>${esc(row.description||'Mais informações em breve.')}</p></article>`).join('');}
  async function loadSessionContent(){
    if(!sb)return;
    const {data}=await sb.auth.getSession();
    if(data.session)await Promise.allSettled([loadForum(),loadUpdates()]);
  }
  const cachedStreamers=visualImages?.readCollection?.('home-streamers');
  if(cachedStreamers?.length)void paintStreamers(cachedStreamers);
  Promise.allSettled([loadStreamers(),loadSessionContent()]);loadEvents();
})();
