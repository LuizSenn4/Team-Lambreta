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
    return 'Transmissão';
  }

  function platformIcon(name){
    if(name==='TikTok') return '♪';
    if(name==='Twitch') return '◫';
    if(name==='YouTube') return '▶';
    if(name==='Instagram') return '◎';
    return '↗';
  }

  function socialCards(row){
    const links=[
      ['TikTok',row.tiktok_url,'tiktok'],
      ['Twitch',row.twitch_url,'twitch'],
      ['YouTube',row.youtube_url,'youtube'],
      ['Instagram',row.instagram_url,'instagram']
    ].filter(([,url])=>url);

    if(!links.length) return '';

    return `<div class="ink31-socials premium-socials">
      ${links.map(([name,url,cls])=>`
        <a class="ink31-social ${cls}" href="${esc(url)}" target="_blank" rel="noopener">
          <span>${platformIcon(name)}</span>
          <div><small>${name}</small><strong>${esc(url.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</strong></div>
        </a>`).join('')}
    </div>`;
  }

  function detailCards(row){
    const items=[];
    if(row.game_nickname) items.push(`<div><small>Nick no jogo</small><strong>${esc(row.game_nickname)}</strong></div>`);
    if(row.main_game) items.push(`<div><small>Jogo principal</small><strong>${esc(row.main_game)}</strong></div>`);
    return items.length ? `<div class="ink31-details">${items.join('')}</div>` : '';
  }

  function premiumCard(row,index){
    const live=Boolean(row.force_live||row.manual_live||row.auto_live);
    const watch=row.live_url||row.tiktok_url||row.twitch_url||row.youtube_url||row.instagram_url||'';
    const platform=platformName(row);
    const statusText=live?'AO VIVO':'PERFIL OFICIAL';
    const liveText=live?'Transmissão ativa agora':'Veja quando estiver ao vivo';
    const title=row.title||'STREAMER OFICIAL';

    return `<section class="ink31-featured premium-streamer-section ${row.is_featured?'is-first-dynamic':''}" data-streamer-id="${row.id}">
      <div class="ink31-visual">
        ${row.photo_url
          ? `<img src="${esc(row.photo_url)}" alt="${esc(row.display_name)}" loading="${index===0?'eager':'lazy'}">`
          : `<div class="premium-streamer-placeholder">🎥</div>`}
        <span class="ink31-status ${live?'is-live':''}"><i></i>${statusText}</span>
      </div>

      <div class="ink31-profile-copy">
        <p class="tag">${esc(title)}</p>
        <h2>${esc(row.display_name)}</h2>
        ${row.description?`<p class="ink31-intro">${esc(row.description)}</p>`:''}
        ${detailCards(row)}
        ${socialCards(row)}
      </div>

      <aside class="ink31-live-box">
        <div class="ink31-live-head">
          <div><span class="live-pulse"></span><strong>Área de live</strong></div>
          <small>${esc(platform)}</small>
        </div>

        <div class="ink31-preview">
          ${row.photo_url?`<img src="${esc(row.photo_url)}" alt="Prévia de ${esc(row.display_name)}">`:''}
          <div class="ink31-preview-overlay">
            <span>${esc(row.display_name)}</span>
            <strong>${liveText}</strong>
          </div>
        </div>

        ${watch?`<div class="ink31-actions">
          ${row.allow_embed
            ? `<a class="ink31-watch" href="${esc(watch)}" target="_blank" rel="noopener">▶ Assistir aqui</a>`
            : ''}
          <a class="ink31-open" href="${esc(watch)}" target="_blank" rel="noopener">Abrir ${esc(platform)}</a>
        </div>`:''}

        ${live&&row.allow_live_chat
          ? '<p class="premium-live-chat-note">Chat da live ativado para este streamer.</p>'
          : '<p>O perfil será atualizado conforme as transmissões e redes configuradas no painel.</p>'}
      </aside>
    </section>`;
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
    grid.className='premium-streamers-list';
    grid.innerHTML=rows.length
      ? rows.map(premiumCard).join('')
      : '<article class="empty-card"><h3>Mais streamers em breve</h3><p>Os perfis adicionados pelo painel aparecerão aqui.</p></article>';

    const count=$('streamersCount');
    if(count) count.textContent=String(rows.length+1);
  }

  let refreshTimer = null;

  function scheduleLoad() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(load, 120);
  }

  function startCloudSync() {
    sb.channel('public-streamers-cloud-v85')
      .on('postgres_changes', { event:'*', schema:'public', table:'streamers' }, scheduleLoad)
      .subscribe();

    setInterval(() => {
      if (!document.hidden) load();
    }, 15000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) load();
    });

    window.addEventListener('focus', load);
  }

  async function boot() {
    await load();
    startCloudSync();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
