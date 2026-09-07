(() => {
  'use strict';
  if (window.TeamProfileEditV118Position) return;
  window.TeamProfileEditV118Position = true;

  const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 72)));
  let currentX = 72;
  let saving = false;
  let pendingSave = null;

  const setPreview = value => {
    currentX = clamp(value);
    const preview = document.getElementById('profileEditPreview');
    const range = document.getElementById('profileCoverPositionRange');
    const valueNode = document.getElementById('profileCoverPositionValue');
    preview?.style.setProperty('--edit-cover-x', `${currentX}%`);
    if (range) range.value = String(currentX);
    if (valueNode) valueNode.textContent = `${currentX}%`;
  };

  const persist = async () => {
    if (saving) {
      pendingSave = currentX;
      return;
    }
    saving = true;
    const value = currentX;
    try {
      const result = await window.teamSupabase?.rpc?.('tl_set_profile_cover_position', { p_x:value });
      if (result?.error) throw result.error;
      document.getElementById('profileEditFeedback')?.classList.remove('is-error');
    } catch (error) {
      console.error('[Profile cover position]', error);
      const feedback = document.getElementById('profileEditFeedback');
      if (feedback) {
        feedback.textContent = 'Não foi possível guardar a posição da capa.';
        feedback.className = 'tl-profile-edit-v117__feedback is-error';
      }
    } finally {
      saving = false;
      if (pendingSave !== null) {
        pendingSave = null;
        persist();
      }
    }
  };

  function mountControls(profile) {
    const form = document.getElementById('profileEditForm');
    const preview = document.getElementById('profileEditPreview');
    const coverPreview = preview?.querySelector('.tl-profile-edit-v117__preview-cover');
    if (!form || !preview || !coverPreview || document.getElementById('profileCoverPositionRange')) return false;

    currentX = clamp(profile?.cover_position_x ?? 72);
    preview.style.setProperty('--edit-cover-x', `${currentX}%`);

    const coverRadio = form.querySelector('[name="cover"]');
    const coverField = coverRadio?.closest('.tl-profile-edit-v117__field');
    const field = document.createElement('div');
    field.className = 'tl-profile-edit-v117__field tl-profile-edit-v118__cover-position';
    field.innerHTML = `<span>Posição da capa</span><small>Arrasta a imagem no preview ou usa &lt; &gt; para enquadrar.</small><div class="tl-profile-edit-v118__cover-controls"><button type="button" data-cover-step="-5" aria-label="Mover capa para a esquerda">‹</button><input id="profileCoverPositionRange" type="range" min="0" max="100" step="1" value="${currentX}" aria-label="Posição horizontal da capa"><button type="button" data-cover-step="5" aria-label="Mover capa para a direita">›</button></div><div id="profileCoverPositionValue" class="tl-profile-edit-v118__cover-value">${currentX}%</div>`;
    coverField?.insertAdjacentElement('afterend', field) || form.appendChild(field);

    field.querySelectorAll('[data-cover-step]').forEach(button => {
      button.addEventListener('click', () => {
        setPreview(currentX + Number(button.dataset.coverStep || 0));
        persist();
      });
    });

    field.querySelector('input[type="range"]')?.addEventListener('input', event => setPreview(event.target.value));
    field.querySelector('input[type="range"]')?.addEventListener('change', persist);

    let dragStartX = 0;
    let dragStartValue = currentX;
    let dragging = false;
    coverPreview.addEventListener('pointerdown', event => {
      dragging = true;
      dragStartX = event.clientX;
      dragStartValue = currentX;
      coverPreview.classList.add('is-dragging');
      coverPreview.setPointerCapture?.(event.pointerId);
    });
    coverPreview.addEventListener('pointermove', event => {
      if (!dragging) return;
      const width = Math.max(1, coverPreview.clientWidth);
      const delta = (dragStartX - event.clientX) / width * 100;
      setPreview(dragStartValue + delta);
    });
    const stopDrag = event => {
      if (!dragging) return;
      dragging = false;
      coverPreview.classList.remove('is-dragging');
      try { coverPreview.releasePointerCapture?.(event.pointerId); } catch {}
      persist();
    };
    coverPreview.addEventListener('pointerup', stopDrag);
    coverPreview.addEventListener('pointercancel', stopDrag);

    form.addEventListener('change', event => {
      if (event.target?.name === 'cover') {
        setPreview(72);
        persist();
      }
    });

    return true;
  }

  async function init() {
    try {
      const profile = await window.TeamProfiles?.getCurrentProfile?.({ fresh:true });
      const attempt = () => {
        if (mountControls(profile)) return;
        setTimeout(attempt, 80);
      };
      attempt();
    } catch (error) {
      console.error('[Profile edit V118 position]', error);
    }
  }

  Promise.resolve(window.TeamAuth?.ready).then(init);
})();
