(() => {
  'use strict';

  const sb = window.teamSupabase;
  const deck = document.querySelector('.tl-live-gifts');
  const playerCard = document.getElementById('livePlayerCard');
  const shell = document.querySelector('.live-watch-shell');
  const main = document.querySelector('.live-watch-main');
  const chat = document.querySelector('.live-watch-chat');
  const heading = document.querySelector('.live-watch-heading');
  if (!sb || !deck || !playerCard || !shell || !main || !chat) return;

  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const nf = new Intl.NumberFormat('pt-PT');

  let streamerId = null;
  let userId = null;
  let walletBalance = 0;
  let gifts = [];
  let giftChannel = null;
  let settingsChannel = null;
  let overlayTimer = null;
  let combo = null;
  let comboTimer = null;
  let holdTimer = null;
  let holdLoop = null;
  let sending = false;
  let topLimit = 3;

  const css = document.createElement('style');
  css.id = 'tlLiveExperienceV2';
  css.textContent = `
    /* Team Lambreta Live Experience V2 */
    .live-watch-shell{align-items:stretch!important}
    .tl-live-side{min-width:0;display:flex;flex-direction:column;align-self:stretch}
    .tl-live-top{flex:0 0 var(--tl-heading-slot,84px);min-height:var(--tl-heading-slot,84px);display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding:0 4px 10px}
    .tl-live-top-head{display:flex;align-items:center;gap:8px;margin-bottom:7px;color:#6beaff;font-size:9px;font-weight:950;letter-spacing:1.7px;text-transform:uppercase}
    .tl-live-top-head strong{color:#fff3c5;font-size:10px;letter-spacing:.8px}
    .tl-live-top-head em{margin-left:auto;color:#6d7f8e;font-style:normal;font-size:8px;letter-spacing:.5px}
    .tl-live-top-list{display:flex;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
    .tl-live-top-list::-webkit-scrollbar{display:none}
    .tl-top-chip{flex:0 0 auto;min-width:104px;max-width:148px;display:grid;grid-template-columns:22px minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;align-items:center;padding:5px 8px;border:1px solid rgba(255,204,75,.13);background:linear-gradient(135deg,rgba(255,210,78,.055),rgba(3,11,17,.22));clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
    .tl-top-rank{grid-row:1/3;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgba(255,199,54,.09);color:#ffc936;font-size:10px;font-weight:950;box-shadow:inset 0 0 0 1px rgba(255,201,54,.18)}
    .tl-top-chip:nth-child(1) .tl-top-rank{color:#ffe27b;box-shadow:0 0 15px rgba(255,214,78,.16),inset 0 0 0 1px rgba(255,226,123,.3)}
    .tl-top-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eaf7ff;font-size:9px;font-weight:900}
    .tl-top-value{color:#ffcb44;font-size:8px;font-weight:850;letter-spacing:.25px}
    .tl-top-empty{color:#536572;font-size:9px;font-weight:750;letter-spacing:.4px}
    .live-watch-chat{position:relative!important;top:auto!important;align-self:stretch!important;flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important}

    .tl-live-gifts{margin-top:12px!important;border:1px solid rgba(77,220,255,.13)!important;border-radius:18px!important;background:radial-gradient(circle at 20% -40%,rgba(0,221,255,.08),transparent 42%),linear-gradient(180deg,#09131b,#071018)!important;overflow:visible!important;box-shadow:0 16px 42px rgba(0,0,0,.22)!important}
    .tl-gift-deck-head{display:flex;align-items:center;gap:12px;padding:11px 14px 8px}
    .tl-gift-deck-brand{display:flex;align-items:center;gap:9px;color:#ffd154;font-size:10px;font-weight:950;letter-spacing:1.3px;text-transform:uppercase}
    .tl-gift-deck-brand i{width:7px;height:7px;border-radius:50%;background:#ffd154;box-shadow:0 0 16px #ffd154}
    .tl-gift-deck-hint{color:#59707f;font-size:8px;font-weight:800;letter-spacing:.45px}
    .tl-live-gifts-balance{margin-left:auto;color:#f4fbff;font-size:12px;font-weight:950;white-space:nowrap}
    .tl-gift-rail{display:flex;gap:9px;overflow-x:auto;padding:6px 13px 12px;scrollbar-width:none;touch-action:pan-x}
    .tl-gift-rail::-webkit-scrollbar{display:none}
    .tl-gift-pod{--pod:#67e7ff;position:relative;flex:0 0 118px;height:82px;border:0;background:transparent;color:#fff;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none;outline:none}
    .tl-gift-pod-shell{position:absolute;inset:0;display:grid;grid-template-columns:52px 1fr;align-items:center;padding:9px 9px 9px 8px;background:radial-gradient(circle at 20% 20%,color-mix(in srgb,var(--pod) 12%,transparent),transparent 48%),linear-gradient(135deg,rgba(255,255,255,.035),rgba(255,255,255,.008));border:1px solid color-mix(in srgb,var(--pod) 25%,rgba(255,255,255,.05));clip-path:polygon(11px 0,calc(100% - 11px) 0,100% 11px,100% calc(100% - 11px),calc(100% - 11px) 100%,11px 100%,0 calc(100% - 11px),0 11px);transition:transform .14s ease,filter .14s ease,border-color .14s ease}
    .tl-gift-pod:hover .tl-gift-pod-shell,.tl-gift-pod:focus-visible .tl-gift-pod-shell{transform:translateY(-2px);filter:brightness(1.12)}
    .tl-gift-pod.is-holding .tl-gift-pod-shell{animation:tlPodCharge .6s ease-in-out infinite alternate;filter:brightness(calc(1 + var(--combo-power,.1)))}
    .tl-gift-vector{display:grid;place-items:center;width:48px;height:48px;filter:drop-shadow(0 8px 12px rgba(0,0,0,.45))}
    .tl-gift-vector svg{width:46px;height:46px;overflow:visible}
    .tl-gift-pod-copy{display:grid;min-width:0;text-align:left}
    .tl-gift-pod-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f7fbff;font-size:10px;font-weight:950}
    .tl-gift-pod-copy small{margin-top:4px;color:#ffc940;font-size:9px;font-weight:900}
    .tl-gift-combo-badge{position:absolute;right:-4px;top:-5px;z-index:4;display:grid;place-items:center;min-width:30px;height:25px;padding:0 6px;border-radius:999px;background:#ffcc3f;color:#12100a;font-size:11px;font-weight:1000;box-shadow:0 0 22px rgba(255,204,63,.34);opacity:0;transform:scale(.65);transition:.12s ease}
    .tl-gift-pod.has-combo .tl-gift-combo-badge{opacity:1;transform:scale(1)}
    .tl-gift-status{min-height:18px;padding:0 14px 9px;color:#607887;font-size:9px;font-weight:800}
    .tl-gift-status[data-kind="success"]{color:#66f0b2}.tl-gift-status[data-kind="error"]{color:#ff6479}.tl-gift-status[data-kind="info"]{color:#69e7ff}
    @keyframes tlPodCharge{from{transform:translateY(-1px) scale(1)}to{transform:translateY(-3px) scale(calc(1 + var(--combo-power,.04)));box-shadow:0 0 calc(14px + 24px * var(--combo-power,.1)) color-mix(in srgb,var(--pod) 20%,transparent)}}

    .tl-gift-overlay{position:absolute!important;inset:0!important;z-index:35!important;display:block!important;min-width:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;pointer-events:none!important;opacity:0!important;transform:none!important;overflow:hidden!important}
    .tl-gift-overlay.is-visible{opacity:1!important;animation:none!important}
    .tl-fx-particles{position:absolute;inset:0}
    .tl-fx-particle{--a:0deg;--r:160px;position:absolute;left:50%;top:44%;width:5px;height:5px;border-radius:50%;background:var(--fx-color,#ffd34e);box-shadow:0 0 12px var(--fx-color,#ffd34e);opacity:0;animation:tlParticle 1.25s ease-out forwards;animation-delay:calc(var(--i) * 22ms)}
    .tl-fx-object{position:absolute;left:50%;top:43%;width:clamp(92px,13vw,170px);height:clamp(92px,13vw,170px);transform:translate(-50%,-50%) scale(.2) rotate(-15deg);filter:drop-shadow(0 24px 25px rgba(0,0,0,.48)) drop-shadow(0 0 calc(28px + 25px * var(--fx-power,.3)) var(--fx-color,#ffd34e));animation:tlFxObject 2.8s cubic-bezier(.16,.8,.2,1) forwards}
    .tl-fx-object svg{width:100%;height:100%;overflow:visible}
    .tl-fx-copy{position:absolute;left:50%;top:65%;display:grid;place-items:center;gap:1px;width:min(88%,720px);transform:translate(-50%,20px);text-align:center;opacity:0;animation:tlFxCopy 2.8s ease forwards}
    .tl-fx-copy small{color:rgba(235,248,255,.82);font-size:clamp(10px,1vw,13px);font-weight:900;letter-spacing:1.4px;text-transform:uppercase;text-shadow:0 3px 14px #000}
    .tl-fx-copy strong{color:#fff;font-size:clamp(25px,3.4vw,48px);font-weight:1000;line-height:1.02;letter-spacing:-1px;text-shadow:0 5px 22px #000,0 0 24px color-mix(in srgb,var(--fx-color,#ffd34e) 35%,transparent)}
    .tl-fx-copy b{margin-top:5px;color:var(--fx-color,#ffd34e);font-size:clamp(18px,2vw,30px);font-weight:1000;text-shadow:0 3px 18px #000}
    @keyframes tlFxObject{0%{opacity:0;transform:translate(-50%,-50%) scale(.18) rotate(-18deg)}12%{opacity:1;transform:translate(-50%,-50%) scale(calc(.92 + .12 * var(--fx-power,.3))) rotate(4deg)}30%,72%{opacity:1;transform:translate(-50%,-50%) scale(calc(.82 + .18 * var(--fx-power,.3))) rotate(0)}100%{opacity:0;transform:translate(-50%,-62%) scale(calc(1 + .15 * var(--fx-power,.3))) rotate(5deg)}}
    @keyframes tlFxCopy{0%,10%{opacity:0;transform:translate(-50%,20px)}20%,76%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-12px)}}
    @keyframes tlParticle{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateX(12px) scale(.5)}15%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateX(var(--r)) scale(0)}}

    @media(max-width:1050px){.tl-live-side{display:contents}.tl-live-top{order:2;min-height:auto!important;height:auto!important;padding:4px 0 8px}.live-watch-chat{order:3;height:min(500px,52dvh)!important;max-height:min(500px,52dvh)!important}.tl-live-top-list{padding-inline:2px}}
    @media(max-width:620px){.tl-gift-deck-hint{display:none}.tl-gift-pod{flex-basis:108px}.tl-fx-copy{top:68%}.tl-fx-object{top:40%}.tl-live-top-head em{display:none}}
  `;
  document.head.appendChild(css);

  // Rebuild the gift deck into a compact custom rail.
  deck.innerHTML = `
    <div class="tl-gift-deck-head">
      <div class="tl-gift-deck-brand"><i></i><span>TL LIVE GIFTS</span></div>
      <span class="tl-gift-deck-hint">CLIQUE +1 · SEGURE PARA ACELERAR</span>
      <strong id="tlCoinBalance" class="tl-live-gifts-balance">0 TL</strong>
    </div>
    <div id="tlGiftCatalog" class="tl-gift-rail" aria-label="Presentes da live"></div>
    <div id="tlGiftStatus" class="tl-gift-status" aria-live="polite"></div>
  `;

  let overlay = document.getElementById('tlGiftOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tlGiftOverlay';
    playerCard.appendChild(overlay);
  }
  overlay.className = 'tl-gift-overlay';

  const balanceEl = document.getElementById('tlCoinBalance');
  const catalogEl = document.getElementById('tlGiftCatalog');
  const statusEl = document.getElementById('tlGiftStatus');

  // Put chat into a right-side rail. The donor strip occupies exactly the heading slot,
  // therefore the chat begins at the same vertical point as the player.
  const side = document.createElement('aside');
  side.className = 'tl-live-side';
  shell.insertBefore(side, chat);
  side.appendChild(chat);

  const topBoard = document.createElement('section');
  topBoard.className = 'tl-live-top';
  topBoard.innerHTML = `
    <div class="tl-live-top-head"><span>◆</span><strong>TOP DA SALA</strong><em id="tlTopHint">/top 3</em></div>
    <div id="tlTopDonors" class="tl-live-top-list"><span class="tl-top-empty">Os presentes desta live formam o ranking.</span></div>
  `;
  side.insertBefore(topBoard, chat);
  const topList = document.getElementById('tlTopDonors');
  const topHint = document.getElementById('tlTopHint');

  const setStatus = (text, kind = '') => {
    statusEl.textContent = text || '';
    statusEl.dataset.kind = kind;
  };

  const setBalance = value => {
    walletBalance = Math.max(0, Number(value || 0));
    balanceEl.textContent = `${nf.format(walletBalance)} TL`;
  };

  const roomKey = () => String(window.TL_LIVE_CHAT_ROOM || window.TL_CHAT_ROOM || document.body.dataset.chatRoom || `live:${ref.toLowerCase().replace(/^@/, '')}`).trim();

  const syncLayout = () => {
    if (!heading || window.matchMedia('(max-width: 1050px)').matches) return;
    const styles = getComputedStyle(heading);
    const slot = Math.max(58, Math.ceil(heading.getBoundingClientRect().height + (parseFloat(styles.marginBottom) || 0)));
    topBoard.style.setProperty('--tl-heading-slot', `${slot}px`);
  };
  syncLayout();
  window.addEventListener('resize', syncLayout, { passive: true });
  if ('ResizeObserver' in window && heading) new ResizeObserver(syncLayout).observe(heading);

  const vectorFor = key => {
    const common = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff7a7"/><stop offset=".45" stop-color="#ffc532"/><stop offset="1" stop-color="#ff7d23"/></linearGradient><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7ff2ff"/><stop offset="1" stop-color="#1676ff"/></linearGradient></defs>`;
    if (key === 'gift_rush') return `<svg viewBox="0 0 100 100" aria-hidden="true">${common}<path fill="url(#g)" d="M56 5c4 17-8 25-3 36 4-7 10-11 13-19 13 14 22 29 18 46-5 22-25 30-43 25-19-6-29-27-21-45 5-11 15-18 23-28 0 12 1 18 7 23 1-14 8-23 6-38Z"/><path fill="#fff4b0" opacity=".72" d="M53 48c10 10 14 19 10 29-4 11-17 15-27 7-8-6-9-19-2-27 3 9 8 11 12 11-2-8 1-14 7-20Z"/></svg>`;
    if (key === 'gift_rei_live') return `<svg viewBox="0 0 100 100" aria-hidden="true">${common}<path fill="url(#g)" d="m13 32 18 16 19-29 19 29 18-16-8 48H21L13 32Z"/><path fill="#ffef78" d="M23 71h54v13H23z"/><circle cx="30" cy="57" r="5" fill="#25dbff"/><circle cx="50" cy="55" r="5" fill="#ff385d"/><circle cx="70" cy="57" r="5" fill="#66ff73"/></svg>`;
    if (key === 'gift_team_legend') return `<svg viewBox="0 0 100 100" aria-hidden="true">${common}<path fill="url(#g)" d="M29 14h42v14c0 20-7 31-18 36v12h17v10H30V76h17V64C36 59 29 48 29 28V14Z"/><path fill="none" stroke="#ffc532" stroke-width="8" d="M30 25H15c0 20 7 29 22 31M70 25h15c0 20-7 29-22 31"/><path fill="#fff0a0" opacity=".7" d="M39 22h22v9H39z"/></svg>`;
    return `<svg viewBox="0 0 120 100" aria-hidden="true">${common}<circle cx="32" cy="76" r="13" fill="#202933" stroke="#bfefff" stroke-width="5"/><circle cx="87" cy="76" r="13" fill="#202933" stroke="#bfefff" stroke-width="5"/><path fill="url(#g)" d="M35 41h38l12 12h17v14H78L67 52H45l-9 15H19l7-24 9-2Z"/><path fill="url(#c)" d="M47 25h28l7 22H59l-12-22Z"/><path fill="#f8fbff" d="M80 43h20v7H83z"/><path fill="#18232b" d="M30 33h22v7H30z"/></svg>`;
  };

  const colorFor = key => ({gift_lambreta:'#ffd046',gift_rush:'#ff693e',gift_rei_live:'#ffd54c',gift_team_legend:'#64eaff'}[key] || '#67e7ff');

  const loadWallet = async () => {
    const { data: sessionData } = await sb.auth.getSession();
    userId = sessionData.session?.user?.id || null;
    if (!userId) {
      setBalance(0);
      setStatus('Entra na tua conta para enviar presentes.', 'info');
      return;
    }
    const { data, error } = await sb.from('tl_wallets').select('balance').eq('user_id', userId).maybeSingle();
    if (error) {
      console.warn('[TL Gifts] carteira:', error.message);
      setStatus('Não foi possível carregar o saldo.', 'error');
      return;
    }
    setBalance(data?.balance || 0);
  };

  const resolveStreamer = async () => {
    const columns = 'id,display_name,tiktok_url,live_url,is_published,is_archived';
    if (UUID_RE.test(ref)) {
      const { data } = await sb.from('streamers').select(columns).eq('id', ref).eq('is_published', true).eq('is_archived', false).maybeSingle();
      streamerId = data?.id || null;
      return;
    }
    const { data } = await sb.from('streamers').select(columns).eq('is_published', true).eq('is_archived', false);
    const needle = ref.toLowerCase().replace(/^@/, '');
    const row = (data || []).find(item => `${item.display_name || ''} ${item.tiktok_url || ''} ${item.live_url || ''}`.toLowerCase().includes(needle));
    streamerId = row?.id || null;
  };

  const loadGifts = async () => {
    const { data, error } = await sb.from('tl_gifts').select('id,code,name,emoji,coin_cost,effect_key').eq('is_active', true).order('sort_order');
    if (error) {
      console.warn('[TL Gifts] catálogo:', error.message);
      setStatus('Não foi possível carregar os presentes.', 'error');
      return;
    }
    gifts = data || [];
    renderGifts();
  };

  const comboPower = qty => Math.min(1, .12 + Math.log2(Math.max(1, qty)) * .16);

  const renderGifts = () => {
    catalogEl.replaceChildren();
    gifts.forEach(gift => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tl-gift-pod';
      button.dataset.giftId = gift.id;
      button.style.setProperty('--pod', colorFor(gift.effect_key));
      button.setAttribute('aria-label', `${gift.name}, ${gift.coin_cost} TL. Clique para enviar um; segure para combo.`);
      button.innerHTML = `
        <span class="tl-gift-pod-shell">
          <span class="tl-gift-vector">${vectorFor(gift.effect_key)}</span>
          <span class="tl-gift-pod-copy"><strong>${gift.name}</strong><small>${nf.format(gift.coin_cost)} TL</small></span>
        </span>
        <b class="tl-gift-combo-badge">x1</b>
      `;

      const endHold = () => {
        clearTimeout(holdTimer); holdTimer = null;
        clearTimeout(holdLoop); holdLoop = null;
        button.classList.remove('is-holding');
        scheduleComboFlush(520);
        window.dispatchEvent(new CustomEvent('tl:gift-hold-end', { detail: { gift: gift.effect_key, quantity: combo?.gift?.id === gift.id ? combo.quantity : 0 } }));
      };

      const addFromPress = () => {
        queueGift(gift, button);
      };

      button.addEventListener('pointerdown', event => {
        if (event.button != null && event.button !== 0) return;
        event.preventDefault();
        addFromPress();
        try { button.setPointerCapture(event.pointerId); } catch (_) {}
        holdTimer = setTimeout(() => {
          button.classList.add('is-holding');
          const started = performance.now();
          const tick = () => {
            if (!button.classList.contains('is-holding')) return;
            addFromPress();
            const elapsed = performance.now() - started;
            const delay = Math.max(72, 180 - elapsed / 22);
            holdLoop = setTimeout(tick, delay);
          };
          tick();
        }, 420);
      });
      button.addEventListener('pointerup', endHold);
      button.addEventListener('pointercancel', endHold);
      button.addEventListener('lostpointercapture', endHold);
      button.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        queueGift(gift, button);
      });
      catalogEl.appendChild(button);
    });
  };

  const clearComboVisuals = () => {
    document.querySelectorAll('.tl-gift-pod').forEach(button => {
      button.classList.remove('has-combo','is-holding');
      button.style.removeProperty('--combo-power');
      const badge = button.querySelector('.tl-gift-combo-badge');
      if (badge) badge.textContent = 'x1';
    });
  };

  const scheduleComboFlush = (delay = 760) => {
    clearTimeout(comboTimer);
    comboTimer = setTimeout(flushCombo, delay);
  };

  const queueGift = (gift, button) => {
    if (sending) return;
    if (!userId) {
      setStatus('Faz login para enviar presentes.', 'error');
      return;
    }
    if (!streamerId) {
      setStatus('Esta sala ainda não está ligada a um streamer.', 'error');
      return;
    }

    if (combo && combo.gift.id !== gift.id) {
      flushCombo();
      return;
    }

    const nextQty = (combo?.quantity || 0) + 1;
    const projected = Number(gift.coin_cost) * nextQty;
    if (projected > walletBalance) {
      setStatus('Saldo TL insuficiente para aumentar o combo.', 'error');
      scheduleComboFlush(120);
      return;
    }
    if (nextQty > 100) return;

    combo = { gift, quantity: nextQty };
    button.classList.add('has-combo');
    button.style.setProperty('--combo-power', comboPower(nextQty));
    const badge = button.querySelector('.tl-gift-combo-badge');
    if (badge) badge.textContent = `x${nextQty}`;
    setStatus(nextQty === 1 ? `${gift.name} preparado…` : `${gift.name} combo x${nextQty}`, 'info');
    scheduleComboFlush();

    const intensity = comboPower(nextQty);
    window.dispatchEvent(new CustomEvent('tl:gift-combo', {
      detail: { gift: gift.effect_key, quantity: nextQty, intensity, suggestedVolume: Math.min(.9, .22 + intensity * .62) }
    }));
  };

  async function flushCombo() {
    clearTimeout(comboTimer); comboTimer = null;
    if (!combo || sending) return;
    const batch = combo;
    combo = null;
    clearComboVisuals();

    sending = true;
    catalogEl.style.pointerEvents = 'none';
    setStatus(batch.quantity > 1 ? `A enviar ${batch.gift.name} x${batch.quantity}…` : `A enviar ${batch.gift.name}…`, 'info');

    const { data, error } = await sb.rpc('tl_send_gift', {
      p_streamer: streamerId,
      p_gift: batch.gift.id,
      p_quantity: batch.quantity,
      p_room: roomKey()
    });

    sending = false;
    catalogEl.style.removeProperty('pointer-events');
    if (error) {
      console.warn('[TL Gifts] envio:', error.message);
      const message = /saldo|balance|insufficient/i.test(error.message || '') ? 'Saldo TL insuficiente.' : (error.message || 'Não foi possível enviar o presente.');
      setStatus(message, 'error');
      return;
    }
    if (data && typeof data === 'object' && Number.isFinite(Number(data.balance))) setBalance(data.balance);
    else await loadWallet();
    setStatus(batch.quantity > 1 ? `${batch.gift.name} x${batch.quantity} enviado!` : `${batch.gift.name} enviado!`, 'success');
  }

  const senderName = async senderId => {
    if (!senderId) return 'Alguém';
    const { data } = await sb.from('profiles').select('game_nickname,full_name').eq('id', senderId).maybeSingle();
    return data?.game_nickname || data?.full_name || 'Alguém';
  };

  const showGiftEvent = async event => {
    const currentRoom = roomKey();
    if (event.room && currentRoom && event.room !== currentRoom) return;
    const gift = gifts.find(item => item.id === event.gift_id);
    if (!gift) return;
    const name = await senderName(event.sender_user_id);
    const qty = Number(event.quantity || 1);
    const power = comboPower(qty);
    const color = colorFor(gift.effect_key);

    overlay.replaceChildren();
    overlay.style.setProperty('--fx-power', power);
    overlay.style.setProperty('--fx-color', color);

    const particles = document.createElement('div');
    particles.className = 'tl-fx-particles';
    const count = Math.round(8 + power * 14);
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.className = 'tl-fx-particle';
      p.style.setProperty('--i', i);
      p.style.setProperty('--a', `${Math.round((360 / count) * i + (i % 2 ? 8 : -5))}deg`);
      p.style.setProperty('--r', `${110 + Math.round(power * 150) + (i % 3) * 20}px`);
      particles.appendChild(p);
    }

    const object = document.createElement('div');
    object.className = 'tl-fx-object';
    object.innerHTML = vectorFor(gift.effect_key);

    const copy = document.createElement('div');
    copy.className = 'tl-fx-copy';
    const who = document.createElement('small');
    who.textContent = `${name} enviou`;
    const what = document.createElement('strong');
    what.textContent = gift.name;
    const multiplier = document.createElement('b');
    multiplier.textContent = qty > 1 ? `x${qty}` : '';
    copy.append(who, what);
    if (qty > 1) copy.appendChild(multiplier);
    overlay.append(particles, object, copy);

    overlay.classList.remove('is-visible');
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => overlay.classList.remove('is-visible'), 3000);

    // No hard-coded audio yet. This event is the hook for the sound pack we will choose later.
    window.dispatchEvent(new CustomEvent('tl:gift-effect', {
      detail: { gift: gift.effect_key, quantity: qty, intensity: power, suggestedVolume: Math.min(.92, .26 + power * .62) }
    }));
  };

  const loadTopLimit = async () => {
    if (!streamerId) return;
    const room = roomKey();
    const { data } = await sb.from('tl_live_room_settings').select('top_donors_limit').eq('streamer_id', streamerId).eq('room', room).maybeSingle();
    topLimit = Number.isFinite(Number(data?.top_donors_limit)) ? Number(data.top_donors_limit) : 3;
    if (topHint) topHint.textContent = topLimit === 0 ? '/top 0 · oculto' : `/top ${topLimit}`;
  };

  const loadTopDonors = async () => {
    if (!streamerId) return;
    await loadTopLimit();
    if (topLimit === 0) {
      topList.innerHTML = '<span class="tl-top-empty">Ranking oculto pelo streamer/mod.</span>';
      return;
    }
    const { data, error } = await sb.rpc('tl_live_top_donors', { p_streamer: streamerId, p_room: roomKey() });
    if (error) {
      console.warn('[TL Top] ranking:', error.message);
      topList.innerHTML = '<span class="tl-top-empty">Ranking indisponível.</span>';
      return;
    }
    if (!data?.length) {
      topList.innerHTML = '<span class="tl-top-empty">Os presentes desta live formam o ranking.</span>';
      return;
    }
    topList.replaceChildren();
    data.forEach(row => {
      const chip = document.createElement('div');
      chip.className = 'tl-top-chip';
      const rank = document.createElement('b'); rank.className = 'tl-top-rank'; rank.textContent = `#${row.rank}`;
      const name = document.createElement('strong'); name.className = 'tl-top-name'; name.textContent = row.display_name || 'Membro';
      const value = document.createElement('small'); value.className = 'tl-top-value'; value.textContent = `${nf.format(Number(row.amount || 0))} TL · ${nf.format(Number(row.gift_count || 0))} presentes`;
      chip.append(rank, name, value);
      topList.appendChild(chip);
    });
  };

  const subscribeRealtime = () => {
    if (!streamerId || giftChannel) return;
    giftChannel = sb.channel(`tl-gifts-v2-${streamerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tl_gift_events', filter: `streamer_id=eq.${streamerId}` }, payload => {
        showGiftEvent(payload.new);
        if (!payload.new.room || payload.new.room === roomKey()) loadTopDonors();
      })
      .subscribe();

    settingsChannel = sb.channel(`tl-live-settings-${streamerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tl_live_room_settings', filter: `streamer_id=eq.${streamerId}` }, payload => {
        const row = payload.new || payload.old;
        if (!row?.room || row.room === roomKey()) loadTopDonors();
      })
      .subscribe();
  };

  const installTopCommand = () => {
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    if (!form || !input) return;
    form.addEventListener('submit', async event => {
      const raw = String(input.value || '').trim();
      const match = raw.match(/^\/top(?:\s+(\d{1,2}))?$/i);
      if (!match) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!match[1]) {
        setStatus('Comando: /top 3, /top 5… Use /top 0 para ocultar.', 'info');
        input.value = '';
        return;
      }
      const limit = Number(match[1]);
      if (limit < 0 || limit > 10) {
        setStatus('O TOP pode ficar entre 0 e 10.', 'error');
        input.value = '';
        return;
      }
      if (!streamerId) return;
      const { data, error } = await sb.rpc('tl_set_live_top_limit', { p_streamer: streamerId, p_room: roomKey(), p_limit: limit });
      input.value = '';
      if (error) {
        setStatus(/NOT_ALLOWED/i.test(error.message || '') ? 'Só streamer/moderação pode alterar o TOP.' : (error.message || 'Não foi possível alterar o TOP.'), 'error');
        return;
      }
      topLimit = Number(data?.limit ?? limit);
      setStatus(topLimit === 0 ? 'TOP da sala ocultado.' : `TOP ${topLimit} ativado na sala.`, 'success');
      await loadTopDonors();
    }, true);
  };

  sb.auth.onAuthStateChange(() => setTimeout(loadWallet, 0));

  (async () => {
    await Promise.all([resolveStreamer(), loadGifts(), loadWallet()]);
    // Give the live chat bootstrap a moment to resolve the current room/session.
    for (let i = 0; i < 10 && !window.TL_LIVE_CHAT_ROOM; i += 1) await new Promise(resolve => setTimeout(resolve, 120));
    await loadTopDonors();
    subscribeRealtime();
    installTopCommand();
  })();

  window.addEventListener('beforeunload', () => {
    clearTimeout(comboTimer); clearTimeout(holdTimer); clearTimeout(holdLoop);
    if (giftChannel) sb.removeChannel(giftChannel);
    if (settingsChannel) sb.removeChannel(settingsChannel);
  });
})();
