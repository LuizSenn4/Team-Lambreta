(() => {
  'use strict';
  if (window.__TL_SHELL_V114__) return;
  const script = document.createElement('script');
  script.src = 'tl-shell-v114.js?v=114.1';
  script.defer = false;
  script.dataset.tlLegacyBridge = 'v113';
  document.head.appendChild(script);
})();
