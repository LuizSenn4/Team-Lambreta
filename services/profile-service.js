(() => {
  'use strict';
  if (window.TeamProfiles) return;

  const client = window.teamSupabase;
  const CACHE_KEY = 'tl_profile_cache_v102';
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const SIGNED_AVATAR_TTL_SECONDS = 48 * 60 * 60;
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  const MAX_AVATAR_SIDE = 1200;
  const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const ERRORS = Object.freeze({
    'PRF-001':'Arquivo inválido.', 'PRF-002':'Formato de imagem não suportado.',
    'PRF-003':'Falha ao processar/comprimir imagem.', 'PRF-004':'Imagem permaneceu acima de 2 MB.',
    'PRF-005':'Falha no upload do avatar.', 'PRF-006':'Upload ocorreu, mas o avatar não foi persistido no perfil.',
    'PRF-007':'Falha ao guardar perfil.', 'PRF-008':'Sessão inválida ou expirada.',
    'PRF-009':'Perfil não encontrado.', 'PRF-010':'Falha ao carregar perfil.',
    'PRF-011':'Falha ao atualizar Preview.', 'PRF-012':'Operação não autorizada.'
  });
  const memory = new Map();

  class ProfileError extends Error {
    constructor(code, technicalError) {
      super(ERRORS[code] || 'Não foi possível guardar a alteração.');
      this.name = 'ProfileError'; this.code = code; this.cause = technicalError;
    }
  }
  const profileError = (code, error) => {
    console.error(`[PROFILE ${code}]`, { message:error?.message || String(error || ERRORS[code]) });
    return error instanceof ProfileError ? error : new ProfileError(code, error);
  };

  const cleanRole = value => String(value || 'member').trim().toLowerCase();
  const displayName = profile => profile?.forum_nickname || profile?.game_nickname_public || profile?.game_nickname || profile?.full_name || 'Membro Lambreta';
  const fallbackAvatar = profile => {
    const name = displayName(profile).trim();
    return name ? name.slice(0, 2).toUpperCase() : 'TL';
  };
  const visualProfile = profile => profile ? ({
    id:profile.id,
    user_id:profile.user_id || profile.id,
    display_name:profile.display_name,
    avatar_inline_url:/^data:image\/(?:webp|png|jpeg);base64,/i.test(profile.avatar_inline_url || '') ? profile.avatar_inline_url : '',
    avatar_display_url:profile.avatar_display_url || '',
    avatar_display_expires_at:Number(profile.avatar_display_expires_at || 0),
    avatar_external_url:profile.avatar_external_url || '',
    avatar_path:profile.avatar_path || '',
    custom_avatar_url:profile.custom_avatar_url || '',
    avatar_url:profile.avatar_url || '',
    avatar_fallback:profile.avatar_fallback || ''
  }) : null;

  function parseStoredSession(raw) {
    try {
      let value = String(raw || '');
      if (value.startsWith('base64-')) {
        const encoded = value.slice(7).replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
        value = new TextDecoder().decode(bytes);
      }
      const stored = JSON.parse(value || 'null');
      return stored?.user?.id || stored?.session?.user?.id || stored?.currentSession?.user?.id || '';
    } catch { return ''; }
  }

  function persistedSessionUserId() {
    try {
      const projectRef = new URL(client?.supabaseUrl || '').hostname.split('.')[0];
      if (!projectRef) return '';
      const expectedKey = client?.auth?.storageKey || `sb-${projectRef}-auth-token`;
      const expectedUser = parseStoredSession(localStorage.getItem(expectedKey));
      if (expectedUser) return expectedUser;
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const userId = parseStoredSession(localStorage.getItem(key));
          if (userId) return userId;
        }
      }
      return '';
    } catch { return ''; }
  }
  const merge = (base, forum) => ({
    ...(base || {}),
    ...(forum || {}),
    id: base?.id || forum?.user_id,
    user_id: forum?.user_id || base?.id,
    role: cleanRole(base?.role),
    display_name: displayName({ ...(base || {}), ...(forum || {}) })
  });
  const avatarIdentity = profile => String(profile?.avatar_external_url || profile?.avatar_path || profile?.custom_avatar_url || profile?.avatar_url || profile?.avatar_display_url || '');

  async function createInlineAvatar(url) {
    if (!/^https?:/i.test(url || '')) return '';
    try {
      const response = await fetch(url, { cache:'force-cache', credentials:'omit' });
      if (!response.ok) return '';
      const bitmap = await createImageBitmap(await response.blob());
      const size = 64;
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d', { alpha:false });
      const scale = Math.max(size / bitmap.width, size / bitmap.height);
      const width = bitmap.width * scale, height = bitmap.height * scale;
      context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
      bitmap.close?.();
      return canvas.toDataURL('image/webp', .86);
    } catch { return ''; }
  }

  function readCache(userId) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if(cached?.userId !== userId || Date.now() - cached.savedAt >= CACHE_TTL)return null;
      const visual=visualProfile(cached.profile);
      localStorage.setItem(CACHE_KEY,JSON.stringify({...cached,profile:visual}));
      return visual;
    } catch { return null; }
  }

  function readLastCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      const persistedUserId = persistedSessionUserId();
      if (!persistedUserId) return null;
      if (cached?.userId === persistedUserId && cached?.profile && Date.now() - cached.savedAt < CACHE_TTL) {
        const visual=visualProfile(cached.profile);
        localStorage.setItem(CACHE_KEY,JSON.stringify({...cached,profile:visual}));
        return visual;
      }
      const legacy = JSON.parse(localStorage.getItem('tl_profile_cache_v100') || 'null');
      return legacy?.id === persistedUserId ? visualProfile({ ...legacy, display_name: displayName(legacy), avatar_display_url: legacy.custom_avatar_url || legacy.avatar_url || '', avatar_fallback: fallbackAvatar(legacy) }) : null;
    } catch { return null; }
  }

  function writeCache(profile) {
    if (!profile?.id) return;
    const visual = visualProfile(profile);
    try {
      const previous = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (previous?.userId === profile.id && avatarIdentity(previous.profile) === avatarIdentity(profile)) {
        visual.avatar_inline_url = previous.profile?.avatar_inline_url || '';
      }
    } catch {}
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: profile.id, savedAt: Date.now(), profile:visual }));
    if (!visual.avatar_inline_url && visual.avatar_display_url) {
      const identity = avatarIdentity(visual);
      createInlineAvatar(visual.avatar_display_url).then(inlineUrl => {
        if (!inlineUrl) return;
        try {
          const current = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
          if (current?.userId !== profile.id || avatarIdentity(current.profile) !== identity) return;
          current.profile = { ...current.profile, avatar_inline_url:inlineUrl };
          localStorage.setItem(CACHE_KEY, JSON.stringify(current));
        } catch {}
      });
    }
    window.dispatchEvent(new CustomEvent('tl:profile', { detail: { profile } }));
  }

  async function signedAvatar(path) {
    if (!path || !client) return '';
    const { data, error } = await client.storage.from('forum-avatars').createSignedUrl(path, SIGNED_AVATAR_TTL_SECONDS);
    return error ? '' : data?.signedUrl || '';
  }

  async function hydrateAvatar(profile) {
    if (!profile) return profile;
    const signedUrl = profile.avatar_external_url ? '' : await signedAvatar(profile.avatar_path);
    profile.avatar_display_url = profile.avatar_external_url || signedUrl || profile.custom_avatar_url || profile.avatar_url || '';
    profile.avatar_display_expires_at = signedUrl ? Date.now() + SIGNED_AVATAR_TTL_SECONDS * 1000 : 0;
    profile.avatar_fallback = fallbackAvatar(profile);
    return profile;
  }

  async function getProfile(userId, options = {}) {
    if (!client || !userId) return null;
    if (!options.fresh && memory.has(userId)) return memory.get(userId);
    const [baseResult, forumResult] = await Promise.all([
      client.from('profiles').select('*').eq('id', userId).maybeSingle(),
      client.from('forum_profiles').select('*').eq('user_id', userId).maybeSingle()
    ]);
    if (baseResult.error) throw baseResult.error;
    // forum_profiles pode estar restrita a membros autenticados; o perfil base
    // continua a ser uma degradação pública segura quando a política negar acesso.
    if (forumResult.error && !['PGRST116', '42501'].includes(forumResult.error.code)) throw forumResult.error;
    if (!baseResult.data && !forumResult.data) return null;
    const profile = await hydrateAvatar(merge(baseResult.data, forumResult.data));
    memory.set(userId, profile);
    return profile;
  }

  async function getCurrentProfile(options = {}) {
    const session = await window.TeamAuth?.getSession();
    if (!session?.user) return null;
    if (!options.fresh) {
      const cached = memory.get(session.user.id) || readCache(session.user.id);
      if (cached) {
        memory.set(session.user.id, cached);
        if (options.cacheOnly) return cached;
      }
    }
    const profile = await getProfile(session.user.id, options);
    writeCache(profile);
    return profile;
  }

  async function getPublicProfile(userId) {
    return getProfile(userId);
  }

  async function getCatalog() {
    if (!client) return { games: [], platforms: [] };
    const { data, error } = await client.from('forum_game_catalog').select('slug,name,short_name,aliases,modes,sort_order').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return {
      games: data || [],
      platforms: [
        ['pc', 'PC'], ['playstation-5', 'PlayStation 5'], ['playstation-4', 'PlayStation 4'],
        ['xbox-series', 'Xbox Series'], ['xbox-one', 'Xbox One'], ['nintendo-switch', 'Nintendo Switch'],
        ['nintendo-switch-2', 'Nintendo Switch 2'], ['android', 'Android'], ['ios', 'iOS'], ['cloud-gaming', 'Cloud Gaming']
      ].map(([slug, name]) => ({ slug, name }))
    };
  }

  async function updateProfile(input) {
    const session = await window.TeamAuth?.getSession();
    if (!session?.user) throw profileError('PRF-008');
    const games = [...new Set(input.games || [])].slice(0, 3);
    const { data, error } = await client.rpc('tl_forum_save_profile_v2', {
      p_nickname: String(input.nickname || '').trim(),
      p_avatar_path: input.avatarPath || null,
      p_avatar_external_url: input.avatarExternalUrl || null,
      p_country: input.country || '',
      p_games: games,
      p_platforms: [...new Set(input.platforms || [])],
      p_game_modes: [...new Set(input.gameModes || [])].filter(mode => games.includes(String(mode).split('::')[0])),
      p_bio: input.bio || '',
      p_discord: input.discord || '',
      p_cover_preset: input.coverPreset || 'cover_green_black'
    });
    if (error) throw profileError(error.code === '42501' ? 'PRF-012' : 'PRF-007', error);
    memory.delete(session.user.id);
    return getCurrentProfile({ fresh: true });
  }

  async function uploadAvatar(file) {
    const session = await window.TeamAuth?.getSession();
    if (!session?.user) throw profileError('PRF-008');
    if (!(file instanceof Blob) || !file.size) throw profileError('PRF-001');
    if (!AVATAR_TYPES.has(file.type)) throw profileError('PRF-002');
    if (file.size > MAX_AVATAR_BYTES) throw profileError('PRF-004');
    const extension = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${session.user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await client.storage.from('forum-avatars').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw profileError(error.code === '42501' ? 'PRF-012' : 'PRF-005', error);
    return path;
  }

  async function prepareAvatar(file, options = {}) {
    const stage = value => options.onStage?.(value);
    if (!(file instanceof Blob) || !file.size) throw profileError('PRF-001');
    if (!AVATAR_TYPES.has(file.type)) throw profileError('PRF-002');
    stage('processing');
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      if (!bitmap.width || !bitmap.height) throw new Error('Dimensões inválidas.');
      if (file.size <= MAX_AVATAR_BYTES && Math.max(bitmap.width, bitmap.height) <= MAX_AVATAR_SIDE) {
        bitmap.close?.(); return file;
      }
      let width = bitmap.width, height = bitmap.height;
      const initialScale = Math.min(1, MAX_AVATAR_SIDE / Math.max(width, height));
      width = Math.max(1, Math.round(width * initialScale)); height = Math.max(1, Math.round(height * initialScale));
      const canvas = document.createElement('canvas');
      const encode = (quality, scale = 1) => new Promise((resolve, reject) => {
        canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d', { alpha:true });
        if (!context) return reject(new Error('Canvas indisponível.'));
        context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao codificar imagem.')), 'image/webp', quality);
      });
      let output = null;
      for (const scale of [1, .9, .8, .7, .6]) {
        for (const quality of [.9, .82, .74, .66, .58, .5]) {
          output = await encode(quality, scale);
          if (output.size <= MAX_AVATAR_BYTES) break;
        }
        if (output?.size <= MAX_AVATAR_BYTES) break;
      }
      bitmap.close?.();
      if (!output || output.size > MAX_AVATAR_BYTES) throw profileError('PRF-004');
      const originalName = String(file.name || 'avatar').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-');
      return new File([output], `${originalName || 'avatar'}.webp`, { type:'image/webp', lastModified:Date.now() });
    } catch (error) {
      bitmap?.close?.();
      if (error instanceof ProfileError) throw error;
      throw profileError('PRF-003', error);
    }
  }

  async function saveAvatar(file, profileInput, options = {}) {
    const stage = value => options.onStage?.(value);
    const prepared = await prepareAvatar(file, { onStage:stage });
    options.onPrepared?.(prepared);
    stage('uploading');
    const path = await uploadAvatar(prepared);
    let saved;
    try {
      saved = await updateProfile({ ...profileInput, avatarPath:path, avatarExternalUrl:null });
    } catch (error) {
      throw profileError('PRF-006', error);
    }
    if (!saved || saved.avatar_path !== path) throw profileError('PRF-006');
    stage('saved');
    return { profile:saved, path, file:prepared };
  }

  async function getProfileStats(userId) {
    if (!client || !userId) return { topics: 0, replies: 0, xp: 0, likes: 0 };
    const session = await window.TeamAuth?.getSession();
    const [base, stats] = await Promise.all([
      client.from('profiles').select('created_at').eq('id', userId).maybeSingle(),
      session ? client.rpc('tl_forum_profile_stats') : Promise.resolve({ data: [] })
    ]);
    const row = (stats.data || []).find(item => item.user_id === userId) || {};
    return { topics: Number(row.forum_topics || 0), replies: Number(row.forum_replies || 0), xp: Number(row.xp || 0), level: Math.max(1, Math.floor(Number(row.xp || 0) / 100) + 1), memberSince: base.data?.created_at || null };
  }

  function clearCurrentCache() {
    localStorage.removeItem(CACHE_KEY);
    memory.clear();
  }

  window.TeamProfiles = Object.freeze({
    ERRORS, ProfileError, getProfile, getPublicProfile, getCurrentProfile, updateProfile, prepareAvatar, uploadAvatar, saveAvatar, getCatalog,
    getAvatarUrl: profile => {
      const expiresAt = Number(profile?.avatar_display_expires_at || 0);
      const displayUrl = !expiresAt || expiresAt > Date.now() + 30_000 ? profile?.avatar_display_url : '';
      return profile?.avatar_inline_url || displayUrl || profile?.avatar_external_url || profile?.custom_avatar_url || profile?.avatar_url || '';
    },
    getRole: profile => cleanRole(profile?.role), getProfileStats, displayName, readCurrentCache: userId => readCache(userId), readLastCache, clearCurrentCache
  });
})();
