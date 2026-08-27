(() => {
  // TEMPORÁRIO: UI aprovada dos cards; dados usam exclusivamente o cliente V102.
  const sb = window.teamSupabase;
  if (!sb) return;
  const images = window.TeamVisualImages;

  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 5;
  let allRows = [];
  let currentPage = 1;
  let refreshTimer = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

  const staticInk = {
    id: 'ink31-static',
    is_static: true,
    is_featured: true,
    display_name: 'INK31',
    title: 'Boss • Streamer Oficial',
    description: 'Fundador e streamer do Team Lambreta. Conteúdo focado em Fortnite, comunidade e muita resenha.',
    photo_url: 'img/streamers/ink31-profile-720.webp',
    game_nickname: 'oklm_31_ink',
    main_game: 'Fortnite',
    live_platform: 'tiktok',
    live_url: 'https://www.tiktok.com/@rv3113/live',
    tiktok_username: 'rv3113',
    live_page_url: 'live.html?user=rv3113&name=INK31&game=Fortnite',
    auto_probe_live: true,
    tiktok_url: 'https://www.tiktok.com/@rv3113',
    twitch_url: 'https://www.twitch.tv/oklm31rv',
    schedule_text: 'Terça a Domingo · horários variáveis · acompanha nas redes para saber quando abrir live.',
    notify_text: 'Ativa as notificações e acompanha o perfil para saber quando o INK31 entrar ao vivo.',
    force_live: false,
    manual_live: false,
    auto_live: false,
    custom_socials: [
      { name: 'TikTok', url: 'https://www.tiktok.com/@rv3113' },
      { name: 'Twitch', url: 'https://www.twitch.tv/oklm31rv' }
    ]
  };

  function extractTikTokUsername(row = {}) {
    const candidates = [row.tiktok_username, row.live_url, row.tiktok_url];
    for (const candidate of candidates) {
      const value = String(candidate || '').trim();
      if (!value) continue;
      if (!value.includes('/') && !value.includes('@')) return value.replace(/^@/, '');
      const match = value.match(/tiktok\.com\/@([^/?#]+)/i) || value.match(/^@([^/?#]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]).replace(/^@/, '');
    }
    return '';
  }

  function normalizeStreamer(row = {}) {
    const normalized = { ...row };
    const tiktokUser = extractTikTokUsername(normalized);
    if (!tiktokUser) return normalized;

    const displayName = String(normalized.display_name || tiktokUser).trim();
    const game = String(normalized.main_game || 'Fortnite').trim();

    normalized.tiktok_username = tiktokUser;
    normalized.live_platform = normalized.live_platform || 'tiktok';
    normalized.tiktok_url = normalized.tiktok_url || `https://www.tiktok.com/@${tiktokUser}`;
    normalized.live_url = normalized.live_url || `https://www.tiktok.com/@${tiktokUser}/live`;
    normalized.live_page_url = `live.html?user=${encodeURIComponent(tiktokUser)}&name=${encodeURIComponent(displayName)}&game=${encodeURIComponent(game)}`;
    normalized.auto_probe_live = true;
    return normalized;
  }

  function platformClass(name) {
    const value = String(name || '').toLowerCase();
    if (value.includes('tiktok')) return 'tiktok';
    if (value.includes('twitch')) return 'twitch';
    if (value.includes('youtube')) return 'youtube';
    if (value.includes('instagram')) return 'instagram';
    if (value.includes('facebook')) return 'facebook';
    if (value.includes('discord')) return 'discord';
    return 'other';
  }

  function platformIcon(name) {
    const value = platformClass(name);
    if (value === 'tiktok') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4c.4 2.3 1.8 3.7 4 4v3c-1.6 0-2.9-.4-4-1.2v5.7A5.5 5.5 0 1 1 10 10v3.1a2.5 2.5 0 1 0 2 2.4V4z"/></svg>';
    if (value === 'twitch') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H4V6zM8 6v9h3v2l2-2h4l2-2V6z"/><path d="M12 8v4M16 8v4"/></svg>';
    if (value === 'youtube') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12s0-4-1-5-3-1-8-1-7 0-8 1-1 5 0 10c1 1 8 1 8 1s7 0 8-1c1-1 1-5 1-5z"/><path d="m10 9 5 3-5 3z"/></svg>';
    if (value === 'instagram') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r=".7"/></svg>';
    if (value === 'facebook') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h3l.5-4H14V7.5c0-1.2.4-2 2.1-2H18V2.2c-.8-.1-1.7-.2-2.5-.2C12.8 2 11 3.7 11 6.9V9H8v4h3v8z"/></svg>';
    if (value === 'discord') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7a14 14 0 0 1 8 0l2 3 1 7a15 15 0 0 1-4 2l-1-2a9 9 0 0 1-4 0l-1 2a15 15 0 0 1-4-2l1-7 2-3Z"/><circle cx="9.5" cy="12.5" r="1"/><circle cx="14.5" cy="12.5" r="1"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>';
  }

  function platformName(row) {
    if (row.live_platform === 'tiktok') return 'TikTok';
    if (row.live_platform === 'twitch') return 'Twitch';
    if (row.live_platform === 'youtube') return 'YouTube';
    return 'Live';
  }

  function socialData(row) {
    const configured = [
      ...(Array.isArray(row.custom_socials) ? row.custom_socials : []),
      { name: 'TikTok', url: row.tiktok_url },
      { name: 'Twitch', url: row.twitch_url },
      { name: 'YouTube', url: row.youtube_url },
      { name: 'Instagram', url: row.instagram_url },
      { name: 'Facebook', url: row.facebook_url }
    ].filter((item) => item?.url);
    const seen = new Set();
    return configured.filter(item => {
      const key = platformClass(item.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || '').trim(), location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function scheduleLabel(row) {
    if (row.force_live || row.manual_live || row.auto_live) return 'AO VIVO AGORA';
    if (row.schedule_text) return String(row.schedule_text);
    const first = Array.isArray(row.schedule_json) ? row.schedule_json.find(item => !item.is_off) : null;
    if (!first) return 'Horário em atualização';
    const days = { monday:'Seg', tuesday:'Ter', wednesday:'Qua', thursday:'Qui', friday:'Sex', saturday:'Sáb', sunday:'Dom' };
    return `${days[first.start_day] || first.date || ''}${first.start_time ? ` · ${first.start_time}` : ''}`.trim();
  }

  function modeLabel(row) {
    if (Array.isArray(row.game_mode)) return row.game_mode.join(' · ');
    if (Array.isArray(row.modes)) return row.modes.join(' · ');
    return row.game_mode || row.mode || row.build_preference || '';
  }

  function platformLinks(row, context = 'card') {
    return socialData(row).map(item => {
      const url = safeUrl(item.url);
      const name = String(item.name || 'Plataforma');
      if (!url) return '';
      return `<a class="streamer-platform-link platform-${platformClass(name)}" data-platform-link data-platform-label="${esc(name)}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(name)} de ${esc(row.display_name || 'streamer')}" title="${esc(name)}">${platformIcon(name)}<span class="sr-only">${esc(name)}</span></a>`;
    }).join('');
  }

  const DAY_LABELS={monday:'SEGUNDA',tuesday:'TERÇA',wednesday:'QUARTA',thursday:'QUINTA',friday:'SEXTA',saturday:'SÁBADO',sunday:'DOMINGO'};

  function structuredScheduleMarkup(rows) {
    if(!Array.isArray(rows) || !rows.length) return '';
    return rows.map(row=>{
      const label=row.type==='date' && row.date
        ? new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${row.date}T12:00:00`))
        : (row.start_day===row.end_day ? DAY_LABELS[row.start_day] : `${DAY_LABELS[row.start_day]||''} A ${DAY_LABELS[row.end_day]||''}`);
      const value=row.is_off?'Folga':`${row.start_time||'00:00'} — ${row.end_time||'00:00'}`;
      return `<div class="streamer-schedule-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
    }).join('');
  }

  function parseSchedule(description, fallbackText = '') {
    const source = String(description || '').trim();
    const match = source.match(/hor[aá]rio(?:s)?\s+de\s+live(?:s)?\s*:\s*([\s\S]*)/i);
    const scheduleText = match ? match[1].trim() : String(fallbackText || '').trim();
    const cleanDescription = match ? source.replace(match[0], '').replace(/\s{2,}/g, ' ').trim() : source;

    if (!scheduleText) {
      return {
        cleanDescription,
        scheduleMarkup: '<div class="streamer-schedule-empty">Agenda em atualização</div>'
      };
    }

    const normalized = scheduleText
      .replace(/\s+/g, ' ')
      .replace(/\s*([,;])\s*/g, '$1 ')
      .trim();

    const lines = normalized
      .split(/(?=(?:Segunda|Segundas|Terça|Terca|Terças|Tercas|Quarta|Quartas|Quinta|Quintas|Sexta|Sextas|Sábado|Sabado|Sábados|Sabados|Domingo|Domingos))/i)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!lines.length) {
      return {
        cleanDescription,
        scheduleMarkup: `<div class="streamer-schedule-free">${esc(normalized)}</div>`
      };
    }

    const rows = lines.map((line) => {
      const parts = line.split(/\s+[—–-]\s+|\s+das\s+/i);
      if (parts.length > 1) {
        const label = parts[0].trim();
        const value = line.replace(label, '').replace(/^\s*[—–-]?\s*/,'').trim();
        return `<div class="streamer-schedule-row"><span>${esc(label)}</span><strong>${esc(value || 'Ao vivo')}</strong></div>`;
      }
      return `<div class="streamer-schedule-row"><span>${esc(line)}</span><strong>—</strong></div>`;
    }).join('');

    return { cleanDescription, scheduleMarkup: rows };
  }

  function nameClass(name) {
    const length = String(name || '').trim().length;
    if (length >= 18) return 'is-long';
    if (length >= 12) return 'is-medium';
    return '';
  }

  function getTone(globalIndex) {
    return globalIndex % 2 === 0 ? 'tone-red' : 'tone-green';
  }

  function streamerSlug(row = {}) {
    const source = row.slug || row.tiktok_username || row.display_name || row.id || 'streamer';
    return String(source).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function buildCard(row, globalIndex) {
    row = normalizeStreamer(row);
    const tone = row.is_static ? 'tone-red' : getTone(globalIndex);
    const live = Boolean(row.force_live || row.manual_live || row.auto_live);
    const slug = streamerSlug(row);
    const gameMode = modeLabel(row);
    const platforms = platformLinks(row);
    const mainPhoto = row.photo_url
      ? `<img src="${esc(row.photo_url)}" alt="" loading="${globalIndex<4?'eager':'lazy'}" decoding="async" width="480" height="720" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="streamer-photo-placeholder tl-image-skeleton" aria-hidden="true" hidden></div>`
      : '<div class="streamer-photo-placeholder tl-image-skeleton" aria-hidden="true"></div>';

    return `
      <article class="streamer-unified-card streamer-poster-card ${tone} ${live ? 'is-live' : ''}" data-streamer-id="${esc(row.id)}" data-streamer-slug="${encodeURIComponent(slug)}" data-watch-streamer tabindex="0" role="button" aria-label="Opções para assistir ${esc(row.display_name || 'streamer')}">
        <div class="streamer-card-photo">${mainPhoto}</div>
        <div class="streamer-poster-caption">
          <h2>${esc(row.display_name || 'STREAMER')}</h2>
          <span class="streamer-poster-status"><i class="live-dot"></i>${live ? 'AO VIVO' : 'OFFLINE'}</span>
          <time class="streamer-poster-schedule">${esc(scheduleLabel(row))}</time>
          <p class="streamer-poster-game">${esc(row.main_game || 'Jogo em atualização')}${gameMode ? ` · ${esc(gameMode)}` : ''}</p>
          ${platforms ? `<div class="streamer-card-platforms">${platforms}</div>` : ''}
          <p class="streamer-poster-description">${esc(row.description || 'Streamer oficial da comunidade Team Lambreta.')}</p>
        </div>
      </article>
    `;
  }

  const watchModal = $('homeStreamerWatchModal');
  let watchReturnFocus = null;
  function openWatch(row, trigger) {
    if (!watchModal) return;
    watchReturnFocus = trigger;
    $('homeWatchTitle').textContent = `Onde quer assistir ${row.display_name || 'este streamer'}?`;
    $('streamerWatchMeta').textContent = `${row.main_game || 'Jogo em atualização'} · ${scheduleLabel(row)}`;
    $('homeWatchPlatforms').innerHTML = platformLinks(row, 'modal') || '<span class="home-watch-empty">Plataformas externas em atualização.</span>';
    $('homeWatchInternal').href = safeUrl(row.live_page_url) || `live.html?streamer=${encodeURIComponent(row.id)}`;
    watchModal.hidden = false;
    document.body.classList.add('home-watch-open');
    requestAnimationFrame(() => watchModal.querySelector('[data-watch-close]')?.focus());
  }

  function closeWatch() {
    if (!watchModal) return;
    watchModal.hidden = true;
    document.body.classList.remove('home-watch-open');
    watchReturnFocus?.focus?.();
  }

  function bindInteractions() {
    const grid = $('streamersPublicGrid');
    if (!grid || grid.dataset.interactionsBound === '1') return;
    grid.dataset.interactionsBound = '1';
    const heldLinks = new WeakSet();
    let holdTimer = null;
    grid.addEventListener('pointerdown', event => {
      const link = event.target.closest('[data-platform-link]');
      if (!link || event.pointerType === 'mouse') return;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { heldLinks.add(link); link.classList.add('is-tooltip-visible'); }, 420);
    });
    ['pointerup', 'pointercancel'].forEach(type => grid.addEventListener(type, event => {
      clearTimeout(holdTimer);
      const link = event.target.closest('[data-platform-link]');
      if (link?.classList.contains('is-tooltip-visible')) setTimeout(() => link.classList.remove('is-tooltip-visible'), 900);
    }));
    grid.addEventListener('contextmenu', event => { if (event.target.closest('[data-platform-link]')) event.preventDefault(); });
    grid.addEventListener('click', event => {
      const link = event.target.closest('[data-platform-link]');
      if (link) {
        event.stopPropagation();
        if (heldLinks.has(link)) { event.preventDefault(); heldLinks.delete(link); }
        return;
      }
      const card = event.target.closest('[data-watch-streamer]');
      if (!card) return;
      const row = [staticInk, ...allRows].find(item => String(item.id) === String(card.dataset.streamerId));
      if (row) openWatch(normalizeStreamer(row), card);
    });
    grid.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key) || event.target.closest('[data-platform-link]')) return;
      const card = event.target.closest('[data-watch-streamer]');
      if (!card) return;
      event.preventDefault();
      const row = [staticInk, ...allRows].find(item => String(item.id) === String(card.dataset.streamerId));
      if (row) openWatch(normalizeStreamer(row), card);
    });
    watchModal?.querySelectorAll('[data-watch-close]').forEach(button => button.addEventListener('click', closeWatch));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && watchModal && !watchModal.hidden) closeWatch(); });
  }

  function setupTikTokLiveProbes() {
    const probeCards = document.querySelectorAll('[data-live-probe="tiktok"]');
    probeCards.forEach(section => {
      const iframe = section.querySelector('[data-live-frame]');
      const fallback = section.querySelector('[data-live-fallback]');
      const label = section.querySelector('[data-live-label]');
      const statusText = section.querySelector('[data-live-status-text]');
      const watchHere = section.querySelector('[data-watch-here]');
      const openPlatform = section.querySelector('[data-open-platform]');
      if (!iframe || iframe.dataset.bound === '1') return;
      iframe.dataset.bound = '1';

      const setLive = () => {
        section.closest('.streamer-unified-card')?.classList.add('is-live');
        iframe.hidden = false;
        if (fallback) fallback.hidden = true;
        if (label) label.textContent = 'AO VIVO AGORA';
        if (statusText) statusText.textContent = 'Acompanha a transmissão';
        if (watchHere) watchHere.hidden = false;
        if (openPlatform) openPlatform.textContent = 'ABRIR TIKTOK';
      };

      const setOffline = () => {
        iframe.hidden = true;
        if (fallback) fallback.hidden = false;
        if (label) label.textContent = 'LIVE';
        if (statusText) statusText.textContent = 'Veja quando estiver ao vivo';
        if (watchHere) watchHere.hidden = false;
      };

      const listener = event => {
        if (event.source !== iframe.contentWindow) return;
        const message = event.data;
        if (!message || message['x-tiktok-player'] !== true) return;
        if (message.type === 'onStateChange') {
          if (Number(message.value) === 1 || Number(message.value) === 3) setLive();
        }
        if (message.type === 'onPlayerError') setOffline();
      };
      window.addEventListener('message', listener);
      setTimeout(() => {
        try { iframe.contentWindow?.postMessage({'x-tiktok-player':true,type:'play'}, '*'); } catch (_) {}
      }, 1500);
    });
  }

  function getPageRows() {
    const totalItems = allRows.length + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    if (currentPage === 1) {
      return {
        rows: [staticInk, ...allRows.slice(0, PAGE_SIZE - 1)],
        totalPages
      };
    }

    const start = (PAGE_SIZE - 1) + ((currentPage - 2) * PAGE_SIZE);
    return {
      rows: allRows.slice(start, start + PAGE_SIZE),
      totalPages
    };
  }

  function renderPage() {
    const grid = $('streamersPublicGrid');
    const pager = $('streamersPublicPager');
    if (!grid) return;

    const { rows, totalPages } = getPageRows();
    grid.innerHTML = rows.length
      ? rows.map((row, index) => buildCard(row, (currentPage === 1 ? index : index + PAGE_SIZE))).join('')
      : '<article class="empty-card"><h3>Mais streamers em breve</h3><p>Os perfis adicionados pelo painel aparecerão aqui.</p></article>';

    if (!pager) return;
    if (totalPages <= 1) {
      pager.hidden = true;
      pager.innerHTML = '';
      return;
    }

    pager.hidden = false;
    pager.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map((page) => `<button type="button" data-page="${page}" class="${page === currentPage ? 'is-active' : ''}">${page}</button>`)
      .join('');

    pager.querySelectorAll('[data-page]').forEach((button) => {
      button.onclick = () => {
        currentPage = Number(button.dataset.page) || 1;
        renderPage();
        document.querySelector('.streamers-showcase-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
  }

  async function load() {
    const grid = $('streamersPublicGrid');
    if (!grid) return;

    const { data, error } = await sb
      .from('streamers')
      .select('*')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      grid.innerHTML = `<article class="empty-card"><h3>Streamers</h3><p>${esc(error.message)}</p></article>`;
      return;
    }

    allRows = data || [];
    images?.writeCollection?.('streamers-public', allRows);
    const count = $('streamersCount');
    if (count) count.textContent = String(allRows.length + 1);
    renderPage();
  }

  const scheduleLoad = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(load, 120);
  };

  function startCloudSync() {
    sb.channel('public-streamers-cloud-v86')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamers' }, scheduleLoad)
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
    bindInteractions();
    const cached = images?.readCollection?.('streamers-public');
    if (cached?.length) {
      allRows = cached;
      const count = $('streamersCount');
      if (count) count.textContent = String(allRows.length + 1);
      renderPage();
    }
    await load();
    startCloudSync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
