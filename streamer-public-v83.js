(() => {
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function social(row){
    const links=[
      ['TikTok',row.tiktok_url],['Twitch',row.twitch_url],
      ['YouTube',row.youtube_url],['Instagram',row.instagram_url]
    ].filter(([,url])=>url);
    return links.map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener">${name}</a>`).join('');
  }

  function card(row){
    const live=row.force_live||row.manual_live||row.auto_live;
    const watch=row.live_url||row.tiktok_url||row.twitch_url||row.youtube_url;
    return `<article class="dynamic-streamer-card ${row.is_featured?'featured':''}">
      <div class="dynamic-streamer-photo">
        ${row.photo_url?`<img src="${esc(row.photo_url)}" alt="${esc(row.display_name)}">`:'<div class="dynamic-streamer-placeholder">🎥</div>'}
        ${live?'<span class="dynamic-live-badge">● AO VIVO</span>':''}
      </div>
      <div class="dynamic-streamer-copy">
        ${row.title?`<p class="tag">${esc(row.title)}</p>`:''}
        <h3>${esc(row.display_name)}</h3>
        ${row.description?`<p>${esc(row.description)}</p>`:''}
        <div class="dynamic-streamer-details">
          ${row.game_nickname?`<span><small>Nick no jogo</small><strong>${esc(row.game_nickname)}</strong></span>`:''}
          ${row.main_game?`<span><small>Jogo principal</small><strong>${esc(row.main_game)}</strong></span>`:''}
        </div>
        <div class="dynamic-streamer-socials">${social(row)}</div>
        ${live&&watch?`<div class="dynamic-streamer-live-actions">
          ${row.allow_embed?`<a href="${esc(watch)}" target="_blank" rel="noopener">▶ Assistir aqui</a>`:''}
          <a href="${esc(watch)}" target="_blank" rel="noopener">Abrir transmissão</a>
        </div>`:''}
        ${live&&row.allow_live_chat?'<small class="dynamic-chat-ready">Chat da live ativado</small>':''}
      </div>
    </article>`;
  }

  async function load(){
    const grid=$('streamersPublicGrid');
    if(!grid) return;
    const {data,error}=await sb.from('streamers').select('*')
      .eq('is_published',true).eq('is_archived',false)
      .order('is_featured',{ascending:false}).order('display_order').order('created_at');
    if(error){ grid.innerHTML=`<article class="empty-card"><h3>Streamers</h3><p>${esc(error.message)}</p></article>`; return; }
    const rows=data||[];
    grid.classList.add('dynamic-streamers-grid');
    grid.innerHTML=rows.length?rows.map(card).join(''):'<article class="empty-card"><h3>Mais streamers em breve</h3><p>Os perfis adicionados pelo painel aparecerão aqui.</p></article>';
    const count=$('streamersCount');
    if(count) count.textContent=String(rows.length+1); // + INK31 fixo
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load);
  else load();
})();
