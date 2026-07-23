(() => {
  'use strict';

  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  let session=null;
  let rows=[];
  let photoObjectUrl=null;

  function clearPhotoObjectUrl(){
    if(photoObjectUrl){
      URL.revokeObjectURL(photoObjectUrl);
      photoObjectUrl=null;
    }
  }

  function showPhotoPreview(src=''){
    const image=$('teamMemberPhotoPreview');
    const stage=$('teamMemberPhotoStage');
    const empty=$('teamMemberPhotoEmpty');
    if(!image||!stage) return;
    if(src){
      image.src=src;
      image.hidden=false;
      if(empty) empty.hidden=true;
      stage.style.backgroundImage=`url("${String(src).replace(/"/g,'\\"')}")`;
    }else{
      image.hidden=true;
      image.removeAttribute('src');
      if(empty) empty.hidden=false;
      stage.style.backgroundImage='none';
    }
  }

  function feedback(message,error=false){
    const element=$('teamMemberFeedback');
    if(!element) return;
    element.textContent=message;
    element.style.color=error?'#ff5267':'#73ff18';
  }

  async function isAdmin(){
    const {data}=await sb.auth.getSession();
    session=data.session;
    if(!session) return false;

    const {data:profile}=await sb.from('profiles')
      .select('role').eq('id',session.user.id).single();

    return ['master','admin'].includes(profile?.role);
  }

  function setValue(id,value=''){
    const element=$(id);
    if(element) element.value=value??'';
  }

  function reset(){
    $('teamMemberForm')?.reset();
    setValue('teamMemberId');
    setValue('teamMemberOrder',100);
    $('teamMemberPublished').checked=true;
    $('teamMemberFeatured').checked=false;
    clearPhotoObjectUrl();
    showPhotoPreview('');
    $('teamMemberPhotoFile').value='';
    setValue('teamMemberPhotoUrl');
    $('teamMemberEditorMode').textContent='NOVO PERFIL';
    $('teamMemberEditorTitle').textContent='Adicionar membro';
    feedback('');
  }

  function openEditor(row=null){
    $('teamMemberEditor').hidden=false;

    if(!row){
      reset();
    }else{
      $('teamMemberEditorMode').textContent='EDITAR PERFIL';
      $('teamMemberEditorTitle').textContent=row.nickname||row.name||'Membro';
      setValue('teamMemberId',row.id);
      setValue('teamMemberName',row.name);
      setValue('teamMemberNickname',row.nickname);
      setValue('teamMemberAge',row.age);
      setValue('teamMemberRole',row.role);
      setValue('teamMemberGroup',row.member_group||'Gamers');
      setValue('teamMemberCountry',row.country);
      setValue('teamMemberMainGame',row.main_game);
      setValue('teamMemberFavoriteMode',row.favorite_mode);
      setValue('teamMemberFavoriteWeapons',row.favorite_weapons);
      setValue('teamMemberPlayStyle',row.play_style);
      setValue('teamMemberOrder',row.display_order??100);
      setValue('teamMemberBio',row.bio);
      setValue('teamMemberPhotoUrl',row.image_url);
      setValue('teamMemberInstagram',row.instagram_url);
      setValue('teamMemberTikTok',row.tiktok_url);
      setValue('teamMemberFacebook',row.facebook_url);
      $('teamMemberPublished').checked=Boolean(row.is_published);
      $('teamMemberFeatured').checked=Boolean(row.is_featured);

      clearPhotoObjectUrl();
      showPhotoPreview(row.image_url||'');
    }

    $('teamMemberEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function closeEditor(){
    $('teamMemberEditor').hidden=true;
  }

  async function upload(file){
    if(!file) return null;
    const extension=file.name.split('.').pop()?.toLowerCase()||'jpg';
    const path=`${session.user.id}/${crypto.randomUUID()}.${extension}`;
    const {error}=await sb.storage.from('team-member-images').upload(path,file);
    if(error) throw error;
    return sb.storage.from('team-member-images').getPublicUrl(path).data.publicUrl;
  }

  async function save(event){
    event.preventDefault();

    if(!(await isAdmin())){
      feedback('Apenas Admin ou Admin Master pode guardar.',true);
      return;
    }

    const ageValue=$('teamMemberAge').value;
    const row={
      name:$('teamMemberName').value.trim(),
      nickname:$('teamMemberNickname').value.trim()||null,
      age:ageValue?Number(ageValue):null,
      role:$('teamMemberRole').value.trim()||null,
      member_group:$('teamMemberGroup').value,
      country:$('teamMemberCountry').value.trim()||null,
      main_game:$('teamMemberMainGame').value.trim()||null,
      favorite_mode:$('teamMemberFavoriteMode').value.trim()||null,
      favorite_weapons:$('teamMemberFavoriteWeapons').value.trim()||null,
      play_style:$('teamMemberPlayStyle').value.trim()||null,
      bio:$('teamMemberBio').value.trim()||null,
      image_url:$('teamMemberPhotoUrl').value.trim()||null,
      instagram_url:$('teamMemberInstagram').value.trim()||null,
      tiktok_url:$('teamMemberTikTok').value.trim()||null,
      facebook_url:$('teamMemberFacebook').value.trim()||null,
      is_featured:$('teamMemberFeatured').checked,
      is_published:$('teamMemberPublished').checked,
      display_order:Number($('teamMemberOrder').value||100),
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    };

    if(!row.name){
      feedback('Preencha o nome de exibição.',true);
      return;
    }

    try{
      const file=$('teamMemberPhotoFile').files?.[0];
      if(file) row.image_url=await upload(file);

      const id=$('teamMemberId').value;
      const result=id
        ? await sb.from('team_members').update(row).eq('id',id).select().single()
        : await sb.from('team_members')
            .insert({...row,created_by:session.user.id})
            .select().single();

      if(result.error) throw result.error;

      feedback('Perfil guardado na nuvem.');
      await load();
      setTimeout(closeEditor,450);
    }catch(error){
      feedback(error.message||'Erro ao guardar perfil.',true);
    }
  }

  async function archive(id,archived){
    if(!confirm(archived?'Tem certeza que deseja arquivar este membro?':'Tem certeza que deseja restaurar este membro?')) return;
    if(!(await isAdmin())) return;

    const {error}=await sb.from('team_members').update({
      is_archived:archived,
      is_published:archived?false:true,
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    }).eq('id',id);

    if(error) alert(error.message);
    else load();
  }

  function render(){
    const container=$('teamMembersCloudList');
    if(!container) return;

    if(!rows.length){
      container.innerHTML='<p class="hint">Nenhum perfil na nuvem ainda.</p>';
      return;
    }

    container.innerHTML=rows.map(row=>`
      <article class="streamer-admin-row ${row.is_archived?'is-archived':''}">
        <div class="streamer-admin-identity">
          ${row.image_url
            ? `<img src="${esc(row.image_url)}" alt="">`
            : `<span>${esc((row.nickname||row.name||'M').charAt(0).toUpperCase())}</span>`}
          <div>
            <strong>${esc(row.nickname||row.name)}</strong>
            <small>${esc(row.role||'Membro')} • ${esc(row.favorite_mode||row.member_group||'Team')}</small>
          </div>
        </div>
        <div class="streamer-admin-flags">
          ${row.is_featured?'<em>DESTAQUE</em>':''}
          ${row.is_archived?'<i>ARQUIVADO</i>':row.is_published?'<i>PUBLICADO</i>':'<i>OCULTO</i>'}
        </div>
        <div class="streamer-admin-actions">
          <button data-edit="${row.id}">Editar</button>
          ${row.is_archived
            ? `<button data-restore="${row.id}">Restaurar</button>`
            : `<button data-archive="${row.id}">Arquivar</button>`}
        </div>
      </article>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(button=>{
      button.onclick=()=>openEditor(rows.find(row=>row.id===button.dataset.edit));
    });
    container.querySelectorAll('[data-archive]').forEach(button=>{
      button.onclick=()=>confirm('Arquivar este perfil?')&&archive(button.dataset.archive,true);
    });
    container.querySelectorAll('[data-restore]').forEach(button=>{
      button.onclick=()=>archive(button.dataset.restore,false);
    });
  }

  async function load(){
    const container=$('teamMembersCloudList');
    if(!container) return;

    if(!(await isAdmin())){
      container.innerHTML='<p class="hint">Entre com uma conta Admin.</p>';
      return;
    }

    const {data,error}=await sb.from('team_members').select('*')
      .order('is_archived')
      .order('is_featured',{ascending:false})
      .order('display_order')
      .order('created_at');

    if(error){
      container.innerHTML=`<p class="hint">${esc(error.message)}</p>`;
      return;
    }

    rows=data||[];
    render();
  }

  $('newTeamMemberBtn')?.addEventListener('click',()=>openEditor());
  $('closeTeamMemberEditor')?.addEventListener('click',closeEditor);
  $('cancelTeamMemberBtn')?.addEventListener('click',closeEditor);
  $('refreshTeamMembersBtn')?.addEventListener('click',load);
  $('teamMemberForm')?.addEventListener('submit',save);

  $('teamMemberPhotoUrl')?.addEventListener('input',event=>{
    const value=event.target.value.trim();
    event.target.title=value;
    if(value){
      clearPhotoObjectUrl();
      $('teamMemberPhotoFile').value='';
      showPhotoPreview(value);
    }else if(!$('teamMemberPhotoFile').files?.[0]){
      showPhotoPreview('');
    }
  });

  $('teamMemberPhotoFile')?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    if(!file) return;
    clearPhotoObjectUrl();
    photoObjectUrl=URL.createObjectURL(file);
    setValue('teamMemberPhotoUrl');
    showPhotoPreview(photoObjectUrl);
  });

  $('teamMemberPhotoRemove')?.addEventListener('click',()=>{
    if(!confirm('Tem certeza que deseja remover esta imagem do perfil?')) return;
    clearPhotoObjectUrl();
    setValue('teamMemberPhotoUrl');
    $('teamMemberPhotoFile').value='';
    showPhotoPreview('');
    feedback('Imagem removida da pré-visualização. Guarde o perfil para concluir.');
  });

  let timer=null;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(load,120);};

  async function boot(){
    await load();
    sb.channel('team-admin-v89')
      .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh)
      .subscribe();
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
