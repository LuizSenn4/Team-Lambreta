-- Team Lambreta v63 — senha administrativa protegida no Supabase
-- Guarda apenas salt + hash; a senha não fica no JavaScript público.

create extension if not exists pgcrypto;

create table if not exists public.admin_security (
  id integer primary key default 1 check (id = 1),
  password_salt text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_security enable row level security;
revoke all on table public.admin_security from anon, authenticated;

insert into public.admin_security (id, password_salt, password_hash, updated_at)
values (
  1,
  '435730242e1a7b78fdfc5dc5533da975260055ff7dfcaa337f4b1449417b3721',
  'c888b41a79e03daf07e0d15baa980484183db312a7ff5a61a11bb29334c7b3e2',
  now()
)
on conflict (id) do update
set password_salt = excluded.password_salt,
    password_hash = excluded.password_hash,
    updated_at = now();

create or replace function public.verify_admin_password(candidate_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role text;
  saved_salt text;
  saved_hash text;
begin
  select role::text into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role not in ('admin', 'master') then
    return false;
  end if;

  select password_salt, password_hash
  into saved_salt, saved_hash
  from public.admin_security
  where id = 1;

  if saved_hash is null then
    return false;
  end if;

  return encode(digest(saved_salt || coalesce(candidate_password, ''), 'sha256'), 'hex') = saved_hash;
end;
$$;

revoke all on function public.verify_admin_password(text) from public, anon;
grant execute on function public.verify_admin_password(text) to authenticated;
