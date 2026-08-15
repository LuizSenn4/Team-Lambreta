-- Auditoria e identidade autenticada para notificações das inscrições competitivas.
begin;

alter table public.competition_applications
  add column if not exists authenticated_email text,
  add column if not exists authenticated_name text,
  add column if not exists boss_email_status text not null default 'pending',
  add column if not exists boss_email_sent_at timestamptz,
  add column if not exists boss_email_error text,
  add column if not exists boss_email_last_attempt_at timestamptz,
  add column if not exists decision_email_status text not null default 'pending',
  add column if not exists decision_email_sent_at timestamptz,
  add column if not exists decision_email_error text,
  add column if not exists decision_email_last_attempt_at timestamptz;

do $$ begin
  alter table public.competition_applications
    add constraint competition_applications_boss_email_status_check
    check (boss_email_status in ('pending','sending','sent','failed'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.competition_applications
    add constraint competition_applications_decision_email_status_check
    check (decision_email_status in ('pending','sending','sent','failed'));
exception when duplicate_object then null;
end $$;

create or replace function public.set_competition_application_identity()
returns trigger
language plpgsql security definer set search_path=public,auth
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
begin
  if v_actor is null then raise exception 'Autenticação obrigatória para enviar inscrição.'; end if;
  select u.email,
         coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''))
    into v_email,v_name
  from auth.users u where u.id=v_actor;
  if v_email is null then raise exception 'Conta autenticada sem e-mail disponível.'; end if;
  new.user_id:=v_actor;
  new.authenticated_email:=v_email;
  new.authenticated_name:=v_name;
  new.status:='pendente';
  new.reviewed_by:=null;
  new.reviewed_at:=null;
  return new;
end;
$$;

drop trigger if exists competition_application_identity_before_insert on public.competition_applications;
create trigger competition_application_identity_before_insert
before insert on public.competition_applications
for each row execute function public.set_competition_application_identity();

update public.competition_applications a
set authenticated_email=u.email,
    authenticated_name=coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''))
from auth.users u
where u.id=a.user_id and a.authenticated_email is null;

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
  v_reviewer_name text;
  v_reviewer_role text;
  v_reviewed_at timestamptz := now();
begin
  select coalesce(nullif(trim(p.game_nickname),''),nullif(trim(p.full_name),''),'Admin Team'),
         coalesce(nullif(trim(p.role::text),''),'member')
    into v_reviewer_name,v_reviewer_role
  from public.profiles p
  where p.id=v_actor and p.role in ('admin','master');
  if v_reviewer_name is null then raise exception 'Apenas administradores autorizados podem revisar inscrições.'; end if;
  if v_status not in ('aprovado','recusado') then raise exception 'Status de revisão inválido.'; end if;

  select * into v_application from public.competition_applications
  where id=p_application_id for update;
  if v_application.id is null then raise exception 'Inscrição não encontrada.'; end if;
  if v_application.status<>'pendente' then
    if v_application.status=v_status then return v_application; end if;
    raise exception 'Esta inscrição já foi analisada.';
  end if;

  update public.competition_applications
  set status=v_status,reviewed_by=v_actor,reviewed_at=v_reviewed_at,updated_at=v_reviewed_at,
      decision_email_status='pending',decision_email_sent_at=null,decision_email_error=null,
      decision_email_last_attempt_at=null
  where id=p_application_id returning * into v_application;

  insert into public.user_inbox_messages(user_id,sender_label,subject,content,metadata)
  values(
    v_application.user_id,'Team Lambreta',
    case when v_status='aprovado' then 'Inscrição aprovada' else 'Inscrição recusada' end,
    case when v_status='aprovado'
      then 'A sua inscrição para participar das competições foi aceita. A equipa entrará em contacto pelos dados informados.'
      else 'A sua inscrição para participar das competições não foi aprovada desta vez. Continue acompanhando futuras oportunidades.' end,
    jsonb_build_object(
      'type','competition_application','application_id',v_application.id,'status',v_status,
      'reviewer_id',v_actor,'reviewer_name',v_reviewer_name,'reviewer_role',v_reviewer_role,
      'reviewed_at',v_reviewed_at
    )
  );
  return v_application;
end;
$$;
revoke all on function public.review_competition_application(bigint,text) from public;
grant execute on function public.review_competition_application(bigint,text) to authenticated;

-- Claim atômico usado somente pela Edge Function: evita envios concorrentes/duplicados.
create or replace function public.claim_competition_email(
  p_application_id bigint,
  p_kind text
) returns boolean
language plpgsql security definer set search_path=public
as $$
declare v_claimed bigint;
begin
  if p_kind='boss' then
    update public.competition_applications
    set boss_email_status='sending',boss_email_last_attempt_at=now(),boss_email_error=null
    where id=p_application_id and boss_email_status in ('pending','failed')
    returning id into v_claimed;
  elsif p_kind='decision' then
    update public.competition_applications
    set decision_email_status='sending',decision_email_last_attempt_at=now(),decision_email_error=null
    where id=p_application_id and status in ('aprovado','recusado')
      and decision_email_status in ('pending','failed')
    returning id into v_claimed;
  else
    raise exception 'Tipo de e-mail inválido.';
  end if;
  return v_claimed is not null;
end;
$$;
revoke all on function public.claim_competition_email(bigint,text) from public,anon,authenticated;
grant execute on function public.claim_competition_email(bigint,text) to service_role;

commit;
