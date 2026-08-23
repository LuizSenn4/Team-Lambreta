(() => {
  'use strict';
  if (window.__TL_ADMIN_MODULES_V102__) return;
  window.__TL_ADMIN_MODULES_V102__ = true;

  const sb = window.teamSupabase;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => v ? new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : '—';
  const mounts = {
    team:'adminV102TeamMount', streamers:'adminV102StreamersMount', forum:'adminV102ForumMount', eventos:'adminV102EventsMount',
    loja:'adminV102StoreMount', midia:'adminV102MediaMount', usuarios:'adminV102UsersMount', config:'adminV102ConfigMount'
  };

  const schemas = {
    team:{table:'team_members', title:'Membro', order:'display_order', fields:[
      ['name','Nome','text'],['nickname','Nickname','text'],['role','Cargo','text'],['country','País','text'],['main_game','Jogo principal','text'],['bio','Bio','textarea'],['image_url','Imagem URL','url'],['is_published','Publicado','checkbox'],['is_featured','Destaque','checkbox'],['display_order','Ordem','number']
    ]},
    streamers:{table:'streamers', title:'Streamer', order:'display_order', fields:[
      ['display_name','Nome','text'],['game_nickname','Nick no jogo','text'],['main_game','Jogo','text'],['title','Título','text'],['description','Descrição','textarea'],['photo_url','Foto URL','url'],['tiktok_url','TikTok','url'],['twitch_url','Twitch','url'],['youtube_url','YouTube','url'],['instagram_url','Instagram','url'],['live_url','URL da live','url'],['manual_live','Live manual','checkbox'],['force_live','Forçar live','checkbox'],['is_published','Publicado','checkbox'],['is_featured','Destaque','checkbox'],['display_order','Ordem','number']
    ]},
    eventos:{table:'site_events', title:'Evento', order:'event_date', desc:true, fields:[
      ['title','Título','text'],['description','Descrição','textarea'],['event_date','Data','datetime-local'],['image_url','Imagem URL','url'],['status','Estado','select',['draft','published','archived']]
    ]},
    loja:{table:'site_store_products', title:'Produto', order:'display_order', fields:[
      ['name','Nome','text'],['description','Descrição','textarea'],['price','Preço €','number'],['category','Categoria','text'],['image_url','Imagem URL','url'],['product_url','Link do produto','url'],['is_published','Publicado','checkbox'],['display_order','Ordem','number']
    ]},
    midia:{table:'site_media_items', title:'Mídia', order:'display_order', fields:[
      ['title','Título','text'],['description','Descrição','textarea'],['media_type','Tipo','select',['photo','video','short']],['image_url','Capa URL','url'],['media_url','Mídia URL','url'],['is_published','Publicado','checkbox'],['display_order','Ordem','number']
    ]}
  };

  function input(field, value='') {
    const [key,label,type,options] = field;
    const id = `adm_${key}_${Math.random().toString(36).slice(2,7)}`;
    if (type === 'textarea') return `<label>${esc(label)}<textarea data-field="${key}" id="${id}" rows="4">${esc(value||'')}</textarea></label>`;
    if (type === 'checkbox') return `<label class="adm-check"><input data-field="${key}" id="${id}" type="checkbox" ${value ? 'checked' : ''}>${esc(label)}</label>`;
    if (type === 'select') return `<label>${esc(label)}<select data-field="${key}" id="${id}">${options.map(o=>`<option value="${esc(o)}" ${String(value)===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
    let val = value ?? '';
    if (type === 'datetime-local' && val) { try { val = new Date(val).toISOString().slice(0,16); } catch (_) {} }
    return `<label>${esc(label)}<input data-field="${key}" id="${id}" type="${type}" value="${esc(val)}" ${type==='number'?'step="any"':''}></label>`;
  }

  function readForm(form, spec) {
    const row = {};
    spec.fields.forEach(([key,,type]) => {
      const el = form.querySelector(`[data-field="${key}"]`);
      if (!el) return;
      let v = type === 'checkbox' ? el.checked : el.value.trim();
      if (type === 'number') v = v === '' ? 0 : Number(v);
      if (type === 'datetime-local') v = v ? new Date(v).toISOString() : null;
      row[key] = v;
    });
    return row;
  }

  async function loadCrud(key) {
    const spec = schemas[key], mount = document.getElementById(mounts[key]); if (!spec || !mount) return;
    mount.innerHTML = '<div class="adm-loading">A carregar…</div>';
    let query = sb.from(spec.table).select('*').limit(100);
    if (spec.order) query = query.order(spec.order,{ascending:!spec.desc});
    const {data,error} = await query;
    if (error) return mount.innerHTML = `<div class="adm-error">${esc(error.message)}</div>`;
    renderCrud(key, data || []);
  }

  function renderCrud(key, rows) {
    const spec = schemas[key], mount = document.getElementById(mounts[key]);
    mount.innerHTML = `<div class="adm-toolbar"><button type="button" class="adm-primary" data-new>+ Novo ${esc(spec.title)}</button><button type="button" data-refresh>Atualizar</button><span>${rows.length} registo(s)</span></div><div class="adm-list"></div><div class="adm-editor" hidden></div>`;
    const list = mount.querySelector('.adm-list'), editor = mount.querySelector('.adm-editor');
    list.innerHTML = rows.length ? rows.map((row,i)=>{
      const name = row.name || row.display_name || row.title || row.nickname || row.id;
      const state = ('is_published' in row) ? (row.is_published?'Publicado':'Oculto') : (row.status || '');
      return `<button class="adm-row" type="button" data-index="${i}"><span><strong>${esc(name)}</strong><small>${esc(state)}</small></span><b>Editar →</b></button>`;
    }).join('') : '<div class="adm-empty">Ainda não há registos.</div>';

    const open = row => {
      editor.hidden = false;
      editor.innerHTML = `<form class="adm-form"><div class="adm-form-grid">${spec.fields.map(f=>input(f,row?.[f[0]])).join('')}</div><div class="adm-form-actions"><button class="adm-primary" type="submit">Guardar</button>${row?.id?'<button class="adm-danger" type="button" data-delete>Apagar</button>':''}<button type="button" data-cancel>Cancelar</button></div><p class="adm-feedback"></p></form>`;
      const form = editor.querySelector('form'), feedback = form.querySelector('.adm-feedback');
      form.addEventListener('submit', async e => {
        e.preventDefault(); feedback.textContent='A guardar…';
        const payload = readForm(form,spec);
        let result;
        if (row?.id) result = await sb.from(spec.table).update({...payload,updated_at:new Date().toISOString()}).eq('id',row.id).select().single();
        else result = await sb.from(spec.table).insert(payload).select().single();
        if (result.error) { feedback.textContent=result.error.message; feedback.className='adm-feedback is-error'; return; }
        feedback.textContent='Guardado.'; setTimeout(()=>loadCrud(key),250);
      });
      form.querySelector('[data-cancel]')?.addEventListener('click',()=>editor.hidden=true);
      form.querySelector('[data-delete]')?.addEventListener('click', async ()=>{
        if (!confirm(`Apagar ${spec.title.toLowerCase()}?`)) return;
        const {error}=await sb.from(spec.table).delete().eq('id',row.id);
        if (error) { feedback.textContent=error.message; feedback.className='adm-feedback is-error'; return; }
        loadCrud(key);
      });
      editor.scrollIntoView({behavior:'smooth',block:'start'});
    };
    list.querySelectorAll('[data-index]').forEach(btn=>btn.addEventListener('click',()=>open(rows[Number(btn.dataset.index)])));
    mount.querySelector('[data-new]')?.addEventListener('click',()=>open(null));
    mount.querySelector('[data-refresh]')?.addEventListener('click',()=>loadCrud(key));
  }

  async function loadForum() {
    const mount=document.getElementById(mounts.forum); if(!mount)return;
    const {data,error}=await sb.from('forum_topics').select('id,title,status,is_pinned,is_locked,created_at').order('created_at',{ascending:false}).limit(50);
    if(error)return mount.innerHTML=`<div class="adm-error">${esc(error.message)}</div>`;
    mount.innerHTML=`<div class="adm-toolbar"><button type="button" data-refresh>Atualizar</button><span>${data.length} tópicos recentes</span></div><div class="adm-list">${data.map(row=>`<article class="adm-forum-row"><div><strong>${esc(row.title)}</strong><small>${esc(row.status)} · ${fmt(row.created_at)}</small></div><div><button data-approve="${esc(row.id)}">Aprovar</button><button data-pin="${esc(row.id)}">${row.is_pinned?'Desafixar':'Fixar'}</button><button data-lock="${esc(row.id)}">${row.is_locked?'Desbloquear':'Bloquear'}</button></div></article>`).join('')}</div>`;
    mount.querySelector('[data-refresh]').onclick=loadForum;
    mount.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{const {error}=await sb.rpc('tl_forum_approve_topic',{p_topic_key:b.dataset.approve}); if(error)alert(error.message); else loadForum();});
    mount.querySelectorAll('[data-pin]').forEach(b=>b.onclick=async()=>{const row=data.find(x=>x.id===b.dataset.pin); const {error}=await sb.from('forum_topics').update({is_pinned:!row.is_pinned}).eq('id',row.id); if(error)alert(error.message); else loadForum();});
    mount.querySelectorAll('[data-lock]').forEach(b=>b.onclick=async()=>{const row=data.find(x=>x.id===b.dataset.lock); const {error}=await sb.from('forum_topics').update({is_locked:!row.is_locked,is_closed:!row.is_locked}).eq('id',row.id); if(error)alert(error.message); else loadForum();});
  }

  async function loadUsers(){
    const mount=document.getElementById(mounts.usuarios); if(!mount)return;
    const {data,error}=await sb.from('profiles').select('id,email,full_name,game_nickname,game_nickname_public,role,presence,is_banned,last_seen').order('last_seen',{ascending:false}).limit(100);
    if(error)return mount.innerHTML=`<div class="adm-error">${esc(error.message)}</div>`;
    const roles=['member','supporter','vip','streamer','staff','moderator','admin','master'];
    mount.innerHTML=`<div class="adm-toolbar"><button data-refresh>Atualizar</button><span>${data.length} utilizadores</span></div><div class="adm-users">${data.map(u=>`<article class="adm-user-row"><div><strong>${esc(u.game_nickname_public||u.game_nickname||u.full_name||u.email)}</strong><small>${esc(u.email||'')} · ${esc(u.presence||'offline')}</small></div><select data-role-user="${u.id}">${roles.map(r=>`<option value="${r}" ${String(u.role)===r?'selected':''}>${r}</option>`).join('')}</select></article>`).join('')}</div>`;
    mount.querySelector('[data-refresh]').onclick=loadUsers;
    mount.querySelectorAll('[data-role-user]').forEach(sel=>sel.onchange=async()=>{const {error}=await sb.rpc('set_team_role',{target_user_id:sel.dataset.roleUser,new_role:sel.value}); if(error){alert(error.message);loadUsers();}});
  }

  async function loadConfig(){
    const mount=document.getElementById(mounts.config); if(!mount)return;
    const {data,error}=await sb.from('site_settings').select('*').order('key');
    if(error)return mount.innerHTML=`<div class="adm-error">${esc(error.message)}</div>`;
    mount.innerHTML=`<form class="adm-config-form"><label>Chave<input id="admConfigKey" placeholder="ex: site_title"></label><label>Valor JSON<textarea id="admConfigValue" rows="5" placeholder='{"text":"Team Lambreta"}'></textarea></label><button class="adm-primary" type="submit">Guardar configuração</button><p class="adm-feedback"></p></form><div class="adm-list">${data.map(r=>`<button type="button" class="adm-row" data-config="${esc(r.key)}"><span><strong>${esc(r.key)}</strong><small>${esc(JSON.stringify(r.value))}</small></span><b>Editar →</b></button>`).join('')}</div>`;
    const form=mount.querySelector('form'),key=form.querySelector('#admConfigKey'),val=form.querySelector('#admConfigValue'),fb=form.querySelector('.adm-feedback');
    mount.querySelectorAll('[data-config]').forEach(b=>b.onclick=()=>{const r=data.find(x=>x.key===b.dataset.config);key.value=r.key;val.value=JSON.stringify(r.value,null,2);});
    form.onsubmit=async e=>{e.preventDefault();let parsed;try{parsed=JSON.parse(val.value||'{}')}catch(_){fb.textContent='JSON inválido.';return}const {error}=await sb.from('site_settings').upsert({key:key.value.trim(),value:parsed,updated_at:new Date().toISOString()});fb.textContent=error?error.message:'Guardado.';if(!error)setTimeout(loadConfig,250)};
  }

  function loadSection(key){
    if(schemas[key]) return loadCrud(key);
    if(key==='forum') return loadForum();
    if(key==='usuarios') return loadUsers();
    if(key==='config') return loadConfig();
  }

  window.addEventListener('tl:admin-v102-ready',()=>{
    Object.keys(mounts).forEach(key=>loadSection(key));
    const mediaSection=document.querySelector('[data-admin-section="midia"]');
    if(mediaSection&&!document.querySelector('[data-section="conquistas"]')){
      const btn=document.createElement('button');btn.dataset.section='conquistas';btn.textContent='Conquistas';document.getElementById('adminV102Nav')?.insertBefore(btn,document.querySelector('#adminV102Nav [data-section="usuarios"]'));
    }
  });
})();