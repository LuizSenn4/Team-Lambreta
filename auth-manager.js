(() => {
  'use strict';
  if (window.TeamAuth) return;
  const client = window.teamSupabase;
  const listeners = new Set();
  let session = null;
  let initialized = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function notify(event) {
    listeners.forEach(listener => {
      try { listener(session, event); } catch (error) { console.error('[AUTH] listener', error); }
    });
    window.dispatchEvent(new CustomEvent('tl:auth', { detail: { event, session } }));
  }

  async function signInWithGoogle() {
    if (!client) throw new Error('Cliente Supabase indisponível.');
    const redirectTo = new URL('/home.html', window.location.origin).href;
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) {
      window.TeamDiagnostics?.error('TL-AUTH-002', 'auth', 'Login Google não iniciou', { redirectTo }, error);
      throw error;
    }
    return data;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  if (!client) {
    initialized = true;
    resolveReady(null);
  } else {
    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession || null;
      queueMicrotask(() => notify(event));
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error) window.TeamDiagnostics?.error('TL-AUTH-001', 'auth', 'Sessão não pôde ser restaurada', {}, error);
      session = data?.session || null;
      initialized = true;
      resolveReady(session);
      notify('INITIAL_SESSION');
    });
  }

  window.TeamAuth = Object.freeze({ client, ready, getSession: async () => initialized ? session : ready, signInWithGoogle, signOut,
    subscribe(listener) { listeners.add(listener); if (initialized) listener(session, 'CURRENT_SESSION'); return () => listeners.delete(listener); }
  });
})();
