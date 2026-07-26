-- Team Lambreta V92.39.4 - notificacoes globais do Buddy
alter table public.private_messages
  add column if not exists read_at timestamptz;

create index if not exists private_messages_receiver_unread
  on public.private_messages(receiver_id, read_at, created_at desc);

-- A politica de update ja permite participantes atualizarem mensagens.
-- Esta coluna e usada apenas pelo destinatario na aplicacao.
grant select, update on public.private_messages to authenticated;

-- Garantir Realtime para novas mensagens (ignora se ja estiver adicionado).
do $$
begin
  begin
    alter publication supabase_realtime add table public.private_messages;
  exception when duplicate_object then null;
  end;
end $$;
