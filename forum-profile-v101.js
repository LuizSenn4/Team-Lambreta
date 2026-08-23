(() => {
  'use strict';
  if (window.__TL_FORUM_PROFILE_V101__) return;
  window.__TL_FORUM_PROFILE_V101__ = true;

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function ensureSearchInput(containerId, inputId, placeholder) {
    const box = document.getElementById(containerId);
    if (!box || document.getElementById(inputId)) return null;
    const input = document.createElement('input');
    input.id = inputId;
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = placeholder;
    input.className = 'forum-profile-option-search';
    box.parentNode.insertBefore(input, box);
    return input;
  }

  function filterOptions(input, container) {
    if (!input || !container) return;
    const query = normalize(input.value);
    [...container.children].forEach(node => {
      const label = normalize(node.textContent);
      node.hidden = Boolean(query && !label.includes(query));
    });
  }

  function wireFilter(input, container) {
    if (!input || !container || input.dataset.filterReady === '1') return;
    input.dataset.filterReady = '1';
    input.addEventListener('input', () => filterOptions(input, container));
    new MutationObserver(() => filterOptions(input, container)).observe(container, { childList:true, subtree:true, characterData:true });
  }

  function enhanceEditor() {
    const form = document.getElementById('forumProfileForm');
    if (!form) return;
    form.classList.add('forum-profile-form-v101');

    const platformBox = document.getElementById('forumPlatformOptions');
    const modeBox = document.getElementById('forumModeOptions');
    const platformInput = ensureSearchInput('forumPlatformOptions', 'forumPlatformSearch', 'Pesquisar plataforma...');
    const modeInput = ensureSearchInput('forumModeOptions', 'forumModeSearch', 'Pesquisar modo...');
    wireFilter(platformInput, platformBox);
    wireFilter(modeInput, modeBox);

    document.getElementById('forumGamesPicker')?.classList.add('forum-profile-list-picker');
    platformBox?.closest('fieldset')?.classList.add('forum-profile-list-picker');
    modeBox?.closest('fieldset')?.classList.add('forum-profile-list-picker');
  }

  function cleanEditFlag() {
    const url = new URL(location.href);
    url.searchParams.delete('edit');
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  async function openEditRoute() {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') !== '1') return;
    const target = params.get('profile');
    if (!target) { cleanEditFlag(); return; }

    let session = null;
    for (let i = 0; i < 40; i += 1) {
      const sb = window.teamSupabase;
      if (sb) {
        try {
          const result = await sb.auth.getSession();
          session = result.data?.session || null;
          if (session) break;
        } catch (_) {}
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!session?.user?.id || session.user.id !== target) {
      cleanEditFlag();
      return;
    }

    for (let i = 0; i < 80; i += 1) {
      const button = document.querySelector('[data-edit-profile]');
      if (button) {
        cleanEditFlag();
        button.click();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn('[PROFILE V101] editor não ficou disponível a tempo.');
  }

  function boot() {
    enhanceEditor();
    const dialog = document.getElementById('forumProfileDialog');
    if (dialog) new MutationObserver(enhanceEditor).observe(dialog, { childList:true, subtree:true });
    openEditRoute();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
