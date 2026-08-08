(()=>{'use strict';
const codes={
'TL-ADM-001':'Falha ao guardar dados no painel Admin.','TL-ADM-002':'Falha no upload da imagem.','TL-ADM-003':'Permissão insuficiente.','TL-ADM-004':'Campo obrigatório ausente ou inválido.','TL-ADM-005':'Falha ao remover ou arquivar.','TL-AUTH-001':'Sessão expirada ou login necessário.','TL-DB-001':'Falha de comunicação com a base de dados.','TL-TR-001':'Serviço de tradução não configurado.','TL-TR-002':'Não foi possível traduzir a mensagem.'};
window.TLErrorCodes=codes;
window.TLNotify=(type,message,code)=>{let stack=document.querySelector('.tl-toast-stack');if(!stack){stack=document.createElement('div');stack.className='tl-toast-stack';document.body.appendChild(stack)}const el=document.createElement('div');el.className=`tl-toast ${type||'warning'}`;el.innerHTML=`<strong>${message||'Aviso'}</strong>${code?`<small>Código: ${code}</small>`:''}<button type="button" aria-label="Fechar">×</button>`;el.querySelector('button').onclick=()=>el.remove();stack.appendChild(el);setTimeout(()=>el.remove(),6500)};
window.addEventListener('error',e=>{console.error('[TL-DB-001]',e.error||e.message)});
})();