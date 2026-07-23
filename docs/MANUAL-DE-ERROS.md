# Manual de erros — Team Lambreta V92

| Código | Significado | Como resolver |
|---|---|---|
| TL-ADM-001 | Falha ao guardar no Admin | Verificar sessão, permissões RLS e consola |
| TL-ADM-002 | Upload de imagem falhou | Verificar bucket, formato e tamanho |
| TL-ADM-003 | Permissão insuficiente | Confirmar cargo master/admin no perfil |
| TL-ADM-004 | Campo inválido | Rever campos obrigatórios |
| TL-ADM-005 | Falha ao arquivar/remover | Rever RLS e ligação Supabase |
| TL-AUTH-001 | Sessão expirada | Entrar novamente com Google |
| TL-DB-001 | Falha de base de dados | Verificar Supabase e consola |
| TL-TR-001 | Tradução não configurada | Definir DEEPL_API_KEY e publicar Edge Function |
| TL-TR-002 | Tradução falhou | Mensagem segue no idioma original; rever logs da função |
