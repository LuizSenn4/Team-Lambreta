(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const coverAssets = { cover_gold:'assets/profile-covers/cover-gold.png', cover_green_black:'assets/profile-covers/cover-green-black.png', cover_neon:'assets/profile-covers/cover-neon.png', cover_lambretta_classic:'assets/profile-covers/cover-lambretta-classic.png', cover_competitive:'assets/profile-covers/cover-competitive.png', cover_cyber_gamer:'assets/profile-covers/cover-cyber-gamer.png', cover_minimal:'assets/profile-covers/cover-minimal.png' };
  const platformLabels = { pc:'PC', 'playstation-5':'PlayStation 5', 'playstation-4':'PlayStation 4', 'xbox-series':'Xbox Series', 'xbox-one':'Xbox One', 'nintendo-switch':'Nintendo Switch', 'nintendo-switch-2':'Nintendo Switch 2', android:'Android', ios:'iOS', 'cloud-gaming':'Cloud Gaming' };
  const root = $('#profileRoot');
  if (!root) return;

  const avatar = profile => profile.avatar_display_url ? `<img class="profile-avatar-v102" src="${esc(profile.avatar_display_url)}" alt="Avatar de ${esc(profile.display_name)}">` : `<span class="profile-avatar-v102 profile-avatar-fallback-v102">${esc(profile.avatar_fallback)}</span>`;
  const list = (items, map = value => value) => items?.length ? items.map(map).join(' · ') : '—';
  const fact = (title, value) => `<div class="profile-fact-v102"><dt>${esc(title)}</dt><dd>${value}</dd></div>`;

  async function renderPublic() {
    const session = await window.TeamAuth.getSession();
    const userId = new URLSearchParams(location.search).get('user') || session?.user?.id;
    if (!userId) {
      root.innerHTML = '<section class="tl-v102-card profile-login-v102"><h1>Perfil Team Lambreta</h1><p>Inicia sessão para veres o teu perfil.</p><button class="tl-v102-button primary" data-profile-login>Entrar com Google</button></section>';
      $('[data-profile-login]').onclick = () => window.TeamAuth.signInWithGoogle(); return;
    }
    try {
      const [profile, stats, catalog] = await Promise.all([window.TeamProfiles.getPublicProfile(userId), window.TeamProfiles.getProfileStats(userId), window.TeamProfiles.getCatalog()]);
      if (!profile) throw new Error('Perfil não encontrado.');
      const games = new Map(catalog.games.map(game => [game.slug, game.name]));
      const country = window.TeamCountryCatalog?.byCode.get(profile.country);
      const own = session?.user?.id === userId;
      root.innerHTML = `<section class="profile-hero-v102" style="background-image:url('${esc(coverAssets[profile.cover_preset] || coverAssets.cover_green_black)}')"><div class="profile-identity-v102">${avatar(profile)}<div><small>PERFIL TEAM LAMBRETA</small><h1>${esc(profile.display_name)}</h1><span class="profile-role-v102">${esc(window.TeamPermissions.roleLabel(profile.role))}</span></div></div></section>
        <div class="profile-grid-v102"><article class="tl-v102-card"><h2>Sobre</h2><p>${esc(profile.bio || profile.public_bio || 'Este membro ainda não escreveu uma bio.')}</p><dl class="profile-facts-v102">${fact('País', country ? `${country.flag} ${esc(country.name)}` : '—')}${fact('Discord', esc(profile.discord || '—'))}${fact('Jogos', esc(list(profile.games, slug => games.get(slug) || slug)))}${fact('Plataformas', esc(list(profile.platforms, slug => platformLabels[slug] || slug)))}${fact('Modos', esc(list(profile.game_modes, mode => mode.split('::')[1] || mode)))}${fact('Membro desde', stats.memberSince ? new Date(stats.memberSince).toLocaleDateString('pt-PT') : '—')}</dl>${own ? '<p><a class="tl-v102-button primary" href="profile-edit.html">Editar perfil</a></p>' : `<p><a class="tl-v102-button primary" href="buddy.html?user=${encodeURIComponent(userId)}">Abrir no Buddy</a></p>`}</article><aside class="tl-v102-card profile-stats-v102"><h2>Comunidade</h2><div class="profile-stat-grid-v102"><div><strong>${stats.topics}</strong><span>Tópicos</span></div><div><strong>${stats.replies}</strong><span>Respostas</span></div><div><strong>${stats.xp}</strong><span>XP</span></div><div><strong>${stats.level}</strong><span>Nível</span></div></div></aside></div>`;
    } catch (error) { root.innerHTML = `<div class="tl-v102-card tl-v102-empty"><h1>Perfil indisponível</h1><p>${esc(error.message)}</p></div>`; }
  }

  async function renderEditor() {
    const session = await window.TeamAuth.getSession();
    if (!session?.user) {
      root.innerHTML = '<section class="tl-v102-card profile-login-v102"><h1>Editar perfil</h1><p>Inicia sessão para continuares.</p><button class="tl-v102-button primary" data-profile-login>Entrar com Google</button></section>';
      $('[data-profile-login]').onclick = () => window.TeamAuth.signInWithGoogle(); return;
    }
    const [profile, catalog] = await Promise.all([window.TeamProfiles.getCurrentProfile({ fresh: true }), window.TeamProfiles.getCatalog()]);
    const selectedGames = new Set(profile?.games || []), selectedPlatforms = new Set(profile?.platforms || []), selectedModes = new Set(profile?.game_modes || []);
    root.innerHTML = `<div class="tl-page-heading"><small>MINHA CONTA</small><h1>Editar perfil</h1><p>Esta identidade será utilizada no header, Buddy, Fórum e restantes áreas da Team Lambreta.</p></div><div class="profile-editor-v102"><form id="profileForm" class="tl-v102-card profile-form-v102">
      <label class="profile-field-v102"><span>Nickname</span><input class="tl-v102-input" name="nickname" minlength="3" maxlength="32" required value="${esc(profile?.forum_nickname || profile?.game_nickname || '')}"></label>
      <label class="profile-field-v102"><span>País</span><input class="tl-v102-input" id="profileCountrySearch" type="search" placeholder="Pesquisar país…" value="${esc(window.TeamCountryCatalog?.byCode.get(profile?.country)?.name || '')}"><input type="hidden" name="country" value="${esc(profile?.country || '')}"><div id="profileCountryList" class="profile-choice-list" hidden></div></label>
      <label class="profile-field-v102"><span>Bio</span><textarea class="tl-v102-input" name="bio" rows="5" maxlength="500">${esc(profile?.bio || '')}</textarea></label>
      <label class="profile-field-v102"><span>Discord</span><input class="tl-v102-input" name="discord" maxlength="64" value="${esc(profile?.discord || '')}"></label>
      <div class="profile-field-v102"><span>Avatar</span><input class="tl-v102-input" name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><input class="tl-v102-input" name="avatarUrl" type="url" placeholder="Ou URL externa https://…" value="${esc(profile?.avatar_external_url || '')}"><small>O upload tem prioridade sobre a URL. Máximo 2 MB.</small></div>
      <div class="profile-field-v102"><span>Jogos — máximo 3</span><input class="tl-v102-input" type="search" data-filter-list="games" placeholder="Pesquisar jogo…"><div class="profile-choice-list" data-choice-list="games">${catalog.games.map(game => `<label data-search="${esc(`${game.name} ${(game.aliases || []).join(' ')}`.toLowerCase())}"><input type="checkbox" name="games" value="${esc(game.slug)}" ${selectedGames.has(game.slug) ? 'checked' : ''}><span>${esc(game.name)}</span></label>`).join('')}</div></div>
      <div class="profile-field-v102"><span>Plataformas</span><input class="tl-v102-input" type="search" data-filter-list="platforms" placeholder="Pesquisar plataforma…"><div class="profile-choice-list" data-choice-list="platforms">${catalog.platforms.map(item => `<label data-search="${esc(item.name.toLowerCase())}"><input type="checkbox" name="platforms" value="${esc(item.slug)}" ${selectedPlatforms.has(item.slug) ? 'checked' : ''}><span>${esc(item.name)}</span></label>`).join('')}</div></div>
      <div class="profile-field-v102"><span>Modos</span><input class="tl-v102-input" type="search" data-filter-list="modes" placeholder="Pesquisar modo…"><div class="profile-choice-list" data-choice-list="modes"></div></div>
      <div class="profile-field-v102"><span>Capa</span><div class="profile-cover-options">${Object.entries(coverAssets).map(([id, path]) => `<label style="--cover:url('${path}')"><input type="radio" name="cover" value="${id}" ${profile?.cover_preset === id || (!profile?.cover_preset && id === 'cover_green_black') ? 'checked' : ''}><span class="sr-only">${id}</span></label>`).join('')}</div></div>
      <div class="profile-actions-v102"><button class="tl-v102-button primary" type="submit">Guardar alterações</button><a class="tl-v102-button" href="profile.html?user=${encodeURIComponent(session.user.id)}">Cancelar</a></div><div id="profileFeedback" class="profile-feedback-v102" aria-live="polite"></div>
      </form><aside class="tl-v102-card profile-preview-v102"><h2>Preview</h2><div id="profilePreviewAvatar">${avatar(profile || { display_name:'TL', avatar_fallback:'TL' })}</div><h3 id="profilePreviewName">${esc(profile?.display_name || 'Membro')}</h3><span class="profile-role-v102">${esc(window.TeamPermissions.roleLabel(profile?.role))}</span><p>O avatar guardado é a identidade principal. O avatar Google fica apenas como fallback.</p></aside></div>`;
    const form = $('#profileForm'), feedback = $('#profileFeedback');
    function renderModes() {
      const activeGames = [...form.querySelectorAll('[name="games"]:checked')].map(input => input.value);
      const choices = catalog.games.filter(game => activeGames.includes(game.slug)).flatMap(game => (game.modes || []).map(mode => ({ value:`${game.slug}::${mode}`, label:`${game.name} — ${mode}` })));
      form.querySelector('[data-choice-list="modes"]').innerHTML = choices.map(item => `<label data-search="${esc(item.label.toLowerCase())}"><input type="checkbox" name="modes" value="${esc(item.value)}" ${selectedModes.has(item.value) ? 'checked' : ''}><span>${esc(item.label)}</span></label>`).join('') || '<p class="tl-v102-empty">Seleciona primeiro um jogo.</p>';
    }
    renderModes();
    form.addEventListener('change', event => {
      if (event.target.name === 'games') { const checked = form.querySelectorAll('[name="games"]:checked'); if (checked.length > 3) { event.target.checked = false; feedback.textContent = 'Podes selecionar no máximo três jogos.'; feedback.className = 'profile-feedback-v102 is-error'; } renderModes(); }
      if (event.target.name === 'avatarFile' && event.target.files[0]) { const url = URL.createObjectURL(event.target.files[0]); $('#profilePreviewAvatar').innerHTML = `<img class="profile-upload-preview" src="${url}" alt="Preview do avatar">`; }
    });
    form.querySelector('[name="nickname"]').addEventListener('input', event => { $('#profilePreviewName').textContent = event.target.value || 'Membro'; });
    form.querySelectorAll('[data-filter-list]').forEach(input => input.addEventListener('input', () => { const needle = input.value.trim().toLowerCase(); form.querySelectorAll(`[data-choice-list="${input.dataset.filterList}"] label`).forEach(label => label.hidden = !label.dataset.search.includes(needle)); }));
    $('#profileCountrySearch').addEventListener('input', event => { const box = $('#profileCountryList'), matches = window.TeamCountryCatalog.search(event.target.value); box.hidden = !matches.length; box.innerHTML = matches.map(country => `<button type="button" data-country="${country.code}">${country.flag} ${esc(country.name)}</button>`).join(''); box.querySelectorAll('[data-country]').forEach(button => button.onclick = () => { form.elements.country.value = button.dataset.country; event.target.value = window.TeamCountryCatalog.byCode.get(button.dataset.country).name; box.hidden = true; }); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); feedback.textContent = 'A guardar…'; feedback.className = 'profile-feedback-v102';
      try {
        const data = new FormData(form), file = form.elements.avatarFile.files[0];
        const avatarPath = file ? await window.TeamProfiles.uploadAvatar(file) : profile?.avatar_path || null;
        const saved = await window.TeamProfiles.updateProfile({ nickname:data.get('nickname'), country:data.get('country'), bio:data.get('bio'), discord:data.get('discord'), avatarPath, avatarExternalUrl:file ? null : data.get('avatarUrl'), games:data.getAll('games'), platforms:data.getAll('platforms'), gameModes:data.getAll('modes'), coverPreset:data.get('cover') });
        feedback.textContent = 'Perfil atualizado com sucesso.'; feedback.className = 'profile-feedback-v102 is-success'; window.TeamShell?.refresh();
        setTimeout(() => location.href = `profile.html?user=${encodeURIComponent(saved.id)}`, 600);
      } catch (error) { feedback.textContent = error.message || 'Não foi possível guardar o perfil.'; feedback.className = 'profile-feedback-v102 is-error'; }
    });
  }
  window.TeamAuth.ready.then(() => document.body.dataset.profileMode === 'edit' ? renderEditor() : renderPublic());
})();
