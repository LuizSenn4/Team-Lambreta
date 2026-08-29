(() => {
  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const video = document.getElementById('teamLivePlayer');
  const fallback = document.getElementById('livePlayerFallback');
  const fallbackTitle = document.getElementById('liveFallbackTitle');
  const fallbackText = document.getElementById('liveFallbackText');
  const title = document.getElementById('liveWatchTitle');
  const gameBadge = document.getElementById('liveGameBadge');
  const modeBadge = document.getElementById('liveModeBadge');
  const variantBadge = document.getElementById('liveVariantBadge');
  const sb = window.teamSupabase;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let row = null;
  let channel = null;
  let hls = null;
  let activeUrl = '';

  if (!video) return;

  const parseMode = value => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(.*?)\s*\[(.*?)\]\s*$/);
    return match ? { mode: match[1].trim(), variant: match[2].trim() } : { mode: raw || 'Battle Royale', variant: raw === 'Battle Royale' ? 'Zero Build' : '' };
  };

  const showFallback = (heading, text) => {
    video.classList.remove('is-ready');
    if (fallback) fallback.hidden = false;
    if (fallbackTitle) fallbackTitle.textContent = heading;
    if (fallbackText) fallbackText.textContent = text;
    window.TeamProgress?.setLiveActive?.(false);
  };

  const showPlayer = () => {
    video.classList.add('is-ready');
    if (fallback) fallback.hidden = true;
    window.TeamProgress?.setLiveActive?.(true);
    window.TeamLiveChatSession?.touch?.();
  };

  const stopPlayer = () => {
    if (hls) {
      try { hls.destroy(); } catch (_) {}
      hls = null;
    }
    try { video.pause(); } catch (_) {}
    video.removeAttribute('src');
    video.load();
    activeUrl = '';
  };

  const playHls = rawUrl => {
    const url = String(rawUrl || '').trim();
    if (url && url === activeUrl) return;
    stopPlayer();

    if (!url) {
      showFallback('Transmissão Team Lambreta aguardando', 'Quando o OBS do streamer conectar ao nosso servidor, a live aparece aqui automaticamente.');
      return;
    }

    activeUrl = url;
    showFallback('A ligar à transmissão…', 'A preparar o player Team Lambreta.');
    const attemptPlay = () => video.play().catch(() => {});

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.load();
      attemptPlay();
      return;
    }

    if (window.Hls?.isSupported?.()) {
      hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        backBufferLength: 30
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, attemptPlay);
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) showFallback('Transmissão temporariamente indisponível', 'O servidor de vídeo ainda não está acessível ou o OBS parou de transmitir.');
      });
      return;
    }

    showFallback('Player não suportado', 'Este navegador não consegue reproduzir HLS nesta versão.');
  };

  const applyRow = next => {
    row = next;
    if (!row) return;
    if (title) title.textContent = `${row.display_name || 'Streamer'} ao vivo`;
    if (gameBadge) gameBadge.textContent = row.main_game || 'Fortnite';
    const parsed = parseMode(row.live_game_mode);
    if (modeBadge) modeBadge.textContent = parsed.mode || 'Battle Royale';
    if (variantBadge) variantBadge.textContent = parsed.variant || 'Padrão';
    playHls(row.hls_url);
  };

  const loadStreamer = async () => {
    if (!sb) {
      showFallback('A ligar ao serviço…', 'Não foi possível iniciar a ligação ao Supabase.');
      return;
    }

    const columns = 'id,display_name,main_game,live_game_mode,tiktok_url,live_url,hls_url,is_published,is_archived';
    let result;
    if (UUID_RE.test(ref)) {
      result = await sb.from('streamers').select(columns).eq('id', ref).eq('is_published', true).eq('is_archived', false).maybeSingle();
    } else {
      const all = await sb.from('streamers').select(columns).eq('is_published', true).eq('is_archived', false);
      const needle = ref.toLowerCase().replace(/^@/, '');
      result = {
        error: all.error,
        data: (all.data || []).find(item => `${item.display_name || ''} ${item.tiktok_url || ''} ${item.live_url || ''}`.toLowerCase().includes(needle)) || null
      };
    }

    if (result.error) {
      console.warn('[Team Lambreta] Falha ao carregar streamer:', result.error.message);
      showFallback('Não foi possível carregar a live', 'Tenta novamente em alguns instantes.');
      return;
    }
    if (!result.data) {
      showFallback('Streamer não encontrado', 'Esta sala ainda não tem uma transmissão configurada.');
      return;
    }

    applyRow(result.data);
    channel = sb.channel(`team-live-player-${result.data.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'streamers', filter: `id=eq.${result.data.id}` }, payload => applyRow({ ...row, ...payload.new }))
      .subscribe();
  };

  video.addEventListener('playing', showPlayer);
  video.addEventListener('canplay', showPlayer);
  video.addEventListener('error', () => showFallback('Transmissão temporariamente indisponível', 'O servidor de vídeo ainda não está acessível ou o OBS parou de transmitir.'));

  loadStreamer();

  window.addEventListener('beforeunload', () => {
    stopPlayer();
    if (channel && sb) sb.removeChannel(channel);
  });
})();