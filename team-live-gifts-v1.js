(() => {
  const add = (src, onload) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    if (onload) s.onload = onload;
    document.body.appendChild(s);
  };

  // Commands owns chat commands (/top, /mix, /comandos). Load it first so
  // its stopImmediatePropagation prevents the legacy Gifts /top handler from
  // executing the same command a second time. Gifts still owns donor data/UI.
  add('team-live-commands-v1.js?v=2.0', () => {
    add('team-live-gifts-core-v2.js?v=2.0', () => add('team-live-mix-v1.js?v=1.0'));
  });
})();
