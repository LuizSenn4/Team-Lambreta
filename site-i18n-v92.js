(()=>{'use strict';
const map={
'pl':{'Início':'Start','Sobre':'O nas','Team':'Zespół','Fórum':'Forum','Loja':'Sklep','Contato':'Kontakt','Entrar com Google':'Zaloguj przez Google','Guardar perfil':'Zapisz profil','Cancelar':'Anuluj','País':'Kraj','Idade':'Wiek','Jogo':'Gra','Modo':'Tryb','Tipo de armas':'Rodzaj broni','Estilo':'Styl','Escreve no lobby...':'Napisz na lobby...','Traduzir para':'Tłumacz na','Enviar original':'Wyślij oryginał','Sempre usar':'Zawsze używaj'},
'es':{'Início':'Inicio','Sobre':'Sobre nosotros','Team':'Equipo','Fórum':'Foro','Loja':'Tienda','Contato':'Contacto','Entrar com Google':'Entrar con Google','Guardar perfil':'Guardar perfil','Cancelar':'Cancelar','País':'País','Idade':'Edad','Jogo':'Juego','Modo':'Modo','Tipo de armas':'Tipo de armas','Estilo':'Estilo','Escreve no lobby...':'Escribe en el lobby...','Traduzir para':'Traducir a','Enviar original':'Enviar original','Sempre usar':'Usar siempre'},
'fr':{'Início':'Accueil','Sobre':'À propos','Team':'Équipe','Fórum':'Forum','Loja':'Boutique','Contato':'Contact','Entrar com Google':'Se connecter avec Google','Guardar perfil':'Enregistrer le profil','Cancelar':'Annuler','País':'Pays','Idade':'Âge','Jogo':'Jeu','Modo':'Mode','Tipo de armas':'Type d’armes','Estilo':'Style','Escreve no lobby...':'Écrivez dans le lobby...','Traduzir para':'Traduire vers','Enviar original':'Envoyer l’original','Sempre usar':'Toujours utiliser'},
'en-US':{'Início':'Home','Sobre':'About','Team':'Team','Fórum':'Forum','Loja':'Store','Contato':'Contact','Entrar com Google':'Sign in with Google','Guardar perfil':'Save profile','Cancelar':'Cancel','País':'Country','Idade':'Age','Jogo':'Game','Modo':'Mode','Tipo de armas':'Weapon type','Estilo':'Style','Escreve no lobby...':'Write in the lobby...','Traduzir para':'Translate to','Enviar original':'Send original','Sempre usar':'Always use'},
'en-GB':{'Início':'Home','Sobre':'About','Team':'Team','Fórum':'Forum','Loja':'Shop','Contato':'Contact','Entrar com Google':'Sign in with Google','Guardar perfil':'Save profile','Cancelar':'Cancel','País':'Country','Idade':'Age','Jogo':'Game','Modo':'Mode','Tipo de armas':'Weapon type','Estilo':'Style','Escreve no lobby...':'Write in the lobby...','Traduzir para':'Translate to','Enviar original':'Send original','Sempre usar':'Always use'},
'pt-PT':{},'pt-BR':{}
};

const detected=(()=>{
  const raw=(navigator.languages?.[0]||navigator.language||'pt-PT').toLowerCase();
  if(raw.startsWith('pl'))return'pl';
  if(raw.startsWith('es'))return'es';
  if(raw.startsWith('fr'))return'fr';
  if(raw==='pt-br')return'pt-BR';
  if(raw.startsWith('pt'))return'pt-PT';
  if(raw==='en-us')return'en-US';
  if(raw.startsWith('en'))return'en-GB';
  return'pt-PT';
})();
const lang=detected;
try{localStorage.removeItem('tl_language')}catch(_){}

const original=new WeakMap();
function translateNode(node){
  if(node.nodeType!==Node.TEXT_NODE)return;
  const t=node.nodeValue.trim();if(!t)return;
  if(!original.has(node))original.set(node,node.nodeValue);
  const base=original.get(node),raw=base.trim(),value=(map[lang]||{})[raw];
  node.nodeValue=value?base.replace(raw,value):base;
}
function apply(){
  document.documentElement.lang=lang;
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(n.parentElement?.tagName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n;while(n=w.nextNode())translateNode(n);
  document.querySelectorAll('[placeholder]').forEach(el=>{
    el.dataset.tlOriginalPlaceholder||=(el.getAttribute('placeholder')||'');
    el.placeholder=(map[lang]||{})[el.dataset.tlOriginalPlaceholder]||el.dataset.tlOriginalPlaceholder;
  });
}
function tickClock(clock){
  try{clock.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short'}).format(new Date())}
  catch(_){clock.textContent=new Date().toLocaleString()}
}
function tools(){
  if(document.querySelector('.tl-global-tools'))return;
  const box=document.createElement('div');box.className='tl-global-tools tl-global-tools-auto';
  const clock=document.createElement('time');clock.className='tl-local-clock';clock.setAttribute('aria-label','Data e hora local');
  tickClock(clock);setInterval(()=>tickClock(clock),30000);
  box.append(clock);
  const header=document.querySelector('.site-header.tl-header-v88,.site-header');
  (header||document.body).appendChild(box);
  const existingKey=document.querySelector('.tl-admin-key');if(existingKey)box.appendChild(existingKey);
  let lastY=Math.max(0,scrollY),ticking=false;
  const updateTools=()=>{const y=Math.max(0,scrollY);if(y>lastY&&y>90)box.classList.add('tl-tools-hidden');else if(y<lastY-3||y<36)box.classList.remove('tl-tools-hidden');lastY=y;ticking=false};
  addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateTools);ticking=true}},{passive:true});
}
function boot(){
  tools();apply();
  new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.TLI18n={getLanguage:()=>lang,getZone:()=>({country:'Dispositivo',flag:'⌖',city:'Local',timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||null})};
})();
