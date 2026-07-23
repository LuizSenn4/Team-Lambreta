(()=>{'use strict';
function boot(){
  const form=document.getElementById('chatForm');
  if(!form||document.getElementById('chatTranslateTarget'))return;
  const row=document.createElement('div');
  row.className='tl-chat-translate-row';
  row.innerHTML=`<label for="chatTranslateTarget">🌐 Traduzir para</label><select id="chatTranslateTarget"><option value="">Enviar original</option><option value="pt">🇧🇷 Português</option><option value="pl">🇵🇱 Polski</option><option value="es">🇪🇸 Español</option><option value="fr">🇫🇷 Français</option><option value="en">🇺🇸 English</option></select><label><input id="chatTranslateRemember" type="checkbox"> Sempre usar</label>`;
  form.appendChild(row);
  const sel=row.querySelector('select'),remember=row.querySelector('#chatTranslateRemember');
  const saved=localStorage.getItem('tl_chat_translate_target')||'';
  sel.value=saved;
  remember.checked=!!saved;
  sel.onchange=()=>{if(remember.checked)localStorage.setItem('tl_chat_translate_target',sel.value)};
  remember.onchange=()=>{if(remember.checked)localStorage.setItem('tl_chat_translate_target',sel.value);else localStorage.removeItem('tl_chat_translate_target')};
  window.TLChatTranslateTarget=()=>sel.value;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();})();
