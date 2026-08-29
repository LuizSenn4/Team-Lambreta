(() => {
  'use strict';
  const sb = window.teamSupabase;
  const player = document.getElementById('livePlayerCard');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  if (!sb || !player || !form || !input) return;

  let streamerId = null;
  let profile = null;
  let toastTimer = null;
  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const UUID_RE = /^[0-9a-f-]{36}$/i;

  const style = document.createElement('style');
  style.textContent = `
    .tl-live-side>.tl-live-top{visibility:hidden!important;pointer-events:none!important}
    .tl-player-top{position:absolute;inset:0;z-index:22;pointer-events:none;overflow:hidden;border-radius:inherit}
    .tl-player-top[hidden]{display:none!important}
    .tl-player-top-title{position:absolute;left:50%;top:12px;transform:translateX(-50%);padding:5px 10px;border:1px solid rgba(255,210,78,.18);background:rgba(3,9,13,.5);backdrop-filter:blur(8px);color:#ffd34e;font-size:8px;font-weight:950;letter-spacing:1.2px}
    .tl-player-top-side{position:absolute;top:18%;bottom:14%;display:flex;flex-direction:column;justify-content:center;gap:8px;width:min(145px,20%)}
    .tl-player-top-side.left{left:9px}.tl-player-top-side.right{right:9px}
    .tl-player-top-item{display:grid;grid-template-columns:24px minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;width:100%;padding:6px 8px;border:1px solid rgba(255,214,78,.16);background:linear-gradient(90deg,rgba(2,8,12,.78),rgba(2,8,12,.18));backdrop-filter:blur(7px);clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
    .tl-player-top-side.right .tl-player-top-item{background:linear-gradient(270deg,rgba(2,8,12,.78),rgba(2,8,12,.18))}
    .tl-player-top-rank{grid-row:1/3;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,214,78,.24);color:#ffd34e;font-size:9px;font-weight:1000}
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
    @media(max-width:1050px){.tl-live-side>.tl-live-top{display:none!important}.tl-player-top-side{display:none}.tl-command-panel{inset:8% 5%}}
  `;
  document.head.appendChild(style);

  const hud = document.createElement('section');
  hud.className = 'tl-player-top';
  hud.hidden = true;
  hud.innerHTML = '<div class="tl-player-top-title" id="tlPlayerTopTitle">TOP DA SALA</div><div class="tl-player-top-side left" id="tlPlayerTopLeft"></div><div class="tl-player-top-side right" id="tlPlayerTopRight"></div>';
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

  const left = document.getElementById('tlPlayerTopLeft');
  const right = document.getElementById('tlPlayerTopRight');
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

  async function loadProfile(){
    const {data:a}=await sb.auth.getSession();
    const uid=a.session?.user?.id;
    if(!uid){profile=null;return null;}
    const {data}=await sb.from('profiles').select('role,is_streamer').eq('id',uid).maybeSingle();
    profile=data||null;
    return profile;
  }

  function roleGroup(){
    const role=String(profile?.role||'member').toLowerCase();
    if(['master','admin'].includes(role)) return 'admin';
    if(['moderator','staff'].includes(role)) return 'moderator';
    if(profile?.is_streamer) return 'streamer';
    return role;
  }

  function openCommands(){
    const group=roleGroup();
    const rows=[['/comandos','Mostra os comandos disponíveis para o teu cargo.']];
    if(['admin','moderator','streamer'].includes(group)){
      rows.push(['/top 3','Mostra o TOP 3 desta sala nas laterais do player.']);
      rows.push(['/top 5','Mostra o TOP 5 desta sala.']);
      rows.push(['/top 0','Oculta o TOP desta sala.']);
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
    if(/\/top\s*0/i.test(hint)||!chips.length){hud.hidden=true;left.replaceChildren();right.replaceChildren();return;}
    const m=hint.match(/\/top\s*(\d+)/i);
    const limit=m?Number(m[1]):chips.length;
    title.textContent=`TOP ${Math.min(limit,chips.length)} DA SALA`;
    left.replaceChildren();right.replaceChildren();
    chips.slice(0,limit).forEach((chip,i)=>{
      const item=document.createElement('div');
      item.className='tl-player-top-item';
      const rank=chip.querySelector('.tl-top-rank')?.textContent?.trim()||String(i+1);
      const name=chip.querySelector('.tl-top-name')?.textContent?.trim()||'Apoiador';
      const value=chip.querySelector('.tl-top-value')?.textContent?.trim()||'';
      item.innerHTML='<b class="tl-player-top-rank"></b><strong class="tl-player-top-name"></strong><span class="tl-player-top-value"></span>';
      item.querySelector('b').textContent=rank;
      item.querySelector('strong').textContent=name;
      item.querySelector('span').textContent=value;
      (i%2===0?left:right).appendChild(item);
    });
    hud.hidden=false;
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
    if(limit<0||limit>10){notify('Use /top com um número entre 0 e 10.',true);return;}
    const {error}=await sb.rpc('tl_set_live_top_limit',{p_streamer:streamerId,p_room:roomKey(),p_limit:limit});
    if(error){notify(/NOT_ALLOWED/i.test(error.message||'')?'Só streamer ou moderação pode alterar o TOP.':(error.message||'Falha ao executar o comando.'),true);return;}
    notify(limit===0?'TOP ocultado com sucesso!':`Top ${limit} executado com sucesso!`);
  }

  form.addEventListener('submit',async e=>{
    const raw=String(input.value||'').trim();
    if(/^\/comandos$/i.test(raw)){
      e.preventDefault();e.stopImmediatePropagation();input.value='';await loadProfile();openCommands();return;
    }
    const m=raw.match(/^\/top\s+(\d{1,2})$/i);
    if(m){e.preventDefault();e.stopImmediatePropagation();input.value='';await runTop(Number(m[1]));return;}
    if(/^\/top\s*$/i.test(raw)){e.preventDefault();e.stopImmediatePropagation();input.value='';notify('Exemplo: /top 3, /top 5 ou /top 0.',true);}
  },true);

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
  loadProfile();
})();
