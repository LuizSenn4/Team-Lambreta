-- Team Lambreta: inscrições competitivas, caixa de entrada, hierarquia de cargos e Realtime do Hall.
begin;

create table if not exists public.competition_applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  epic_nickname text not null,
  full_name text not null,
  age integer not null check (age between 13 and 99),
  country text not null,
  discord text not null,
  platform text not null,
  input_method text not null check (input_method in ('controle','teclado_mouse')),
  region text not null,
  build_preference text not null check (build_preference in ('build','zero_build','ambos')),
  main_mode text not null,
  competitive_experience text not null,
  power_ranking integer check (power_ranking is null or power_ranking >= 0),
  tracker_links text,
  availability text not null,
  motivation text not null,
  notes text,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competition_applications_one_open_per_user
  on public.competition_applications(user_id)
  where status = 'pendente';
create index if not exists competition_applications_status_created_idx
  on public.competition_applications(status, created_at desc);

create table if not exists public.user_inbox_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_label text not null default 'Team Lambreta',
  subject text not null,
  content text not null,
  read_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_inbox_messages_owner_created_idx
  on public.user_inbox_messages(user_id, created_at desc);

alter table public.competition_applications enable row level security;
alter table public.user_inbox_messages enable row level security;

drop policy if exists "application owner read" on public.competition_applications;
create policy "application owner read" on public.competition_applications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "application owner insert" on public.competition_applications;
create policy "application owner insert" on public.competition_applications
  for insert to authenticated with check (user_id = auth.uid() and status = 'pendente');
drop policy if exists "application admin read" on public.competition_applications;
create policy "application admin read" on public.competition_applications
  for select to authenticated using (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','master'))
  );

drop policy if exists "inbox owner read" on public.user_inbox_messages;
create policy "inbox owner read" on public.user_inbox_messages
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "inbox owner update" on public.user_inbox_messages;
create policy "inbox owner update" on public.user_inbox_messages
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke update on public.user_inbox_messages from authenticated;
grant update(read_at,deleted_at) on public.user_inbox_messages to authenticated;

create or replace function public.review_competition_application(
  p_application_id bigint,
  p_status text
) returns public.competition_applications
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_application public.competition_applications;
  v_status text := lower(trim(p_status));
begin
  if not exists(select 1 from public.profiles where id=v_actor and role in ('admin','master')) then
    raise exception 'Apenas administradores autorizados podem revisar inscrições.';
  end if;
  if v_status not in ('aprovado','recusado') then raise exception 'Status de revisão inválido.'; end if;

  update public.competition_applications
  set status=v_status, reviewed_by=v_actor, reviewed_at=now(), updated_at=now()
  where id=p_application_id
  returning * into v_application;
  if v_application.id is null then raise exception 'Inscrição não encontrada.'; end if;

  insert into public.user_inbox_messages(user_id,sender_label,subject,content,metadata)
  values(
    v_application.user_id,
    'Team Lambreta',
    case when v_status='aprovado' then 'Inscrição aprovada' else 'Atualização da sua inscrição' end,
    case when v_status='aprovado'
      then 'A sua inscrição para participar das competições foi aceita. A equipa entrará em contacto pelos dados informados.'
      else 'A sua inscrição para participar das competições não foi aprovada desta vez. Continue acompanhando futuras oportunidades.' end,
    jsonb_build_object('type','competition_application','application_id',v_application.id,'status',v_status)
  );
  return v_application;
end;
$$;
revoke all on function public.review_competition_application(bigint,text) from public;
grant execute on function public.review_competition_application(bigint,text) to authenticated;

drop function if exists public.assign_role_by_nickname(text,text);
create function public.assign_role_by_nickname(target_nickname text,new_role text)
returns table(target_user_id uuid,nickname text,role text)
language plpgsql security definer set search_path=public,auth
as $$
declare
  v_actor uuid := auth.uid(); v_actor_role text; v_target public.profiles%rowtype;
  v_new text := lower(trim(new_role)); v_actor_rank integer; v_target_rank integer; v_new_rank integer;
begin
  select p.role into v_actor_role from public.profiles p where p.id=v_actor;
  v_new := case v_new when 'dev' then 'master' when 'moderador' then 'moderator' when 'apoiador' then 'supporter' when 'membro' then 'member' else v_new end;
  if v_actor_role not in ('master','admin') then raise exception 'Apenas DEV ou ADMIN podem atribuir cargos.'; end if;
  if v_new not in ('member','supporter','vip','moderator','staff','admin','master') then raise exception 'Cargo inválido.'; end if;
  select * into v_target from public.profiles p where lower(p.game_nickname)=lower(trim(target_nickname));
  if v_target.id is null then raise exception 'Nickname @% não encontrado.',target_nickname; end if;
  if v_target.id=v_actor then raise exception 'Você não pode alterar o próprio cargo pelo chat.'; end if;
  v_actor_rank := case v_actor_role when 'master' then 4 when 'admin' then 3 else 0 end;
  v_target_rank := case v_target.role when 'master' then 4 when 'admin' then 3 when 'staff' then 2 when 'moderator' then 1 else 0 end;
  v_new_rank := case v_new when 'master' then 4 when 'admin' then 3 when 'staff' then 2 when 'moderator' then 1 else 0 end;
  if v_target_rank >= v_actor_rank then raise exception 'Você não pode alterar um cargo igual ou superior ao seu.'; end if;
  if v_new_rank >= v_actor_rank then raise exception 'Você não pode atribuir um cargo igual ou superior ao seu.'; end if;
  update public.profiles set role=v_new,updated_at=now() where id=v_target.id;
  insert into public.role_audit_log(actor_id,target_id,old_role,new_role) values(v_actor,v_target.id,coalesce(v_target.role,'member'),v_new);
  return query select v_target.id,v_target.game_nickname,v_new;
end;
$$;
revoke all on function public.assign_role_by_nickname(text,text) from public;
grant execute on function public.assign_role_by_nickname(text,text) to authenticated;

-- Permite que o Hall receba alterações sem esperar apenas pelo polling.
do $$ begin
  alter publication supabase_realtime add table public.community_progress;
exception when duplicate_object then null;
end $$;

commit;
