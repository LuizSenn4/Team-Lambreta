(() => {
  'use strict';
  if (window.TeamLiveMix) return;

  const sb = window.teamSupabase;
  const DEFAULT_X = 68;
  const DEFAULT_Y = 64;
  const MAX_MINI_GIFTS = 24;
  const MANAGER_ROLES = new Set(['master','dev','admin','moderator','staff']);
  let player = null;
  let widget = null;
  let bowl = null;
  let counterList = null;
  let toast = null;
  let streamer = null;
  let room = '';
  let visible = true;
  let posX = DEFAULT_X;
  let posY = DEFAULT_Y;
  let gifts = new Map();
  let totals = new Map();
  let channel = null;
  let toastTimer = null;
  let bootPromise = null;
  let bootError = null;

  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const role = () => String(document.body.dataset.userRole || 'member').toLowerCase();
  const canManage = () => MANAGER_ROLES.has(role()) || document.body.dataset.isStreamer === 'true';
  const safeRoom = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9:_-]/g,'').slice(0,120);
  const giftKey = gift => String(gift?.id || gift?.gift_id || 'unknown');
  const giftEmoji = gift => String(gift?.emoji || ({lambreta:'🛵',rush:'🔥',rei_live:'👑',team_legend:'🏆'}[gift?.code]) || '✦');
  const giftType = gift => /coroa|crown|rei_live|team_legend/i.test(`${gift?.code || ''} ${gift?.name || ''}`) ? 'crown' : /rush|fogo|fire/i.test(`${gift?.code || ''} ${gift?.name || ''}`) ? 'fire' : /lambreta|scooter|moto/i.test(`${gift?.code || ''} ${gift?.name || ''}`) ? 'scooter' : 'gift';
  const giftVector = gift => ({
    scooter:'<svg viewBox="0 0 24 24"><circle cx="5" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M5 16h9l3-8h-6M8 9h5M17 8l-2-4M15 4h4"/></svg>',
    fire:'<svg viewBox="0 0 24 24"><path d="M12 2c2 5-2 6 1 9 1-3 4-3 4-7 4 4 5 8 3 13-2 5-10 7-15 2-5-6 1-12 5-16-1 5 2 6 2 9 1-3 3-5 2-9z"/></svg>',
    crown:'<svg viewBox="0 0 24 24"><path d="m3 7 5 4 4-7 4 7 5-4-2 11H5zM5 21h14"/></svg>',
    gift:'<svg viewBox="0 0 24 24"><path d="M3 10h18v11H3zM2 6h20v5H2zM12 6v15M12 6C8 6 6 5 6 3c0-3 5-1 6 3zm0 0c4 0 6-1 6-3 0-3-5-1-6 3z"/></svg>'
  })[giftType(gift)];

  function trophySvg() {
    return `<svg class="live-mix-trophy" viewBox="0 0 180 170" aria-hidden="true">
      <defs><linearGradient id="mixGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".18"/><stop offset=".48" stop-color="#9ff" stop-opacity=".035"/><stop offset="1" stop-color="#73ff18" stop-opacity=".09"/></linearGradient><linearGradient id="mixEdge" x1="0" x2="1"><stop stop-color="#e9d58d" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#73ff18" stop-opacity=".3"/></linearGradient></defs>
      <path class="live-mix-cup" d="M43 31h94l-9 69c-3 23-18 35-38 35s-35-12-38-35L43 31Z" fill="url(#mixGlass)" stroke="url(#mixEdge)" stroke-width="2"/>
      <path d="M45 43C22 41 23 74 34 87c6 7 13 9 21 9M135 43c23-2 22 31 11 44-6 7-13 9-21 9" fill="none" stroke="#e9d58d" stroke-opacity=".26" stroke-width="5"/>
      <path d="M90 135v16M65 158h50" fill="none" stroke="#e9d58d" stroke-opacity=".4" stroke-width="7" stroke-linecap="round"/>
      <path d="M53 42h74" stroke="#fff" stroke-opacity=".24" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function createUi() {
    player = document.getElementById('livePlayerCard');
    if (!player || document.getElementById('liveMixWidget')) return false;
    widget = document.createElement('section');
    widget.id = 'liveMixWidget';
    widget.className = 'live-mix-widget';
    widget.setAttribute('aria-label','MIX DA LIVE');
    widget.innerHTML = `<div class="live-mix-label"><span>⠿</span><b>MIX DA LIVE</b></div><div class="live-mix-stage">${trophySvg()}<div class="live-mix-bowl" aria-hidden="true"></div><div class="live-mix-particles" aria-hidden="true"></div></div><ul class="live-mix-counts" aria-label="Presentes desta live"></ul>`;
    toast = document.createElement('div');
    toast.id = 'liveMixToast';
    toast.className = 'live-mix-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    player.append(widget,toast);
    bowl = widget.querySelector('.live-mix-bowl');
    counterList = widget.querySelector('.live-mix-counts');
    refreshPermission();
    bindDrag();
    return true;
  }

  function refreshPermission() {
    widget?.classList.toggle('is-editable',canManage());
  }

  function showToast(message,isError=false) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = `${isError ? '!' : '✓'} ${message}`;
    toast.classList.toggle('is-error',isError);
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'),3000);
  }

  function applyPosition() {
    if (!widget) return;
    widget.style.left = `${clamp(Number(posX) || 0,0,94)}%`;
    widget.style.top = `${clamp(Number(posY) || 0,0,92)}%`;
    requestAnimationFrame(keepInBounds);
  }

  function keepInBounds() {
    if (!widget || !player || widget.hidden) return;
    const parentRect = player.getBoundingClientRect();
    const rect = widget.getBoundingClientRect();
    const safe = window.innerWidth <= 620 ? 5 : 8;
    const left = clamp(rect.left-parentRect.left,safe,Math.max(safe,parentRect.width-rect.width-safe));
    const top = clamp(rect.top-parentRect.top,safe,Math.max(safe,parentRect.height-rect.height-safe));
    posX = parentRect.width ? left/parentRect.width*100 : DEFAULT_X;
    posY = parentRect.height ? top/parentRect.height*100 : DEFAULT_Y;
    widget.style.left = `${posX}%`; widget.style.top = `${posY}%`;
  }

  function visualGiftSequence() {
    const entries = [...totals.entries()].filter(([,quantity]) => quantity > 0);
    const totalQuantity = entries.reduce((sum,[,quantity]) => sum+quantity,0);
    if (!totalQuantity) return [];
    const slots = Math.min(MAX_MINI_GIFTS,totalQuantity);
    const sequence = [];
    entries.forEach(([id,quantity]) => {
      const count = Math.max(1,Math.round(quantity/totalQuantity*slots));
      for (let i=0;i<count;i++) sequence.push(id);
    });
    return sequence.slice(0,MAX_MINI_GIFTS);
  }

  function render() {
    if (!bowl || !counterList) return;
    bowl.replaceChildren();
    visualGiftSequence().forEach((id,index) => {
      const gift = gifts.get(id) || {};
      const mini = document.createElement('span');
      mini.className = 'live-mix-mini';
      mini.innerHTML = giftVector(gift);
      mini.style.setProperty('--mix-i',index);
      mini.title = gift.name || 'Presente';
      bowl.appendChild(mini);
    });
    counterList.replaceChildren();
    [...totals.entries()].filter(([,quantity]) => quantity > 0).sort((a,b) => b[1]-a[1]).forEach(([id,quantity]) => {
      const gift = gifts.get(id) || {};
      const item = document.createElement('li');
      const icon = document.createElement('span'); icon.textContent = giftEmoji(gift);
      const count = document.createElement('b'); count.textContent = `×${quantity.toLocaleString('pt-PT')}`;
      item.title = gift.name || 'Presente'; item.append(icon,count); counterList.appendChild(item);
    });
    widget.classList.toggle('is-empty',totals.size===0);
    keepInBounds();
  }

  function playGiftMixSound(_gift,_quantity) {
    // Hook intencional para uma versão futura. Nenhum áudio nesta versão.
  }
  window.playGiftMixSound = playGiftMixSound;

  function animateGift(gift,quantity) {
    if (!widget || widget.hidden) return;
    const falling = document.createElement('span');
    falling.className = 'live-mix-falling'; falling.innerHTML = giftVector(gift);
    falling.style.left = `${38+Math.random()*24}%`;
    widget.querySelector('.live-mix-stage')?.appendChild(falling);
    widget.classList.remove('is-reacting'); void widget.offsetWidth; widget.classList.add('is-reacting');
    setTimeout(() => { falling.remove(); render(); widget.classList.remove('is-reacting'); },760);
    playGiftMixSound(gift,quantity);
  }

  async function resolveContext() {
    for (let attempt=0;attempt<40;attempt++) {
      room = safeRoom(window.TL_LIVE_CHAT_ROOM || window.TL_CHAT_ROOM || window.TeamLiveChatSession?.room);
      if (room && window.TL_LIVE_STREAMER) break;
      await new Promise(resolve => setTimeout(resolve,150));
    }
    const handle = String(window.TL_LIVE_STREAMER || new URLSearchParams(location.search).get('user') || '').replace(/^@/,'').toLowerCase();
    if (!room || !handle) throw new Error('Sala atual não identificada.');
    const { data,error } = await sb.from('streamers').select('id,display_name,tiktok_url,live_url,game_nickname,is_archived').eq('is_archived',false);
    if (error) throw error;
    streamer = (data || []).find(row => `${row.tiktok_url || ''} ${row.live_url || ''}`.toLowerCase().includes(`/@${handle}`)
      || String(row.game_nickname || '').toLowerCase()===handle) || null;
    if (!streamer) throw new Error('Streamer atual não encontrado.');
  }

  async function loadSettings() {
    const { data,error } = await sb.from('tl_live_room_settings').select('mix_visible,mix_pos_x,mix_pos_y').eq('streamer_id',streamer.id).eq('room',room).maybeSingle();
    if (error) throw error;
    visible = data?.mix_visible !== false;
    posX = Number.isFinite(Number(data?.mix_pos_x)) ? Number(data.mix_pos_x) : DEFAULT_X;
    posY = Number.isFinite(Number(data?.mix_pos_y)) ? Number(data.mix_pos_y) : DEFAULT_Y;
    widget.hidden = !visible; applyPosition();
  }

  async function loadGifts() {
    const [{data:catalog,error:catalogError},{data:events,error:eventsError}] = await Promise.all([
      sb.from('tl_gifts').select('id,code,name,emoji,effect_key,image_url').eq('is_active',true),
      sb.from('tl_gift_events').select('gift_id,quantity').eq('streamer_id',streamer.id).eq('room',room)
    ]);
    if (catalogError) throw catalogError;
    if (eventsError) throw eventsError;
    gifts = new Map((catalog || []).map(gift => [giftKey(gift),gift]));
    totals = new Map();
    (events || []).forEach(event => totals.set(String(event.gift_id),(totals.get(String(event.gift_id)) || 0)+Math.max(1,Number(event.quantity) || 1)));
    render();
  }

  function subscribe() {
    if (channel) sb.removeChannel(channel);
    channel = sb.channel(`live-mix-${streamer.id}-${room}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tl_gift_events',filter:`streamer_id=eq.${streamer.id}`},payload => {
        const event = payload.new || {};
        if (safeRoom(event.room)!==room || String(event.streamer_id)!==String(streamer.id)) return;
        const id = String(event.gift_id); const quantity = Math.max(1,Number(event.quantity) || 1);
        totals.set(id,(totals.get(id) || 0)+quantity);
        animateGift(gifts.get(id) || {id},quantity);
      }).subscribe();
  }

  async function saveConfig(next,{successMessage}={}) {
    if (!canManage()) { const message='Sem permissão para alterar o MIX.'; showToast(message,true); return {ok:false,message}; }
    const {data,error} = await sb.rpc('tl_set_live_mix_config',{p_streamer_id:streamer.id,p_room:room,p_visible:next.visible,p_pos_x:next.x,p_pos_y:next.y});
    if (error) { const message=error.message || 'Não foi possível guardar o MIX.'; showToast(message,true); return {ok:false,message}; }
    visible=data?.mix_visible!==false; posX=Number(data?.mix_pos_x ?? next.x); posY=Number(data?.mix_pos_y ?? next.y);
    widget.hidden=!visible; applyPosition(); if (successMessage) showToast(successMessage);
    return {ok:true,message:successMessage || 'MIX atualizado.'};
  }

  function bindDrag() {
    widget.addEventListener('pointerdown',event => {
      if (!canManage() || event.button>0) return;
      event.preventDefault(); widget.setPointerCapture(event.pointerId); widget.classList.add('is-dragging');
      const parentRect=player.getBoundingClientRect(); const rect=widget.getBoundingClientRect();
      const offsetX=event.clientX-rect.left; const offsetY=event.clientY-rect.top;
      const move=ev => {
        const safe=window.innerWidth<=620?5:8;
        const left=clamp(ev.clientX-parentRect.left-offsetX,safe,Math.max(safe,parentRect.width-rect.width-safe));
        const top=clamp(ev.clientY-parentRect.top-offsetY,safe,Math.max(safe,parentRect.height-rect.height-safe));
        posX=left/parentRect.width*100; posY=top/parentRect.height*100; widget.style.left=`${posX}%`; widget.style.top=`${posY}%`;
      };
      const end=async () => {
        widget.classList.remove('is-dragging'); widget.removeEventListener('pointermove',move); widget.removeEventListener('pointerup',end); widget.removeEventListener('pointercancel',end);
        await saveConfig({visible,x:posX,y:posY},{successMessage:'Posição do MIX guardada com sucesso!'});
      };
      widget.addEventListener('pointermove',move); widget.addEventListener('pointerup',end); widget.addEventListener('pointercancel',end);
    });
  }

  async function executeCommand(raw) {
    await bootPromise;
    const value=String(raw || '').trim().toLowerCase();
    if (value==='/comandos') return {handled:true,ok:true,message:canManage()?'MIX: /mix · /mix on · /mix off · /mix reset · arrastar o troféu para reposicionar.':''};
    if (!/^\/mix(?:\s|$)/.test(value)) return {handled:false};
    if (bootError || !streamer || !room) { const message=bootError?.message || 'MIX indisponível nesta sala.'; showToast(message,true); return {handled:true,ok:false,message}; }
    if (!canManage()) { const message='Sem permissão para alterar o MIX.'; showToast(message,true); return {handled:true,ok:false,message}; }
    if (value==='/mix' || value==='/mix on' || value==='/mix off') {
      const nextVisible=value==='/mix'?!visible:value.endsWith(' on');
      const message=nextVisible?'MIX ativado com sucesso!':'MIX ocultado com sucesso!';
      return {handled:true,...await saveConfig({visible:nextVisible,x:posX,y:posY},{successMessage:message})};
    }
    if (value==='/mix reset') return {handled:true,...await saveConfig({visible:true,x:DEFAULT_X,y:DEFAULT_Y},{successMessage:'MIX restaurado com sucesso!'})};
    const message='Use /mix, /mix on, /mix off ou /mix reset.'; showToast(message,true); return {handled:true,ok:false,message};
  }

  async function boot() {
    if (!sb || !createUi()) return;
    try { await resolveContext(); await Promise.all([loadSettings(),loadGifts()]); subscribe(); }
    catch (error) { bootError=error; console.error('[Team Lambreta] MIX DA LIVE:',error); showToast(error.message || 'MIX indisponível.',true); }
  }

  window.TeamLiveMix = { executeCommand,refresh:loadGifts,canManage,playGiftMixSound };
  bootPromise = boot();
  new MutationObserver(refreshPermission).observe(document.body,{attributes:true,attributeFilter:['data-user-role','data-is-streamer']});
  window.addEventListener('resize',keepInBounds,{passive:true});
  window.addEventListener('beforeunload',() => { if (channel && sb) sb.removeChannel(channel); });
})();
