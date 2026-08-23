(() => {
  'use strict';
  async function boot() {
    await window.TeamAuth?.ready;
    if (!await window.TeamPermissions?.can('moderator.panel')) return window.TeamPermissions?.require('moderator.panel');
    const role = window.TeamPermissions.getRole();
    document.getElementById('moderatorRole').textContent = window.TeamPermissions.roleLabel(role);
    document.getElementById('moderatorLoading').hidden = true;
    document.getElementById('moderatorContent').hidden = false;
  }
  boot().catch(error => { console.error('[MODERATOR]', error.message); });
})();
