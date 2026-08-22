(() => {
  'use strict';
  const URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  if (window.teamSupabase) return;
  if (!window.supabase?.createClient) {
    console.error('[Team Lambreta] SDK Supabase indisponível.');
    return;
  }
  window.teamSupabase = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.TeamLambretaSupabase = Object.freeze({ url: URL, client: window.teamSupabase });
})();