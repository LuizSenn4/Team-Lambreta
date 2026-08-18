(() => {
  'use strict';

  if (document.getElementById('tl-streamer-image-frame-v1')) return;
  const style = document.createElement('style');
  style.id = 'tl-streamer-image-frame-v1';
  style.textContent = `
    .streamer-card-photo{
      position:relative!important;
      overflow:hidden!important;
      background:#080808!important;
      isolation:isolate;
    }
    .streamer-card-photo.has-photo::before{
      content:"";
      position:absolute;
      inset:-6%;
      background-image:var(--tl-streamer-photo);
      background-size:cover;
      background-position:center;
      background-repeat:no-repeat;
      filter:blur(18px) saturate(1.08) brightness(.72);
      transform:scale(1.08);
      opacity:.96;
      z-index:0;
    }
    .streamer-card-photo.has-photo::after{
      content:"";
      position:absolute;
      inset:0;
      background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.10));
      z-index:1;
      pointer-events:none;
    }
    .streamer-card-photo.has-photo>img{
      position:relative;
      z-index:2;
      width:100%!important;
      height:100%!important;
      object-fit:contain!important;
      object-position:center center!important;
      background:transparent!important;
      display:block!important;
    }
    .streamer-photo-preview-shell.has-photo{
      position:relative;
      overflow:hidden;
      background:#080808!important;
    }
    .streamer-photo-preview-shell.has-photo::before{
      content:"";
      position:absolute;
      inset:-8%;
      background-image:var(--tl-streamer-photo);
      background-size:cover;
      background-position:center;
      filter:blur(12px) brightness(.72);
      transform:scale(1.08);
      z-index:0;
    }
    .streamer-photo-preview-shell.has-photo #streamerPhotoPreview{
      position:relative!important;
      z-index:1!important;
      object-fit:contain!important;
      background:transparent!important;
    }
    .tl-photo-stable{opacity:0!important;transition:opacity .12s ease!important}
    .tl-photo-stable.is-ready{opacity:1!important}
  `;
  document.head.appendChild(style);

  function decorateStreamerPhotos(root = document) {
    root.querySelectorAll('.streamer-card-photo img, .streamer-photo-preview-shell #streamerPhotoPreview').forEach(img => {
      const parent = img.closest('.streamer-card-photo, .streamer-photo-preview-shell');
      if (!parent) return;
      const src = img.currentSrc || img.src;
      if (src) {
        parent.style.setProperty('--tl-streamer-photo', `url("${String(src).replace(/"/g, '\\"')}")`);
        parent.classList.add('has-photo');
      }
    });
  }

  function stabilizeProfilePhotos(root = document) {
    root.querySelectorAll('img').forEach(img => {
      const looksLikeProfile = img.matches('.sb-auth-bar img, .profile-avatar img, .profile-card img, .user-avatar img, [class*="profile"] img, [class*="avatar"] img');
      if (!looksLikeProfile || img.dataset.tlStableBound === '1') return;
      img.dataset.tlStableBound = '1';
      img.classList.add('tl-photo-stable');
      const ready = () => img.classList.add('is-ready');
      if (img.complete && img.naturalWidth > 0) ready();
      else {
        img.addEventListener('load', ready, { once:true });
        img.addEventListener('error', ready, { once:true });
      }
    });
  }

  const refresh = () => {
    decorateStreamerPhotos();
    stabilizeProfilePhotos();
  };

  refresh();
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });
  window.addEventListener('load', refresh, { once:true });
})();
