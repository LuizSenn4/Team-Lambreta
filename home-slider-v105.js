(() => {
  'use strict';

  const root = document.getElementById('homeSlider');
  const storage = window.TeamBannerStorage;
  if (!root || !storage) return;

  const mobileMedia = window.matchMedia('(max-width: 680px)');

  const track = root.querySelector('[data-slider-track]');
  const previous = root.querySelector('[data-slider-previous]');
  const next = root.querySelector('[data-slider-next]');
  const indicators = root.querySelector('[data-slider-indicators]');
  const objectUrls = [];
  const hotspotBySlot = Object.freeze({
    1: {label:'Conhecer a Team', href:'team.html', left:70, top:81, width:25, height:13},
    2: {label:'Enviar presente', href:'', left:65, top:78, width:30, height:15},
    3: {label:'Ver torneios', href:'eventos.html', left:68, top:78, width:27, height:15}
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

  const loadSlide = async item => {
    if (!item.active) return null;
    const useMobile = mobileMedia.matches && Boolean(item.imageKeyMobile);
    const key = useMobile ? item.imageKeyMobile : item.imageKey;
    if (!key) return null;
    try {
      const blob = await storage.get(key);
      if (!blob || !String(blob.type || '').startsWith('image/')) return null;
      const url = storage.createUrl(blob);
      if (!url) return null;
      objectUrls.push(url);
      return {...item, url, bytes:blob.size, isMobileVariant:useMobile};
    } catch (error) {
      window.TeamDiagnostics?.error?.('TL-BANNER-013', 'banners', 'Erro ao carregar banner da Home', {slot:item.slot, key}, error);
      return null;
    }
  };

  const mount = async () => {
    stopAuto();
    objectUrls.splice(0).forEach(storage.revokeUrl);
    const config = storage.readConfig();
    const loaded = (await Promise.all(config.map(loadSlide))).filter(Boolean);

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
      backdrop.loading = 'eager';

      const image = document.createElement('img');
      image.className = 'home-slider-slide-img';
      image.src = item.url;
      image.alt = `Banner ${item.slot} Team Lambreta`;
      image.width = item.isMobileVariant ? 1080 : 1920;
      image.height = item.isMobileVariant ? 1350 : 600;
      image.decoding = 'async';
      image.loading = 'eager';
      if (index === 0) image.fetchPriority = 'high';
      images.push(image);
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
  window.addEventListener('pagehide', () => {
    stopAuto();
    objectUrls.splice(0).forEach(storage.revokeUrl);
  }, {once:true});

  const remount = () => { mount().catch(error => { window.TeamDiagnostics?.error?.('TL-BANNER-016', 'banners', 'Falha ao remontar o slider da Home após mudança de ecrã', {}, error); }); };
  if (mobileMedia.addEventListener) mobileMedia.addEventListener('change', remount);
  else mobileMedia.addListener?.(remount);

  mount().catch(error => {
    root.hidden = true;
    window.TeamDiagnostics?.error?.('TL-BANNER-016', 'banners', 'Falha ao montar o slider oficial da Home', {}, error);
  });
})();
