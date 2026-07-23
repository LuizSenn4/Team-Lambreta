-- V61 — corrige a troca de função e garante identidade exclusiva.
-- Execute uma vez no Supabase SQL Editor.
create or replace function public.set_profile_identity(
  target_user_id uuid,
  new_identity text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role::text
    into caller_role
    from public.profiles
   where id = auth.uid();

  if caller_role not in ('admin', 'master') then
    raise exception 'Sem permissão para alterar funções.';
  end if;

  if new_identity not in ('member','staff','moderator','admin','streamer','vip') then
    raise exception 'Função inválida.';
  end if;

  update public.profiles
     set role = (
           case
             when new_identity in ('staff','moderator','admin') then new_identity
             else 'member'
           end
         )::public.user_role,
         is_streamer = (new_identity = 'streamer'),
         vip_until = case
           when new_identity = 'vip' then now() + interval '365 days'
           else null
         end,
         updated_at = now()
   where id = target_user_id;
end;
$$;

grant execute on function public.set_profile_identity(uuid,text) to authenticated;
