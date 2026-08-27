(() => {
  'use strict';
  const URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  if (window.teamSupabase) return;
  if (!window.supabase?.createClient) {
    window.TeamDiagnostics?.error('TL-SUPA-001', 'supabase-client', 'SDK Supabase indisponível', { sdk: '@supabase/supabase-js' });
    return;
  }
  window.teamSupabase = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.TL_CORE_V102 = true;
  window.TeamLambretaSupabase = Object.freeze({ url: URL, client: window.teamSupabase });
})();
