(() => {
  'use strict';

  const TARGET_W = 1536;
  const TARGET_H = 1024;
  const cache = new Map();
  let streamerRows = null;

  const sb = window.teamSupabase;
  if (!sb) return;

  const keyOf = value => String(value || '').trim().toLowerCase();

  async function loadRows() {
    if (streamerRows) return streamerRows;
    const { data, error } = await sb.from('streamers')
      .select('id,display_name,game_nickname,photo_url,home_card_photo_url')
      .eq('is_published', true)
      .eq('is_archived', false);
    if (error) throw error;
    streamerRows = data || [];
    return streamerRows;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawEdgeExtension(ctx, img, dx, dy, dw, dh) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;

    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, TARGET_W, TARGET_H);

    // Estende apenas as bordas reais da arte. Sem blur, sem cor inventada.
    if (dx > 0.5) {
      const strip = Math.max(2, Math.round(sw * 0.08));
      ctx.drawImage(img, 0, 0, strip, sh, 0, 0, dx + 2, TARGET_H);
      ctx.drawImage(img, sw - strip, 0, strip, sh, dx + dw - 2, 0, TARGET_W - (dx + dw) + 2, TARGET_H);
    }

    if (dy > 0.5) {
      const strip = Math.max(2, Math.round(sh * 0.08));
      ctx.drawImage(img, 0, 0, sw, strip, 0, 0, TARGET_W, dy + 2);
      ctx.drawImage(img, 0, sh - strip, sw, strip, 0, dy + dh - 2, TARGET_W, TARGET_H - (dy + dh) + 2);
    }

    ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
  }

  async function makeExtended(src) {
    if (cache.has(src)) return cache.get(src);
    const promise = (async () => {
      const img = await loadImage(src);
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      if (!sw || !sh) return src;

      const scale = Math.min(TARGET_W / sw, TARGET_H / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (TARGET_W - dw) / 2;
      const dy = (TARGET_H - dh) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return src;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      drawEdgeExtension(ctx, img, dx, dy, dw, dh);
      return canvas.toDataURL('image/jpeg', 0.92);
    })().catch(() => src);
    cache.set(src, promise);
    return promise;
  }

  function findRowForCard(card, rows) {
    const title = keyOf(card.querySelector('.home101-streamer-top h3')?.textContent);
    return rows.find(row => keyOf(row.display_name) === title || keyOf(row.game_nickname) === title) || null;
  }

  async function upgradeCard(card, rows) {
    if (!card || card.dataset.homeCardPrepared === '1') return;
    const row = findRowForCard(card, rows);
    const img = card.querySelector('.smart-media > img');
    const bg = card.querySelector('.smart-media-bg');
    if (!row || !img) return;

    card.dataset.homeCardPrepared = '1';
    if (bg) bg.style.display = 'none';

    const dedicated = String(row.home_card_photo_url || '').trim();
    if (dedicated) {
      img.src = dedicated;
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center';
      return;
    }

    const original = String(row.photo_url || img.currentSrc || img.src || '').trim();
    if (!original) return;
    const extended = await makeExtended(original);
    if (extended) {
      img.src = extended;
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center';
    }
  }

  async function refresh() {
    const grid = document.getElementById('homeLiveGrid');
    if (!grid) return;
    let rows;
    try { rows = await loadRows(); }
    catch (error) { console.warn('[HOME CARD]', error); return; }
    grid.querySelectorAll('.home101-streamer-card').forEach(card => upgradeCard(card, rows));
  }

  function boot() {
    refresh();
    const grid = document.getElementById('homeLiveGrid');
    if (!grid) return;
    new MutationObserver(refresh).observe(grid, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
