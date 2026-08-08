(() => {
  'use strict';

  const URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(URL, KEY);
  if (!sb) return;

  const ROOMS = {
    all: 'Todas', geral: 'Geral', suporte: 'Suporte', loja: 'Loja', sugestoes: 'Sugestões',
    duvidas: 'Dúvidas', ajuda: 'Ajuda', candidaturas: 'Candidaturas', eventos: 'Eventos e Torneios',
    fortnite: 'Fortnite', denuncias: 'Denúncias'
  };
  const ROOM_INFO = {
    geral: { icon: '💬', description: 'Conversas gerais da comunidade Team Lambreta.' },
    sugestoes: { icon: '💡', description: 'Ideias para melhorar o site, o Team e a comunidade.' },
    duvidas: { icon: '❓', description: 'Perguntas gerais e respostas da comunidade.' },
    ajuda: { icon: '🤝', description: 'Pedidos de orientação e ajuda entre membros.' },
    suporte: { icon: '🛠️', description: 'Problemas técnicos, acesso, conta e funcionamento do site.' },
    loja: { icon: '🛒', description: 'Pedidos, pagamentos, entregas, trocas e tamanhos.' },
    candidaturas: { icon: '🔒', description: 'Candidaturas privadas para Team, Staff, Moderação e Streamers.' },
    fortnite: { icon: '🎮', description: 'Partidas, estratégias, equipas e novidades de Fortnite.' },
    eventos: { icon: '🏆', description: 'Torneios, inscrições, regras, resultados e premiações.' },
    denuncias: { icon: '🔐', description: 'Denúncias privadas, visíveis apenas ao autor e à moderação.' }
  };
  const ROOM_GROUPS = [
    { title: 'Comunidade', rooms: ['geral', 'sugestoes', 'duvidas', 'ajuda'] },
    { title: 'Suporte', rooms: ['suporte', 'loja'] },
    { title: 'Team Lambreta', rooms: ['candidaturas', 'fortnite', 'eventos'] },
    { title: 'Área privada', rooms: ['denuncias'] }
  ];
  const PRIVATE_ROOMS = new Set(['candidaturas', 'denuncias']);
  const MOD_ROLES = new Set(['master', 'admin', 'moderator', 'staff']);
  const ROLE_LABEL = {
    master: 'DEV', boss: 'BOSS', admin: 'ADMIN', moderator: 'MODERADOR', staff: 'STAFF',
    streamer: 'STREAMER', vip1: 'VIP I', vip2: 'VIP II', vip3: 'VIP III', member: 'MEMBRO'
  };

  const $ = id => document.getElementById(id);
  const form = $('userTopicFormV90');
  const notice = $('forumLoginNotice');
  const identity = $('forumAuthorIdentity');
  const feedback = $('topicFeedback');
  const profileMap = new Map();

  let session = null;
  let profile = null;
  let filter = 'approved';
  let room = 'all';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const now = () => new Date().toISOString();
  const makeId = () => `forum_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const normalizeRole = role => ({
    dev: 'master', developer: 'master', owner: 'master', boss: 'master', administrador: 'admin',
    mod: 'moderator', moderador: 'moderator', helper: 'staff', suporte: 'staff', user: 'member'
  }[String(role || '').trim().toLowerCase()] || String(role || 'member').trim().toLowerCase() || 'member');
  const roleOf = value => normalizeRole(value?.role || value || 'member');
  const roleLabel = role => ROLE_LABEL[normalizeRole(role)] || 'MEMBRO';
  const roleClass = role => normalizeRole(role).replace(/[^a-z0-9_-]/gi, '');
  const isBossProfile = value => /^(ink31|oklm_31_ink)$/i.test(String(value?.game_nickname || value?.full_name || ''));
  const isBoss = () => isBossProfile(profile);
  const canModerate = () => MOD_ROLES.has(roleOf(profile)) || isBoss();
  const currentName = () => profile?.game_nickname || profile?.full_name || session?.user?.email || 'Utilizador';
  const uid = () => session?.user?.id || '';

  function getData() {
    return typeof getTeamData === 'function' ? getTeamData() : null;
  }

  function normalizeTopic(topic, pending = false) {
    const item = topic || {};
    item.id = item.id || makeId();
    item.category = ROOMS[item.category] ? item.category : 'geral';
    item.replies = Array.isArray(item.replies) ? item.replies : [];
    item.authorRole = normalizeRole(item.authorRole || 'member');
    item.private = typeof item.private === 'boolean' ? item.private : PRIVATE_ROOMS.has(item.category);
    item.approved = pending ? false : item.approved !== false;
    item.status = item.status === 'Fechado' ? 'Fechado' : 'Aberto';
    item.fixed = Boolean(item.fixed);
    item.createdAt = item.createdAt || now();
    item.reactions = item.reactions && typeof item.reactions === 'object' ? item.reactions : {};
    item.reactions.likes = Array.isArray(item.reactions.likes) ? item.reactions.likes : [];
    item.reactions.dislikes = Array.isArray(item.reactions.dislikes) ? item.reactions.dislikes : [];
    item.reactions.shares = Number.isFinite(Number(item.reactions.shares)) ? Number(item.reactions.shares) : 0;
    return item;
  }

  function save(data, message = '') {
    if (typeof saveTeamData === 'function') saveTeamData(data);
    if (typeof renderPublicSite === 'function') renderPublicSite();
    renderRooms();
    renderForumBoard();
    if (message) showFeedback(message, false);
  }

  function showFeedback(message, error = false) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('error', error);
    feedback.classList.add('is-visible');
    setTimeout(() => feedback.classList.remove('is-visible'), 3500);
  }

  function canSeeTopic(topic) {
    return !topic.private || canModerate() || topic.userId === uid();
  }

  function resolvedIdentity(userId, fallbackRole = 'member', fallbackName = 'Equipa') {
    const found = userId ? profileMap.get(userId) : null;
    const boss = isBossProfile(found);
    const role = boss ? 'boss' : normalizeRole(found?.role || fallbackRole || 'member');
    return {
      name: found?.game_nickname || found?.full_name || fallbackName,
      role,
      label: boss ? 'BOSS' : roleLabel(role),
      avatar: found?.avatar_url || ''
    };
  }

  function roleBadge(person) {
    return `<span class="forum-role role-${roleClass(person.role)}">${esc(person.label)}</span>`;
  }

  async function loadProfilesForForum() {
    try {
      const { data } = await sb.from('profiles').select('id,full_name,game_nickname,avatar_url,role');
      profileMap.clear();
      (data || []).forEach(item => profileMap.set(item.id, item));
    } catch (error) {
      console.warn('Forum profiles:', error);
    }
  }

  async function loadUser() {
    const result = await sb.auth.getSession();
    session = result.data.session;
    profile = null;
    await loadProfilesForForum();
    if (session) {
      const res = await sb.from('profiles').select('id,full_name,game_nickname,avatar_url,role').eq('id', session.user.id).maybeSingle();
      profile = res.data || null;
      if (profile?.id) profileMap.set(profile.id, profile);
    }
    updateAuth();
  }

  function updateAuth() {
    const logged = Boolean(session);
    if (form) form.hidden = !logged;
    if (notice) {
      notice.hidden = logged;
      notice.textContent = 'Entra com o Google para criar um tópico.';
    }
    if (identity && logged) {
      const role = isBoss() ? 'boss' : roleOf(profile);
      identity.innerHTML = `<small>PUBLICAR COMO</small><div class="forum-author-inline">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : ''}<strong class="forum-user-name role-text-${roleClass(role)}">${esc(currentName())}</strong>${roleBadge({ role, label: isBoss() ? 'BOSS' : roleLabel(role) })}</div>`;
    }
    document.querySelectorAll('[data-moderator-only]').forEach(element => {
      element.hidden = !canModerate();
    });
    renderRooms();
    renderForumBoard();
  }

  function approvedTopics() {
    const data = getData() || {};
    return (data.forum || []).map(topic => normalizeTopic(topic, false)).filter(canSeeTopic);
  }

  function roomStats(key) {
    const items = approvedTopics().filter(topic => topic.category === key);
    const sorted = [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const last = sorted[0] || null;
    return { count: items.length, last, who: last ? resolvedIdentity(last.userId, last.authorRole, last.author) : null };
  }

  function renderRooms() {
    const host = $('forumRooms');
    if (!host) return;
    host.innerHTML = ROOM_GROUPS.map(group => `
      <section class="forum-folder-group">
        <header class="forum-folder-group-head"><span></span><h3>${esc(group.title)}</h3><span></span></header>
        <div class="forum-folder-list">
          ${group.rooms.map(key => {
            const meta = ROOM_INFO[key];
            const stats = roomStats(key);
            return `<button type="button" data-room="${key}" class="forum-folder ${room === key ? 'is-active' : ''}">
              <span class="forum-folder-icon">${meta.icon}</span>
              <span class="forum-folder-copy"><strong>${esc(ROOMS[key])}</strong><small>${esc(meta.description)}</small></span>
              <span class="forum-folder-stats"><b>${stats.count}</b><small>${stats.count === 1 ? 'tópico' : 'tópicos'}</small></span>
              <span class="forum-folder-last">${stats.last ? `<small>Último tópico</small><strong>${esc(stats.last.title || 'Sem título')}</strong><em class="role-text-${roleClass(stats.who.role)}">${esc(stats.who.name)}</em>` : '<small>Nenhum tópico ainda</small>'}</span>
              <span class="forum-folder-arrow">›</span>
            </button>`;
          }).join('')}
        </div>
      </section>`).join('');

    host.querySelectorAll('[data-room]').forEach(button => {
      button.onclick = () => {
        room = button.dataset.room;
        renderRooms();
        renderForumBoard();
        $('forumGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
  }

  function replyMarkup(reply, topic) {
    if (reply.private && !canModerate() && topic.userId !== uid()) return '';
    const person = resolvedIdentity(reply.userId, reply.authorRole, reply.author || 'Equipa');
    return `<div class="forum-reply ${reply.private ? 'is-private' : ''} role-frame-${roleClass(person.role)}"><div class="forum-reply-head">${person.avatar ? `<img src="${esc(person.avatar)}" alt="">` : ''}<strong class="role-text-${roleClass(person.role)}">${esc(person.name)}</strong>${roleBadge(person)}<small>${reply.private ? 'PRIVADA' : 'RESPOSTA'}</small></div><p>${esc(reply.text || '')}</p></div>`;
  }



  function reactionSvg(type) {
    if (type === 'like') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 10.2 11 3.8c.5-.9 1.7-1.2 2.5-.6.6.4.9 1.2.7 1.9l-.9 3.5h4.9c1.7 0 2.9 1.6 2.4 3.2l-1.8 6.1c-.3 1.1-1.3 1.8-2.4 1.8H7.4V10.2Z"/><path d="M3.2 10.2h4.2v9.5H3.2z"/></svg>';
    if (type === 'dislike') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 13.8 11 20.2c.5.9 1.7 1.2 2.5.6.6-.4.9-1.2.7-1.9l-.9-3.5h4.9c1.7 0 2.9-1.6 2.4-3.2l-1.8-6.1c-.3-1.1-1.3-1.8-2.4-1.8H7.4v9.5Z"/><path d="M3.2 4.3h4.2v9.5H3.2z"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.3 5.2 20 10.7l-5.7 5.5v-3.3c-5.8 0-8.5 2.1-10.3 5.1.5-5.7 3.9-9.2 10.3-9.2V5.2Z"/></svg>';
  }

  function reactionBar(topic, pending) {
    if (pending || topic.private) return '';
    const likes = topic.reactions?.likes || [];
    const dislikes = topic.reactions?.dislikes || [];
    const me = uid();
    return `<div class="forum-reaction-bar" aria-label="Reações e partilha">
      <button type="button" class="forum-reaction-button ${me && likes.includes(me) ? 'is-active is-like' : ''}" data-reaction="like" title="Gostei" aria-label="Gostei">${reactionSvg('like')}<span>${likes.length}</span></button>
      <button type="button" class="forum-reaction-button ${me && dislikes.includes(me) ? 'is-active is-dislike' : ''}" data-reaction="dislike" title="Não gostei" aria-label="Não gostei">${reactionSvg('dislike')}<span>${dislikes.length}</span></button>
      <button type="button" class="forum-reaction-button forum-share-button" data-reaction="share" title="Compartilhar link" aria-label="Compartilhar link">${reactionSvg('share')}<span>${Number(topic.reactions?.shares || 0)}</span></button>
    </div>`;
  }

  function forumReactionTotals() {
    const topics = approvedTopics();
    return topics.reduce((acc, topic) => {
      acc.likes += topic.reactions?.likes?.length || 0;
      acc.dislikes += topic.reactions?.dislikes?.length || 0;
      acc.shares += Number(topic.reactions?.shares || 0);
      return acc;
    }, { likes: 0, dislikes: 0, shares: 0 });
  }

  function renderReactionStats() {
    const host = $('forumReactionStats');
    if (!host) return;
    const totals = forumReactionTotals();
    host.innerHTML = `<article><span class="forum-stat-icon is-like">${reactionSvg('like')}</span><div><b>${totals.likes}</b><small>Likes</small></div></article>
      <article><span class="forum-stat-icon is-dislike">${reactionSvg('dislike')}</span><div><b>${totals.dislikes}</b><small>Deslikes</small></div></article>
      <article><span class="forum-stat-icon is-share">${reactionSvg('share')}</span><div><b>${totals.shares}</b><small>Partilhas</small></div></article>`;
  }

  async function shareTopic(topic) {
    const url = new URL(window.location.href);
    url.hash = `topic-${topic.id}`;
    const shareData = { title: topic.title || 'Team Lambreta', text: topic.description || 'Tópico do Team Lambreta', url: url.toString() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(url.toString());
      topic.reactions.shares = Number(topic.reactions.shares || 0) + 1;
      const data = getData();
      save(data, navigator.share ? 'Link compartilhado.' : 'Link copiado.');
    } catch (error) {
      if (error?.name !== 'AbortError') showFeedback('Não foi possível compartilhar agora.', true);
    }
  }

  function controls(topic, pending) {
    if (!canModerate()) return '';
    if (pending) {
      return '<div class="forum-mod-actions"><button data-action="approve">Aprovar</button><button data-action="reject" class="danger">Recusar</button><button data-action="edit">Editar</button><button data-action="private-reply">Responder em privado</button><button data-action="move">Mover</button></div>';
    }
    return `<div class="forum-mod-actions"><button data-action="reply">Responder</button><button data-action="private-reply">Privado</button><button data-action="edit">Editar</button><button data-action="move">Mover</button><button data-action="fix">${topic.fixed ? 'Desfixar' : 'Fixar'}</button><button data-action="close">${topic.status === 'Fechado' ? 'Reabrir' : 'Fechar'}</button><button data-action="remove" class="danger">Remover</button></div>`;
  }

  function card(topic, pending = false) {
    const person = resolvedIdentity(topic.userId, topic.authorRole, topic.author || 'Equipa');
    return `<article class="forum-topic role-frame-${roleClass(person.role)} ${topic.fixed ? 'is-fixed' : ''} ${topic.private ? 'is-private' : ''}" data-topic-id="${esc(topic.id)}" data-pending="${pending ? '1' : '0'}">
      <div class="topic-meta"><span class="${pending ? 'pending' : topic.status === 'Fechado' ? 'closed' : 'open'}">${pending ? 'Pendente' : topic.status === 'Fechado' ? '🔒 FECHADO' : esc(topic.status)}</span>${topic.fixed ? '<span class="fixed">FIXADO</span>' : ''}<span class="forum-room-pill">${esc(ROOMS[topic.category] || 'Geral')}</span>${topic.private ? '<span class="private-pill">PRIVADO</span>' : ''}</div>
      <div class="forum-author-line">${person.avatar ? `<img src="${esc(person.avatar)}" alt="">` : ''}<strong class="role-text-${roleClass(person.role)}">${esc(person.name)}</strong>${roleBadge(person)}</div>
      <h3>${esc(topic.title || 'Sem título')}</h3><p>${esc(topic.description || 'Sem descrição')}</p>
      ${topic.editedAt ? `<div class="forum-edited-note">Editado pela moderação${topic.editedBy ? ` · ${esc(topic.editedBy)}` : ''}</div>` : ''}
      ${topic.replies.length ? `<div class="forum-replies">${topic.replies.map(reply => replyMarkup(reply, topic)).join('')}</div>` : ''}
      ${reactionBar(topic, pending)}
      ${controls(topic, pending)}
    </article>`;
  }

  function setFilter(nextFilter) {
    filter = nextFilter;
    $('forumTabs')?.querySelectorAll('[data-forum-filter]').forEach(button => {
      button.classList.toggle('active', button.dataset.forumFilter === filter);
    });
  }

  function renderForumBoard() {
    const grid = $('forumGrid');
    const data = getData();
    if (!grid || !data) return;

    data.forum = (data.forum || []).map(topic => normalizeTopic(topic, false));
    data.pendingForum = (data.pendingForum || []).map(topic => normalizeTopic(topic, true));

    let items;
    if (filter === 'pending' && canModerate()) {
      items = data.pendingForum.map(topic => ({ topic, pending: true }));
    } else {
      items = data.forum.map(topic => ({ topic, pending: false }));
      if (filter === 'fixed') items = items.filter(item => item.topic.fixed);
      if (filter === 'closed') items = items.filter(item => item.topic.status === 'Fechado');
      if (filter === 'approved') items = items.filter(item => item.topic.status !== 'Fechado');
    }

    items = items.filter(item => canSeeTopic(item.topic) && (room === 'all' || item.topic.category === room));
    items.sort((a, b) => Number(b.topic.fixed) - Number(a.topic.fixed) || String(b.topic.createdAt).localeCompare(String(a.topic.createdAt)));

    const roomTitle = room === 'all' ? 'Todos os tópicos' : ROOMS[room];
    grid.innerHTML = `<div class="forum-current-room"><span>${room === 'all' ? '📚' : ROOM_INFO[room]?.icon || '📁'}</span><div><small>SALA ATUAL</small><strong>${esc(roomTitle)}</strong></div></div>` +
      (items.length ? items.map(item => card(item.topic, item.pending)).join('') : '<article class="empty-card safe-card"><h3>Nenhum tópico nesta sala</h3><p>Escolhe outra sala ou cria o primeiro tópico.</p></article>');

    bindActions(grid, data);
    renderReactionStats();
    const targetId = String(location.hash || '').replace('#topic-', '');
    if (targetId) setTimeout(() => grid.querySelector(`[data-topic-id="${CSS.escape(targetId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  function askText(label) {
    const value = window.prompt(label, '');
    return value === null ? null : value.trim();
  }

  function addReply(topic, privateReply) {
    const text = askText(privateReply ? 'Resposta privada para o autor:' : 'Resposta pública:');
    if (!text) return null;
    const reply = {
      id: makeId(), text, private: privateReply, author: currentName(), authorRole: roleOf(profile),
      authorLabel: isBoss() ? 'BOSS' : roleLabel(roleOf(profile)), userId: uid(), createdAt: now()
    };
    topic.replies.push(reply);
    return reply;
  }

  function createDialog(id, className, markup) {
    let dialog = $(id);
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = className;
    dialog.innerHTML = markup;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function ensureEditDialog() {
    const options = Object.entries(ROOMS).filter(([key]) => key !== 'all').map(([key, label]) => `<option value="${key}">${esc(label)}</option>`).join('');
    const dialog = createDialog('forumEditDialog', 'forum-admin-dialog', `
      <form method="dialog" class="forum-admin-form">
        <div class="forum-admin-head"><div><small>MODERAÇÃO</small><h3>Editar tópico</h3></div><button type="button" class="forum-admin-close" aria-label="Fechar">×</button></div>
        <label>Sala<select id="forumEditCategory">${options}</select></label>
        <label>Título<input id="forumEditTitle" type="text" maxlength="60" required></label>
        <label>Mensagem<textarea id="forumEditDescription" maxlength="1000" rows="8" required></textarea></label>
        <p class="forum-admin-note" id="forumEditPrivateNote"></p>
        <div class="forum-admin-actions"><button type="button" class="secondary" data-dialog-cancel>Cancelar</button><button type="submit" class="primary">Guardar alterações</button></div>
      </form>`);
    dialog.querySelector('.forum-admin-close').onclick = () => dialog.close();
    dialog.querySelector('[data-dialog-cancel]').onclick = () => dialog.close();
    return dialog;
  }

  function editTopic(topic, data) {
    const dialog = ensureEditDialog();
    const category = dialog.querySelector('#forumEditCategory');
    const title = dialog.querySelector('#forumEditTitle');
    const description = dialog.querySelector('#forumEditDescription');
    const note = dialog.querySelector('#forumEditPrivateNote');
    const formEl = dialog.querySelector('form');

    category.value = topic.category || 'geral';
    title.value = topic.title || '';
    description.value = topic.description || '';
    const updateNote = () => {
      note.textContent = PRIVATE_ROOMS.has(category.value) ? 'Esta sala é privada: apenas o autor e a moderação podem ver o tópico.' : 'Esta sala é pública para a comunidade.';
      note.classList.toggle('is-private', PRIVATE_ROOMS.has(category.value));
    };
    updateNote();
    category.onchange = updateNote;
    formEl.onsubmit = event => {
      event.preventDefault();
      const nextTitle = title.value.trim();
      const nextDescription = description.value.trim();
      if (!nextTitle || !nextDescription) return;
      topic.title = nextTitle.slice(0, 60);
      topic.description = nextDescription.slice(0, 1000);
      topic.category = ROOMS[category.value] ? category.value : 'geral';
      topic.private = PRIVATE_ROOMS.has(topic.category);
      topic.editedAt = now();
      topic.editedBy = currentName();
      topic.editedByRole = isBoss() ? 'boss' : roleOf(profile);
      dialog.close();
      save(data, 'Tópico atualizado por completo.');
    };
    dialog.showModal();
    setTimeout(() => title.focus(), 30);
  }

  function ensureMoveDialog() {
    const options = Object.entries(ROOMS).filter(([key]) => key !== 'all').map(([key, label]) => `<option value="${key}">${esc(label)}</option>`).join('');
    const dialog = createDialog('forumMoveDialog', 'forum-admin-dialog forum-move-dialog', `
      <form method="dialog" class="forum-admin-form">
        <div class="forum-admin-head"><div><small>MODERAÇÃO</small><h3>Mover tópico</h3></div><button type="button" class="forum-admin-close" aria-label="Fechar">×</button></div>
        <label>Nova sala<select id="forumMoveCategory">${options}</select></label>
        <p class="forum-admin-note">O tópico será movido imediatamente para a sala selecionada.</p>
        <div class="forum-admin-actions"><button type="button" class="secondary" data-dialog-cancel>Cancelar</button><button type="submit" class="primary">Mover tópico</button></div>
      </form>`);
    dialog.querySelector('.forum-admin-close').onclick = () => dialog.close();
    dialog.querySelector('[data-dialog-cancel]').onclick = () => dialog.close();
    return dialog;
  }

  function moveTopic(topic, data) {
    const dialog = ensureMoveDialog();
    const category = dialog.querySelector('#forumMoveCategory');
    const formEl = dialog.querySelector('form');
    category.value = topic.category || 'geral';
    formEl.onsubmit = event => {
      event.preventDefault();
      const nextCategory = category.value;
      if (!ROOMS[nextCategory] || nextCategory === 'all') return;
      topic.category = nextCategory;
      topic.private = PRIVATE_ROOMS.has(nextCategory);
      room = nextCategory;
      dialog.close();
      save(data, 'Tópico movido.');
    };
    dialog.showModal();
    setTimeout(() => category.focus(), 30);
  }

  function bindActions(grid, data) {
    grid.querySelectorAll('[data-reaction]').forEach(button => {
      button.onclick = async () => {
        const cardEl = button.closest('[data-topic-id]');
        const id = cardEl?.dataset.topicId;
        const topic = (data.forum || []).find(item => item.id === id);
        if (!topic) return;
        topic.reactions = topic.reactions || { likes: [], dislikes: [], shares: 0 };
        topic.reactions.likes = Array.isArray(topic.reactions.likes) ? topic.reactions.likes : [];
        topic.reactions.dislikes = Array.isArray(topic.reactions.dislikes) ? topic.reactions.dislikes : [];
        if (button.dataset.reaction === 'share') return shareTopic(topic);
        if (!session) return showFeedback('Entra com o Google para reagir.', true);
        const me = uid();
        const own = button.dataset.reaction === 'like' ? topic.reactions.likes : topic.reactions.dislikes;
        const other = button.dataset.reaction === 'like' ? topic.reactions.dislikes : topic.reactions.likes;
        const index = own.indexOf(me);
        if (index >= 0) own.splice(index, 1); else {
          const otherIndex = other.indexOf(me);
          if (otherIndex >= 0) other.splice(otherIndex, 1);
          own.push(me);
          if (button.dataset.reaction === 'like' && topic.userId && topic.userId !== me) {
            window.TeamProgress?.thank?.(topic.userId, topic.id);
          }
        }
        save(data);
      };
    });
    grid.querySelectorAll('[data-action]').forEach(button => {
      button.onclick = () => {
        const cardEl = button.closest('[data-topic-id]');
        const id = cardEl.dataset.topicId;
        const pending = cardEl.dataset.pending === '1';
        const list = pending ? data.pendingForum : data.forum;
        const index = list.findIndex(topic => topic.id === id);
        if (index < 0) return;
        const topic = list[index];
        const action = button.dataset.action;

        if (action === 'approve') {
          list.splice(index, 1);
          topic.approved = true;
          topic.status = 'Aberto';
          data.forum.push(topic);
          setFilter('approved');
          return save(data, 'Tópico aprovado.');
        }
        if (action === 'reject') {
          if (confirm('Recusar este tópico?')) {
            list.splice(index, 1);
            save(data, 'Tópico recusado.');
          }
          return;
        }
        if (action === 'remove') {
          if (confirm('Remover este tópico definitivamente?')) {
            list.splice(index, 1);
            save(data, 'Tópico removido.');
          }
          return;
        }
        if (action === 'edit') return editTopic(topic, data);
        if (action === 'move') return moveTopic(topic, data);
        if (action === 'fix') {
          topic.fixed = !topic.fixed;
          return save(data, topic.fixed ? 'Tópico fixado.' : 'Tópico desfixado.');
        }
        if (action === 'close') {
          const closing = topic.status !== 'Fechado';
          topic.status = closing ? 'Fechado' : 'Aberto';
          setFilter(closing ? 'closed' : 'approved');
          return save(data, closing ? 'Tópico fechado.' : 'Tópico reaberto.');
        }
        if (action === 'reply' || action === 'private-reply') {
          const reply = addReply(topic, action === 'private-reply');
          if (reply) {
            save(data, action === 'private-reply' ? 'Resposta privada enviada.' : 'Resposta publicada.');
            if (action === 'reply') {
              window.TeamProgress?.event?.('forum_reply', `reply:${reply.id}`, { topic: topic.id, reply: reply.id })
                .then(result => { if (!result) console.warn('[TL Progress] resposta não contabilizada'); });
            }
          }
        }
      };
    });
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!session) return updateAuth();

    const title = $('topicTitle')?.value.trim().slice(0, 60) || '';
    const description = $('topicDescription')?.value.trim().slice(0, 280) || '';
    const category = $('topicCategory')?.value || 'geral';
    if (!title || !description) return showFeedback('Preenche o título e a descrição antes de enviar.', true);

    const data = getData();
    if (!data) return showFeedback('Não foi possível preparar o tópico agora.', true);
    data.forum = Array.isArray(data.forum) ? data.forum : [];
    data.pendingForum = Array.isArray(data.pendingForum) ? data.pendingForum : [];

    const topic = {
      id: makeId(), title, description, category, private: PRIVATE_ROOMS.has(category), author: currentName().slice(0, 40),
      authorRole: roleOf(profile), authorLabel: isBoss() ? 'BOSS' : roleLabel(roleOf(profile)), userId: uid(),
      status: 'Aberto', fixed: false, replies: [], createdAt: now()
    };

    if (canModerate()) {
      topic.approved = true;
      data.forum.push(topic);
      setFilter('approved');
      showFeedback('Tópico publicado.', false);
    } else {
      topic.approved = false;
      data.pendingForum.push(topic);
      showFeedback('Tópico enviado para aprovação.', false);
    }

    saveTeamData(data);
    window.TeamProgress?.event?.('forum_topic', `topic:${topic.id}`, { topic: topic.id, category: topic.category })
      .then(result => { if (!result) console.warn('[TL Progress] tópico não contabilizado'); });
    $('topicTitle').value = '';
    $('topicDescription').value = '';
    renderRooms();
    renderForumBoard();
  });

  $('forumTabs')?.querySelectorAll('[data-forum-filter]').forEach(button => {
    button.onclick = () => {
      setFilter(button.dataset.forumFilter);
      renderForumBoard();
    };
  });

  window.addEventListener('storage', () => {
    renderRooms();
    renderForumBoard();
  });
  sb.auth.onAuthStateChange(loadUser);
  loadUser();
})();
