(() => {
  'use strict';
  const DEMO=[
    {id:'demo-camisola',title:'Camisola Team Lambreta',price:29.90,category:'Vestuário',description:'Preview demonstrativo de camisola oficial. Produto ainda não disponível para compra.',image:'img/home-slider-1-team-lambreta-merch.png',demo:true,featured:true},
    {id:'demo-bone',title:'Boné Lambreta',price:19.90,category:'Acessórios',description:'Preview demonstrativo para visualizar o futuro catálogo da equipa.',image:'img/team-lambreta-welcome-hero-clean-16x9.jpg',demo:true},
    {id:'demo-pack',title:'Pack Comunidade',price:12.50,category:'Colecionáveis',description:'Conceito demonstrativo de um futuro pack da comunidade Team Lambreta.',image:'img/home-slider-2-team-lambreta-comunidade.png',demo:true}
  ];
  const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  const raw=(typeof getTeamData==='function'?getTeamData().store:[])||[];
  const products=(raw.length?raw:DEMO).filter(p=>p.active!==false).map((p,i)=>({...p,id:p.id||`product-${i}`,price:Number(p.price)||0,category:p.category||'Geral'}));
  let cart=[];
  try{cart=JSON.parse(localStorage.getItem('tl_store_cart_v1')||'[]')}catch{cart=[]}
  const image=p=>p.image?`<img src="${esc(p.image)}" alt="${esc(p.title||'Produto')}" loading="lazy">`:'<div class="product-placeholder">TL</div>';
  function persist(){localStorage.setItem('tl_store_cart_v1',JSON.stringify(cart));renderCart()}
  function product(id){return products.find(p=>p.id===id)}
  function add(id,qty=1){const p=product(id);if(!p)return;const found=cart.find(x=>x.id===id);if(found)found.qty=Math.min(99,found.qty+qty);else cart.push({id,qty});persist()}
  function card(p){return `<article class="product-card">${p.demo?'<span class="product-demo">DEMONSTRAÇÃO</span>':''}<div class="product-media">${image(p)}</div><small>${esc(p.category)}</small><h3>${esc(p.title||'Produto')}</h3><p>${esc(p.description||'Sem descrição.')}</p><footer><strong>${money(p.price)}</strong><button type="button" data-product="${esc(p.id)}">Ver produto</button></footer></article>`}
  function render(){const q=$('storeSearch').value.trim().toLowerCase(),cat=$('storeCategory').value;const visible=products.filter(p=>(cat==='all'||p.category===cat)&&`${p.title} ${p.description}`.toLowerCase().includes(q));$('storeGrid').innerHTML=visible.length?visible.map(card).join(''):'<article class="store-empty"><h3>Nenhum produto encontrado</h3><p>Tente outra pesquisa ou categoria.</p></article>'}
  function openProduct(id){const p=product(id);if(!p)return;const d=$('storeProductDialog');d.innerHTML=`<button class="store-dialog-close" type="button" aria-label="Fechar">×</button><div class="store-dialog-media">${image(p)}</div><div class="store-dialog-copy">${p.demo?'<small>DEMONSTRAÇÃO · SEM ESTOQUE REAL</small>':''}<span>${esc(p.category)}</span><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><strong>${money(p.price)}</strong><label>Quantidade<input id="storeProductQty" type="number" min="1" max="99" value="1"></label><button type="button" data-add-cart="${esc(p.id)}">Adicionar ao carrinho</button></div>`;d.querySelector('.store-dialog-close').onclick=()=>d.close();d.querySelector('[data-add-cart]').onclick=()=>{add(p.id,Math.max(1,Number($('storeProductQty').value)||1));d.close();openCart()};d.showModal()}
  function renderCart(){cart=cart.filter(x=>product(x.id)&&x.qty>0);$('storeCartCount').textContent=String(cart.reduce((s,x)=>s+x.qty,0));$('storeCartItems').innerHTML=cart.length?cart.map(x=>{const p=product(x.id);return `<article class="store-cart-item">${image(p)}<div><strong>${esc(p.title)}</strong><small>${money(p.price)}</small><label>Qtd. <input type="number" min="1" max="99" value="${x.qty}" data-cart-qty="${esc(x.id)}"></label></div><button type="button" data-cart-remove="${esc(x.id)}">Remover</button></article>`}).join(''):'<div class="store-cart-empty"><strong>Seu carrinho está vazio</strong><p>Adicione um produto para começar.</p></div>';$('storeSubtotal').textContent=money(cart.reduce((s,x)=>s+product(x.id).price*x.qty,0));$('storeCheckout').disabled=!cart.length;persistSafe()}
  function persistSafe(){localStorage.setItem('tl_store_cart_v1',JSON.stringify(cart))}
  function openCart(){$('storeCart').hidden=false;document.body.classList.add('store-cart-open');renderCart()}
  function closeCart(){$('storeCart').hidden=true;document.body.classList.remove('store-cart-open')}
  [...new Set(products.map(p=>p.category))].sort().forEach(c=>$('storeCategory').insertAdjacentHTML('beforeend',`<option>${esc(c)}</option>`));
  const featured=products.find(p=>p.featured)||products[0];$('storeFeatured').innerHTML=featured?`<div>${image(featured)}</div><div><small>PRODUTO EM DESTAQUE${featured.demo?' · DEMONSTRAÇÃO':''}</small><h2>${esc(featured.title)}</h2><p>${esc(featured.description)}</p><strong>${money(featured.price)}</strong><button type="button" data-product="${esc(featured.id)}">Ver detalhes</button></div>`:'<h2>Catálogo em preparação</h2>';
  $('storeSearch').oninput=render;$('storeCategory').onchange=render;$('storeCartOpen').onclick=openCart;document.querySelectorAll('[data-cart-close]').forEach(x=>x.onclick=closeCart);
  document.addEventListener('click',e=>{const p=e.target.closest('[data-product]');if(p)openProduct(p.dataset.product);const rm=e.target.closest('[data-cart-remove]');if(rm){cart=cart.filter(x=>x.id!==rm.dataset.cartRemove);persist()}});
  $('storeCartItems').onchange=e=>{if(!e.target.matches('[data-cart-qty]'))return;const x=cart.find(i=>i.id===e.target.dataset.cartQty);if(x)x.qty=Math.max(1,Math.min(99,Number(e.target.value)||1));persist()};
  $('storeCheckout').onclick=()=>{const lines=cart.map(x=>{const p=product(x.id);return `- ${p.title} x${x.qty} (${money(p.price*x.qty)})`});location.href=`mailto:dudu11ogato@gmail.com?subject=${encodeURIComponent('Pedido de produtos Team Lambreta')}&body=${encodeURIComponent(`Olá Team Lambreta,\n\nTenho interesse nos itens abaixo:\n${lines.join('\n')}\n\nSubtotal indicativo: ${$('storeSubtotal').textContent}\n\nConfirmem, por favor, disponibilidade, entrega e pagamento.`)}`};
  render();renderCart();
})();
