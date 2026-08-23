(() => {
  'use strict';
  // Ponte de compatibilidade. O único controlador de presença é o shell V100.
  let current = localStorage.getItem('tl_presence_manual_v100') || 'online';
  window.addEventListener('tl:presence', event => { current = event.detail?.status || current; });
  window.TeamBuddyPresence = {
    setMode(mode) {
      const status = mode === 'ocupado' ? 'busy' : mode;
      document.querySelector(`[data-presence="${CSS.escape(status)}"]`)?.click();
      current = status;
      return Promise.resolve(status);
    },
    getMode: () => current
  };
})();
