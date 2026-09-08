(() => {
  'use strict';
  if (window.TeamProfileEditV117) return;
  const root=document.getElementById('profileRoot');
  if(!root)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const covers={cover_green_black:'assets/profile-covers/cover-green-black.png',cover_neon:'assets/profile-covers/cover-neon.png',cover_lambretta_classic:'assets/profile-covers/cover-lambretta-classic.png',cover_competitive:'assets/profile-covers/cover-competitive.png',cover_minimal:'assets/profile-covers/cover-minimal.png'};
  let profile=null,catalog={games:[],platforms:[]},previewUrl='';

  const avatarUrl=p=>window.TeamProfiles?.getAvatarUrl?.(p)||p?.avatar_display_url||p?.avatar_external_url||'';
  const notify=(message,type='info',code='')=>window.TeamNotifications?.show?.(message,{type,code});
  const feedback=(message,state='')=>{const node=document.getElementById('profileEditFeedback');if(!node)return;node.textContent=message;node.className=`tl-profile-edit-v117__feedback${state?` is-${state}`:''}`};
  const fail=(message,error)=>{const code=/^PRF-\d{3}$/.test(error?.code||'')?error.code:'PRF-007';feedback(`${message} Código: ${code}`,'error');notify(message,'error',code);console.error(`[PROFILE ${code}]`,error)};

  function previewAvatar(src,fallback='TL'){
    const host=document.getElementById('profileEditAvatar');if(!host)return;
    host.innerHTML=src?`<img src="${esc(src)}" alt="Preview do avatar">`:esc(fallback||'TL');
  }
  function updatePreview(){
    const form=document.getElementById('profileEditForm');if(!form)return;
    const nick=form.elements.nickname?.value?.trim()||profile?.display_name||'Membro';
    document.getElementById('profileEditPreviewName').textContent=nick;
    const cover=form.querySelector('[name="cover"]:checked')?.value||'cover_green_black';
    document.getElementById('profileEditPreview').style.setProperty('--cover',`url('${covers[cover]||covers.cover_green_black}')`);
  }
  function renderModes(){
    const form=document.getElementById('profileEditForm');if(!form)return;
    const active=[...form.querySelectorAll('[name="games"]:checked')].map(i=>i.value);
    const selected=new Set(profile?.game_modes||[]);
    const choices=catalog.games.filter(g=>active.includes(g.slug)).flatMap(g=>(g.modes||[]).map(mode=>({value:`${g.slug}::${mode}`,label:`${g.name} — ${mode}`})));
    const host=document.getElementById('profileEditModes');
    host.innerHTML=choices.length?choices.map(item=>`<label data-search="${esc(item.label.toLowerCase())}"><input type="checkbox" name="modes" value="${esc(item.value)}" ${selected.has(item.value)?'checked':''}><span>${esc(item.label)}</span></label>`).join(''):'<p style="padding:12px;color:#9eacb8">Seleciona primeiro um jogo.</p>';
  }
  function setupFilters(form){
    form.querySelectorAll('[data-filter]').forEach(input=>input.addEventListener('input',()=>{const needle=input.value.trim().toLowerCase();form.querySelectorAll(`[data-list="${input.dataset.filter}"] label`).forEach(label=>label.hidden=!String(label.dataset.search||'').includes(needle))}));
  }
  function setupCountry(form){
    const search=document.getElementById('profileEditCountrySearch'),hidden=form.elements.country,list=document.getElementById('profileEditCountryList'),api=window.TeamCountryCatalog;
    if(!search||!hidden||!list||!api)return;
    const close=()=>{list.hidden=true};
    const choose=country=>{search.value=country.name;hidden.value=country.code;close()};
    const open=()=>{const matches=api.search(search.value||'',18);list.innerHTML=matches.map(c=>`<button type="button" data-country="${esc(c.code)}"><span>${c.flag}</span><b>${esc(c.code)}</b><span>${esc(c.name)}</span></button>`).join('');list.hidden=!matches.length;list.querySelectorAll('[data-country]').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();const country=api.byCode.get(btn.dataset.country);if(country)choose(country)}))};
    search.addEventListener('focus',open);search.addEventListener('input',()=>{hidden.value='';open()});document.addEventListener('pointerdown',e=>{if(!e.target.closest('.tl-profile-edit-v117__country'))close()});
  }
  function payload(form,avatarPath){const data=new FormData(form);return{nickname:data.get('nickname'),country:data.get('country'),bio:data.get('bio'),discord:data.get('discord'),avatarPath:avatarPath??profile?.avatar_path??null,avatarExternalUrl:data.get('avatarUrl'),games:data.getAll('games'),platforms:data.getAll('platforms'),gameModes:data.getAll('modes'),coverPreset:data.get('cover')}}

  async function render(){
    const session=await window.TeamAuth?.getSession?.();
    if(!session?.user){root.innerHTML='<section class="tl-profile-edit-v117"><div class="tl-profile-edit-v117__form"><h1>Editar perfil</h1><p>Inicia sessão para continuar.</p><button id="profileEditLogin" type="button">Entrar com Google</button></div></section>';document.getElementById('profileEditLogin').onclick=()=>window.TeamAuth?.signInWithGoogle?.();return}
    [profile,catalog]=await Promise.all([window.TeamProfiles.getCurrentProfile({fresh:true}),window.TeamProfiles.getCatalog()]);
    if(!profile)throw Object.assign(new Error('Perfil não encontrado.'),{code:'PRF-009'});
    const games=new Set(profile.games||[]),platforms=new Set(profile.platforms||[]),country=window.TeamCountryCatalog?.resolve?.(profile.country),currentCover=profile.cover_preset&&covers[profile.cover_preset]?profile.cover_preset:'cover_green_black';
    root.innerHTML=`<section class="tl-profile-edit-v117"><header class="tl-profile-edit-v117__head"><small>MINHA CONTA</small><h1>Editar perfil</h1><p>Os dados guardados aqui aparecem no perfil, Fórum, Buddy e navegação.</p></header><div class="tl-profile-edit-v117__grid"><form id="profileEditForm" class="tl-profile-edit-v117__form"><label class="tl-profile-edit-v117__field"><span>Nickname</span><input name="nickname" type="text" minlength="3" maxlength="32" required value="${esc(profile.forum_nickname||profile.game_nickname||'')}"></label><div class="tl-profile-edit-v117__field tl-profile-edit-v117__country"><span>País</span><input id="profileEditCountrySearch" type="search" autocomplete="off" placeholder="Pesquisar país…" value="${esc(country?.name||profile.country||'')}"><input name="country" type="hidden" value="${esc(country?.code||profile.country||'')}"><div id="profileEditCountryList" class="tl-profile-edit-v117__country-list" hidden></div></div><label class="tl-profile-edit-v117__field"><span>Bio</span><textarea name="bio" maxlength="500">${esc(profile.bio||'')}</textarea></label><label class="tl-profile-edit-v117__field"><span>Discord</span><input name="discord" type="text" maxlength="64" value="${esc(profile.discord||'')}"></label><div class="tl-profile-edit-v117__field"><span>Avatar</span><input name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp"><input name="avatarUrl" type="url" placeholder="Ou URL externa https://…" value="${esc(profile.avatar_external_url||'')}"><small>JPG, PNG ou WEBP, máximo 2 MB após processamento.</small></div><div class="tl-profile-edit-v117__field"><span>Jogos — máximo 4</span><input type="search" data-filter="games" placeholder="Pesquisar jogo…"><div class="tl-profile-edit-v117__choices" data-list="games">${catalog.games.map(g=>`<label data-search="${esc(`${g.name} ${(g.aliases||[]).join(' ')}`.toLowerCase())}"><input type="checkbox" name="games" value="${esc(g.slug)}" ${games.has(g.slug)?'checked':''}><span>${esc(g.name)}</span></label>`).join('')}</div></div><div class="tl-profile-edit-v117__field"><span>Plataformas</span><input type="search" data-filter="platforms" placeholder="Pesquisar plataforma…"><div class="tl-profile-edit-v117__choices" data-list="platforms">${catalog.platforms.map(p=>`<label data-search="${esc(p.name.toLowerCase())}"><input type="checkbox" name="platforms" value="${esc(p.slug)}" ${platforms.has(p.slug)?'checked':''}><span>${esc(p.name)}</span></label>`).join('')}</div></div><div class="tl-profile-edit-v117__field"><span>Modos</span><div id="profileEditModes" class="tl-profile-edit-v117__choices"></div></div><div class="tl-profile-edit-v117__field"><span>Capa</span><div class="tl-profile-edit-v117__cover-grid">${Object.entries(covers).map(([id,src])=>`<label class="tl-profile-edit-v117__cover" style="--cover:url('${src}')"><input type="radio" name="cover" value="${id}" ${id===currentCover?'checked':''}></label>`).join('')}</div></div><div class="tl-profile-edit-v117__actions"><button type="submit">Guardar alterações</button><a href="profile.html?user=${encodeURIComponent(session.user.id)}">Cancelar</a></div><div id="profileEditFeedback" class="tl-profile-edit-v117__feedback" aria-live="polite"></div></form><aside id="profileEditPreview" class="tl-profile-edit-v117__preview" style="--cover:url('${covers[currentCover]}')"><div class="tl-profile-edit-v117__preview-cover"></div><div id="profileEditAvatar" class="tl-profile-edit-v117__avatar"></div><h2 id="profileEditPreviewName">${esc(profile.display_name||'Membro')}</h2><p>Pré-visualização do perfil</p></aside></div></section>`;
    const form=document.getElementById('profileEditForm');previewAvatar(avatarUrl(profile),profile.avatar_fallback);renderModes();setupFilters(form);setupCountry(form);updatePreview();
    form.addEventListener('input',e=>{if(e.target.name==='nickname')updatePreview()});form.addEventListener('change',async e=>{
      if(e.target.name==='games'){const checked=form.querySelectorAll('[name="games"]:checked');if(checked.length>4){e.target.checked=false;feedback('Podes selecionar no máximo quatro jogos.','error')}renderModes()}
      if(e.target.name==='cover')updatePreview();
      if(e.target.name==='avatarFile'&&e.target.files?.[0]){const input=e.target;input.disabled=true;try{const result=await window.TeamProfiles.saveAvatar(input.files[0],payload(form),{onStage:stage=>feedback(stage==='processing'?'Preparando imagem…':stage==='uploading'?'Enviando imagem…':'Avatar atualizado ✓',stage==='saved'?'success':''),onPrepared:file=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);previewAvatar(previewUrl)}});profile=result.profile;form.elements.avatarUrl.value='';input.value='';previewAvatar(avatarUrl(profile),profile.avatar_fallback);feedback('Avatar atualizado ✓','success');window.TeamShell?.refresh?.()}catch(error){previewAvatar(avatarUrl(profile),profile.avatar_fallback);fail('Não foi possível atualizar o avatar.',error)}finally{input.disabled=false}}
    });
    form.addEventListener('submit',async e=>{e.preventDefault();feedback('A guardar…');try{await window.TeamProfileEditV118Position?.persist?.();profile=await window.TeamProfiles.updateProfile(payload(form));feedback('Salvo com sucesso! ✓','success');notify('Salvo com sucesso! ✓','success');window.TeamShell?.refresh?.();setTimeout(()=>location.href=`profile.html?user=${encodeURIComponent(profile.id)}`,450)}catch(error){fail('Não foi possível guardar a alteração.',error)}});
  }

  async function init(){try{await render()}catch(error){const code=error?.code||'PRF-010';root.innerHTML=`<section class="tl-profile-edit-v117"><div class="tl-profile-edit-v117__form"><h1>Editor indisponível</h1><p>Não foi possível carregar o perfil. Código: ${esc(code)}</p></div></section>`;console.error('[Profile edit V117]',error)}}
  Promise.resolve(window.TeamAuth?.ready).then(init);
  window.TeamProfileEditV117=Object.freeze({render});
})();
