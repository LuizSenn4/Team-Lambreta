(() => {
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;
  const $=id=>document.getElementById(id);
  let session=null, rows=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function feedback(msg,error=false){const el=$('teamMemberFeedback');if(el){el.textContent=msg;el.style.color=error?'#ff5267':'#73ff18';}}

  async function isAdmin(){
    const {data}=await sb.auth.getSession();
    session=data.session;
    if(!session) return false;
    const {data:profile}=await sb.from('profiles').select('role').eq('id',session.user.id).single();
    return ['master','admin'].includes(profile?.role);
  }

  function reset(){
    $('teamMemberForm')?.reset();
    $('teamMemberId').value='';
    $('teamMemberOrder').value='100';
    $('teamMemberPublished').checked=true;
    $('teamMemberPhotoPreview').hidden=true;
    $('teamMemberPhotoPreview').removeAttribute('src');
    $('teamMemberPhotoFile').value='';
    $('teamMemberEditorMode').textContent='NOVO MEMBRO';
    $('teamMemberEditorTitle').textContent='Adicionar membro';
    feedback('');
  }

  function openEditor(row=null){
    $('teamMemberEditor').hidden=false;
    if(!row){reset();}
    else{
      $('teamMemberEditorMode').textContent='EDITAR MEMBRO';
      $('teamMemberEditorTitle').textContent=row.name||'Membro';
      $('teamMemberId').value=row.id;
      $('teamMemberName').value=row.name||'';
      $('teamMemberRole').value=row.role||'';
      $('teamMemberGroup').value=row.member_group||'Gamers';
      $('teamMemberOrder').value=row.display_order??100;
      $('teamMemberBio').value=row.bio||'';
      $('teamMemberPhotoUrl').value=row.image_url||'';
      $('teamMemberInstagram').value=row.instagram_url||'';
      $('teamMemberTikTok').value=row.tiktok_url||'';
      $('teamMemberFacebook').value=row.facebook_url||'';
      $('teamMemberPublished').checked=Boolean(row.is_published);
      const img=$('teamMemberPhotoPreview');
      if(row.image_url){img.src=row.image_url;img.hidden=false}else img.hidden=true;
    }
    $('teamMemberEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function close(){ $('teamMemberEditor').hidden=true; }

  async function upload(file){
    if(!file) return null;
    const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';
    const path=`${session.user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await sb.storage.from('team-member-images').upload(path,file);
    if(error) throw error;
    return sb.storage.from('team-member-images').getPublicUrl(path).data.publicUrl;
  }

  async function save(event){
    event.preventDefault();
    if(!(await isAdmin())) return feedback('Apenas Admin ou Admin Master pode guardar.',true);
    const row={
      name:$('teamMemberName').value.trim(),
      role:$('teamMemberRole').value.trim()||null,
      member_group:$('teamMemberGroup').value,
      bio:$('teamMemberBio').value.trim()||null,
      image_url:$('teamMemberPhotoUrl').value.trim()||null,
      instagram_url:$('teamMemberInstagram').value.trim()||null,
      tiktok_url:$('teamMemberTikTok').value.trim()||null,
      facebook_url:$('teamMemberFacebook').value.trim()||null,
      is_published:$('teamMemberPublished').checked,
      display_order:Number($('teamMemberOrder').value||100),
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    };
    if(!row.name) return feedback('Preencha o nome.',true);
    try{
      const file=$('teamMemberPhotoFile').files?.[0];
      if(file) row.image_url=await upload(file);
      const id=$('teamMemberId').value;
      const result=id
        ? await sb.from('team_members').update(row).eq('id',id).select().single()
        : await sb.from('team_members').insert({...row,created_by:session.user.id}).select().single();
      if(result.error) throw result.error;
      feedback('Membro guardado na nuvem.');
      await load();
      setTimeout(close,500);
    }catch(err){feedback(err.message||'Erro ao guardar.',true);}
  }

  async function archive(id,archived){
    if(!(await isAdmin())) return;
    const {error}=await sb.from('team_members').update({
      is_archived:archived,
      is_published:archived?false:true,
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    }).eq('id',id);
    if(error) alert(error.message); else load();
  }

  function render(){
    const box=$('teamMembersCloudList');
    if(!rows.length){box.innerHTML='<p class="hint">Nenhum membro na nuvem ainda.</p>';return;}
    box.innerHTML=rows.map(row=>`<article class="streamer-admin-row ${row.is_archived?'is-archived':''}">
      <div class="streamer-admin-identity">
        ${row.image_url?`<img src="${esc(row.image_url)}" alt="">`:'<span>👤</span>'}
        <div><strong>${esc(row.name)}</strong><small>${esc(row.member_group)} • ${esc(row.role||'Membro')}</small></div>
      </div>
      <div class="streamer-admin-flags">${row.is_archived?'<i>ARQUIVADO</i>':row.is_published?'<i>PUBLICADO</i>':'<i>OCULTO</i>'}</div>
      <div class="streamer-admin-actions">
        <button data-edit="${row.id}">Editar</button>
        ${row.is_archived?`<button data-restore="${row.id}">Restaurar</button>`:`<button data-archive="${row.id}">Arquivar</button>`}
      </div>
    </article>`).join('');
    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(rows.find(r=>r.id===b.dataset.edit)));
    box.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>confirm('Arquivar este membro?')&&archive(b.dataset.archive,true));
    box.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>archive(b.dataset.restore,false));
  }

  async function load(){
    const box=$('teamMembersCloudList');
    if(!box) return;
    if(!(await isAdmin())){box.innerHTML='<p class="hint">Entre com uma conta Admin.</p>';return;}
    const {data,error}=await sb.from('team_members').select('*').order('is_archived').order('member_group').order('display_order').order('created_at');
    if(error){box.innerHTML=`<p class="hint">${esc(error.message)}</p>`;return;}
    rows=data||[];render();
  }

  $('newTeamMemberBtn')?.addEventListener('click',()=>openEditor());
  $('closeTeamMemberEditor')?.addEventListener('click',close);
  $('cancelTeamMemberBtn')?.addEventListener('click',close);
  $('refreshTeamMembersBtn')?.addEventListener('click',load);
  $('teamMemberForm')?.addEventListener('submit',save);
  $('teamMemberPhotoUrl')?.addEventListener('input',e=>{const img=$('teamMemberPhotoPreview');img.src=e.target.value.trim();img.hidden=!e.target.value.trim();});
  $('teamMemberPhotoFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){const img=$('teamMemberPhotoPreview');img.src=URL.createObjectURL(f);img.hidden=false;}});

  let t=null;
  function refresh(){clearTimeout(t);t=setTimeout(load,120);}
  async function boot(){
    await load();
    sb.channel('team-admin-v87').on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh).subscribe();
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
