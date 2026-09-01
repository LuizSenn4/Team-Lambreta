(() => {
  const sb = window.teamSupabase;
  if (!sb) return;

  const $ = id => document.getElementById(id);
  let currentSession = null;
  let currentProfile = null;
  let currentRows = [];
  let scheduleRows = [];
  let pendingCroppedFile = null;
  let pendingOriginalFile = null;
  let pendingPreviewUrl = '';
  let editingPhotoUrl = '';
  let pendingHomeCroppedFile = null;
  let pendingHomeOriginalFile = null;
  let pendingHomePreviewUrl = '';
  let editingHomeImageUrl = '';
  const CROP_OUTPUTS = {
    poster:{width:1200,height:1800,suffix:'2x3',label:'PREVIEW DO POSTER · 2:3'},
    home:{width:1536,height:1024,suffix:'3x2',label:'PREVIEW DA HOME · 3:2'}
  };
  const cropState = { mode:'poster',naturalWidth:0,naturalHeight:0,frameWidth:0,frameHeight:0,minScale:1,zoom:1,x:0,y:0,dragging:false,startX:0,startY:0,originX:0,originY:0,sourceFile:null,sourceName:'streamer-original' };

  const WEEK_DAYS = [
    ['monday','Segunda-feira'],['tuesday','Terça-feira'],['wednesday','Quarta-feira'],
    ['thursday','Quinta-feira'],['friday','Sexta-feira'],['saturday','Sábado'],['sunday','Domingo']
  ];
  const TIMEZONES = [
    ['Europe/Lisbon','Portugal — Lisboa/Porto'],['Atlantic/Madeira','Portugal — Madeira'],['Atlantic/Azores','Portugal — Açores'],
    ['America/Sao_Paulo','Brasil — Brasília/São Paulo'],['America/Manaus','Brasil — Manaus'],
    ['Europe/Warsaw','Polónia'],['Europe/Paris','França'],['Europe/Berlin','Alemanha'],['Europe/Madrid','Espanha']
  ];

  const fields = {
    display_name:'streamerDisplayName',
    game_nickname:'streamerGameNick',
    main_game:'streamerMainGame',
    title:'streamerTitle',
    description:'streamerDescription',
    photo_url:'streamerPhotoUrl',
    tiktok_url:'streamerTikTok',
    twitch_url:'streamerTwitch',
    youtube_url:'streamerYouTube',
    instagram_url:'streamerInstagram',
    live_platform:'streamerLivePlatform',
    live_mode:'streamerLiveMode',
    live_url:'streamerLiveUrl',
    hls_url:'streamerHlsUrl',
    display_order:'streamerOrder'
  };

  const boolFields = {
    manual_live:'streamerManualLive',
    force_live:'streamerForceLive',
    allow_embed:'streamerAllowEmbed',
    allow_live_chat:'streamerAllowChat',
    is_published:'streamerPublished',
    is_featured:'streamerFeatured'
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);

  const timeOptions = () => {
    const values=[];
    for(let h=0;h<24;h++) for(let m=0;m<60;m+=10) values.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    return values;
  };

  function normalizeScheduleRow(row={}) {
    return {
      id: row.id || crypto.randomUUID(),
      type: row.type === 'date' ? 'date' : 'weekly',
      start_day: row.start_day || 'tuesday',
      end_day: row.end_day || row.start_day || 'tuesday',
      date: row.date || '',
      start_time: row.start_time || '16:00',
      end_time: row.end_time || '18:00',
      is_off: Boolean(row.is_off),
      timezone: row.timezone || 'Europe/Lisbon'
    };
  }

  function renderScheduleRows() {
    const list=$('streamerScheduleList');
    if(!list) return;
    if(!scheduleRows.length){
      list.innerHTML='<div class="streamer-schedule-admin-empty">Nenhum horário configurado.</div>';
      return;
    }
    const dayOptions=WEEK_DAYS.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    const zoneOptions=TIMEZONES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    const times=timeOptions().map(value=>`<option value="${value}">${value}</option>`).join('');
    list.innerHTML=scheduleRows.map((row,index)=>`
      <article class="streamer-schedule-admin-row" data-schedule-id="${row.id}">
        <div class="streamer-schedule-row-head"><strong>Horário ${index+1}</strong><button type="button" data-remove-schedule="${row.id}">Remover</button></div>
        <div class="streamer-schedule-row-grid">
          <label>Tipo<select data-schedule-field="type"><option value="weekly">Semanal</option><option value="date">Data específica</option></select></label>
          <label class="schedule-weekly-field">De<select data-schedule-field="start_day">${dayOptions}</select></label>
          <label class="schedule-weekly-field">Até<select data-schedule-field="end_day">${dayOptions}</select></label>
          <label class="schedule-date-field">Data<input type="date" data-schedule-field="date"></label>
          <label>Início<select data-schedule-field="start_time">${times}</select></label>
          <label>Fim<select data-schedule-field="end_time">${times}</select></label>
          <label>Fuso<select data-schedule-field="timezone">${zoneOptions}</select></label>
          <label class="streamer-schedule-off"><input type="checkbox" data-schedule-field="is_off"> Folga</label>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('.streamer-schedule-admin-row').forEach(card=>{
      const row=scheduleRows.find(item=>item.id===card.dataset.scheduleId);
      if(!row) return;
      card.querySelectorAll('[data-schedule-field]').forEach(el=>{
        const key=el.dataset.scheduleField;
        if(el.type==='checkbox') el.checked=Boolean(row[key]); else el.value=row[key] ?? '';
        el.addEventListener('change',()=>{
          row[key]=el.type==='checkbox'?el.checked:el.value;
          if(key==='type') renderScheduleRows();
          if(key==='is_off') renderScheduleRows();
        });
      });
      card.classList.toggle('is-date',row.type==='date');
      card.classList.toggle('is-off',row.is_off);
    });
    list.querySelectorAll('[data-remove-schedule]').forEach(btn=>btn.onclick=()=>{
      scheduleRows=scheduleRows.filter(row=>row.id!==btn.dataset.removeSchedule);
      renderScheduleRows();
    });
  }

  function setScheduleRows(value) {
    const rows=Array.isArray(value)?value:[];
    scheduleRows=rows.map(normalizeScheduleRow);
    renderScheduleRows();
  }

  function collectScheduleRows() {
    return scheduleRows.map(({id,...row})=>row).filter(row=>{
      if(row.type==='date' && !row.date) return false;
      return true;
    });
  }

  function feedback(message, error=false) {
    const el = $('streamerAdminFeedback');
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? '#ff5267' : '#73ff18';
  }

  function setStreamerPhotoPreview(src='') {
    const img = $('streamerPhotoPreview');
    const empty = $('streamerPhotoEmpty');
    const hasPhoto = Boolean(String(src || '').trim());
    if (img) {
      if (hasPhoto) img.src = src;
      else img.removeAttribute('src');
      img.hidden = !hasPhoto;
    }
    if (empty) empty.hidden = hasPhoto;
  }

  function clearStreamerPhoto() {
    const urlInput = $('streamerPhotoUrl');
    const fileInput = $('streamerPhotoFile');
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    pendingCroppedFile = null;
    pendingOriginalFile = null;
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    pendingPreviewUrl = '';
    setStreamerPhotoPreview('');
  }

  function setStreamerHomePreview(src='') {
    const img=$('streamerHomePreviewImage');
    const empty=$('streamerHomePreviewEmpty');
    const hasPhoto=Boolean(String(src||'').trim());
    if(img){if(hasPhoto)img.src=src;else img.removeAttribute('src');img.hidden=!hasPhoto;}
    if(empty)empty.hidden=hasPhoto;
  }

  function clearStreamerHome() {
    if($('streamerHomeImageUrl'))$('streamerHomeImageUrl').value='';
    if($('streamerHomeImageFile'))$('streamerHomeImageFile').value='';
    pendingHomeCroppedFile=null;pendingHomeOriginalFile=null;
    if(pendingHomePreviewUrl)URL.revokeObjectURL(pendingHomePreviewUrl);
    pendingHomePreviewUrl='';setStreamerHomePreview('');
  }

  function clampCropPosition() {
    const width=cropState.naturalWidth*cropState.minScale*cropState.zoom;
    const height=cropState.naturalHeight*cropState.minScale*cropState.zoom;
    cropState.x=Math.min(0,Math.max(cropState.frameWidth-width,cropState.x));
    cropState.y=Math.min(0,Math.max(cropState.frameHeight-height,cropState.y));
  }

  function paintCrop() {
    const image=$('streamerCropImage');
    if(!image||!cropState.naturalWidth) return;
    const scale=cropState.minScale*cropState.zoom;
    image.style.width=`${cropState.naturalWidth*scale}px`;
    image.style.height=`${cropState.naturalHeight*scale}px`;
    image.style.transform=`translate3d(${cropState.x}px,${cropState.y}px,0)`;
    const slider=$('streamerCropZoom'); if(slider) slider.value=String(cropState.zoom);
    const output=CROP_OUTPUTS[cropState.mode];
    const info=$('streamerCropInfo'); if(info) info.textContent=`Saída: ${output.width} × ${output.height}px · zoom ${Math.round(cropState.zoom*100)}%`;
  }

  function centerCrop() {
    const scale=cropState.minScale*cropState.zoom;
    cropState.x=(cropState.frameWidth-cropState.naturalWidth*scale)/2;
    cropState.y=(cropState.frameHeight-cropState.naturalHeight*scale)/2;
    clampCropPosition(); paintCrop();
  }

  function setCropZoom(value) {
    const next=Math.min(3,Math.max(1,Number(value)||1));
    const oldScale=cropState.minScale*cropState.zoom;
    const newScale=cropState.minScale*next;
    const cx=cropState.frameWidth/2, cy=cropState.frameHeight/2;
    cropState.x=cx-(cx-cropState.x)*(newScale/oldScale);
    cropState.y=cy-(cy-cropState.y)*(newScale/oldScale);
    cropState.zoom=next; clampCropPosition(); paintCrop();
  }

  function fitCrop() { cropState.zoom=1; centerCrop(); }

  async function sourceToFile(source, name='streamer-original') {
    if(source instanceof File) return source;
    const response=await fetch(source,{mode:'cors'});
    if(!response.ok) throw new Error('Não foi possível carregar esta imagem para enquadramento.');
    const blob=await response.blob();
    return new File([blob],`${name}.${blob.type.split('/')[1]||'jpg'}`,{type:blob.type||'image/jpeg'});
  }

  async function openCropper(source, name='streamer-original', mode='poster') {
    const file=await sourceToFile(source,name);
    if(!file.type.startsWith('image/')) throw new Error('Selecione um ficheiro de imagem válido.');
    const modal=$('streamerCropModal'), frame=$('streamerCropFrame'), image=$('streamerCropImage');
    cropState.mode=mode==='home'?'home':'poster';
    modal.classList.toggle('is-home',cropState.mode==='home');
    $('streamerCropRatioLabel').textContent=CROP_OUTPUTS[cropState.mode].label;
    $('streamerCropTitle').textContent=cropState.mode==='home'?'Enquadrar imagem da Home':'Enquadrar arte do streamer';
    $('streamerCropFit').textContent=cropState.mode==='home'?'Restaurar enquadramento':'Ajustar';
    modal.hidden=false;
    const objectUrl=URL.createObjectURL(file);
    cropState.sourceFile=file; cropState.sourceName=name;
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));image.src=objectUrl;});
    URL.revokeObjectURL(objectUrl);
    cropState.naturalWidth=image.naturalWidth;cropState.naturalHeight=image.naturalHeight;
    cropState.frameWidth=frame.clientWidth;cropState.frameHeight=frame.clientHeight;
    cropState.minScale=Math.max(cropState.frameWidth/cropState.naturalWidth,cropState.frameHeight/cropState.naturalHeight);
    cropState.zoom=1;centerCrop();
  }

  function closeCropper({discard=false}={}) {
    $('streamerCropModal').hidden=true;
    cropState.dragging=false;
    if(discard&&cropState.mode==='poster'&&cropState.sourceFile===$('streamerPhotoFile')?.files?.[0]) $('streamerPhotoFile').value='';
    if(discard&&cropState.mode==='home'&&cropState.sourceFile===$('streamerHomeImageFile')?.files?.[0]) $('streamerHomeImageFile').value='';
    cropState.sourceFile=null;
  }

  async function saveCrop() {
    const image=$('streamerCropImage');
    const output=CROP_OUTPUTS[cropState.mode];
    const canvas=document.createElement('canvas');canvas.width=output.width;canvas.height=output.height;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#070b10';ctx.fillRect(0,0,canvas.width,canvas.height);
    const outputScale=canvas.width/cropState.frameWidth;
    const scale=cropState.minScale*cropState.zoom;
    ctx.drawImage(image,cropState.x*outputScale,cropState.y*outputScale,cropState.naturalWidth*scale*outputScale,cropState.naturalHeight*scale*outputScale);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));
    if(!blob) throw new Error('Não foi possível gerar a imagem final.');
    const croppedFile=new File([blob],`${cropState.sourceName.replace(/\.[^.]+$/,'')}-${output.suffix}.webp`,{type:'image/webp'});
    if(cropState.mode==='home'){
      pendingHomeOriginalFile=cropState.sourceFile;pendingHomeCroppedFile=croppedFile;
      if(pendingHomePreviewUrl)URL.revokeObjectURL(pendingHomePreviewUrl);
      pendingHomePreviewUrl=URL.createObjectURL(croppedFile);
      $('streamerHomeImageUrl').value='';$('streamerHomeImageFile').value='';setStreamerHomePreview(pendingHomePreviewUrl);
    }else{
      pendingOriginalFile=cropState.sourceFile;pendingCroppedFile=croppedFile;
      if(pendingPreviewUrl)URL.revokeObjectURL(pendingPreviewUrl);
      pendingPreviewUrl=URL.createObjectURL(croppedFile);
      $('streamerPhotoUrl').value='';$('streamerPhotoFile').value='';setStreamerPhotoPreview(pendingPreviewUrl);
    }
    closeCropper();feedback('Enquadramento guardado. Guarde o streamer para enviar ao storage.');
  }

  async function ensureAdmin() {
    const { data } = await sb.auth.getSession();
    currentSession = data.session;
    if (!currentSession) return false;
    const { data: profile } = await sb.from('profiles').select('role').eq('id', currentSession.user.id).single();
    currentProfile = profile;
    return ['master','admin'].includes(profile?.role);
  }

  function resetForm() {
    $('streamerAdminForm')?.reset();
    $('streamerId').value = '';
    $('streamerOrder').value = '100';
    $('streamerAllowEmbed').checked = true;
    $('streamerAllowChat').checked = true;
    $('streamerPublished').checked = true;
    clearStreamerPhoto();
    clearStreamerHome();
    editingPhotoUrl='';
    editingHomeImageUrl='';
    setScheduleRows([]);
    $('streamerEditorMode').textContent = 'NOVO STREAMER';
    $('streamerEditorTitle').textContent = 'Adicionar streamer';
    feedback('');
  }

  function openEditor(row=null) {
    pendingCroppedFile=null;pendingOriginalFile=null;
    if(pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    pendingPreviewUrl='';
    pendingHomeCroppedFile=null;pendingHomeOriginalFile=null;
    if(pendingHomePreviewUrl)URL.revokeObjectURL(pendingHomePreviewUrl);
    pendingHomePreviewUrl='';
    $('streamerEditor').hidden = false;
    $('streamerAdminPreview').hidden = true;
    if (!row) {
      resetForm();
    } else {
      editingPhotoUrl=row.photo_url||'';
      editingHomeImageUrl=row.home_card_photo_url||'';
      $('streamerEditorMode').textContent = 'EDITAR STREAMER';
      $('streamerEditorTitle').textContent = row.display_name || 'Streamer';
      $('streamerId').value = row.id;
      Object.entries(fields).forEach(([key,id]) => {
        const el=$(id); if(el) el.value = row[key] ?? '';
      });
      Object.entries(boolFields).forEach(([key,id]) => {
        const el=$(id); if(el) el.checked = Boolean(row[key]);
      });
      setStreamerPhotoPreview(row.photo_url || '');
      $('streamerHomeImageUrl').value=row.home_card_photo_url||'';
      setStreamerHomePreview(row.home_card_photo_url||'');
      setScheduleRows(row.schedule_json || []);
      feedback('');
    }
    $('streamerEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function closeEditor() {
    $('streamerEditor').hidden = true;
    $('streamerAdminPreview').hidden = true;
  }

  function socialButtons(row) {
    const links = [
      ['TikTok',row.tiktok_url],['Twitch',row.twitch_url],
      ['YouTube',row.youtube_url],['Instagram',row.instagram_url]
    ].filter(([,url])=>url);
    return links.map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener">${name}</a>`).join('');
  }

  function previewHTML(row) {
    const live = row.force_live || row.manual_live || row.auto_live;
    const details = [
      row.game_nickname ? `<span><small>Nick</small>${esc(row.game_nickname)}</span>`:'',
      row.main_game ? `<span><small>Jogo</small>${esc(row.main_game)}</span>`:''
    ].join('');
    return `<article class="streamer-preview-card">
      ${row.photo_url?`<img src="${esc(row.photo_url)}" alt="">`:''}
      <div>
        <div class="streamer-preview-top">${live?'<b>● AO VIVO</b>':''}${row.is_featured?'<em>DESTAQUE</em>':''}</div>
        <h3>${esc(row.display_name || 'Streamer')}</h3>
        ${row.title?`<strong>${esc(row.title)}</strong>`:''}
        ${row.description?`<p>${esc(row.description)}</p>`:''}
        ${details?`<div class="streamer-preview-details">${details}</div>`:''}
        <div class="streamer-preview-socials">${socialButtons(row)}</div>
      </div>
    </article>`;
  }

  function normalizeTikTokIdentity(row) {
    const raw = String(row.tiktok_url || row.live_url || '').trim();
    if (!raw) return row;

    let handle = '';
    const fromUrl = raw.match(/tiktok\.com\/@([A-Za-z0-9._-]+)/i);
    if (fromUrl?.[1]) handle = fromUrl[1];
    else if (/^@[A-Za-z0-9._-]+$/.test(raw)) handle = raw.slice(1);
    else if (/^[A-Za-z0-9._-]+$/.test(raw)) handle = raw;

    handle = handle.replace(/^@/, '').trim();
    if (!handle) return row;

    row.tiktok_url = `https://www.tiktok.com/@${handle}`;
    row.live_url = `https://www.tiktok.com/@${handle}/live`;
    row.live_platform = 'tiktok';
    return row;
  }

  function collectForm() {
    const row = {};
    Object.entries(fields).forEach(([key,id]) => {
      const value=$(id)?.value?.trim?.() ?? '';
      row[key] = key==='display_order' ? Number(value || 100) : (value || null);
    });
    Object.entries(boolFields).forEach(([key,id]) => row[key]=Boolean($(id)?.checked));
    row.schedule_json = collectScheduleRows();
    row.auto_live = false;
    const homeImageUrl=$('streamerHomeImageUrl')?.value?.trim()||null;
    if(homeImageUrl||editingHomeImageUrl||pendingHomeCroppedFile){
      row.home_card_photo_url=homeImageUrl;
      row.home_image_position_x=50;
      row.home_image_position_y=50;
      row.home_image_scale=1;
    }
    return normalizeTikTokIdentity(row);
  }

  async function uploadPhoto(file, originalFile=null, kind='poster') {
    if (!file) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${currentSession.user.id}/${kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('streamer-images').upload(path,file,{upsert:false});
    if(error) throw error;
    if(originalFile){
      const originalExt=originalFile.name.split('.').pop()?.toLowerCase()||'jpg';
      const originalPath=`${currentSession.user.id}/${kind}/originals/${crypto.randomUUID()}.${originalExt}`;
      const originalResult=await sb.storage.from('streamer-images').upload(originalPath,originalFile,{upsert:false});
      if(originalResult.error) console.warn('[Streamers] O original não foi preservado:',originalResult.error.message);
    }
    return sb.storage.from('streamer-images').getPublicUrl(path).data.publicUrl;
  }

  async function saveStreamer(event) {
    event.preventDefault();
    if (!(await ensureAdmin())) return feedback('Apenas Admin ou Admin Master pode guardar.',true);

    const row=collectForm();
    if(!row.display_name) return feedback('Preencha o nome de exibição.',true);
    if(row.photo_url && row.photo_url!==editingPhotoUrl && !pendingCroppedFile) return feedback('Abra “Enquadrar” e salve o poster 2:3 antes de guardar.',true);

    const file=pendingCroppedFile;
    const homeFile=pendingHomeCroppedFile;
    const imageChanged=Boolean(file||homeFile);
    try {
      if(homeFile||row.home_card_photo_url){
        const schemaCheck=await sb.from('streamers').select('home_card_photo_url,home_image_position_x,home_image_position_y,home_image_scale').limit(1);
        if(schemaCheck.error&&/home_image_/i.test(schemaCheck.error.message||'')){
          return feedback('A imagem Home requer a migration V102 documentada antes do upload.',true);
        }
      }
      if(file) row.photo_url = await uploadPhoto(file,pendingOriginalFile,'poster');
      if(homeFile){
        row.home_card_photo_url=await uploadPhoto(homeFile,pendingHomeOriginalFile,'home');
        row.home_image_position_x=50;row.home_image_position_y=50;row.home_image_scale=1;
      }

      const id=$('streamerId').value;
      let response;
      if(id){
        row.updated_by=currentSession.user.id;
        row.updated_at=new Date().toISOString();
        response=await sb.from('streamers').update(row).eq('id',id).select().single();
      } else {
        row.created_by=currentSession.user.id;
        row.updated_by=currentSession.user.id;
        response=await sb.from('streamers').insert(row).select().single();
      }

      if(response.error) throw response.error;
      if(file&&!response.data?.photo_url) throw new Error('O URL do poster não foi persistido.');
      if(homeFile&&!response.data?.home_card_photo_url) throw new Error('O URL da imagem Home não foi persistido.');
      feedback(imageChanged?'Imagem atualizada com sucesso ✓':'Streamer guardado com sucesso.');
      pendingCroppedFile=null;pendingOriginalFile=null;
      pendingHomeCroppedFile=null;pendingHomeOriginalFile=null;
      if(pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      pendingPreviewUrl='';
      if(pendingHomePreviewUrl)URL.revokeObjectURL(pendingHomePreviewUrl);
      pendingHomePreviewUrl='';
      await loadStreamers();
      window.setTimeout(closeEditor,700);
    } catch(error) {
      const missingHomeColumn=/home_image_/i.test(error.message||'');
      feedback(missingHomeColumn?'A imagem Home requer a migration V102 documentada antes de guardar.':(imageChanged?'Não foi possível guardar a imagem.':(error.message || 'Erro ao guardar streamer.')),true);
    }
  }

  async function archiveStreamer(id, archived) {
    if (!(await ensureAdmin())) return;
    const { error } = await sb.from('streamers').update({
      is_archived:archived,
      is_published: archived ? false : true,
      updated_by:currentSession.user.id,
      updated_at:new Date().toISOString()
    }).eq('id',id);
    if(error) alert(error.message); else loadStreamers();
  }

  async function makeFeatured(id) {
    if (!(await ensureAdmin())) return;
    await sb.from('streamers').update({is_featured:false}).neq('id',id);
    const { error }=await sb.from('streamers').update({
      is_featured:true,
      updated_by:currentSession.user.id,
      updated_at:new Date().toISOString()
    }).eq('id',id);
    if(error) alert(error.message); else loadStreamers();
  }

  function renderList() {
    const box=$('streamersSupabaseList');
    if(!box) return;
    if(!currentRows.length){
      box.innerHTML='<p class="hint">Nenhum streamer adicionado ainda.</p>';
      return;
    }
    box.innerHTML=currentRows.map(row=>{
      const live=row.force_live||row.manual_live||row.auto_live;
      return `<article class="streamer-admin-row ${row.is_archived?'is-archived':''}">
        <div class="streamer-admin-identity">
          ${row.photo_url?`<img src="${esc(row.photo_url)}" alt="">`:'<span>🎥</span>'}
          <div>
            <strong>${esc(row.display_name)}</strong>
            <small>${esc(row.main_game||row.title||'Streamer')}</small>
          </div>
        </div>
        <div class="streamer-admin-flags">
          ${live?'<b>AO VIVO</b>':''}
          ${row.is_featured?'<em>DESTAQUE</em>':''}
          ${row.is_archived?'<i>ARQUIVADO</i>':row.is_published?'<i>PUBLICADO</i>':'<i>OCULTO</i>'}
        </div>
        <div class="streamer-admin-actions">
          <button data-edit="${row.id}">Editar</button>
          ${!row.is_featured&&!row.is_archived?`<button data-feature="${row.id}">Destacar</button>`:''}
          ${row.is_archived?`<button data-restore="${row.id}">Restaurar</button>`:`<button data-archive="${row.id}">Arquivar</button>`}
        </div>
      </article>`;
    }).join('');

    box.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>openEditor(currentRows.find(r=>r.id===btn.dataset.edit)));
    box.querySelectorAll('[data-feature]').forEach(btn=>btn.onclick=()=>makeFeatured(btn.dataset.feature));
    box.querySelectorAll('[data-archive]').forEach(btn=>btn.onclick=()=>confirm('Arquivar este streamer?')&&archiveStreamer(btn.dataset.archive,true));
    box.querySelectorAll('[data-restore]').forEach(btn=>btn.onclick=()=>archiveStreamer(btn.dataset.restore,false));
  }

  async function loadStreamers() {
    const box=$('streamersSupabaseList');
    if(box) box.innerHTML='<p class="hint">Carregando streamers...</p>';
    const allowed=await ensureAdmin();
    if(!allowed){
      if(box) box.innerHTML='<p class="hint">Entre com uma conta Admin para gerir streamers.</p>';
      return;
    }
    const { data,error }=await sb.from('streamers').select('*').order('is_archived').order('display_order').order('created_at');
    if(error){ if(box) box.innerHTML=`<p class="hint">${esc(error.message)}</p>`; return; }
    currentRows=data||[];
    renderList();
  }

  $('newStreamerBtn')?.addEventListener('click',()=>openEditor());
  $('closeStreamerEditor')?.addEventListener('click',closeEditor);
  $('cancelStreamerBtn')?.addEventListener('click',closeEditor);
  $('refreshStreamersBtn')?.addEventListener('click',loadStreamers);
  $('streamerAdminForm')?.addEventListener('submit',saveStreamer);
  $('previewStreamerBtn')?.addEventListener('click',()=>{
    const row=collectForm();
    const preview=$('streamerAdminPreview');
    preview.innerHTML=previewHTML(row);
    preview.hidden=false;
  });
  $('streamerPhotoUrl')?.addEventListener('input',event=>{
    const url=event.target.value.trim();
    if (url) $('streamerPhotoFile').value = '';
    pendingCroppedFile=null;pendingOriginalFile=null;
    if(pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    pendingPreviewUrl='';
    setStreamerPhotoPreview(url);
  });

  $('streamerPhotoFile')?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    if(!file) return;
    $('streamerPhotoUrl').value = '';
    openCropper(file,file.name).catch(error=>{event.target.value='';feedback(error.message||'Não foi possível abrir o enquadramento.',true);});
  });

  $('cropStreamerPhotoUrlBtn')?.addEventListener('click',()=>{
    const url=$('streamerPhotoUrl')?.value?.trim();
    if(!url) return feedback('Cole primeiro o link de uma imagem.',true);
    openCropper(url,'streamer-link').catch(error=>feedback(error.message||'A imagem remota não permite enquadramento.',true));
  });

  $('recropStreamerPhotoBtn')?.addEventListener('click',()=>{
    const source=pendingCroppedFile||$('streamerPhotoUrl')?.value?.trim()||$('streamerPhotoPreview')?.src;
    if(!source) return feedback('Não existe imagem para reenquadrar.',true);
    openCropper(source,pendingCroppedFile?.name||'streamer-atual').catch(error=>feedback(error.message||'Não foi possível reabrir a imagem.',true));
  });

  $('streamerHomeImageUrl')?.addEventListener('input',event=>{
    const url=event.target.value.trim();
    if(url)$('streamerHomeImageFile').value='';
    pendingHomeCroppedFile=null;pendingHomeOriginalFile=null;
    if(pendingHomePreviewUrl)URL.revokeObjectURL(pendingHomePreviewUrl);
    pendingHomePreviewUrl='';setStreamerHomePreview(url);
  });

  $('streamerHomeImageFile')?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    $('streamerHomeImageUrl').value='';
    openCropper(file,file.name,'home').catch(error=>{event.target.value='';feedback(error.message||'Não foi possível abrir o enquadramento Home.',true);});
  });

  $('cropStreamerHomeUrlBtn')?.addEventListener('click',()=>{
    const url=$('streamerHomeImageUrl')?.value?.trim();
    if(!url)return feedback('Cole primeiro o link da imagem Home.',true);
    openCropper(url,'streamer-home-link','home').catch(error=>feedback(error.message||'A imagem remota não permite enquadramento.',true));
  });

  $('recropStreamerHomeBtn')?.addEventListener('click',()=>{
    const source=pendingHomeCroppedFile||$('streamerHomeImageUrl')?.value?.trim()||$('streamerHomePreviewImage')?.src;
    if(!source)return feedback('Não existe imagem Home para reenquadrar.',true);
    openCropper(source,pendingHomeCroppedFile?.name||'streamer-home-atual','home').catch(error=>feedback(error.message||'Não foi possível reabrir a imagem Home.',true));
  });

  $('clearStreamerHomeBtn')?.addEventListener('click',()=>{
    clearStreamerHome();
    feedback('Imagem Home removida do formulário. Salve para aplicar.',false);
  });

  $('streamerCropZoom')?.addEventListener('input',event=>setCropZoom(event.target.value));
  $('streamerCropZoomOut')?.addEventListener('click',()=>setCropZoom(cropState.zoom-.1));
  $('streamerCropZoomIn')?.addEventListener('click',()=>setCropZoom(cropState.zoom+.1));
  $('streamerCropCenter')?.addEventListener('click',centerCrop);
  $('streamerCropFit')?.addEventListener('click',fitCrop);
  $('streamerCropSave')?.addEventListener('click',()=>saveCrop().catch(error=>feedback(error.message||'Falha ao guardar o enquadramento.',true)));
  $('streamerCropCancel')?.addEventListener('click',()=>closeCropper({discard:true}));
  $('streamerCropClose')?.addEventListener('click',()=>closeCropper({discard:true}));
  $('streamerCropModal')?.addEventListener('pointerdown',event=>{if(event.target===event.currentTarget)closeCropper({discard:true});});
  const cropFrame=$('streamerCropFrame');
  cropFrame?.addEventListener('pointerdown',event=>{cropState.dragging=true;cropState.startX=event.clientX;cropState.startY=event.clientY;cropState.originX=cropState.x;cropState.originY=cropState.y;cropFrame.setPointerCapture(event.pointerId);cropFrame.classList.add('is-dragging');});
  cropFrame?.addEventListener('pointermove',event=>{if(!cropState.dragging)return;cropState.x=cropState.originX+(event.clientX-cropState.startX);cropState.y=cropState.originY+(event.clientY-cropState.startY);clampCropPosition();paintCrop();});
  const finishCropDrag=event=>{if(!cropState.dragging)return;cropState.dragging=false;cropFrame.classList.remove('is-dragging');if(cropFrame.hasPointerCapture?.(event.pointerId))cropFrame.releasePointerCapture(event.pointerId);};
  cropFrame?.addEventListener('pointerup',finishCropDrag);cropFrame?.addEventListener('pointercancel',finishCropDrag);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('streamerCropModal')?.hidden)closeCropper({discard:true});});

  $('clearStreamerPhotoBtn')?.addEventListener('click',()=>{
    clearStreamerPhoto();
    feedback('Foto removida do formulário. Salve para aplicar.', false);
  });

  $('addStreamerScheduleBtn')?.addEventListener('click',()=>{
    scheduleRows.push(normalizeScheduleRow());
    renderScheduleRows();
  });

  let adminRefreshTimer = null;

  function scheduleAdminRefresh() {
    clearTimeout(adminRefreshTimer);
    adminRefreshTimer = setTimeout(loadStreamers, 150);
  }

  function startAdminCloudSync() {
    sb.channel('admin-streamers-cloud-v85')
      .on('postgres_changes', { event:'*', schema:'public', table:'streamers' }, scheduleAdminRefresh)
      .subscribe();

    setInterval(() => {
      if (!document.hidden) loadStreamers();
    }, 15000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadStreamers();
    });

    window.addEventListener('focus', loadStreamers);
  }

  async function bootAdminStreamers() {
    await loadStreamers();
    startAdminCloudSync();
  }

  window.TeamStreamerCropper = Object.freeze({
    outputs:structuredClone(CROP_OUTPUTS),
    coverScale:(imageWidth,imageHeight,frameWidth,frameHeight)=>Math.max(frameWidth/imageWidth,frameHeight/imageHeight)
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootAdminStreamers);
  else bootAdminStreamers();
})();
