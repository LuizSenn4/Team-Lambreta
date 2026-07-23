(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  if (!sb) { console.error('[Team Lambreta] Supabase SDK não carregou.'); return; }
  window.teamSupabase = sb;

  let session = null;
  let profile = null;
  let chatChannel = null;
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

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const teamRoles = new Set(['moderator','staff','admin','master']);
  const moderationRoles = new Set(['moderator','admin','master']);
  const roleRank = { member:0, staff:1, moderator:2, admin:3, master:4 };
  const isTeam = () => teamRoles.has(profile?.role);
  const canModerate = () => moderationRoles.has(profile?.role);
  const canManageRoles = () => ['admin','master'].includes(profile?.role);
  const statusDb = v => ({busy:'busy',away:'away',online:'online'}[v] || 'online');
  const statusUi = v => ({busy:'busy',away:'away',online:'online',offline:'offline'}[v] || 'offline');
  const roleClass = role => ['master','admin','moderator','staff','member'].includes(role) ? role : 'member';
  const roleLabel = role => ({master:'DEV',admin:'ADMIN',moderator:'MODERADOR',staff:'STAFF',member:'MEMBRO'}[role] || 'MEMBRO');
  const isVip = p => Boolean(p?.vip_until && Number.isFinite(new Date(p.vip_until).getTime()) && new Date(p.vip_until).getTime() > Date.now());
  const isStreamer = p => p?.is_streamer === true || String(p?.is_streamer).toLowerCase() === 'true';
  const extraBadges = p => isStreamer(p) ? '<small class="streamer-badge">STREAMER</small>' : (isVip(p) ? '<small class="vip-badge">VIP</small>' : '');
  const identityClass = p => {
    const role = roleClass(p?.role);
    if (role === 'master' || role === 'admin') return 'admin';
    if (role === 'staff') return 'staff';
    if (role === 'moderator') return 'moderator';
    if (isStreamer(p)) return 'streamer';
    if (isVip(p)) return 'vip';
    return 'member';
  };
  const identityPalette = {
    admin: { color:'#5ef3ff', rgb:'94,243,255' },
    staff: { color:'#ff6679', rgb:'255,102,121' },
    moderator: { color:'#75b8ff', rgb:'117,184,255' },
    streamer: { color:'#ff74ec', rgb:'255,116,236' },
    vip: { color:'#ffd45d', rgb:'255,212,93' },
    member: { color:'#f6f8fb', rgb:'246,248,251' }
  };
  const effectivePresence = p => {
    if (!p) return 'offline';
    const seen = p.last_seen ? new Date(p.last_seen).getTime() : 0;
    if (!seen || Date.now() - seen > OFFLINE_AFTER_MS) return 'offline';
    return statusUi(p.presence);
  };

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

  function renderAuth() {
    const bar = $('supabaseAuthBar');
    if (bar) {
      if (!session) bar.innerHTML = '<button id="sbGlobalLogin" class="google-brand-login" type="button"><img src="img/brasao.png" alt="">Entrar com Google</button>';
      else bar.innerHTML = `<div class="sb-user role-${roleClass(profile?.role)}">${profile?.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:''}<span>${esc(profile?.game_nickname || profile?.full_name || session.user.email)}</span><small>${roleLabel(profile?.role)}</small>${extraBadges(profile)}</div><button class="sb-logout" id="sbLogout" type="button">Sair</button>`;
      $('sbGlobalLogin')?.addEventListener('click', loginGoogle);
      $('sbLogout')?.addEventListener('click', logout);
    }
    const authBox = $('chatAuthBox');
    if (authBox) authBox.classList.toggle('is-connected', Boolean(session));
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

  async function renderChat() {
    const box = $('chatMessages');
    if (!box) return;
    if (!session) { box.innerHTML = '<div class="sb-login-required">Entra com Google para ver e escrever no chat.</div>'; return; }
    // Busca sempre as 30 mensagens MAIS RECENTES.
    // A consulta vem em ordem decrescente para o limite funcionar corretamente,
    // depois invertimos apenas para exibir do mais antigo ao mais novo.
    const { data, error } = await sb.from('chat_messages')
      .select('id,message,created_at,user_id,profiles!chat_messages_user_id_fkey(full_name,game_nickname,role,presence,last_seen,avatar_url,donation_total,vip_until,is_streamer)')
      .eq('is_deleted',false)
      .order('created_at',{ascending:false})
      .limit(30);
    if (error) { box.innerHTML = `<p>${esc(error.message)}</p>`; return; }
    const rows = [...(data || [])].reverse();
    box.innerHTML = rows.map(row => {
      const p=row.profiles||{};
      const name=p.game_nickname||p.full_name||'Jogador';
      const identity=identityClass(p);
      const palette=identityPalette[identity] || identityPalette.member;
      const presence=effectivePresence(p);
      const statusLabel = presence==='busy'?'Ocupado':presence==='away'?'Ausente':presence==='online'?'Online':'Offline';
      const identityStyle=`--identity:${palette.color};--identity-rgb:${palette.rgb};border-color:rgba(${palette.rgb},.56)!important;box-shadow:inset 5px 0 0 ${palette.color},0 0 18px rgba(${palette.rgb},.10)!important;`;
      const nameStyle=`color:${palette.color}!important;text-shadow:0 0 12px rgba(${palette.rgb},.62)!important;`;
      return `<article class="tl-chat-card tl-chat-${identity} tl-presence-${presence} ${canModerate()?'tl-has-actions':''}" style="${identityStyle}" data-identity="${identity}" data-message-id="${row.id}" data-user-id="${esc(row.user_id)}">
        <header class="tl-chat-header">
          <strong class="tl-chat-name" style="${nameStyle}" data-user-id="${esc(row.user_id)}">${esc(name)}</strong>
          <div class="tl-chat-meta">
            ${row.user_id===session?.user?.id
              ? `<button class="tl-chat-dot tl-own-status-dot ${presence}" type="button" title="Mudar status: ${statusLabel}" aria-label="Mudar status atual: ${statusLabel}" data-quick-status="1"></button>`
              : `<span class="tl-chat-dot ${presence}" title="${statusLabel}" aria-label="${statusLabel}"></span>`}
            <time class="tl-chat-time">${new Date(row.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</time>
            ${canModerate()?'<button class="tl-chat-action" type="button" title="Opções da mensagem" aria-label="Opções da mensagem">⋮</button>':''}
          </div>
        </header>
        <p class="tl-chat-text">${esc(row.message)}</p>
      </article>`;
    }).join('') || '<p class="sb-login-required">Ainda não há mensagens. Manda a primeira 😎</p>';
    box.scrollTop = box.scrollHeight;
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
      btn.onclick = async () => {
        const article=btn.closest('[data-message-id]');
        if (!article || !confirm('Apagar esta mensagem?')) return;
        const { error }=await sb.rpc('moderate_chat_message',{target_message_id:Number(article.dataset.messageId)});
        if (error) alert(error.message); else renderChat();
      };
    });
  }

  function configureModerationPanel() {
    const panel=$('moderationPanel'); if (!panel) return;
    panel.querySelectorAll('[data-role-set]').forEach(btn => {
      const desired = btn.dataset.roleSet === 'user' ? 'member' : btn.dataset.roleSet;
      btn.hidden = !['member','staff','moderator','admin'].includes(desired) || !canManageRoles();
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
      input.addEventListener('input', resizeComposer);
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.isComposing) return;

        const enterBreaksLine = Boolean(enterToggle?.checked);

        // Shift+Enter sempre quebra linha.
        if (event.shiftKey || enterBreaksLine) return;

        event.preventDefault();
        form.requestSubmit();
      });
    }

    if (enterToggle) {
      enterToggle.checked = localStorage.getItem('tl_enter_breaks_line') === '1';
      enterToggle.addEventListener('change', () => {
        localStorage.setItem('tl_enter_breaks_line', enterToggle.checked ? '1' : '0');
        input?.focus();
      });
    }

    bindQuickStatusDots();

    form.addEventListener('submit', async ev => {
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (!session) return loginGoogle();
      if (!(await ensureNickname())) return;
      const message=input?.value.trim();
      const nowMs=Date.now(); recentSendTimes=recentSendTimes.filter(t=>nowMs-t<10000); if(recentSendTimes.length>=5){ $('chatDelayInfo').textContent='Calma 😅 aguarda 30 segundos antes de continuar.'; setTimeout(()=>{ if($('chatDelayInfo')) $('chatDelayInfo').textContent=''; },30000); return; } if (!message) return; if (message.length > 240) { alert('A mensagem pode ter no máximo 240 caracteres.'); return; }
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
      let payload={user_id:session.user.id,message:translatedMessage||safeMessage};
      if(translatedMessage){payload.original_message=safeMessage;payload.translated_message=translatedMessage;payload.source_language=sourceLanguage;payload.target_language=targetLanguage;}
      let { error }=await sb.from('chat_messages').insert(payload);
      if(error && translatedMessage){
        console.warn('[TL-DB-001] Colunas de tradução ainda não instaladas; usando mensagem traduzida no campo principal.',error);
        ({error}=await sb.from('chat_messages').insert({user_id:session.user.id,message:translatedMessage||safeMessage}));
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

  function subscribe() {
    chatChannel?.unsubscribe(); inboxChannel?.unsubscribe();
    if ($('chatMessages')) chatChannel=sb.channel('team-chat-ui')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},async payload=>{
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
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages'},renderChat)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},renderChat).subscribe();
    if ($('supabasePrivateInbox')||$('supabaseInboxBadge')) inboxChannel=sb.channel('team-inbox-ui').on('postgres_changes',{event:'*',schema:'public',table:'contact_messages'},renderInbox).subscribe();
  }

  async function boot() {
    const { data }=await sb.auth.getSession(); session=data.session; await loadProfile(); renderAuth();
    if(session){ manualPresence=profile?.presence==='busy'?'busy':'online'; lastActivityAt=Date.now(); await ensureNickname(); await setPresence(manualPresence,{manual:false}); startPresenceTracking(); }
    bindChat(); bindContact(); bindPwdAccess(); await renderChat(); await renderInbox(); subscribe();
    sb.auth.onAuthStateChange(async (_event,newSession)=>{session=newSession;await loadProfile();renderAuth();if(session){manualPresence=profile?.presence==='busy'?'busy':'online';lastActivityAt=Date.now();startPresenceTracking();}await renderChat();await renderInbox();subscribe();});
    window.addEventListener('beforeunload',()=>{ if(session) sb.from('profiles').update({presence:'offline',last_seen:new Date().toISOString()}).eq('id',session.user.id); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
