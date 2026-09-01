(() => {
  'use strict';
  const sb = window.teamSupabase;
  const player = document.getElementById('livePlayerCard');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  if (!sb || !player || !form || !input) return;

  let streamerId = null;
  let topEnabled = false;
  let topLimit = 3;
  let topPosX = 8;
  let topPosY = 12;
  let profile = null;
  let toastTimer = null;
  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const UUID_RE = /^[0-9a-f-]{36}$/i;

  const style = document.createElement('style');
  style.textContent = `
    .tl-live-side>.tl-live-top{visibility:hidden!important;pointer-events:none!important}
    .tl-player-top{position:absolute;left:8%;top:12%;z-index:22;width:min(210px,28%);max-height:72%;padding:8px;border:1px solid rgba(255,210,78,.14);border-radius:10px;background:rgba(3,9,13,.38);backdrop-filter:blur(7px);pointer-events:none;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.2)}
    .tl-player-top[hidden]{display:none!important}
    .tl-player-top.is-editable{pointer-events:auto}.tl-player-top.is-dragging{cursor:grabbing}
    .tl-player-top-handle{display:none;align-items:center;gap:5px;width:100%;padding:0 0 5px;border:0;background:transparent;color:rgba(255,222,103,.78);font:950 8px/1 system-ui;letter-spacing:1.2px;cursor:grab;touch-action:none}.tl-player-top.is-editable .tl-player-top-handle{display:flex}.tl-player-top-handle span{font-size:12px}
    .tl-player-top-title{padding:0 0 5px;color:rgba(255,222,103,.78);font-size:8px;font-weight:950;letter-spacing:1.2px}.tl-player-top.is-editable .tl-player-top-title{display:none}
    .tl-player-top-list{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}
    .tl-player-top-item{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;column-gap:6px;width:100%;padding:4px 5px;border-radius:6px;background:linear-gradient(90deg,rgba(2,8,12,.64),rgba(2,8,12,.12));text-shadow:0 2px 5px #000}
    .tl-player-top-rank{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,214,78,.18);color:#ffd34e;font-size:8px;font-weight:1000}
    .tl-player-top-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eefaff;font-size:9px;font-weight:950}
    .tl-player-top-value{color:#ffd34e;font-size:8px;font-weight:900}
    .tl-command-toast{position:absolute;left:50%;bottom:18px;z-index:46;max-width:88%;padding:9px 14px;border:1px solid rgba(94,243,255,.28);background:rgba(2,10,15,.9);backdrop-filter:blur(10px);color:#dffbff;font-size:11px;font-weight:900;opacity:0;transform:translate(-50%,10px);transition:.2s ease;pointer-events:none}
    .tl-command-toast.show{opacity:1;transform:translate(-50%,0)}
    .tl-command-toast.error{border-color:rgba(255,80,105,.35);color:#ffdbe1}
    .tl-command-panel{position:absolute;inset:12% 14%;z-index:45;border:1px solid rgba(94,243,255,.2);background:rgba(2,8,13,.95);backdrop-filter:blur(14px);padding:16px;color:#fff;overflow:auto}
    .tl-command-panel[hidden]{display:none!important}
    .tl-command-panel-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;color:#61eaff;font-size:10px;font-weight:950;letter-spacing:1.3px}
    .tl-command-panel-head button{margin-left:auto;width:30px;height:30px;border:1px solid rgba(255,255,255,.1);background:#0b141c;color:#9fb3c0;cursor:pointer}
    .tl-command-row{display:grid;grid-template-columns:140px 1fr;gap:10px;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}
    .tl-command-row code{color:#ffd34e;font-weight:950}.tl-command-row span{color:#9fb0bc;font-size:10px}
    @media(max-width:1050px){.tl-live-side>.tl-live-top{display:none!important}.tl-player-top{width:min(176px,35%)}.tl-command-panel{inset:8% 5%}}
    @media(max-width:620px){.tl-player-top{width:min(146px,42%);max-height:66%;padding:6px}.tl-player-top-item{grid-template-columns:18px minmax(0,1fr);gap:4px}.tl-player-top-value{grid-column:2}.tl-player-top-rank{width:18px;height:18px}.tl-player-top-name{font-size:8px}}
  `;
  document.head.appendChild(style);

  const hud = document.createElement('section');
  hud.className = 'tl-player-top';
  hud.hidden = true;
  hud.innerHTML = '<button class="tl-player-top-handle" id="tlPlayerTopHandle" type="button" aria-label="Arrastar TOP da sala"><span aria-hidden="true">⠿</span><b>TOP DA SALA</b></button><div class="tl-player-top-title" id="tlPlayerTopTitle">TOP DA SALA</div><ol class="tl-player-top-list" id="tlPlayerTopList"></ol>';
  player.appendChild(hud);

  const toast = document.createElement('div');
  toast.className = 'tl-command-toast';
  toast.setAttribute('aria-live','polite');
  player.appendChild(toast);

  const panel = document.createElement('section');
  panel.className = 'tl-command-panel';
  panel.hidden = true;
  panel.innerHTML = '<div class="tl-command-panel-head"><span>COMANDOS DISPONÍVEIS</span><button type="button">×</button></div><div id="tlCommandRows"></div>';
  player.appendChild(panel);
  panel.querySelector('button').onclick = () => panel.hidden = true;

  const list = document.getElementById('tlPlayerTopList');
  const handle = document.getElementById('tlPlayerTopHandle');
  const title = document.getElementById('tlPlayerTopTitle');

  function notify(text, error=false){
    clearTimeout(toastTimer);
    toast.textContent = `${error ? '!' : '✓'} ${text}`;
    toast.classList.toggle('error', error);
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    toastTimer = setTimeout(()=>toast.classList.remove('show'),3200);
  }

  const roomKey = () => String(window.TeamLiveChatSession?.room || window.TL_CHAT_ROOM || `live:${ref}`).trim().toLowerCase();

  async function resolveStreamer(){
    if(streamerId) return streamerId;
    if(UUID_RE.test(ref)){
      const {data}=await sb.from('streamers').select('id').eq('id',ref).maybeSingle();
      streamerId=data?.id||null;
      return streamerId;
    }
    const {data}=await sb.from('streamers').select('id,display_name,tiktok_url,live_url').eq('is_published',true).eq('is_archived',false);
    const needle=ref.toLowerCase().replace(/^@/,'');
    const row=(data||[]).find(x=>`${x.display_name||''} ${x.tiktok_url||''} ${x.live_url||''}`.toLowerCase().includes(needle));
    streamerId=row?.id||null;
    return streamerId;
  }

  async function loadTopConfig(){
    if(!streamerId)return;
    const {data}=await sb.from('tl_live_room_settings').select('top_donors_limit,top_pos_x,top_pos_y').eq('streamer_id',streamerId).eq('room',roomKey()).maybeSingle();
    const limit=Number(data?.top_donors_limit??3);
    applyTopConfig({top_enabled:limit!==0,top_limit:limit,top_pos_x:data?.top_pos_x,top_pos_y:data?.top_pos_y});
  }

  async function loadProfile(){
    const {data:a}=await sb.auth.getSession();
    const uid=a.session?.user?.id;
    if(!uid){profile=null;return null;}
    const {data}=await sb.from('profiles').select('role,is_streamer').eq('id',uid).maybeSingle();
    profile=data||null;
    hud.classList.toggle('is-editable',canManageTop());
    return profile;
  }

  function roleGroup(){
    const role=String(profile?.role||'member').toLowerCase();
    if(['master','admin'].includes(role)) return 'admin';
    if(['moderator','staff'].includes(role)) return 'moderator';
    if(profile?.is_streamer) return 'streamer';
    return role;
  }

  const canManageTop = () => ['admin','moderator','streamer'].includes(roleGroup());
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

  function keepTopInBounds(){
    if(hud.hidden) return;
    const parent=player.getBoundingClientRect();
    const rect=hud.getBoundingClientRect();
    const safe=window.innerWidth<=620?5:8;
    const left=clamp(rect.left-parent.left,safe,Math.max(safe,parent.width-rect.width-safe));
    const top=clamp(rect.top-parent.top,safe,Math.max(safe,parent.height-rect.height-safe));
    topPosX=parent.width?left/parent.width*100:8;
    topPosY=parent.height?top/parent.height*100:12;
    hud.style.left=`${topPosX}%`;hud.style.top=`${topPosY}%`;
  }

  function applyTopConfig(row={}){
    topEnabled=row.top_enabled===true;
    topLimit=[3,5,10].includes(Number(row.top_limit))?Number(row.top_limit):3;
    topPosX=Number.isFinite(Number(row.top_pos_x))?Number(row.top_pos_x):8;
    topPosY=Number.isFinite(Number(row.top_pos_y))?Number(row.top_pos_y):12;
    hud.style.left=`${clamp(topPosX,0,94)}%`;hud.style.top=`${clamp(topPosY,0,92)}%`;
    hud.classList.toggle('is-editable',canManageTop());
    syncRanking();
    requestAnimationFrame(keepTopInBounds);
  }

  async function saveTopConfig(successMessage){
    if(!canManageTop()){notify('Só streamer ou moderação pode alterar o TOP.',true);return false;}
    const {data,error}=await sb.rpc('tl_set_live_top_position',{p_streamer:streamerId,p_room:roomKey(),p_pos_x:topPosX,p_pos_y:topPosY});
    if(error){notify(error.message||'Não foi possível guardar o TOP.',true);return false;}
    if(data){topPosX=Number(data.top_pos_x??topPosX);topPosY=Number(data.top_pos_y??topPosY);}
    if(successMessage)notify(successMessage);
    return true;
  }

  function openCommands(){
    const group=roleGroup();
    const rows=[['/comandos','Mostra os comandos disponíveis para o teu cargo.']];
    if(['admin','moderator','streamer'].includes(group)){
      rows.push(['/top 3','Mostra o TOP 3 desta sala em coluna vertical.']);
      rows.push(['/top 5','Mostra o TOP 5 desta sala.']);
      rows.push(['/top 10','Mostra o TOP 10 desta sala.']);
      rows.push(['/top 0','Oculta o TOP desta sala.']);
      rows.push(['Arrastar o TOP','Use a alça para reposicionar sobre o player.']);
      rows.push(['/mix · on · off · reset','Controla e reposiciona o MIX DA LIVE.']);
    }
    if(group==='admin') rows.push(['/cargo @nick cargo','Altera o cargo de um utilizador quando permitido.']);
    document.getElementById('tlCommandRows').innerHTML=rows.map(r=>`<div class="tl-command-row"><code>${r[0]}</code><span>${r[1]}</span></div>`).join('');
    panel.hidden=false;
    notify('Lista de comandos aberta com sucesso!');
  }

  function syncRanking(){
    const source=document.getElementById('tlTopDonors');
    const hint=String(document.getElementById('tlTopHint')?.textContent||'');
    if(!source) return;
    const chips=[...source.querySelectorAll('.tl-top-chip')];
    if(!topEnabled){hud.hidden=true;list.replaceChildren();return;}
    title.textContent='TOP DA SALA';
    list.replaceChildren();
    chips.slice(0,topLimit).forEach((chip,i)=>{
      const item=document.createElement('div');
      item.className='tl-player-top-item';
      const rank=chip.querySelector('.tl-top-rank')?.textContent?.trim()||String(i+1);
      const name=chip.querySelector('.tl-top-name')?.textContent?.trim()||'Apoiador';
      const value=chip.querySelector('.tl-top-value')?.textContent?.trim()||'';
      item.innerHTML='<b class="tl-player-top-rank"></b><strong class="tl-player-top-name"></strong><span class="tl-player-top-value"></span>';
      item.querySelector('b').textContent=rank;
      item.querySelector('strong').textContent=name;
      item.querySelector('span').textContent=value;
      list.appendChild(item);
    });
    hud.hidden=false;
    requestAnimationFrame(keepTopInBounds);
  }

  function watchRanking(){
    let tries=0;
    const timer=setInterval(()=>{
      const source=document.getElementById('tlTopDonors');
      const hint=document.getElementById('tlTopHint');
      tries++;
      if(!source&&tries<40)return;
      clearInterval(timer);
      if(!source)return;
      const obs=new MutationObserver(syncRanking);
      obs.observe(source,{childList:true,subtree:true,characterData:true});
      if(hint)obs.observe(hint,{childList:true,subtree:true,characterData:true});
      syncRanking();
    },100);
  }

  async function runTop(limit){
    await Promise.all([resolveStreamer(),loadProfile()]);
    if(!streamerId){notify('Não foi possível identificar o streamer.',true);return;}
    if(![0,3,5,10].includes(limit)){notify('Use /top 3, /top 5, /top 10 ou /top 0.',true);return;}
    const {data,error}=await sb.rpc('tl_set_live_top_limit',{p_streamer:streamerId,p_room:roomKey(),p_limit:limit});
    if(error){notify(/NOT_ALLOWED/i.test(error.message||'')?'Só streamer ou moderação pode alterar o TOP.':(error.message||'Falha ao executar o comando.'),true);return;}
    topEnabled=limit!==0;if(limit)topLimit=Number(data?.limit??limit);
    syncRanking();
    notify(limit===0?'TOP ocultado com sucesso!':`TOP ${topLimit} ativado com sucesso!`);
  }

  form.addEventListener('submit',async e=>{
    const raw=String(input.value||'').trim();
    if(/^\/comandos$/i.test(raw)){
      e.preventDefault();e.stopImmediatePropagation();input.value='';await loadProfile();openCommands();return;
    }
    if(/^\/mix(?:\s|$)/i.test(raw)){
      e.preventDefault();e.stopImmediatePropagation();input.value='';
      const result=await window.TeamLiveMix?.executeCommand?.(raw);
      if(!result?.handled)notify('MIX ainda não está disponível.',true);
      return;
    }
    const m=raw.match(/^\/top\s+(\d{1,2})$/i);
    if(m){e.preventDefault();e.stopImmediatePropagation();input.value='';await runTop(Number(m[1]));return;}
    if(/^\/top\s*$/i.test(raw)){e.preventDefault();e.stopImmediatePropagation();input.value='';notify('Use /top 3, /top 5, /top 10 ou /top 0.',true);}
  },true);

  handle.addEventListener('pointerdown',event=>{
    if(!canManageTop()||event.button>0)return;
    event.preventDefault();handle.setPointerCapture(event.pointerId);hud.classList.add('is-dragging');
    const parent=player.getBoundingClientRect();const rect=hud.getBoundingClientRect();
    const offsetX=event.clientX-rect.left;const offsetY=event.clientY-rect.top;
    const move=ev=>{
      const safe=window.innerWidth<=620?5:8;
      const left=clamp(ev.clientX-parent.left-offsetX,safe,Math.max(safe,parent.width-rect.width-safe));
      const top=clamp(ev.clientY-parent.top-offsetY,safe,Math.max(safe,parent.height-rect.height-safe));
      topPosX=left/parent.width*100;topPosY=top/parent.height*100;
      hud.style.left=`${topPosX}%`;hud.style.top=`${topPosY}%`;
    };
    const end=async()=>{
      hud.classList.remove('is-dragging');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);
      await saveTopConfig('Posição do TOP guardada com sucesso!');
    };
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  });
  window.addEventListener('resize',keepTopInBounds,{passive:true});

  const moderationInfo=document.getElementById('chatModerationInfo');
  if(moderationInfo){
    let last='';
    const mirror=()=>{
      const text=String(moderationInfo.textContent||'').trim();
      if(!text||text===last)return;
      last=text;
      notify(text,moderationInfo.classList.contains('error'));
    };
    new MutationObserver(mirror).observe(moderationInfo,{childList:true,subtree:true,characterData:true,attributes:true});
  }

  watchRanking();
  Promise.all([loadProfile(),resolveStreamer()]).then(async()=>{hud.classList.toggle('is-editable',canManageTop());await loadTopConfig();});
})();
