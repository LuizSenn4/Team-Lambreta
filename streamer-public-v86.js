(() => {
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function platformName(row){
    if(row.live_platform==='tiktok') return 'TikTok';
    if(row.live_platform==='twitch') return 'Twitch';
    if(row.live_platform==='youtube') return 'YouTube';
    return 'Live';
  }

  function socialLinks(row){
    const links=[
      ['♪ TikTok',row.tiktok_url],
      ['◫ Twitch',row.twitch_url],
      ['▶ YouTube',row.youtube_url],
      ['◎ Instagram',row.instagram_url]
    ].filter(([,url])=>url);
    return links.length ? `<div class="streamer-card-links">${links.map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener">${name}</a>`).join('')}</div>` : '';
  }

  function card(row,index){
    const live=Boolean(row.force_live||row.manual_live||row.auto_live);
    const watch=row.live_url||row.tiktok_url||row.twitch_url||row.youtube_url||row.instagram_url||'';
    const title=row.title||'STREAMER OFICIAL';

    return `<article class="streamer-profile-card ${row.is_featured?'is-featured':''}" data-streamer-id="${esc(row.id)}">
      <div class="streamer-card-photo">
        ${row.photo_url
          ? `<img src="${esc(row.photo_url)}" alt="${esc(row.display_name)}" loading="${index===0?'eager':'lazy'}">`
          : `<div class="streamer-card-placeholder">🎥</div>`}
        <span class="streamer-card-status ${live?'is-live':''}"><i></i>${live?'AO VIVO':'PERFIL OFICIAL'}</span>
      </div>

      <div class="streamer-card-body">
        <p class="tag">${esc(title)}</p>
        <h2>${esc(row.display_name)}</h2>
        ${row.description?`<p class="streamer-card-bio">${esc(row.description)}</p>`:''}

        ${(row.game_nickname||row.main_game)?`<div class="streamer-card-meta">
          ${row.game_nickname?`<div><small>Nick no jogo</small><strong>${esc(row.game_nickname)}</strong></div>`:''}
          ${row.main_game?`<div><small>Jogo principal</small><strong>${esc(row.main_game)}</strong></div>`:''}
        </div>`:''}

        ${socialLinks(row)}
        ${watch?`<a class="streamer-card-live" href="${esc(watch)}" target="_blank" rel="noopener">${live?'● Assistir agora':'Abrir '+esc(platformName(row))}</a>`:''}
      </div>
    </article>`;
  }

  async function load(){
    const grid=$('streamersPublicGrid');
    if(!grid) return;

    const {data,error}=await sb.from('streamers')
      .select('*')
      .eq('is_published',true)
      .eq('is_archived',false)
      .order('is_featured',{ascending:false})
      .order('display_order',{ascending:true})
      .order('created_at',{ascending:true});

    if(error){
      grid.innerHTML=`<article class="empty-card"><h3>Streamers</h3><p>${esc(error.message)}</p></article>`;
      return;
    }

    const rows=data||[];
    grid.innerHTML=rows.length
      ? rows.map(card).join('')
      : '<article class="empty-card"><h3>Mais streamers em breve</h3><p>Os perfis adicionados pelo painel aparecerão aqui.</p></article>';

    const count=$('streamersCount');
    if(count) count.textContent=String(rows.length+1);
  }

  let refreshTimer=null;
  const scheduleLoad=()=>{ clearTimeout(refreshTimer); refreshTimer=setTimeout(load,120); };

  function startCloudSync(){
    sb.channel('public-streamers-cloud-v86')
      .on('postgres_changes',{event:'*',schema:'public',table:'streamers'},scheduleLoad)
      .subscribe();
    setInterval(()=>{ if(!document.hidden) load(); },15000);
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) load(); });
    window.addEventListener('focus',load);
  }

  async function boot(){ await load(); startCloudSync(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
