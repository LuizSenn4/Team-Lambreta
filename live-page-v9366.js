(() => {
  const params = new URLSearchParams(location.search);
  const username = (params.get('user') || 'rv3113').replace(/^@/, '').trim();
  const displayName = params.get('name') || username || 'Streamer';
  const queryGame = params.get('game') || 'Fortnite';
  const queryMode = params.get('mode') || 'Battle Royale';
  const iframe = document.getElementById('tiktokLivePlayer');
  const fallback = document.getElementById('livePlayerFallback');
  const fallbackTitle = document.getElementById('liveFallbackTitle');
  const fallbackText = document.getElementById('liveFallbackText');
  const title = document.getElementById('liveWatchTitle');
  const gameBadge = document.getElementById('liveGameBadge');
  const modeBadge = document.getElementById('liveModeBadge');
  const gameSelectorBtn = document.getElementById('liveGameSelectorBtn');
  const modeSelectorBtn = document.getElementById('liveModeSelectorBtn');
  const gameMenu = document.getElementById('liveGameMenu');
  const modeMenu = document.getElementById('liveModeMenu');
  const gameEditBtn = document.getElementById('liveGameEditBtn');
  const configPopover = document.getElementById('liveConfigPopover');
  const gameSelect = document.getElementById('liveGameSelect');
  const modeSelect = document.getElementById('liveModeSelect');
  const gameFeedback = document.getElementById('liveGameFeedback');
  const catalogAdminActions = document.getElementById('liveCatalogAdminActions');
  const registerGameBtn = document.getElementById('liveRegisterGameBtn');
  const registerModeBtn = document.getElementById('liveRegisterModeBtn');
  const openTikTok = document.getElementById('liveOpenTikTok');
  if (!iframe) return;

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const liveSb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  const FALLBACK_GAMES = ['Blitz', 'Battle Royale', 'Reload'];
  const FALLBACK_MODES = {
    'Blitz': ['Padrão'],
    'Battle Royale': ['Build', 'Zero Build'],
    'Reload': ['Padrão'],
    'Fortnite': ['Battle Royale']
  };

  let currentGame = queryGame;
  let currentMode = queryMode;
  let streamerRow = null;
  let gameCatalog = [...FALLBACK_GAMES];
  let modeCatalog = { ...FALLBACK_MODES };
  let playerConfirmed = false;
  let liveSessionHeartbeat = null;
  let liveSessionCloseTimer = null;
  let streamerChannel = null;

  const escUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const role = () => String(document.body.dataset.userRole || '').toLowerCase();
  const canEditLive = () => ['master', 'dev', 'admin', 'moderator'].includes(role());
  const canRegisterCatalog = () => ['master', 'dev', 'admin'].includes(role());

  const unique = values => [...new Set((values || []).map(v => String(v || '').trim()).filter(Boolean))];
  const modesFor = game => unique(modeCatalog[game] || FALLBACK_MODES[game] || ['Padrão']);

  const setGame = value => {
    currentGame = String(value || 'Jogo não informado').trim() || 'Jogo não informado';
    if (gameBadge) gameBadge.textContent = currentGame;
    if (gameSelect) gameSelect.value = currentGame;
  };
  const setMode = value => {
    currentMode = String(value || 'Modo não informado').trim() || 'Modo não informado';
    if (modeBadge) modeBadge.textContent = currentMode;
    if (modeSelect) modeSelect.value = currentMode;
  };

  if (title) title.textContent = `${displayName} ao vivo`;
  setGame(queryGame);
  setMode(queryMode);
  if (openTikTok) openTikTok.href = `https://www.tiktok.com/@${encodeURIComponent(username)}/live`;

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
  };
  const closeConfig = () => { if (configPopover) configPopover.hidden = true; };

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
        const availableModes = modesFor(game);
        const nextMode = availableModes.includes(currentMode) ? currentMode : availableModes[0];
        await saveLiveInfo(game, nextMode);
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
    modeMenu.innerHTML = `<div class="live-meta-menu-title">MODOS DISPONÍVEIS PARA ${currentGame.toUpperCase()}</div>`;
    modesFor(currentGame).forEach(mode => {
      const btn = optionButton(mode, 'mode');
      btn.addEventListener('click', async () => {
        await saveLiveInfo(currentGame, mode);
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

  const renderConfigSelects = () => {
    if (gameSelect) {
      gameSelect.innerHTML = gameCatalog.map(game => `<option value="${game.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${game}</option>`).join('');
      if (!gameCatalog.includes(currentGame)) gameSelect.insertAdjacentHTML('beforeend', `<option value="${currentGame}">${currentGame}</option>`);
      gameSelect.value = currentGame;
    }
    const modes = modesFor(currentGame);
    if (modeSelect) {
      modeSelect.innerHTML = modes.map(mode => `<option value="${mode.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${mode}</option>`).join('');
      if (!modes.includes(currentMode)) modeSelect.insertAdjacentHTML('beforeend', `<option value="${currentMode}">${currentMode}</option>`);
      modeSelect.value = currentMode;
    }
  };

  const refreshPermissions = () => {
    const editable = canEditLive();
    [gameSelectorBtn, modeSelectorBtn].forEach(btn => btn?.classList.toggle('is-editable', editable));
    if (gameEditBtn) gameEditBtn.hidden = !editable;
    if (catalogAdminActions) catalogAdminActions.hidden = !canRegisterCatalog();
    renderGameMenu();
    renderModeMenu();
    renderConfigSelects();
  };
  refreshPermissions();
  new MutationObserver(refreshPermissions).observe(document.body, { attributes: true, attributeFilter: ['data-user-role'] });

  const loadCatalog = async () => {
    if (!liveSb) return;
    const [{ data: games }, { data: modes }] = await Promise.all([
      liveSb.from('live_game_catalog').select('name').eq('is_active', true).order('sort_order', { ascending: true }).order('name'),
      liveSb.from('live_mode_catalog').select('game_name,name').eq('is_active', true).order('sort_order', { ascending: true }).order('name')
    ]);
    if (games?.length) gameCatalog = unique(games.map(x => x.name));
    if (modes?.length) {
      const grouped = {};
      modes.forEach(row => {
        const game = String(row.game_name || '').trim();
        const mode = String(row.name || '').trim();
        if (!game || !mode) return;
        (grouped[game] ||= []).push(mode);
      });
      modeCatalog = { ...modeCatalog, ...grouped };
    }
    renderGameMenu();
    renderModeMenu();
    renderConfigSelects();
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
    if (streamerRow?.main_game) setGame(streamerRow.main_game);
    if (streamerRow?.live_game_mode) setMode(streamerRow.live_game_mode);
    renderGameMenu();
    renderModeMenu();
    renderConfigSelects();

    if (streamerRow?.id && !streamerChannel) {
      streamerChannel = liveSb.channel(`live-game-${streamerRow.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'streamers', filter: `id=eq.${streamerRow.id}` }, payload => {
          streamerRow = { ...streamerRow, ...payload.new };
          if (payload.new?.main_game) setGame(payload.new.main_game);
          if (payload.new?.live_game_mode) setMode(payload.new.live_game_mode);
          renderGameMenu();
          renderModeMenu();
          renderConfigSelects();
        })
        .subscribe();
    }
  };
  Promise.all([loadCatalog(), loadStreamer()]);

  async function saveLiveInfo(nextGame, nextMode) {
    if (!liveSb || !canEditLive()) return false;
    if (gameFeedback) gameFeedback.textContent = 'A guardar…';
    const { data, error } = await liveSb.rpc('tl_set_streamer_live_info', {
      p_streamer: escUsername,
      p_game: nextGame,
      p_mode: nextMode
    });
    if (error) {
      console.warn('[Team Lambreta] Falha ao atualizar jogo/modo:', error.message);
      if (gameFeedback) gameFeedback.textContent = error.message || 'Não foi possível atualizar.';
      return false;
    }
    const saved = data && typeof data === 'object' ? data : null;
    setGame(saved?.game || nextGame);
    setMode(saved?.mode || nextMode);
    renderModeMenu();
    renderConfigSelects();
    if (gameFeedback) gameFeedback.textContent = 'Atualizado.';
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
    closeMenus(); closeConfig(); renderGameMenu();
    setMenuOpen(gameSelectorBtn, gameMenu, open);
  });
  modeSelectorBtn?.addEventListener('click', event => {
    if (!canEditLive()) return;
    event.stopPropagation();
    const open = modeMenu?.hidden !== false;
    closeMenus(); closeConfig(); renderModeMenu();
    setMenuOpen(modeSelectorBtn, modeMenu, open);
  });
  gameEditBtn?.addEventListener('click', event => {
    if (!canEditLive() || !configPopover) return;
    event.stopPropagation();
    closeMenus();
    renderConfigSelects();
    configPopover.hidden = !configPopover.hidden;
  });
  gameSelect?.addEventListener('change', () => {
    const nextGame = gameSelect.value;
    const modes = modesFor(nextGame);
    modeSelect.innerHTML = modes.map(mode => `<option value="${mode}">${mode}</option>`).join('');
  });
  modeSelect?.addEventListener('change', async () => {
    await saveLiveInfo(gameSelect.value, modeSelect.value);
  });
  gameSelect?.addEventListener('change', async () => {
    const modes = modesFor(gameSelect.value);
    await saveLiveInfo(gameSelect.value, modes[0] || 'Padrão');
  });
  registerGameBtn?.addEventListener('click', registerGame);
  registerModeBtn?.addEventListener('click', registerMode);
  document.addEventListener('click', event => {
    if (!event.target.closest('.live-meta-inline')) { closeMenus(); closeConfig(); }
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

  // Desktop: chat termina junto com player + cabeçalho. Mobile: altura compacta própria.
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
