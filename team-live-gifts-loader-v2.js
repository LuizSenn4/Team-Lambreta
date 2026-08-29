(() => {
  const load = (src, done) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    if (done) script.addEventListener('load', done, { once:true });
    document.body.appendChild(script);
  };
  load('team-live-gifts-core-v2.js?v=2.0', () => load('team-live-commands-v1.js?v=1.0'));
})();
