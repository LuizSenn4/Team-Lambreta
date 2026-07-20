TEAM LAMBRETA — SUPABASE ATIVADO

Incluído:
- Login Google real
- Perfil com nickname do jogo obrigatório
- Chat em tempo real
- Status online (verde), ocupado (vermelho), ausente (laranja)
- Mensagens privadas para administração
- Contador de mensagens novas
- Caixa privada para moderator/staff/admin/master

IMPORTANTE — PRIMEIRO ADMIN MASTER
1. Entre uma vez no site usando Google.
2. No Supabase > SQL Editor, execute substituindo pelo seu e-mail:

update public.profiles
set role = 'master'
where email = 'SEU_EMAIL@gmail.com';

3. Atualize o site e abra admin.html.

Publicação:
- Substitua os arquivos do repositório pelos desta versão.
- git add .
- git commit -m "Ativa Supabase, login Google e chat real"
- git push
- O Vercel atualiza automaticamente.
