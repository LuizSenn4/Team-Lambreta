(() => {
  'use strict';

  const root = document.getElementById('homeSlider');
  const storage = window.TeamBannerStorage;
  if (!root || !storage) return;

  const track = root.querySelector('[data-slider-track]');
  const previous = root.querySelector('[data-slider-previous]');
  const next = root.querySelector('[data-slider-next]');
  const indicators = root.querySelector('[data-slider-indicators]');
  const mobileQuery = window.matchMedia('(max-width: 680px)');
  const hotspotBySlot = Object.freeze({
    1: {label:'Conhecer a Team', href:'team.html', left:71.5, top:84, width:27, height:15},
    2: {label:'Enviar presente', href:'', left:67.5, top:80.5, width:29, height:18},
    3: {label:'Ver torneios', href:'eventos.html', left:67.5, top:82.5, width:28, height:16}
  });
  let slides = [];
  let current = 0;
  let timer = 0;

  const safeLink = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };

  const stopAuto = () => { window.clearInterval(timer); timer = 0; };
  const startAuto = () => {
    stopAuto();
    if (slides.length > 1) timer = window.setInterval(() => show(current + 1), 7000);
  };

  const show = requested => {
    if (!slides.length) return;
    current = (requested + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    [...indicators.children].forEach((indicator, index) => {
      const active = index === current;
      indicator.classList.toggle('is-active', active);
      indicator.setAttribute('aria-selected', String(active));
      indicator.tabIndex = active ? 0 : -1;
    });
  };

  const navigate = delta => { show(current + delta); startAuto(); };

  const makeHotspot = item => {
    const definition = hotspotBySlot[item.slot];
    if (!definition) return null;
    const href = safeLink(item.link) || safeLink(definition.href);
    if (!href) return null;
    const hotspot = document.createElement('a');
    hotspot.className = 'home-slider-hotspot';
    hotspot.href = href;
    hotspot.dataset.sliderHotspot = String(item.slot);
    hotspot.setAttribute('aria-label', definition.label);
    hotspot.style.setProperty('--hotspot-left', `${definition.left}%`);
    hotspot.style.setProperty('--hotspot-top', `${definition.top}%`);
    hotspot.style.setProperty('--hotspot-width', `${definition.width}%`);
    hotspot.style.setProperty('--hotspot-height', `${definition.height}%`);
    return hotspot;
  };

  const mount = async () => {
    const isMobile = mobileQuery.matches;
    root.dataset.sliderVariant = isMobile ? 'mobile' : 'desktop';
    const config = await storage.readConfig();
    const loaded = config
      .filter(item => item.active)
      .map(item => ({...item, url:isMobile ? storage.resolveMobileUrl(item) : storage.resolveUrl(item)}))
      .filter(item => item.url);

    track.replaceChildren();
    indicators.replaceChildren();
    const images = [];

    slides = loaded.map((item, index) => {
      const slide = document.createElement('article');
      slide.className = 'home-slider-slide';
      slide.dataset.sliderSlide = String(item.slot);
      slide.hidden = index !== 0;
      slide.setAttribute('aria-label', `Banner ${item.slot}`);
      slide.setAttribute('aria-roledescription', 'slide');

      const backdrop = document.createElement('img');
      backdrop.className = 'home-slider-slide-backdrop';
      backdrop.src = item.url;
      backdrop.alt = '';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.decoding = 'async';
      const image = document.createElement('img');
      image.className = 'home-slider-slide-img';
      image.src = item.url;
      image.alt = `Banner ${item.slot} Team Lambreta`;
      image.width = isMobile ? 1080 : 1920;
      image.height = isMobile ? 1350 : 600;
      image.decoding = 'async';
      image.loading = 'eager';
      if (index === 0) image.fetchPriority = 'high';
      images.push(image, backdrop);
      slide.append(backdrop, image);

      const hotspot = makeHotspot(item);
      if (hotspot) slide.append(hotspot);
      track.append(slide);

      const indicator = document.createElement('button');
      indicator.type = 'button';
      indicator.dataset.sliderIndicator = String(index);
      indicator.setAttribute('role', 'tab');
      indicator.setAttribute('aria-label', `Mostrar Banner ${item.slot}`);
      indicator.addEventListener('click', () => { show(index); startAuto(); });
      indicators.append(indicator);
      return slide;
    });

    await Promise.allSettled(images.map(image => image.decode()));
    const multiple = slides.length > 1;
    previous.hidden = !multiple;
    next.hidden = !multiple;
    indicators.hidden = !multiple;
    root.hidden = slides.length === 0;
    root.dataset.sliderCount = String(slides.length);
    show(0);
    startAuto();
  };

  previous.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  root.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') navigate(-1);
    if (event.key === 'ArrowRight') navigate(1);
  });
  let touchStartX = 0;
  root.addEventListener('touchstart', event => { touchStartX = event.touches[0]?.clientX || 0; }, {passive:true});
  root.addEventListener('touchend', event => {
    const delta = (event.changedTouches[0]?.clientX || 0) - touchStartX;
    if (Math.abs(delta) > 45) navigate(delta < 0 ? 1 : -1);
  }, {passive:true});
  mobileQuery.addEventListener?.('change', () => mount().catch(() => {}));
  window.addEventListener('tl:banners-updated', () => mount().catch(() => {}));
  window.addEventListener('pagehide', stopAuto, {once:true});

  mount().catch(error => {
    root.hidden = true;
    window.TeamDiagnostics?.error?.('TL-BANNER-016', 'banners', 'Falha ao montar o slider oficial da Home', {}, error);
  });
})();
