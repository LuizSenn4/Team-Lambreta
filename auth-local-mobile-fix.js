
(() => {
  'use strict';
  if (window.__TL_MOBILE_LOCAL_AUTH_FIX__) return;
  window.__TL_MOBILE_LOCAL_AUTH_FIX__ = true;

  const SUPABASE_URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';

  function getClient() {
    if (window.teamSupabase) return window.teamSupabase;
    if (window.tlMobileAuthSupabase) return window.tlMobileAuthSupabase;
    if (!window.supabase?.createClient) return null;
    window.tlMobileAuthSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    return window.tlMobileAuthSupabase;
  }

  function redirectUrl() {
    // Preserva exatamente o dispositivo/origem atual:
    // PC:       http://127.0.0.1:8767/buddy.html
    // Telemóvel http://192.168.1.130:8767/buddy.html
    // Produção: https://team-lambreta.vercel.app/buddy.html
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }

  async function loginGoogle() {
    const sb = getClient();
    if (!sb) {
      console.error('[AUTH] Supabase SDK não disponível');
      return;
    }

    const redirectTo = redirectUrl();
    console.info('[AUTH] origin:', window.location.origin);
    console.info('[AUTH] redirectTo:', redirectTo);

    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) {
      console.error('[AUTH] Google login falhou:', error.message);
      alert(`Não foi possível entrar com Google: ${error.message}`);
    }
  }

  window.TLAuth = window.TLAuth || {};
  window.TLAuth.loginGoogle = loginGoogle;

  function normalizedText(el) {
    return String(el?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isLoginClick(target) {
    const clickable = target.closest?.('button,a,[role="button"]');
    const buddyLogin = target.closest?.('#buddyLogin,.buddy-login');
    const header = target.closest?.('header,.tl-clean-header,.site-header');

    if (buddyLogin && clickable) return true;
    if (!header || !clickable) return false;

    const text = normalizedText(clickable);
    const href = String(clickable.getAttribute?.('href') || '').toLowerCase();

    // Captura apenas o login da conta. Não interfere em "Entrar no Lobby", etc.
    if (['entrar', 'login', 'entrar com google', 'login com google'].includes(text)) return true;
    if (text.includes('entrar') && text.includes('membro')) return true;
    if (href.includes('team-lambreta.vercel.app') && text.includes('entrar')) return true;

    return false;
  }

  // Capture phase: impede um link/handler antigo de mandar o telemóvel primeiro para o Vercel.
  document.addEventListener('click', (event) => {
    if (!isLoginClick(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    loginGoogle();
  }, true);

  // Ao regressar do OAuth, confirma a sessão sem exigir refresh manual.
  async function restoreSession() {
    const sb = getClient();
    if (!sb) return;

    try {
      const { data, error } = await sb.auth.getSession();
      if (error) console.warn('[AUTH] getSession:', error.message);

      if (data?.session) {
        console.info('[AUTH] sessão recuperada');
        document.dispatchEvent(new CustomEvent('tl:auth-session-ready', {
          detail: { userId: data.session.user.id }
        }));
      }
    } catch (error) {
      console.warn('[AUTH] erro ao recuperar sessão:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSession, { once: true });
  } else {
    restoreSession();
  }
})();
