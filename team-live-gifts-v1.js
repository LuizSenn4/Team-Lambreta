(() => {
  const add = (src, onload) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    if (onload) s.onload = onload;
    document.body.appendChild(s);
  };
  add('team-live-gifts-core-v2.js?v=2.0', () => {
    add('team-live-commands-v1.js?v=1.0', () => add('team-live-trophy-v1.js?v=1.0'));
  });
})();
