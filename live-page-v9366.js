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
  const gameEditBtn = document.getElementById('liveGameEditBtn');
  const gameDialog = document.getElementById('liveGameDialog');
  const gameForm = document.getElementById('liveGameForm');
  const gameInput = document.getElementById('liveGameInput');
  const modeInput = document.getElementById('liveModeInput');
  const gameFeedback = document.getElementById('liveGameFeedback');
  const gameClose = document.getElementById('liveGameDialogClose');
  const gameCancel = document.getElementById('liveGameCancel');
  const openTikTok = document.getElementById('liveOpenTikTok');
  if (!iframe) return;

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const liveSb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  let currentGame = queryGame;
  let currentMode = queryMode;
  let streamerRow = null;
  let playerConfirmed = false;
  let liveSessionHeartbeat = null;
  let liveSessionCloseTimer = null;
  let streamerChannel = null;

  const escUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const setGame = (value) => {
    currentGame = String(value || 'Jogo não informado').trim() || 'Jogo não informado';
    if (gameBadge) gameBadge.textContent = currentGame;
    if (gameInput && document.activeElement !== gameInput) gameInput.value = currentGame;
    if (modeInput) modeInput.value = currentMode;
  };
  const setMode = (value) => {
    currentMode = String(value || 'Modo não informado').trim() || 'Modo não informado';
    if (modeBadge) modeBadge.textContent = currentMode;
    if (modeInput && document.activeElement !== modeInput) modeInput.value = currentMode;
  };

  if (title) title.textContent = `${displayName} ao vivo`;
  setGame(queryGame);
  setMode(queryMode);
  if (openTikTok) openTikTok.href = `https://www.tiktok.com/@${encodeURIComponent(username)}/live`;

  const embedDomain = location.hostname || 'team-lambreta.vercel.app';
  iframe.src = `https://www.tiktok.com/embed/live/@${encodeURIComponent(username)}?autoplay=1&muted=1&controls=1&embed_domain=${encodeURIComponent(embedDomain)}`;

  const canEditGame = () => ['master', 'dev', 'admin', 'moderator'].includes(String(document.body.dataset.userRole || '').toLowerCase());
  const refreshGameEditPermission = () => {
    if (gameEditBtn) gameEditBtn.hidden = !canEditGame();
  };
  refreshGameEditPermission();
  new MutationObserver(refreshGameEditPermission).observe(document.body, { attributes: true, attributeFilter: ['data-user-role'] });

  const loadStreamer = async () => {
    if (!liveSb || !escUsername) return;
    const { data, error } = await liveSb
      .from('streamers')
      .select('id,display_name,main_game,live_game_mode,tiktok_url,live_url,is_published,is_archived')
      .eq('is_archived', false)
      .eq('is_published', true);
    if (error) {
      console.warn('[Team Lambreta] Não foi possível carregar o jogo da live:', error.message);
      return;
    }
    streamerRow = (data || []).find(row => {
      const source = `${row.tiktok_url || ''} ${row.live_url || ''}`.toLowerCase();
      return source.includes(`/@${escUsername}`);
    }) || null;
    if (streamerRow?.main_game) setGame(streamerRow.main_game);
    if (streamerRow?.live_game_mode) setMode(streamerRow.live_game_mode);

    if (streamerRow?.id && !streamerChannel) {
      streamerChannel = liveSb.channel(`live-game-${streamerRow.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'streamers', filter: `id=eq.${streamerRow.id}` }, payload => {
          streamerRow = { ...streamerRow, ...payload.new };
          if (payload.new?.main_game) setGame(payload.new.main_game);
          if (payload.new?.live_game_mode) setMode(payload.new.live_game_mode);
        })
        .subscribe();
    }
  };
  loadStreamer();

  const openGameDialog = () => {
    if (!canEditGame() || !gameDialog) return;
    gameInput.value = currentGame;
    if (modeInput) modeInput.value = currentMode;
    gameFeedback.textContent = '';
    if (typeof gameDialog.showModal === 'function') gameDialog.showModal();
    else gameDialog.setAttribute('open', '');
    setTimeout(() => gameInput?.focus(), 30);
  };
  const closeGameDialog = () => {
    if (!gameDialog) return;
    if (typeof gameDialog.close === 'function') gameDialog.close();
    else gameDialog.removeAttribute('open');
  };
  gameEditBtn?.addEventListener('click', openGameDialog);
  gameClose?.addEventListener('click', closeGameDialog);
  gameCancel?.addEventListener('click', closeGameDialog);
  gameForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!liveSb || !canEditGame()) return;
    const nextGame = String(gameInput?.value || '').trim();
    const nextMode = String(modeInput?.value || '').trim();
    if (!nextGame || !nextMode) {
      gameFeedback.textContent = 'Preenche o jogo e o modo de jogo.';
      return;
    }
    const saveButton = document.getElementById('liveGameSave');
    if (saveButton) saveButton.disabled = true;
    gameFeedback.textContent = 'A guardar…';
    const { data, error } = await liveSb.rpc('tl_set_streamer_live_info', {
      p_streamer: escUsername,
      p_game: nextGame,
      p_mode: nextMode
    });
    if (saveButton) saveButton.disabled = false;
    if (error) {
      gameFeedback.textContent = error.message || 'Não foi possível alterar o jogo.';
      return;
    }
    const saved = data && typeof data === 'object' ? data : null;
    setGame(saved?.game || nextGame);
    setMode(saved?.mode || nextMode);
    gameFeedback.textContent = 'Jogo e modo atualizados.';
    setTimeout(closeGameDialog, 450);
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
