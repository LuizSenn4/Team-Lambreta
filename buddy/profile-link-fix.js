(() => {
  'use strict';
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-view-profile]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = button.dataset.viewProfile;
    if (id) window.location.href = `forum.html?profile=${encodeURIComponent(id)}`;
  }, true);
})();