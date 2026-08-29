(() => {
  'use strict';

  const sb = window.teamSupabase;
  const player = document.getElementById('livePlayerCard');
  if (!sb || !player) return;

  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const nf = new Intl.NumberFormat('pt-PT');
  let streamerId = null;
  let giftMap = new Map();
  let counts = new Map();
  let channel = null;

  const style = document.createElement('style');
  style.id = 'tlLiveMinimalHudV1';
  style.textContent = `
    /* TOP minimalista: informação visível, sem tapar a transmissão */
    .tl-player-top-title{
      top:9px!important;
      padding:2px 7px!important;
      border:0!important;
      background:transparent!important;
      backdrop-filter:none!important;
      color:rgba(255,222,103,.72)!important;
      font-size:7px!important;
      letter-spacing:1.45px!important;
      text-shadow:0 2px 8px #000,0 0 10px rgba(255,210,70,.16)!important;
    }
    .tl-player-top-side{
      top:19%!important;
      bottom:23%!important;
      width:min(126px,16.5%)!important;
      gap:4px!important;
      justify-content:flex-start!important;
      opacity:.9;
    }
    .tl-player-top-side.left{left:7px!important}
    .tl-player-top-side.right{right:7px!important}
    .tl-player-top-item{
      position:relative!important;
      grid-template-columns:18px minmax(0,1fr)!important;
      column-gap:5px!important;
      padding:3px 4px!important;
      border:0!important;
      background:linear-gradient(90deg,rgba(1,8,12,.58),rgba(1,8,12,0))!important;
      backdrop-filter:none!important;
      clip-path:none!important;
      border-radius:5px!important;
      text-shadow:0 2px 5px #000!important;
    }
    .tl-player-top-side.right .tl-player-top-item{
      background:linear-gradient(270deg,rgba(1,8,12,.58),rgba(1,8,12,0))!important;
      grid-template-columns:minmax(0,1fr) 18px!important;
      text-align:right!important;
    }
    .tl-player-top-item::before{
      content:"";position:absolute;left:0;top:20%;bottom:20%;width:1px;background:rgba(255,210,70,.36);box-shadow:0 0 7px rgba(255,210,70,.22)
    }
    .tl-player-top-side.right .tl-player-top-item::before{left:auto;right:0}
    .tl-player-top-rank{
      width:18px!important;height:18px!important;border:0!important;background:rgba(255,210,70,.08)!important;
      color:#ffe16f!important;font-size:7px!important;box-shadow:none!important;
    }
    .tl-player-top-side.right .tl-player-top-rank{grid-column:2;grid-row:1/3}
    .tl-player-top-name{font-size:8px!important;font-weight:850!important;color:rgba(238,250,255,.92)!important}
    .tl-player-top-value{font-size:7px!important;font-weight:850!important;color:rgba(255,211,69,.82)!important}

    /* Troféu/Mix da sala */
    .tl-room-trophy{
      position:absolute;right:10px;bottom:48px;z-index:23;width:116px;min-height:102px;
      display:grid;justify-items:end;pointer-events:none;opacity:.88;filter:drop-shadow(0 7px 14px rgba(0,0,0,.5));
    }
    .tl-room-trophy[hidden]{display:none!important}
    .tl-room-trophy-head{
      margin:0 3px 3px 0;color:rgba(215,242,255,.62);font-size:6.5px;font-weight:950;letter-spacing:1.2px;text-transform:uppercase;text-shadow:0 2px 7px #000
    }
    .tl-trophy-cup{position:relative;width:72px;height:66px;margin-right:4px}
    .tl-trophy-cup>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
    .tl-trophy-fill{
      position:absolute;left:12px;right:12px;top:10px;bottom:16px;overflow:hidden;
      clip-path:polygon(10% 0,90% 0,78% 100%,22% 100%);
    }
    .tl-trophy-token{
      position:absolute;width:17px;height:17px;display:grid;place-items:center;
      filter:drop-shadow(0 2px 3px #000) drop-shadow(0 0 5px rgba(255,210,70,.18));
      opacity:.92;transform:rotate(var(--r,0deg));
    }
    .tl-trophy-token svg{width:100%;height:100%;overflow:visible}
    .tl-trophy-summary{
      max-width:116px;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:3px 5px;
      color:rgba(239,249,255,.82);font-size:7px;font-weight:900;text-shadow:0 2px 6px #000;
    }
    .tl-trophy-summary span{display:inline-flex;align-items:center;gap:2px;white-space:nowrap}
    .tl-trophy-mini{width:9px;height:9px;display:inline-grid;place-items:center}.tl-trophy-mini svg{width:9px;height:9px}
    .tl-trophy-total{margin-top:2px;color:rgba(255,213,75,.68);font-size:6.5px;font-weight:900;letter-spacing:.3px;text-shadow:0 2px 6px #000}
    .tl-room-trophy.is-empty{opacity:.38}

    @media(max-width:1050px){
      .tl-room-trophy{right:7px;bottom:44px;width:94px;transform:scale(.88);transform-origin:right bottom}
    }
    @media(max-width:620px){
      .tl-room-trophy{width:80px;transform:scale(.72);right:4px;bottom:38px}
    }
  `;
  document.head.appendChild(style);

  const trophy = document.createElement('section');
  trophy.className = 'tl-room-trophy is-empty';
  trophy.setAttribute('aria-label','Mix de presentes desta sala');
  trophy.innerHTML = `
    <div class="tl-room-trophy-head">MIX DA LIVE</div>
    <div class="tl-trophy-cup">
      <svg viewBox="0 0 72 66" aria-hidden="true">
        <defs>
          <linearGradient id="tlCupGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#dff8ff" stop-opacity=".34"/>
            <stop offset=".45" stop-color="#5fe8ff" stop-opacity=".10"/>
            <stop offset="1" stop-color="#ffd85b" stop-opacity=".20"/>
          </linearGradient>
        </defs>
        <path d="M19 8h34l-4.5 34c-.8 6-5.9 10.5-11.9 10.5h-1.2c-6 0-11.1-4.5-11.9-10.5L19 8Z" fill="url(#tlCupGlass)" stroke="#c8f4ff" stroke-opacity=".48" stroke-width="1.2"/>
        <path d="M19.5 13H12c-4.5 0-6.5 3.5-5.2 7.3 2.1 6.2 6.5 10.2 14.6 11.7M52.5 13H60c4.5 0 6.5 3.5 5.2 7.3-2.1 6.2-6.5 10.2-14.6 11.7" fill="none" stroke="#ffd85b" stroke-opacity=".34" stroke-width="1.2"/>
        <path d="M30 52.5h12v5H30zM25 58h22v3H25z" fill="#ffd85b" fill-opacity=".25" stroke="#ffe891" stroke-opacity=".35" stroke-width=".8"/>
        <path d="M22 10h28" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>
      </svg>
      <div id="tlTrophyFill" class="tl-trophy-fill"></div>
    </div>
    <div id="tlTrophySummary" class="tl-trophy-summary"></div>
    <div id="tlTrophyTotal" class="tl-trophy-total">AGUARDANDO PRESENTES</div>
  `;
  player.appendChild(trophy);

  const fill = document.getElementById('tlTrophyFill');
  const summary = document.getElementById('tlTrophySummary');
  const total = document.getElementById('tlTrophyTotal');

  function iconSvg(code, color='#ffd34e'){
    if(code==='lambreta') return `<svg viewBox="0 0 48 48"><circle cx="13" cy="35" r="6" fill="none" stroke="${color}" stroke-width="3"/><circle cx="36" cy="35" r="6" fill="none" stroke="${color}" stroke-width="3"/><path d="M13 35h12l7-15h-9l-3 7h12l4 8M24 20l-4-5h-6" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if(code==='rush') return `<svg viewBox="0 0 48 48"><path d="M28 5c3 9-4 12-1 18 2-4 6-6 8-10 8 10 7 25-4 30-12 6-25-2-23-15 1-8 8-13 13-19-1 8 4 10 7 12 3-5 1-10 0-16Z" fill="${color}" fill-opacity=".88"/></svg>`;
    if(code==='rei_live') return `<svg viewBox="0 0 48 48"><path d="M7 15l10 9 7-14 7 14 10-9-4 23H11L7 15Z" fill="${color}" fill-opacity=".72" stroke="#fff2b0" stroke-opacity=".75" stroke-width="2"/><circle cx="7" cy="14" r="3" fill="#fff2b0"/><circle cx="24" cy="9" r="3" fill="#fff2b0"/><circle cx="41" cy="14" r="3" fill="#fff2b0"/></svg>`;
    return `<svg viewBox="0 0 48 48"><path d="M14 7h20v8c0 9-4 15-10 18-6-3-10-9-10-18V7Z" fill="${color}" fill-opacity=".72" stroke="#fff3b6" stroke-opacity=".72" stroke-width="2"/><path d="M14 11H7c0 8 3 12 9 13M34 11h7c0 8-3 12-9 13M24 33v7M16 41h16" fill="none" stroke="#fff3b6" stroke-opacity=".74" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }

  const palette = ['#ffd34e','#66eaff','#ff7494','#b98cff'];

  function roomKey(){
    return String(window.TeamLiveChatSession?.room || window.TL_CHAT_ROOM || `live:${ref}`).trim().toLowerCase();
  }

  async function resolveStreamer(){
    if(streamerId) return streamerId;
    if(UUID_RE.test(ref)){
      const {data}=await sb.from('streamers').select('id').eq('id',ref).maybeSingle();
      streamerId=data?.id||null; return streamerId;
    }
    const {data}=await sb.from('streamers').select('id,display_name,tiktok_url,live_url').eq('is_published',true).eq('is_archived',false);
    const needle=ref.toLowerCase().replace(/^@/,'');
    const row=(data||[]).find(x=>`${x.display_name||''} ${x.tiktok_url||''} ${x.live_url||''}`.toLowerCase().includes(needle));
    streamerId=row?.id||null; return streamerId;
  }

  function render(){
    const rows=[...counts.entries()].map(([giftId,qty])=>({gift:giftMap.get(giftId),qty})).filter(x=>x.gift&&x.qty>0).sort((a,b)=>b.qty-a.qty);
    const grand=rows.reduce((s,x)=>s+x.qty,0);
    trophy.classList.toggle('is-empty',grand===0);
    fill.replaceChildren();
    summary.replaceChildren();

    if(!grand){
      total.textContent='AGUARDANDO PRESENTES';
      return;
    }

    const tokens=[];
    rows.forEach((row,index)=>{
      const show=Math.max(1,Math.min(6,Math.round((row.qty/grand)*14)));
      for(let i=0;i<show;i++) tokens.push({gift:row.gift,color:palette[index%palette.length]});
    });
    tokens.slice(0,16).forEach((token,i)=>{
      const el=document.createElement('span');
      el.className='tl-trophy-token';
      const col=i%3, layer=Math.floor(i/3);
      el.style.left=`${5+col*14+(layer%2)*4}px`;
      el.style.bottom=`${1+layer*7}px`;
      el.style.setProperty('--r',`${((i*17)%26)-13}deg`);
      el.innerHTML=iconSvg(token.gift.code,token.color);
      fill.appendChild(el);
    });

    rows.slice(0,4).forEach((row,index)=>{
      const item=document.createElement('span');
      const mini=document.createElement('i');
      mini.className='tl-trophy-mini';
      mini.innerHTML=iconSvg(row.gift.code,palette[index%palette.length]);
      const n=document.createElement('b');
      n.textContent=`x${nf.format(row.qty)}`;
      item.append(mini,n);
      summary.appendChild(item);
    });
    total.textContent=`${nf.format(grand)} PRESENTE${grand===1?'':'S'} NA SALA`;
  }

  async function load(){
    await resolveStreamer();
    if(!streamerId) return;
    const [{data:gifts},{data:events}] = await Promise.all([
      sb.from('tl_gifts').select('id,code,name').eq('is_active',true).order('sort_order'),
      sb.from('tl_gift_events').select('gift_id,quantity,room').eq('streamer_id',streamerId).eq('room',roomKey()).order('created_at',{ascending:true}).limit(1000)
    ]);
    giftMap=new Map((gifts||[]).map(g=>[g.id,g]));
    counts=new Map();
    (events||[]).forEach(e=>counts.set(e.gift_id,(counts.get(e.gift_id)||0)+Number(e.quantity||1)));
    render();

    channel=sb.channel(`tl-room-trophy-${streamerId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tl_gift_events',filter:`streamer_id=eq.${streamerId}`},payload=>{
        const row=payload.new||{};
        if(String(row.room||'').toLowerCase()!==roomKey()) return;
        counts.set(row.gift_id,(counts.get(row.gift_id)||0)+Number(row.quantity||1));
        render();
      })
      .subscribe();
  }

  load();
  window.addEventListener('beforeunload',()=>{ if(channel) sb.removeChannel(channel); });
})();
