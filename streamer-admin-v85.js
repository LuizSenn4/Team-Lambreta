(() => {
  const URL = 'https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY = 'sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb = window.supabase?.createClient(URL, KEY);
  if (!sb) return;

  const $ = id => document.getElementById(id);
  let currentSession = null;
  let currentProfile = null;
  let currentRows = [];
  let scheduleRows = [];

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
    setStreamerPhotoPreview('');
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
    setScheduleRows([]);
    $('streamerEditorMode').textContent = 'NOVO STREAMER';
    $('streamerEditorTitle').textContent = 'Adicionar streamer';
    feedback('');
  }

  function openEditor(row=null) {
    $('streamerEditor').hidden = false;
    $('streamerAdminPreview').hidden = true;
    if (!row) {
      resetForm();
    } else {
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
    return normalizeTikTokIdentity(row);
  }

  async function uploadPhoto(file) {
    if (!file) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${currentSession.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('streamer-images').upload(path,file,{upsert:false});
    if(error) throw error;
    return sb.storage.from('streamer-images').getPublicUrl(path).data.publicUrl;
  }

  async function saveStreamer(event) {
    event.preventDefault();
    if (!(await ensureAdmin())) return feedback('Apenas Admin ou Admin Master pode guardar.',true);

    const row=collectForm();
    if(!row.display_name) return feedback('Preencha o nome de exibição.',true);

    const file=$('streamerPhotoFile')?.files?.[0];
    try {
      if(file) row.photo_url = await uploadPhoto(file);

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
      feedback('Streamer guardado com sucesso.');
      await loadStreamers();
      window.setTimeout(closeEditor,700);
    } catch(error) {
      feedback(error.message || 'Erro ao guardar streamer.',true);
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
    setStreamerPhotoPreview(url);
  });

  $('streamerPhotoFile')?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    if(!file) return;
    $('streamerPhotoUrl').value = '';
    setStreamerPhotoPreview(URL.createObjectURL(file));
  });

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

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootAdminStreamers);
  else bootAdminStreamers();
})();
