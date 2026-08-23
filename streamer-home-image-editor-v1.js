(() => {
  'use strict';

  const TARGET_W = 1536;
  const TARGET_H = 1024;
  let sb = null;
  let sourceImage = null;
  let zoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let startOffsetX = 0;
  let startOffsetY = 0;

  const $ = id => document.getElementById(id);

  function getClient() {
    if (window.teamSupabase) return window.teamSupabase;
    return null;
  }

  function injectStyle() {
    if (document.getElementById('tl-home-image-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'tl-home-image-editor-style';
    style.textContent = `
      .tl-home-card-editor{margin-top:18px;padding:18px;border:1px solid rgba(91,232,255,.22);border-radius:16px;background:#081019}
      .tl-home-card-editor-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
      .tl-home-card-editor-head h4{margin:0 0 5px;font-size:18px;color:#eaf7fb}
      .tl-home-card-editor-head p{margin:0;color:#8fa0ad;font-size:12px;line-height:1.5}
      .tl-home-card-size{flex:0 0 auto;padding:7px 10px;border:1px solid rgba(0,223,245,.28);border-radius:999px;color:#66eaff;font-weight:900;font-size:11px;letter-spacing:.04em}
      .tl-home-card-workspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(240px,.75fr);gap:16px;align-items:start}
      .tl-home-card-stage{position:relative;aspect-ratio:3/2;border:1px solid #2a3a47;border-radius:14px;overflow:hidden;background:#05090d;cursor:grab;touch-action:none}
      .tl-home-card-stage.is-dragging{cursor:grabbing}
      .tl-home-card-stage canvas{display:block;width:100%;height:100%}
      .tl-home-card-stage-empty{position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center;color:#71808d;font-size:12px;pointer-events:none}
      .tl-home-card-controls{display:grid;gap:12px}
      .tl-home-card-controls label{display:grid;gap:6px;color:#aab8c3;font-size:11px;font-weight:800}
      .tl-home-card-controls input[type=range]{width:100%}
      .tl-home-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .tl-home-card-actions button{min-height:40px;border:1px solid #304351;border-radius:10px;background:#101a24;color:#e8f3f7;font-weight:850;cursor:pointer}
      .tl-home-card-actions button.primary{grid-column:1/-1;background:#00dff5;border-color:#00dff5;color:#021014}
      .tl-home-card-actions button.danger{color:#ff8290;border-color:rgba(255,82,103,.3)}
      .tl-home-card-existing{display:grid;gap:7px}
      .tl-home-card-existing img{width:100%;aspect-ratio:3/2;object-fit:cover;border:1px solid #263746;border-radius:10px;background:#05090d}
      .tl-home-card-existing small,.tl-home-card-status{color:#8393a0;font-size:10px;line-height:1.45}
      .tl-home-card-status.ok{color:#77f5bd}.tl-home-card-status.error{color:#ff8190}
      @media(max-width:900px){.tl-home-card-workspace{grid-template-columns:1fr}.tl-home-card-editor-head{flex-direction:column}.tl-home-card-size{align-self:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    if ($('tlHomeCardEditor')) return;
    const photoInput = $('streamerPhotoFile');
    const photoFieldset = photoInput?.closest('fieldset');
    if (!photoFieldset) return;

    const box = document.createElement('section');
    box.id = 'tlHomeCardEditor';
    box.className = 'tl-home-card-editor';
    box.innerHTML = `
      <div class="tl-home-card-editor-head">
        <div><h4>Imagem específica da HOME</h4><p>A foto original continua intacta. Aqui criamos uma versão horizontal para preencher 100% do card da Home sem blur nem faixa morta.</p></div>
        <span class="tl-home-card-size">1536 × 1024 · 3:2</span>
      </div>
      <div class="tl-home-card-workspace">
        <div id="tlHomeCardStage" class="tl-home-card-stage" aria-label="Enquadramento da imagem da Home">
          <canvas id="tlHomeCardCanvas" width="1536" height="1024"></canvas>
          <div id="tlHomeCardEmpty" class="tl-home-card-stage-empty">Abra um streamer e clique em “USAR FOTO ORIGINAL”.</div>
        </div>
        <div class="tl-home-card-controls">
          <label>ZOOM / OUTZOOM <input id="tlHomeCardZoom" type="range" min="1" max="2.2" step="0.01" value="1"></label>
          <div class="tl-home-card-actions">
            <button id="tlHomeUseOriginal" type="button">USAR FOTO ORIGINAL</button>
            <button id="tlHomeCenter" type="button">CENTRALIZAR</button>
            <button id="tlHomeSave" class="primary" type="button">SALVAR IMAGEM DA HOME</button>
            <button id="tlHomeClear" class="danger" type="button">REMOVER IMAGEM HOME</button>
          </div>
          <div class="tl-home-card-existing">
            <small>Imagem atualmente usada pela Home:</small>
            <img id="tlHomeExistingPreview" alt="Imagem da Home" hidden>
          </div>
          <div id="tlHomeCardStatus" class="tl-home-card-status">A imagem central permanece inteira no outzoom; as áreas que faltarem são estendidas a partir das bordas reais da própria arte.</div>
        </div>
      </div>`;
    photoFieldset.insertAdjacentElement('afterend', box);
  }

  function status(message, type='') {
    const el = $('tlHomeCardStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `tl-home-card-status ${type}`.trim();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!String(src).startsWith('blob:') && !String(src).startsWith('data:')) img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawEdgeExtension(ctx, img, dx, dy, dw, dh) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, TARGET_W, TARGET_H);

    const leftGap = Math.max(0, dx);
    const rightGap = Math.max(0, TARGET_W - (dx + dw));
    const topGap = Math.max(0, dy);
    const bottomGap = Math.max(0, TARGET_H - (dy + dh));

    if (leftGap > 0.5) {
      const strip = Math.max(2, Math.round(sw * 0.08));
      ctx.drawImage(img, 0, 0, strip, sh, 0, 0, leftGap + 2, TARGET_H);
    }
    if (rightGap > 0.5) {
      const strip = Math.max(2, Math.round(sw * 0.08));
      ctx.drawImage(img, sw - strip, 0, strip, sh, TARGET_W - rightGap - 2, 0, rightGap + 2, TARGET_H);
    }
    if (topGap > 0.5) {
      const strip = Math.max(2, Math.round(sh * 0.08));
      ctx.drawImage(img, 0, 0, sw, strip, 0, 0, TARGET_W, topGap + 2);
    }
    if (bottomGap > 0.5) {
      const strip = Math.max(2, Math.round(sh * 0.08));
      ctx.drawImage(img, 0, sh - strip, sw, strip, 0, TARGET_H - bottomGap - 2, TARGET_W, bottomGap + 2);
    }

    ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
  }

  function render() {
    const canvas = $('tlHomeCardCanvas');
    const empty = $('tlHomeCardEmpty');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha:false });
    ctx.clearRect(0,0,TARGET_W,TARGET_H);
    if (!sourceImage) {
      if (empty) empty.hidden = false;
      ctx.fillStyle='#05090d'; ctx.fillRect(0,0,TARGET_W,TARGET_H);
      return;
    }
    if (empty) empty.hidden = true;
    const sw = sourceImage.naturalWidth || sourceImage.width;
    const sh = sourceImage.naturalHeight || sourceImage.height;
    const base = Math.min(TARGET_W / sw, TARGET_H / sh);
    const dw = sw * base * zoom;
    const dh = sh * base * zoom;
    const dx = (TARGET_W - dw) / 2 + offsetX;
    const dy = (TARGET_H - dh) / 2 + offsetY;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    drawEdgeExtension(ctx, sourceImage, dx, dy, dw, dh);
  }

  async function useOriginal() {
    const preview = $('streamerPhotoPreview');
    const urlInput = $('streamerPhotoUrl');
    const src = (!preview?.hidden && preview?.src) || urlInput?.value?.trim();
    if (!src) return status('Escolha primeiro a foto original do streamer.', 'error');
    try {
      sourceImage = await loadImage(src);
      zoom = 1; offsetX = 0; offsetY = 0;
      $('tlHomeCardZoom').value = '1';
      render();
      status('Foto carregada. Arraste para reposicionar; use o slider para zoom/outzoom.', 'ok');
    } catch {
      status('Não consegui abrir essa imagem para enquadramento.', 'error');
    }
  }

  function center() {
    zoom = 1; offsetX = 0; offsetY = 0;
    if ($('tlHomeCardZoom')) $('tlHomeCardZoom').value = '1';
    render();
  }

  async function currentRow() {
    const id = $('streamerId')?.value?.trim();
    if (!id || !sb) return null;
    const { data, error } = await sb.from('streamers').select('id,photo_url,home_card_photo_url').eq('id',id).single();
    if (error) return null;
    return data;
  }

  async function refreshExisting() {
    const img = $('tlHomeExistingPreview');
    if (!img) return;
    const row = await currentRow();
    const url = row?.home_card_photo_url || '';
    img.hidden = !url;
    if (url) img.src = url;
    else img.removeAttribute('src');
  }

  async function save() {
    const id = $('streamerId')?.value?.trim();
    if (!id) return status('Guarde primeiro o streamer; depois prepare a imagem da Home.', 'error');
    if (!sourceImage) return status('Clique primeiro em USAR FOTO ORIGINAL.', 'error');
    if (!sb) return status('Supabase ainda não está disponível.', 'error');

    status('A gerar a imagem 1536 × 1024…');
    const canvas = $('tlHomeCardCanvas');
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return status('Falha ao gerar a imagem.', 'error');

    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return status('Sessão de Admin não encontrada.', 'error');

    const path = `${userId}/home/${id}-${Date.now()}.jpg`;
    const upload = await sb.storage.from('streamer-images').upload(path, blob, { contentType:'image/jpeg', upsert:false });
    if (upload.error) return status(upload.error.message || 'Erro no upload.', 'error');
    const publicUrl = sb.storage.from('streamer-images').getPublicUrl(path).data.publicUrl;
    const update = await sb.from('streamers').update({ home_card_photo_url: publicUrl, updated_at:new Date().toISOString(), updated_by:userId }).eq('id',id);
    if (update.error) return status(update.error.message || 'Erro ao salvar no streamer.', 'error');

    await refreshExisting();
    status('Imagem da HOME salva. Atualize a Home para ver o resultado.', 'ok');
  }

  async function clearHome() {
    const id = $('streamerId')?.value?.trim();
    if (!id || !sb) return status('Abra primeiro um streamer existente.', 'error');
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    const { error } = await sb.from('streamers').update({ home_card_photo_url:null, updated_at:new Date().toISOString(), updated_by:userId }).eq('id',id);
    if (error) return status(error.message, 'error');
    await refreshExisting();
    status('Imagem específica da Home removida. A Home usará a extensão automática.', 'ok');
  }

  function bind() {
    $('tlHomeUseOriginal')?.addEventListener('click', useOriginal);
    $('tlHomeCenter')?.addEventListener('click', center);
    $('tlHomeSave')?.addEventListener('click', save);
    $('tlHomeClear')?.addEventListener('click', clearHome);
    $('tlHomeCardZoom')?.addEventListener('input', event => { zoom = Number(event.target.value || 1); render(); });

    const stage = $('tlHomeCardStage');
    stage?.addEventListener('pointerdown', event => {
      if (!sourceImage) return;
      dragging = true; dragX = event.clientX; dragY = event.clientY; startOffsetX = offsetX; startOffsetY = offsetY;
      stage.classList.add('is-dragging');
      stage.setPointerCapture?.(event.pointerId);
    });
    stage?.addEventListener('pointermove', event => {
      if (!dragging) return;
      const rect = stage.getBoundingClientRect();
      offsetX = startOffsetX + (event.clientX - dragX) * (TARGET_W / rect.width);
      offsetY = startOffsetY + (event.clientY - dragY) * (TARGET_H / rect.height);
      render();
    });
    const endDrag = () => { dragging=false; stage?.classList.remove('is-dragging'); };
    stage?.addEventListener('pointerup', endDrag);
    stage?.addEventListener('pointercancel', endDrag);

    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-edit]')) setTimeout(async () => { center(); await refreshExisting(); }, 80);
      if (event.target.closest?.('#newStreamerBtn')) setTimeout(() => { sourceImage=null; center(); refreshExisting(); }, 80);
    }, true);

    $('streamerPhotoFile')?.addEventListener('change', () => setTimeout(useOriginal, 80));
    $('streamerPhotoUrl')?.addEventListener('change', () => setTimeout(useOriginal, 80));
  }

  async function boot() {
    injectStyle();
    buildUI();
    sb = getClient();
    if (!sb) {
      let tries = 0;
      while (!sb && tries < 40) {
        await new Promise(r => setTimeout(r, 100));
        sb = getClient();
        tries += 1;
      }
    }
    bind();
    render();
    refreshExisting();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
