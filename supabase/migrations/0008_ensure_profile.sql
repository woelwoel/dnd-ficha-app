-- Super review (resultadoReview.md) #17 [BAIXO] — "conta zumbi".
-- Quando /api/delete-account falha, o fallback RPC delete_my_account apaga o
-- profile mas deixa auth.users vivo. O usuário consegue relogar num estado
-- quebrado: sem profile, todo INSERT em characters falha por FK (o trigger
-- handle_new_user só roda em INSERT de auth.users, não em login).
--
-- profiles NÃO tem policy de INSERT (criação é responsabilidade da trigger),
-- então o client não consegue recriar o profile sozinho. Este RPC
-- SECURITY DEFINER recria de forma idempotente. Também torna o sistema
-- resiliente a qualquer outra inconsistência profile-ausente.

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.profiles (id, display_name)
  select
    v_uid,
    coalesce(
      (select coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
         from auth.users u where u.id = v_uid),
      'Aventureiro'
    )
  on conflict (id) do nothing;
end;
$$;

NOTIFY pgrst, 'reload schema';
