(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const sb = window.teamSupabase;

  const PLATFORM_INFO = {
    tiktok: {
      label: 'TikTok', urlKey: 'tiktok_url',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 3v10.2a4.3 4.3 0 1 1-3.7-4.25v2.5a1.9 1.9 0 1 0 1.25 1.78V3h2.45Zm0 0c.7 2.05 2.05 3.35 4.15 3.85v2.45c-1.7-.2-3.05-.85-4.15-1.8V3Z"/></svg>'
    },
    twitch: {
      label: 'Twitch', urlKey: 'twitch_url',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h15v11l-4 4h-4l-2.5 2.5V18H5V3Zm2.2 2.2v10.6h4.2v1.3l1.3-1.3h2.4l2.7-2.7V5.2H7.2Zm3.1 2.2h2v5h-2v-5Zm4.4 0h2v5h-2v-5Z"/></svg>'
    },
    youtube: {
      label: 'YouTube', urlKey: 'youtube_url',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.2c-.2-1.15-.85-2-2-2.2C17.4 5.7 14.2 5.6 12 5.6S6.6 5.7 5 6C3.85 6.2 3.2 7.05 3 8.2 2.8 9.4 2.7 10.7 2.7 12s.1 2.6.3 3.8c.2 1.15.85 2 2 2.2 1.6.3 4.8.4 7 .4s5.4-.1 7-.4c1.15-.2 1.8-1.05 2-2.2.2-1.2.3-2.5.3-3.8s-.1-2.6-.3-3.8ZM10.2 15.5v-7l5.9 3.5-5.9 3.5Z"/></svg>'
    },
    instagram: {
      label: 'Instagram', urlKey: 'instagram_url',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 5.2 8v8A2.8 2.8 0 0 0 8 18.8h8a2.8 2.8 0 0 0 2.8-2.8V8A2.8 2.8 0 0 0 16 5.2H8Zm8.7 1.65a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 2.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z"/></svg>'
    }
  };

  function safeUrl(value, fallback = '') {
    if (!value) return fallback;
    try {
      const url = new URL(String(value), window.location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return fallback;
      return url.href;
    } catch { return fallback; }
  }

  function smartMedia(url, alt) {
    const source = safeUrl(url, safeUrl('img/team-lambreta-header-logo.svg'));
    const node = document.createElement('div');
    node.className = 'smart-media';
    node.style.setProperty('--smart-media', `url(${JSON.stringify(source)})`);
    const bg = document.createElement('span');
    bg.className = 'smart-media-bg';
    const img = document.createElement('img');
    img.src = source;
    img.alt = alt || '';
    img.loading = 'lazy';
    node.append(bg, img);
    return node;
  }

  function initStaticMedia() {
    $$('.smart-media[data-media]').forEach(node => {
      const src = safeUrl(node.dataset.media);
      if (src) node.style.setProperty('--smart-media', `url(${JSON.stringify(src)})`);
    });
  }

  function initHero() {
    const hero = $('#homeHero');
    if (!hero) return;
    const slides = $$('[data-hero-slide]', hero);
    const dotsBox = $('[data-hero-dots]', hero);
    let index = 0;
    let timer = 0;
    let startX = 0;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Banner ${i + 1}`);
      dot.onclick = () => go(i, true);
      dotsBox.append(dot);
    });
    const dots = $$('button', dotsBox);

    function render() {
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(() => go(index + 1, false), 7000);
    }
    function go(next, manual) {
      index = (next + slides.length) % slides.length;
      render();
      if (manual) restart();
    }

    $('[data-hero-prev]', hero).onclick = () => go(index - 1, true);
    $('[data-hero-next]', hero).onclick = () => go(index + 1, true);
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', restart);
    hero.addEventListener('touchstart', event => { startX = event.touches[0]?.clientX || 0; }, { passive: true });
    hero.addEventListener('touchend', event => {
      const endX = event.changedTouches[0]?.clientX || 0;
      const delta = endX - startX;
      if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1), true);
    }, { passive: true });

    render();
    restart();
  }

  const isLive = row => Boolean(row?.force_live || row?.manual_live || row?.auto_live);
  const displayName = row => row?.display_name || row?.game_nickname || 'Streamer';

  function nextSchedule(row) {
    const schedule = Array.isArray(row?.schedule_json) ? row.schedule_json : [];
    const active = schedule.find(item => item && !item.is_off && item.start_day && item.start_time);
    if (!active) return 'Horário a anunciar';
    const days = {monday:'Seg',tuesday:'Ter',wednesday:'Qua',thursday:'Qui',friday:'Sex',saturday:'Sáb',sunday:'Dom'};
    return `${days[active.start_day] || active.start_day} · ${active.start_time}`;
  }

  function activePlatforms(row) {
    let selected = Array.isArray(row?.active_live_platforms) ? row.active_live_platforms : [];
    if (!selected.length && row?.live_platform) selected = [String(row.live_platform).toLowerCase()];
    return [...new Set(selected.map(value => String(value).toLowerCase()))]
      .filter(key => PLATFORM_INFO[key] && safeUrl(row?.[PLATFORM_INFO[key].urlKey]))
      .slice(0, 3);
  }

  function platformIconRow(row) {
    const keys = activePlatforms(row);
    if (!keys.length) return '';
    return `<div class="home101-platform-icons" aria-label="Plataformas ativas">${keys.map(key => `<span class="home101-platform-icon is-${key}" title="${esc(PLATFORM_INFO[key].label)}" aria-label="${esc(PLATFORM_INFO[key].label)}">${PLATFORM_INFO[key].icon}</span>`).join('')}</div>`;
  }

  function extractTikTokUser(row) {
    const raw = String(row?.tiktok_url || row?.live_url || '').trim();
    const match = raw.match(/tiktok\.com\/@([^/?#]+)/i) || raw.match(/^@([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]).replace(/^@/, '') : '';
  }

  function slugifyRoom(value) {
    return String(value || 'live').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32) || 'live';
  }

  function liveRoomUrl(row) {
    const user = extractTikTokUser(row) || slugifyRoom(row?.game_nickname || displayName(row));
    const selected = activePlatforms(row);
    const params = new URLSearchParams({
      user,
      name: displayName(row),
      game: row?.main_game || 'Gaming',
      streamer: row?.id || '',
      platform: selected[0] || String(row?.live_platform || '')
    });
    return `live.html?${params.toString()}`;
  }

  function ensureStreamerModal() {
    let modal = $('#homeStreamerWatchModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'homeStreamerWatchModal';
    modal.className = 'home101-watch-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="home101-watch-backdrop" data-watch-close></div>
      <section class="home101-watch-dialog" role="dialog" aria-modal="true" aria-labelledby="homeStreamerWatchTitle">
        <button class="home101-watch-close" type="button" data-watch-close aria-label="Fechar">×</button>
        <small>STREAMER TEAM LAMBRETA</small>
        <h2 id="homeStreamerWatchTitle">Onde quer assistir?</h2>
        <p id="homeStreamerWatchMeta"></p>
        <div id="homeStreamerWatchPlatforms" class="home101-watch-platforms"></div>
        <div class="home101-watch-separator"><span>OU</span></div>
        <a id="homeStreamerWatchHere" class="home101-watch-here" href="live.html">▶ ASSISTA AQUI</a>
        <span class="home101-watch-hint">Abre a sala Team Lambreta com player + chat da live.</span>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-watch-close]').forEach(node => node.addEventListener('click', closeStreamerModal));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeStreamerModal(); });
    return modal;
  }

  function closeStreamerModal() {
    const modal = $('#homeStreamerWatchModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('home101-modal-open');
  }

  function openStreamerModal(row) {
    const modal = ensureStreamerModal();
    const keys = activePlatforms(row);
    $('#homeStreamerWatchTitle', modal).textContent = `Onde quer assistir ${displayName(row)}?`;
    $('#homeStreamerWatchMeta', modal).textContent = `${row?.main_game || 'Gaming'}${isLive(row) ? ' · AO VIVO AGORA' : ' · próxima transmissão'}`;
    const platforms = $('#homeStreamerWatchPlatforms', modal);
    platforms.innerHTML = keys.length ? keys.map(key => {
      const info = PLATFORM_INFO[key];
      const url = safeUrl(row?.[info.urlKey]);
      return `<a class="home101-watch-platform is-${key}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(info.label)}" title="Abrir ${esc(info.label)}">${info.icon}<span class="sr-only">${esc(info.label)}</span></a>`;
    }).join('') : '<span class="home101-watch-none">Plataformas externas em atualização.</span>';
    $('#homeStreamerWatchHere', modal).href = liveRoomUrl(row);
    modal.hidden = false;
    document.body.classList.add('home101-modal-open');
    modal.querySelector('.home101-watch-close')?.focus();
  }

  function streamerCard(row) {
    const live = isLive(row);
    const card = document.createElement('article');
    card.className = 'home101-streamer-card';
    card.tabIndex = 0;
    card.setAttribute('role','button');
    card.setAttribute('aria-label', `Abrir opções para assistir ${displayName(row)}`);
    card.addEventListener('click', () => openStreamerModal(row));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openStreamerModal(row);
      }
    });

    const media = smartMedia(row.photo_url, displayName(row));
    card.append(media);

    const copy = document.createElement('div');
    copy.className = 'home101-streamer-copy';
    const badge = live ? '<span class="home101-live-pill">AO VIVO</span>' : `<span class="home101-upcoming-pill">${esc(nextSchedule(row))}</span>`;
    copy.innerHTML = `
      <div class="home101-streamer-top"><h3>${esc(displayName(row))}</h3>${badge}</div>
      <div class="home101-streamer-meta"><span>${esc(row.main_game || 'Gaming')}</span>${row.live_game_mode ? `<span>${esc(row.live_game_mode)}</span>` : ''}</div>
      ${platformIconRow(row)}
      <p>${esc(row.description || (live ? 'Entra na sala e acompanha a transmissão.' : 'Segue o streamer e acompanha a próxima transmissão.'))}</p>`;
    card.append(copy);
    return card;
  }

  async function loadStreamers() {
    const grid = $('#homeLiveGrid');
    if (!grid) return;
    if (!sb) {
      grid.innerHTML = '<div class="home101-empty"><strong>Streamers indisponíveis.</strong><span>Tenta novamente em instantes.</span></div>';
      return;
    }
    const result = await sb.from('streamers')
      .select('id,display_name,game_nickname,main_game,title,description,photo_url,live_url,live_platform,active_live_platforms,tiktok_url,twitch_url,youtube_url,instagram_url,allow_embed,allow_live_chat,manual_live,auto_live,force_live,is_featured,display_order,schedule_json,live_game_mode')
      .eq('is_published', true).eq('is_archived', false)
      .order('is_featured', { ascending: false }).order('display_order', { ascending: true });
    if (result.error) throw result.error;
    const rows = result.data || [];
    const liveRows = rows.filter(isLive);
    const shown = (liveRows.length ? liveRows : rows).slice(0, 3);
    $('#liveTitle').textContent = liveRows.length ? 'Streamers ao vivo agora' : 'Próximas lives';
    $('#liveSubtitle').textContent = liveRows.length
      ? `${liveRows.length} ${liveRows.length === 1 ? 'streamer está' : 'streamers estão'} ao vivo neste momento.`
      : 'Ninguém está ao vivo agora. Confere quem vem a seguir.';
    grid.innerHTML = '';
    if (!shown.length) {
      grid.innerHTML = '<div class="home101-empty"><strong>Nenhum streamer publicado.</strong><span>Quando houver streamers ativos, aparecem aqui automaticamente.</span></div>';
      return;
    }
    shown.forEach(row => grid.append(streamerCard(row)));
  }

  function formatDate(value) {
    if (!value) return '';
    try { return new Date(value).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return ''; }
  }

  async function loadUpdates() {
    const box = $('#homeUpdates');
    if (!box || !sb) return;
    const result = await sb.from('site_updates')
      .select('id,version,title,summary,category,published_at,created_at')
      .eq('is_published', true).order('published_at', { ascending: false }).limit(3);
    if (result.error) throw result.error;
    const rows = result.data || [];
    box.innerHTML = '';
    if (!rows.length) {
      box.innerHTML = '<div class="home101-empty"><strong>Sem atualizações publicadas.</strong><span>As próximas novidades aparecem aqui.</span></div>';
      return;
    }
    rows.forEach(row => {
      const a = document.createElement('a');
      a.className = 'home101-feed-item';
      a.href = 'atualizacoes.html';
      a.innerHTML = `<span class="home101-feed-icon">↻</span><span class="home101-feed-copy"><strong>${esc(row.title)}</strong><small>${esc(row.version || row.category || 'UPDATE')} · ${esc(formatDate(row.published_at || row.created_at))}</small></span><b>→</b>`;
      box.append(a);
    });
  }

  async function loadForum() {
    const box = $('#homeForum');
    if (!box) return;
    let session = null;
    try { session = await window.TeamAuth?.getSession(); } catch {}
    if (!session || !sb) {
      box.innerHTML = '<div class="home101-empty"><strong>As conversas ficam para os membros.</strong><span>Explora o site à vontade. Ao entrar com Google, os últimos tópicos aparecem aqui.</span><br><a class="home101-inline-link" href="forum.html">Abrir Fórum →</a></div>';
      return;
    }
    const result = await sb.from('forum_topics')
      .select('id,title,view_count,is_pinned,is_locked,created_at,updated_at,last_activity_at')
      .eq('is_private', false).eq('status', 'approved')
      .order('last_activity_at', { ascending: false }).limit(4);
    if (result.error) throw result.error;
    const rows = result.data || [];
    box.innerHTML = '';
    if (!rows.length) {
      box.innerHTML = '<div class="home101-empty"><strong>O Fórum está à espera da próxima conversa.</strong><span>Cria um tópico e movimenta a comunidade.</span></div>';
      return;
    }
    rows.forEach(row => {
      const a = document.createElement('a');
      a.className = 'home101-feed-item';
      a.href = `forum.html?topic=${encodeURIComponent(row.id)}`;
      a.innerHTML = `<span class="home101-feed-icon">${row.is_pinned ? '★' : '◫'}</span><span class="home101-feed-copy"><strong>${esc(row.title)}</strong><small>${Number(row.view_count || 0)} visualizações · ${esc(formatDate(row.last_activity_at || row.updated_at || row.created_at))}</small></span><b>→</b>`;
      box.append(a);
    });
  }

  function renderLocalEvents() {
    try {
      const data = window.getTeamData?.();
      const events = Array.isArray(data?.events) ? data.events : [];
      if (!events.length) return;
      const row = events[0];
      const host = $('#homeEvents');
      if (!host) return;
      const title = row.title || row.name || 'Próximo evento';
      const date = row.date || row.startDate || row.start_at || '';
      host.innerHTML = `<div class="home101-event-date"><strong>${esc(date ? formatDate(date) : 'EM BREVE')}</strong><span>Team Lambreta</span></div><div><h3>${esc(title)}</h3><p>${esc(row.description || row.text || 'Consulta a agenda para saber todos os detalhes e regras.')}</p><a class="home101-inline-link" href="eventos.html">Ver evento →</a></div>`;
    } catch {}
  }

  async function boot() {
    initStaticMedia();
    initHero();
    ensureStreamerModal();
    renderLocalEvents();
    $('#year').textContent = new Date().getFullYear();
    document.querySelector('.tl-main-nav a[href="home.html"]')?.classList.add('is-current');

    const jobs = [loadStreamers(), loadUpdates(), loadForum()];
    const results = await Promise.allSettled(jobs);
    results.forEach((result, i) => {
      if (result.status === 'rejected') console.warn('[HOME101]', ['streamers','updates','forum'][i], result.reason);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();