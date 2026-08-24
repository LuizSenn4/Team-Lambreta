(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const coverAssets = { cover_gold:'assets/profile-covers/cover-gold.png', cover_green_black:'assets/profile-covers/cover-green-black.png', cover_neon:'assets/profile-covers/cover-neon.png', cover_lambretta_classic:'assets/profile-covers/cover-lambretta-classic.png', cover_competitive:'assets/profile-covers/cover-competitive.png', cover_cyber_gamer:'assets/profile-covers/cover-cyber-gamer.png', cover_minimal:'assets/profile-covers/cover-minimal.png' };
  const platformLabels = { pc:'PC', 'playstation-5':'PlayStation 5', 'playstation-4':'PlayStation 4', 'xbox-series':'Xbox Series', 'xbox-one':'Xbox One', 'nintendo-switch':'Nintendo Switch', 'nintendo-switch-2':'Nintendo Switch 2', android:'Android', ios:'iOS', 'cloud-gaming':'Cloud Gaming' };
  const root = $('#profileRoot');
  if (!root) return;

  const avatarSource = profile => window.TeamProfiles?.getAvatarUrl(profile) || profile?.avatar_display_url || '';
  const avatar = profile => avatarSource(profile) ? `<img class="profile-avatar-v102" src="${esc(avatarSource(profile))}" alt="Avatar de ${esc(profile.display_name)}">` : `<span class="profile-avatar-v102 profile-avatar-fallback-v102">${esc(profile.avatar_fallback || 'TL')}</span>`;
  const visualRoles = profile => window.TeamPermissions?.getVisualRoles(profile) || [];
  const roleDisplayLabel = role => role.key === 'developer' ? 'DEV' : role.label;
  const roleBadges = profile => visualRoles(profile).map((role, index) => `<span class="profile-role-badge-v102${index === 0 ? ' is-primary' : ''}" style="--role-color:${esc(role.color)}">${role.icon}<b>${esc(roleDisplayLabel(role))}</b></span>`).join('');
  const rolePresentation = profile => { const roles = visualRoles(profile); return { roles, primary:roles[0] || { color:'#f4f7fa' } }; };
  const presenceState = profile => ['online','busy','away'].includes(String(profile?.presence || '').toLowerCase()) ? String(profile.presence).toLowerCase() : 'offline';
  const presenceLabel = state => ({ online:'Online', busy:'Ocupado', away:'Ausente', offline:'Offline' }[state] || 'Offline');
  const identityActions = (profile, userId) => { const state = presenceState(profile); return `<span class="profile-presence-v102" aria-label="Status: ${presenceLabel(state)}"><i class="tl-presence-dot ${state}"></i><b>${presenceLabel(state)}</b></span><a class="profile-buddy-v102" href="buddy.html?user=${encodeURIComponent(userId)}" aria-label="Abrir ${esc(profile.display_name)} no Buddy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9.8 9.8 0 0 1-4-.8L3 21l1.7-4.4A8.2 8.2 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.5 8.5 8.5 0 0 1 9 8.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></a>`; };
  const notify = (message, type = 'info', code = '') => window.TeamNotifications?.show?.(message, { type, code });
  const errorCode = error => /^PRF-\d{3}$/.test(error?.code || '') ? error.code : 'PRF-007';
  const showFailure = (feedback, message, error) => {
    const code = errorCode(error);
    feedback.textContent = `${message} Código: ${code}`;
    feedback.className = 'profile-feedback-v102 is-error';
    notify(message, 'error', code);
    console.error(`[PROFILE ${code}]`, { message:error?.message || String(error || '') });
  };
  const list = (items, map = value => value) => items?.length ? items.map(map).join(' · ') : '—';
  const profileIcons = {
    country:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5 7-12a7 7 0 1 0-14 0c0 7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    discord:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7a14 14 0 0 1 8 0l2 3 1 7a15 15 0 0 1-4 2l-1-2a9 9 0 0 1-4 0l-1 2a15 15 0 0 1-4-2l1-7 2-3Z"/><circle cx="9.5" cy="12.5" r="1"/><circle cx="14.5" cy="12.5" r="1"/></svg>',
    games:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1 2.8a2.2 2.2 0 0 1-3.7.8L14.5 17h-5L8 18.3a2.2 2.2 0 0 1-3.7-.8l-1-2.8A5 5 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M16 12h.01M18 15h.01"/></svg>',
    platforms:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    modes:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
    topics:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 9h8M8 12h5"/></svg>',
    replies:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 20l2-5a8 8 0 1 1 16-4Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>',
    star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
    edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z"/><path d="m13.8 7 3.2 3.2"/></svg>'
  };
  const fact = (title, value, icon, tone = '') => `<div class="profile-fact-v102${tone ? ` is-${tone}` : ''}"><span class="profile-fact-icon-v102">${profileIcons[icon]}</span><dt>${esc(title)}</dt><dd>${value}</dd></div>`;

  async function renderPublic() {
    const session = await window.TeamAuth.getSession();
    const userId = new URLSearchParams(location.search).get('user') || session?.user?.id;
    if (!userId) {
      root.innerHTML = '<section class="tl-v102-card profile-login-v102"><h1>Perfil Team Lambreta</h1><p>Inicia sessão para veres o teu perfil.</p><button class="tl-v102-button primary" data-profile-login>Entrar com Google</button></section>';
      $('[data-profile-login]').onclick = () => window.TeamAuth.signInWithGoogle(); return;
    }
    if (!session?.user) {
      root.innerHTML = '<section class="tl-v102-card profile-login-v102"><h1>Perfil Team Lambreta</h1><p>Inicia sessão para veres este perfil.</p><button class="tl-v102-button primary" data-profile-login>Entrar com Google</button></section>';
      $('[data-profile-login]').onclick = () => window.TeamAuth.signInWithGoogle(); return;
    }
    try {
      const [profile, stats, catalog] = await Promise.all([
        window.TeamProfiles.getPublicProfile(userId),
        window.TeamProfiles.getProfileStats(userId),
        window.TeamProfiles.getCatalog().catch(() => ({ games:[], platforms:[] }))
      ]);
      if (!profile) throw Object.assign(new Error('Perfil não encontrado.'), { code:'PRF-009' });
      const games = new Map(catalog.games.map(game => [game.slug, game.name]));
      const country = window.TeamCountryCatalog?.resolve(profile.country);
      const own = session?.user?.id === userId;
      const presentation = rolePresentation(profile);
      root.innerHTML = `<section class="profile-hero-v102" style="--profile-cover:url('${esc(coverAssets[profile.cover_preset] || coverAssets.cover_lambretta_classic)}');--profile-role-color:${esc(presentation.primary.color)}"><div class="profile-identity-v102">${avatar(profile)}<div class="profile-identity-copy-v102"><div class="profile-identity-head-v102"><h1>${esc(profile.display_name)}</h1>${identityActions(profile, userId)}</div><div class="profile-role-list-v102">${roleBadges(profile)}</div></div></div></section>
        <div class="profile-grid-v102"><article class="tl-v102-card profile-about-v102"><h2>Sobre</h2><p class="profile-bio-v102">${esc(profile.bio || profile.public_bio || 'Este membro ainda não escreveu uma bio.')}</p><dl class="profile-facts-v102">${fact('País', country ? `${country.flag} ${esc(country.name)}` : '—','country','country')}${fact('Discord', esc(profile.discord || '—'),'discord')}${fact('Jogos', esc(list(profile.games, slug => games.get(slug) || slug)),'games')}${fact('Plataformas', esc(list(profile.platforms, slug => platformLabels[slug] || slug)),'platforms')}${fact('Modos', esc(list(profile.game_modes, mode => mode.split('::')[1] || mode)),'modes')}${fact('Membro desde', stats.memberSince ? new Date(stats.memberSince).toLocaleDateString('pt-PT') : '—','calendar')}</dl>${own ? `<p class="profile-about-action-v102"><a class="tl-v102-button primary" href="profile-edit.html">${profileIcons.edit}<span>Editar perfil</span></a></p>` : `<p class="profile-about-action-v102"><a class="tl-v102-button primary" href="buddy.html?user=${encodeURIComponent(userId)}">Abrir no Buddy</a></p>`}</article><aside class="tl-v102-card profile-stats-v102"><h2>Comunidade</h2><div class="profile-stat-grid-v102"><div class="is-topics"><span class="profile-stat-icon-v102">${profileIcons.topics}</span><strong>${stats.topics}</strong><span>Tópicos</span></div><div class="is-replies"><span class="profile-stat-icon-v102">${profileIcons.replies}</span><strong>${stats.replies}</strong><span>Respostas</span></div><div class="is-xp"><span class="profile-stat-icon-v102 is-xp-mark">XP</span><strong>${stats.xp}</strong><span>XP</span></div><div class="is-level"><span class="profile-stat-icon-v102">${profileIcons.star}</span><strong>${stats.level}</strong><span>Nível</span></div></div></aside></div>`;
    } catch (error) {
      if (!session?.user && (error?.code === '42501' || /permission denied/i.test(error?.message || ''))) {
        root.innerHTML = '<section class="tl-v102-card profile-login-v102"><h1>Perfil Team Lambreta</h1><p>Inicia sessão para veres este perfil.</p><button class="tl-v102-button primary" data-profile-login>Entrar com Google</button></section>';
        $('[data-profile-login]').onclick = () => window.TeamAuth.signInWithGoogle();
        return;
      }
      const code = error?.code === 'PRF-009' ? 'PRF-009' : 'PRF-010'; root.innerHTML = `<div class="tl-v102-card tl-v102-empty"><h1>Perfil indisponível</h1><p>Não foi possível carregar o perfil.<br><small>Código: ${code}</small></p></div>`; console.error(`[PROFILE ${code}]`, { message:error?.message || String(error) });
    }
  }

  async function renderEditor() {
    const session = await window.TeamAuth.getSession();
    if (!session?.user) {
      root.innerHTML = '<section class="tl-v102-card profile-login-v102"><h1>Editar perfil</h1><p>Inicia sessão para continuares.</p><button class="tl-v102-button primary" data-profile-login>Entrar com Google</button></section>';
      $('[data-profile-login]').onclick = () => window.TeamAuth.signInWithGoogle(); return;
    }
    let [profile, catalog] = await Promise.all([window.TeamProfiles.getCurrentProfile({ fresh: true }), window.TeamProfiles.getCatalog()]);
    if (!profile) throw Object.assign(new Error('Perfil não encontrado.'), { code:'PRF-009' });
    const selectedGames = new Set(profile?.games || []), selectedPlatforms = new Set(profile?.platforms || []), selectedModes = new Set(profile?.game_modes || []);
    const presentation = rolePresentation(profile);
    root.innerHTML = `<div class="tl-page-heading"><small>MINHA CONTA</small><h1>Editar perfil</h1><p>Esta identidade será utilizada no header, Buddy, Fórum e restantes áreas da Team Lambreta.</p></div><div class="profile-editor-v102"><form id="profileForm" class="tl-v102-card profile-form-v102">
      <label class="profile-field-v102"><span>Nickname</span><input class="tl-v102-input" name="nickname" minlength="3" maxlength="32" required value="${esc(profile?.forum_nickname || profile?.game_nickname || '')}"></label>
      <div class="profile-field-v102"><label for="profileCountrySearch">País</label><div class="profile-country-combobox"><input class="tl-v102-input" id="profileCountrySearch" type="search" role="combobox" aria-autocomplete="list" aria-controls="profileCountryList" aria-expanded="false" autocomplete="off" placeholder="Pesquisar por sigla ou país…" value="${esc(window.TeamCountryCatalog?.resolve(profile?.country)?.name || profile?.country || '')}"><input type="hidden" name="country" value="${esc(window.TeamCountryCatalog?.resolve(profile?.country)?.code || profile?.country || '')}"><div id="profileCountryList" class="profile-country-list" role="listbox" hidden></div></div><small>Pesquisa por sigla, nome em português, inglês ou nome comum.</small></div>
      <label class="profile-field-v102"><span>Bio</span><textarea class="tl-v102-input" name="bio" rows="5" maxlength="500">${esc(profile?.bio || '')}</textarea></label>
      <label class="profile-field-v102"><span>Discord</span><input class="tl-v102-input" name="discord" maxlength="64" value="${esc(profile?.discord || '')}"></label>
      <div class="profile-field-v102"><span>Avatar</span><input class="tl-v102-input" name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp"><input class="tl-v102-input" name="avatarUrl" type="url" placeholder="Ou URL externa https://…" value="${esc(profile?.avatar_external_url || '')}"><small>JPG, PNG ou WEBP. Imagens grandes são otimizadas automaticamente até 2 MB.</small></div>
      <div class="profile-field-v102"><span>Jogos — máximo 3</span><input class="tl-v102-input" type="search" data-filter-list="games" placeholder="Pesquisar jogo…"><div class="profile-choice-list" data-choice-list="games">${catalog.games.map(game => `<label data-search="${esc(`${game.name} ${(game.aliases || []).join(' ')}`.toLowerCase())}"><input type="checkbox" name="games" value="${esc(game.slug)}" ${selectedGames.has(game.slug) ? 'checked' : ''}><span>${esc(game.name)}</span></label>`).join('')}</div></div>
      <div class="profile-field-v102"><span>Plataformas</span><input class="tl-v102-input" type="search" data-filter-list="platforms" placeholder="Pesquisar plataforma…"><div class="profile-choice-list" data-choice-list="platforms">${catalog.platforms.map(item => `<label data-search="${esc(item.name.toLowerCase())}"><input type="checkbox" name="platforms" value="${esc(item.slug)}" ${selectedPlatforms.has(item.slug) ? 'checked' : ''}><span>${esc(item.name)}</span></label>`).join('')}</div></div>
      <div class="profile-field-v102"><span>Modos</span><input class="tl-v102-input" type="search" data-filter-list="modes" placeholder="Pesquisar modo…"><div class="profile-choice-list" data-choice-list="modes"></div></div>
      <div class="profile-field-v102"><span>Capa</span><div class="profile-cover-options">${Object.entries(coverAssets).map(([id, path]) => `<label style="--cover:url('${path}')"><input type="radio" name="cover" value="${id}" ${profile?.cover_preset === id || (!profile?.cover_preset && id === 'cover_green_black') ? 'checked' : ''}><span class="sr-only">${id}</span></label>`).join('')}</div></div>
      <div class="profile-actions-v102"><button class="tl-v102-button primary" type="submit">Guardar alterações</button><a class="tl-v102-button" href="profile.html?user=${encodeURIComponent(session.user.id)}">Cancelar</a></div><div id="profileFeedback" class="profile-feedback-v102" aria-live="polite"></div>
      </form><aside class="tl-v102-card profile-preview-v102" style="--profile-role-color:${esc(presentation.primary.color)};--profile-cover:url('${esc(coverAssets[profile.cover_preset] || coverAssets.cover_lambretta_classic)}')"><div class="profile-preview-frame"><div id="profilePreviewAvatar">${avatar(profile)}</div></div><div class="profile-preview-copy"><div class="profile-preview-head"><h3 id="profilePreviewName">${esc(profile?.display_name || 'Membro')}</h3>${identityActions(profile, session.user.id)}</div><div id="profilePreviewRoles" class="profile-role-list-v102">${roleBadges(profile)}</div></div></aside></div>`;
    const form = $('#profileForm'), feedback = $('#profileFeedback');
    let previewObjectUrl = '';
    const setFeedback = (message, state = '') => { feedback.textContent = message; feedback.className = `profile-feedback-v102${state ? ` is-${state}` : ''}`; };
    const formInput = avatarPath => { const data = new FormData(form); return { nickname:data.get('nickname'), country:data.get('country'), bio:data.get('bio'), discord:data.get('discord'), avatarPath:avatarPath ?? profile?.avatar_path ?? null, avatarExternalUrl:data.get('avatarUrl'), games:data.getAll('games'), platforms:data.getAll('platforms'), gameModes:data.getAll('modes'), coverPreset:data.get('cover') }; };
    const paintPersistedAvatar = () => { $('#profilePreviewAvatar').innerHTML = avatar(profile); };
    const paintPreparedAvatar = prepared => {
      try {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = URL.createObjectURL(prepared);
        $('#profilePreviewAvatar').innerHTML = `<img class="profile-avatar-v102 profile-upload-preview" src="${esc(previewObjectUrl)}" alt="Preview do avatar processado">`;
      } catch (error) { throw Object.assign(error, { code:'PRF-011' }); }
    };
    function renderModes() {
      const activeGames = [...form.querySelectorAll('[name="games"]:checked')].map(input => input.value);
      const choices = catalog.games.filter(game => activeGames.includes(game.slug)).flatMap(game => (game.modes || []).map(mode => ({ value:`${game.slug}::${mode}`, label:`${game.name} — ${mode}` })));
      form.querySelector('[data-choice-list="modes"]').innerHTML = choices.map(item => `<label data-search="${esc(item.label.toLowerCase())}"><input type="checkbox" name="modes" value="${esc(item.value)}" ${selectedModes.has(item.value) ? 'checked' : ''}><span>${esc(item.label)}</span></label>`).join('') || '<p class="tl-v102-empty">Seleciona primeiro um jogo.</p>';
    }
    renderModes();
    form.addEventListener('change', async event => {
      if (event.target.name === 'games') { const checked = form.querySelectorAll('[name="games"]:checked'); if (checked.length > 3) { event.target.checked = false; feedback.textContent = 'Podes selecionar no máximo três jogos.'; feedback.className = 'profile-feedback-v102 is-error'; } renderModes(); }
      if (event.target.name === 'avatarFile' && event.target.files[0]) {
        const input = event.target; input.disabled = true;
        try {
          const result = await window.TeamProfiles.saveAvatar(input.files[0], formInput(), {
            onStage:stage => setFeedback(stage === 'processing' ? 'Preparando imagem...' : stage === 'uploading' ? 'Enviando imagem...' : 'Avatar atualizado com sucesso ✓', stage === 'saved' ? 'success' : ''),
            onPrepared:paintPreparedAvatar
          });
          profile = result.profile;
          form.elements.avatarUrl.value = '';
          input.value = '';
          setFeedback('Avatar atualizado com sucesso ✓', 'success');
          notify('Avatar atualizado com sucesso ✓', 'success');
          window.TeamShell?.refresh();
        } catch (error) {
          paintPersistedAvatar();
          showFailure(feedback, 'Não foi possível atualizar o avatar.', error);
        } finally { input.disabled = false; }
      }
    });
    form.querySelector('[name="nickname"]').addEventListener('input', event => { $('#profilePreviewName').textContent = event.target.value || 'Membro'; });
    form.querySelectorAll('[name="cover"]').forEach(input => input.addEventListener('change', () => { if (input.checked) $('.profile-preview-v102').style.setProperty('--profile-cover', `url('${coverAssets[input.value]}')`); }));
    form.querySelectorAll('[data-filter-list]').forEach(input => input.addEventListener('input', () => { const needle = input.value.trim().toLowerCase(); form.querySelectorAll(`[data-choice-list="${input.dataset.filterList}"] label`).forEach(label => label.hidden = !label.dataset.search.includes(needle)); }));
    const countryInput = $('#profileCountrySearch'), countryList = $('#profileCountryList');
    let countryMatches = [], countryActiveIndex = -1;
    const closeCountryList = () => { countryList.hidden = true; countryInput.setAttribute('aria-expanded', 'false'); countryInput.removeAttribute('aria-activedescendant'); countryActiveIndex = -1; };
    const paintCountryActive = () => { countryList.querySelectorAll('[role="option"]').forEach((option, index) => { const active = index === countryActiveIndex; option.classList.toggle('is-active', active); option.setAttribute('aria-selected', String(active)); if (active) { countryInput.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block:'nearest' }); } }); };
    const chooseCountry = country => { countryInput.value = country.name; form.elements.country.value = country.code; closeCountryList(); countryInput.focus(); };
    const openCountryList = (showAll = false) => {
      const selected = window.TeamCountryCatalog.resolve(form.elements.country.value);
      countryMatches = window.TeamCountryCatalog.search(showAll ? '' : countryInput.value, 18);
      if (showAll && selected) countryMatches = [selected, ...countryMatches.filter(country => country.code !== selected.code)].slice(0, 18);
      countryActiveIndex = Math.max(0, countryMatches.findIndex(country => country.code === selected?.code));
      countryList.innerHTML = countryMatches.map(country => `<button id="profileCountry-${country.code}" type="button" role="option" data-country="${country.code}" aria-selected="false"><span class="profile-country-flag" aria-hidden="true">${country.flag}</span><b>${country.code}</b><i aria-hidden="true">—</i><span>${esc(country.name)}</span></button>`).join('');
      countryList.hidden = !countryMatches.length; countryInput.setAttribute('aria-expanded', String(Boolean(countryMatches.length)));
      countryList.querySelectorAll('[data-country]').forEach(button => button.addEventListener('pointerdown', event => { event.preventDefault(); chooseCountry(window.TeamCountryCatalog.byCode.get(button.dataset.country)); }));
      paintCountryActive();
    };
    countryInput.addEventListener('focus', () => openCountryList(true));
    countryInput.addEventListener('input', () => { form.elements.country.value = ''; openCountryList(); });
    countryInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeCountryList(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (countryList.hidden) openCountryList(true); else { const direction = event.key === 'ArrowDown' ? 1 : -1; countryActiveIndex = (countryActiveIndex + direction + countryMatches.length) % countryMatches.length; paintCountryActive(); } return; }
      if (event.key === 'Enter' && !countryList.hidden && countryMatches[countryActiveIndex]) { event.preventDefault(); chooseCountry(countryMatches[countryActiveIndex]); }
    });
    document.addEventListener('pointerdown', event => { if (!event.target.closest('.profile-country-combobox')) closeCountryList(); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); setFeedback('A guardar…');
      try {
        const saved = await window.TeamProfiles.updateProfile(formInput());
        profile = saved;
        setFeedback('Salvo com sucesso! ✓', 'success'); notify('Salvo com sucesso! ✓', 'success'); window.TeamShell?.refresh();
        setTimeout(() => location.href = `profile.html?user=${encodeURIComponent(saved.id)}`, 600);
      } catch (error) { showFailure(feedback, 'Não foi possível guardar a alteração.', error); }
    });
  }
  window.TeamAuth.ready.then(async () => {
    try { await (document.body.dataset.profileMode === 'edit' ? renderEditor() : renderPublic()); }
    catch (error) {
      const code = error?.code === 'PRF-009' ? 'PRF-009' : errorCode(error) === 'PRF-007' ? 'PRF-010' : errorCode(error);
      root.innerHTML = `<div class="tl-v102-card tl-v102-empty"><h1>Editor indisponível</h1><p>Não foi possível carregar o perfil.<br><small>Código: ${code}</small></p></div>`;
      notify('Não foi possível carregar o perfil.', 'error', code);
      console.error(`[PROFILE ${code}]`, { message:error?.message || String(error) });
    }
  });
})();
