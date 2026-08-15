# Notificações das inscrições competitivas

A Edge Function `competition-email` usa o Resend e nunca aceita destinatários arbitrários do frontend.

Secrets necessários no projeto Supabase:

- `BOSS_NOTIFICATION_EMAIL=teamlambreta31@gmail.com` — já configurado no projeto vinculado.
- `RESEND_API_KEY` — deve ser criado no painel do Resend e configurado manualmente.
- `EMAIL_FROM` — remetente de um domínio verificado no Resend, por exemplo `Team Lambreta <noreply@dominio-verificado>`.

Configuração pela CLI, sem gravar valores no repositório:

```sh
npx supabase secrets set RESEND_API_KEY=... EMAIL_FROM='Team Lambreta <noreply@dominio-verificado>'
npx supabase functions deploy competition-email
```

Não use `noreply@teamlambreta.pt` até o domínio estar verificado no provider. SPF/DKIM, DNS, MX, OVH e Zimbra ficam fora deste fluxo e não devem ser alterados automaticamente.

Se o provider não estiver configurado ou rejeitar o envio, a inscrição/decisão permanece salva e somente o respectivo status de e-mail muda para `failed`.
