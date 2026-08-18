(()=>{
  'use strict';
  if(window.TLProfileUiPolishLoaded)return;
  window.TLProfileUiPolishLoaded=true;

  const STYLE_ID='tl-profile-ui-polish-v1';
  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      /* Badge DEV do card superior = mesmo acabamento do DEV do rodapé */
      .tl-home-account-card.role-master .tl-home-account-role,
      .tl-home-account-card.role-dev .tl-home-account-role{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        flex:0 0 auto!important;
        width:auto!important;
        min-width:42px!important;
        height:18px!important;
        min-height:18px!important;
        margin:0!important;
        padding:0 7px!important;
        border:1px solid #5ef3ff!important;
        border-radius:999px!important;
        background:#09191b!important;
        color:#fff!important;
        font:950 8px/16px Inter,Arial,sans-serif!important;
        letter-spacing:.7px!important;
        text-align:center!important;
        text-transform:uppercase!important;
        text-shadow:none!important;
        box-shadow:0 0 8px rgba(94,243,255,.18)!important;
      }

      /* Seletores do editor: pesquisa + lista compacta */
      .tl-hpe-search-wrap{display:grid;gap:7px;margin-bottom:8px}
      .tl-hpe-search-wrap input{
        width:100%!important;box-sizing:border-box!important;
        border:1px solid rgba(94,243,255,.28)!important;
        border-radius:10px!important;background:#080b09!important;
        color:#f1f5f2!important;padding:10px 12px!important;
        font:700 12px/1.2 system-ui!important;outline:none!important;
      }
      .tl-hpe-search-wrap input:focus{border-color:#5ef3ff!important;box-shadow:0 0 0 2px rgba(94,243,255,.10)!important}
      .tl-hpe-search-list,
      .tl-hpe-mode-group .tl-hpe-chips{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:6px!important;
        max-height:210px!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        padding:4px 3px 4px 0!important;
        scrollbar-width:thin;
      }
      .tl-hpe-search-list .tl-hpe-chip,
      .tl-hpe-mode-group .tl-hpe-chip{
        width:100%!important;
        min-height:34px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        text-align:left!important;
        border-radius:9px!important;
        padding:8px 11px!important;
        background:#0d120f!important;
        color:#dfe8e1!important;
        border:1px solid rgba(255,255,255,.10)!important;
        box-shadow:none!important;
      }
      .tl-hpe-search-list .tl-hpe-chip:hover,
      .tl-hpe-mode-group .tl-hpe-chip:hover{border-color:rgba(94,243,255,.45)!important;background:#111a16!important}
      .tl-hpe-search-list .tl-hpe-chip.is-active,
      .tl-hpe-mode-group .tl-hpe-chip.is-active{
        border-color:#5ef3ff!important;background:#0b2a2e!important;color:#8ff8ff!important;
      }
      .tl-hpe-search-list .tl-hpe-chip.is-active::after,
      .tl-hpe-mode-group .tl-hpe-chip.is-active::after{content:'✓';font-weight:950;color:#5ef3ff;margin-left:10px}

      /* Capas também entram em lista pesquisável */
      #tlHpeCovers.tl-hpe-search-list{grid-template-columns:1fr!important;max-height:230px!important}
      #tlHpeCovers .tl-hpe-cover{
        width:100%!important;display:grid!important;grid-template-columns:86px 1fr!important;
        align-items:center!important;gap:10px!important;padding:6px!important;
        border:1px solid rgba(255,255,255,.10)!important;border-radius:10px!important;
        background:#0d120f!important;text-align:left!important;
      }
      #tlHpeCovers .tl-hpe-cover img{width:86px!important;height:42px!important;aspect-ratio:auto!important;border-radius:7px!important;object-fit:cover!important}
      #tlHpeCovers .tl-hpe-cover span{padding:0!important;color:#dfe8e1!important;font:800 11px/1.2 system-ui!important}
      #tlHpeCovers .tl-hpe-cover.is-active{border-color:#5ef3ff!important;background:#0b2a2e!important;box-shadow:none!important}

      .tl-hpe-mode-group{display:grid!important;gap:6px!important}
      .tl-hpe-mode-group strong{margin:0!important}
      .tl-hpe-item-hidden{display:none!important}
      @media(max-width:680px){
        .tl-hpe-search-list,.tl-hpe-mode-group .tl-hpe-chips{max-height:180px!important}
        #tlHpeCovers .tl-hpe-cover{grid-template-columns:72px 1fr!important}
        #tlHpeCovers .tl-hpe-cover img{width:72px!important;height:36px!important}
      }
    `;
    document.head.appendChild(s);
  }

  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function applyFilter(container,input){
    if(!container||!input)return;
    const q=normalize(input.value);
    container.querySelectorAll('button').forEach(btn=>{
      btn.classList.toggle('tl-hpe-item-hidden',q&&!normalize(btn.textContent).includes(q));
    });
    if(container.id==='tlHpeModes'){
      container.querySelectorAll('.tl-hpe-mode-group').forEach(group=>{
        const visible=[...group.querySelectorAll('button')].some(b=>!b.classList.contains('tl-hpe-item-hidden'));
        group.classList.toggle('tl-hpe-item-hidden',q&&!visible&&!normalize(group.querySelector('strong')?.textContent).includes(q));
      });
    }
  }

  function addSearch(containerId,placeholder){
    const container=document.getElementById(containerId);
    if(!container)return;
    container.classList.add('tl-hpe-search-list');
    const key=`tl-search-${containerId}`;
    let input=document.getElementById(key);
    if(!input){
      const wrap=document.createElement('div');
      wrap.className='tl-hpe-search-wrap';
      input=document.createElement('input');
      input.id=key;
      input.type='search';
      input.autocomplete='off';
      input.placeholder=placeholder;
      input.setAttribute('aria-label',placeholder);
      wrap.appendChild(input);
      container.parentNode.insertBefore(wrap,container);
      input.addEventListener('input',()=>applyFilter(container,input));
    }
    if(!container.dataset.tlSearchObserved){
      container.dataset.tlSearchObserved='1';
      new MutationObserver(()=>applyFilter(container,input)).observe(container,{childList:true,subtree:true});
    }
    applyFilter(container,input);
  }

  function enhanceEditor(){
    const d=document.getElementById('tlHomeProfileDialog');
    if(!d)return;
    addSearch('tlHpeGames','Pesquisar jogo...');
    addSearch('tlHpePlatforms','Pesquisar plataforma...');
    addSearch('tlHpeModes','Pesquisar modo de jogo...');
    addSearch('tlHpeCovers','Pesquisar capa...');
  }

  function run(){ensureStyles();enhanceEditor()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();