(() => {
  'use strict';
  const sb = window.teamSupabase;
  const grid = document.getElementById('teamRosterGrid');
  const pager = document.getElementById('teamRosterPager');
  const count = document.getElementById('teamMemberCount');
  if (!sb || !grid) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roles = value => String(value || 'MEMBRO').split(/[|,;/]+/).map(v => v.trim().toUpperCase()).filter(Boolean);
  const roleMarkup = value => `<span class="team-role-badges is-compact">${roles(value).map(role => `<span class="team-role-badge role-${esc(role.toLowerCase())}">${esc(role)}</span>`).join('')}</span>`;
  const country = value => ({brasil:['🇧🇷','BR'],portugal:['🇵🇹','PT'],espanha:['🇪🇸','ES'],'polónia':['🇵🇱','PL'],polonia:['🇵🇱','PL'],holanda:['🇳🇱','NL'],netherlands:['🇳🇱','NL']}[String(value || '').trim().toLowerCase()] || ['🌍','--']);
  const avatar = row => row.image_url ? `<img src="${esc(row.image_url)}" alt="${esc(row.nickname || row.name || 'Membro')}" loading="lazy">` : `<span>${esc(String(row.nickname || row.name || 'L').charAt(0).toUpperCase())}</span>`;

  let members = [];
  let page = 1;
  const PAGE_SIZE = 10;

  function card(row, index) {
    const name = row.nickname || row.name || 'Membro';
    const [flag, code] = country(row.country);
    return `<button type="button" class="team-roster-card tone-${index % 2 ? 'red' : 'green'}" data-member="${index}">
      <span class="team-roster-accent"></span><span class="team-roster-avatar">${avatar(row)}</span>
      <span class="team-roster-copy"><strong>${esc(name)}</strong>${roleMarkup(row.role)}<em>${flag} ${code}</em></span>
      <span class="team-roster-plus">＋</span></button>`;
  }

  function openProfile(row) {
    let modal = document.getElementById('teamProfileModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'teamProfileModal';
      modal.className = 'team-esports-modal';
      document.body.appendChild(modal);
    }
    const [flag, code] = country(row.country);
    modal.innerHTML = `<div class="team-esports-backdrop" data-close></div><article class="team-esports-profile" role="dialog" aria-modal="true">
      <div class="team-profile-mobile-hero"><div class="team-esports-profile-photo">${avatar(row)}</div><button class="team-esports-close" type="button" data-close>×</button></div>
      <div class="team-esports-profile-copy"><p class="tag">PERFIL OFICIAL</p><h2>${esc(row.nickname || row.name || 'Membro')}</h2>${roleMarkup(row.role)}
      <div class="team-esports-facts"><div><small>País</small><strong>${flag} ${esc(row.country || code)}</strong></div>${row.age ? `<div><small>Idade</small><strong>${esc(row.age)} anos</strong></div>` : ''}${row.main_game ? `<div><small>Jogo</small><strong>${esc(row.main_game)}</strong></div>` : ''}</div>
      <section class="team-profile-section"><small>Sobre</small><p class="team-esports-bio">${esc(row.bio || 'Perfil oficial do Team Lambreta.')}</p></section></div></article>`;
    const close = () => { modal.hidden = true; document.body.classList.remove('team-modal-open'); };
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
    modal.hidden = false;
    document.body.classList.add('team-modal-open');
  }

  function render() {
    const pages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    if (page > pages) page = pages;
    const start = (page - 1) * PAGE_SIZE;
    const rows = members.slice(start, start + PAGE_SIZE);
    grid.innerHTML = rows.length ? rows.map((row, i) => card(row, start + i)).join('') : '<article class="team-esports-empty"><h2>Nenhum perfil publicado</h2></article>';
    grid.querySelectorAll('[data-member]').forEach(btn => btn.addEventListener('click', () => openProfile(members[Number(btn.dataset.member)])));
    if (!pager) return;
    pager.hidden = pages <= 1;
    pager.innerHTML = pages <= 1 ? '' : Array.from({length:pages},(_,i)=>i+1).map(n=>`<button type="button" class="${n===page?'is-active':''}" data-page="${n}">${n}</button>`).join('');
    pager.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => { page = Number(btn.dataset.page); render(); }));
  }

  async function load() {
    const { data, error } = await sb.from('team_members').select('*').eq('is_published', true).eq('is_archived', false).order('is_featured',{ascending:false}).order('display_order').order('created_at');
    if (error) { grid.innerHTML = `<article class="team-esports-empty"><h2>Não foi possível carregar o Team</h2><p>${esc(error.message)}</p></article>`; return; }
    members = data || [];
    if (count) count.textContent = String(members.length);
    render();
  }

  let refreshTimer;
  const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(load, 150); };
  sb.channel('team-public-v102').on('postgres_changes',{event:'*',schema:'public',table:'team_members'}, refresh).subscribe();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();