(() => {
  'use strict';
  if (window.TeamAuth) return;
  const client = window.teamSupabase;
  const listeners = new Set();
  const TEST_MODE = /git-v102-unified-site/i.test(window.location.hostname);
  const TEST_SESSION = TEST_MODE ? {
    user: {
      id: '00000000-0000-4000-8000-000000000102',
      email: 'preview@teamlambreta.test',
      user_metadata: { full_name: 'Preview DEV', preferred_username: 'Preview DEV' }
    }
  } : null;
  let session = TEST_SESSION;
  let initialized = TEST_MODE;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function notify(event) {
    listeners.forEach(listener => {
      try { listener(session, event); } catch (error) { console.error('[AUTH] listener', error); }
    });
    window.dispatchEvent(new CustomEvent('tl:auth', { detail: { event, session } }));
  }

  async function signInWithGoogle() {
    if (TEST_MODE) return { testMode: true, session: TEST_SESSION };
    if (!client) throw new Error('Cliente Supabase indisponível.');
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (TEST_MODE) return;
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  if (TEST_MODE) {
    resolveReady(TEST_SESSION);
    queueMicrotask(() => notify('TEST_SESSION'));
  } else if (!client) {
    initialized = true;
    resolveReady(null);
  } else {
    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession || null;
      queueMicrotask(() => notify(event));
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error) console.error('[AUTH] falha ao recuperar sessão', error.message);
      session = data?.session || null;
      initialized = true;
      resolveReady(session);
      notify('INITIAL_SESSION');
    });
  }

  window.TeamAuth = Object.freeze({
    client,
    ready,
    testMode: TEST_MODE,
    getSession: async () => initialized ? session : ready,
    signInWithGoogle,
    signOut,
    subscribe(listener) {
      listeners.add(listener);
      if (initialized) listener(session, TEST_MODE ? 'TEST_SESSION' : 'CURRENT_SESSION');
      return () => listeners.delete(listener);
    }
  });
})();