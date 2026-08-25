(() => {
  'use strict';

  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const events = typeof window.getTeamData === 'function'
    ? (window.getTeamData().events || [])
    : [];

  grid.innerHTML = events.length
    ? events.map((event, index) => {
        const title = String(event.title || 'Evento sem título');
        const key = encodeURIComponent(`${title}|${event.date || index}`);
        return `<article class="event-item">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(event.description || 'Sem descrição')}</p>
            <button type="button" class="tl-event-checkin" data-tl-event-key="${key}">CONFIRMAR PRESENÇA</button>
          </div>
        </article>`;
      }).join('')
    : '<article class="empty-card safe-card"><h3>Nenhum evento ainda</h3><p>Conteúdo ainda não cadastrado no admin.</p></article>';
})();
