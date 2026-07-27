(() => {
  const ranking = [
    { rank: 2, name: 'Raluxsz', role: 'ADMIN', roleClass: 'admin', level: 24, xp: 74, avatar: 'R' },
    { rank: 3, name: 'LariLambs', role: 'STAFF', roleClass: 'staff', level: 19, xp: 61, avatar: 'L' },
    { rank: 4, name: 'ModRafa', role: 'MOD', roleClass: 'mod', level: 17, xp: 48, avatar: 'M' },
    { rank: 5, name: 'LambretaBR', role: 'VIP III', roleClass: 'vip', level: 15, xp: 39, avatar: 'L' }
  ];

  const achievements = [
    { category: 'activity', icon: '⚡', title: 'Motor Ligado', description: 'Complete 10 horas de atividade real no site.', progress: 80, current: '8/10h' },
    { category: 'activity', icon: '☕', title: 'AFK Profissional', description: 'Acumule 30 minutos AFK e volte antes de ser dado como offline.', progress: 53, current: '16/30m' },
    { category: 'community', icon: '✎', title: 'Primeira Palavra', description: 'Publique o seu primeiro tópico no fórum.', progress: 100, current: 'Concluída' },
    { category: 'community', icon: '♥', title: 'Família Reconhece', description: 'Receba 25 agradecimentos em respostas e tópicos.', progress: 44, current: '11/25' },
    { category: 'events', icon: '⚑', title: 'Presença Confirmada', description: 'Participe de 5 eventos oficiais do Team.', progress: 60, current: '3/5' },
    { category: 'events', icon: '♛', title: 'No Pódio', description: 'Termine um evento entre os três primeiros colocados.', progress: 0, current: 'Bloqueada' },
    { category: 'special', icon: '★', title: 'Hall da Fama', description: 'Conquista especial entregue pela administração a quem marcou a história.', progress: 0, current: 'Especial' },
    { category: 'special', icon: '∞', title: 'Desde o Início', description: 'Selo destinado aos primeiros membros e apoiadores do projeto.', progress: 100, current: 'Concluída' }
  ];

  const rankingEl = document.getElementById('hallRankingList');
  const grid = document.getElementById('hallAchievementGrid');
  const modal = document.getElementById('hallModal');

  function renderRanking() {
    if (!rankingEl) return;
    rankingEl.innerHTML = ranking.map((item) => `
      <button type="button" class="hall-ranking-row" data-profile-name="${item.name}">
        <span class="hall-ranking-number">${String(item.rank).padStart(2, '0')}</span>
        <span class="hall-avatar">${item.avatar}</span>
        <span class="hall-ranking-user"><strong>${item.name}</strong><small>Nível ${item.level}</small></span>
        <span class="hall-role hall-role-${item.roleClass}">${item.role}</span>
        <span class="hall-mini-xp"><i style="--progress:${item.xp}%"></i></span>
      </button>
    `).join('');
  }

  function renderAchievements(filter = 'all') {
    if (!grid) return;
    const visible = achievements.filter((item) => filter === 'all' || item.category === filter);
    grid.innerHTML = visible.map((item) => `
      <button type="button" class="hall-achievement-card ${item.progress === 100 ? 'is-complete' : ''}" data-title="${item.title}" data-category="${item.category}" data-description="${item.description}" data-icon="${item.icon}">
        <span class="hall-achievement-icon">${item.icon}</span>
        <span class="hall-achievement-content"><small>${item.category}</small><strong>${item.title}</strong><p>${item.description}</p><span class="hall-achievement-progress"><i style="--progress:${item.progress}%"></i></span><em>${item.current}</em></span>
      </button>
    `).join('');
  }

  function openModal({ title, text, icon = '★', category = 'HALL DA FAMA' }) {
    if (!modal) return;
    document.getElementById('hallModalTitle').textContent = title;
    document.getElementById('hallModalText').textContent = text;
    document.getElementById('hallModalIcon').textContent = icon;
    document.getElementById('hallModalCategory').textContent = category.toUpperCase();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    window.setTimeout(() => { modal.hidden = true; }, 180);
  }

  document.getElementById('hallFilters')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    document.querySelectorAll('#hallFilters [data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderAchievements(button.dataset.filter);
  });

  grid?.addEventListener('click', (event) => {
    const card = event.target.closest('.hall-achievement-card');
    if (!card) return;
    openModal({ title: card.dataset.title, text: card.dataset.description, icon: card.dataset.icon, category: card.dataset.category });
  });

  document.getElementById('hallRankingInfo')?.addEventListener('click', () => openModal({
    title: 'Ranking do Hall',
    text: 'Nesta primeira versão o ranking é uma prévia visual. Depois ele será calculado com XP vindo do tempo ativo, fórum, eventos, lives e conquistas especiais, sem premiar apenas quem deixa a aba aberta.',
    icon: '♛',
    category: 'Ranking'
  }));

  modal?.addEventListener('click', (event) => { if (event.target.closest('[data-close-hall]')) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && !modal.hidden) closeModal(); });
  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

  renderRanking();
  renderAchievements();
})();
