(() => {
  const form=document.getElementById('contactEmailForm'),feedback=document.getElementById('contactFeedback');
  if(!form)return;
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const data=new FormData(form),subject=`Team Lambreta — ${data.get('subject')}`;
    const body=`Nome: ${data.get('name')}\nE-mail para resposta: ${data.get('email')}\n\n${data.get('message')}`;
    feedback.textContent='Abrindo o seu aplicativo de e-mail. Revise a mensagem e confirme o envio.';
    location.href=`mailto:dudu11ogato@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
