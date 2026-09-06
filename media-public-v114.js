(() => {
  'use strict';
  const grid = document.getElementById('mediaGrid');
  if (!grid) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const youtubeId = value => {
    try {
      const url = new URL(String(value || ''), location.href);
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0] || '';
      if (url.hostname.includes('youtube.com')) {
        if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || '';
        return url.searchParams.get('v') || '';
      }
    } catch {}
    return '';
  };

  const items = typeof window.getTeamData === 'function'
    ? (window.getTeamData().media || [])
    : [];

  if (!items.length) {
    grid.innerHTML = '<article class="empty-card safe-card"><h3>Nenhuma mídia ainda</h3><p>Conteúdo ainda não cadastrado no admin.</p></article>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const type = String(item.type || 'photo').toLowerCase();
    const title = String(item.title || 'Mídia');
    const description = String(item.description || '');
    const direct = String(item.link || item.image || '');
    const yt = youtubeId(direct);
    let media = '';

    if (type === 'video') {
      if (yt) media = `<iframe src="https://www.youtube.com/embed/${esc(yt)}" title="${esc(title)}" loading="lazy" allowfullscreen></iframe>`;
      else if (direct) media = `<video controls preload="metadata"${item.image ? ` poster="${esc(item.image)}"` : ''}><source src="${esc(direct)}"></video>`;
      else media = '<div class="media-placeholder">VIDEO</div>';
    } else {
      media = item.image ? `<img src="${esc(item.image)}" alt="${esc(title)}" loading="lazy">` : '<div class="media-placeholder">PHOTO</div>';
    }

    return `<article class="media-card ${type === 'video' ? 'video' : 'photo'}">${media}<h3>${esc(title)}</h3><p>${esc(description)}</p></article>`;
  }).join('');
})();
