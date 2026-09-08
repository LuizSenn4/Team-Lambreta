(() => {
  'use strict';
  if (window.TeamProfileEditV118Position) return;
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Math.max(min,Math.min(max,Math.round(Number.isFinite(n)?n:fallback)))};
  let x=72,y=50,zoom=118,dirty=false;
  function setPreview(nextX=x,nextY=y,nextZoom=zoom){
    x=clamp(nextX,0,100,72);y=clamp(nextY,0,100,50);zoom=clamp(nextZoom,100,180,118);dirty=true;
    const preview=document.getElementById('profileEditPreview'),cover=preview?.querySelector('.tl-profile-edit-v117__preview-cover');
    preview?.style.setProperty('--edit-cover-x',`${x}%`);preview?.style.setProperty('--edit-cover-y',`${y}%`);preview?.style.setProperty('--edit-cover-zoom',`${zoom}%`);
    if(cover){cover.style.setProperty('background-position',`${x}% ${y}%`,'important');cover.style.setProperty('background-size',`auto ${zoom}%`,'important')}
    const xr=document.getElementById('profileCoverPositionRange'),yr=document.getElementById('profileCoverPositionYRange'),zr=document.getElementById('profileCoverZoomRange');
    if(xr)xr.value=String(x);if(yr)yr.value=String(y);if(zr)zr.value=String(zoom);
  }
  async function persist(){
    if(!dirty)return true;
    const result=await window.teamSupabase?.rpc?.('tl_set_profile_cover_transform',{p_x:x,p_y:y,p_zoom:zoom});
    if(result?.error){console.error('[Profile cover transform]',result.error);throw result.error}
    dirty=false;return true;
  }
  function mount(profile){
    const form=document.getElementById('profileEditForm'),preview=document.getElementById('profileEditPreview'),cover=preview?.querySelector('.tl-profile-edit-v117__preview-cover');
    if(!form||!preview||!cover||document.getElementById('profileCoverPositionRange'))return false;
    x=clamp(profile?.cover_position_x,0,100,72);y=clamp(profile?.cover_position_y,0,100,50);zoom=clamp(profile?.cover_zoom,100,180,118);setPreview();dirty=false;
    const coverField=form.querySelector('[name="cover"]')?.closest('.tl-profile-edit-v117__field');
    const field=document.createElement('div');field.className='tl-profile-edit-v117__field tl-profile-edit-v118__cover-position';
    field.innerHTML=`<span>Enquadramento da capa</span><small>Arrasta no preview. A cruz marca o centro que ficará no perfil.</small><label class="tl-profile-edit-v118__range"><b>Horizontal</b><input id="profileCoverPositionRange" type="range" min="0" max="100" step="1" value="${x}"></label><label class="tl-profile-edit-v118__range"><b>Vertical</b><input id="profileCoverPositionYRange" type="range" min="0" max="100" step="1" value="${y}"></label><label class="tl-profile-edit-v118__range"><b>Zoom</b><input id="profileCoverZoomRange" type="range" min="100" max="180" step="1" value="${zoom}"></label><button class="tl-profile-edit-v118__reset" type="button">Centralizar</button>`;
    coverField?.insertAdjacentElement('afterend',field)||form.appendChild(field);
    cover.insertAdjacentHTML('beforeend','<span class="tl-profile-edit-v118__guide" aria-hidden="true"></span>');
    document.getElementById('profileCoverPositionRange').addEventListener('input',e=>setPreview(e.target.value));
    document.getElementById('profileCoverPositionYRange').addEventListener('input',e=>setPreview(x,e.target.value));
    document.getElementById('profileCoverZoomRange').addEventListener('input',e=>setPreview(x,y,e.target.value));
    field.querySelector('.tl-profile-edit-v118__reset').addEventListener('click',()=>setPreview(50,50,118));
    let dragging=false,startX=0,startY=0,startValueX=x,startValueY=y;
    cover.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;startY=e.clientY;startValueX=x;startValueY=y;cover.classList.add('is-dragging');cover.setPointerCapture?.(e.pointerId)});
    cover.addEventListener('pointermove',e=>{if(!dragging)return;setPreview(startValueX+(startX-e.clientX)/Math.max(1,cover.clientWidth)*100,startValueY+(startY-e.clientY)/Math.max(1,cover.clientHeight)*100)});
    const stop=e=>{if(!dragging)return;dragging=false;cover.classList.remove('is-dragging');try{cover.releasePointerCapture?.(e.pointerId)}catch{}};
    cover.addEventListener('pointerup',stop);cover.addEventListener('pointercancel',stop);
    form.addEventListener('change',e=>{if(e.target?.name==='cover')setPreview(50,50,118)});
    return true;
  }
  async function init(){try{const profile=await window.TeamProfiles?.getCurrentProfile?.({fresh:true});const attempt=()=>{if(!mount(profile))setTimeout(attempt,80)};attempt()}catch(error){console.error('[Profile edit cover transform]',error)}}
  Promise.resolve(window.TeamAuth?.ready).then(init);
  window.TeamProfileEditV118Position=Object.freeze({persist,get value(){return{x,y,zoom}}});
})();
