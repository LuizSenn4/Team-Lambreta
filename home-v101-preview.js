(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const sb = window.teamSupabase;

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

  function streamerCard(row) {
    const live = isLive(row);
    const card = document.createElement('a');
    card.className = 'home101-streamer-card';
    card.href = live ? `streamers.html?streamer=${encodeURIComponent(row.id)}` : `streamers.html?focus=${encodeURIComponent(row.id)}`;
    const media = smartMedia(row.photo_url, displayName(row));
    card.append(media);

    const copy = document.createElement('div');
    copy.className = 'home101-streamer-copy';
    const badge = live ? '<span class="home101-live-pill">AO VIVO</span>' : `<span class="home101-upcoming-pill">${esc(nextSchedule(row))}</span>`;
    copy.innerHTML = `
      <div class="home101-streamer-top"><h3>${esc(displayName(row))}</h3>${badge}</div>
      <div class="home101-streamer-meta"><span>${esc(row.main_game || 'Gaming')}</span>${row.live_game_mode ? `<span>${esc(row.live_game_mode)}</span>` : ''}${row.live_platform ? `<span>${esc(String(row.live_platform).toUpperCase())}</span>` : ''}</div>
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
      .select('id,display_name,game_nickname,main_game,title,description,photo_url,live_url,live_platform,manual_live,auto_live,force_live,is_featured,display_order,schedule_json,live_game_mode')
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