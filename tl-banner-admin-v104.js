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
  const report = (code, description, context, originalError) => diagnostics?.error?.(code, 'banners', description, context, originalError);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let committedBanners = storage.readConfig();
  let banners = committedBanners.map(item => ({...item, image:'', preview:''}));
  const pendingBlobKeys = new Set();
  let saving = false;
  const root = document.getElementById('adminSliderSlots');
  const feedback = document.getElementById('bannerAdminFeedback');
  if (!root) return;
  const previewObjectUrls = [];
  window.addEventListener('pagehide', () => { previewObjectUrls.splice(0).forEach(url => storage?.revokeUrl?.(url)); }, {once:true});
  const setFeedback = message => { if (feedback) feedback.textContent = message; };
  const hydratePreviews = async () => { if (!storage) return; await Promise.all(banners.map(async item => { if (!item.imageKey) return; try { const blob = await storage.get(item.imageKey); const url = blob && storage.createUrl(blob); if (url) { previewObjectUrls.push(url); item.preview = url; } else { report('TL-BANNER-012', 'Metadata órfã: Blob do banner não encontrado', {slot:item.slot, key:item.imageKey, active:item.active}); } } catch (error) { report('TL-BANNER-013', 'Erro ao ler Blob do banner', {key:item.imageKey}, error); } })); render(); };
  const removeBlobSafely = key => Promise.resolve(storage?.remove?.(key)).catch(error => report('TL-BANNER-013', 'Metadata persistida, mas o Blob antigo não pôde ser removido', {key}, error));
  const validateReferences = async config => {
    const missing = [];
    await Promise.all(config.map(async item => {
      if (!item.imageKey) return;
      try {
        const blob = await storage.get(item.imageKey);
        if (!blob || !String(blob.type || '').startsWith('image/')) missing.push(item);
      } catch (error) {
        report('TL-BANNER-013', 'Erro ao validar Blob antes de salvar metadata', {slot:item.slot, key:item.imageKey}, error);
        missing.push(item);
      }
    }));
    missing.forEach(item => report('TL-BANNER-012', 'Metadata órfã detectada antes de salvar banners', {slot:item.slot, key:item.imageKey, active:item.active}));
    return missing;
  };
  const persist = async message => {
    if (saving) return;
    saving = true;
    try {
      const next = storage.normalizeConfig(banners);
      const missing = await validateReferences(next);
      if (missing.some(item => item.active)) {
        setFeedback('Não foi possível salvar: um banner ativo perdeu a imagem. Selecione outra imagem ou remova o banner.');
        return;
      }
      if (missing.length) {
        setFeedback('Não foi possível salvar: existe metadata de banner sem Blob correspondente. Remova ou substitua o banner.');
        return;
      }
      const clean = storage.writeConfig(next);
      const usedKeys = new Set(clean.map(item => item.imageKey).filter(Boolean));
      const obsoleteKeys = new Set([
        ...committedBanners.map(item => item.imageKey).filter(Boolean),
        ...pendingBlobKeys
      ]);
      committedBanners = clean.map(item => ({...item}));
      pendingBlobKeys.clear();
      await Promise.all([...obsoleteKeys].filter(key => !usedKeys.has(key)).map(removeBlobSafely));
      setFeedback(message || 'Banners guardados.');
      window.dispatchEvent(new CustomEvent('tl:banners-updated', {detail: clean}));
    } catch (error) {
      report('TL-BANNER-002', 'Não foi possível guardar os banners', {key: storage.CONFIG_KEY}, error);
      setFeedback('Não foi possível guardar os banners neste navegador.');
    } finally { saving = false; }
  };
  const slotMarkup = (item, index) => `<article class="admin-slider-slot" data-banner-slot="${index}">
    <div class="admin-slider-slot-head"><h4>BANNER ${index + 1}</h4><span class="admin-slider-status${item.active ? '' : ' is-off'}">${item.active ? 'Ativo' : 'Inativo'}</span></div>
    <label class="admin-slider-drop" data-dropzone="${index}" tabindex="0" aria-label="Enviar imagem do Banner ${index + 1}">${item.preview || item.image ? `<img src="${esc(item.preview || item.image)}" alt="Pré-visualização do Banner ${index + 1}">` : '<span><strong>↥</strong>Clique para enviar ou arraste<small>PNG, JPG, WEBP · Máx. 2 MB<br>1920×600px recomendado</small></span>'}</label>
    <div class="admin-slider-file-button"><button type="button" data-select="${index}">Selecionar imagem</button><input type="file" accept="image/png,image/jpeg,image/webp" data-file="${index}"></div>
    <label class="admin-slider-link"><span>Link do banner (opcional)</span><input type="url" data-link="${index}" value="${esc(item.link)}" placeholder="https://exemplo.com"></label>
    <div class="admin-slider-slot-foot"><label class="admin-slider-toggle"><input type="checkbox" data-active="${index}" ${item.active ? 'checked' : ''}> <span>${item.active ? 'Ativo' : 'Inativo'}</span></label><button type="button" class="admin-slider-remove" data-remove="${index}" ${item.image || item.imageKey || item.preview ? '' : 'disabled'}>♙ Remover</button></div>
    <p class="admin-slider-slot-feedback" data-slot-feedback="${index}" role="status" aria-live="polite"></p>
  </article>`;
  const render = () => { root.innerHTML = banners.map(slotMarkup).join(''); bind(); };
  const processFile = (file, index) => {
    const slotFeedback = () => root.querySelector(`[data-slot-feedback="${index}"]`);
    const notify = message => { if (slotFeedback()) slotFeedback().textContent = message; setFeedback(message); };
    const typeOk = /^image\/(png|jpeg|webp)$/i.test(file?.type || '') || /\.(png|jpe?g|webp)$/i.test(file?.name || '');
    if (!file || !typeOk) { report('TL-BANNER-003', 'Formato de banner inválido', {slot: index + 1, type: file?.type, name: file?.name}); notify('Use PNG, JPG ou WebP.'); return; }
    if (file.size > MAX_INPUT_BYTES) { report('TL-BANNER-004', 'Ficheiro de banner excede o limite de processamento', {slot: index + 1, bytes: file.size}); notify('A imagem excede 12 MB e não pode ser processada.'); return; }
    if (file.size > MAX_BYTES) notify(`Imagem acima de 2 MB (${(file.size / 1048576).toFixed(1)} MB); a comprimir antes de guardar…`);
    const reader = new FileReader();
    reader.onerror = error => { report('TL-BANNER-005', 'Falha ao ler imagem do banner', {slot: index + 1}, error); notify('Não foi possível ler a imagem.'); };
    reader.onload = () => {
      const image = new Image();
      image.onerror = error => { report('TL-BANNER-005', 'Falha ao preparar imagem do banner', {slot: index + 1}, error); notify('Não foi possível preparar a imagem.'); };
      image.onload = () => {
        const ratio = image.width / image.height;
        if (ratio < MIN_INPUT_RATIO || ratio > MAX_INPUT_RATIO) { report('TL-BANNER-006', 'Proporção de banner fora do recomendado', {slot: index + 1, width: image.width, height: image.height, ratio, targetRatio: TARGET_RATIO}); notify('Use uma imagem horizontal próxima de 1920×600px.'); return; }
        let sx = 0; let sy = 0; let sw = image.width; let sh = image.height;
        if (ratio < TARGET_RATIO) { sh = image.width / TARGET_RATIO; sy = (image.height - sh) / 2; }
        else if (ratio > TARGET_RATIO) { sw = image.height * TARGET_RATIO; sx = (image.width - sw) / 2; }
        const outputWidth = Math.min(MAX_WIDTH, Math.round(sw));
        const outputHeight = Math.round(outputWidth / TARGET_RATIO);
        const canvas = document.createElement('canvas'); canvas.width = outputWidth; canvas.height = outputHeight;
        canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        let quality = .82; let optimized = canvas.toDataURL('image/webp', quality);
        while (optimized.length * .75 > MAX_BYTES && quality > .55) { quality -= .07; optimized = canvas.toDataURL('image/webp', quality); }
        const blob = storage?.dataUrlToBlob?.(optimized);
        const key = `banner-${index + 1}-${Date.now()}`;
        if (!storage?.put || !blob) { report('TL-BANNER-010', 'Armazenamento local de banners indisponível', {slot:index + 1}); notify('Não foi possível preparar o armazenamento local da imagem.'); return; }
        Promise.resolve(storage?.put?.(key, blob)).then(() => { const previous = banners[index].imageKey; banners[index].image = ''; banners[index].preview = optimized; banners[index].imageKey = key; banners[index].active = true; pendingBlobKeys.add(key); if (previous && pendingBlobKeys.has(previous)) { pendingBlobKeys.delete(previous); removeBlobSafely(previous); } render(); setFeedback(`Banner ${index + 1} preparado. Clique em “Salvar banners”.`); }).catch(error => { report('TL-BANNER-011', 'Não foi possível guardar o Blob do banner', {slot:index + 1, key}, error); notify('Não foi possível guardar a imagem persistente.'); });
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
    root.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.remove); const key = banners[index].imageKey; banners[index].image = ''; banners[index].preview = ''; banners[index].imageKey = ''; banners[index].link = ''; if (key && pendingBlobKeys.has(key)) { pendingBlobKeys.delete(key); removeBlobSafely(key); } render(); setFeedback(`Banner ${index + 1} removido. Clique em “Salvar banners”.`); }));
    root.querySelectorAll('[data-dropzone]').forEach(zone => { const index = Number(zone.dataset.dropzone); zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('is-dragover'); }); zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover')); zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('is-dragover'); processFile(event.dataTransfer.files?.[0], index); }); zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); root.querySelector(`[data-file="${index}"]`)?.click(); } }); zone.addEventListener('click', () => root.querySelector(`[data-file="${index}"]`)?.click()); });
  }
  document.getElementById('saveBannersBtn')?.addEventListener('click', () => persist('Banners guardados com sucesso.'));
  document.getElementById('saveAllBtn')?.addEventListener('click', () => persist('Banners incluídos no salvamento geral.'));
  render();
  hydratePreviews();
})();
