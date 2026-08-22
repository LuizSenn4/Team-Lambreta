(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  if (window.teamSupabase) return;
  if (!window.supabase?.createClient) {
    console.error('[Team Lambreta] SDK Supabase indisponível.');
    return;
  }
  window.teamSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.TeamLambretaSupabase = Object.freeze({ url: SUPABASE_URL, client: window.teamSupabase });
})();