(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sb = window.teamSupabase;
  const form = $('profileEditForm');
  const card = $('profileEditorCard');
  const loading = $('profileEditLoading');
  const feedback = $('profileEditFeedback');
  const saveButton = $('profileSaveButton');
  const avatarPreview = $('profileAvatarPreview');
  let session = null;

  const splitList = value => String(value || '').split(',').map(v => v.trim()).filter(Boolean).slice(0, 8);
  const first = arr => Array.isArray(arr) && arr.length ? arr[0] : '';
  const cleanUrl = value => {
    const v = String(value || '').trim();
    if (!v) return '';
    try { const u = new URL(v); return u.protocol === 'https:' ? v : ''; } catch (_) { return ''; }
  };

  function paintAvatar(url, name) {
    avatarPreview.innerHTML = '';
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Avatar de ${name || 'membro'}`;
      img.onerror = () => { avatarPreview.textContent = String(name || 'TL').slice(0,2).toUpperCase(); };
      avatarPreview.appendChild(img);
    } else avatarPreview.textContent = String(name || 'TL').slice(0,2).toUpperCase();
  }

  async function boot() {
    if (!sb || !window.TeamAuth) return showError('Núcleo V102 indisponível.');
    await window.TeamAuth.ready;
    session = await window.TeamAuth.getSession();
    if (!session?.user?.id) {
      location.replace('home.html');
      return;
    }
    const uid = session.user.id;
    $('profileViewLink').href = `forum.html?profile=${encodeURIComponent(uid)}`;
    const [{ data: profile, error: pErr }, { data: fp, error: fErr }] = await Promise.all([
      sb.from('profiles').select('game_nickname,game_nickname_public,full_name,public_bio,custom_avatar_url,avatar_url,main_game').eq('id', uid).maybeSingle(),
      sb.from('forum_profiles').select('*').eq('user_id', uid).maybeSingle()
    ]);
    if (pErr || fErr) return showError(pErr?.message || fErr?.message || 'Falha ao carregar perfil.');

    const nickname = fp?.forum_nickname || profile?.game_nickname_public || profile?.game_nickname || profile?.full_name || '';
    const avatar = fp?.avatar_external_url || profile?.custom_avatar_url || profile?.avatar_url || session.user.user_metadata?.avatar_url || '';
    $('profileNickname').value = nickname;
    $('profileCountry').value = fp?.country || '';
    $('profileMainGame').value = fp?.main_game || profile?.main_game || '';
    $('profilePlatform').value = fp?.platform || first(fp?.platforms) || '';
    $('profileModes').value = (fp?.game_modes || []).join(', ') || fp?.preferred_mode || '';
    $('profileGames').value = (fp?.games || []).join(', ') || fp?.main_game || profile?.main_game || '';
    $('profileDiscord').value = fp?.discord || '';
    $('profileBio').value = fp?.bio || profile?.public_bio || '';
    $('profileAvatarUrl').value = avatar;
    paintAvatar(avatar, nickname);
    loading.hidden = true;
    card.hidden = false;
  }

  function showError(message) {
    loading.hidden = true;
    card.hidden = false;
    feedback.className = 'profile-edit-feedback is-error';
    feedback.textContent = message;
  }

  $('profileAvatarUrl')?.addEventListener('input', () => paintAvatar(cleanUrl($('profileAvatarUrl').value), $('profileNickname').value));
  $('profileNickname')?.addEventListener('input', () => paintAvatar(cleanUrl($('profileAvatarUrl').value), $('profileNickname').value));

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!session?.user?.id) return;
    const uid = session.user.id;
    const nickname = $('profileNickname').value.trim();
    if (nickname.length < 3) return showError('O nick precisa ter pelo menos 3 caracteres.');

    const avatar = cleanUrl($('profileAvatarUrl').value);
    const country = $('profileCountry').value.trim();
    const mainGame = $('profileMainGame').value.trim();
    const platforms = splitList($('profilePlatform').value);
    const games = splitList($('profileGames').value);
    const modes = splitList($('profileModes').value);
    const bio = $('profileBio').value.trim();
    const discord = $('profileDiscord').value.trim();

    saveButton.disabled = true;
    feedback.className = 'profile-edit-feedback';
    feedback.textContent = 'A guardar…';

    const [baseResult, forumResult] = await Promise.all([
      sb.from('profiles').update({
        game_nickname_public: nickname,
        public_bio: bio || null,
        custom_avatar_url: avatar || null,
        main_game: mainGame || null,
        updated_at: new Date().toISOString()
      }).eq('id', uid),
      sb.from('forum_profiles').upsert({
        user_id: uid,
        forum_nickname: nickname,
        avatar_external_url: avatar || null,
        country: country || '',
        main_game: mainGame || first(games) || '',
        platform: first(platforms) || '',
        preferred_mode: first(modes) || '',
        bio: bio || '',
        discord: discord || '',
        games: games.length ? games : (mainGame ? [mainGame] : []),
        platforms,
        game_modes: modes,
        cover_preset: 'default',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
    ]);

    saveButton.disabled = false;
    const error = baseResult.error || forumResult.error;
    if (error) return showError(error.message || 'Não foi possível guardar.');
    feedback.className = 'profile-edit-feedback is-ok';
    feedback.textContent = 'Perfil guardado ✓';
    document.dispatchEvent(new CustomEvent('tl:profile-updated'));
    setTimeout(() => { location.href = `forum.html?profile=${encodeURIComponent(uid)}`; }, 650);
  });

  boot().catch(error => showError(error?.message || String(error)));
})();