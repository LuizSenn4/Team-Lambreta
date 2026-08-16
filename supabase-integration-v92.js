(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  if (!sb) { console.error('[Team Lambreta] Supabase SDK não carregou.'); return; }
  window.teamSupabase = sb;

  // V93.7.0 — salas de chat isoladas e sessões temporárias por transmissão.
  // Home usa 'lobby'; páginas de live definem window.TL_CHAT_ROOM antes deste script.
  const CHAT_ROOM = (() => {
    const raw = String(window.TL_CHAT_ROOM || document.body?.dataset?.chatRoom || 'lobby').trim().toLowerCase();
    const safe = raw.replace(/[^a-z0-9:_-]/g, '').slice(0, 120);
    return safe || 'lobby';
  })();
  window.TeamLambretaChatRoom = CHAT_ROOM;

  let session = null;
  let profile = null;
  let chatChannel = null;
  let chatRefreshTimer = null;
  let chatChannelStatus = 'CLOSED';
  let inboxChannel = null;
  let selectedTargetId = null;
  let unreadChat = 0;
  let audioContext = null;
  let lastKnownMessageId = 0;
  let initialChatLoaded = false;
  let manualPresence = 'online';
  let autoAway = false;
  let lastActivityAt = Date.now();
  let heartbeatTimer = null;
  let recentSendTimes = [];
  const AWAY_AFTER_MS = 5 * 60 * 1000;
  const OFFLINE_AFTER_MS = 150 * 1000;
  let mentionProfiles = [];
  let mentionContextReady = false;
  let mentionActiveIndex = 0;
  let currentMentionRows = [];

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  if ($('chatAuthBox') && !document.querySelector('link[data-chat-auth-unified]')) {
    const authStyles = document.createElement('link');
    authStyles.rel = 'stylesheet';
    authStyles.href = 'chat-auth-unified-v99.css?v=99.0';
    authStyles.dataset.chatAuthUnified = '1';
    document.head.appendChild(authStyles);
  }
  const normalizeRole = role => ({dev:'master',developer:'master',owner:'master',boss:'master',administrador:'admin',mod:'moderator',moderador:'moderator',helper:'staff',suporte:'staff',apoiador:'supporter',support:'supporter',user:'member',usuario:'member',membro:'member'}[String(role||'').trim().toLowerCase()] || String(role||'member').trim().toLowerCase() || 'member');
  const teamRoles = new Set(['moderator','staff','admin','master']);
  const moderationRoles = new Set(['moderator','staff','admin','master']);
  const roleRank = { member:0, supporter:0, vip:0, staff:1, moderator:2, admin:3, master:4 };
  const isTeam = () => teamRoles.has(normalizeRole(profile?.role));
  const canModerate = () => moderationRoles.has(normalizeRole(profile?.role));
  const canManageRoles = () => ['admin','master'].includes(normalizeRole(profile?.role));
  const statusDb = v => ({busy:'busy',away:'away',online:'online'}[v] || 'online');
  const statusUi = v => ({busy:'busy',away:'away',online:'online',offline:'offline'}[v] || 'offline');
  const roleClass = role => { const mapped = normalizeRole(role); return ['master','admin','moderator','staff','vip','supporter','member'].includes(mapped) ? mapped : 'member'; };
  const roleLabel = role => ({master:'DEV',admin:'ADMIN',moderator:'MODERADOR',staff:'STAFF',vip:'VIP',supporter:'APOIADOR',member:'MEMBRO'}[normalizeRole(role)] || 'MEMBRO');
  const isVip = p => Boolean(p?.vip_until && Number.isFinite(new Date(p.vip_until).getTime()) && new Date(p.vip_until).getTime() > Date.now());
  const isStreamer = p => p?.is_streamer === true || String(p?.is_streamer).toLowerCase() === 'true';
  const extraBadges = p => isStreamer(p) ? '<small class="streamer-badge">STREAMER</small>' : (isVip(p) ? '<small class="vip-badge">VIP</small>' : '');
  const identityClass = p => {
    const role = roleClass(p?.role);
    if (role === 'master' || role === 'admin') return 'admin';
    if (role === 'staff') return 'staff';
    if (role === 'moderator') return 'moderator';
    if (role === 'supporter') return 'supporter';
    if (role === 'vip') return 'vip';
    if (isStreamer(p)) return 'streamer';
    if (isVip(p)) return 'vip';
    return 'member';
  };
  const identityPalette = {
    admin: { color:'var(--role-dev, #5ef3ff)', rgb:'94,243,255' },
    staff: { color:'#ff6679', rgb:'255,102,121' },
    moderator: { color:'#75b8ff', rgb:'117,184,255' },
    streamer: { color:'#ff74ec', rgb:'255,116,236' },
    vip: { color:'#ffd45d', rgb:'255,212,93' },
    supporter: { color:'#73ff18', rgb:'115,255,24' },
    member: { color:'#f6f8fb', rgb:'246,248,251' }
  };
  const effectivePresence = p => {
    if (!p) return 'offline';
    const seen = p.last_seen ? new Date(p.last_seen).getTime() : 0;
    if (!seen || Date.now() - seen > OFFLINE_AFTER_MS) return 'offline';
    return statusUi(p.presence);
  };


  function mentionStorageKey() {
    return `tl_mentions_read_${session?.user?.id || 'guest'}`;
  }

  function getReadMentionIds() {
    try { return new Set(JSON.parse(localStorage.getItem(mentionStorageKey()) || '[]').map(String)); }
    catch (_) { return new Set(); }
  }

  function saveReadMentionIds(ids) {
    localStorage.setItem(mentionStorageKey(), JSON.stringify([...ids].slice(-200)));
  }

  function messageMentionsNickname(message, nickname) {
    if (!message || !nickname) return false;
    const escaped = String(nickname).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,!?;:])`, 'i').test(String(message));
  }

  function formatChatMessage(message) {
    const escapedMessage = esc(message);
    return escapedMessage.replace(/(^|\s)@([A-Za-z0-9_.-]{2,32})/g, '$1<span class="tl-chat-mention">@$2</span>');
  }

  function updateMentionBadge(rows) {
    const badge = $('chatMentionBadge');
    if (!badge) return;

    const nickname = String(
      profile?.game_nickname ||
      session?.user?.user_metadata?.game_nickname ||
      session?.user?.user_metadata?.preferred_username ||
      ''
    ).trim();

    if (!session?.user?.id || !nickname) {
      currentMentionRows = [];
      badge.hidden = true;
      badge.textContent = '';
      return;
    }

    const readIds = getReadMentionIds();
    currentMentionRows = (rows || []).filter(row =>
      String(row.user_id) !== String(session.user.id) &&
      messageMentionsNickname(row.message, nickname)
    );

    const unread = currentMentionRows.filter(row => !readIds.has(String(row.id)));
    badge.hidden = unread.length === 0;
    badge.classList.toggle('is-visible', unread.length > 0);
    badge.textContent = unread.length ? `@ ${unread.length}` : '';
    badge.setAttribute('aria-label', unread.length === 1 ? '1 menção nova' : `${unread.length} menções novas`);
    badge.title = unread.length === 1 ? 'Ir para a menção' : `Ver ${unread.length} menções`;
  }

  function openNextMention() {
    const badge = $('chatMentionBadge');
    if (!badge) return;
    const readIds = getReadMentionIds();
    const unread = currentMentionRows.filter(row => !readIds.has(String(row.id)));
    const target = unread[0] || currentMentionRows[0];
    if (!target) return;
    const card = document.querySelector(`[data-message-id="${CSS.escape(String(target.id))}"]`);
    if (!card) return;
    card.scrollIntoView({behavior:'smooth',block:'center'});
    card.classList.add('tl-chat-mention-focus');
    setTimeout(()=>card.classList.remove('tl-chat-mention-focus'),1800);
    readIds.add(String(target.id));
    saveReadMentionIds(readIds);
    updateMentionBadge(currentMentionRows);
  }

  async function loadMentionProfiles() {
    if (!session) return [];
    const {data,error}=await sb.from('profiles')
      .select('id,game_nickname,full_name,role,presence,last_seen')
      .not('game_nickname','is',null)
      .order('game_nickname',{ascending:true})
      .limit(100);
    if (error) return mentionProfiles;
    mentionProfiles=(data||[]).filter(p=>p.game_nickname);
    return mentionProfiles;
  }

  function activeMentionQuery(input) {
    const value=String(input?.value||'');
    const caret=input?.selectionStart ?? value.length;
    const before=value.slice(0,caret);
    const match=before.match(/(?:^|\s)@([A-Za-z0-9_.-]*)$/);
    return match ? {query:match[1],start:caret-match[1].length-1,end:caret} : null;
  }

  function closeMentionSuggestions() {
    const box=$('chatMentionSuggestions');
    if(box){box.hidden=true;box.innerHTML='';}
    mentionActiveIndex=0;
  }

  function chooseMention(input,item) {
    const token=activeMentionQuery(input);
    if(!token) return;
    const value=input.value;
    input.value=`${value.slice(0,token.start)}@${item.game_nickname} ${value.slice(token.end)}`;
    const caret=token.start+item.game_nickname.length+2;
    input.setSelectionRange(caret,caret);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.focus();
    closeMentionSuggestions();
  }

  async function renderMentionSuggestions(input) {
    const box=$('chatMentionSuggestions');
    if(!box) return;
    const token=activeMentionQuery(input);
    if(!token){closeMentionSuggestions();return;}
    if(!mentionContextReady && !mentionProfiles.length) await loadMentionProfiles();
    const q=token.query.toLowerCase();
    const matches=mentionProfiles.filter(p=>{
      const nickname=String(p.game_nickname||'').toLocaleLowerCase('pt-PT');
      const visible=String(p.full_name||'').toLocaleLowerCase('pt-PT');
      return nickname.includes(q)||visible.includes(q);
    }).slice(0,20);
    if(!matches.length){closeMentionSuggestions();return;}
    mentionActiveIndex=Math.min(mentionActiveIndex,matches.length-1);
    box.innerHTML=matches.map((p,i)=>`<button type="button" class="tl-mention-option ${i===mentionActiveIndex?'is-active':''}" data-mention-index="${i}"><strong>@${esc(p.game_nickname)}</strong><small>${roleLabel(p.role)}</small></button>`).join('');
    box.hidden=false;
    box.querySelectorAll('[data-mention-index]').forEach(btn=>{
      btn.onmousedown=e=>e.preventDefault();
      btn.onclick=()=>chooseMention(input,matches[Number(btn.dataset.mentionIndex)]);
    });
    const active=box.querySelector(`[data-mention-index="${mentionActiveIndex}"]`);
    active?.scrollIntoView({block:'nearest'});
    box._matches=matches;
  }

  // Filtro preventivo: normaliza acentos, leetspeak, símbolos e letras repetidas.
  const blockedCanonical = new Set([
    'puta','puto','putaria','caralho','fdp','filhodaputa','merda','porra','cabrao','buceta','pica','foder','fodase','cuzao','desgracado',
    'nigger','faggot','cunt','motherfucker','pendejo','cabron','mierda',
    'porn','porno','pornografia','hentai','onlyfans','nude','nudes','xxx','sexoexplicito','pornhub','xvideos','xnxx','redtube','youporn'
  ]);
  const leetMap = {'0':'o','1':'i','2':'z','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','9':'g','@':'a','$':'s','!':'i','+':'t'};
  function canonicalToken(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().split('').map(ch=>leetMap[ch]||ch).join('')
      .replace(/[^a-z]/g,'')
      .replace(/(.)\1{1,}/g,'$1');
  }
  function moderateText(text) {
    const normalized = String(text || '').normalize('NFKC');
    if (/(.)\1{12,}/u.test(normalized)) return { ok:false, reason:'Flood de caracteres bloqueado.', text:normalized };
    const parts = normalized.split(/(\s+)/);
    const clean = parts.map(part => {
      if (/^\s+$/.test(part)) return part;
      const canonical = canonicalToken(part);
      if (!canonical) return part;
      const blocked = [...blockedCanonical].some(term => canonical === term || canonical.startsWith(term) || (term.length >= 5 && canonical.includes(term)));
      return blocked ? '####' : part;
    }).join('');
    return { ok:true, text:clean };
  }


  function getAudioContext() {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function beep(frequency=720, duration=.045, volume=.035, delay=0) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delay;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start); osc.stop(start + duration + .01);
    } catch (_) {}
  }

  function playChatTick(kind='receive', senderRole='member') {
    if ((profile?.presence || $('userStatus')?.value) !== 'online') return;
    if (kind === 'send') { beep(660,.035,.025); return; }
    if (['master','admin','moderator','staff'].includes(senderRole)) {
      beep(820,.04,.035); beep(1040,.045,.03,.065);
    } else beep(760,.045,.03);
  }

  function renderUnreadBadge() {
    const badge = $('chatUnreadBadge');
    const status = profile?.presence || $('userStatus')?.value || 'online';
    if (!badge) return;
    const visible = status === 'online' && unreadChat > 0;
    badge.hidden = !visible;
    badge.textContent = unreadChat > 99 ? '99+' : String(unreadChat);
  }

  async function loginGoogle() {
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } });
    if (error) alert(`Erro no login: ${error.message}`);
  }
  async function logout() { sessionStorage.removeItem('tl_admin_unlocked'); await sb.auth.signOut(); location.reload(); }

  async function loadProfile() {
    profile = null;
    if (!session?.user) return;
    const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    if (!error) profile = data;
    if (currentMentionRows.length) updateMentionBadge(currentMentionRows);
  }

  async function ensureNickname() {
    if (!session || profile?.game_nickname) return true;
    const holder = $('chatAuthBox') || $('supabaseAuthBar');
    if (!holder || document.querySelector('.sb-profile-prompt')) return false;
    const box = document.createElement('div');
    box.className = 'sb-profile-prompt';
    box.innerHTML = '<strong>Falta o nickname do jogo</strong><input id="sbNicknameInput" maxlength="32" placeholder="Ex.: LambretaEdu"><button id="sbNicknameSave" type="button">Guardar nickname</button>';
    holder.appendChild(box);
    $('sbNicknameSave').onclick = async () => {
      const nick = $('sbNicknameInput').value.trim();
      if (nick.length < 2) return alert('Escreve um nickname válido.');
      const { error } = await sb.from('profiles').update({game_nickname:nick,updated_at:new Date().toISOString()}).eq('id',session.user.id);
      if (error) return alert(error.message);
      await loadProfile(); box.remove(); renderAuth();
    };
    return false;
  }

  function renderAdminKey() {
    document.querySelector('.tl-admin-key')?.remove();
    if (!session || !['master','admin','moderator','staff'].includes(profile?.role)) return;
    const role = roleClass(profile?.role);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tl-admin-key tl-admin-key-${role}`;
    button.setAttribute('aria-label', `Painel administrativo — ${roleLabel(profile?.role)}`);
    button.title = `Painel administrativo — ${roleLabel(profile?.role)}`;
    button.innerHTML = `<svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="42" cy="43" r="24"/><circle cx="82" cy="40" r="30"/><circle cx="50" cy="82" r="29"/><circle cx="77" cy="71" r="22"/>
        <path d="M92 85 137 130M111 104l12-12M121 116l13-13M130 126l10-10"/>
        <path d="M137 130h-19v-13h-13v-13"/>
      </g>
    </svg>`;
    button.addEventListener('click', async () => {
      if (!session) { await loginGoogle(); return; }
      const modal = ensurePwdModal();
      modal.hidden = false;
      setTimeout(() => $('tlAdminPassword')?.focus(), 30);
    });
    (document.querySelector('.tl-global-tools') || document.body).appendChild(button);
  }

  function renderAuth() {
    const bar = $('supabaseAuthBar');
    if (bar) {
      const embeddedAuth = Boolean($('chatAuthBox'));
      bar.hidden = embeddedAuth;
      if (embeddedAuth) bar.replaceChildren();
      else {
        if (!session) bar.innerHTML = '<button id="sbGlobalLogin" class="google-brand-login" type="button"><img src="img/brasao.png" alt="">Entrar com Google</button>';
        else bar.innerHTML = `<div class="sb-user role-${roleClass(profile?.role)}">${profile?.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:''}<span>${esc(profile?.game_nickname || profile?.full_name || session.user.email)}</span><small>${roleLabel(profile?.role)}</small>${extraBadges(profile)}</div><button class="sb-logout" id="sbLogout" type="button">Sair</button>`;
        $('sbGlobalLogin')?.addEventListener('click', loginGoogle);
        $('sbLogout')?.addEventListener('click', logout);
      }
    }
    const authBox = $('chatAuthBox');
    if (authBox) {
      authBox.classList.toggle('is-connected', Boolean(session));
      if (session) {
        const nickname = profile?.game_nickname || profile?.full_name || 'Google';
        const avatar = profile?.avatar_url
          ? `<img class="chat-auth-user-avatar" src="${esc(profile.avatar_url)}" alt="Avatar de ${esc(nickname)}">`
          : `<span class="chat-auth-user-avatar is-fallback" aria-hidden="true">${esc(nickname.charAt(0).toUpperCase())}</span>`;
        authBox.innerHTML = `<div class="chat-auth-user role-${roleClass(profile?.role)}">${avatar}<span class="chat-auth-user-name">${esc(nickname)}</span><small class="chat-auth-user-role">${roleLabel(profile?.role)}</small><button class="chat-auth-logout" id="chatAuthLogout" type="button">Sair</button></div>`;
        $('chatAuthLogout')?.addEventListener('click', logout);
      }
    }
    const btn = $('googleLoginBtn');
    if (btn) {
      btn.innerHTML = session ? `Logado como: ${esc(profile?.game_nickname || profile?.full_name || 'Google')}` : '<img class="google-login-logo" src="img/brasao.png" alt=""> Entrar com Google';
      btn.onclick = session ? null : loginGoogle;
      btn.disabled = Boolean(session);
      btn.setAttribute('aria-disabled', session ? 'true' : 'false');
      btn.title = session ? 'Conta conectada' : 'Entrar com Google';
    }
    const name = $('chatName');
    if (name && session) { name.value = profile?.game_nickname || profile?.full_name || ''; name.readOnly = true; }
    document.body.dataset.userRole = roleClass(profile?.role);
    updateStatusUi(profile?.presence || 'online');
    configureModerationPanel();
    renderAdminKey();
  }

  function updateStatusUi(value) {
    const status = statusUi(value);
    const picker = document.querySelector('.status-picker');
    const dot = $('onlineDot');
    if (picker) picker.dataset.status = status;
    if (dot) dot.className = `online-dot ${status}`;
    renderUnreadBadge();
  }

  async function setPresence(value, {manual=true}={}) {
    if (!session) return;
    const presence = statusDb(value);
    if (manual) { manualPresence = presence; autoAway = false; }
    const now = new Date().toISOString();
    const { error } = await sb.from('profiles').update({presence,last_seen:now,updated_at:now}).eq('id',session.user.id);
    if (!error && profile) { profile.presence = presence; profile.last_seen = now; }
    const picker = $('userStatus'); if (picker) picker.value = presence;
    updateStatusUi(presence);
    if (presence !== 'online') unreadChat = 0;
    renderUnreadBadge();
  }

  function registerActivity() {
    lastActivityAt = Date.now();
    if (!session) return;

    // Somente o AUSENTE automático volta para Online ao detectar atividade.
    // Ocupado e Ausente escolhidos manualmente permanecem fixos.
    if (autoAway && manualPresence === 'online') {
      autoAway = false;
      setPresence('online',{manual:false});
    }
  }

  async function presenceHeartbeat() {
    if (!session) return;

    const idle = Date.now() - lastActivityAt;

    // Apenas Online pode mudar sozinho para Ausente.
    if (manualPresence === 'online' && idle >= AWAY_AFTER_MS && !autoAway) {
      autoAway = true;
      await setPresence('away',{manual:false});
      return;
    }

    const desired =
      manualPresence === 'busy' ? 'busy' :
      manualPresence === 'away' ? 'away' :
      autoAway ? 'away' : 'online';

    const now = new Date().toISOString();
    await sb.from('profiles').update({
      presence: desired,
      last_seen: now,
      updated_at: now
    }).eq('id',session.user.id);

    if (profile) {
      profile.presence = desired;
      profile.last_seen = now;
    }
  }

  function startPresenceTracking() {
    clearInterval(heartbeatTimer);
    ['pointerdown','keydown','scroll','touchstart'].forEach(evt=>window.addEventListener(evt,registerActivity,{passive:true}));
    heartbeatTimer=setInterval(presenceHeartbeat,45000);
  }


  async function getBlockedChatUserIds() {
    if (!session?.user?.id) return new Set();
    const { data, error } = await sb.rpc('get_my_blocked_chat_users');
    if (error) {
      // Compatibilidade enquanto o SQL V93.4.6 ainda não tiver sido executado.
      console.warn('[Team Lambreta] Bloqueios pessoais indisponíveis:', error.message);
      return new Set();
    }
    return new Set((data || []).map(item => String(item.blocked_id)));
  }

  function ensureChatMessageMenu() {
    let menu = $('tlChatMessageMenu');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'tlChatMessageMenu';
    menu.className = 'tl-chat-message-menu';
    menu.hidden = true;
    document.body.appendChild(menu);

    document.addEventListener('pointerdown', event => {
      if (menu.hidden) return;
      if (!menu.contains(event.target) && !event.target.closest('.tl-chat-action')) menu.hidden = true;
    });
    window.addEventListener('resize', () => { menu.hidden = true; }, {passive:true});
    return menu;
  }

  function replyToChatUser(nickname) {
    const input = $('chatInput');
    if (!input || !nickname) return;
    const token = `@${nickname} `;
    const current = String(input.value || '');
    if (!current.toLowerCase().includes(`@${String(nickname).toLowerCase()}`)) {
      input.value = current ? `${token}${current}` : token;
    }
    input.focus();
    const caret = input.value.length;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }

  async function copyChatMessage(message) {
    try {
      await navigator.clipboard.writeText(String(message || ''));
      const info = $('chatModerationInfo');
      if (info) { info.textContent = 'Mensagem copiada.'; info.classList.remove('error'); }
    } catch (_) {
      alert('Não foi possível copiar a mensagem.');
    }
  }

  function ensureChatReportModal() {
    let modal = $('tlChatReportModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tlChatReportModal';
    modal.className = 'tl-chat-report-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="tl-chat-report-backdrop" data-report-close></div>
      <form class="tl-chat-report-card" id="tlChatReportForm">
        <button class="tl-chat-report-close" type="button" data-report-close aria-label="Fechar">×</button>
        <small>SEGURANÇA DA COMUNIDADE</small>
        <h3>Denunciar mensagem</h3>
        <p id="tlChatReportPreview"></p>
        <label>Motivo
          <select id="tlChatReportReason" required>
            <option value="">Selecionar motivo</option>
            <option value="Preconceito">Preconceito</option>
            <option value="Xenofobia">Xenofobia</option>
            <option value="Racismo">Racismo</option>
            <option value="Ofensa / insulto">Ofensa / insulto</option>
            <option value="Assédio">Assédio</option>
            <option value="Spam">Spam</option>
            <option value="Outro">Outro</option>
          </select>
        </label>
        <label>Detalhes (opcional)
          <textarea id="tlChatReportDetails" maxlength="500" rows="3" placeholder="Explica rapidamente o que aconteceu..."></textarea>
        </label>
        <div class="tl-chat-report-note">Ao denunciar, este utilizador também será bloqueado para ti automaticamente.</div>
        <button class="tl-chat-report-submit" type="submit">Enviar denúncia e bloquear</button>
      </form>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-report-close]').forEach(el => el.addEventListener('click',()=>{ modal.hidden=true; }));
    return modal;
  }

  function openChatReportModal(article) {
    if (!article || !session) return;
    const modal = ensureChatReportModal();
    modal.dataset.messageId = article.dataset.messageId || '';
    modal.dataset.userId = article.dataset.userId || '';
    $('tlChatReportReason').value = '';
    $('tlChatReportDetails').value = '';
    $('tlChatReportPreview').textContent = `@${article.dataset.nickname || 'utilizador'}: ${article.dataset.rawMessage || ''}`;
    modal.hidden = false;
  }

  async function submitChatReport(event) {
    event.preventDefault();
    const modal = $('tlChatReportModal');
    if (!modal) return;
    const messageId = Number(modal.dataset.messageId);
    const reason = $('tlChatReportReason')?.value || '';
    const details = $('tlChatReportDetails')?.value.trim() || null;
    if (!messageId || !reason) return;
    const button = modal.querySelector('.tl-chat-report-submit');
    if (button) button.disabled = true;
    const { error } = await sb.rpc('report_and_block_chat_message', {
      target_message_id: messageId,
      report_reason: reason,
      report_details: details
    });
    if (button) button.disabled = false;
    if (error) {
      alert(`Não foi possível enviar a denúncia: ${error.message}`);
      return;
    }
    modal.hidden = true;
    const info = $('chatModerationInfo');
    if (info) { info.textContent = 'Denúncia enviada. O utilizador foi bloqueado para ti.'; info.classList.remove('error'); }
    await renderChat();
  }

  async function blockChatUser(article) {
    if (!article || !session) return;
    const nickname = article.dataset.nickname || 'este utilizador';
    if (!confirm(`Bloquear @${nickname}? As mensagens desta pessoa deixarão de aparecer para ti.`)) return;
    const { error } = await sb.rpc('block_chat_user',{ target_user_id: article.dataset.userId });
    if (error) { alert(error.message); return; }
    const info = $('chatModerationInfo');
    if (info) { info.textContent = `@${nickname} foi bloqueado para ti.`; info.classList.remove('error'); }
    await renderChat();
  }

  function openChatMessageMenu(button) {
    const article = button.closest('.tl-chat-card');
    if (!article) return;
    const isOwn = String(article.dataset.userId) === String(session?.user?.id);
    const menu = ensureChatMessageMenu();
    menu.innerHTML = `
      <button type="button" data-chat-menu-action="copy">Copiar</button>
      ${!isOwn ? '<button type="button" data-chat-menu-action="reply">Responder</button>' : ''}
      ${!isOwn ? '<button type="button" data-chat-menu-action="report" class="is-warning">Denunciar</button>' : ''}
      ${!isOwn ? '<button type="button" data-chat-menu-action="block" class="is-danger">Bloquear</button>' : ''}
      ${canModerate() ? '<button type="button" data-chat-menu-action="delete" class="is-danger">Apagar mensagem</button>' : ''}`;
    const rect = button.getBoundingClientRect();
    menu.hidden = false;
    const menuRect = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(window.innerWidth-menuRect.width-8, Math.max(8, rect.right-menuRect.width))}px`;
    menu.style.top = `${Math.min(window.innerHeight-menuRect.height-8, rect.bottom+6)}px`;

    menu.querySelectorAll('[data-chat-menu-action]').forEach(actionButton => {
      actionButton.onclick = async () => {
        const action = actionButton.dataset.chatMenuAction;
        menu.hidden = true;
        if (action === 'copy') return copyChatMessage(article.dataset.rawMessage || '');
        if (action === 'reply') return replyToChatUser(article.dataset.nickname || '');
        if (action === 'report') return openChatReportModal(article);
        if (action === 'block') return blockChatUser(article);
        if (action === 'delete') {
          if (!confirm('Apagar esta mensagem?')) return;
          const { error }=await sb.rpc('moderate_chat_message',{target_message_id:Number(article.dataset.messageId)});
          if (error) alert(error.message); else await renderChat();
        }
      };
    });
  }

  async function renderChat() {
    const box = $('chatMessages');
    if (!box) return;

    // Preserva a leitura de mensagens antigas. Só acompanha o fim quando
    // o utilizador já estava perto do fundo ou no primeiro carregamento.
    const previousScrollTop = box.scrollTop;
    const previousScrollHeight = box.scrollHeight;
    const distanceFromBottom = previousScrollHeight - previousScrollTop - box.clientHeight;
    const wasNearBottom = distanceFromBottom <= 80;
    const shouldFollowBottom = !initialChatLoaded || wasNearBottom;

    if (!session) { box.innerHTML = '<div class="sb-login-required">Entra com Google para ver e escrever no chat.</div>'; return; }
    // Busca sempre as 30 mensagens MAIS RECENTES.
    // A consulta vem em ordem decrescente para o limite funcionar corretamente,
    // depois invertimos apenas para exibir do mais antigo ao mais novo.
    const { data, error } = await sb.from('chat_messages')
      .select('id,message,created_at,user_id,profiles!chat_messages_user_id_fkey(full_name,game_nickname,role,presence,last_seen,avatar_url,donation_total,vip_until,is_streamer)')
      .eq('is_deleted',false)
      .eq('room',CHAT_ROOM)
      .order('created_at',{ascending:false})
      .limit(30);
    if (error) { box.innerHTML = `<p>${esc(error.message)}</p>`; return; }
    const blockedIds = await getBlockedChatUserIds();
    const rows = [...(data || [])].reverse().filter(row => !blockedIds.has(String(row.user_id)));
    const recentParticipants = new Map();
    for (const row of (data || []).slice(0, 20)) {
      if (blockedIds.has(String(row.user_id)) || recentParticipants.has(String(row.user_id))) continue;
      const participant = row.profiles ? {...row.profiles, id: row.user_id} : null;
      if (participant?.game_nickname || participant?.full_name) recentParticipants.set(String(row.user_id), participant);
    }
    mentionProfiles = [...recentParticipants.values()];
    mentionContextReady = true;
    box.innerHTML = rows.map(row => {
      const p=row.profiles||{};
      const name=p.game_nickname||p.full_name||'Jogador';
      const identity=identityClass(p);
      const palette=identityPalette[identity] || identityPalette.member;
      const presence=effectivePresence(p);
      const statusLabel = presence==='busy'?'Ocupado':presence==='away'?'Ausente':presence==='online'?'Online':'Offline';
      const identityStyle=`--identity:${palette.color};--identity-rgb:${palette.rgb};border-color:rgba(${palette.rgb},.56)!important;box-shadow:inset 5px 0 0 ${palette.color},0 0 18px rgba(${palette.rgb},.10)!important;`;
      const nameStyle=`color:${palette.color}!important;text-shadow:0 0 12px rgba(${palette.rgb},.62)!important;`;
      return `<article class="tl-chat-card tl-chat-${identity} tl-presence-${presence} tl-has-actions" style="${identityStyle}" data-identity="${identity}" data-message-id="${row.id}" data-user-id="${esc(row.user_id)}" data-nickname="${esc(name)}" data-raw-message="${esc(row.message)}">
        <header class="tl-chat-header">
          <strong class="tl-chat-name" style="${nameStyle}" data-user-id="${esc(row.user_id)}">${esc(name)}</strong>
          <div class="tl-chat-meta">
            ${row.user_id===session?.user?.id
              ? `<button class="tl-chat-dot tl-own-status-dot ${presence}" type="button" title="Mudar status: ${statusLabel}" aria-label="Mudar status atual: ${statusLabel}" data-quick-status="1"></button>`
              : `<span class="tl-chat-dot ${presence}" title="${statusLabel}" aria-label="${statusLabel}"></span>`}
            <time class="tl-chat-time">${new Date(row.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</time>
            <button class="tl-chat-action" type="button" title="Opções da mensagem" aria-label="Opções da mensagem">⋮</button>
          </div>
        </header>
        <p class="tl-chat-text">${formatChatMessage(row.message)}</p>
      </article>`;
    }).join('') || '<p class="sb-login-required">Ainda não há mensagens. Manda a primeira 😎</p>';
    if (shouldFollowBottom) {
      box.scrollTop = box.scrollHeight;
    } else {
      // Mantém exatamente a posição escolhida mesmo após polling, clique
      // em utilizador, atualização de presença ou nova renderização.
      box.scrollTop = Math.min(previousScrollTop, Math.max(0, box.scrollHeight - box.clientHeight));
    }
    updateMentionBadge(rows);
    bindModerationTargets();
    bindQuickStatusDots();
    const maxId = rows.reduce((m,r)=>Math.max(m,Number(r.id)||0),0);
    lastKnownMessageId = Math.max(lastKnownMessageId,maxId);
    initialChatLoaded = true;
  }

  function bindModerationTargets() {
    document.querySelectorAll('.tl-chat-name[data-user-id]').forEach(el => {
      el.onclick = () => {
        if (!canModerate() && !canManageRoles()) return;
        selectedTargetId = el.dataset.userId;
        $('moderationTarget').textContent = el.textContent;
        $('moderationPanel')?.classList.add('show');
      };
    });
    document.querySelectorAll('.tl-chat-action').forEach(btn => {
      btn.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        openChatMessageMenu(btn);
      };
    });
  }

  function configureModerationPanel() {
    const panel=$('moderationPanel'); if (!panel) return;
    panel.querySelectorAll('[data-role-set]').forEach(btn => {
      const desired = btn.dataset.roleSet === 'user' ? 'member' : btn.dataset.roleSet;
      btn.hidden = !['member','supporter','vip','staff','moderator','admin'].includes(desired) || !canManageRoles();
      btn.onclick = async () => {
        if (!selectedTargetId) return;
        const { error }=await sb.rpc('set_profile_identity',{target_user_id:selectedTargetId,new_identity:desired});
        if (error) alert(error.message); else { panel.classList.remove('show'); await renderChat(); }
      };
    });
    panel.querySelectorAll('[data-badge-set]').forEach(btn => {
      btn.hidden = !canManageRoles();
      btn.onclick = async () => {
        if (!selectedTargetId) return;
        const badge=btn.dataset.badgeSet;
        const enabled=btn.dataset.enabled==='true';
        const identity = enabled ? badge : 'member';
        const { error }=await sb.rpc('set_profile_identity',{target_user_id:selectedTargetId,new_identity:identity});
        if(error) alert(error.message); else { panel.classList.remove('show'); await renderChat(); }
      };
    });
    panel.querySelectorAll('[data-mod-action]').forEach(btn => {
      const action=btn.dataset.modAction;
      if (action === 'close') { btn.onclick=()=>panel.classList.remove('show'); return; }
      if (action.startsWith('lock') || action.startsWith('unlock')) { btn.hidden = true; return; }
      btn.hidden = !canModerate();
      btn.onclick = async () => {
        if (!selectedTargetId) return;
        let minutes=0;
        if(action==='block-1') minutes=1;
        if(action==='block-5') minutes=5;
        if(action==='block-15') minutes=15;
        if(action==='unblock') minutes=0;
        if(action==='ban' || action==='unban'){ const {error}=await sb.rpc('set_chat_ban',{target_user_id:selectedTargetId,banned:action==='ban'}); if(error) alert(error.message); else { $('chatModerationInfo').textContent=action==='ban'?'Usuário bloqueado permanentemente.':'Bloqueio permanente removido.'; panel.classList.remove('show'); } return; }
        const { error }=await sb.rpc('moderate_user',{target_user_id:selectedTargetId,mute_minutes:minutes});
        if(error) alert(error.message); else { $('chatModerationInfo').textContent=minutes?`Usuário silenciado por ${minutes} min.`:'Usuário desbloqueado.'; panel.classList.remove('show'); }
      };
    });
  }

  function ensureQuickStatusMenu() {
    let menu = $('tlQuickStatusMenu');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'tlQuickStatusMenu';
    menu.className = 'tl-quick-status-menu';
    menu.hidden = true;
    menu.innerHTML = `
      <button type="button" data-status-value="online"><i class="online"></i>Online</button>
      <button type="button" data-status-value="busy"><i class="busy"></i>Ocupado</button>
      <button type="button" data-status-value="away"><i class="away"></i>Ausente</button>`;

    document.body.appendChild(menu);

    menu.querySelectorAll('[data-status-value]').forEach(button => {
      button.addEventListener('click', async () => {
        const value = button.dataset.statusValue;
        manualPresence = value;
        autoAway = false;
        await setPresence(value, {manual:true});
        menu.hidden = true;
      });
    });

    document.addEventListener('pointerdown', event => {
      if (menu.hidden) return;
      if (!menu.contains(event.target) && !event.target.closest('[data-quick-status]')) {
        menu.hidden = true;
      }
    });

    return menu;
  }

  function openQuickStatusMenu(anchorElement) {
    if (!session) return loginGoogle();
    const menu = ensureQuickStatusMenu();
    const rect = anchorElement.getBoundingClientRect();

    menu.hidden = false;
    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(
      window.innerWidth - menuRect.width - 8,
      Math.max(8, rect.right - menuRect.width)
    );
    const top = Math.min(
      window.innerHeight - menuRect.height - 8,
      rect.bottom + 8
    );

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function bindQuickStatusDots() {
    document.querySelectorAll('[data-quick-status]').forEach(dot => {
      dot.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        openQuickStatusMenu(dot);
      };
    });

    const topDot = $('onlineDot');
    if (topDot) {
      topDot.dataset.quickStatus = '1';
      topDot.setAttribute('role', 'button');
      topDot.setAttribute('tabindex', '0');
      topDot.title = 'Mudar status';
      topDot.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        openQuickStatusMenu(topDot);
      };
      topDot.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openQuickStatusMenu(topDot);
        }
      };
    }
  }

  async function executeRoleCommand(rawMessage) {
    const match = String(rawMessage || '').trim().match(/^\/cargo\s+@?([^\s]+)\s+(dev|admin|moderador|moderator|staff|vip|apoiador|supporter|membro|member)\s*$/i);
    if (!match) {
      const looksLikeCargo = /^\/cargo\b/i.test(String(rawMessage || '').trim());
      return looksLikeCargo
        ? { handled:true, ok:false, message:'Formato correto: /cargo @nickname cargo' }
        : { handled:false };
    }

    const actorRole = normalizeRole(profile?.role);
    if (!['master','admin'].includes(actorRole)) {
      return { handled:true, ok:false, message:'Apenas DEV ou ADMIN podem atribuir cargos.' };
    }

    const nickname = match[1].trim();
    const requested = normalizeRole(match[2]);
    const rank = {member:0,supporter:0,vip:0,moderator:1,staff:2,admin:3,master:4};
    const target = mentionProfiles.find(item => String(item.game_nickname || '').toLowerCase() === nickname.toLowerCase());
    if (!target) return {handled:true,ok:false,message:`Usuário @${nickname} não encontrado. Digite @ e selecione o perfil correto.`};
    if (target.id === session?.user?.id) return {handled:true,ok:false,message:'Você não pode alterar o próprio cargo pelo chat.'};
    if ((rank[normalizeRole(target.role)] ?? 0) >= (rank[actorRole] ?? 0)) {
      return {handled:true,ok:false,message:'Você não pode alterar um cargo igual ou superior ao seu.'};
    }
    if ((rank[requested] ?? 0) >= (rank[actorRole] ?? 0)) {
      return {handled:true,ok:false,message:'Você não pode atribuir um cargo igual ou superior ao seu.'};
    }
    const { data, error } = await sb.rpc('assign_role_by_nickname', {
      target_nickname: nickname,
      new_role: requested
    });

    if (error) return { handled:true, ok:false, message:`Não foi possível alterar o cargo: ${error.message}` };
    const result = Array.isArray(data) ? data[0] : data;
    return {
      handled:true,
      ok:true,
      message:`✅ @${result?.nickname || nickname} agora é ${roleLabel(result?.assigned_role || result?.role || requested)}.`
    };
  }

  function bindChat() {
    const form=$('chatForm'); if (!form) return;
    const input=$('chatInput');
    const enterToggle=$('enterBreakToggle');

    const resizeComposer = () => {
      if (!input) return;
      input.style.height='auto';
      input.style.height=`${Math.min(input.scrollHeight,120)}px`;
    };

    if (input) {
      input.addEventListener('input', () => {
        resizeComposer();
        renderMentionSuggestions(input);
      });
      input.addEventListener('keydown', event => {
        const suggestions=$('chatMentionSuggestions');
        const matches=suggestions?._matches||[];
        if (!suggestions?.hidden && matches.length) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            mentionActiveIndex=(mentionActiveIndex+1)%matches.length;
            renderMentionSuggestions(input);
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            mentionActiveIndex=(mentionActiveIndex-1+matches.length)%matches.length;
            renderMentionSuggestions(input);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            closeMentionSuggestions();
            return;
          }
          if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
            event.preventDefault();
            chooseMention(input,matches[mentionActiveIndex]);
            return;
          }
        }

        if (event.key !== 'Enter' || event.isComposing) return;
        const enterBreaksLine = Boolean(enterToggle?.checked);
        if (event.shiftKey || enterBreaksLine) return;
        event.preventDefault();
        form.requestSubmit();
      });
      input.addEventListener('blur',()=>setTimeout(closeMentionSuggestions,140));
    }

    if (enterToggle) {
      enterToggle.checked = localStorage.getItem('tl_enter_breaks_line') === '1';
      enterToggle.addEventListener('change', () => {
        localStorage.setItem('tl_enter_breaks_line', enterToggle.checked ? '1' : '0');
        input?.focus();
      });
    }

    bindQuickStatusDots();
    $('chatMentionBadge')?.addEventListener('click',openNextMention);
    const reportModal = ensureChatReportModal();
    const reportForm = $('tlChatReportForm');
    if (reportForm && reportForm.dataset.bound !== '1') {
      reportForm.dataset.bound = '1';
      reportForm.addEventListener('submit', submitChatReport);
    }

    form.addEventListener('submit', async ev => {
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (!session) return loginGoogle();
      if (window.TLChatRequireTerms && !(await window.TLChatRequireTerms())) return;
      if (!(await ensureNickname())) return;
      const message=input?.value.trim();
      const nowMs=Date.now(); recentSendTimes=recentSendTimes.filter(t=>nowMs-t<10000); if(recentSendTimes.length>=5){ $('chatDelayInfo').textContent='Calma 😅 aguarda 30 segundos antes de continuar.'; setTimeout(()=>{ if($('chatDelayInfo')) $('chatDelayInfo').textContent=''; },30000); return; } if (!message) return; if (message.length > 240) { alert('A mensagem pode ter no máximo 240 caracteres.'); return; }
      if (message.startsWith('/cargo')) {
        const commandResult = await executeRoleCommand(message);
        if (commandResult.handled) {
          const info = $('chatModerationInfo');
          if (info) {
            info.textContent = commandResult.message;
            info.classList.toggle('error', !commandResult.ok);
          }
          if (commandResult.ok) {
            input.value='';
            resizeComposer();
            await loadProfile();
            await renderChat();
          }
          return;
        }
      }
      const check=moderateText(message);
      if(!check.ok){ $('chatModerationInfo').textContent=check.reason; $('chatModerationInfo').classList.add('error'); return; }
      $('chatModerationInfo').textContent=''; $('chatModerationInfo').classList.remove('error');
      const safeMessage=check.text || message;
      const submitButton=form.querySelector('button[type="submit"]');
      if (form.dataset.sending === '1') return;
      form.dataset.sending='1';
      if(submitButton) submitButton.disabled=true;

      let translatedMessage=null,sourceLanguage=null,targetLanguage=window.TLChatTranslateTarget?.()||'';
      if(targetLanguage){
        try{
          const {data:translation,error:translationError}=await sb.functions.invoke('translate-message',{body:{text:safeMessage,target:targetLanguage}});
          if(translationError) throw translationError;
          translatedMessage=translation?.translatedText||null; sourceLanguage=translation?.detectedSourceLanguage||null;
        }catch(error){
          console.warn('[TL-TR-002]',error); window.TLNotify?.('warning','Mensagem enviada no idioma original. A tradução não está disponível.','TL-TR-002');
        }
      }
      let payload={user_id:session.user.id,message:translatedMessage||safeMessage,room:CHAT_ROOM};
      if(translatedMessage){payload.original_message=safeMessage;payload.translated_message=translatedMessage;payload.source_language=sourceLanguage;payload.target_language=targetLanguage;}
      let { error }=await sb.from('chat_messages').insert(payload);
      if(error && translatedMessage){
        console.warn('[TL-DB-001] Colunas de tradução ainda não instaladas; usando mensagem traduzida no campo principal.',error);
        ({error}=await sb.from('chat_messages').insert({user_id:session.user.id,message:translatedMessage||safeMessage,room:CHAT_ROOM}));
      }

      form.dataset.sending='0';
      if(submitButton) submitButton.disabled=false;

      if (error) {
        input?.focus();
        return alert(`Não foi possível enviar: ${error.message}`);
      }

      recentSendTimes.push(nowMs);
      input.value='';
      resizeComposer();
      input.focus();
      playChatTick('send',profile?.role);

      // Atualiza imediatamente. A assinatura realtime continua como segunda garantia.
      await renderChat();
    }, true);
    $('userStatus')?.addEventListener('change', e => {
      manualPresence=statusDb(e.target.value);
      autoAway=false;
      lastActivityAt=Date.now();
      setPresence(e.target.value,{manual:true});
    });
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden && (profile?.presence==='online')){ unreadChat=0; renderUnreadBadge(); } });
  }

  async function sendContact(ev) {
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (!session) return loginGoogle();
    if (!(await ensureNickname())) return;
    const title=$('contactAdminTitle')?.value.trim();
    const message=$('contactAdminMessage')?.value.trim();
    const nick=$('contactAdminNickname')?.value.trim() || profile?.game_nickname;
    const feedback=$('contactAdminFeedback');
    const check=moderateText(`${title} ${message}`);
    if(!check.ok){ if(feedback) feedback.textContent=check.reason; return; }
    if (!title || !message || !nick) { if(feedback) feedback.textContent='Preenche assunto, nickname e mensagem.'; return; }
    const { error }=await sb.from('contact_messages').insert({sender_id:session.user.id,game_nickname:nick,subject:title,message});
    if (error) { if(feedback) feedback.textContent=`Erro: ${error.message}`; return; }
    ev.target.reset(); if(feedback) feedback.textContent='Mensagem enviada para a caixa da administração.';
  }

  function bindContact() { $('contactAdminForm')?.addEventListener('submit', sendContact, true); }


  function ensurePwdModal() {
    if ($('tlPwdModal')) return $('tlPwdModal');
    const modal = document.createElement('div');
    modal.id = 'tlPwdModal';
    modal.className = 'tl-pwd-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <form class="tl-pwd-box" id="tlPwdForm">
        <h2>🔐 PWD</h2>
        <p>Acesso exclusivo da administração.</p>
        <input id="tlAdminPassword" type="password" autocomplete="current-password" placeholder="Senha administrativa" maxlength="120" required>
        <p class="tl-pwd-feedback" id="tlPwdFeedback"></p>
        <div class="tl-pwd-actions">
          <button type="button" id="tlPwdCancel">Cancelar</button>
          <button type="submit" class="tl-pwd-enter">Entrar</button>
        </div>
      </form>`;
    document.body.appendChild(modal);
    $('tlPwdCancel').onclick = () => { modal.hidden = true; $('tlAdminPassword').value = ''; $('tlPwdFeedback').textContent = ''; };
    modal.addEventListener('click', ev => { if (ev.target === modal) $('tlPwdCancel').click(); });
    $('tlPwdForm').addEventListener('submit', async ev => {
      ev.preventDefault();
      const feedback = $('tlPwdFeedback');
      const password = $('tlAdminPassword').value;
      feedback.textContent = 'A validar…';
      if (!session) { feedback.textContent = 'Primeiro entra com a tua conta Google.'; return; }
      if (!['admin','master'].includes(profile?.role)) { feedback.textContent = 'Esta conta não possui acesso administrativo.'; return; }
      const { data, error } = await sb.rpc('verify_admin_password', { candidate_password: password });
      if (error || data !== true) { feedback.textContent = 'Senha administrativa incorreta.'; return; }
      sessionStorage.setItem('tl_admin_unlocked', '1');
      location.href = 'admin.html';
    });
    return modal;
  }

  function bindPwdAccess() {
    document.querySelectorAll('.pwd-admin-trigger').forEach(button => {
      button.addEventListener('click', async () => {
        if (!session) { await loginGoogle(); return; }
        const modal = ensurePwdModal();
        modal.hidden = false;
        setTimeout(() => $('tlAdminPassword')?.focus(), 30);
      });
    });
    if (new URLSearchParams(location.search).get('admin') === 'locked') {
      history.replaceState({}, '', location.pathname);
    }
  }

  async function renderInbox() {
    const target=$('supabasePrivateInbox'); const badge=$('supabaseInboxBadge');
    if (!target && !badge) return;
    if (!session) { if(target) target.innerHTML='<div class="sb-login-required">Entre com Google.</div>'; if(badge) badge.textContent='0'; return; }
    if (!isTeam()) { if(target) target.innerHTML='<div class="sb-login-required">Área privada de moderadores, staff e admins.</div>'; if(badge) badge.textContent='0'; return; }
    const { data,error }=await sb.from('contact_messages').select('id,subject,message,game_nickname,status,created_at,answer,profiles!contact_messages_sender_id_fkey(full_name,email)').order('created_at',{ascending:false}).limit(100);
    if(error){ if(target) target.textContent=error.message; return; }
    const unread=(data||[]).filter(x=>x.status==='new').length; if(badge) badge.textContent=String(unread);
    if(target) target.innerHTML=(data||[]).map(m=>`<article class="sb-inbox-item ${m.status==='new'?'is-new':''}" data-id="${m.id}"><strong>${esc(m.subject)}</strong><div class="sb-inbox-meta"><span>🎮 ${esc(m.game_nickname)}</span><span>Google: ${esc(m.profiles?.full_name||'—')}</span><span>${new Date(m.created_at).toLocaleString('pt-PT')}</span><span>${esc(m.status)}</span></div><p>${esc(m.message)}</p>${m.answer?`<p><b>Resposta:</b> ${esc(m.answer)}</p>`:''}<div class="sb-inbox-actions"><button data-status="read">Marcar lida</button><button data-status="answered">Respondida</button><button data-status="closed">Fechar</button></div></article>`).join('') || '<p>Nenhuma mensagem.</p>';
    target?.querySelectorAll('[data-status]').forEach(btn=>btn.onclick=async()=>{const item=btn.closest('[data-id]');const status=btn.dataset.status;const patch={status};if(status==='read')patch.read_at=new Date().toISOString();if(status==='answered'){patch.answered_at=new Date().toISOString();patch.answered_by=session.user.id;}await sb.from('contact_messages').update(patch).eq('id',item.dataset.id);renderInbox();});
  }


  function formatMuteDuration(minutes) {
    const m = Number(minutes) || 0;
    if (m < 60) return `${m} minuto${m === 1 ? '' : 's'}`;
    if (m % 1440 === 0) { const d=m/1440; return `${d} dia${d === 1 ? '' : 's'}`; }
    if (m % 60 === 0) { const h=m/60; return `${h} hora${h === 1 ? '' : 's'}`; }
    return `${m} minutos`;
  }

  async function renderAdminChatReports() {
    const target = $('chatReportsAdminList');
    const badge = $('chatReportsBadge');
    if (!target && !badge) return;
    if (!session) {
      if (target) target.innerHTML = '<div class="empty-admin">Entra com a conta administrativa.</div>';
      if (badge) badge.textContent = '0';
      return;
    }
    const { data, error } = await sb.rpc('admin_list_chat_reports');
    if (error) {
      if (target) target.innerHTML = `<div class="empty-admin">${esc(error.message)}<br><small>Se ainda não executaste o SQL V93.4.6, executa-o no Supabase.</small></div>`;
      if (badge) badge.textContent = '0';
      return;
    }
    const rows = data || [];
    const pending = rows.filter(row => row.status === 'pending').length;
    if (badge) badge.textContent = String(pending);
    if (!target) return;
    target.innerHTML = rows.length ? rows.map(row => `
      <article class="admin-item tl-report-item ${row.status === 'pending' ? 'is-pending' : ''}" data-report-id="${row.report_id}" data-message-id="${row.message_id}" data-target-user-id="${esc(row.reported_user_id)}">
        <div class="item-top">
          <strong>${esc(row.reason)}</strong>
          <span class="pill">${row.status === 'pending' ? 'Pendente' : row.status === 'resolved' ? 'Resolvida' : 'Ignorada'}</span>
        </div>
        <p class="tl-report-message">“${esc(row.message_text || '')}”</p>
        <div class="tl-report-meta">
          <span><b>Autor:</b> @${esc(row.reported_nickname || 'Utilizador')}</span>
          <span><b>Denunciado por:</b> @${esc(row.reporter_nickname || 'Utilizador')}</span>
          <span><b>Data:</b> ${new Date(row.created_at).toLocaleString('pt-PT')}</span>
        </div>
        ${row.details ? `<p><b>Detalhes:</b> ${esc(row.details)}</p>` : ''}
        ${row.status === 'pending' ? `<div class="pending-actions tl-report-actions">
          <span class="tl-report-mute-control">
            <select class="tl-report-mute-duration" aria-label="Duração do silenciamento">
              <option value="5">5 min</option>
              <option value="15" selected>15 min</option>
              <option value="30">30 min</option>
              <option value="60">1 hora</option>
              <option value="360">6 horas</option>
              <option value="1440">24 horas</option>
              <option value="4320">3 dias</option>
              <option value="10080">7 dias</option>
              <option value="custom">Personalizado</option>
            </select>
            <button type="button" data-report-action="mute">Silenciar</button>
          </span>
          <button type="button" data-report-action="delete">Apagar mensagem</button>
          <button type="button" class="danger" data-report-action="ban">Banir</button>
          <button type="button" data-report-action="resolve">Advertir e resolver</button>
          <button type="button" data-report-action="dismiss">Ignorar</button>
        </div>` : ''}
      </article>`).join('') : '<div class="empty-admin">Nenhuma denúncia recebida.</div>';

    target.querySelectorAll('[data-report-action]').forEach(button => {
      button.onclick = async () => {
        const item = button.closest('[data-report-id]');
        const action = button.dataset.reportAction;
        if (!item) return;
        button.disabled = true;
        let error = null;
        if (action === 'mute') {
          const select = item.querySelector('.tl-report-mute-duration');
          let minutes = select?.value || '15';
          if (minutes === 'custom') {
            const custom = prompt('Por quantos minutos queres silenciar este utilizador?\nEx.: 120 = 2 horas, 2880 = 2 dias');
            if (custom === null) { button.disabled=false; return; }
            minutes = custom.trim();
          }
          const muteMinutes = Number(minutes);
          if (!Number.isInteger(muteMinutes) || muteMinutes < 1 || muteMinutes > 43200) {
            alert('Escolhe uma duração entre 1 minuto e 30 dias.');
            button.disabled=false;
            return;
          }
          if (!confirm(`Silenciar este utilizador por ${formatMuteDuration(muteMinutes)}?`)) { button.disabled=false; return; }
          ({error} = await sb.rpc('admin_apply_chat_report_action',{target_report_id:Number(item.dataset.reportId),moderation_action:'mute',mute_minutes:muteMinutes}));
        } else if (action === 'delete') {
          if (!confirm('Apagar esta mensagem e enviar um aviso administrativo ao autor?')) { button.disabled=false; return; }
          ({error} = await sb.rpc('admin_apply_chat_report_action',{target_report_id:Number(item.dataset.reportId),moderation_action:'delete'}));
        } else if (action === 'ban') {
          if (!confirm('Banir este utilizador e enviar o aviso obrigatório de banimento?')) { button.disabled=false; return; }
          ({error} = await sb.rpc('admin_apply_chat_report_action',{target_report_id:Number(item.dataset.reportId),moderation_action:'ban'}));
        } else if (action === 'resolve') {
          ({error} = await sb.rpc('admin_apply_chat_report_action',{target_report_id:Number(item.dataset.reportId),moderation_action:'warn'}));
        } else if (action === 'dismiss') {
          ({error} = await sb.rpc('admin_apply_chat_report_action',{target_report_id:Number(item.dataset.reportId),moderation_action:'dismiss'}));
        }
        button.disabled = false;
        if (error) { alert(error.message); return; }
        await renderAdminChatReports();
      };
    });
  }

  function bindAdminChatReports() {
    $('refreshChatReports')?.addEventListener('click', renderAdminChatReports);
  }

  function subscribe() {
    chatChannel?.unsubscribe(); inboxChannel?.unsubscribe();
    clearInterval(chatRefreshTimer); chatRefreshTimer=null;
    if ($('chatMessages')) chatChannel=sb.channel(`team-chat-${CHAT_ROOM}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:`room=eq.${CHAT_ROOM}`},async payload=>{
        const row=payload.new;
        if(initialChatLoaded && Number(row.id)>lastKnownMessageId && row.user_id!==session?.user?.id){
          const {data:p}=await sb.from('profiles').select('role').eq('id',row.user_id).single();
          if(profile?.presence==='online'){
            playChatTick('receive',p?.role||'member');
            if(document.hidden){ unreadChat++; renderUnreadBadge(); }
          }
        }
        lastKnownMessageId=Math.max(lastKnownMessageId,Number(row.id)||0); await renderChat();
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages',filter:`room=eq.${CHAT_ROOM}`},renderChat)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},renderChat).subscribe(status=>{chatChannelStatus=status;if(status==='SUBSCRIBED')renderChat();});
    if ($('chatMessages')) chatRefreshTimer=setInterval(()=>{if(!document.hidden)renderChat();},1800);
    if ($('supabasePrivateInbox')||$('supabaseInboxBadge')) inboxChannel=sb.channel('team-inbox-ui').on('postgres_changes',{event:'*',schema:'public',table:'contact_messages'},renderInbox).subscribe();
  }

  async function boot() {
    const { data }=await sb.auth.getSession(); session=data.session; await loadProfile(); renderAuth();
    if(session){ manualPresence=profile?.presence==='busy'?'busy':'online'; lastActivityAt=Date.now(); await ensureNickname(); await setPresence(manualPresence,{manual:false}); startPresenceTracking(); }
    bindChat(); bindContact(); bindPwdAccess(); bindAdminChatReports(); await renderChat(); await renderInbox(); await renderAdminChatReports(); subscribe();
    sb.auth.onAuthStateChange(async (_event,newSession)=>{session=newSession;await loadProfile();renderAuth();if(session){manualPresence=profile?.presence==='busy'?'busy':'online';lastActivityAt=Date.now();startPresenceTracking();}await renderChat();await renderInbox();await renderAdminChatReports();subscribe();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderChat();});
    window.addEventListener('focus',()=>renderChat());
    window.addEventListener('online',()=>{subscribe();renderChat();});
    window.addEventListener('beforeunload',()=>{ if(session) sb.from('profiles').update({presence:'offline',last_seen:new Date().toISOString()}).eq('id',session.user.id); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
