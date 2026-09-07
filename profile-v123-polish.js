(() => {
  'use strict';
  if (window.TeamProfilePolishV123) return;
  window.TeamProfilePolishV123 = true;

  const root = document.getElementById('profileRoot');
  if (!root) return;

  const OFFICIAL_COVERS = {
    fortnite: 'https://cdn2.unrealengine.com/ch5s2-br-1920-1920x1080-10f8b8d8327d.jpg',
    minecraft: 'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Homepage_Discover-our-games_MC-Vanilla-KeyArt_864x864.jpg'
  };

  const statusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>';

  function polishStatus(){
    const p = root.querySelector('.p120-identity > p');
    if (!p || p.dataset.p123StatusReady === '1') return;
    const value = p.textContent.trim();
    p.dataset.p123StatusReady = '1';
    p.classList.add('p123-status-bio');
    p.innerHTML = `<span class="p123-status-tag">${statusIcon}<span>STATUS</span></span><span class="p123-status-text"></span>`;
    const text = p.querySelector('.p123-status-text');
    if (text) text.textContent = value;
  }

  function slugFromCard(card){
    const img = card.querySelector('.p120-game-media img');
    const src = img?.getAttribute('data-game-slug') || img?.getAttribute('src') || '';
    const m = src.match(/\/([^/?#]+)\.webp(?:[?#].*)?$/i);
    if (m) return decodeURIComponent(m[1]).toLowerCase();
    const label = card.querySelector('b')?.textContent?.trim().toLowerCase() || '';
    if (label.includes('fortnite')) return 'fortnite';
    if (label.includes('minecraft')) return 'minecraft';
    return '';
  }

  function polishGameCovers(){
    root.querySelectorAll('.p120-game:not(.is-empty)').forEach(card => {
      const img = card.querySelector('.p120-game-media img');
      if (!img) return;
      const slug = slugFromCard(card);
      const official = OFFICIAL_COVERS[slug];
      if (!official) return;
      img.dataset.gameSlug = slug;
      if (img.getAttribute('src') !== official) img.setAttribute('src', official);
    });
  }

  function polish(){
    polishStatus();
    polishGameCovers();
  }

  new MutationObserver(polish).observe(root, { childList:true, subtree:true });
  polish();
})();
