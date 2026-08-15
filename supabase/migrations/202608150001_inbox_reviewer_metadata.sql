-- Registra a identidade pública do revisor dentro da mensagem, sem novas permissões ou colunas.
begin;

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

  if v_reviewer_name is null then
    raise exception 'Apenas administradores autorizados podem revisar inscrições.';
  end if;
  if v_status not in ('aprovado','recusado') then raise exception 'Status de revisão inválido.'; end if;

  update public.competition_applications
  set status=v_status,reviewed_by=v_actor,reviewed_at=v_reviewed_at,updated_at=v_reviewed_at
  where id=p_application_id
  returning * into v_application;
  if v_application.id is null then raise exception 'Inscrição não encontrada.'; end if;

  insert into public.user_inbox_messages(user_id,sender_label,subject,content,metadata)
  values(
    v_application.user_id,
    'Team Lambreta',
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

update public.user_inbox_messages m
set metadata=m.metadata||jsonb_build_object(
  'status',a.status,
  'reviewer_id',a.reviewed_by,
  'reviewer_name',coalesce(nullif(trim(p.game_nickname),''),nullif(trim(p.full_name),''),'Admin Team'),
  'reviewer_role',coalesce(nullif(trim(p.role::text),''),'member'),
  'reviewed_at',a.reviewed_at
)
from public.competition_applications a
left join public.profiles p on p.id=a.reviewed_by
where m.metadata->>'type'='competition_application'
  and m.metadata->>'application_id'~'^[0-9]+$'
  and a.id=(m.metadata->>'application_id')::bigint
  and a.reviewed_by is not null
  and not (m.metadata?'reviewer_id');

commit;
