(() => {
  'use strict';
  if (window.TeamPresence) return;

  const IDLE_MS = 5 * 60 * 1000;
  const HEARTBEAT_MS = 60 * 1000;
  const HEARTBEAT_EXPIRE_MS = HEARTBEAT_MS * 3;
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

  const STATUS_ALIASES = Object.freeze({ online:'online', busy:'busy', ocupado:'busy', away:'away', ausente:'away', offline:'offline' });
  const statusKey = value => String(value || '').trim().toLowerCase();
  const normalize = value => STATUS_ALIASES[statusKey(value)] || 'offline';
  const valid = value => Object.prototype.hasOwnProperty.call(STATUS_ALIASES, statusKey(value));
  function resolve(profile) {
    const id = typeof profile === 'string' ? profile : profile?.id || profile?.user_id;
    if (id && Object.prototype.hasOwnProperty.call(peerState, id)) return normalize(peerState[id]);
    const raw = normalize(typeof profile === 'string' ? '' : profile?.presence);
    if (raw === 'offline') return 'offline';
    const stamp = typeof profile === 'string' ? '' : profile?.last_seen_at || profile?.last_seen;
    const seenAt = stamp ? new Date(stamp).getTime() : 0;
    if (seenAt && Number.isFinite(seenAt) && Date.now() - seenAt > HEARTBEAT_EXPIRE_MS) return 'offline';
    return raw;
  }
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
    syncInFlight = client.from('profiles').update({ presence: status, last_seen: now, updated_at: now }).eq('id', userId);
    const result = await syncInFlight;
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
    if (!valid(status)) return snapshot();
    status = normalize(status);
    if (status === 'offline') return snapshot();
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
    initialStatus = normalize(initialStatus);
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
    heartbeatTimer = setInterval(async () => { await sync(effectiveStatus); emitPeers(); }, HEARTBEAT_MS);
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
    connect, disconnect, setManual, recordActivity, getState: snapshot, resolve,
    subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); },
    getPeers() { return { ...peerState }; },
    constants: { IDLE_MS, HEARTBEAT_MS, HEARTBEAT_EXPIRE_MS }
  };
})();
