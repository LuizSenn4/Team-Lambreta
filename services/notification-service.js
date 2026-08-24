(() => {
  'use strict';
  if (window.TeamNotifications) return;
  const client = window.teamSupabase;
  const listeners = new Set();
  let session = null, channel = null, unread = 0, generation = 0;
  const emit = () => {
    const detail = { unread };
    listeners.forEach(listener => listener(detail));
    window.dispatchEvent(new CustomEvent('tl:notifications', { detail }));
  };
  async function refresh() {
    if (!session?.user) { unread = 0; emit(); return; }
    const result = await client.from('private_messages').select('id', { count:'exact', head:true }).eq('receiver_id', session.user.id).is('read_at', null).eq('hidden_by_receiver', false);
    if (!result.error) { unread = result.count || 0; emit(); }
  }
  async function senderProfile(userId) {
    try { return await window.TeamProfiles?.getPublicProfile(userId); } catch { return null; }
  }
  async function notifyMessage(message) {
    if (location.pathname.endsWith('/buddy.html') && window.TeamBuddy?.isConversationOpenWith?.(message.sender_id)) return;
    const profile = await senderProfile(message.sender_id);
    const toast = document.createElement('a');
    toast.className = 'tl-notification-toast'; toast.href = `buddy.html?chat=${encodeURIComponent(message.sender_id)}`;
    toast.innerHTML = `<strong>💬 ${String(profile?.display_name || 'Nova mensagem').replace(/[<>]/g, '')}</strong><span>${String(message.body || 'Abre o Buddy para ler.').slice(0, 90).replace(/[<>]/g, '')}</span>`;
    document.body.append(toast); requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220); }, 5000);
  }
  function show(message, options = {}) {
    const toast = document.createElement('div');
    const type = ['success', 'error', 'info'].includes(options.type) ? options.type : 'info';
    toast.className = `tl-notification-toast tl-notification-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    const title = document.createElement('strong');
    title.textContent = String(message || '');
    toast.append(title);
    if (options.code) {
      const code = document.createElement('span');
      code.textContent = `Código: ${options.code}`;
      toast.append(code);
    }
    document.body.append(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    const timer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    }, Number(options.duration) || 4200);
    return () => { clearTimeout(timer); toast.remove(); };
  }
  async function connect(nextSession) {
    const current = ++generation; session = nextSession || null;
    if (channel) { await client.removeChannel(channel); channel = null; }
    if (!session?.user || current !== generation) { unread = 0; emit(); return; }
    await refresh();
    channel = client.channel(`tl-notifications-${session.user.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'private_messages', filter:`receiver_id=eq.${session.user.id}` }, payload => { unread += 1; emit(); notifyMessage(payload.new); })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'private_messages', filter:`receiver_id=eq.${session.user.id}` }, refresh)
      .subscribe();
  }
  window.TeamAuth?.subscribe(connect);
  window.addEventListener('buddy:messages-read', refresh);
  window.TeamNotifications = Object.freeze({ show, refresh, getUnread: () => unread, subscribe(listener) { listeners.add(listener); listener({ unread }); return () => listeners.delete(listener); } });
})();
