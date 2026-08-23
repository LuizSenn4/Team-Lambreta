(() => {
'use strict';
if(window.__TL_V102_LEGACY_BRIDGE__)return;window.__TL_V102_LEGACY_BRIDGE__=true;
const css=(href,key)=>{if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='1';document.head.appendChild(l)};
const js=(src,key)=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='1';document.body.appendChild(s)};
css('tl-design-system-v100.css?v=102.3','tl-v102-design');css('tl-polish-v100.css?v=102.3','tl-v102-polish');
const boot=()=>{
  js('site-shell-v102.js?v=102.3','tl-v102-shell');
  if(/forum\.html$/i.test(location.pathname))js('forum-route-actions-v101.js?v=101.0','tl-forum-route-actions');
  if(/(?:eventos|loja|midia|conquistas)\.html$/i.test(location.pathname))js('public-content-v102.js?v=102.3','tl-v102-content');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
if(typeof window.normalizeChatName!=='function')window.normalizeChatName=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
localStorage.setItem('tl_theme','dark');document.documentElement.dataset.theme='dark';
})();