(()=>{'use strict';
const LANGS={
'pt-BR':{label:'🇧🇷 Português — Brasil'},
'pt-PT':{label:'🇵🇹 Português — Portugal'},
'pl':{label:'🇵🇱 Polski'},
'es':{label:'🇪🇸 Español'},
'fr':{label:'🇫🇷 Français'},
'en-US':{label:'🇺🇸 English — US'},
'en-GB':{label:'🇬🇧 English — UK'}
};
const map={
'pl':{'Início':'Start','Sobre':'O nas','Team':'Zespół','Fórum':'Forum','Loja':'Sklep','Contato':'Kontakt','Entrar com Google':'Zaloguj przez Google','Guardar perfil':'Zapisz profil','Cancelar':'Anuluj','País':'Kraj','Idade':'Wiek','Jogo':'Gra','Modo':'Tryb','Tipo de armas':'Rodzaj broni','Estilo':'Styl','Escreve no lobby...':'Napisz na lobby...','Traduzir para':'Tłumacz na','Enviar original':'Wyślij oryginał','Sempre usar':'Zawsze używaj'},
'es':{'Início':'Inicio','Sobre':'Sobre nosotros','Team':'Equipo','Fórum':'Foro','Loja':'Tienda','Contato':'Contacto','Entrar com Google':'Entrar con Google','Guardar perfil':'Guardar perfil','Cancelar':'Cancelar','País':'País','Idade':'Edad','Jogo':'Juego','Modo':'Modo','Tipo de armas':'Tipo de armas','Estilo':'Estilo','Escreve no lobby...':'Escribe en el lobby...','Traduzir para':'Traducir a','Enviar original':'Enviar original','Sempre usar':'Usar siempre'},
'fr':{'Início':'Accueil','Sobre':'À propos','Team':'Équipe','Fórum':'Forum','Loja':'Boutique','Contato':'Contact','Entrar com Google':'Se connecter avec Google','Guardar perfil':'Enregistrer le profil','Cancelar':'Annuler','País':'Pays','Idade':'Âge','Jogo':'Jeu','Modo':'Mode','Tipo de armas':'Type d’armes','Estilo':'Style','Escreve no lobby...':'Écrivez dans le lobby...','Traduzir para':'Traduire vers','Enviar original':'Envoyer l’original','Sempre usar':'Toujours utiliser'},
'en-US':{'Início':'Home','Sobre':'About','Team':'Team','Fórum':'Forum','Loja':'Store','Contato':'Contact','Entrar com Google':'Sign in with Google','Guardar perfil':'Save profile','Cancelar':'Cancel','País':'Country','Idade':'Age','Jogo':'Game','Modo':'Mode','Tipo de armas':'Weapon type','Estilo':'Style','Escreve no lobby...':'Write in the lobby...','Traduzir para':'Translate to','Enviar original':'Send original','Sempre usar':'Always use'},
'en-GB':{'Início':'Home','Sobre':'About','Team':'Team','Fórum':'Forum','Loja':'Shop','Contato':'Contact','Entrar com Google':'Sign in with Google','Guardar perfil':'Save profile','Cancelar':'Cancel','País':'Country','Idade':'Age','Jogo':'Game','Modo':'Mode','Tipo de armas':'Weapon type','Estilo':'Style','Escreve no lobby...':'Write in the lobby...','Traduzir para':'Translate to','Enviar original':'Send original','Sempre usar':'Always use'},
'pt-PT':{},'pt-BR':{}
};
const detected=(()=>{const n=(navigator.language||'pt-PT').toLowerCase();if(n.startsWith('pl'))return'pl';if(n.startsWith('es'))return'es';if(n.startsWith('fr'))return'fr';if(n==='pt-br')return'pt-BR';if(n.startsWith('pt'))return'pt-PT';if(n==='en-us')return'en-US';if(n.startsWith('en'))return'en-GB';return'pt-PT'})();
let lang=localStorage.getItem('tl_language')||detected;localStorage.setItem('tl_language',lang);
const original=new WeakMap();
function translateNode(node){if(node.nodeType!==Node.TEXT_NODE)return;const t=node.nodeValue.trim();if(!t)return;if(!original.has(node))original.set(node,node.nodeValue);const base=original.get(node);const raw=base.trim();const value=(map[lang]||{})[raw];node.nodeValue=value?base.replace(raw,value):base}
function apply(){document.documentElement.lang=lang;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(n.parentElement?.tagName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let n;while(n=w.nextNode())translateNode(n);document.querySelectorAll('[placeholder]').forEach(el=>{el.dataset.tlOriginalPlaceholder||=(el.getAttribute('placeholder')||'');el.placeholder=(map[lang]||{})[el.dataset.tlOriginalPlaceholder]||el.dataset.tlOriginalPlaceholder});}
function tools(){if(document.querySelector('.tl-global-tools'))return;const box=document.createElement('div');box.className='tl-global-tools';const sel=document.createElement('select');sel.className='tl-language-select';sel.setAttribute('aria-label','Idioma');Object.entries(LANGS).forEach(([v,o])=>{const x=document.createElement('option');x.value=v;x.textContent=o.label;sel.appendChild(x)});sel.value=lang;sel.onchange=()=>{lang=sel.value;localStorage.setItem('tl_language',lang);location.reload()};const clock=document.createElement('time');clock.className='tl-local-clock';const tick=()=>{clock.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short'}).format(new Date())};tick();setInterval(tick,30000);box.append(sel,clock);document.body.appendChild(box)}
function boot(){tools();apply();new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();window.TLI18n={getLanguage:()=>lang};})();
