(()=>{
  'use strict';
  if(window.TLForumProfileEnhancementsLoaded)return;
  window.TLForumProfileEnhancementsLoaded=true;

  const MAX_BYTES=2*1024*1024;
  const TARGET_SIZE=512;
  const MAX_MODES_PER_GAME=10;
  const customModes=new Map();
  const selectedCustom=new Set();
  let syncing=false;

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const feedback=(message,error=false)=>{
    const host=$('forumProfileFeedback');
    if(!host)return;
    host.textContent=message;
    host.classList.toggle('is-error',error);
  };
  const modeKey=(slug,mode)=>`${slug}::${mode}`;
  const cleanMode=value=>String(value||'').trim().replace(/\s+/g,' ');
  const validMode=value=>{
    const mode=cleanMode(value);
    return mode.length>=2&&mode.length<=32&&/^[\p{L}\p{N}][\p{L}\p{N} ._+\-/'&()]{1,31}$/u.test(mode);
  };

  function ensureStyle(){
    if(document.getElementById('tl-forum-profile-enhancements-style'))return;
    const s=document.createElement('style');
    s.id='tl-forum-profile-enhancements-style';
    s.textContent=`
      .forum-avatar-auto-note{display:block;margin-top:6px;color:#82d9a0;font-size:11px;line-height:1.45}
      .forum-custom-mode-tools{display:grid;grid-template-columns:minmax(140px,.7fr) minmax(170px,1fr) auto;gap:8px;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid rgba(200,164,72,.18)}
      .forum-custom-mode-tools select,.forum-custom-mode-tools input{min-width:0;width:100%;height:38px;border:1px solid rgba(128,170,140,.34);border-radius:9px;background:#0a100c;color:#eef6ef;padding:0 10px;font:600 12px inherit}
      .forum-custom-mode-tools button{height:38px;border:1px solid rgba(115,255,24,.4);border-radius:9px;background:#102017;color:#8dff61;padding:0 13px;font-weight:800;cursor:pointer;white-space:nowrap}
      .forum-custom-mode-section{margin-top:10px}.forum-custom-mode-section>strong{display:block;margin-bottom:7px;color:#d8c27a;font-size:12px}.forum-custom-mode-section .forum-choice-chip span::after{content:' · personalizado';opacity:.55;font-size:9px}
      html[data-theme="light"] .forum-custom-mode-tools select,html[data-theme="light"] .forum-custom-mode-tools input{background:#fffdf7;color:#182019;border-color:rgba(48,85,56,.28)}
      html[data-theme="light"] .forum-custom-mode-tools button{background:#eef7ea;color:#176c2b;border-color:rgba(23,108,43,.3)}
      @media(max-width:680px){.forum-custom-mode-tools{grid-template-columns:1fr}.forum-custom-mode-tools button{width:100%}}
    `;
    document.head.appendChild(s);
  }

  function dataUrlImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível ler esta imagem.'))};
      img.src=url;
    });
  }

  function canvasBlob(canvas,type,quality){
    return new Promise(resolve=>canvas.toBlob(resolve,type,quality));
  }

  async function optimizeAvatar(file){
    if(!file)return null;
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Use uma imagem JPG, PNG, WebP ou GIF.');
    if(file.type==='image/gif'){
      if(file.size>MAX_BYTES)throw new Error('GIF animado não pode ser reduzido automaticamente. Use um GIF de até 2 MB ou JPG/PNG/WebP.');
      return file;
    }
    const img=await dataUrlImage(file);
    const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height;
    if(!sw||!sh)throw new Error('Imagem inválida.');
    const side=Math.min(sw,sh),sx=Math.max(0,(sw-side)/2),sy=Math.max(0,(sh-side)/2);
    const canvas=document.createElement('canvas');
    canvas.width=TARGET_SIZE;canvas.height=TARGET_SIZE;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#050705';ctx.fillRect(0,0,TARGET_SIZE,TARGET_SIZE);
    ctx.drawImage(img,sx,sy,side,side,0,0,TARGET_SIZE,TARGET_SIZE);
    let blob=null;
    for(const q of [.9,.82,.74,.66,.58,.5]){
      blob=await canvasBlob(canvas,'image/webp',q);
      if(blob&&blob.size<=MAX_BYTES)break;
    }
    if(!blob)throw new Error('Não foi possível otimizar a imagem.');
    if(blob.size>MAX_BYTES)throw new Error('A imagem continua acima de 2 MB mesmo após otimização.');
    const base=(file.name||'avatar').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').slice(0,60)||'avatar';
    return new File([blob],`${base}-512.webp`,{type:'image/webp',lastModified:Date.now()});
  }

  async function handleAvatar(fileInput){
    const file=fileInput.files?.[0];
    if(!file||fileInput.dataset.optimizing==='1')return;
    const form=$('forumProfileForm');
    fileInput.dataset.optimizing='1';
    if(form)form.dataset.avatarOptimizing='1';
    feedback('Otimizando imagem para 512 × 512 e até 2 MB…');
    try{
      const optimized=await optimizeAvatar(file);
      if(!optimized)return;
      const dt=new DataTransfer();dt.items.add(optimized);fileInput.files=dt.files;
      fileInput.dataset.optimized='1';
      const preview=$('forumProfileAvatarPreview');
      if(preview){
        const url=URL.createObjectURL(optimized),img=new Image();img.alt='Preview do avatar';img.onload=()=>{preview.textContent='';preview.className='forum-avatar-fallback';preview.append(img);setTimeout(()=>URL.revokeObjectURL(url),1500)};img.src=url;
      }
      const originalMb=(file.size/1048576).toFixed(2),finalKb=Math.max(1,Math.round(optimized.size/1024));
      feedback(file.size!==optimized.size?`Sua imagem foi reduzida para 512 × 512 com sucesso (${originalMb} MB → ${finalKb} KB).`:`Imagem preparada em 512 × 512 (${finalKb} KB).`);
    }catch(err){
      fileInput.value='';
      feedback(err.message||'Não foi possível otimizar a imagem.',true);
    }finally{
      delete fileInput.dataset.optimizing;
      if(form)delete form.dataset.avatarOptimizing;
    }
  }

  function selectedGames(){
    return [...document.querySelectorAll('#forumSelectedGames [data-remove-game]')].map(btn=>({slug:btn.dataset.removeGame,label:btn.textContent.replace('×','').trim()}));
  }

  function officialValues(){
    return new Set([...document.querySelectorAll('#forumModeOptions input[type="checkbox"]:not([data-custom-mode])')].map(x=>x.value));
  }

  function ensureTools(){
    const picker=$('forumModesPicker'),host=$('forumModeOptions');
    if(!picker||!host)return;
    let tools=$('forumCustomModeTools');
    if(!tools){
      tools=document.createElement('div');
      tools.id='forumCustomModeTools';
      tools.className='forum-custom-mode-tools';
      tools.innerHTML='<select id="forumCustomModeGame" aria-label="Jogo do modo personalizado"></select><input id="forumCustomModeName" type="text" maxlength="32" placeholder="Ex.: Blitz" aria-label="Nome do modo personalizado"><button id="forumAddCustomMode" type="button">+ Adicionar modo</button>';
      picker.appendChild(tools);
      $('forumAddCustomMode').addEventListener('click',addCustomMode);
      $('forumCustomModeName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustomMode()}});
    }
    const games=selectedGames(),select=$('forumCustomModeGame'),previous=select.value;
    select.innerHTML=games.map(g=>`<option value="${esc(g.slug)}">${esc(g.label)}</option>`).join('');
    if(games.some(g=>g.slug===previous))select.value=previous;
    tools.hidden=!games.length;
  }

  function customSet(slug){
    if(!customModes.has(slug))customModes.set(slug,new Set());
    return customModes.get(slug);
  }

  function renderCustomModes(){
    if(syncing)return;
    syncing=true;
    try{
      const host=$('forumModeOptions');if(!host)return;
      host.querySelectorAll('.forum-custom-mode-section').forEach(x=>x.remove());
      for(const game of selectedGames()){
        const modes=[...(customModes.get(game.slug)||[])];
        if(!modes.length)continue;
        const section=document.createElement('section');
        section.className='forum-custom-mode-section';
        section.dataset.customGame=game.slug;
        section.innerHTML=`<strong>${esc(game.label)} — meus modos</strong><div class="forum-profile-chips">${modes.map(mode=>{const value=modeKey(game.slug,mode);return `<label class="forum-choice-chip"><input type="checkbox" data-custom-mode="1" value="${esc(value)}" ${selectedCustom.has(value)?'checked':''}><span>${esc(mode)}</span></label>`}).join('')}</div>`;
        host.appendChild(section);
      }
    }finally{syncing=false}
  }

  function totalSelectedForGame(slug){
    return [...document.querySelectorAll('#forumModeOptions input[type="checkbox"]:checked')].filter(x=>String(x.value).startsWith(`${slug}::`)).length;
  }

  function addCustomMode(){
    const slug=$('forumCustomModeGame')?.value,mode=cleanMode($('forumCustomModeName')?.value);
    if(!slug)return feedback('Selecione um jogo primeiro.',true);
    if(!validMode(mode))return feedback('O modo deve ter entre 2 e 32 caracteres e usar apenas texto/números comuns.',true);
    const value=modeKey(slug,mode);
    const duplicate=[...document.querySelectorAll('#forumModeOptions input[type="checkbox"]')].some(x=>String(x.value).toLocaleLowerCase('pt-PT')===value.toLocaleLowerCase('pt-PT'));
    if(duplicate){
      const input=[...document.querySelectorAll('#forumModeOptions input[type="checkbox"]')].find(x=>String(x.value).toLocaleLowerCase('pt-PT')===value.toLocaleLowerCase('pt-PT'));
      if(input&&!input.checked){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}))}
      return feedback(`${mode} já existe e foi selecionado.`);
    }
    if(totalSelectedForGame(slug)>=MAX_MODES_PER_GAME)return feedback(`Você pode selecionar até ${MAX_MODES_PER_GAME} modos por jogo.`,true);
    customSet(slug).add(mode);selectedCustom.add(value);renderCustomModes();
    const input=[...document.querySelectorAll('#forumModeOptions input[data-custom-mode]')].find(x=>x.value===value);
    if(input){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}))}
    $('forumCustomModeName').value='';
    feedback(`Modo “${mode}” adicionado ao perfil.`);
  }

  async function loadSavedCustomModes(){
    const sb=window.teamSupabase;if(!sb)return;
    const {data:{session}}=await sb.auth.getSession();if(!session?.user?.id)return;
    const {data}=await sb.from('forum_profiles').select('game_modes').eq('user_id',session.user.id).maybeSingle();
    await new Promise(r=>setTimeout(r,0));
    const official=officialValues();
    for(const value of data?.game_modes||[]){
      if(official.has(value))continue;
      const idx=String(value).indexOf('::');if(idx<1)continue;
      const slug=String(value).slice(0,idx),mode=cleanMode(String(value).slice(idx+2));
      if(!validMode(mode))continue;
      customSet(slug).add(mode);selectedCustom.add(value);
    }
    renderCustomModes();ensureTools();
  }

  function observeModeHost(){
    const host=$('forumModeOptions');if(!host)return;
    const mo=new MutationObserver(()=>{if(syncing)return;ensureTools();queueMicrotask(renderCustomModes)});
    mo.observe(host,{childList:true,subtree:false});
    host.addEventListener('change',e=>{
      const input=e.target.closest('input[type="checkbox"]');if(!input)return;
      const [slug]=String(input.value).split('::');
      if(input.dataset.customMode){input.checked?selectedCustom.add(input.value):selectedCustom.delete(input.value)}
      if(input.checked&&totalSelectedForGame(slug)>MAX_MODES_PER_GAME){
        input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));
        feedback(`Máximo de ${MAX_MODES_PER_GAME} modos por jogo.`,true);
      }
    });
  }

  function enhanceAvatarHint(){
    const input=$('forumProfileAvatar');if(!input)return;
    const label=input.closest('label'),small=label?.querySelector('small');
    if(small)small.textContent='Envie JPG, PNG ou WebP. O site corta ao centro, reduz para 512 × 512 e comprime automaticamente para até 2 MB.';
    if(label&&!label.querySelector('.forum-avatar-auto-note')){
      const note=document.createElement('small');note.className='forum-avatar-auto-note';note.textContent='Você não precisa reduzir a imagem antes de enviar.';label.appendChild(note);
    }
    input.addEventListener('change',()=>handleAvatar(input),{capture:true});
    $('forumProfileForm')?.addEventListener('submit',e=>{
      if(e.currentTarget.dataset.avatarOptimizing==='1'){
        e.preventDefault();e.stopImmediatePropagation();feedback('Aguarde alguns segundos: a imagem ainda está sendo otimizada.');
      }
    },true);
  }

  function start(){
    if(!$('forumProfileForm'))return;
    ensureStyle();enhanceAvatarHint();ensureTools();observeModeHost();
    const dialog=$('forumProfileDialog');
    dialog?.addEventListener('toggle',()=>{if(dialog.open){setTimeout(()=>{ensureTools();loadSavedCustomModes()},30)}});
    dialog?.addEventListener('click',()=>{if(dialog.open)setTimeout(ensureTools,0)},{capture:true});
    loadSavedCustomModes();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();