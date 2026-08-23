(() => {
  'use strict';
  // LEGACY TEMPORÁRIO — remover quando não existirem links forum.html?profile=.
  const params = new URLSearchParams(location.search);
  const userId = params.get('profile');
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return;
  const target = new URL('profile.html', location.href);
  target.searchParams.set('user', userId);
  location.replace(target.href);
})();
