(() => {
  'use strict';
  const sb = window.teamSupabase;
  const root = document.getElementById('streamerDetail');
  if (!root) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const slugify = value => String(value || 'streamer').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const safeUrl = value => { try { const url = new URL(String(value || '')); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const staticInk = { id:'ink31-static', display_name:'INK31', title:'Boss • Streamer Oficial', description:'Fundador e streamer do Team Lambreta. Conteúdo focado em Fortnite, comunidade e muita resenha.', photo_url:'img/streamers/ink31-profile.jpg', game_nickname:'oklm_31_ink', main_game:'Fortnite', live_platform:'TikTok', tiktok_username:'rv3113', tiktok_url:'https://www.tiktok.com/@rv3113', twitch_url:'https://www.twitch.tv/oklm31rv', schedule_text:'Terça a Domingo · horários variáveis · acompanha nas redes para saber quando abrir live.', custom_socials:[{name:'TikTok',url:'https://www.tiktok.com/@rv3113'},{name:'Twitch',url:'https://www.twitch.tv/oklm31rv'}] };

  function socialData(row) {
    if (Array.isArray(row.custom_socials)) return row.custom_socials.filter(item => safeUrl(item?.url));
    return [{name:'TikTok',url:row.tiktok_url},{name:'Twitch',url:row.twitch_url},{name:'YouTube',url:row.youtube_url},{name:'Instagram',url:row.instagram_url},{name:'Facebook',url:row.facebook_url}].filter(item => safeUrl(item.url));
  }
  const field = (label, value) => value ? `<div class="streamer-detail-fact"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>` : '';
  function render(row) {
    const live = Boolean(row.force_live || row.manual_live || row.auto_live);
    const socials = socialData(row);
    const platform = row.live_platform || row.platform || 'Em atualização';
    const mode = row.game_mode || row.mode || row.modes || 'Em atualização';
    const schedule = row.schedule_text || (Array.isArray(row.schedule_json) ? row.schedule_json.map(item => item.is_off ? `${item.start_day || item.date}: Folga` : `${item.start_day || item.date}: ${item.start_time || ''} — ${item.end_time || ''}`).join('\n') : '') || 'Agenda em atualização.';
    document.title = `${row.display_name || 'Streamer'} — Team Lambreta`;
    root.innerHTML = `<a class="streamer-detail-back" href="streamers.html">← Voltar aos streamers</a><section class="streamer-detail-shell"><div class="streamer-detail-poster">${row.photo_url ? `<img src="${esc(row.photo_url)}" alt="Arte de ${esc(row.display_name)}">` : '<span>Arte em atualização</span>'}</div><article class="streamer-detail-copy"><p class="streamer-detail-kicker">${live ? '● AO VIVO AGORA' : 'STREAMER OFICIAL'}</p><h1>${esc(row.display_name || 'Streamer')}</h1><p class="streamer-detail-description">${esc(row.description || 'Streamer oficial da comunidade Team Lambreta.')}</p><div class="streamer-detail-facts">${field('NICKNAME',row.game_nickname || row.display_name)}${field('STATUS',live?'Ao vivo':'Offline')}${field('JOGO',row.main_game)}${field('MODO',Array.isArray(mode)?mode.join(', '):mode)}${field('PLATAFORMA',platform)}${field('CARGO',row.title || 'Streamer Oficial')}</div><section class="streamer-detail-section"><h2>Horários</h2><p>${esc(schedule)}</p></section><section class="streamer-detail-section"><h2>Redes sociais</h2><div class="streamer-detail-socials">${socials.length ? socials.map(s => `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>`).join('') : '<span>Redes em atualização.</span>'}</div></section><div class="streamer-detail-future"><div class="streamer-detail-placeholder"><span>Futuro TikTok LIVE Player</span></div><div class="streamer-detail-placeholder"><span>Futura área de apoio e donates</span></div></div></article></section>`;
  }
  async function boot() {
    const wanted = new URLSearchParams(location.search).get('slug') || 'ink31';
    if (slugify(wanted) === 'ink31' || slugify(wanted) === 'rv3113') return render(staticInk);
    if (!sb) throw new Error('Supabase indisponível');
    const result = await sb.from('streamers').select('*').eq('is_published', true).eq('is_archived', false);
    if (result.error) throw result.error;
    const row = (result.data || []).find(item => [item.slug,item.tiktok_username,item.display_name,item.id].some(value => slugify(value) === slugify(wanted)));
    if (!row) { root.innerHTML = '<a class="streamer-detail-back" href="streamers.html">← Voltar aos streamers</a><div class="streamer-detail-error"><h1>Streamer não encontrado</h1><p>Este perfil não existe ou deixou de estar publicado.</p></div>'; return; }
    render(row);
  }
  boot().catch(error => { console.error('[Streamer]', error); root.innerHTML = '<a class="streamer-detail-back" href="streamers.html">← Voltar aos streamers</a><div class="streamer-detail-error"><h1>Não foi possível carregar</h1><p>Tenta novamente dentro de instantes.</p></div>'; });
})();
