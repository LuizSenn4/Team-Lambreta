-- Buddy V100: pedidos de amizade em tempo real.
-- Migration não destrutiva. Aplicar apenas depois de validar no projeto Supabase.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'buddy_relations'
  ) then
    alter publication supabase_realtime add table public.buddy_relations;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_blocks'
  ) then
    alter publication supabase_realtime add table public.user_blocks;
  end if;
end $$;
