(() => {
  'use strict';
  if (window.__TL_PROFILE_SOCIAL_EDITOR_V106__) return;
  window.__TL_PROFILE_SOCIAL_EDITOR_V106__ = true;

  const TYPES = [
    ['tiktok', 'TikTok', 'https://www.tiktok.com/@...'],
    ['youtube', 'YouTube', 'https://www.youtube.com/@...'],
    ['twitch', 'Twitch', 'https://www.twitch.tv/...']
  ];
  const allowedUrl = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const normalize = profile => {
    const map = new Map(TYPES.map(([type]) => [type, '']));
    const raw = profile?.social_links;
    const rows = Array.isArray(raw) ? raw : (raw && typeof raw === 'object'
      ? Object.entries(raw).map(([type, value]) => typeof value === 'object' ? { type, ...value } : { type, url:value })
      : []);
    rows.forEach(item => {
      const type = String(item?.type || item?.platform || '').toLowerCase().replace(/[^a-z]/g, '');
      if (map.has(type)) map.set(type, allowedUrl(item?.url || item?.href));
    });
    return map;
  };
  const waitForForm = () => new Promise(resolve => {
    const existing = document.getElementById('profileForm');
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const form = document.getElementById('profileForm');
      if (!form) return;
      observer.disconnect(); resolve(form);
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  });

  async function install() {
    if (document.body.dataset.profileMode !== 'edit') return;
    const form = await waitForForm();
    const profile = await window.TeamProfiles?.getCurrentProfile?.({ fresh:true }).catch(() => null);
    const current = normalize(profile);
    const discordField = form.querySelector('[name="discord"]')?.closest('.profile-field-v102');
    const anchor = discordField || form.firstElementChild;
    const block = document.createElement('div');
    block.className = 'profile-field-v102';
    block.dataset.streamSocialFields = '1';
    block.innerHTML = `<span>Redes de stream</span><small>Apenas plataformas da comunidade: TikTok, YouTube e Twitch. Facebook/Instagram não são usados no perfil.</small>${TYPES.map(([type,label,placeholder]) => `<label style="display:grid;gap:6px;margin-top:10px"><b>${label}</b><input class="tl-v102-input" type="url" name="social_${type}" inputmode="url" autocomplete="url" placeholder="${placeholder}" value="${String(current.get(type) || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label>`).join('')}`;
    anchor.insertAdjacentElement('afterend', block);

    const originalUpdate = window.TeamProfiles?.updateProfile;
    if (typeof originalUpdate !== 'function' || originalUpdate.__tlStreamWrapped) return;
    const wrapped = async input => {
      const saved = await originalUpdate.call(window.TeamProfiles, input);
      const links = TYPES.map(([type,label]) => {
        const url = allowedUrl(form.elements[`social_${type}`]?.value);
        return url ? { type, label, url } : null;
      }).filter(Boolean);
      const session = await window.TeamAuth?.getSession?.();
      if (!session?.user?.id) throw new Error('Sessão inválida ao guardar redes de stream.');
      const result = await window.teamSupabase.from('profiles').update({ social_links:links }).eq('id', session.user.id);
      if (result.error) throw result.error;
      console.info('[TL Profile 106] OK · redes de stream guardadas', links.map(item => item.type));
      return window.TeamProfiles.getCurrentProfile({ fresh:true }).catch(() => saved);
    };
    wrapped.__tlStreamWrapped = true;
    window.TeamProfiles.updateProfile = wrapped;
    console.info('[TL Profile 106] OK · editor de TikTok/YouTube/Twitch instalado');
  }

  Promise.resolve(window.TeamAuth?.ready).then(install).catch(error => console.error('[TL Profile 106] editor social', error));
})();
