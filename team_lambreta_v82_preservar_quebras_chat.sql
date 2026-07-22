-- TEAM LAMBRETA V82
-- Corrige o filtro do chat para preservar espaços, tabs e quebras de linha.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

create or replace function public.validate_team_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  piece text;
  normalized_word text;
  is_bad boolean;
  rebuilt text := '';
begin
  select *
  into p
  from public.profiles
  where id = new.user_id;

  if p.is_banned then
    raise exception 'Conta bloqueada no chat';
  end if;

  if p.muted_until is not null and p.muted_until > now() then
    raise exception 'Você está silenciado até %', p.muted_until;
  end if;

  if new.message ~ '(.)\1{12,}' then
    raise exception 'Flood de caracteres bloqueado';
  end if;

  /*
    Divide a mensagem preservando os separadores.
    Assim espaços, tabs e principalmente \n continuam exatamente onde o usuário colocou.
  */
  for piece in
    select match[1]
    from regexp_matches(new.message, E'(\\s+|\\S+)', 'g') as match
  loop
    if piece ~ E'^\\s+$' then
      rebuilt := rebuilt || piece;
    else
      normalized_word := public.normalize_chat_word(piece);

      select exists(
        select 1
        from public.blocked_chat_terms b
        where b.active
          and (
            normalized_word = b.term
            or normalized_word like b.term || '%'
          )
      )
      into is_bad;

      rebuilt := rebuilt || case when is_bad then '####' else piece end;
    end if;
  end loop;

  new.message := rebuilt;
  return new;
end;
$$;

drop trigger if exists validate_team_chat_trigger
on public.chat_messages;

create trigger validate_team_chat_trigger
before insert or update of message
on public.chat_messages
for each row
execute function public.validate_team_chat();

-- Teste opcional:
-- select E'linha 1\nlinha 2\nlinha 3';
