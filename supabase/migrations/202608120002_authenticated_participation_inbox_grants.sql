-- Permissões mínimas; RLS continua definindo quais linhas cada utilizador pode acessar.
begin;

grant select,insert on table public.competition_applications to authenticated;
grant select on table public.user_inbox_messages to authenticated;
grant usage,select on sequence public.competition_applications_id_seq to authenticated;

commit;
