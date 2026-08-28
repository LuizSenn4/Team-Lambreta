(() => {
  'use strict';

  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_INPUT_BYTES = 12 * 1024 * 1024;
  const MAX_WIDTH = 1920;
  const TARGET_WIDTH = 1920;
  const TARGET_HEIGHT = 600;
  const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;
  const MIN_INPUT_RATIO = 2.8;
  const MAX_INPUT_RATIO = 3.55;
  const storage = window.TeamBannerStorage;
  const diagnostics = window.TeamDiagnostics;
  const root = document.getElementById('adminSliderSlots');
  const feedback = document.getElementById('bannerAdminFeedback');
  if (!root || !storage) return;

  const report = (code, description, context, error) => diagnostics?.error?.(code, 'banners', description, context, error);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setFeedback = message => { if (feedback) feedback.textContent = message; };

  let committedBanners = storage.normalizeConfig(null);
  let banners = committedBanners.map(item => ({...item, preview:''}));
  const pendingKeys = new Set();
  let saving = false;

  const slotMarkup = (item, index) => `<article class="admin-slider-slot" data-banner-slot="${index}">
    <div class="admin-slider-slot-head"><h4>BANNER ${index + 1}</h4><span class="admin-slider-status${item.active ? '' : ' is-off'}">${item.active ? 'Ativo' : 'Inativo'}</span></div>
    <label class="admin-slider-drop" data-dropzone="${index}" tabindex="0" aria-label="Enviar imagem do Banner ${index + 1}">${item.preview ? `<img src="${esc(item.preview)}" alt="Pré-visualização do Banner ${index + 1}">` : '<span><strong>↥</strong>Clique para enviar ou arraste<small>PNG, JPG, WEBP · Máx. 2 MB<br>1920×600px recomendado</small></span>'}</label>
    <div class="admin-slider-file-button"><button type="button" data-select="${index}">Selecionar imagem</button><input type="file" accept="image/png,image/jpeg,image/webp" data-file="${index}"></div>
    <label class="admin-slider-link"><span>Link do banner (opcional)</span><input type="url" data-link="${index}" value="${esc(item.link)}" placeholder="https://exemplo.com"></label>
    <div class="admin-slider-slot-foot"><label class="admin-slider-toggle"><input type="checkbox" data-active="${index}" ${item.active ? 'checked' : ''}> <span>${item.active ? 'Ativo' : 'Inativo'}</span></label><button type="button" class="admin-slider-remove" data-remove="${index}" ${item.imageKey || item.url || item.preview ? '' : 'disabled'}>♙ Remover</button></div>
    <p class="admin-slider-slot-feedback" data-slot-feedback="${index}" role="status" aria-live="polite"></p>
  </article>`;

  const render = () => {
    root.innerHTML = banners.map(slotMarkup).join('');
    bind();
  };

  const removeStorageKey = async key => {
    if (!key) return;
    try { await storage.remove(key); }
    catch (error) { report('TL-BANNER-024', 'Falha ao remover banner antigo', {key}, error); }
  };

  const persist = async message => {
    if (saving) return;
    saving = true;
    setFeedback('A guardar banners na nuvem…');
    try {
      const next = storage.normalizeConfig(banners);
      const clean = await storage.writeConfig(next);
      const usedKeys = new Set(clean.map(item => item.imageKey).filter(Boolean));
      const obsolete = new Set([
        ...committedBanners.map(item => item.imageKey).filter(Boolean),
        ...pendingKeys
      ]);
      committedBanners = clean.map(item => ({...item}));
      pendingKeys.clear();
      await Promise.all([...obsolete].filter(key => !usedKeys.has(key)).map(removeStorageKey));
      banners = clean.map(item => ({...item, preview:storage.resolveUrl(item)}));
      render();
      setFeedback(message || 'Banners guardados na nuvem.');
      window.dispatchEvent(new CustomEvent('tl:banners-updated', {detail:clean}));
    } catch (error) {
      report('TL-BANNER-022', 'Não foi possível guardar os banners na nuvem', {}, error);
      setFeedback('Não foi possível guardar os banners. Confirme a sessão de administrador e tente novamente.');
    } finally {
      saving = false;
    }
  };

  const processFile = (file, index) => {
    const slotFeedback = () => root.querySelector(`[data-slot-feedback="${index}"]`);
    const notify = message => { if (slotFeedback()) slotFeedback().textContent = message; setFeedback(message); };
    const typeOk = /^image\/(png|jpeg|webp)$/i.test(file?.type || '') || /\.(png|jpe?g|webp)$/i.test(file?.name || '');
    if (!file || !typeOk) { report('TL-BANNER-003', 'Formato de banner inválido', {slot:index + 1, type:file?.type, name:file?.name}); notify('Use PNG, JPG ou WebP.'); return; }
    if (file.size > MAX_INPUT_BYTES) { report('TL-BANNER-004', 'Ficheiro de banner excede o limite de processamento', {slot:index + 1, bytes:file.size}); notify('A imagem excede 12 MB e não pode ser processada.'); return; }
    if (file.size > MAX_BYTES) notify(`Imagem acima de 2 MB (${(file.size / 1048576).toFixed(1)} MB); a comprimir antes do envio…`);

    const reader = new FileReader();
    reader.onerror = error => { report('TL-BANNER-005', 'Falha ao ler imagem do banner', {slot:index + 1}, error); notify('Não foi possível ler a imagem.'); };
    reader.onload = () => {
      const image = new Image();
      image.onerror = error => { report('TL-BANNER-005', 'Falha ao preparar imagem do banner', {slot:index + 1}, error); notify('Não foi possível preparar a imagem.'); };
      image.onload = async () => {
        const ratio = image.width / image.height;
        if (ratio < MIN_INPUT_RATIO || ratio > MAX_INPUT_RATIO) { report('TL-BANNER-006', 'Proporção de banner fora do recomendado', {slot:index + 1, width:image.width, height:image.height, ratio, targetRatio:TARGET_RATIO}); notify('Use uma imagem horizontal próxima de 1920×600px.'); return; }

        let sx = 0; let sy = 0; let sw = image.width; let sh = image.height;
        if (ratio < TARGET_RATIO) { sh = image.width / TARGET_RATIO; sy = (image.height - sh) / 2; }
        else if (ratio > TARGET_RATIO) { sw = image.height * TARGET_RATIO; sx = (image.width - sw) / 2; }

        const outputWidth = Math.min(MAX_WIDTH, Math.round(sw));
        const outputHeight = Math.round(outputWidth / TARGET_RATIO);
        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

        let quality = .82;
        let optimized = canvas.toDataURL('image/webp', quality);
        while (optimized.length * .75 > MAX_BYTES && quality > .55) {
          quality -= .07;
          optimized = canvas.toDataURL('image/webp', quality);
        }

        const blob = storage.dataUrlToBlob(optimized);
        const key = `banner-${index + 1}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.webp`;
        notify(`A enviar Banner ${index + 1} para a nuvem…`);
        try {
          await storage.put(key, blob);
          const previousPending = banners[index].imageKey;
          if (previousPending && pendingKeys.has(previousPending)) {
            pendingKeys.delete(previousPending);
            await removeStorageKey(previousPending);
          }
          banners[index].imageKey = key;
          banners[index].url = '';
          banners[index].preview = storage.getPublicUrl(key);
          banners[index].active = true;
          pendingKeys.add(key);
          render();
          setFeedback(`Banner ${index + 1} enviado. Clique em “Salvar banners” para publicar.`);
        } catch (error) {
          report('TL-BANNER-023', 'Não foi possível enviar o banner', {slot:index + 1, key}, error);
          notify('Não foi possível enviar a imagem. Confirme a sessão de administrador.');
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  function bind() {
    root.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => root.querySelector(`[data-file="${button.dataset.select}"]`)?.click()));
    root.querySelectorAll('[data-file]').forEach(input => input.addEventListener('change', () => processFile(input.files?.[0], Number(input.dataset.file))));
    root.querySelectorAll('[data-link]').forEach(input => input.addEventListener('input', () => { banners[Number(input.dataset.link)].link = input.value.trim(); }));
    root.querySelectorAll('[data-active]').forEach(input => input.addEventListener('change', () => { banners[Number(input.dataset.active)].active = input.checked; render(); }));
    root.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', async () => {
      const index = Number(button.dataset.remove);
      const key = banners[index].imageKey;
      if (key && pendingKeys.has(key)) {
        pendingKeys.delete(key);
        await removeStorageKey(key);
      }
      banners[index] = {slot:index + 1, imageKey:'', url:'', link:'', active:false, preview:''};
      render();
      setFeedback(`Banner ${index + 1} removido. Clique em “Salvar banners” para publicar.`);
    }));
    root.querySelectorAll('[data-dropzone]').forEach(zone => {
      const index = Number(zone.dataset.dropzone);
      zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('is-dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
      zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('is-dragover'); processFile(event.dataTransfer.files?.[0], index); });
      zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); root.querySelector(`[data-file="${index}"]`)?.click(); } });
      zone.addEventListener('click', () => root.querySelector(`[data-file="${index}"]`)?.click());
    });
  }

  const init = async () => {
    setFeedback('A carregar banners da nuvem…');
    committedBanners = await storage.readConfig();
    banners = committedBanners.map(item => ({...item, preview:storage.resolveUrl(item)}));
    render();
    setFeedback('Banners sincronizados com a nuvem.');
  };

  document.getElementById('saveBannersBtn')?.addEventListener('click', () => persist('Banners guardados com sucesso na nuvem.'));
  document.getElementById('saveAllBtn')?.addEventListener('click', () => persist('Banners incluídos no salvamento geral e guardados na nuvem.'));

  render();
  init().catch(error => {
    report('TL-BANNER-021', 'Falha ao iniciar gestor de banners', {}, error);
    setFeedback('Não foi possível carregar os banners da nuvem.');
  });
})();
