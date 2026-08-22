(() => {
  'use strict';
  if (window.__TL_BUDDY_SELF_STATUS_CONTROL__) return;
  window.__TL_BUDDY_SELF_STATUS_CONTROL__ = true;

  function init() {
    const line = document.querySelector('.buddy-self-line');
    const dot = document.getElementById('buddySelfDot');
    const name = document.getElementById('buddySelfName');
    if (!line || !dot || !name || line.querySelector('.buddy-self-status-trigger')) return;

    const style = document.createElement('style');
    style.textContent = `
      .buddy-self-line{position:relative;overflow:visible}
      .buddy-self-status-trigger{display:inline-flex;align-items:center;gap:7px;padding:2px 4px 2px 0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer;min-width:0}
      .buddy-self-status-trigger:hover,.buddy-self-status-trigger:focus-visible{background:rgba(0,223,245,.08)}
      .buddy-self-status-trigger strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
      .buddy-self-status-menu{position:absolute;left:0;top:calc(100% + 8px);z-index:120;width:190px;padding:7px;border:1px solid #263548;border-radius:12px;background:#0b1219;box-shadow:0 18px 45px rgba(0,0,0,.45)}
      .buddy-self-status-menu[hidden]{display:none!important}
      .buddy-self-status-menu button{width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#e7eef4;text-align:left;cursor:pointer}
      .buddy-self-status-menu button:hover{background:rgba(0,223,245,.09)}
      .buddy-self-status-menu small{display:block;padding:7px 10px 4px;color:#7f8b9a;font-size:10px;line-height:1.35}
    `;
    document.head.appendChild(style);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'buddy-self-status-trigger';
    trigger.setAttribute('aria-label', 'Alterar o meu status');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');

    line.insertBefore(trigger, dot);
    trigger.append(dot, name);

    const menu = document.createElement('div');
    menu.className = 'buddy-self-status-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    menu.innerHTML = `
      <button type="button" data-self-presence="online"><i class="buddy-dot online"></i> Online</button>
      <button type="button" data-self-presence="busy"><i class="buddy-dot busy"></i> Ocupado</button>
      <small>Ausente é automático após 5 minutos sem atividade.</small>
    `;
    line.appendChild(menu);

    const close = () => {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
    });

    menu.addEventListener('click', async event => {
      const option = event.target.closest('[data-self-presence]');
      if (!option) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        await window.TeamPresence?.setManual?.(option.dataset.selfPresence);
      } catch (error) {
        console.error('[Buddy] falha ao alterar status', error);
      }
      close();
    });

    document.addEventListener('pointerdown', event => {
      if (!line.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
