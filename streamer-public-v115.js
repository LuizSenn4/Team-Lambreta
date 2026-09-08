(() => {
  'use strict';
  if (window.TeamStreamerHub) return;

  const sb = window.teamSupabase;
  const images = window.TeamVisualImages;
  if (!sb) return;

  const grid = document.getElementById('streamersPublicGrid');
  const count = document.getElementById('streamersCount');
  const liveCount = document.getElementById('streamersLiveCount');
  const soonCount = document.getElementById('streamersSoonCount');
  const nextLiveButton = document.getElementById('streamersNextLive');
  let nextCardIndex = 0;
  if (!grid) return;

  let rows = [];
  let channel = null;
  let refreshTimer = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeUrl = value => { try { const url = new URL(String(value || '').trim(), location.href); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
  const DAY = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
  const DAY_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const staticInk = {
    id:'ink31-static', is_static:true, is_featured:true, display_name:'INK31',
    description:'Fundador e streamer do Team Lambreta. Conteúdo focado em Fortnite e comunidade.',
    photo_url:'img/streamers/ink31-profile-720.webp', main_game:'Fortnite',
    tiktok_url:'https://www.tiktok.com/@rv3113', twitch_url:'https://www.twitch.tv/oklm31rv',
    schedule_text:'Terça a Domingo · horários variáveis · acompanha as redes para saber quando abrir live.',
    force_live:false, manual_live:false, auto_live:false
  };

  const platformIcon = name => ({
    TikTok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4c.4 2.3 1.8 3.7 4 4v3c-1.6 0-2.9-.4-4-1.2v5.7A5.5 5.5 0 1 1 10 10v3.1a2.5 2.5 0 1 0 2 2.4V4z"/></svg>',
    YouTube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12s0-4-1-5-3-1-8-1-7 0-8 1-1 5 0 10c1 1 8 1 8 1s7 0 8-1c1-1 1-5 1-5z"/><path d="m10 9 5 3-5 3z"/></svg>',
    Twitch:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H4V6zM8 6v9h3v2l2-2h4l2-2V6z"/><path d="M12 8v4M16 8v4"/></svg>'
  }[name] || '');

  function socialLinks(row) {
    const sources = [
      ['TikTok', row.tiktok_url],
      ['YouTube', row.youtube_url],
      ['Twitch', row.twitch_url]
    ].filter(([,url]) => safeUrl(url));
    return sources.map(([name,url]) => `<a class="streamer-platform-link platform-${name.toLowerCase()}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer" title="${esc(name)}" aria-label="Abrir ${esc(name)} de ${esc(row.display_name || 'streamer')}">${platformIcon(name)}<span class="sr-only">${esc(name)}</span></a>`).join('');
  }

  function nextScheduledStart(row, now = new Date()) {
    const schedule = Array.isArray(row.schedule_json) ? row.schedule_json.filter(item => item && !item.is_off && item.start_time) : [];
    if (!schedule.length) return null;
    let best = null;
    for (let addDays = 0; addDays <= 7; addDays++) {
      const day = new Date(now);
      day.setSeconds(0,0);
      day.setDate(now.getDate() + addDays);
      for (const item of schedule) {
        if (item.type === 'date' && item.date) {
          const [y,m,d] = String(item.date).split('-').map(Number);
          if (!y || !m || !d) continue;
          if (day.getFullYear() !== y || day.getMonth()+1 !== m || day.getDate() !== d) continue;
        } else {
          const wanted = DAY[String(item.start_day || '').toLowerCase()];
          if (wanted == null || day.getDay() !== wanted) continue;
        }
        const [h,min] = String(item.start_time).split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(min)) continue;
        const candidate = new Date(day);
        candidate.setHours(h,min,0,0);
        if (candidate < now) continue;
        if (!best || candidate < best) best = candidate;
      }
      if (best) break;
    }
    return best;
  }

  function statusOf(row) {
    if (row.force_live || row.manual_live || row.auto_live) return { key:'live', label:'AO VIVO', detail:'Transmissão ativa agora', when:null };
    const next = nextScheduledStart(row);
    if (next) {
      const minutes = Math.ceil((next.getTime() - Date.now()) / 60000);
      if (minutes >= 0 && minutes <= 60) return { key:'soon', label:'COMEÇA EM BREVE', detail:minutes <= 1 ? 'A começar agora' : `Começa em ${minutes} min`, when:next };
      return { key:'scheduled', label:'PRÓXIMA LIVE', detail:`${DAY_PT[next.getDay()]} · ${next.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}`, when:next };
    }
    return { key:'offline', label:'AGENDA', detail:String(row.schedule_text || 'Horário em atualização'), when:null };
  }

  function modeLabel(row) {
    if (Array.isArray(row.game_mode)) return row.game_mode.join(' · ');
    if (Array.isArray(row.modes)) return row.modes.join(' · ');
    return row.game_mode || row.mode || row.build_preference || '';
  }

  function card(row, index) {
    const status = statusOf(row);
    const photo = safeUrl(row.photo_url) || String(row.photo_url || '');
    const links = socialLinks(row);
    const mode = modeLabel(row);
    return `<article class="streamer-unified-card streamer-poster-card ${status.key === 'live' ? 'is-live' : ''} status-${status.key}">
      <div class="streamer-card-photo">${photo ? `<img src="${esc(photo)}" alt="${esc(row.display_name || 'Streamer')}" loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async">` : '<div class="streamer-photo-placeholder tl-image-skeleton" aria-hidden="true"></div>'}</div>
      <div class="streamer-poster-caption">
        <h2>${esc(row.display_name || 'STREAMER')}</h2>
        <span class="streamer-poster-status"><i class="live-dot"></i>${esc(status.label)}</span>
        <time class="streamer-poster-schedule">${esc(status.detail)}</time>
        <p class="streamer-poster-game">${esc(row.main_game || 'Jogo em atualização')}${mode ? ` · ${esc(mode)}` : ''}</p>
        ${links ? `<div class="streamer-card-platforms">${links}</div>` : ''}
        <p class="streamer-poster-description">${esc(row.description || 'Streamer oficial da comunidade Team Lambreta.')}</p>
      </div>
    </article>`;
  }

  function sortRows(list) {
    const rank = { live:0, soon:1, scheduled:2, offline:3 };
    return [...list].sort((a,b) => {
      const sa = statusOf(a), sb = statusOf(b);
      if (rank[sa.key] !== rank[sb.key]) return rank[sa.key] - rank[sb.key];
      const ta = sa.when?.getTime?.() || Number.MAX_SAFE_INTEGER;
      const tb = sb.when?.getTime?.() || Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    });
  }

  function render() {
    const combined = sortRows([staticInk, ...rows]);
    const statuses = combined.map(statusOf);
    if (count) count.textContent = String(combined.length);
    if (liveCount) liveCount.textContent = String(statuses.filter(s => s.key === 'live').length);
    if (soonCount) soonCount.textContent = String(statuses.filter(s => s.key === 'soon').length);
    grid.innerHTML = combined.length ? combined.map(card).join('') : '<article class="empty-card"><h3>Streamers</h3><p>Agenda em atualização.</p></article>';
  }

  async function load() {
    const { data, error } = await sb.from('streamers').select('*').eq('is_published',true).eq('is_archived',false).order('is_featured',{ascending:false}).order('display_order',{ascending:true}).order('created_at',{ascending:true});
    if (error) { grid.innerHTML = `<article class="empty-card"><h3>Streamers</h3><p>${esc(error.message)}</p></article>`; return; }
    rows = data || [];
    images?.writeCollection?.('streamers-public', rows);
    render();
  }

  function scheduleLoad() { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => void load(), 120); }
  function startRealtime() {
    if (channel) sb.removeChannel(channel);
    channel = sb.channel('public-streamers-v115').on('postgres_changes',{event:'*',schema:'public',table:'streamers'},scheduleLoad).subscribe();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleLoad(); });
    window.addEventListener('focus', scheduleLoad, { passive:true });
  }

  function showNextLive() {
    const cards = [...grid.querySelectorAll('.streamer-poster-card')];
    if (!cards.length) return;
    nextCardIndex = (nextCardIndex + 1) % cards.length;
    cards[nextCardIndex].scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    cards[nextCardIndex].animate?.([{transform:'scale(1)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:520,easing:'ease'});
  }
  nextLiveButton?.addEventListener('click', showNextLive);

  async function boot() {
    const cached = images?.readCollection?.('streamers-public');
    if (cached?.length) { rows = cached; render(); }
    await load();
    startRealtime();
  }

  window.addEventListener('pagehide', () => { if (channel) sb.removeChannel(channel); channel = null; }, { once:true });
  window.TeamStreamerHub = Object.freeze({ refresh:load, statusOf });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else void boot();
})();