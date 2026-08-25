(() => {
  'use strict';
  if (window.TeamVisualImages) return;

  const CACHE_KEY = 'tl_visual_collections_v103';
  const CACHE_TTL = 10 * 60 * 1000;
  const promises = new Map();
  const ready = new Set();

  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, location.href);
      return ['http:', 'https:', 'data:', 'blob:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function preload(value) {
    const url = safeUrl(value);
    if (!url) return Promise.resolve(false);
    if (promises.has(url)) return promises.get(url);
    const request = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try { await image.decode?.(); } catch {}
        const valid = Boolean(image.naturalWidth && image.naturalHeight);
        if (valid) ready.add(url);
        resolve(valid);
      };
      image.onerror = () => resolve(false);
      image.src = url;
      if (image.complete && image.naturalWidth) { ready.add(url); resolve(true); }
    });
    promises.set(url, request);
    return request;
  }

  async function preloadAll(values) {
    const unique = [...new Set((values || []).map(safeUrl).filter(Boolean))];
    const results = await Promise.all(unique.map(async url => [url, await preload(url)]));
    return new Map(results);
  }

  function readCollection(name) {
    try {
      const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
      const entry = cache[name];
      return entry && Date.now() - Number(entry.savedAt || 0) < CACHE_TTL && Array.isArray(entry.items)
        ? entry.items
        : null;
    } catch { return null; }
  }

  function writeCollection(name, items) {
    if (!name || !Array.isArray(items)) return;
    try {
      const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}') || {};
      cache[name] = { savedAt: Date.now(), items };
      const entries = Object.entries(cache)
        .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0))
        .slice(0, 8);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {}
  }

  async function swap(image, value) {
    const url = safeUrl(value);
    if (!image || !url || image.src === url) return Boolean(url);
    if (!await preload(url)) return false;
    image.src = url;
    image.hidden = false;
    return true;
  }

  window.TeamVisualImages = Object.freeze({ safeUrl, preload, preloadAll, isReady:value => ready.has(safeUrl(value)), readCollection, writeCollection, swap });
})();
