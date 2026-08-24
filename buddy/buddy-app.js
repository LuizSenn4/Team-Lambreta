(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const roleLabel = role => ({master:'DEV',admin:'ADMIN',staff:'STAFF',moderator:'MODERADOR',streamer:'STREAMER',vip:'VIP',supporter:'APOIADOR',member:'MEMBRO'}[String(role || 'member').toLowerCase()] || 'MEMBRO');
  const statusLabel = value => ({online:'Online',busy:'Ocupado',away:'Ausente',offline:'Offline'}[value] || 'Offline');
  const profileName = profile => profile?.game_nickname || profile?.full_name || 'Membro Lambreta';
  const avatarUrl = profile => window.TeamProfiles?.getAvatarUrl?.(profile) || profile?.avatar_display_url || profile?.avatar_external_url || profile?.custom_avatar_url || profile?.avatar_url || '';
  const localDate = value => new Date(value).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const dayKey = value => new Date(value).toISOString().slice(0, 10);
  const dayLabel = value => { const date = new Date(value); const today = new Date(); const yesterday = new Date(Date.now() - 86400000); if (date.toDateString() === today.toDateString()) return 'HOJE'; if (date.toDateString() === yesterday.toDateString()) return 'ONTEM'; return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', ''); };

  const state = { session: null, me: null, profiles: new Map(), relations: [], blocks: [], unread: {}, current: null, messages: [], oldest: null, hasOlder: true, tab: 'contacts', connection: 'SUBSCRIBED', sound: localStorage.getItem('tl_buddy_sound_v100') === 'on', searchResults: [], loading: false, loadError: '', catalog:{ games:new Map(), platforms:new Map() } };
  let friends = null, messages = null, searchTimer = 0, typingTimer = 0, typingStopTimer = 0, activeUserId = null, selectionVersion = 0;
  const root = $('#buddyRoot');
  if (!root) return;

  function avatar(profile, extra = '') { const name = profileName(profile), initials = esc(name.slice(0,2).toUpperCase()), url=avatarUrl(profile); return url ? `<span class="buddy-avatar ${extra}" role="img" aria-label="Foto de perfil de ${esc(name)}"><b>${initials}</b><img src="${esc(url)}" alt="" loading="eager" decoding="async" onerror="this.hidden=true"></span>` : `<span class="buddy-avatar ${extra}" role="img" aria-label="Foto de perfil de ${esc(name)}"><b>${initials}</b></span>`; }
  function presence(profile) { const live=window.TeamPresence?.getPeers?.()[profile?.id];if(live)return live;const raw = profile?.presence || 'offline'; const stamp = profile?.last_seen_at || profile?.last_seen; if (raw !== 'offline' && stamp && Date.now() - new Date(stamp).getTime() > 3 * 60 * 1000) return 'offline'; return raw; }
  function toast(message, type = '', action) { const node = document.createElement('div'); node.className = `buddy-toast ${type}`; node.textContent = message; if (action) node.onclick = action; $('#buddyToasts').append(node); setTimeout(() => node.remove(), 4500); }
  function friendlyError(error, fallback) { console.error('[Buddy]', error); const text = error?.message || ''; if (/row-level security|permission|policy/i.test(text)) return 'Não tens permissão para realizar esta ação.'; if (/duplicate|unique/i.test(text)) return 'Este pedido já existe.'; if (/network|fetch/i.test(text)) return 'Não foi possível ligar ao Buddy. Tenta novamente.'; return fallback; }
  function friendState(id) { return friends.stateFor(id, state.relations, state.blocks); }
  function relationFor(id) { return state.relations.find(row => [row.requester_id, row.addressee_id].includes(id) && [row.requester_id, row.addressee_id].includes(state.session.user.id)); }
  function buddies() { return state.relations.filter(row => row.status === 'accepted').map(row => state.profiles.get(row.requester_id === state.session.user.id ? row.addressee_id : row.requester_id)).filter(profile => profile && friendState(profile.id) === 'buddy'); }
  function withTimeout(promise, timeoutMs, message) {
    let timeoutId;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs); })
    ]).finally(() => clearTimeout(timeoutId));
  }
  function rolesMarkup(profile) {
    const roles = window.TeamPermissions?.getVisualRoles?.(profile) || [];
    return `<div class="buddy-info-roles">${roles.map(role => `<span style="--buddy-role-color:${esc(role.color)}">${role.icon}<b>${esc(role.label)}</b></span>`).join('') || `<span><b>${roleLabel(profile?.role)}</b></span>`}</div>`;
  }
  const infoIcons = Object.freeze({
    country:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5 7-12a7 7 0 1 0-14 0c0 7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    games:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1 2.8a2.2 2.2 0 0 1-3.7.8L14.5 17h-5L8 18.3a2.2 2.2 0 0 1-3.7-.8l-1-2.8A5 5 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M16 12h.01M18 15h.01"/></svg>',
    platforms:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    modes:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/></svg>',
    profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  });
  const listValues = value => Array.isArray(value) ? value.filter(Boolean) : [];
  const readableSlug = value => String(value || '').replace(/[-_]+/g,' ').replace(/\b\w/g, letter => letter.toUpperCase());
  function infoRow(icon, label, values) {
    if (!values?.length) return '';
    return `<div class="buddy-info-row"><span class="buddy-info-icon">${infoIcons[icon]}</span><div><small>${esc(label)}</small><p>${values.map(esc).join(' · ')}</p></div></div>`;
  }
  function profileAction(profile, label = 'VER PERFIL', extraClass = '') {
    if (!profile?.id) return '';
    const blocked = friendState(profile.id).startsWith('blocked');
    if (blocked) return `<button class="buddy-small-action ${extraClass}" type="button" disabled aria-label="Perfil indisponível">👤 PERFIL INDISPONÍVEL</button>`;
    return `<a class="buddy-small-action ${extraClass}" href="profile.html?user=${encodeURIComponent(profile.id)}" aria-label="Ver perfil de ${esc(profileName(profile))}">👤 ${esc(label)}</a>`;
  }

  function cachedBuddyProfile(profile) {
    const cached = window.TeamProfiles?.readPublicVisualCache?.(profile?.id);
    if (cached && avatarUrl(cached)) return { ...profile, ...cached };
    return { ...profile, avatar_display_url:'', avatar_external_url:'', custom_avatar_url:'', avatar_url:'', avatar_inline_url:'' };
  }
  function preloadAvatar(profile) {
    const url = avatarUrl(profile);
    if (!url) return Promise.resolve(profile);
    return new Promise(resolve => { const image=new Image();image.onload=()=>resolve(profile);image.onerror=()=>resolve({ ...profile, avatar_display_url:'', avatar_external_url:'', custom_avatar_url:'', avatar_url:'', avatar_inline_url:'' });image.src=url; });
  }
  async function applyOfficialProfile(profile, render = true) {
    if (!profile?.id) return false;
    const ready = await preloadAvatar(profile);
    state.profiles.set(ready.id, ready);
    if (state.current?.id === ready.id) state.current = ready;
    if (render) renderSidebar();
    if (state.current?.id === ready.id) { syncComposerForSelection(); renderChatHeader(); renderInfo(); }
    return true;
  }

  async function refreshData(render = true) {
    try {
      const data = await friends.load(); state.relations = data.relations; state.blocks = data.blocks; data.profiles.forEach(p => state.profiles.set(p.id, cachedBuddyProfile(p))); state.unread = await messages.unreadCounts(); updateUnread(); if (render) renderSidebar(); if (state.current) renderInfo();
      // A listagem básica vem de profiles; a identidade oficial também pode
      // estar em forum_profiles (avatar_path). Hidrata-a em background.
      if (window.TeamProfiles?.getPublicProfile) {
        void Promise.allSettled(data.profiles.map(profile => window.TeamProfiles.getPublicProfile(profile.id, { fresh:true }))).then(results => {
          let changed = false;
          return Promise.all(results.filter(result => result.status === 'fulfilled' && result.value?.id).map(result => applyOfficialProfile(result.value, false))).then(applied => {
            changed = applied.some(Boolean);
            if (changed) { if (render) renderSidebar(); if (state.current) { syncComposerForSelection(); renderChatHeader(); renderInfo(); } }
          });
        });
      }
    } catch (error) { toast(friendlyError(error, 'Falha ao carregar os Buddies.'), 'error'); }
  }
  function updateUnread() { const total = Object.values(state.unread).reduce((a,b) => a+b,0); const badge = $('#tlHeaderUnread'); if (badge) { badge.textContent = total; badge.hidden = !total; } const requestCount = state.relations.filter(r => r.status === 'pending' && r.addressee_id === state.session.user.id).length; const rb = $('#buddyRequestCount'); if (rb) { rb.textContent = requestCount; rb.hidden = !requestCount; } }

  function contactMarkup(profile) { const p = presence(profile), unread = state.unread[profile.id] || 0; return `<div class="buddy-contact-row"><button class="buddy-contact ${state.current?.id === profile.id ? 'active' : ''}" type="button" data-open-chat="${profile.id}" aria-label="Abrir conversa com ${esc(profileName(profile))}"><span class="buddy-avatar-wrap">${avatar(profile)}<i class="buddy-dot ${p}"></i></span><span class="buddy-contact-copy"><strong>${esc(profileName(profile))}</strong><span>${esc(profile.public_bio || profile.main_game || statusLabel(p))}</span></span>${unread ? `<b class="buddy-unread">${unread}</b>` : ''}</button>${profileAction(profile, 'VER PERFIL', 'buddy-contact-profile')}</div>`; }
  function renderContacts() { const groups = {online:[],busy:[],away:[],offline:[]}; buddies().sort((a,b)=>profileName(a).localeCompare(profileName(b),'pt')).forEach(p => groups[presence(p)].push(p)); const labels={online:'ONLINE',busy:'OCUPADO',away:'AUSENTE',offline:'OFFLINE'}; const html = Object.entries(groups).map(([key,list]) => `<details class="buddy-group" open><summary><i class="buddy-dot ${key}"></i> ${labels[key]} (${list.length})</summary>${list.map(contactMarkup).join('')}</details>`).join(''); $('#buddyList').innerHTML = buddies().length ? html : `<div class="buddy-empty-list"><b>Ainda não adicionaste nenhum Buddy.</b><span>Pesquisa por nickname para encontrares a comunidade.</span><button class="buddy-small-action primary" data-focus-search>👥+ ENCONTRAR BUDDIES</button></div>`; }
  function renderRequests() { const incoming = state.relations.filter(r => r.status === 'pending' && r.addressee_id === state.session.user.id); $('#buddyList').innerHTML = incoming.length ? incoming.map(r => { const p=state.profiles.get(r.requester_id); return `<article class="buddy-request-card"><button class="buddy-request-top buddy-profile-select" type="button" data-select-user="${p?.id || ''}">${avatar(p)}<span><strong>${esc(profileName(p))}</strong><small> quer ser teu Buddy</small></span></button><div class="buddy-row-actions">${profileAction(p)}<button class="buddy-small-action primary" data-respond="accept" data-relation="${r.id}">ACEITAR</button><button class="buddy-small-action danger" data-respond="reject" data-relation="${r.id}">RECUSAR</button></div></article>`; }).join('') : '<div class="buddy-empty-list"><b>Sem pedidos pendentes.</b><span>Novos pedidos aparecem aqui em tempo real.</span></div>'; }
  function actionFor(profile) { const status=friendState(profile.id); if(status==='buddy') return `<button class="buddy-small-action primary" data-open-chat="${profile.id}">💬 ABRIR CHAT</button>`; if(status==='sent') return '<button class="buddy-small-action" disabled>⏳ PEDIDO PENDENTE</button>'; if(status==='received'){const r=relationFor(profile.id);return `<button class="buddy-small-action primary" data-respond="accept" data-relation="${r.id}">ACEITAR</button>`;} if(status.startsWith('blocked')) return '<button class="buddy-small-action" disabled>INDISPONÍVEL</button>'; return `<button class="buddy-small-action primary" data-add-buddy="${profile.id}">👥+ ADICIONAR BUDDY</button>`; }
  function renderSearch() { $('#buddyList').innerHTML = state.searchResults.length ? state.searchResults.map(p => `<article class="buddy-search-card"><button class="buddy-request-top buddy-profile-select" type="button" data-select-user="${p.id}">${avatar(p)}<span><strong>${esc(profileName(p))}</strong><small><i class="buddy-dot ${presence(p)}"></i> ${statusLabel(presence(p))}</small></span></button><div class="buddy-row-actions">${profileAction(p)}${actionFor(p)}</div></article>`).join('') : '<div class="buddy-empty-list"><b>Nenhum utilizador encontrado.</b><span>Tenta outro nickname.</span></div>'; }
  function renderSidebar() { if ($('#buddySearch').value.trim().length >= 2) return renderSearch(); state.tab === 'requests' ? renderRequests() : renderContacts(); updateUnread(); }

  function enrichSelectedProfile(id, version) {
    window.TeamProfiles?.getPublicProfile?.(id, { fresh:true }).then(preloadAvatar).then(profile => {
      if (!profile || version !== selectionVersion || state.current?.id !== id) return;
      state.profiles.set(id, profile); state.current = profile; renderSidebar(); renderChatHeader(); renderInfo();
    }).catch(error => console.warn('[Buddy] Não foi possível enriquecer o mini perfil.', error?.message || error));
  }
  function selectUser(profile, loading = false) {
    const version = ++selectionVersion;
    state.current = profile; state.messages = []; state.oldest = null; state.hasOlder = true; state.loading = loading; state.loadError = '';
    root.classList.add('chat-open'); renderSidebar(); renderChat(); syncComposerForSelection(); renderInfo(); if(friendState(profile.id)==='buddy')restoreComposerFocus(profile.id); enrichSelectedProfile(profile.id, version);
    return version;
  }
  async function openChat(id) {
    const profile=state.profiles.get(id) || state.searchResults.find(p=>p.id===id); if(!profile || friendState(id)!=='buddy') return;
    const version=selectUser(profile,true);
    try {
      const rows=await withTimeout(messages.page(id),12000,'Tempo limite ao carregar a conversa.');
      if(version!==selectionVersion||state.current?.id!==id)return;
      state.messages=rows; state.oldest=rows[0]?.created_at || null; state.hasOlder=rows.length===50; state.unread[id]=0; updateUnread();
      void withTimeout(messages.markRead(id),8000,'Tempo limite ao marcar mensagens como lidas.').catch(error=>console.warn('[Buddy] markRead:',error?.message||error));
      void withTimeout(messages.setTypingPeer(id,active=>renderTyping(active)),8000,'Tempo limite ao ligar indicador de escrita.').catch(error=>console.warn('[Buddy] typing:',error?.message||error));
    } catch(error) {
      if(version===selectionVersion&&state.current?.id===id){state.loadError='Não foi possível carregar a conversa.';toast(friendlyError(error,state.loadError),'error');}
    } finally {
      if(version===selectionVersion&&state.current?.id===id){state.loading=false;renderChat();scrollMessagesToEnd(id,true);}
    }
  }
  function renderChatHeader() { const p=state.current; $('#buddyChatHeader').innerHTML = p ? `<button class="buddy-mobile-back" type="button" data-back aria-label="Voltar aos contactos">←</button><span class="buddy-avatar-wrap">${avatar(p)}<i class="buddy-dot ${presence(p)}"></i></span><div class="buddy-chat-title"><strong>${esc(profileName(p))}</strong><span>${statusLabel(presence(p))}</span></div><div class="buddy-chat-actions"><button type="button" data-info aria-label="Informações do contacto">ⓘ</button><button type="button" data-chat-menu aria-label="Mais ações">⋯</button></div>` : '';
  }
  function renderMessages() { const box=$('#buddyMessages'); if(!state.current){box.innerHTML='';return;} if(state.loading){box.innerHTML='<div class="buddy-empty-list">A carregar conversa…</div>';return;} if(state.loadError){box.innerHTML=`<div class="buddy-empty-list"><b>${esc(state.loadError)}</b><span>A ligação demorou mais do que o esperado.</span><button class="buddy-small-action primary" data-reload-chat> TENTAR NOVAMENTE</button></div>`;return;} let lastDay=''; let html=state.hasOlder?'<button class="buddy-load-older" data-load-older>CARREGAR MENSAGENS ANTERIORES</button>':''; if(!state.messages.length) html+=friendState(state.current.id)==='buddy'?'<div class="buddy-empty-list"><b>Ainda não existem mensagens.</b><span>Envia a primeira.</span></div>':'<div class="buddy-empty-list"><b>Perfil selecionado.</b><span>As mensagens ficam disponíveis depois de se tornarem Buddies.</span></div>'; state.messages.forEach(m=>{const day=dayKey(m.created_at);if(day!==lastDay){html+=`<div class="buddy-day-separator">${dayLabel(m.created_at)}</div>`;lastDay=day;}const mine=m.sender_id===state.session.user.id;const status=m._failed?'⚠ Não enviada':m._pending?'✓ A enviar':m.read_at?'✓✓ Lida':'✓ Enviada';html+=`<div class="buddy-message-row ${mine?'mine':''}" data-message-id="${esc(m.id)}"><article class="buddy-message ${m._failed?'failed':''}"><p>${esc(m.body)}</p><div class="buddy-message-meta"><time>${localDate(m.created_at)}</time>${mine?`<span>${status}</span>`:''}${m._failed?`<button class="buddy-retry" data-retry="${esc(m.id)}">Tentar novamente</button>`:''}</div></article></div>`;});box.innerHTML=html; }
  function renderChat(){const active=Boolean(state.current);$('#buddyNoConversation').hidden=active;$('#buddyChatActive').hidden=!active;if(!active)return;renderChatHeader();renderMessages();}
  function renderTyping(active){$('#buddyTyping').textContent=active&&state.current?`${profileName(state.current)} está a escrever…`:'';clearTimeout(typingStopTimer);if(active)typingStopTimer=setTimeout(()=>renderTyping(false),3000);}
  function renderInfo(){
    const p=state.current;
    if(!p){$('#buddyInfo').innerHTML='<div class="buddy-info-inner buddy-info-empty"><p>Seleciona um utilizador para veres o mini perfil.</p></div>';return;}
    const bio=String(p.bio||p.public_bio||'').trim();
    const games=listValues(p.games).map(slug=>state.catalog.games.get(slug)||readableSlug(slug));
    if(!games.length&&p.main_game)games.push(p.main_game);
    const platforms=listValues(p.platforms).map(slug=>state.catalog.platforms.get(slug)||readableSlug(slug));
    const modes=listValues(p.game_modes).map(mode=>String(mode).split('::')[1]||readableSlug(mode));
    $('#buddyInfo').innerHTML=`<div class="buddy-info-inner"><section class="buddy-info-identity">${avatar(p)}<h2>${esc(profileName(p))}</h2>${rolesMarkup(p)}<div class="buddy-info-status"><i class="buddy-dot ${presence(p)}"></i>${statusLabel(presence(p))}</div></section><div class="buddy-info-content">${bio?`<section class="buddy-info-about"><small>SOBRE</small><p>${esc(bio)}</p></section>`:''}<div class="buddy-info-facts">${infoRow('country','País',p.country?[p.country]:[])}${infoRow('games','Jogos',games)}${infoRow('platforms','Plataformas',platforms)}${infoRow('modes','Modos',modes)}</div></div><a class="buddy-info-profile-link" href="profile.html?user=${encodeURIComponent(p.id)}">${infoIcons.profile}<span>VER PERFIL COMPLETO</span><b aria-hidden="true">→</b></a></div>`;
  }

  async function sendMessage() { const input=$('#buddyMessageInput'), body=input.value.trim();if(!body||!state.current||friendState(state.current.id)!=='buddy')return;const peerId=state.current.id,temp={id:`temp-${Date.now()}`,sender_id:state.session.user.id,receiver_id:peerId,body,created_at:new Date().toISOString(),read_at:null,_pending:true};state.messages.push(temp);input.value='';resizeComposer();renderMessages();scrollMessagesToEnd(peerId,true);messages.broadcastTyping(false);try{const saved=await messages.send(peerId,body);if(state.current?.id===peerId){state.messages=state.messages.map(m=>m.id===temp.id?saved:m);renderMessages();scrollMessagesToEnd(peerId,true);}}catch(error){if(state.current?.id===peerId){temp._pending=false;temp._failed=true;renderMessages();}console.error('[BUDDY BDY-MSG-001]',{message:error?.message||String(error)});toast('Não foi possível enviar a mensagem. Código: BDY-MSG-001','error');}finally{restoreComposerFocus(peerId);}}
  async function loadOlder(){if(!state.current||!state.oldest)return;const oldHeight=$('#buddyMessages').scrollHeight;try{const rows=await messages.page(state.current.id,state.oldest);state.messages=[...rows,...state.messages];state.oldest=rows[0]?.created_at||state.oldest;state.hasOlder=rows.length===50;renderMessages();$('#buddyMessages').scrollTop=$('#buddyMessages').scrollHeight-oldHeight;}catch(error){toast(friendlyError(error,'Falha ao carregar mensagens anteriores.'),'error');}}
  function resizeComposer(){const input=$('#buddyMessageInput');input.style.height='42px';input.style.height=`${Math.min(input.scrollHeight,130)}px`;}
  function syncComposerForSelection(){const form=$('#buddyMessageForm');if(form)form.hidden=!state.current||friendState(state.current.id)!=='buddy';}
  function restoreComposerFocus(peerId){requestAnimationFrame(()=>{const input=$('#buddyMessageInput'),form=$('#buddyMessageForm');if(!input||!form||form.hidden||state.current?.id!==peerId||friendState(peerId)!=='buddy')return;input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);});}
  function messagesNearEnd(){const box=$('#buddyMessages');return !box||box.scrollHeight-box.scrollTop-box.clientHeight<=120;}
  function showNewMessageIndicator(show){const indicator=$('#buddyNewMessageIndicator');if(indicator)indicator.hidden=!show;}
  function scrollMessagesToEnd(peerId=state.current?.id,focus=false){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(state.current?.id!==peerId)return;const box=$('#buddyMessages');if(box){box.scrollTop=box.scrollHeight;showNewMessageIndicator(false);}if(focus)restoreComposerFocus(peerId);}));}

  async function handleClick(event){const el=event.target.closest('button,a');if(!el)return;if(el.matches('[data-open-chat]')){event.preventDefault();return openChat(el.dataset.openChat);}if(el.matches('[data-select-user]')){event.preventDefault();const profile=state.profiles.get(el.dataset.selectUser)||state.searchResults.find(p=>p.id===el.dataset.selectUser);if(profile)selectUser(profile,false);return;}if(el.matches('[data-reload-chat]'))return state.current&&openChat(state.current.id);if(el.matches('[data-back]')){root.classList.remove('chat-open');return;}if(el.matches('[data-info]')){$('#buddyInfo').classList.toggle('open');return;}if(el.matches('[data-focus-search]')){$('#buddySearch').focus();return;}if(el.matches('[data-focus-composer]')){$('#buddyMessageInput').focus();return;}if(el.matches('[data-load-older]'))return loadOlder();if(el.matches('[data-add-buddy]')){el.disabled=true;try{await friends.request(el.dataset.addBuddy);toast('Pedido de Buddy enviado.');await refreshData();}catch(error){toast(friendlyError(error,'Falha ao enviar o pedido.'),'error');}finally{el.disabled=false;}return;}if(el.matches('[data-respond]')){try{await friends.respond(el.dataset.relation,el.dataset.respond==='accept');toast(el.dataset.respond==='accept'?'Pedido aceite. Agora são Buddies.':'Pedido recusado.');await refreshData();}catch(error){toast(friendlyError(error,'Falha ao responder ao pedido.'),'error');}return;}if(el.matches('[data-block]')){if(confirm(`Bloquear ${profileName(state.current)}? Deixarão de poder trocar mensagens ou pedidos.`)){try{await friends.block(el.dataset.block);toast('Utilizador bloqueado.');state.current=null;await refreshData();renderChat();renderInfo();}catch(error){toast(friendlyError(error,'Falha ao bloquear.'),'error');}}return;}if(el.matches('[data-unblock]')){try{await friends.unblock(el.dataset.unblock);toast('Utilizador desbloqueado.');await refreshData();}catch(error){toast(friendlyError(error,'Falha ao desbloquear.'),'error');}return;}if(el.matches('[data-report]'))return openReport(el.dataset.report);if(el.matches('[data-dialog-close]'))return $('#buddyModal').hidden=true;if(el.matches('[data-emoji]')){const input=$('#buddyMessageInput');input.value+=el.dataset.emoji;input.focus();resizeComposer();return;}if(el.matches('[data-retry]')){const failed=state.messages.find(m=>String(m.id)===el.dataset.retry);if(failed){state.messages=state.messages.filter(m=>m!==failed);$('#buddyMessageInput').value=failed.body;sendMessage();}return;}if(el.matches('[data-chat-menu]')){openQuickMenu();return;}}
  function openQuickMenu(){if(!state.current)return;const modal=$('#buddyModal');modal.innerHTML=`<section class="buddy-dialog" role="dialog" aria-modal="true"><h2>${esc(profileName(state.current))}</h2><div class="buddy-info-actions">${profileAction(state.current)}<button class="danger" data-block="${state.current.id}">Bloquear</button><button data-report="${state.current.id}">Denunciar</button></div><div class="buddy-settings"><label class="buddy-switch"><span>Som das mensagens</span><input id="buddySound" type="checkbox" ${state.sound?'checked':''}></label></div><div class="buddy-dialog-actions"><button class="buddy-small-action" data-dialog-close>Fechar</button></div></section>`;modal.hidden=false;}
  function openReport(id){const modal=$('#buddyModal');modal.innerHTML=`<form class="buddy-dialog" id="buddyReportForm" data-user="${id}" role="dialog" aria-modal="true"><h2>Denunciar utilizador</h2><p>A equipa irá analisar a denúncia. Não incluas dados privados.</p><label for="reportReason">Motivo</label><select id="reportReason"><option value="assedio">Assédio</option><option value="spam">Spam</option><option value="ameaca">Ameaça</option><option value="conteudo_improprio">Conteúdo impróprio</option><option value="perfil_falso">Perfil falso</option><option value="outro">Outro</option></select><label for="reportDetails">Detalhes</label><textarea id="reportDetails" maxlength="1000" required></textarea><div class="buddy-dialog-actions"><button type="button" class="buddy-small-action" data-dialog-close>Cancelar</button><button class="buddy-small-action primary" type="submit">Enviar denúncia</button></div></form>`;modal.hidden=false;}

  function bind(){root.addEventListener('click',handleClick);$('#buddyModal').addEventListener('click',handleClick);$('#buddyMessageForm').addEventListener('submit',e=>{e.preventDefault();sendMessage();});$('#buddyMessageInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});$('#buddyMessageInput').addEventListener('input',()=>{resizeComposer();messages.broadcastTyping(true);clearTimeout(typingTimer);typingTimer=setTimeout(()=>messages.broadcastTyping(false),900);});$('#buddyEmojiToggle').onclick=()=>{$('#buddyEmojiPanel').hidden=!$('#buddyEmojiPanel').hidden;};$('#buddySearch').addEventListener('input',e=>{clearTimeout(searchTimer);const q=e.target.value.trim();if(q.length<2){state.searchResults=[];return renderSidebar();}searchTimer=setTimeout(async()=>{try{state.searchResults=await friends.search(q);state.searchResults.forEach(p=>state.profiles.set(p.id,p));renderSearch();}catch(error){toast(friendlyError(error,'Falha na pesquisa.'),'error');}},280);});document.querySelectorAll('[data-buddy-tab]').forEach(btn=>btn.onclick=()=>{state.tab=btn.dataset.buddyTab;document.querySelectorAll('[data-buddy-tab]').forEach(b=>b.classList.toggle('active',b===btn));$('#buddySearch').value='';state.searchResults=[];renderSidebar();});const updateSound=e=>{if(e.target.id==='buddySound'){state.sound=e.target.checked;localStorage.setItem('tl_buddy_sound_v100',state.sound?'on':'off');}};$('#buddyInfo').addEventListener('change',updateSound);$('#buddyModal').addEventListener('change',updateSound);$('#buddyReportForm');$('#buddyModal').addEventListener('submit',async e=>{if(e.target.id!=='buddyReportForm')return;e.preventDefault();try{await friends.report(e.target.dataset.user,$('#reportReason').value,$('#reportDetails').value);$('#buddyModal').hidden=true;toast('Denúncia enviada para análise.');}catch(error){toast(friendlyError(error,'Falha ao enviar a denúncia.'),'error');}});window.addEventListener('beforeunload',()=>{friends?.unsubscribe();messages?.destroy();});}

  async function onRealtime(payload){const row=payload.new||payload.old;if(!row)return;const peer=row.sender_id===state.session.user.id?row.receiver_id:row.sender_id;if(friendState(peer).startsWith('blocked'))return;if(state.current?.id===peer){if(payload.eventType==='INSERT'){const shouldFollow=messagesNearEnd();const optimistic=state.messages.find(m=>m._pending&&m.body===row.body&&m.sender_id===row.sender_id);if(optimistic)state.messages=state.messages.map(m=>m===optimistic?row:m);else if(!state.messages.some(m=>m.id===row.id))state.messages.push(row);renderMessages();if(shouldFollow)scrollMessagesToEnd(peer);else showNewMessageIndicator(true);if(row.receiver_id===state.session.user.id)messages.markRead(peer);}else if(payload.eventType==='UPDATE'){state.messages=state.messages.map(m=>m.id===row.id?row:m);renderMessages();}}else if(row.receiver_id===state.session.user.id&&payload.eventType==='INSERT'){state.unread[peer]=(state.unread[peer]||0)+1;renderSidebar();updateUnread();const p=state.profiles.get(peer);toast(`💬 ${profileName(p)}: ${String(row.body).slice(0,70)}`,'',()=>openChat(peer));playSound();}}
  function playSound(){if(!state.sound)return;const audio=new Audio('assets/sounds/buddy-message.wav');audio.volume=.25;audio.play().catch(()=>{});}
  function connection(status){state.connection=status;const connected=status==='SUBSCRIBED';$('#buddyConnection').hidden=connected;$('#buddyConnection').textContent=status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'Reconectando…':'A ligar…';}

  async function boot(nextSession){const sb=window.teamSupabase;if(!sb){$('#buddyLogin').hidden=false;return;}state.session=nextSession||await window.TeamAuth?.getSession();if(!state.session){activeUserId=null;$('#buddyLogin').hidden=false;$('#buddyRoot').hidden=true;return;}if(activeUserId===state.session.user.id)return;activeUserId=state.session.user.id;$('#buddyLogin').hidden=true;$('#buddyRoot').hidden=false;const [me,catalog]=await Promise.all([sb.from('profiles').select('*').eq('id',state.session.user.id).maybeSingle(),window.TeamProfiles?.getCatalog?.().catch(()=>({games:[],platforms:[]}))||{games:[],platforms:[]}]);state.catalog.games=new Map((catalog.games||[]).map(item=>[item.slug,item.name]));state.catalog.platforms=new Map((catalog.platforms||[]).map(item=>[item.slug,item.name]));state.me=me.data||{id:state.session.user.id,game_nickname:state.session.user.email};state.profiles.set(state.me.id,state.me);friends=new window.TeamBuddyFriendsService(sb,state.session.user.id);messages=new window.TeamBuddyMessagesService(sb,state.session.user.id);$('#buddySelfName').textContent=profileName(state.me);const s=presence(state.me);$('#buddySelfStatus').textContent=statusLabel(s);$('#buddySelfDot').className=`buddy-dot ${s}`;bind();await refreshData();const target=new URLSearchParams(location.search).get('user');if(target&&target!==state.session.user.id&&!state.profiles.has(target)){const found=await friends.getPublicProfile(target);if(found){state.profiles.set(found.id,found);state.searchResults=[found];$('#buddySearch').value=profileName(found);renderSearch();state.current=found;renderInfo();$('#buddyInfo').classList.add('open');}}friends.subscribe(()=>refreshData());messages.subscribe(onRealtime,connection);window.addEventListener('tl:presence',e=>{const next=e.detail.status;state.me.presence=next;$('#buddySelfStatus').textContent=statusLabel(next);$('#buddySelfDot').className=`buddy-dot ${next}`;});}
  window.addEventListener('tl:presence-peers',()=>{if(!state.session)return;renderSidebar();if(state.current){renderChatHeader();renderInfo();}});
  $('#buddyNewMessageIndicator')?.addEventListener('click',()=>scrollMessagesToEnd(state.current?.id,true));
  $('#buddyLoginButton')?.addEventListener('click',()=>window.TeamAuth?.signInWithGoogle().catch(error=>toast(friendlyError(error,'Não foi possível iniciar o login.'),'error')));
  window.TeamAuth?.subscribe(nextSession=>{if(!nextSession&&activeUserId){friends?.unsubscribe();messages?.destroy();activeUserId=null;state.session=null;$('#buddyLogin').hidden=false;$('#buddyRoot').hidden=true;return;}boot(nextSession).catch(error=>{activeUserId=null;console.error(error);$('#buddyLogin').hidden=false;$('#buddyRoot').hidden=true;});});
})();
