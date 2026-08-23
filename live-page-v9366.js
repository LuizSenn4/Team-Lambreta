(() => {
  const params = new URLSearchParams(location.search);
  const username = (params.get('user') || 'rv3113').replace(/^@/, '').trim();
  const displayName = params.get('name') || username || 'Streamer';
  const queryGame = params.get('game') || 'Fortnite';
  const queryModeRaw = params.get('mode') || 'Battle Royale [Zero Build]';
  const iframe = document.getElementById('tiktokLivePlayer');
  const fallback = document.getElementById('livePlayerFallback');
  const fallbackTitle = document.getElementById('liveFallbackTitle');
  const fallbackText = document.getElementById('liveFallbackText');
  const title = document.getElementById('liveWatchTitle');
  const gameBadge = document.getElementById('liveGameBadge');
  const modeBadge = document.getElementById('liveModeBadge');
  const variantBadge = document.getElementById('liveVariantBadge');
  const gameSelectorBtn = document.getElementById('liveGameSelectorBtn');
  const modeSelectorBtn = document.getElementById('liveModeSelectorBtn');
  const variantSelectorBtn = document.getElementById('liveVariantSelectorBtn');
  const gameMenu = document.getElementById('liveGameMenu');
  const modeMenu = document.getElementById('liveModeMenu');
  const variantMenu = document.getElementById('liveVariantMenu');
  if (!iframe) return;

  const liveSb = window.teamSupabase;

  const FALLBACK_GAMES = ['Fortnite'];
  const FALLBACK_MODES = {
    'Fortnite': ['Blitz', 'Battle Royale', 'Reload']
  };
  const FALLBACK_VARIANTS = {
    'Fortnite::Blitz': ['Padrão'],
    'Fortnite::Battle Royale': ['Build', 'Zero Build'],
    'Fortnite::Reload': ['Padrão']
  };
  const MODE_AS_GAMES = new Set(['blitz', 'battle royale', 'reload']);

  function unique(values) {
    return [...new Set((values || []).map(v => String(v || '').trim()).filter(Boolean))];
  }
  function parseStoredMode(value) {
    const raw = String(value || '').trim();
    if (!raw) return { mode: 'Battle Royale', variant: 'Zero Build' };
    const match = raw.match(/^(.*?)\s*\[(.*?)\]\s*$/);
    if (match) return { mode: match[1].trim() || 'Battle Royale', variant: match[2].trim() || 'Padrão' };
    return { mode: raw, variant: raw === 'Battle Royale' ? 'Zero Build' : 'Padrão' };
  }
  function serializeStoredMode(mode, variant) {
    const cleanMode = String(mode || 'Battle Royale').trim() || 'Battle Royale';
    const cleanVariant = String(variant || '').trim();
    if (cleanVariant && cleanVariant !== 'Padrão') return `${cleanMode} [${cleanVariant}]`;
    return cleanMode;
  }

  const parsedInitial = parseStoredMode(queryModeRaw);
  let currentGame = queryGame;
  let currentMode = parsedInitial.mode;
  let currentVariant = parsedInitial.variant;
  let streamerRow = null;
  let gameCatalog = [...FALLBACK_GAMES];
  let modeCatalog = { ...FALLBACK_MODES };
  let variantCatalog = { ...FALLBACK_VARIANTS };
  let playerConfirmed = false;
  let liveSessionHeartbeat = null;
  let liveSessionCloseTimer = null;
  let streamerChannel = null;

  const escUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const role = () => String(document.body.dataset.userRole || '').toLowerCase();
  const canEditLive = () => ['master', 'dev', 'admin', 'moderator'].includes(role());
  const canRegisterCatalog = () => ['master', 'dev', 'admin'].includes(role());
  const modesFor = game => unique(modeCatalog[game] || FALLBACK_MODES[game] || ['Padrão']);
  const variantsFor = (game, mode) => unique(variantCatalog[`${game}::${mode}`] || FALLBACK_VARIANTS[`${game}::${mode}`] || ['Padrão']);

  const setGame = value => {
    currentGame = String(value || 'Fortnite').trim() || 'Fortnite';
    if (gameBadge) gameBadge.textContent = currentGame;
  };
  const setMode = value => {
    currentMode = String(value || 'Battle Royale').trim() || 'Battle Royale';
    if (modeBadge) modeBadge.textContent = currentMode;
  };
  const setVariant = value => {
    const available = variantsFor(currentGame, currentMode);
    const next = String(value || available[0] || 'Padrão').trim() || (available[0] || 'Padrão');
    currentVariant = available.includes(next) ? next : (available[0] || 'Padrão');
    if (variantBadge) variantBadge.textContent = currentVariant;
  };

  if (title) title.textContent = `${displayName} ao vivo`;
  setGame(queryGame);
  setMode(parsedInitial.mode);
  setVariant(parsedInitial.variant);

  const embedDomain = location.hostname || 'team-lambreta.vercel.app';
  iframe.src = `https://www.tiktok.com/embed/live/@${encodeURIComponent(username)}?autoplay=1&muted=1&controls=1&embed_domain=${encodeURIComponent(embedDomain)}`;

  const setMenuOpen = (button, menu, open) => {
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
  };
  const closeMenus = () => {
    setMenuOpen(gameSelectorBtn, gameMenu, false);
    setMenuOpen(modeSelectorBtn, modeMenu, false);
    setMenuOpen(variantSelectorBtn, variantMenu, false);
  };

  const optionButton = (label, kind) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `live-meta-menu-option live-meta-menu-option--${kind}`;
    btn.textContent = label;
    return btn;
  };

  const renderGameMenu = () => {
    if (!gameMenu) return;
    gameMenu.innerHTML = '<div class="live-meta-menu-title">SELECIONAR JOGO</div>';
    gameCatalog.forEach(game => {
      const btn = optionButton(game, 'game');
      btn.addEventListener('click', async () => {
        const nextMode = modesFor(game)[0] || 'Padrão';
        const nextVariant = variantsFor(game, nextMode)[0] || 'Padrão';
        await saveLiveInfo(game, nextMode, nextVariant);
        closeMenus();
      });
      gameMenu.appendChild(btn);
    });
    if (canRegisterCatalog()) {
      const add = optionButton('＋  Cadastrar jogo', 'register');
      add.classList.add('is-admin-action');
      add.addEventListener('click', registerGame);
      gameMenu.appendChild(add);
    }
  };

  const renderModeMenu = () => {
    if (!modeMenu) return;
    modeMenu.innerHTML = `<div class="live-meta-menu-title">MODOS DISPONÍVEIS EM ${currentGame.toUpperCase()}</div>`;
    modesFor(currentGame).forEach(mode => {
      const btn = optionButton(mode, 'mode');
      btn.addEventListener('click', async () => {
        const nextVariant = variantsFor(currentGame, mode)[0] || 'Padrão';
        await saveLiveInfo(currentGame, mode, nextVariant);
        closeMenus();
      });
      modeMenu.appendChild(btn);
    });
    if (canRegisterCatalog()) {
      const add = optionButton('＋  Cadastrar modo', 'register');
      add.classList.add('is-admin-action');
      add.addEventListener('click', registerMode);
      modeMenu.appendChild(add);
    }
  };

  const renderVariantMenu = () => {
    if (!variantMenu) return;
    variantMenu.innerHTML = `<div class="live-meta-menu-title">TIPOS DISPONÍVEIS PARA ${currentMode.toUpperCase()}</div>`;
    variantsFor(currentGame, currentMode).forEach(variant => {
      const btn = optionButton(variant, 'variant');
      btn.addEventListener('click', async () => {
        await saveLiveInfo(currentGame, currentMode, variant);
        closeMenus();
      });
      variantMenu.appendChild(btn);
    });
  };

  const refreshPermissions = () => {
    const editable = canEditLive();
    [gameSelectorBtn, modeSelectorBtn, variantSelectorBtn].forEach(btn => btn?.classList.toggle('is-editable', editable));
    renderGameMenu();
    renderModeMenu();
    renderVariantMenu();
  };
  refreshPermissions();
  new MutationObserver(refreshPermissions).observe(document.body, { attributes: true, attributeFilter: ['data-user-role'] });

  const loadCatalog = async () => {
    if (!liveSb) return;
    const [{ data: games }, { data: modes }] = await Promise.all([
      liveSb.from('live_game_catalog').select('name').eq('is_active', true).order('sort_order', { ascending: true }).order('name'),
      liveSb.from('live_mode_catalog').select('game_name,name').eq('is_active', true).order('sort_order', { ascending: true }).order('name')
    ]);
    const validGames = unique((games || []).map(x => x.name).filter(name => !MODE_AS_GAMES.has(String(name || '').trim().toLowerCase())));
    if (validGames.length) gameCatalog = validGames;
    if (modes?.length) {
      const grouped = {};
      modes.forEach(row => {
        const game = String(row.game_name || '').trim();
        const mode = String(row.name || '').trim();
        if (!game || !mode) return;
        if (!MODE_AS_GAMES.has(game.toLowerCase())) (grouped[game] ||= []).push(mode);
      });
      modeCatalog = { ...modeCatalog, ...grouped };
    }
    renderGameMenu();
    renderModeMenu();
    renderVariantMenu();
  };

  const applyStreamerValues = (mainGame, rawMode) => {
    let safeGame = String(mainGame || '').trim();
    let safeModeRaw = rawMode;
    if (MODE_AS_GAMES.has(safeGame.toLowerCase())) {
      safeModeRaw = safeModeRaw || safeGame;
      safeGame = 'Fortnite';
    }
    if (safeGame) setGame(safeGame);
    const parsed = parseStoredMode(safeModeRaw);
    if (parsed.mode.toLowerCase() === 'fortnite') parsed.mode = 'Battle Royale';
    setMode(parsed.mode);
    setVariant(parsed.variant);
  };

  const loadStreamer = async () => {
    if (!liveSb || !escUsername) return;
    const { data, error } = await liveSb
      .from('streamers')
      .select('id,display_name,main_game,live_game_mode,tiktok_url,live_url,is_published,is_archived')
      .eq('is_archived', false)
      .eq('is_published', true);
    if (error) {
      console.warn('[Team Lambreta] Não foi possível carregar jogo/modo da live:', error.message);
      return;
    }
    streamerRow = (data || []).find(row => `${row.tiktok_url || ''} ${row.live_url || ''}`.toLowerCase().includes(`/@${escUsername}`)) || null;
    if (streamerRow) applyStreamerValues(streamerRow.main_game, streamerRow.live_game_mode);
    renderGameMenu();
    renderModeMenu();
    renderVariantMenu();

    if (streamerRow?.id && !streamerChannel) {
      streamerChannel = liveSb.channel(`live-game-${streamerRow.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'streamers', filter: `id=eq.${streamerRow.id}` }, payload => {
          streamerRow = { ...streamerRow, ...payload.new };
          applyStreamerValues(payload.new?.main_game, payload.new?.live_game_mode);
          renderGameMenu();
          renderModeMenu();
          renderVariantMenu();
        })
        .subscribe();
    }
  };
  Promise.all([loadCatalog(), loadStreamer()]);

  async function saveLiveInfo(nextGame, nextMode, nextVariant) {
    if (!liveSb || !canEditLive()) return false;

    const previous = { game: currentGame, mode: currentMode, variant: currentVariant };
    // Feedback imediato: o clique muda a interface sem esperar a rede.
    setGame(nextGame);
    setMode(nextMode);
    setVariant(nextVariant);
    renderModeMenu();
    renderVariantMenu();

    const { data, error } = await liveSb.rpc('tl_set_streamer_live_info', {
      p_streamer: escUsername,
      p_game: nextGame,
      p_mode: serializeStoredMode(nextMode, nextVariant)
    });
    if (error) {
      console.warn('[Team Lambreta] Falha ao atualizar jogo/modo/tipo:', error.message);
      setGame(previous.game);
      setMode(previous.mode);
      setVariant(previous.variant);
      renderModeMenu();
      renderVariantMenu();
      window.alert(`Não foi possível guardar a alteração: ${error.message || 'erro no Supabase'}`);
      return false;
    }
    const saved = data && typeof data === 'object' ? data : null;
    applyStreamerValues(saved?.game || nextGame, saved?.mode || serializeStoredMode(nextMode, nextVariant));
    renderModeMenu();
    renderVariantMenu();
    return true;
  }

  async function registerGame() {
    if (!canRegisterCatalog() || !liveSb) return;
    const name = window.prompt('Nome do novo jogo:');
    if (!name?.trim()) return;
    const { error } = await liveSb.rpc('tl_register_live_game', { p_name: name.trim() });
    if (error) return window.alert(error.message || 'Não foi possível cadastrar o jogo.');
    await loadCatalog();
  }

  async function registerMode() {
    if (!canRegisterCatalog() || !liveSb) return;
    const game = currentGame;
    const name = window.prompt(`Novo modo para ${game}:`);
    if (!name?.trim()) return;
    const { error } = await liveSb.rpc('tl_register_live_mode', { p_game: game, p_name: name.trim() });
    if (error) return window.alert(error.message || 'Não foi possível cadastrar o modo.');
    await loadCatalog();
  }

  gameSelectorBtn?.addEventListener('click', event => {
    if (!canEditLive()) return;
    event.stopPropagation();
    const open = gameMenu?.hidden !== false;
    closeMenus(); renderGameMenu();
    setMenuOpen(gameSelectorBtn, gameMenu, open);
  });
  modeSelectorBtn?.addEventListener('click', event => {
    if (!canEditLive()) return;
    event.stopPropagation();
    const open = modeMenu?.hidden !== false;
    closeMenus(); renderModeMenu();
    setMenuOpen(modeSelectorBtn, modeMenu, open);
  });
  variantSelectorBtn?.addEventListener('click', event => {
    if (!canEditLive()) return;
    event.stopPropagation();
    const open = variantMenu?.hidden !== false;
    closeMenus(); renderVariantMenu();
    setMenuOpen(variantSelectorBtn, variantMenu, open);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.live-meta-inline')) closeMenus();
  });

  const startLiveSessionHeartbeat = () => {
    window.TeamLiveChatSession?.touch?.();
    if (liveSessionHeartbeat) return;
    liveSessionHeartbeat = setInterval(() => window.TeamLiveChatSession?.touch?.(), 60 * 1000);
  };

  const stopLiveSessionHeartbeat = () => {
    if (!liveSessionHeartbeat) return;
    clearInterval(liveSessionHeartbeat);
    liveSessionHeartbeat = null;
  };

  const showPlayer = () => {
    playerConfirmed = true;
    if (liveSessionCloseTimer) {
      clearTimeout(liveSessionCloseTimer);
      liveSessionCloseTimer = null;
    }
    startLiveSessionHeartbeat();
    window.TeamProgress?.setLiveActive?.(true);
    iframe.classList.add('is-ready');
    if (fallback) fallback.hidden = true;
  };
  const showFallback = (titleText, bodyText) => {
    if (playerConfirmed) return;
    iframe.classList.remove('is-ready');
    if (fallback) fallback.hidden = false;
    if (fallbackTitle) fallbackTitle.textContent = titleText;
    if (fallbackText) fallbackText.textContent = bodyText;
  };

  window.addEventListener('message', event => {
    if (event.source !== iframe.contentWindow) return;
    const message = event.data;
    if (!message || message['x-tiktok-player'] !== true) return;
    if (message.type === 'onPlayerReady') {
      try { iframe.contentWindow.postMessage({'x-tiktok-player':true,type:'mute'}, '*'); } catch (_) {}
    }
    if (message.type === 'onStateChange') {
      const state = Number(message.value);
      if (state === 1 || state === 3) showPlayer();
    }
    if (message.type === 'onPlayerError') {
      const wasLive = playerConfirmed;
      stopLiveSessionHeartbeat();
      window.TeamProgress?.setLiveActive?.(false);
      if (wasLive && !liveSessionCloseTimer) {
        liveSessionCloseTimer = setTimeout(() => {
          window.TeamLiveChatSession?.close?.();
          liveSessionCloseTimer = null;
        }, 2 * 60 * 1000);
      }
      showFallback('Player indisponível aqui', 'O TikTok não liberou a reprodução incorporada neste domínio ou a live terminou.');
    }
  });

  setTimeout(() => {
    if (!playerConfirmed) showFallback('A verificar a live…', 'Se o player não abrir, o domínio pode ainda precisar de aprovação do TikTok para LIVE Embed.');
  }, 5000);

  const syncLiveChatHeight = () => {
    const main = document.querySelector('.live-watch-main');
    const chat = document.querySelector('.live-watch-chat');
    if (!main || !chat) return;
    if (window.matchMedia('(max-width: 1050px)').matches) {
      chat.style.removeProperty('--live-panel-height');
      return;
    }
    const height = Math.round(main.getBoundingClientRect().height);
    if (height > 0) chat.style.setProperty('--live-panel-height', `${height}px`);
  };

  syncLiveChatHeight();
  window.addEventListener('resize', syncLiveChatHeight, { passive: true });
  if ('ResizeObserver' in window) {
    const main = document.querySelector('.live-watch-main');
    if (main) new ResizeObserver(syncLiveChatHeight).observe(main);
  }

  window.addEventListener('beforeunload', () => {
    if (streamerChannel && liveSb) liveSb.removeChannel(streamerChannel);
  });
})();
