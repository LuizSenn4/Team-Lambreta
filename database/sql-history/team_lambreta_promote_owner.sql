-- Executar uma vez no Supabase SQL Editor para tornar a conta do proprietário ADMIN • DEV.
update public.profiles
set role = 'master', updated_at = now()
where lower(email) = lower('dudu11ogato@gmail.com');
