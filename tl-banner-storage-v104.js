(() => {
  'use strict';
  if (window.TeamBannerStorage) return;

  const BUCKET = 'home-banners';
  const CONFIG_KEY = 'tl_home_banners';
  const SLOT_COUNT = 3;
  const client = window.teamSupabase;
  const diag = (code, description, context, error) => window.TeamDiagnostics?.error?.(code, 'banners', description, context, error);

  const normalizeConfig = value => {
    const bySlot = new Map((Array.isArray(value) ? value : []).map(item => [Number(item?.slot), item]));
    return Array.from({length:SLOT_COUNT}, (_, index) => {
      const slot = index + 1;
      const item = bySlot.get(slot) || (Array.isArray(value) ? value[index] : null) || {};
      const imageKey = String(item.imageKey || '').trim();
      const url = String(item.url || '').trim();
      return {
        slot,
        imageKey,
        url,
        link:String(item.link || '').trim(),
        active:Boolean(imageKey || url) && item.active !== false
      };
    });
  };

  const readConfig = async () => {
    if (!client) {
      const error = new Error('Cliente Supabase indisponível');
      diag('TL-BANNER-020', 'Supabase indisponível ao ler banners', {}, error);
      return normalizeConfig(null);
    }
    const {data, error} = await client.from('site_settings').select('value').eq('key', CONFIG_KEY).maybeSingle();
    if (error) {
      diag('TL-BANNER-021', 'Não foi possível ler a configuração global dos banners', {key:CONFIG_KEY}, error);
      return normalizeConfig(null);
    }
    return normalizeConfig(data?.value);
  };

  const writeConfig = async value => {
    if (!client) throw new Error('Cliente Supabase indisponível');
    const clean = normalizeConfig(value);
    const {data:{user}} = await client.auth.getUser();
    const {error} = await client.from('site_settings').upsert({
      key:CONFIG_KEY,
      value:clean,
      updated_by:user?.id || null,
      updated_at:new Date().toISOString()
    }, {onConflict:'key'});
    if (error) {
      diag('TL-BANNER-022', 'Não foi possível guardar a configuração global dos banners', {key:CONFIG_KEY}, error);
      throw error;
    }
    return clean;
  };

  const put = async (key, blob) => {
    if (!client) throw new Error('Cliente Supabase indisponível');
    const {error} = await client.storage.from(BUCKET).upload(key, blob, {
      contentType:blob?.type || 'image/webp',
      cacheControl:'3600',
      upsert:false
    });
    if (error) {
      diag('TL-BANNER-023', 'Não foi possível enviar o banner para o Supabase Storage', {key}, error);
      throw error;
    }
    return key;
  };

  const remove = async key => {
    if (!key || !client) return;
    const {error} = await client.storage.from(BUCKET).remove([key]);
    if (error) {
      diag('TL-BANNER-024', 'Não foi possível remover o banner do Supabase Storage', {key}, error);
      throw error;
    }
  };

  const getPublicUrl = key => {
    if (!key || !client) return '';
    const {data} = client.storage.from(BUCKET).getPublicUrl(key);
    return String(data?.publicUrl || '');
  };

  const resolveUrl = item => String(item?.url || '').trim() || getPublicUrl(item?.imageKey);

  const dataUrlToBlob = dataUrl => {
    const [meta, body] = String(dataUrl).split(',');
    const bytes = atob(body);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
    return new Blob([buffer], {type:/data:([^;]+)/i.exec(meta)?.[1] || 'image/webp'});
  };

  window.TeamBannerStorage = Object.freeze({
    BUCKET,
    CONFIG_KEY,
    SLOT_COUNT,
    normalizeConfig,
    readConfig,
    writeConfig,
    put,
    remove,
    getPublicUrl,
    resolveUrl,
    dataUrlToBlob
  });
})();
