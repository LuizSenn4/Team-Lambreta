(() => {
  'use strict';

  const STORAGE_KEY = 'tl_streamer_notifications_enabled';
  const SW_PATH = './push-service-worker.js';

  function supported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  async function registerWorker() {
    if (!supported()) return null;
    try {
      return await navigator.serviceWorker.register(SW_PATH, { scope: './' });
    } catch (error) {
      console.warn('[Team Lambreta] Service Worker não registrado:', error);
      return null;
    }
  }

  async function showTestNotification(name) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Team Lambreta', {
      body: `Notificações ativadas para ${name}. Vamos avisar quando a integração de live estiver ligada.`,
      icon: './img/brasao.png',
      badge: './img/brasao.png',
      tag: 'team-lambreta-notification-test',
      renotify: false,
      data: { url: './streamers.html' }
    });
  }

  function updateButtons() {
    const enabled = localStorage.getItem(STORAGE_KEY) === '1' && Notification.permission === 'granted';
    document.querySelectorAll('[data-streamer-notify]').forEach((button) => {
      button.classList.toggle('is-enabled', enabled);
      button.textContent = enabled ? 'NOTIFICAÇÕES ATIVADAS' : 'ATIVAR NOTIFICAÇÕES';
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    });
  }

  async function enableNotifications(button) {
    if (!supported()) {
      alert('Este navegador não suporta notificações do site.');
      return;
    }

    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = 'A ATIVAR...';

    try {
      await registerWorker();
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        localStorage.removeItem(STORAGE_KEY);
        alert('A permissão de notificações não foi autorizada. Pode ativá-la nas definições do navegador.');
        return;
      }

      localStorage.setItem(STORAGE_KEY, '1');
      const name = button.dataset.streamerName || 'os streamers';
      await showTestNotification(name);
    } catch (error) {
      console.error('[Team Lambreta] Falha ao ativar notificações:', error);
      alert('Não foi possível ativar as notificações agora.');
    } finally {
      button.disabled = false;
      button.textContent = previousText;
      updateButtons();
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-streamer-notify]');
    if (!button) return;
    enableNotifications(button);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    await registerWorker();
    updateButtons();
  });

  const observer = new MutationObserver(updateButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
