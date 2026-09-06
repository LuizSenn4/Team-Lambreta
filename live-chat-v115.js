(() => {
  'use strict';
  if (window.TeamLiveChat) return;

  const sb = window.teamSupabase;
  const box = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const mentionBox = document.getElementById('chatMentionSuggestions');
  const mentionBadge = document.getElementById('chatMentionBadge');
  const moderationPanel = document.getElementById('moderationPanel');
  const moderationTarget = document.getElementById('moderationTarget');
  const moderationInfo = document.getElementById('chatModerationInfo');
  if (!sb || !box || !form || !input) return;

  const room = String(window.TL_CHAT_ROOM || document.body.dataset.chatRoom || 'lobby')
    .trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '').slice(0, 120) || 'lobby';
  window.TeamLambretaChatRoom = room;

  let session = null;
  let profile = null;
  let channel = null;
  let rows = [];
  let mentionProfiles = [];
  let selectedTargetId = null;
  let sendTimes = [];
  let authUnsubscribe = null;
  let destroyed = false;
  let renderGeneration = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalizeRole = role => window.TeamPermissions?.normalizeRole?.(role) || String(role || 'member').toLowerCase();
  const roleLabel = role => window.TeamPermissions?.roleLabel?.(role) || 'MEMBRO';
  const canForRole = (role, permission) => window.TeamPermissions?.canForRole?.(role, permission) || false;
  const canModerate = () => canForRole(profile?.role, 'chat.moderate');
  const canManageRoles = () => canForRole(profile?.role, 'admin.full');
  const isStreamer = p => p?.is_streamer === true || String(p?.is_streamer).toLowerCase() === 'true';
  const isVip = p => Boolean(p?.vip_until && new Date(p.vip_until).getTime() > Date.now());
  const avatar = p => window.TeamProfiles?.getAvatarUrl?.(p) || p?.avatar_url || '';
  const nameOf = p => p?.game_nickname || p?.full_name || 'Membro';
  const nearBottom = () => box.scrollHeight - box.scrollTop - box.clientHeight < 120;

  function formatMessage(text) {
    return esc(text).replace(/(^|\s)@([A-Za-z0-9_.-]{2,32})/g, '$1<span class="tl-chat-mention">@$2</span>');
  }

  function rowMarkup(row) {
    const p = row.profiles || {};
    const name = nameOf(p);
    const role = normalizeRole(p.role);
    const mine = session?.user?.id === row.user_id;
    const src = avatar(p);
    const badges = `${isStreamer(p) ? '<small class="streamer-badge">STREAMER</small>' : ''}${isVip(p) ? '<small class="vip-badge">VIP</small>' : ''}`;
    const actions = session ? `<div class="tl-chat-actions"><button type="button" data-chat-action="reply">Responder</button>${mine || canModerate() ? '<button type="button" data-chat-action="delete">Apagar</button>' : ''}${!mine ? '<button type="button" data-chat-action="report">Denunciar</button><button type="button" data-chat-action="block">Bloquear</button>' : ''}${canModerate() && !mine ? '<button type="button" data-chat-action="moderate">Moderar</button>' : ''}</div>` : '';
    return `<article class="chat-message role-${esc(role)}" data-message-id="${esc(row.id)}" data-user-id="${esc(row.user_id)}" data-nickname="${esc(name)}"><div class="chat-avatar">${src ? `<img src="${esc(src)}" alt="">` : `<span>${esc(name.slice(0,2).toUpperCase())}</span>`}</div><div class="chat-message-main"><div class="chat-message-head"><strong>${esc(name)}</strong><small>${esc(roleLabel(role))}</small>${badges}<time>${new Date(row.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</time></div><p>${formatMessage(row.message)}</p>${actions}</div></article>`;
  }

  function mentionStorageKey() { return `tl_mentions_read_${session?.user?.id || 'guest'}`; }
  function readMentionIds() { try { return new Set(JSON.parse(localStorage.getItem(mentionStorageKey()) || '[]').map(String)); } catch { return new Set(); } }
  function saveMentionIds(ids) { try { localStorage.setItem(mentionStorageKey(), JSON.stringify([...ids].slice(-200))); } catch {} }
  function currentNickname() { return String(profile?.game_nickname || profile?.display_name || '').trim(); }
  function mentionsMe(row) {
    const nick = currentNickname();
    if (!nick || row.user_id === session?.user?.id) return false;
    const safe = nick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)@${safe}(?=\\s|$|[.,!?;:])`, 'i').test(String(row.message || ''));
  }
  function updateMentionBadge() {
    if (!mentionBadge) return;
    const unread = rows.filter(mentionsMe).filter(row => !readMentionIds().has(String(row.id)));
    mentionBadge.hidden = unread.length === 0;
    mentionBadge.classList.toggle('is-visible', unread.length > 0);
    mentionBadge.textContent = unread.length ? `@ ${unread.length}` : '';
  }

  async function loadRows({ follow = false } = {}) {
    const generation = ++renderGeneration;
    if (!session?.user) {
      rows = [];
      box.innerHTML = '<div class="sb-login-required">Entra com Google para ver e escrever no chat.</div>';
      return;
    }
    const shouldFollow = follow || nearBottom() || !rows.length;
    const { data, error } = await sb.from('chat_messages')
      .select('id,message,created_at,user_id,profiles!chat_messages_user_id_fkey(full_name,game_nickname,role,presence,last_seen,avatar_url,donation_total,vip_until,is_streamer)')
      .eq('is_deleted', false).eq('room', room).order('created_at', { ascending:false }).limit(30);
    if (destroyed || generation !== renderGeneration) return;
    if (error) { box.innerHTML = `<p>${esc(error.message)}</p>`; return; }
    rows = [...(data || [])].reverse();
    box.innerHTML = rows.length ? rows.map(rowMarkup).join('') : '<div class="empty-chat">Ainda não há mensagens nesta live.</div>';
    updateMentionBadge();
    if (shouldFollow) box.scrollTop = box.scrollHeight;
  }

  async function loadMentionProfiles() {
    if (!session?.user) return;
    const { data } = await sb.from('profiles').select('id,game_nickname,full_name,role').not('game_nickname','is',null).order('game_nickname').limit(100);
    mentionProfiles = (data || []).filter(item => item.game_nickname);
  }
  function mentionToken() {
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret);
    const match = before.match(/(?:^|\s)@([A-Za-z0-9_.-]*)$/);
    return match ? { query:match[1], start:caret-match[1].length-1, end:caret } : null;
  }
  function closeMentions() { if (mentionBox) { mentionBox.hidden = true; mentionBox.innerHTML = ''; } }
  async function renderMentions() {
    if (!mentionBox) return;
    const token = mentionToken();
    if (!token) return closeMentions();
    if (!mentionProfiles.length) await loadMentionProfiles();
    const query = token.query.toLowerCase();
    const matches = mentionProfiles.filter(p => `${p.game_nickname} ${p.full_name || ''}`.toLowerCase().includes(query)).slice(0, 12);
    if (!matches.length) return closeMentions();
    mentionBox.innerHTML = matches.map(p => `<button type="button" data-mention="${esc(p.game_nickname)}"><strong>@${esc(p.game_nickname)}</strong><small>${esc(roleLabel(p.role))}</small></button>`).join('');
    mentionBox.hidden = false;
  }

  function moderateText(text) {
    const value = String(text || '').normalize('NFKC').trim();
    if (!value) return '';
    if (/(.)\1{12,}/u.test(value)) return '';
    return value.slice(0, 240);
  }
  function floodAllowed() {
    const now = Date.now();
    sendTimes = sendTimes.filter(time => now - time < 10000);
    if (sendTimes.length >= 5) return false;
    sendTimes.push(now);
    return true;
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!session?.user || form.dataset.sending === '1') return;
    const clean = moderateText(input.value);
    if (!clean) return;
    if (!floodAllowed()) { if (moderationInfo) moderationInfo.textContent = 'Aguarda alguns segundos antes de enviar novamente.'; return; }
    form.dataset.sending = '1';
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    let message = clean;
    let translation = null;
    const target = window.TLChatTranslateTarget?.() || '';
    if (target) {
      try {
        const result = await sb.functions.invoke('translate-message', { body:{ text:clean, target } });
        if (!result.error && result.data?.translatedText) translation = result.data;
      } catch {}
    }
    if (translation?.translatedText) message = translation.translatedText;
    let payload = { user_id:session.user.id, message, room };
    if (translation?.translatedText) payload = { ...payload, original_message:clean, translated_message:translation.translatedText, source_language:translation.detectedSourceLanguage || null, target_language:target };
    let { error } = await sb.from('chat_messages').insert(payload);
    if (error && translation) ({ error } = await sb.from('chat_messages').insert({ user_id:session.user.id, message, room }));
    if (!error) { input.value = ''; closeMentions(); await loadRows({ follow:true }); }
    else if (moderationInfo) moderationInfo.textContent = error.message;
    form.dataset.sending = '0';
    if (submit) submit.disabled = false;
  }

  async function blockUser(article) {
    const userId = article?.dataset.userId;
    if (!userId || !confirm(`Bloquear @${article.dataset.nickname || 'utilizador'}?`)) return;
    const { error } = await sb.rpc('block_chat_user', { target_user_id:userId });
    if (!error) await loadRows(); else alert(error.message);
  }
  async function reportMessage(article) {
    const reason = prompt('Motivo da denúncia:');
    if (!reason?.trim()) return;
    const details = prompt('Detalhes adicionais (opcional):') || null;
    const { error } = await sb.rpc('report_and_block_chat_message', { target_message_id:Number(article.dataset.messageId), report_reason:reason.trim(), report_details:details?.trim() || null });
    if (error) alert(error.message); else { if (moderationInfo) moderationInfo.textContent = 'Denúncia enviada.'; await loadRows(); }
  }
  async function deleteMessage(article) {
    if (!confirm('Apagar esta mensagem?')) return;
    const { error } = await sb.rpc('moderate_chat_message', { target_message_id:Number(article.dataset.messageId) });
    if (error) alert(error.message); else await loadRows();
  }
  function replyTo(article) {
    const nick = article?.dataset.nickname;
    if (!nick) return;
    input.value = `${input.value.trimEnd()}${input.value.trim() ? ' ' : ''}@${nick} `;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  function openModeration(article) {
    if (!moderationPanel || !canModerate()) return;
    selectedTargetId = article.dataset.userId || null;
    if (moderationTarget) moderationTarget.textContent = `@${article.dataset.nickname || 'utilizador'}`;
    moderationPanel.classList.add('show');
  }

  async function handleModerationAction(button) {
    const action = button.dataset.modAction;
    if (action === 'close') { moderationPanel?.classList.remove('show'); return; }
    if (!selectedTargetId || !canModerate()) return;
    if (action === 'ban' || action === 'unban') {
      const { error } = await sb.rpc('set_chat_ban', { target_user_id:selectedTargetId, banned:action === 'ban' });
      if (error) alert(error.message); else { if (moderationInfo) moderationInfo.textContent = action === 'ban' ? 'Usuário bloqueado permanentemente.' : 'Bloqueio permanente removido.'; moderationPanel?.classList.remove('show'); }
      return;
    }
    const minutes = action === 'block-1' ? 1 : action === 'block-5' ? 5 : action === 'block-15' ? 15 : 0;
    if (!['block-1','block-5','block-15','unblock'].includes(action)) return;
    const { error } = await sb.rpc('moderate_user', { target_user_id:selectedTargetId, mute_minutes:minutes });
    if (error) alert(error.message); else { if (moderationInfo) moderationInfo.textContent = minutes ? `Usuário silenciado por ${minutes} min.` : 'Silêncio removido.'; moderationPanel?.classList.remove('show'); }
  }

  async function handleRoleAction(button) {
    if (!selectedTargetId || !canManageRoles()) return;
    const desired = button.dataset.roleSet === 'user' ? 'member' : button.dataset.roleSet;
    if (!['member','supporter','vip','staff','moderator','admin'].includes(desired)) return;
    const { error } = await sb.rpc('set_profile_identity', { target_user_id:selectedTargetId, new_identity:desired });
    if (error) alert(error.message); else { moderationPanel?.classList.remove('show'); await loadRows(); }
  }

  function configureModerationPanel() {
    if (!moderationPanel) return;
    moderationPanel.querySelectorAll('[data-mod-action]').forEach(button => {
      const action = button.dataset.modAction;
      button.hidden = action !== 'close' && !canModerate();
    });
    moderationPanel.querySelectorAll('[data-role-set],[data-badge-set]').forEach(button => { button.hidden = !canManageRoles(); });
  }

  async function connect(nextSession) {
    session = nextSession || null;
    profile = session?.user ? await window.TeamProfiles?.getCurrentProfile?.({ fresh:false }) || null : null;
    configureModerationPanel();
    mentionProfiles = [];
    if (channel) { await sb.removeChannel(channel); channel = null; }
    if (!session?.user) { await loadRows(); return; }
    await loadRows({ follow:true });
    channel = sb.channel(`tl-live-chat-${room}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages', filter:`room=eq.${room}` }, () => loadRows({ follow:true }))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'chat_messages', filter:`room=eq.${room}` }, () => loadRows())
      .subscribe();
  }

  form.addEventListener('submit', sendMessage);
  input.addEventListener('input', renderMentions);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !document.getElementById('enterBreakToggle')?.checked) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  mentionBox?.addEventListener('click', event => {
    const button = event.target.closest('[data-mention]');
    if (!button) return;
    const token = mentionToken();
    if (!token) return;
    input.value = `${input.value.slice(0,token.start)}@${button.dataset.mention} ${input.value.slice(token.end)}`;
    input.focus(); closeMentions();
  });
  mentionBadge?.addEventListener('click', () => {
    const ids = readMentionIds();
    const target = rows.find(row => mentionsMe(row) && !ids.has(String(row.id))) || rows.find(mentionsMe);
    if (!target) return;
    document.querySelector(`[data-message-id="${CSS.escape(String(target.id))}"]`)?.scrollIntoView({ behavior:'smooth', block:'center' });
    ids.add(String(target.id)); saveMentionIds(ids); updateMentionBadge();
  });
  box.addEventListener('click', event => {
    const button = event.target.closest('[data-chat-action]');
    const article = event.target.closest('[data-message-id]');
    if (!button || !article) return;
    const action = button.dataset.chatAction;
    if (action === 'reply') replyTo(article);
    else if (action === 'delete') deleteMessage(article);
    else if (action === 'report') reportMessage(article);
    else if (action === 'block') blockUser(article);
    else if (action === 'moderate') openModeration(article);
  });
  moderationPanel?.addEventListener('click', event => {
    const mod = event.target.closest('[data-mod-action]');
    if (mod) return void handleModerationAction(mod);
    const role = event.target.closest('[data-role-set]');
    if (role) return void handleRoleAction(role);
    const badge = event.target.closest('[data-badge-set]');
    if (badge && canManageRoles()) return void handleRoleAction(Object.assign(document.createElement('button'), { dataset:{ roleSet:badge.dataset.enabled === 'true' ? badge.dataset.badgeSet : 'member' } }));
  });

  authUnsubscribe = window.TeamAuth?.subscribe?.(next => { void connect(next); }) || null;
  if (!authUnsubscribe) void window.TeamAuth?.getSession?.().then(connect);

  function destroy() {
    destroyed = true;
    authUnsubscribe?.();
    if (channel) sb.removeChannel(channel);
    channel = null;
  }
  window.addEventListener('pagehide', destroy, { once:true });
  window.TeamLiveChat = Object.freeze({ room, refresh:() => loadRows(), destroy });
})();
