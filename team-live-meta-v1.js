(() => {
  'use strict';
  if (window.TeamLiveMeta) return;

  const sb = window.teamSupabase;
  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const needle = ref.replace(/^@/, '').trim().toLowerCase();
  const gameBadge = document.getElementById('liveGameBadge');
  const modeBadge = document.getElementById('liveModeBadge');
  const variantBadge = document.getElementById('liveVariantBadge');
  const gameButton = document.getElementById('liveGameSelectorBtn');
  const modeButton = document.getElementById('liveModeSelectorBtn');
  const variantButton = document.getElementById('liveVariantSelectorBtn');
  const gameMenu = document.getElementById('liveGameMenu');
  const modeMenu = document.getElementById('liveModeMenu');
  const variantMenu = document.getElementById('liveVariantMenu');
  if (!sb || !gameBadge || !modeBadge || !variantBadge) return;

  const DEFAULT_GAMES = ['Fortnite'];
  const DEFAULT_MODES = { Fortnite: ['Blitz', 'Battle Royale', 'Reload'] };
  const DEFAULT_VARIANTS = {
    'Fortnite::Blitz': ['Padrão'],
    'Fortnite::Battle Royale': ['Build', 'Zero Build'],
    'Fortnite::Reload': ['Padrão']
  };
  const MODE_AS_GAME = new Set(['blitz', 'battle royale', 'reload']);

  let currentGame = params.get('game') || 'Fortnite';
  let currentMode = 'Battle Royale';
  let currentVariant = 'Zero Build';
  let games = [...DEFAULT_GAMES];
  let modes = { ...DEFAULT_MODES };
  let variants = { ...DEFAULT_VARIANTS };
  let streamer = null;
  let channel = null;
  let canEdit = false;
  let canEditCatalog = false;

  const unique = values => [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))];
  const parseMode = value => {
    const raw = String(value || '').trim();
    if (!raw) return { mode:'Battle Royale', variant:'Zero Build' };
    const match = raw.match(/^(.*?)\s*\[(.*?)\]\s*$/);
    if (match) return { mode:match[1].trim() || 'Battle Royale', variant:match[2].trim() || 'Padrão' };
    return { mode:raw, variant:raw === 'Battle Royale' ? 'Zero Build' : 'Padrão' };
  };
  const serializeMode = (mode, variant) => {
    const cleanMode = String(mode || 'Battle Royale').trim() || 'Battle Royale';
    const cleanVariant = String(variant || '').trim();
    return cleanVariant && cleanVariant !== 'Padrão' ? `${cleanMode} [${cleanVariant}]` : cleanMode;
  };
  const modesFor = game => unique(modes[game] || DEFAULT_MODES[game] || ['Padrão']);
  const variantsFor = (game, mode) => unique(variants[`${game}::${mode}`] || DEFAULT_VARIANTS[`${game}::${mode}`] || ['Padrão']);

  function setGame(value) {
    currentGame = String(value || 'Fortnite').trim() || 'Fortnite';
    gameBadge.textContent = currentGame;
  }
  function setMode(value) {
    currentMode = String(value || 'Battle Royale').trim() || 'Battle Royale';
    modeBadge.textContent = currentMode;
  }
  function setVariant(value) {
    const available = variantsFor(currentGame, currentMode);
    const requested = String(value || available[0] || 'Padrão').trim() || 'Padrão';
    currentVariant = available.includes(requested) ? requested : (available[0] || 'Padrão');
    variantBadge.textContent = currentVariant;
  }
  function applyValues(game, rawMode) {
    let safeGame = String(game || '').trim();
    let safeMode = rawMode;
    if (MODE_AS_GAME.has(safeGame.toLowerCase())) {
      safeMode = safeMode || safeGame;
      safeGame = 'Fortnite';
    }
    if (safeGame) setGame(safeGame);
    const parsed = parseMode(safeMode);
    setMode(parsed.mode.toLowerCase() === 'fortnite' ? 'Battle Royale' : parsed.mode);
    setVariant(parsed.variant);
  }

  function openMenu(button, menu, open) {
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
  }
  function closeMenus() {
    openMenu(gameButton, gameMenu, false);
    openMenu(modeButton, modeMenu, false);
    openMenu(variantButton, variantMenu, false);
  }
  function makeOption(label, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `live-meta-menu-option live-meta-menu-option--${kind}`;
    button.textContent = label;
    return button;
  }
  function streamerHandle() {
    const direct = String(streamer?.tiktok_username || '').replace(/^@/, '').trim();
    if (direct) return direct;
    const match = String(streamer?.tiktok_url || streamer?.live_url || '').match(/tiktok\.com\/@([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]).replace(/^@/, '') : needle;
  }

  async function save(nextGame, nextMode, nextVariant) {
    if (!canEdit || !streamer) return false;
    const previous = { game:currentGame, mode:currentMode, variant:currentVariant };
    setGame(nextGame); setMode(nextMode); setVariant(nextVariant); renderMenus();
    const { data, error } = await sb.rpc('tl_set_streamer_live_info', {
      p_streamer: streamerHandle(),
      p_game: nextGame,
      p_mode: serializeMode(nextMode, nextVariant)
    });
    if (error) {
      console.warn('[TL Live Meta] atualização recusada:', error.message);
      setGame(previous.game); setMode(previous.mode); setVariant(previous.variant); renderMenus();
      return false;
    }
    const saved = data && typeof data === 'object' ? data : null;
    applyValues(saved?.game || nextGame, saved?.mode || serializeMode(nextMode, nextVariant));
    renderMenus();
    return true;
  }

  async function registerGame() {
    if (!canEditCatalog) return;
    const name = window.prompt('Nome do novo jogo:');
    if (!name?.trim()) return;
    const { error } = await sb.rpc('tl_register_live_game', { p_name:name.trim() });
    if (!error) await loadCatalog();
  }
  async function registerMode() {
    if (!canEditCatalog) return;
    const name = window.prompt(`Novo modo para ${currentGame}:`);
    if (!name?.trim()) return;
    const { error } = await sb.rpc('tl_register_live_mode', { p_game:currentGame, p_name:name.trim() });
    if (!error) await loadCatalog();
  }

  function renderMenus() {
    [gameButton, modeButton, variantButton].forEach(button => button?.classList.toggle('is-editable', canEdit));
    if (gameMenu) {
      gameMenu.innerHTML = '<div class="live-meta-menu-title">SELECIONAR JOGO</div>';
      games.forEach(game => {
        const button = makeOption(game, 'game');
        button.addEventListener('click', async () => {
          const mode = modesFor(game)[0] || 'Padrão';
          await save(game, mode, variantsFor(game, mode)[0] || 'Padrão');
          closeMenus();
        });
        gameMenu.appendChild(button);
      });
      if (canEditCatalog) {
        const button = makeOption('＋  Cadastrar jogo', 'register');
        button.classList.add('is-admin-action');
        button.addEventListener('click', registerGame);
        gameMenu.appendChild(button);
      }
    }
    if (modeMenu) {
      modeMenu.innerHTML = `<div class="live-meta-menu-title">MODOS DISPONÍVEIS EM ${currentGame.toUpperCase()}</div>`;
      modesFor(currentGame).forEach(mode => {
        const button = makeOption(mode, 'mode');
        button.addEventListener('click', async () => {
          await save(currentGame, mode, variantsFor(currentGame, mode)[0] || 'Padrão');
          closeMenus();
        });
        modeMenu.appendChild(button);
      });
      if (canEditCatalog) {
        const button = makeOption('＋  Cadastrar modo', 'register');
        button.classList.add('is-admin-action');
        button.addEventListener('click', registerMode);
        modeMenu.appendChild(button);
      }
    }
    if (variantMenu) {
      variantMenu.innerHTML = `<div class="live-meta-menu-title">TIPOS DISPONÍVEIS PARA ${currentMode.toUpperCase()}</div>`;
      variantsFor(currentGame, currentMode).forEach(variant => {
        const button = makeOption(variant, 'variant');
        button.addEventListener('click', async () => {
          await save(currentGame, currentMode, variant);
          closeMenus();
        });
        variantMenu.appendChild(button);
      });
    }
  }

  async function refreshPermissions() {
    canEdit = Boolean(await window.TeamPermissions?.can?.('live.moderate'));
    canEditCatalog = Boolean(await window.TeamPermissions?.can?.('admin.full'));
    renderMenus();
  }

  async function loadCatalog() {
    const [{ data:gameRows }, { data:modeRows }] = await Promise.all([
      sb.from('live_game_catalog').select('name').eq('is_active', true).order('sort_order').order('name'),
      sb.from('live_mode_catalog').select('game_name,name').eq('is_active', true).order('sort_order').order('name')
    ]);
    const activeGames = unique((gameRows || []).map(row => row.name).filter(name => !MODE_AS_GAME.has(String(name || '').toLowerCase())));
    if (activeGames.length) games = activeGames;
    if (modeRows?.length) {
      const grouped = {};
      modeRows.forEach(row => {
        const game = String(row.game_name || '').trim();
        const mode = String(row.name || '').trim();
        if (game && mode && !MODE_AS_GAME.has(game.toLowerCase())) (grouped[game] ||= []).push(mode);
      });
      modes = { ...modes, ...grouped };
    }
    renderMenus();
  }

  async function loadStreamer() {
    const columns = 'id,display_name,main_game,live_game_mode,tiktok_username,tiktok_url,live_url,is_published,is_archived';
    let result;
    if (/^[0-9a-f-]{36}$/i.test(ref)) {
      result = await sb.from('streamers').select(columns).eq('id', ref).eq('is_published', true).eq('is_archived', false).maybeSingle();
    } else {
      const all = await sb.from('streamers').select(columns).eq('is_published', true).eq('is_archived', false);
      result = {
        error: all.error,
        data: (all.data || []).find(row => `${row.tiktok_username || ''} ${row.tiktok_url || ''} ${row.live_url || ''} ${row.display_name || ''}`.toLowerCase().includes(needle)) || null
      };
    }
    if (result.error || !result.data) return;
    streamer = result.data;
    applyValues(streamer.main_game, streamer.live_game_mode);
    renderMenus();
    if (channel) sb.removeChannel(channel);
    channel = sb.channel(`team-live-meta-${streamer.id}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'streamers', filter:`id=eq.${streamer.id}` }, payload => {
        streamer = { ...streamer, ...payload.new };
        applyValues(streamer.main_game, streamer.live_game_mode);
        renderMenus();
      })
      .subscribe();
  }

  gameButton?.addEventListener('click', event => {
    if (!canEdit) return;
    event.stopPropagation();
    const open = gameMenu?.hidden !== false;
    closeMenus(); renderMenus(); openMenu(gameButton, gameMenu, open);
  });
  modeButton?.addEventListener('click', event => {
    if (!canEdit) return;
    event.stopPropagation();
    const open = modeMenu?.hidden !== false;
    closeMenus(); renderMenus(); openMenu(modeButton, modeMenu, open);
  });
  variantButton?.addEventListener('click', event => {
    if (!canEdit) return;
    event.stopPropagation();
    const open = variantMenu?.hidden !== false;
    closeMenus(); renderMenus(); openMenu(variantButton, variantMenu, open);
  });
  document.addEventListener('click', event => { if (!event.target.closest('.live-meta-inline')) closeMenus(); });
  window.addEventListener('tl:permissions', refreshPermissions);
  window.TeamAuth?.subscribe(() => setTimeout(refreshPermissions, 0));
  window.addEventListener('beforeunload', () => { if (channel) sb.removeChannel(channel); });

  const initial = parseMode(params.get('mode'));
  setGame(currentGame); setMode(initial.mode); setVariant(initial.variant);
  Promise.allSettled([loadCatalog(), loadStreamer()]);
  window.TeamLiveMeta = Object.freeze({ refresh:loadStreamer });
})();