TEAM LAMBRETA V88 — MENU REALMENTE REFEITO

Origem usada:
- README-V66: Road Rage no menu.
- README-V67: Portugal 50/50 somente em interação.
- README-V68/V69: submenus e hierarquia.
- README-V70: ponte de hover no desktop.
- PATCH-V72: links HTML normais sem bloquear navegação.
- PATCH-V73: cor normal em repouso e partículas na interação.

Limpeza realizada:
- removidos todos os seletores CSS antigos do menu;
- removidos os controladores JavaScript antigos V67–V87;
- cabeçalho reescrito igual em todas as páginas públicas;
- criado somente navigation-v88.js;
- criado somente um bloco oficial de CSS do menu.

Comportamento:
- repouso: letras na cor normal;
- hover/foco/toque/submenu aberto: Portugal 50% verde + 50% vermelho;
- partículas ao abrir submenu;
- desktop: hover e clique;
- telemóvel: hambúrguer, toque e links normais;
- todos os links navegam sem preventDefault;
- menu fecha ao navegar, tocar fora, voltar à aba ou mudar tamanho;
- nenhum SQL novo.
