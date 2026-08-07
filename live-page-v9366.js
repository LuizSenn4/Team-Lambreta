(() => {
  const params = new URLSearchParams(location.search);
  const username = (params.get('user') || 'rv3113').replace(/^@/, '').trim();
  const displayName = params.get('name') || 'INK31';
  const game = params.get('game') || 'Fortnite';
  const iframe = document.getElementById('tiktokLivePlayer');
  const fallback = document.getElementById('livePlayerFallback');
  const fallbackTitle = document.getElementById('liveFallbackTitle');
  const fallbackText = document.getElementById('liveFallbackText');
  const title = document.getElementById('liveWatchTitle');
  const streamerName = document.getElementById('liveStreamerName');
  const gameName = document.getElementById('liveGameName');
  const openTikTok = document.getElementById('liveOpenTikTok');
  if (!iframe) return;

  if (title) title.textContent = `${displayName} ao vivo`;
  if (streamerName) streamerName.textContent = displayName;
  if (gameName) gameName.textContent = game;
  if (openTikTok) openTikTok.href = `https://www.tiktok.com/@${encodeURIComponent(username)}/live`;

  const embedDomain = location.hostname || 'team-lambreta.vercel.app';
  iframe.src = `https://www.tiktok.com/embed/live/@${encodeURIComponent(username)}?autoplay=1&muted=1&controls=1&embed_domain=${encodeURIComponent(embedDomain)}`;

  let playerConfirmed = false;
  let liveSessionHeartbeat = null;
  let liveSessionCloseTimer = null;

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
      if (wasLive && !liveSessionCloseTimer) {
        // Dá 2 minutos para uma falha temporária recuperar antes de encerrar a sessão.
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

  // Mantém a coluna do chat exatamente na altura do bloco da live no desktop.
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

})();
