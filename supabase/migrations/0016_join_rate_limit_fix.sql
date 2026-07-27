-- supabase/migrations/0016_join_rate_limit_fix.sql
-- Conserta o rate limit de tentativas de entrada em mesa, que estava INERTE.
--
-- O bug: `join_campaign` (0005) registra a tentativa em `join_attempts` ANTES
-- do lookup, justamente "pra contar até as que falham" — mas em seguida
-- levanta `not_found_or_already_member` quando o código não bate. Função
-- plpgsql sem bloco EXCEPTION + cada RPC do PostgREST rodando na própria
-- transação = a exceção aborta a transação e faz ROLLBACK do próprio insert.
-- Resultado: toda tentativa fracassada apagava o próprio registro, o contador
-- só subia com joins BEM-SUCEDIDOS, e `v_count > 10` nunca disparava na
-- prática. O mecanismo dizia proteger contra força bruta de código e não
-- protegia nada.
--
-- A correção: no caminho "código não existe / já é membro", RETORNAR NULL em
-- vez de levantar exceção. A transação commita, o registro da tentativa
-- sobrevive, e o contador passa a funcionar. A resposta continua
-- indistinguível entre "código errado" e "já é membro" — que era o objetivo
-- de segurança do erro genérico original.
--
-- `not_authenticated` e `rate_limited` continuam sendo exceções: a primeira é
-- erro de chamada, e a segunda só dispara quando as tentativas anteriores já
-- foram contabilizadas (o rollback do insert dela é irrelevante).
--
-- CONTRATO NOVO: `join_campaign` devolve o uuid da mesa em caso de sucesso e
-- NULL em caso de código inválido / já-membro. `src/lib/campaigns.js` mapeia
-- os dois formatos (o novo e o antigo) enquanto a migration não estiver
-- aplicada em todos os ambientes.
--
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

create or replace function public.join_campaign(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_cid     uuid;
  v_dm      uuid;
  v_count   int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Purge inline (#4 do super review): elimina attempts antigas do user
  -- corrente antes de inserir a nova. Mantém a tabela enxuta sem depender
  -- de pg_cron. O DELETE é barato (índice em (user_id, ts desc)).
  delete from public.join_attempts
    where user_id = v_uid
      and ts < now() - interval '1 hour';

  -- Registra a tentativa ANTES do lookup pra contar até as que falham. A
  -- partir da 0016 isso funciona de verdade, porque os caminhos de falha
  -- retornam NULL em vez de abortar a transação.
  insert into public.join_attempts (user_id) values (v_uid);

  select count(*) into v_count
    from public.join_attempts
    where user_id = v_uid
      and ts > now() - interval '1 minute';

  if v_count > 10 then
    raise exception 'rate_limited' using errcode = 'P0001',
      hint = 'Muitas tentativas. Tente de novo em alguns segundos.';
  end if;

  -- Daqui pra baixo, falha = NULL (e a tentativa fica registrada).
  if p_code is null or char_length(p_code) = 0 then
    return null;
  end if;

  select id, dm_id into v_cid, v_dm
    from public.campaigns
    where invite_code = p_code;

  if v_cid is null then
    return null;
  end if;

  if exists (
    select 1 from public.campaign_members
    where campaign_id = v_cid and user_id = v_uid
  ) then
    return null;
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_cid, v_uid, 'player');

  return v_cid;
end;
$$;

NOTIFY pgrst, 'reload schema';
