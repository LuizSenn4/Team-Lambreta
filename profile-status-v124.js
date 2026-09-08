(() => {
  'use strict';
  if (window.TeamProfileStatusV124) return;
  window.TeamProfileStatusV124 = true;
  const root = document.getElementById('profileRoot');
  if (!root) return;
  const MAX = 72;
  let profile = null;
  let own = false;
  let saving = false;

  function flash(message, state) {
    let node = root.querySelector('.p124-status-feedback');
    if (!node) {
      node = document.createElement('span');
      node.className = 'p124-status-feedback';
      root.querySelector('.p120-hero')?.appendChild(node);
    }
    node.textContent = message;
    node.dataset.state = state;
    node.classList.remove('is-visible');
    requestAnimationFrame(() => node.classList.add('is-visible'));
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove('is-visible'), 2400);
  }

  function rawStatus(p) {
    return String(p?.public_bio || p?.bio || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX);
  }

  function payload(value) {
    return {
      nickname: profile?.forum_nickname || profile?.game_nickname || profile?.display_name || '',
      country: profile?.country || '',
      bio: value,
      discord: profile?.discord || '',
      avatarPath: profile?.avatar_path || null,
      avatarExternalUrl: profile?.avatar_external_url || null,
      games: Array.isArray(profile?.games) ? profile.games : [],
      platforms: Array.isArray(profile?.platforms) ? profile.platforms : [],
      gameModes: Array.isArray(profile?.game_modes) ? profile.game_modes : [],
      coverPreset: profile?.cover_preset || 'cover_green_black'
    };
  }

  function showValue(box, value) {
    const text = box.querySelector('.p123-status-text');
    if (text) text.textContent = value || (own ? 'Escreva um status…' : 'Comunidade Lambreta');
    box.classList.toggle('is-empty', !value);
  }

  async function save(box, input) {
    if (saving) return;
    const value = String(input?.value || '').replace(/\s+/g, ' ').trim().slice(0, MAX);
    saving = true;
    box.classList.add('is-saving');
    try {
      profile = await window.TeamProfiles.updateProfile(payload(value));
      box.classList.remove('is-editing');
      box.innerHTML = '<span class="p123-status-text"></span>';
      showValue(box, value);
      box.classList.add('is-saved');
      setTimeout(() => box.classList.remove('is-saved'), 700);
      flash('Status salvo ✓', 'success');
    } catch (error) {
      console.error('[PROFILE PRF-013]', error);
      window.TeamDiagnostics?.error?.('PRF-013', 'profile-status', 'Falha ao guardar status', {}, error);
      flash('Não foi possível salvar · PRF-013', 'error');
      input?.focus();
    } finally {
      saving = false;
      box.classList.remove('is-saving');
    }
  }

  function openEditor(box) {
    if (!own || saving || box.classList.contains('is-editing')) return;
    const current = rawStatus(profile);
    box.classList.add('is-editing');
    box.innerHTML = '<input class="p124-status-input" type="text" maxlength="72" aria-label="Escreva um status"><button class="p124-status-confirm" type="button" aria-label="Guardar status">✓</button>';
    const input = box.querySelector('input');
    const confirm = box.querySelector('button');
    input.value = current;
    input.focus();
    input.select();
    confirm.addEventListener('pointerdown', event => { event.preventDefault(); void save(box, input); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); void save(box, input); }
      if (event.key === 'Escape') { box.classList.remove('is-editing'); box.innerHTML='<span class="p123-status-text"></span>'; showValue(box, current); }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (box.classList.contains('is-editing') && !saving) void save(box, input); }, 80), { once:true });
  }

  async function bind() {
    const box = root.querySelector('.p120-identity > p.p123-status-bio');
    if (!box || box.dataset.p124Bound === '1') return;
    const session = await window.TeamAuth?.getSession?.();
    if (!session?.user) return;
    const viewed = new URLSearchParams(location.search).get('user') || session.user.id;
    own = viewed === session.user.id;
    profile = await window.TeamProfiles?.getPublicProfile?.(viewed, { fresh:true });
    box.querySelector('.p123-status-tag')?.remove();
    box.dataset.p124Bound = '1';
    showValue(box, rawStatus(profile));
    if (own) {
      box.classList.add('is-own');
      box.tabIndex = 0;
      box.setAttribute('role', 'button');
      box.setAttribute('aria-label', 'Editar status');
      box.addEventListener('click', event => { if (!event.target.closest('input,button')) openEditor(box); });
      box.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && !box.classList.contains('is-editing')) { event.preventDefault(); openEditor(box); } });
    }
  }

  new MutationObserver(() => void bind()).observe(root, { childList:true, subtree:true });
  Promise.resolve(window.TeamAuth?.ready).then(bind).catch(error => console.error('[PROFILE PRF-013 init]', error));
})();