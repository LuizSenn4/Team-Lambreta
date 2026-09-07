(() => {
  'use strict';
  if (window.TeamGameProfilesV123) return;
  window.TeamGameProfilesV123 = true;

  const sb = window.teamSupabase;
  const root = document.getElementById('profileRoot');
  if (!sb || !root) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  const getViewedUserId = session => new URLSearchParams(location.search).get('user') || session?.user?.id || '';
  const slugFromCard = card => {
    const image = card?.querySelector('.p120-game-media img');
    const src = image?.getAttribute('src') || '';
    const match = src.match(/\/([^/?#]+)\.webp(?:[?#].*)?$/i);
    return match ? decodeURIComponent(match[1]) : '';
  };

  let state = null;
  let overlay = null;

  async function signedImage(path) {
    if (!path) return '';
    try {
      const { data, error } = await sb.storage.from('forum-avatars').createSignedUrl(path, 60 * 60);
      return error ? '' : data?.signedUrl || '';
    } catch { return ''; }
  }

  async function fetchGameProfile(userId, gameSlug) {
    try {
      const { data, error } = await sb.from('profile_game_profiles')
        .select('user_id,game_slug,nickname,character_path,character_external_url,position_x,position_y,scale')
        .eq('user_id', userId).eq('game_slug', gameSlug).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.warn('[Game profiles V123] Perfil de jogo ainda indisponível.', error);
      return null;
    }
  }

  async function resolveCharacter(row, profile) {
    if (row?.character_external_url) return row.character_external_url;
    if (row?.character_path) {
      const signed = await signedImage(row.character_path);
      if (signed) return signed;
    }
    return window.TeamProfiles?.getAvatarUrl?.(profile)
      || profile?.avatar_display_url || profile?.avatar_external_url
      || profile?.custom_avatar_url || profile?.avatar_url || '';
  }

  function initials(profile, nickname) {
    const source = String(nickname || profile?.display_name || profile?.forum_nickname || 'TL').trim();
    return esc((source || 'TL').slice(0, 2).toUpperCase());
  }

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('section');
    overlay.className = 'p123-game-profile';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="p123-game-shell" data-game-shell>
        <div class="p123-game-cover" data-game-cover></div>
        <header class="p123-game-head">
          <div class="p123-game-title"><small>PERFIL DE JOGO</small><h2 data-game-title>Jogo</h2></div>
          <button type="button" class="p123-game-close" data-game-close aria-label="Fechar">✕</button>
        </header>
        <div class="p123-game-stage" data-game-stage>
          <div class="p123-game-character" data-game-character>
            <span data-game-initials>TL</span>
          </div>
          <div class="p123-game-nick"><small>NICKNAME</small><strong data-game-nickname>—</strong></div>
          <div class="p123-game-own-actions" data-game-owner-actions hidden>
            <button type="button" class="p123-game-edit" data-game-edit>✎ Editar</button>
          </div>
          <div class="p123-game-editor" data-game-editor hidden>
            <label for="p123GameNick">Nickname deste jogo</label>
            <input id="p123GameNick" data-game-nick-input type="text" maxlength="32" autocomplete="off">
            <div class="p123-game-editor-row">
              <div><label for="p123GameImage">Foto / personagem deste jogo</label><input id="p123GameImage" data-game-file type="file" accept="image/jpeg,image/png,image/webp"></div>
              <button type="button" class="p123-game-save" data-game-save>Guardar</button>
            </div>
            <div class="p123-game-move" aria-label="Mover personagem">
              <button type="button" data-game-step="left" aria-label="Mover para esquerda">←</button>
              <button type="button" data-game-step="up" aria-label="Mover para cima">↑</button>
              <button type="button" data-game-step="down" aria-label="Mover para baixo">↓</button>
              <button type="button" data-game-step="right" aria-label="Mover para direita">→</button>
              <button type="button" data-game-step="smaller" aria-label="Diminuir personagem">−</button>
              <button type="button" data-game-step="larger" aria-label="Aumentar personagem">＋</button>
            </div>
            <div class="p123-game-feedback" data-game-feedback>Arrasta a foto diretamente para posicionar.</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    bindOverlay();
    return overlay;
  }

  function applyVisual() {
    if (!overlay || !state) return;
    const character = overlay.querySelector('[data-game-character]');
    character?.style.setProperty('--gx', `${state.x}%`);
    character?.style.setProperty('--gy', `${state.y}%`);
    character?.style.setProperty('--gs', String(state.scale / 100));
  }

  function renderCharacter(url, profile, nickname) {
    const character = overlay.querySelector('[data-game-character]');
    if (!character) return;
    character.innerHTML = url
      ? `<img src="${esc(url)}" alt="Personagem de ${esc(nickname || 'jogo')}" decoding="async">`
      : `<span data-game-initials>${initials(profile, nickname)}</span>`;
  }

  async function openGame(card) {
    const session = await window.TeamAuth?.getSession?.();
    if (!session?.user) return;
    const userId = getViewedUserId(session);
    const gameSlug = slugFromCard(card);
    if (!userId || !gameSlug) return;

    const profile = await window.TeamProfiles?.getPublicProfile?.(userId, { fresh:false });
    const row = await fetchGameProfile(userId, gameSlug);
    const title = card.querySelector('b')?.textContent?.trim() || gameSlug.replace(/[-_]/g, ' ');
    const fallbackNick = profile?.game_nickname_public || profile?.game_nickname || profile?.forum_nickname || profile?.display_name || '—';
    const nickname = row?.nickname || fallbackNick;
    const characterUrl = await resolveCharacter(row, profile);

    state = {
      userId, gameSlug, title, profile, own:userId === session.user.id,
      nickname, x:clamp(row?.position_x ?? 50, 0, 100),
      y:clamp(row?.position_y ?? 58, 0, 100),
      scale:clamp(row?.scale ?? 100, 55, 180),
      characterPath:row?.character_path || '', characterExternalUrl:row?.character_external_url || '',
      characterUrl, pendingFile:null
    };

    createOverlay();
    overlay.querySelector('[data-game-title]').textContent = title;
    overlay.querySelector('[data-game-cover]').style.backgroundImage = `url("assets/game-covers/${encodeURIComponent(gameSlug)}.webp")`;
    overlay.querySelector('[data-game-nickname]').textContent = nickname;
    overlay.querySelector('[data-game-nick-input]').value = nickname === '—' ? '' : nickname;
    overlay.querySelector('[data-game-owner-actions]').hidden = !state.own;
    overlay.querySelector('[data-game-editor]').hidden = true;
    renderCharacter(characterUrl, profile, nickname);
    applyVisual();
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function closeGame() {
    if (!overlay) return;
    overlay.hidden = true;
    document.documentElement.style.overflow = '';
    state = null;
  }

  function setFeedback(message, isError = false) {
    const node = overlay?.querySelector('[data-game-feedback]');
    if (!node) return;
    node.textContent = message;
    node.style.opacity = '1';
    node.dataset.error = isError ? '1' : '0';
  }

  async function uploadCharacter(file) {
    if (!(file instanceof Blob) || !file.size || !state?.own) return '';
    const type = String(file.type || '').toLowerCase();
    if (!['image/jpeg','image/png','image/webp'].includes(type)) throw new Error('Formato de imagem não suportado.');
    if (file.size > 4 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 4 MB.');
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${state.userId}/game-${state.gameSlug}-${Date.now()}.${extension}`;
    const { error } = await sb.storage.from('forum-avatars').upload(path, file, { cacheControl:'3600', upsert:false });
    if (error) throw error;
    return path;
  }

  async function saveGameProfile() {
    if (!state?.own) return;
    const save = overlay.querySelector('[data-game-save]');
    if (save) save.disabled = true;
    setFeedback('A guardar…');
    try {
      let characterPath = state.characterPath;
      if (state.pendingFile) characterPath = await uploadCharacter(state.pendingFile);
      const nickname = String(overlay.querySelector('[data-game-nick-input]')?.value || '').trim();
      const { data, error } = await sb.rpc('tl_save_profile_game', {
        p_game_slug:state.gameSlug,
        p_nickname:nickname,
        p_character_path:characterPath || null,
        p_character_external_url:state.characterExternalUrl || null,
        p_position_x:state.x,
        p_position_y:state.y,
        p_scale:state.scale
      });
      if (error) throw error;
      state.characterPath = data?.character_path || characterPath || '';
      state.nickname = data?.nickname || nickname || state.nickname;
      state.pendingFile = null;
      overlay.querySelector('[data-game-nickname]').textContent = state.nickname || '—';
      setFeedback('Guardado ✓');
    } catch (error) {
      console.error('[Game profiles V123 save]', error);
      setFeedback(error?.message || 'Não foi possível guardar.', true);
    } finally {
      if (save) save.disabled = false;
    }
  }

  function move(direction) {
    if (!state?.own) return;
    const step = 4;
    if (direction === 'left') state.x = clamp(state.x - step, 0, 100);
    if (direction === 'right') state.x = clamp(state.x + step, 0, 100);
    if (direction === 'up') state.y = clamp(state.y - step, 0, 100);
    if (direction === 'down') state.y = clamp(state.y + step, 0, 100);
    if (direction === 'smaller') state.scale = clamp(state.scale - 5, 55, 180);
    if (direction === 'larger') state.scale = clamp(state.scale + 5, 55, 180);
    applyVisual();
    setFeedback(`Posição ${state.x}% × ${state.y}% · tamanho ${state.scale}%`);
  }

  function bindOverlay() {
    overlay.querySelector('[data-game-close]')?.addEventListener('click', closeGame);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeGame(); });
    overlay.querySelector('[data-game-edit]')?.addEventListener('click', () => {
      const editor = overlay.querySelector('[data-game-editor]');
      if (editor) editor.hidden = !editor.hidden;
    });
    overlay.querySelectorAll('[data-game-step]').forEach(button => button.addEventListener('click', () => move(button.dataset.gameStep)));
    overlay.querySelector('[data-game-save]')?.addEventListener('click', saveGameProfile);
    overlay.querySelector('[data-game-file]')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file || !state?.own) return;
      state.pendingFile = file;
      const url = URL.createObjectURL(file);
      renderCharacter(url, state.profile, state.nickname);
      setFeedback('Imagem pronta. Ajusta a posição e toca em Guardar.');
    });

    const stage = overlay.querySelector('[data-game-stage]');
    let dragging = false;
    const setByPointer = event => {
      if (!dragging || !state?.own || overlay.querySelector('[data-game-editor]')?.hidden) return;
      const rect = stage.getBoundingClientRect();
      state.x = clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100, 0, 100);
      state.y = clamp(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100, 0, 100);
      applyVisual();
      setFeedback(`Posição ${state.x}% × ${state.y}% · tamanho ${state.scale}%`);
    };
    stage?.addEventListener('pointerdown', event => {
      if (!state?.own || overlay.querySelector('[data-game-editor]')?.hidden) return;
      dragging = true;
      stage.setPointerCapture?.(event.pointerId);
      setByPointer(event);
    });
    stage?.addEventListener('pointermove', setByPointer);
    const stop = event => {
      if (!dragging) return;
      dragging = false;
      try { stage.releasePointerCapture?.(event.pointerId); } catch {}
    };
    stage?.addEventListener('pointerup', stop);
    stage?.addEventListener('pointercancel', stop);
  }

  root.addEventListener('click', event => {
    const card = event.target.closest('.p120-game:not(.is-empty)');
    if (!card || !root.contains(card)) return;
    event.preventDefault();
    openGame(card).catch(error => console.error('[Game profiles V123 open]', error));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay && !overlay.hidden) closeGame();
  });
})();
