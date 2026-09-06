(() => {
  'use strict';
  if (window.TeamMessageRequestsV115) return;

  const sb = window.teamSupabase;
  if (!sb) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const params = new URLSearchParams(location.search);
  const targetId = params.get('user');
  const requestMode = params.get('request') === '1';
  let session = null;
  let requests = [];
  let channel = null;

  function ensureUi() {
    if (document.getElementById('buddyRequestOverlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      .buddy-request-entry-v115{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025);font:800 11px/1.2 Inter,Arial,sans-serif;color:#dbe8f5;cursor:pointer}
      .buddy-request-entry-v115 b{display:inline-grid;min-width:18px;height:18px;place-items:center;border-radius:999px;background:#ff4b5f;color:white;font-size:10px}.buddy-request-entry-v115[hidden]{display:none}
      .buddy-request-overlay-v115{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px)}
      .buddy-request-overlay-v115[hidden]{display:none}.buddy-request-card-v115{width:min(560px,100%);max-height:min(760px,88vh);overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:#0a1018;box-shadow:0 24px 80px rgba(0,0,0,.5);padding:18px;color:#eef6ff;font-family:Inter,Arial,sans-serif}
      .buddy-request-head-v115{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.buddy-request-head-v115 h2{margin:0;font-size:20px}.buddy-request-head-v115 p{margin:4px 0 0;color:#8fa2b4;font-size:12px}.buddy-request-close-v115{border:0;background:transparent;color:#dbe8f5;font-size:24px;cursor:pointer}
      .buddy-request-messages-v115{display:grid;gap:8px;margin:16px 0}.buddy-request-msg-v115{padding:10px 12px;border-radius:12px;background:#111b27;border:1px solid rgba(255,255,255,.07);font-size:13px}.buddy-request-msg-v115.mine{margin-left:34px;background:#10243a}
      .buddy-request-compose-v115{display:grid;gap:8px}.buddy-request-compose-v115 textarea{width:100%;min-height:84px;resize:vertical;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#050a10;color:#fff;padding:11px;font:500 13px/1.4 Inter,Arial,sans-serif}.buddy-request-actions-v115{display:flex;flex-wrap:wrap;gap:8px}.buddy-request-actions-v115 button{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 13px;background:#182332;color:#eef6ff;font-weight:900;cursor:pointer}.buddy-request-actions-v115 .primary{background:#1769ff}.buddy-request-actions-v115 .danger{background:#7b2330}.buddy-request-empty-v115{padding:18px 4px;color:#8fa2b4;text-align:center}
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'buddyRequestOverlay';
    overlay.className = 'buddy-request-overlay-v115';
    overlay.hidden = true;
    overlay.innerHTML = '<section class="buddy-request-card-v115" role="dialog" aria-modal="true"><div id="buddyRequestBody"></div></section>';
    overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(); });
    document.body.appendChild(overlay);

    const tabs = document.querySelector('.buddy-tabs-v100');
    if (tabs) {
      const button = document.createElement('button');
      button.id = 'buddyMessageRequestsButton';
      button.className = 'buddy-request-entry-v115';
      button.type = 'button';
      button.hidden = true;
      button.innerHTML = 'SOLICITAÇÕES <b>0</b>';
      button.addEventListener('click', openInbox);
      tabs.insertAdjacentElement('afterend', button);
    }
  }

  function openOverlay(html) {
    ensureUi();
    const overlay = document.getElementById('buddyRequestOverlay');
    document.getElementById('buddyRequestBody').innerHTML = html;
    overlay.hidden = false;
  }
  function closeOverlay() { const overlay = document.getElementById('buddyRequestOverlay'); if (overlay) overlay.hidden = true; }

  async function profileOf(id) {
    try { return await window.TeamProfiles?.getPublicProfile?.(id); } catch { return null; }
  }

  async function pairRelation(otherId) {
    const pair = `and(requester_id.eq.${session.user.id},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${session.user.id})`;
    const result = await sb.from('buddy_relations').select('status').or(pair).maybeSingle();
    return result.data?.status || 'none';
  }

  async function getRequest(otherId) {
    const pair = `and(sender_id.eq.${session.user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${session.user.id})`;
    const result = await sb.from('private_message_requests').select('*').or(pair).maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function pairMessages(otherId) {
    const result = await sb.from('private_messages').select('*').or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${session.user.id})`).order('created_at',{ascending:true}).limit(20);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function openComposer(otherId) {
    if (!otherId || otherId === session.user.id) return;
    if (await pairRelation(otherId) === 'accepted') { location.href = `buddy.html?user=${encodeURIComponent(otherId)}`; return; }
    const [profile,request,messages] = await Promise.all([profileOf(otherId),getRequest(otherId),pairMessages(otherId)]);
    if (request?.status === 'rejected') {
      openOverlay(`<div class="buddy-request-head-v115"><div><h2>Solicitação recusada</h2><p>${esc(profile?.display_name || profile?.game_nickname || 'Este membro')} recusou esta solicitação.</p></div><button class="buddy-request-close-v115" type="button" data-request-close>×</button></div>`);
      document.querySelector('[data-request-close]')?.addEventListener('click',closeOverlay);
      return;
    }
    if (request?.status === 'accepted') { location.href = `buddy.html?user=${encodeURIComponent(otherId)}`; return; }
    const mine = messages.filter(row => row.sender_id === session.user.id).length;
    const remaining = Math.max(0,2-mine);
    openOverlay(`<div class="buddy-request-head-v115"><div><h2>Mensagem para ${esc(profile?.display_name || profile?.game_nickname || 'membro')}</h2><p>Podes enviar até 2 mensagens antes da pessoa aceitar a conversa.</p></div><button class="buddy-request-close-v115" type="button" data-request-close>×</button></div><div class="buddy-request-messages-v115">${messages.length ? messages.map(row => `<div class="buddy-request-msg-v115 ${row.sender_id === session.user.id ? 'mine' : ''}">${esc(row.body)}</div>`).join('') : '<div class="buddy-request-empty-v115">Ainda não enviaste nenhuma mensagem.</div>'}</div><form id="buddyRequestCompose" class="buddy-request-compose-v115"><textarea maxlength="2000" placeholder="Escreve uma mensagem…" ${remaining ? '' : 'disabled'}></textarea><div class="buddy-request-actions-v115"><button type="submit" class="primary" ${remaining ? '' : 'disabled'}>ENVIAR${remaining ? ` · ${remaining} restante${remaining===1?'':'s'}` : ''}</button></div></form>`);
    document.querySelector('[data-request-close]')?.addEventListener('click',closeOverlay);
    document.getElementById('buddyRequestCompose')?.addEventListener('submit',async event => {
      event.preventDefault();
      const textarea = event.currentTarget.querySelector('textarea');
      const body = textarea.value.trim();
      if (!body) return;
      const button = event.currentTarget.querySelector('button[type=submit]');
      button.disabled = true;
      try {
        let activeRequest = request;
        if (!activeRequest) {
          const inserted = await sb.from('private_message_requests').insert({sender_id:session.user.id,receiver_id:otherId,status:'pending'}).select().single();
          if (inserted.error) throw inserted.error;
          activeRequest = inserted.data;
        }
        const sent = await sb.from('private_messages').insert({sender_id:session.user.id,receiver_id:otherId,body}).select().single();
        if (sent.error) throw sent.error;
        closeOverlay();
        await openComposer(otherId);
      } catch (error) {
        console.error('[Message request send]',error);
        button.disabled = false;
      }
    });
  }

  async function loadIncoming() {
    const result = await sb.from('private_message_requests').select('*').eq('receiver_id',session.user.id).eq('status','pending').order('created_at',{ascending:false});
    if (result.error) throw result.error;
    requests = result.data || [];
    const button = document.getElementById('buddyMessageRequestsButton');
    if (button) { button.hidden = !requests.length; button.querySelector('b').textContent = String(requests.length); }
  }

  async function openInbox() {
    const rows = await Promise.all(requests.map(async request => ({ request, profile:await profileOf(request.sender_id), messages:await pairMessages(request.sender_id) })));
    openOverlay(`<div class="buddy-request-head-v115"><div><h2>Solicitações de mensagem</h2><p>Mensagens de pessoas que ainda não são tuas amigas.</p></div><button class="buddy-request-close-v115" type="button" data-request-close>×</button></div><div class="buddy-request-messages-v115">${rows.length ? rows.map(({request,profile,messages}) => `<article class="buddy-request-msg-v115"><strong>${esc(profile?.display_name || profile?.game_nickname || 'Membro')}</strong><div style="margin-top:8px;display:grid;gap:6px">${messages.filter(m=>m.sender_id===request.sender_id).slice(0,2).map(m=>`<span>${esc(m.body)}</span>`).join('')}</div><div class="buddy-request-actions-v115" style="margin-top:10px"><button class="primary" type="button" data-request-accept="${request.id}">ACEITAR</button><button class="danger" type="button" data-request-reject="${request.id}">RECUSAR</button></div></article>`).join('') : '<div class="buddy-request-empty-v115">Sem solicitações pendentes.</div>'}</div>`);
    document.querySelector('[data-request-close]')?.addEventListener('click',closeOverlay);
    document.querySelectorAll('[data-request-accept]').forEach(button => button.addEventListener('click',() => respond(button.dataset.requestAccept,true)));
    document.querySelectorAll('[data-request-reject]').forEach(button => button.addEventListener('click',() => respond(button.dataset.requestReject,false)));
  }

  async function respond(id,accept) {
    const result = await sb.from('private_message_requests').update({status:accept?'accepted':'rejected',responded_at:new Date().toISOString()}).eq('id',id).eq('receiver_id',session.user.id).select().single();
    if (result.error) throw result.error;
    await loadIncoming();
    await openInbox();
  }

  async function boot(nextSession) {
    session = nextSession || await window.TeamAuth?.getSession?.();
    if (!session?.user) return;
    ensureUi();
    await loadIncoming();
    if (channel) sb.removeChannel(channel);
    channel = sb.channel(`message-requests-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'private_message_requests',filter:`receiver_id=eq.${session.user.id}`},() => void loadIncoming()).subscribe();
    if (requestMode && targetId && targetId !== session.user.id) void openComposer(targetId);
  }

  window.addEventListener('pagehide',() => { if (channel) sb.removeChannel(channel); channel = null; },{once:true});
  window.TeamMessageRequestsV115 = Object.freeze({ openComposer, openInbox, refresh:loadIncoming });
  window.TeamAuth?.subscribe(nextSession => { if (nextSession) void boot(nextSession); });
})();