(()=>{
  'use strict';
  if(document.querySelector('script[data-tl-tour-v2]')) return;
  const script=document.createElement('script');
  script.src='tour-v2.js?v=2.0';
  script.defer=true;
  script.dataset.tlTourV2='true';
  document.body.appendChild(script);
})();
