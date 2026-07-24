(() => {
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const $=id=>document.getElementById(id);
  let allRows=[];
  let currentPage=1;
  const PAGE_SIZE=5;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function platformName(row){
    if(row.live_platform==='tiktok') return 'TikTok';
    if(row.live_platform==='twitch') return 'Twitch';
    if(row.live_platform==='youtube') return 'YouTube';
    return 'Live';
  }

  function platformClass(name){
    const value=String(name||'').toLowerCase();
    if(value.includes('tiktok')) return 'tiktok';
    if(value.includes('twitch')) return 'twitch';
    if(value.includes('youtube')) return 'youtube';
    if(value.includes('instagram')) return 'instagram';
    return 'other';
  }

  function platformIcon(name){
    const value=platformClass(name);
    return value==='tiktok'?'♪':value==='twitch'?'◫':value==='youtube'?'▶':value==='instagram'?'◎':'↗';
  }

  function socialData(row){
    return [
      ['TikTok',row.tiktok_url],
      ['Twitch',row.twitch_url],
      ['YouTube',row.youtube_url],
      ['Instagram',row.instagram_url]
    ].filter(([,url])=>url);
  }

  function nameMarkup(name){
    const clean=String(name||'STREAMER');
    const match=clean.match(/^(.*?)(\d+)$/);
    return match ? `${esc(match[1])}<span>${esc(match[2])}</span>` : esc(clean);
  }

  function card(row,index){
    const live=Boolean(row.force_live||row.manual_live||row.auto_live);
    const watch=row.live_url||row.tiktok_url||row.twitch_url||row.youtube_url||row.instagram_url||'';
    const secondary=[row.twitch_url,row.youtube_url,row.instagram_url,row.tiktok_url].find(url=>url&&url!==watch)||'';
    const title=row.title||'STREAMER OFICIAL';
    const photo=row.photo_url||'';
    const socials=socialData(row);
    const tone=index%2===0?'green':'red';

    return `<article class="ink31-featured premium-streamer-card tone-${tone} ${row.is_featured?'is-featured':''}" data-streamer-id="${esc(row.id)}">
      <div class="ink31-visual">
        ${photo?`<img src="${esc(photo)}" alt="${esc(row.display_name)}" loading="${index===0?'eager':'lazy'}">`:`<div class="premium-streamer-placeholder">🎥</div>`}
        <span class="ink31-status ${live?'is-live':''}"><i></i>${live?'AO VIVO':'PERFIL OFICIAL'}</span>
      </div>

      <div class="ink31-profile-copy">
        <p class="tag">${esc(title)}</p>
        <h2>${nameMarkup(row.display_name)}</h2>
        ${row.description?`<p class="ink31-intro">${esc(row.description)}</p>`:''}

        ${(row.game_nickname||row.main_game)?`<div class="ink31-details">
          ${row.game_nickname?`<div><small>Nick no jogo</small><strong>${esc(row.game_nickname)}</strong></div>`:''}
          ${row.main_game?`<div><small>Jogo principal</small><strong>${esc(row.main_game)}</strong></div>`:''}
        </div>`:''}

        ${socials.length?`<div class="ink31-socials premium-socials">${socials.map(([name,url])=>{
          const cls=platformClass(name);
          return `<a class="ink31-social ${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>${platformIcon(name)}</span><div><small>${esc(name)}</small><strong>${esc((row.display_name||name))}</strong></div></a>`;
        }).join('')}</div>`:''}
      </div>

      <aside class="ink31-live-box">
        <div class="ink31-live-head"><div><span class="live-pulse"></span><strong>Área de live</strong></div><small>${socials.slice(0,2).map(([name])=>esc(name)).join(' • ')||esc(platformName(row))}</small></div>
        <div class="ink31-preview">
          ${photo?`<img src="${esc(photo)}" alt="Prévia do canal de ${esc(row.display_name)}">`:`<div class="premium-streamer-placeholder">🎥</div>`}
          <div class="ink31-preview-overlay"><span>${esc(row.display_name||'STREAMER')}</span><strong>${live?'Está ao vivo agora':'Veja quando estiver ao vivo'}</strong></div>
        </div>
        <div class="ink31-actions">
          ${watch?`<a class="ink31-watch" href="${esc(watch)}" target="_blank" rel="noopener noreferrer">▶ ${live?'Assistir agora':'Abrir '+esc(platformName(row))}</a>`:''}
          ${secondary?`<a class="ink31-open" href="${esc(secondary)}" target="_blank" rel="noopener noreferrer">Abrir outra rede</a>`:''}
        </div>
        <p>O player dentro do site será ativado quando concluirmos a integração oficial das lives.</p>
      </aside>
    </article>`;
  }

  function renderPage(){
    const grid=$('streamersPublicGrid');
    const pager=$('streamersPublicPager');
    if(!grid) return;
    const totalPages=Math.max(1,Math.ceil(allRows.length/PAGE_SIZE));
    if(currentPage>totalPages) currentPage=totalPages;
    const start=(currentPage-1)*PAGE_SIZE;
    const pageRows=allRows.slice(start,start+PAGE_SIZE);
    grid.innerHTML=pageRows.length
      ? pageRows.map((row,index)=>card(row,start+index)).join('')
      : '<article class="empty-card"><h3>Mais streamers em breve</h3><p>Os perfis adicionados pelo painel aparecerão aqui.</p></article>';
    if(!pager) return;
    if(totalPages<=1){pager.hidden=true;pager.innerHTML='';return;}
    pager.hidden=false;
    pager.innerHTML=Array.from({length:totalPages},(_,i)=>i+1).map(page=>`<button type="button" data-page="${page}" class="${page===currentPage?'is-active':''}">${page}</button>`).join('');
    pager.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{
      currentPage=Number(button.dataset.page)||1;
      renderPage();
      document.querySelector('.team-category-block')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  async function load(){
    const grid=$('streamersPublicGrid');
    if(!grid) return;
    const {data,error}=await sb.from('streamers').select('*').eq('is_published',true).eq('is_archived',false)
      .order('is_featured',{ascending:false}).order('display_order',{ascending:true}).order('created_at',{ascending:true});
    if(error){grid.innerHTML=`<article class="empty-card"><h3>Streamers</h3><p>${esc(error.message)}</p></article>`;return;}
    allRows=data||[];
    renderPage();
    const count=$('streamersCount');if(count)count.textContent=String(allRows.length+1);
  }

  let refreshTimer=null;
  const scheduleLoad=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(load,120)};
  function startCloudSync(){
    sb.channel('public-streamers-cloud-v86').on('postgres_changes',{event:'*',schema:'public',table:'streamers'},scheduleLoad).subscribe();
    setInterval(()=>{if(!document.hidden)load()},15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
    window.addEventListener('focus',load);
  }
  async function boot(){await load();startCloudSync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
