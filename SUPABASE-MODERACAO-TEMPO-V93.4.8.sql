-- TEAM LAMBRETA V93.4.8 — SILENCIAMENTO COM DURAÇÃO ESCOLHIDA PELA MODERAÇÃO
-- Executar UMA VEZ no Supabase > SQL Editor depois dos SQLs V93.4.6/V93.4.7.
-- Permite 1 minuto até 30 dias e mantém compatibilidade com mute_15.

drop function if exists public.admin_apply_chat_report_action(bigint,text);
drop function if exists public.admin_apply_chat_report_action(bigint,text,integer);

create function public.admin_apply_chat_report_action(
  target_report_id bigint,
  moderation_action text,
  mute_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  actor_role public.user_role;
  target_role public.user_role;
  r public.chat_reports%rowtype;
  snapshot_message text;
  target_nickname text;
  action_reason text;
  clean_action text := lower(trim(coalesce(moderation_action,'')));
begin
  if actor is null then
    raise exception 'É necessário iniciar sessão.';
  end if;

  select role into actor_role from public.profiles where id = actor;
  if actor_role not in ('master','admin','moderator') then
    raise exception 'Sem permissão para aplicar esta medida.';
  end if;

  select * into r from public.chat_reports where id = target_report_id;
  if r.id is null then
    raise exception 'Denúncia não encontrada.';
  end if;

  select role, coalesce(game_nickname, full_name, 'Utilizador')
    into target_role, target_nickname
  from public.profiles
  where id = r.reported_user_id;

  -- Mantém a hierarquia já usada pelo projeto: ninguém modera nível igual/superior.
  if r.reported_user_id <> actor
     and public.role_rank(target_role) >= public.role_rank(actor_role) then
    raise exception 'Não podes moderar alguém do mesmo nível ou superior.';
  end if;

  select message into snapshot_message
  from public.chat_messages
  where id = r.message_id;

  snapshot_message := coalesce(snapshot_message, '[mensagem indisponível]');
  action_reason := coalesce(nullif(trim(r.reason),''), 'Violação das regras de utilização do chat');

  if clean_action in ('mute','mute_15') then
    mute_minutes := coalesce(mute_minutes, case when clean_action='mute_15' then 15 else null end);
    if mute_minutes is null or mute_minutes < 1 or mute_minutes > 43200 then
      raise exception 'Duração inválida. Escolhe entre 1 minuto e 30 dias.';
    end if;

    update public.profiles
    set muted_until = now() + make_interval(mins => mute_minutes), updated_at = now()
    where id = r.reported_user_id;

    insert into public.admin_user_notices(
      user_id, report_id, message_id, message_text, action_type,
      duration_minutes, reason, admin_note, created_by
    ) values (
      r.reported_user_id, r.id, r.message_id, snapshot_message, 'mute',
      mute_minutes, action_reason, r.details, actor
    );

    update public.chat_reports
    set status='resolved', resolved_at=now(), resolved_by=actor
    where id=r.id;

  elsif clean_action = 'ban' then
    update public.profiles
    set is_banned = true, muted_until = 'infinity'::timestamptz, updated_at = now()
    where id = r.reported_user_id;

    insert into public.admin_user_notices(
      user_id, report_id, message_id, message_text, action_type,
      reason, admin_note, created_by
    ) values (
      r.reported_user_id, r.id, r.message_id, snapshot_message, 'ban',
      action_reason, r.details, actor
    );

    update public.chat_reports
    set status='resolved', resolved_at=now(), resolved_by=actor
    where id=r.id;

  elsif clean_action = 'delete' then
    update public.chat_messages
    set is_deleted = true
    where id = r.message_id;

    insert into public.admin_user_notices(
      user_id, report_id, message_id, message_text, action_type,
      reason, admin_note, created_by
    ) values (
      r.reported_user_id, r.id, r.message_id, snapshot_message, 'message_removed',
      action_reason, r.details, actor
    );

    update public.chat_reports
    set status='resolved', resolved_at=now(), resolved_by=actor
    where id=r.id;

  elsif clean_action = 'warn' then
    insert into public.admin_user_notices(
      user_id, report_id, message_id, message_text, action_type,
      reason, admin_note, created_by
    ) values (
      r.reported_user_id, r.id, r.message_id, snapshot_message, 'warning',
      action_reason, r.details, actor
    );

    update public.chat_reports
    set status='resolved', resolved_at=now(), resolved_by=actor
    where id=r.id;

  elsif clean_action = 'dismiss' then
    update public.chat_reports
    set status='dismissed', resolved_at=now(), resolved_by=actor
    where id=r.id;

  else
    raise exception 'Ação de moderação inválida.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'action', clean_action,
    'target_user_id', r.reported_user_id,
    'target_nickname', target_nickname
  );
end;
$$;

revoke all on function public.admin_apply_chat_report_action(bigint,text,integer) from public;
grant execute on function public.admin_apply_chat_report_action(bigint,text,integer) to authenticated;
