(() => {
  'use strict';

  const search = document.getElementById('adminHelpSearch');
  const topics = [...document.querySelectorAll('[data-help-topic]')];
  const indexLinks = [...document.querySelectorAll('.admin-help-index a')];
  const results = document.getElementById('adminHelpResults');
  const empty = document.getElementById('adminHelpEmpty');
  if (!search || !topics.length) return;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const filterTopics = () => {
    const query = normalize(search.value);
    let visible = 0;

    topics.forEach(topic => {
      const match = !query || normalize(topic.textContent).includes(query);
      topic.hidden = !match;
      if (match) {
        visible += 1;
        if (query) topic.open = true;
      }
    });

    indexLinks.forEach(link => {
      const topic = document.querySelector(link.getAttribute('href'));
      link.hidden = Boolean(topic?.hidden);
    });

    results.textContent = query
      ? `${visible} ${visible === 1 ? 'tópico encontrado' : 'tópicos encontrados'}.`
      : '';
    empty.hidden = visible !== 0;
  };

  search.addEventListener('input', filterTopics);

  indexLinks.forEach(link => {
    link.addEventListener('click', () => {
      const topic = document.querySelector(link.getAttribute('href'));
      if (!topic) return;
      topic.hidden = false;
      topic.open = true;
    });
  });
})();
