(() => {
  'use strict';
  if (window.TeamProfiles) return;

  const client = window.teamSupabase;
  const CACHE_KEY = 'tl_profile_cache_v102';
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const memory = new Map();

  const cleanRole = value => String(value || 'member').trim().toLowerCase();
  const displayName = profile => profile?.forum_nickname || profile?.game_nickname_public || profile?.game_nickname || profile?.full_name || 'Membro Lambreta';
  const fallbackAvatar = profile => {
    const name = displayName(profile).trim();
    return name ? name.slice(0, 2).toUpperCase() : 'TL';
  };
  const merge = (base, forum) => ({
    ...(base || {}),
    ...(forum || {}),
    id: base?.id || forum?.user_id,
    user_id: forum?.user_id || base?.id,
    role: cleanRole(base?.role),
    display_name: displayName({ ...(base || {}), ...(forum || {}) })
  });

  function readCache(userId) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return cached?.userId === userId && Date.now() - cached.savedAt < CACHE_TTL ? cached.profile : null;
    } catch { return null; }
  }

  function readLastCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.profile && Date.now() - cached.savedAt < CACHE_TTL) return cached.profile;
      const legacy = JSON.parse(localStorage.getItem('tl_profile_cache_v100') || 'null');
      return legacy?.id ? { ...legacy, display_name: displayName(legacy), avatar_display_url: legacy.custom_avatar_url || legacy.avatar_url || '', avatar_fallback: fallbackAvatar(legacy) } : null;
    } catch { return null; }
  }

  function writeCache(profile) {
    if (!profile?.id) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: profile.id, savedAt: Date.now(), profile }));
    window.dispatchEvent(new CustomEvent('tl:profile', { detail: { profile } }));
  }

  async function signedAvatar(path) {
    if (!path || !client) return '';
    const { data, error } = await client.storage.from('forum-avatars').createSignedUrl(path, 3600);
    return error ? '' : data?.signedUrl || '';
  }

  async function hydrateAvatar(profile) {
    if (!profile) return profile;
    profile.avatar_display_url = profile.avatar_external_url || (await signedAvatar(profile.avatar_path)) || profile.custom_avatar_url || profile.avatar_url || '';
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
    if (!session?.user) throw new Error('É necessário iniciar sessão.');
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
    if (error) throw error;
    memory.delete(session.user.id);
    return getCurrentProfile({ fresh: true });
  }

  async function uploadAvatar(file) {
    const session = await window.TeamAuth?.getSession();
    if (!session?.user) throw new Error('É necessário iniciar sessão.');
    if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      throw new Error('Escolhe uma imagem JPG, PNG, WEBP ou GIF até 2 MB.');
    }
    const extension = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${session.user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await client.storage.from('forum-avatars').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return path;
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
    getProfile, getPublicProfile, getCurrentProfile, updateProfile, uploadAvatar, getCatalog,
    getAvatarUrl: profile => profile?.avatar_display_url || profile?.avatar_external_url || profile?.custom_avatar_url || profile?.avatar_url || '',
    getRole: profile => cleanRole(profile?.role), getProfileStats, displayName, readCurrentCache: userId => readCache(userId), readLastCache, clearCurrentCache
  });
})();
