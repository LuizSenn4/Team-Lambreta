(()=>{
  'use strict';
  if(window.TLChatNameProfilePreviewLoaded)return;
  window.TLChatNameProfilePreviewLoaded=true;

  const enhance=(root=document)=>{
    const items=[];
    if(root.matches?.('.tl-chat-name'))items.push(root);
    root.querySelectorAll?.('.tl-chat-name:not([data-chat-profile-ready])').forEach(el=>items.push(el));
    items.forEach(el=>{
      if(el.dataset.chatProfileReady)return;
      const nick=String(el.textContent||'').trim();
      if(!nick)return;
      el.dataset.chatProfileReady='1';
      el.dataset.memberNick=nick;
      if(el.dataset.userId)el.dataset.memberUserId=el.dataset.userId;
      el.classList.add('tl-global-mention','tl-chat-profile-trigger');
      el.setAttribute('role','button');
      el.setAttribute('aria-label',`Ver mini perfil de ${nick}`);
      el.tabIndex=0;
    });
  };

  const style=document.createElement('style');
  style.textContent=`
    .tl-chat-name.tl-chat-profile-trigger{cursor:pointer!important;text-decoration:none!important}
    .tl-chat-name.tl-chat-profile-trigger:hover{text-decoration:underline!important;text-underline-offset:3px}
  `;
  document.head.appendChild(style);

  const start=()=>{
    enhance();
    const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType===1)enhance(node);
    })));
    observer.observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
