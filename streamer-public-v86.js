(() => {
  const URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(URL, KEY);
  if (!sb) return;

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
    photo_url: 'img/streamers/ink31-profile.jpg',
    game_nickname: 'oklm_31_ink',
    main_game: 'Fortnite',
    live_platform: 'tiktok',
    live_url: 'https://www.tiktok.com/@rv3113/live',
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

  function platformClass(name) {
    const value = String(name || '').toLowerCase();
    if (value.includes('tiktok')) return 'tiktok';
    if (value.includes('twitch')) return 'twitch';
    if (value.includes('youtube')) return 'youtube';
    if (value.includes('instagram')) return 'instagram';
    if (value.includes('discord')) return 'discord';
    return 'other';
  }

  function platformIcon(name) {
    const value = platformClass(name);
    if (value === 'tiktok') return '♪';
    if (value === 'twitch') return '◫';
    if (value === 'youtube') return '▶';
    if (value === 'instagram') return '◎';
    if (value === 'discord') return '◉';
    return '↗';
  }

  function platformName(row) {
    if (row.live_platform === 'tiktok') return 'TikTok';
    if (row.live_platform === 'twitch') return 'Twitch';
    if (row.live_platform === 'youtube') return 'YouTube';
    return 'Live';
  }

  function socialData(row) {
    if (Array.isArray(row.custom_socials) && row.custom_socials.length) {
      return row.custom_socials.filter((item) => item?.url);
    }

    return [
      { name: 'TikTok', url: row.tiktok_url },
      { name: 'Twitch', url: row.twitch_url },
      { name: 'YouTube', url: row.youtube_url },
      { name: 'Instagram', url: row.instagram_url }
    ].filter((item) => item.url);
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

  function buildCard(row, globalIndex) {
    const tone = row.is_static ? 'tone-red' : getTone(globalIndex);
    const socials = socialData(row);
    const live = Boolean(row.force_live || row.manual_live || row.auto_live);
    const watchUrl = row.live_url || row.tiktok_url || row.twitch_url || row.youtube_url || row.instagram_url || '';
    const watchLabel = live ? 'ASSISTIR AGORA' : `ABRIR ${platformName(row).toUpperCase()}`;
    const { cleanDescription, scheduleMarkup } = parseSchedule(row.description, row.schedule_text);
    const titleLine = row.title ? esc(row.title) : 'Streamer Oficial';
    const gameLine = row.main_game ? esc(row.main_game) : 'Fortnite';
    const mainPhoto = row.photo_url
      ? `<img src="${esc(row.photo_url)}" alt="${esc(row.display_name)}" loading="lazy">`
      : '<div class="streamer-photo-placeholder">🎥</div>';
    const previewPhoto = row.photo_url
      ? `<img src="${esc(row.photo_url)}" alt="Prévia de ${esc(row.display_name)}" loading="lazy">`
      : '<div class="streamer-photo-placeholder streamer-photo-placeholder--small">🎥</div>';
    const notifyText = row.notify_text || 'Ativa as notificações e acompanha as redes para não perder a próxima live.';

    return `
      <article class="streamer-unified-card ${tone} ${live ? 'is-live' : ''}" data-streamer-id="${esc(row.id)}">
        <div class="streamer-card-top">
          <div class="streamer-card-photo-wrap">
            <div class="streamer-card-photo">
              ${mainPhoto}
            </div>
          </div>

          <div class="streamer-card-main">
            <p class="streamer-card-kicker"><span class="live-dot"></span>${live ? 'AO VIVO AGORA' : 'PERFIL OFICIAL'}</p>
            <h2 class="streamer-card-name ${nameClass(row.display_name)}">${esc(row.display_name || 'STREAMER')}</h2>
            <div class="streamer-card-meta"><span>${titleLine}</span><span>${gameLine}</span></div>
            <p class="streamer-card-bio">${esc(cleanDescription || 'Streamer oficial do Team Lambreta.')}</p>

            <div class="streamer-card-facts">
              ${row.game_nickname ? `<div class="streamer-fact"><small>NICK NO JOGO</small><strong>${esc(row.game_nickname)}</strong></div>` : ''}
              ${row.main_game ? `<div class="streamer-fact"><small>JOGO PRINCIPAL</small><strong>${esc(row.main_game)}</strong></div>` : ''}
            </div>
          </div>

          <aside class="streamer-card-socials">
            <h3>REDES SOCIAIS</h3>
            <div class="streamer-social-list">
              ${socials.length ? socials.map((social) => `
                <a class="streamer-social-chip ${platformClass(social.name)}" href="${esc(social.url)}" target="_blank" rel="noopener noreferrer">
                  <span class="streamer-social-icon">${platformIcon(social.name)}</span>
                  <strong>${esc(social.name)}</strong>
                  <b>→</b>
                </a>
              `).join('') : '<div class="streamer-social-empty">Redes em atualização</div>'}
            </div>
          </aside>
        </div>

        <div class="streamer-card-bottom">
          <section class="streamer-card-panel streamer-card-schedule">
            <h3><span>◔</span>HORÁRIOS DE LIVE</h3>
            <div class="streamer-schedule-list">${scheduleMarkup}</div>
          </section>

          <section class="streamer-card-panel streamer-card-notify">
            <h3><span>◉</span>NÃO PERCA A LIVE!</h3>
            <p>${esc(notifyText)}</p>
            <button class="streamer-panel-button streamer-panel-button--notify" type="button" data-streamer-notify data-streamer-name="${esc(row.display_name || 'Streamer')}">ATIVAR NOTIFICAÇÕES</button>
          </section>

          <section class="streamer-card-panel streamer-card-live">
            <div class="streamer-live-head">
              <h3><span class="live-dot"></span>AO VIVO AGORA</h3>
              <span>${esc(row.main_game || 'Fortnite')}</span>
            </div>
            <div class="streamer-live-preview">
              ${previewPhoto}
              <div class="streamer-live-overlay">
                <span>${esc(row.display_name || 'STREAMER')}</span>
                <strong>${live ? 'Acompanha a transmissão' : 'Veja quando estiver ao vivo'}</strong>
              </div>
            </div>
            <div class="streamer-live-cta">
              ${watchUrl ? `<a class="streamer-panel-button streamer-panel-button--watch" href="${esc(watchUrl)}" target="_blank" rel="noopener noreferrer">${watchLabel}</a>` : '<span class="streamer-panel-button streamer-panel-button--ghost">LIVE EM BREVE</span>'}
            </div>
          </section>
        </div>
      </article>
    `;
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
    await load();
    startCloudSync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
