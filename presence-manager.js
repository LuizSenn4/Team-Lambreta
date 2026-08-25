(() => {
  'use strict';
  if (window.TeamPresence) return;

  const PRODUCTION_IDLE_MS = 300000;
  const requestedTestIdle = Number(window.__TL_PRESENCE_TEST_IDLE_MS__ || 0);
  const localTestHost = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const IDLE_MS = localTestHost && Number.isFinite(requestedTestIdle) && requestedTestIdle >= 50 ? requestedTestIdle : PRODUCTION_IDLE_MS;
  const HEARTBEAT_MS = 60000;
  const HEARTBEAT_EXPIRE_MS = HEARTBEAT_MS * 3;
  const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'];
  const listeners = new Set();
  const aliases = Object.freeze({ online:'online', busy:'busy', ocupado:'busy', away:'away', ausente:'away', offline:'offline' });
  const normalize = value => aliases[String(value || '').trim().toLowerCase()] || 'offline';
  const activityKey = id => `tl_presence_activity_v103:${id}`;
  const manualKey = id => `tl_presence_manual_v103:${id}`;
  const tabKey = 'tl_presence_tab_v103';

  let client = null, userId = null, idleTimer = 0, heartbeatTimer = 0;
  let presenceChannel = null, browserChannel = null, peerState = {};
  let manualStatus = 'online', effectiveStatus = 'offline', autoAway = false;
  let activityListenersStarted = false, storageListenerStarted = false;
  let lastActivityAt = 0, lastFrequentActivityAt = 0;

  function getTabId() {
    try {
      const current = sessionStorage.getItem(tabKey);
      if (current) return current;
      const created = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(tabKey, created);
      return created;
    } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  }
  const tabId = getTabId();
  function readTimestamp(key) {
    try {
      const value = Number(localStorage.getItem(key) || 0);
      return Number.isFinite(value) && value > 0 && value <= Date.now() ? value : 0;
    } catch { return 0; }
  }
  function writeActivity(stamp) { if (userId) try { localStorage.setItem(activityKey(userId), String(stamp)); } catch {} }
  function readManual(id, initialStatus) {
    let stored = '';
    try { stored = localStorage.getItem(manualKey(id)) || ''; } catch {}
    const normalized = normalize(stored);
    if (normalized === 'online' || normalized === 'busy') return normalized;
    return normalize(initialStatus) === 'busy' ? 'busy' : 'online';
  }
  function writeManual(status) { if (userId) try { localStorage.setItem(manualKey(userId), status); } catch {} }

  function resolve(profile) {
    const id = typeof profile === 'string' ? profile : profile?.id || profile?.user_id;
    if (id && Object.prototype.hasOwnProperty.call(peerState, id)) return normalize(peerState[id]);
    const raw = normalize(typeof profile === 'string' ? '' : profile?.presence);
    if (raw === 'offline') return 'offline';
    const value = typeof profile === 'string' ? '' : profile?.last_seen_at || profile?.last_seen;
    const seenAt = value ? new Date(value).getTime() : 0;
    return seenAt && Number.isFinite(seenAt) && Date.now() - seenAt > HEARTBEAT_EXPIRE_MS ? 'offline' : raw;
  }
  const snapshot = () => ({ manualStatus, status: effectiveStatus, autoAway, lastActivityAt, connected: Boolean(userId) });
  function emit() {
    const detail = snapshot();
    listeners.forEach(fn => fn(detail));
    window.dispatchEvent(new CustomEvent('tl:presence', { detail }));
  }
  const emitPeers = () => window.dispatchEvent(new CustomEvent('tl:presence-peers', { detail: { peers: { ...peerState } } }));
  function publish(message) {
    try { browserChannel?.postMessage({ ...message, userId, sourceTabId: tabId, sentAt: Date.now() }); } catch {}
  }

  async function sync(status) {
    if (!client || !userId || status === 'offline') return;
    const now = new Date().toISOString();
    const result = await client.from('profiles').update({ presence: status, last_seen: now, updated_at: now }).eq('id', userId);
    presenceChannel?.track({ user_id: userId, tab_id: tabId, status, at: now }).catch(() => {});
    return result;
  }
  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!userId || manualStatus !== 'online') return;
    idleTimer = setTimeout(() => void evaluateIdle(), Math.max(0, IDLE_MS - (Date.now() - lastActivityAt)));
  }
  async function evaluateIdle() {
    if (!userId || manualStatus !== 'online') return;
    const shared = readTimestamp(activityKey(userId));
    if (shared > lastActivityAt) lastActivityAt = shared;
    if (Date.now() - lastActivityAt < IDLE_MS) return scheduleIdle();
    if (!autoAway || effectiveStatus !== 'away') {
      autoAway = true; effectiveStatus = 'away'; emit();
      publish({ type:'status', status:'away', autoAway:true, lastActivityAt });
      await sync('away');
    }
  }
  async function applyActivity(stamp, { persist=false, broadcast=false } = {}) {
    if (!userId || !Number.isFinite(stamp) || stamp <= 0 || stamp < lastActivityAt) return snapshot();
    lastActivityAt = stamp;
    if (persist) writeActivity(stamp);
    if (broadcast) publish({ type:'activity', lastActivityAt:stamp });
    if (autoAway && manualStatus === 'online') {
      autoAway = false; effectiveStatus = 'online'; emit();
      publish({ type:'status', status:'online', autoAway:false, lastActivityAt:stamp });
      await sync('online');
    }
    scheduleIdle();
    return snapshot();
  }
  const recordActivity = () => applyActivity(Date.now(), { persist:true, broadcast:true });
  async function applyManual(status, { persist=false, broadcast=false } = {}) {
    status = normalize(status);
    if (!['online', 'busy'].includes(status)) return snapshot();
    manualStatus = status; autoAway = false; effectiveStatus = status;
    if (status === 'online') { lastActivityAt = Date.now(); writeActivity(lastActivityAt); }
    if (persist) writeManual(status);
    if (broadcast) publish({ type:'manual', status, lastActivityAt });
    scheduleIdle(); emit(); await sync(status); return snapshot();
  }
  const setManual = status => applyManual(status, { persist:true, broadcast:true });

  function handleBrowserMessage(message) {
    if (!message || message.userId !== userId || message.sourceTabId === tabId) return;
    if (message.type === 'activity') return void applyActivity(Number(message.lastActivityAt), { persist:false, broadcast:false });
    if (message.type === 'manual') {
      const status = normalize(message.status);
      if (!['online', 'busy'].includes(status)) return;
      manualStatus = status; writeManual(status); autoAway = false; effectiveStatus = status;
      if (Number(message.lastActivityAt) > lastActivityAt) lastActivityAt = Number(message.lastActivityAt);
      scheduleIdle(); emit(); void sync(status); return;
    }
    if (message.type === 'status' && manualStatus === 'online') {
      if (Number(message.lastActivityAt) > lastActivityAt) lastActivityAt = Number(message.lastActivityAt);
      autoAway = Boolean(message.autoAway); effectiveStatus = autoAway ? 'away' : 'online';
      scheduleIdle(); emit();
    }
  }
  function startBrowserSync() {
    browserChannel?.close?.(); browserChannel = null;
    if (!userId) return;
    if ('BroadcastChannel' in window) {
      browserChannel = new BroadcastChannel(`tl-presence-browser-v103:${userId}`);
      browserChannel.addEventListener('message', event => handleBrowserMessage(event.data));
    }
    if (!storageListenerStarted) {
      storageListenerStarted = true;
      window.addEventListener('storage', event => {
        if (!userId) return;
        if (event.key === activityKey(userId)) void applyActivity(Number(event.newValue), { persist:false, broadcast:false });
        if (event.key === manualKey(userId)) {
          const status = normalize(event.newValue);
          if (['online', 'busy'].includes(status) && status !== manualStatus) void applyManual(status, { persist:false, broadcast:false });
        }
      });
    }
  }
  function startActivityListeners() {
    if (activityListenersStarted) return;
    activityListenersStarted = true;
    const onActivity = event => {
      if (!event.isTrusted) return;
      const now = Date.now(), frequent = ['pointermove', 'scroll', 'wheel'].includes(event.type);
      if (frequent && now - lastFrequentActivityAt < 500) return;
      if (frequent) lastFrequentActivityAt = now;
      void recordActivity();
    };
    ACTIVITY_EVENTS.forEach(type => window.addEventListener(type, onActivity, { passive:true }));
  }
  function buildPeerState(raw) {
    const next = {}, newest = {};
    Object.entries(raw || {}).forEach(([key, entries]) => (Array.isArray(entries) ? entries : []).forEach(entry => {
      const id = String(entry?.user_id || key.split(':')[0] || '');
      if (!id) return;
      const stamp = new Date(entry?.at || 0).getTime() || 0;
      if (!Object.prototype.hasOwnProperty.call(newest, id) || stamp >= newest[id]) {
        newest[id] = stamp; next[id] = normalize(entry?.status || 'online');
      }
    }));
    return next;
  }

  async function connect(supabase, uid, initialStatus) {
    client = supabase || client; userId = uid || null;
    clearInterval(heartbeatTimer); clearTimeout(idleTimer);
    if (!userId) { effectiveStatus = 'offline'; emit(); return snapshot(); }
    manualStatus = readManual(userId, initialStatus);
    lastActivityAt = readTimestamp(activityKey(userId));
    if (!lastActivityAt) { lastActivityAt = Date.now(); writeActivity(lastActivityAt); }
    autoAway = manualStatus === 'online' && Date.now() - lastActivityAt >= IDLE_MS;
    effectiveStatus = autoAway ? 'away' : manualStatus;
    startBrowserSync(); startActivityListeners();
    if (presenceChannel && client) await client.removeChannel(presenceChannel);
    const channel = client.channel('tl-global-presence', { config: { presence: { key: `${userId}:${tabId}` } } });
    presenceChannel = channel.on('presence', { event:'sync' }, () => {
      peerState = buildPeerState(channel.presenceState()); emitPeers();
    }).subscribe(async state => {
      if (state === 'SUBSCRIBED') await channel.track({ user_id:userId, tab_id:tabId, status:effectiveStatus, at:new Date().toISOString() });
    });
    await sync(effectiveStatus); scheduleIdle();
    heartbeatTimer = setInterval(async () => { await evaluateIdle(); await sync(effectiveStatus); emitPeers(); }, HEARTBEAT_MS);
    emit(); return snapshot();
  }
  function disconnect() {
    clearTimeout(idleTimer); clearInterval(heartbeatTimer);
    browserChannel?.close?.(); browserChannel = null;
    const activeClient = client, activeChannel = presenceChannel;
    userId = null;
    if (activeChannel && activeClient) { activeChannel.untrack().catch(() => {}); activeClient.removeChannel(activeChannel); }
    presenceChannel = null; peerState = {}; emitPeers(); effectiveStatus = 'offline'; autoAway = false; emit();
  }

  window.TeamPresence = Object.freeze({
    connect, disconnect, setManual, recordActivity, getState:snapshot, resolve,
    subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); },
    subscribePeers(fn) { const handler = event => fn(event.detail?.peers || {}); window.addEventListener('tl:presence-peers', handler); fn({ ...peerState }); return () => window.removeEventListener('tl:presence-peers', handler); },
    getPeers() { return { ...peerState }; },
    constants: { IDLE_MS, PRODUCTION_IDLE_MS, HEARTBEAT_MS, HEARTBEAT_EXPIRE_MS }
  });
})();
