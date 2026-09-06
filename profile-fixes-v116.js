(() => {
  'use strict';
  if (window.TeamProfileFixesV116) return;

  const sb = window.teamSupabase;
  const root = document.getElementById('profileRoot');
  if (!sb || !root) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const steamAppIds = Object.freeze({
    'counter-strike-2':'730',
    'grand-theft-auto-v':'271590',
    'dota-2':'570',
    'apex-legends':'1172470',
    'dead-by-daylight':'381210',
    'marvel-rivals':'2767030',
    'path-of-exile-2':'2694490',
    'rust':'252490',
    'rocket-league':'252950',
    'pubg-battlegrounds':'578080',
    'the-finals':'2073850',
    'destiny-2':'1085660',
    'warframe':'230410',
    'elden-ring':'1245620',
    'cyberpunk-2077':'1091500',
    'red-dead-redemption-2':'1174180',
    'brawlhalla':'291550',
    'street-fighter-6':'1364780',
    'tekken-8':'1778820',
    'teamfight-tactics':'',
    'starcraft-ii':'',
    'dayz':'221100',
    'terraria':'105600',
    'stardew-valley':'413150',
    'the-sims-4':'1222670',
    'no-mans-sky':'275850',
    'sea-of-thieves':'1172620',
    'helldivers-2':'553850',
    'war-thunder':'236390',
    'fall-guys':'1097150',
    'among-us':'945360',
    'phasmophobia':'739630',
    'lethal-company':'1966720',
    'content-warning':'2881650',
    'garrys-mod':'4000',
    'geometry-dash':'322170',
    'old-school-runescape':'1343370',
    'albion-online':'761890',
    'smite-2':'2437170',
    'delta-force':'2507950',
    'trackmania':'2225070',
    'path-of-exile':'238960',
    'balatro':'2379780',
    'halo-infinite':'1240440'
  });

  const officialCovers = Object.freeze({
    'minecraft':'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Minecraft_KeyArt_2024.jpg',
    'fortnite':'https://cdn2.unrealengine.com/fortnite-og-image-1920x1080-5e359e3cc6f7.jpg'
  });

  function coverFor(slug) {
    if (officialCovers[slug]) return officialCovers[slug];
    const appId = steamAppIds[slug];
    return appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : '';
  }

  async function currentContext() {
    const session = await window.TeamAuth?.getSession?.();
    if (!session?.user) return null;
    const userId = new URLSearchParams(location.search).get('user') || session.user.id;
    return { session, userId, own:userId === session.user.id };
  }

  function cleanDuplicateProfileActions(own) {
    root.querySelectorAll('.tl-profile-hero-actions-v106 a[href^="buddy.html"]').forEach(node => node.remove());
    if (!own) return;
    const friendsTab = root.querySelector('.tl-profile-tab-v106[data-target="#profileFriends"]');
    const friendsSection = root.querySelector('#profileFriends');
    friendsTab?.remove();
    friendsSection?.remove();
  }

  async function renderGames(userId) {
    const host = root.querySelector('.tl-profile-games-v106');
    if (!host) return;
    try {
      const [profile,catalog] = await Promise.all([
        window.TeamProfiles?.getPublicProfile?.(userId,{fresh:true}),
        window.TeamProfiles?.getCatalog?.()
      ]);
      if (!profile) return;
      const map = new Map((catalog?.games || []).map(game => [game.slug,game]));
      const chosen = (Array.isArray(profile.games) && profile.games.length ? profile.games : [profile.main_game].filter(Boolean)).slice(0,4);
      const cards = chosen.map(slug => {
        const item = map.get(slug) || {slug,name:String(slug || 'Jogo').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())};
        const cover = coverFor(slug);
        const fallback = String(item.short_name || item.name || slug || '?').trim().slice(0,12);
        return `<article class="tl-profile-game-card-v106 tl-profile-game-cover-v116">${cover ? `<img class="tl-profile-game-cover-image-v116" src="${esc(cover)}" alt="Capa de ${esc(item.name)}" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.classList.add('is-cover-fallback')">` : ''}<span class="tl-profile-game-cover-fallback-v116">${esc(fallback)}</span><span class="game-name">${esc(item.name || slug)}</span></article>`;
      });
      while (cards.length < 4) cards.push('<article class="tl-profile-game-card-v106 tl-profile-game-cover-v116 is-empty"><span class="tl-profile-game-cover-fallback-v116">—</span><span class="game-name">Sem jogo</span></article>');
      host.innerHTML = cards.join('');
    } catch (error) {
      console.error('[Profile V116 games]',error);
    }
  }

  async function syncFriendPresence() {
    const links = [...root.querySelectorAll('.tl-profile-friend-v106[href*="user="]')];
    const ids = [...new Set(links.map(link => {
      try { return new URL(link.href,location.href).searchParams.get('user') || ''; } catch { return ''; }
    }).filter(Boolean))];
    if (!ids.length) return;
    const {data,error} = await sb.from('profiles').select('id,presence,last_seen').in('id',ids);
    if (error) { console.error('[Profile V116 presence]',error); return; }
    const byId = new Map((data || []).map(row => [row.id,row]));
    links.forEach(link => {
      let id = '';
      try { id = new URL(link.href,location.href).searchParams.get('user') || ''; } catch {}
      const row = byId.get(id);
      const state = window.TeamPresence?.resolve?.(row || id) || 'offline';
      const dot = link.querySelector('.tl-profile-friend-status-v106');
      if (!dot) return;
      dot.className = `tl-profile-friend-status-v106 is-${state}`;
      dot.title = state === 'online' ? 'Online' : state === 'busy' ? 'Ocupado' : state === 'away' ? 'Ausente' : 'Offline';
    });
  }

  async function apply() {
    const context = await currentContext();
    if (!context || !root.querySelector('.tl-profile-content-v106')) return false;
    cleanDuplicateProfileActions(context.own);
    await Promise.all([renderGames(context.userId),syncFriendPresence()]);
    return true;
  }

  let applying = false;
  const observer = new MutationObserver(() => {
    if (applying || !root.querySelector('.tl-profile-content-v106')) return;
    applying = true;
    Promise.resolve(apply()).finally(() => { applying = false; });
  });
  observer.observe(root,{childList:true,subtree:true});

  window.addEventListener('tl:presence-peers',() => void syncFriendPresence());
  setInterval(() => void syncFriendPresence(),60000);
  void apply();

  window.TeamProfileFixesV116 = Object.freeze({apply,syncFriendPresence,renderGames});
})();