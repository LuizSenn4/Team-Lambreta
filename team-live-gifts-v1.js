(() => {
  'use strict';

  const sb = window.teamSupabase;
  const balanceEl = document.getElementById('tlCoinBalance');
  const toggle = document.getElementById('tlGiftToggle');
  const panel = document.getElementById('tlGiftPanel');
  const catalogEl = document.getElementById('tlGiftCatalog');
  const statusEl = document.getElementById('tlGiftStatus');
  const overlay = document.getElementById('tlGiftOverlay');
  const qtyButtons = [...document.querySelectorAll('[data-gift-qty]')];

  if (!sb || !balanceEl || !toggle || !panel || !catalogEl || !overlay) return;

  const params = new URLSearchParams(location.search);
  const ref = (params.get('streamer') || params.get('user') || 'rv3113').trim();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const nf = new Intl.NumberFormat('pt-PT');

  let streamerId = null;
  let userId = null;
  let quantity = 1;
  let gifts = [];
  let giftChannel = null;
  let overlayTimer = null;
  let sending = false;

  const setStatus = (text, kind = '') => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.dataset.kind = kind;
  };

  const setBalance = value => {
    const safe = Number(value || 0);
    balanceEl.textContent = `${nf.format(safe)} TL`;
  };

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

  const renderGifts = () => {
    catalogEl.innerHTML = '';
    gifts.forEach(gift => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tl-gift-card';
      button.dataset.giftId = gift.id;
      const emoji = document.createElement('span');
      emoji.className = 'tl-gift-emoji';
      emoji.textContent = gift.emoji || '🎁';
      const copy = document.createElement('span');
      copy.className = 'tl-gift-copy';
      const name = document.createElement('strong');
      name.textContent = gift.name;
      const cost = document.createElement('small');
      cost.textContent = `${nf.format(Number(gift.coin_cost) * quantity)} TL${quantity > 1 ? ` · x${quantity}` : ''}`;
      copy.append(name, cost);
      button.append(emoji, copy);
      button.addEventListener('click', () => sendGift(gift));
      catalogEl.appendChild(button);
    });
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

  const senderName = async senderId => {
    if (!senderId) return 'Alguém';
    const { data } = await sb.from('profiles').select('game_nickname,full_name').eq('id', senderId).maybeSingle();
    return data?.game_nickname || data?.full_name || 'Alguém';
  };

  const showGiftEvent = async event => {
    const gift = gifts.find(item => item.id === event.gift_id);
    if (!gift) return;
    const name = await senderName(event.sender_user_id);
    const qty = Number(event.quantity || 1);

    overlay.replaceChildren();
    const emoji = document.createElement('div');
    emoji.className = 'tl-gift-overlay-emoji';
    emoji.textContent = gift.emoji || '🎁';
    const line = document.createElement('strong');
    line.textContent = `${name} enviou ${gift.emoji || '🎁'} ${gift.name}${qty > 1 ? ` x${qty}` : ''}`;
    const sub = document.createElement('span');
    sub.textContent = `+ ${nf.format(Number(event.total_cost || (gift.coin_cost * qty)))} TL`;
    overlay.append(emoji, line, sub);

    overlay.classList.remove('is-visible');
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => overlay.classList.remove('is-visible'), 3600);
  };

  const subscribeGifts = () => {
    if (!streamerId || giftChannel) return;
    giftChannel = sb.channel(`tl-gifts-${streamerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tl_gift_events', filter: `streamer_id=eq.${streamerId}` }, payload => showGiftEvent(payload.new))
      .subscribe();
  };

  async function sendGift(gift) {
    if (sending) return;
    const { data: sessionData } = await sb.auth.getSession();
    userId = sessionData.session?.user?.id || null;
    if (!userId) {
      setStatus('Faz login para enviar presentes.', 'error');
      return;
    }
    if (!streamerId) {
      setStatus('Esta sala ainda não está ligada a um streamer.', 'error');
      return;
    }

    sending = true;
    catalogEl.classList.add('is-sending');
    setStatus(`A enviar ${gift.emoji || '🎁'} ${gift.name} x${quantity}…`, 'info');

    const { data, error } = await sb.rpc('tl_send_gift', {
      p_streamer: streamerId,
      p_gift: gift.id,
      p_quantity: quantity
    });

    sending = false;
    catalogEl.classList.remove('is-sending');

    if (error) {
      console.warn('[TL Gifts] envio:', error.message);
      const message = /saldo|balance|insufficient/i.test(error.message || '') ? 'Saldo TL insuficiente.' : (error.message || 'Não foi possível enviar o presente.');
      setStatus(message, 'error');
      return;
    }

    if (data && typeof data === 'object' && Number.isFinite(Number(data.balance))) setBalance(data.balance);
    else await loadWallet();
    setStatus(`${gift.emoji || '🎁'} ${gift.name} enviado x${quantity}!`, 'success');
  }

  toggle.addEventListener('click', () => {
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });

  qtyButtons.forEach(button => button.addEventListener('click', () => {
    quantity = Math.max(1, Math.min(100, Number(button.dataset.giftQty) || 1));
    qtyButtons.forEach(item => item.classList.toggle('is-active', item === button));
    renderGifts();
  }));

  sb.auth.onAuthStateChange(() => setTimeout(loadWallet, 0));

  (async () => {
    await Promise.all([resolveStreamer(), loadGifts(), loadWallet()]);
    subscribeGifts();
  })();

  window.addEventListener('beforeunload', () => {
    if (giftChannel) sb.removeChannel(giftChannel);
  });
})();
