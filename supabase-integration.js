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

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const teamRoles = new Set(['moderator','staff','admin','master']);
  const isTeam = () => teamRoles.has(profile?.role);
  const statusDb = v => ({busy:'busy',away:'away',online:'online'}[v] || 'online');
  const statusUi = v => ({busy:'busy',away:'away',online:'online',offline:'away'}[v] || 'online');

  async function loginGoogle() {
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } });
    if (error) alert(`Erro no login: ${error.message}`);
  }
  async function logout() { await sb.auth.signOut(); location.reload(); }

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
      if (!session) bar.innerHTML = '<button id="sbGlobalLogin" type="button">Entrar com Google</button>';
      else bar.innerHTML = `<div class="sb-user">${profile?.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:''}<span>${esc(profile?.game_nickname || profile?.full_name || session.user.email)}</span></div><button class="sb-logout" id="sbLogout" type="button">Sair</button>`;
      $('sbGlobalLogin')?.addEventListener('click', loginGoogle);
      $('sbLogout')?.addEventListener('click', logout);
    }
    const btn = $('googleLoginBtn');
    if (btn) {
      btn.textContent = session ? `Ligado: ${profile?.game_nickname || profile?.full_name || 'Google'}` : 'Entrar com Google';
      btn.onclick = session ? logout : loginGoogle;
    }
    const name = $('chatName');
    if (name && session) { name.value = profile?.game_nickname || profile?.full_name || ''; name.readOnly = true; }
  }

  async function setPresence(value) {
    if (!session) return;
    await sb.from('profiles').update({presence:statusDb(value),last_seen:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',session.user.id);
  }

  async function renderChat() {
    const box = $('chatMessages');
    if (!box) return;
    if (!session) { box.innerHTML = '<div class="sb-login-required">Entra com Google para ver e escrever no chat.</div>'; return; }
    const { data, error } = await sb.from('chat_messages').select('id,message,created_at,user_id,profiles!chat_messages_user_id_fkey(full_name,game_nickname,role,presence,avatar_url)').eq('is_deleted',false).order('created_at',{ascending:true}).limit(30);
    if (error) { box.innerHTML = `<p>${esc(error.message)}</p>`; return; }
    box.innerHTML = (data||[]).map(row => {
      const p=row.profiles||{}; const name=p.game_nickname||p.full_name||'Jogador';
      return `<article class="chat-msg ${statusUi(p.presence)}"><div><strong>${esc(name)}</strong> <small>${esc(p.role||'member')}</small><span class="status">${esc(p.presence||'offline')}</span></div><p>${esc(row.message)}</p></article>`;
    }).join('') || '<p class="sb-login-required">Ainda não há mensagens. Manda a primeira 😎</p>';
    box.scrollTop = box.scrollHeight;
  }

  function bindChat() {
    const form=$('chatForm'); if (!form) return;
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (!session) return loginGoogle();
      if (!(await ensureNickname())) return;
      const input=$('chatInput'); const message=input?.value.trim(); if (!message) return;
      const { error }=await sb.from('chat_messages').insert({user_id:session.user.id,message});
      if (error) return alert(error.message);
      input.value=''; await renderChat();
    }, true);
    $('userStatus')?.addEventListener('change', e => setPresence(e.target.value));
  }

  async function sendContact(ev) {
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (!session) return loginGoogle();
    if (!(await ensureNickname())) return;
    const title=$('contactAdminTitle')?.value.trim();
    const message=$('contactAdminMessage')?.value.trim();
    const nick=$('contactAdminNickname')?.value.trim() || profile?.game_nickname;
    const feedback=$('contactAdminFeedback');
    if (!title || !message || !nick) { if(feedback) feedback.textContent='Preenche assunto, nickname e mensagem.'; return; }
    const { error }=await sb.from('contact_messages').insert({sender_id:session.user.id,game_nickname:nick,subject:title,message});
    if (error) { if(feedback) feedback.textContent=`Erro: ${error.message}`; return; }
    ev.target.reset(); if(feedback) feedback.textContent='Mensagem enviada para a caixa da administração.';
  }

  function bindContact() { $('contactAdminForm')?.addEventListener('submit', sendContact, true); }

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
    if ($('chatMessages')) chatChannel=sb.channel('team-chat-ui').on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},renderChat).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},renderChat).subscribe();
    if ($('supabasePrivateInbox')||$('supabaseInboxBadge')) inboxChannel=sb.channel('team-inbox-ui').on('postgres_changes',{event:'*',schema:'public',table:'contact_messages'},renderInbox).subscribe();
  }

  async function boot() {
    const { data }=await sb.auth.getSession(); session=data.session; await loadProfile(); renderAuth();
    if(session){ await ensureNickname(); await setPresence($('userStatus')?.value||'online'); }
    bindChat(); bindContact(); await renderChat(); await renderInbox(); subscribe();
    sb.auth.onAuthStateChange(async (_event,newSession)=>{session=newSession;await loadProfile();renderAuth();await renderChat();await renderInbox();subscribe();});
    window.addEventListener('beforeunload',()=>{ if(session) sb.from('profiles').update({presence:'offline',last_seen:new Date().toISOString()}).eq('id',session.user.id); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
