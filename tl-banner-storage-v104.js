(() => {
  'use strict';
  if (window.TeamBannerStorage) return;
  const DB = 'team-lambreta-banners-v104';
  const STORE = 'images';
  const CONFIG_KEY = 'tl_home_banners_v104';
  const SLOT_COUNT = 3;
  const diag = (code, description, context, error) => window.TeamDiagnostics?.error?.(code, 'banners', description, context, error);
  const open = () => new Promise((resolve, reject) => {
    if (!window.indexedDB) { const error = new Error('IndexedDB indisponível'); diag('TL-BANNER-010', 'IndexedDB não está disponível', {}, error); reject(error); return; }
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { diag('TL-BANNER-010', 'Erro ao abrir IndexedDB dos banners', {}, request.error); reject(request.error); };
  });
  const put = async (key, blob) => { const db = await open(); return new Promise((resolve, reject) => { const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, key); request.onsuccess = () => { db.close(); resolve(key); }; request.onerror = () => { db.close(); diag('TL-BANNER-011', 'Erro ao guardar Blob do banner', {key}, request.error); reject(request.error); }; }); };
  const get = async key => { const db = await open(); return new Promise((resolve, reject) => { const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); request.onsuccess = () => { db.close(); if (!request.result) diag('TL-BANNER-012', 'Blob do banner não encontrado', {key}); resolve(request.result || null); }; request.onerror = () => { db.close(); diag('TL-BANNER-013', 'Erro ao ler Blob do banner', {key}, request.error); reject(request.error); }; }); };
  const remove = async key => { if (!key) return; const db = await open(); return new Promise((resolve, reject) => { const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); request.onsuccess = () => { db.close(); resolve(); }; request.onerror = () => { db.close(); diag('TL-BANNER-013', 'Erro ao remover Blob do banner', {key}, request.error); reject(request.error); }; }); };
  const dataUrlToBlob = dataUrl => { const [meta, body] = String(dataUrl).split(','); const bytes = atob(body); const buffer = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i); return new Blob([buffer], {type: /data:([^;]+)/i.exec(meta)?.[1] || 'image/webp'}); };
  const revokeUrl = url => { try { if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url); } catch (error) { diag('TL-BANNER-014', 'Erro ao revogar URL temporária do banner', {url}, error); } };
  const normalizeConfig = value => {
    const bySlot = new Map((Array.isArray(value) ? value : []).map(item => [Number(item?.slot), item]));
    return Array.from({length:SLOT_COUNT}, (_, index) => {
      const slot = index + 1;
      const item = bySlot.get(slot) || (Array.isArray(value) ? value[index] : null) || {};
      return {slot, imageKey:String(item.imageKey || ''), imageKeyMobile:String(item.imageKeyMobile || ''), link:String(item.link || '').trim(), active:item.active !== false};
    });
  };
  const readConfig = () => {
    try { return normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null')); }
    catch (error) { diag('TL-BANNER-001', 'Não foi possível ler a configuração dos banners', {key:CONFIG_KEY}, error); return normalizeConfig(null); }
  };
  const writeConfig = value => {
    const clean = normalizeConfig(value);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
    return clean;
  };
  window.TeamBannerStorage = Object.freeze({CONFIG_KEY, SLOT_COUNT, normalizeConfig, readConfig, writeConfig, put, get, remove, dataUrlToBlob, revokeUrl, createUrl(blob) { try { return URL.createObjectURL(blob); } catch (error) { diag('TL-BANNER-014', 'Erro ao criar URL temporária do banner', {}, error); return ''; } }});
})();
