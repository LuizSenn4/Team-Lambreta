(() => {
  'use strict';
  if (window.TeamPresence) return;

  const IDLE_MS = 5 * 60 * 1000;
  const HEARTBEAT_MS = 60 * 1000;
  const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'];
  const listeners = new Set();
  let client = null;
  let userId = null;
  let idleTimer = 0;
  let heartbeatTimer = 0;
  let syncInFlight = null;
  let presenceChannel = null;
  let peerState = {};
  let manualStatus = localStorage.getItem('tl_presence_manual_v100') || 'online';
  let effectiveStatus = 'offline';
  let autoAway = false;
  let started = false;
  let lastActivityAt = Date.now();

  const valid = value => ['online', 'busy', 'away', 'offline'].includes(value);
  const snapshot = () => ({ manualStatus, status: effectiveStatus, autoAway, lastActivityAt, connected: Boolean(userId) });
  const emit = () => {
    const detail = snapshot();
    listeners.forEach(fn => fn(detail));
    window.dispatchEvent(new CustomEvent('tl:presence', { detail }));
  };
  const emitPeers = () => window.dispatchEvent(new CustomEvent('tl:presence-peers', { detail: { peers: peerState } }));

  async function sync(status) {
    if (!client || !userId || status === 'offline') return;
    const now = new Date().toISOString();
    syncInFlight = client.from('profiles').update({ presence: status, last_seen_at: now, updated_at: now }).eq('id', userId);
    let result = await syncInFlight;
    if (result.error && /last_seen_at/i.test(result.error.message || '')) {
      result = await client.from('profiles').update({ presence: status, last_seen: now, updated_at: now }).eq('id', userId);
    }
    syncInFlight = null;
    if (presenceChannel) presenceChannel.track({ user_id: userId, status, at: now }).catch(() => {});
    return result;
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!userId || manualStatus !== 'online') return;
    const remaining = Math.max(0, IDLE_MS - (Date.now() - lastActivityAt));
    idleTimer = setTimeout(async () => {
      if (manualStatus !== 'online') return;
      autoAway = true;
      effectiveStatus = 'away';
      emit();
      await sync('away');
    }, remaining);
  }

  async function recordActivity() {
    lastActivityAt = Date.now();
    if (autoAway && manualStatus === 'online') {
      autoAway = false;
      effectiveStatus = 'online';
      emit();
      await sync('online');
    }
    scheduleIdle();
  }

  async function setManual(status) {
    if (!valid(status) || status === 'offline') return snapshot();
    manualStatus = status;
    autoAway = false;
    effectiveStatus = status;
    localStorage.setItem('tl_presence_manual_v100', status);
    lastActivityAt = Date.now();
    scheduleIdle();
    emit();
    await sync(status);
    return snapshot();
  }

  function startActivityListeners() {
    if (started) return;
    started = true;
    let queued = false;
    const onActivity = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; recordActivity(); });
    };
    ACTIVITY_EVENTS.forEach(type => window.addEventListener(type, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recordActivity(); });
  }

  async function connect(supabase, uid, initialStatus) {
    client = supabase || client;
    userId = uid || null;
    clearInterval(heartbeatTimer);
    if (!userId) {
      clearTimeout(idleTimer);
      effectiveStatus = 'offline';
      emit();
      return snapshot();
    }
    if (valid(initialStatus) && initialStatus !== 'offline') {
      manualStatus = initialStatus === 'away' ? (localStorage.getItem('tl_presence_manual_v100') || 'online') : initialStatus;
    }
    effectiveStatus = manualStatus;
    autoAway = false;
    startActivityListeners();
    if (presenceChannel) await client.removeChannel(presenceChannel);
    presenceChannel = client.channel('tl-global-presence', { config: { presence: { key: userId } } })
      .on('presence', { event: 'sync' }, () => {
        const raw = presenceChannel.presenceState();
        peerState = Object.fromEntries(Object.entries(raw).map(([id, entries]) => [id, entries.at(-1)?.status || 'online']));
        emitPeers();
      })
      .subscribe(async channelStatus => { if (channelStatus === 'SUBSCRIBED') await presenceChannel.track({ user_id: userId, status: effectiveStatus, at: new Date().toISOString() }); });
    await sync(effectiveStatus);
    scheduleIdle();
    heartbeatTimer = setInterval(() => sync(effectiveStatus), HEARTBEAT_MS);
    emit();
    return snapshot();
  }

  function disconnect() {
    clearTimeout(idleTimer);
    clearInterval(heartbeatTimer);
    userId = null;
    if (presenceChannel && client) { presenceChannel.untrack().catch(() => {}); client.removeChannel(presenceChannel); }
    presenceChannel = null;
    peerState = {};
    emitPeers();
    effectiveStatus = 'offline';
    autoAway = false;
    emit();
  }

  window.TeamPresence = {
    connect, disconnect, setManual, recordActivity, getState: snapshot,
    subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); },
    getPeers() { return { ...peerState }; },
    constants: { IDLE_MS, HEARTBEAT_MS }
  };
})();
