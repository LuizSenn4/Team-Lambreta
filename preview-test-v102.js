(() => {
  'use strict';
  if (!/git-v102-unified-site/i.test(location.hostname)) return;
  document.documentElement.dataset.previewMode = '1';

  function patchAccount() {
    const copy = document.querySelector('.tl-account-copy');
    if (copy) {
      const strong = copy.querySelector('strong');
      const small = copy.querySelector('small');
      if (strong) strong.textContent = 'Preview DEV';
      if (small) small.textContent = 'DEV';
    }
    const menu = document.querySelector('.tl-account-menu');
    if (menu && menu.dataset.previewPatched !== '1') {
      menu.dataset.previewPatched = '1';
      menu.innerHTML = '<a href="forum.html">Ver perfil</a><a href="profile-edit-v102.html">Editar perfil</a><a href="admin-v102.html">Painel administrativo</a><a href="home.html">Home</a>';
    }
  }

  patchAccount();
  window.addEventListener('tl:shell-ready', patchAccount);
  window.addEventListener('tl:v102-ready', patchAccount);
  new MutationObserver(patchAccount).observe(document.documentElement, { subtree:true, childList:true });
})();