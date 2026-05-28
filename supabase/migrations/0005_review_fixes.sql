-- Super review pós PR 4 — fixes de segurança/hardening (#3, #4, #5).
-- Aplique no SQL Editor do Supabase.

-- ─────────────────────────────────────────────────────────────────────
-- #3  profiles: trocar policy "select_authenticated using (true)" por
--     uma restrita (eu mesmo + quem compartilha mesa comigo).
--     Antes: qualquer user logado podia enumerar display_name+avatar de
--     TODO mundo no banco via REST.
-- ─────────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_self_or_co_member"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.campaign_members cm_me
      join public.campaign_members cm_other
        on cm_me.campaign_id = cm_other.campaign_id
      where cm_me.user_id = auth.uid()
        and cm_other.user_id = profiles.id
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- #4  join_attempts: purge inline na próxima invocação de join_campaign.
--     Limpa attempts do próprio user com >1h, evitando crescer
--     indefinidamente. Não depende de pg_cron habilitado.
-- ─────────────────────────────────────────────────────────────────────

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

  -- Registra a tentativa ANTES do lookup pra contar até as que falham.
  insert into public.join_attempts (user_id) values (v_uid);

  select count(*) into v_count
    from public.join_attempts
    where user_id = v_uid
      and ts > now() - interval '1 minute';

  if v_count > 10 then
    raise exception 'rate_limited' using errcode = 'P0001',
      hint = 'Muitas tentativas. Tente de novo em alguns segundos.';
  end if;

  if p_code is null or char_length(p_code) = 0 then
    raise exception 'not_found_or_already_member' using errcode = 'P0002';
  end if;

  select id, dm_id into v_cid, v_dm
    from public.campaigns
    where invite_code = p_code;

  if v_cid is null then
    raise exception 'not_found_or_already_member' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.campaign_members
    where campaign_id = v_cid and user_id = v_uid
  ) then
    raise exception 'not_found_or_already_member' using errcode = 'P0002';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_cid, v_uid, 'player');

  return v_cid;
end;
$$;

-- pg_cron opcional: se a extensão estiver habilitada, schedula purge global
-- diário. Se não estiver, não falha — fica só o purge inline acima.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge_join_attempts_daily',
      '0 3 * * *',
      $cron$delete from public.join_attempts where ts < now() - interval '1 day'$cron$
    );
  end if;
exception when others then
  -- pg_cron pode estar instalado mas em schema diferente; ignora silenciosamente.
  null;
end$$;

-- ─────────────────────────────────────────────────────────────────────
-- #5  create_campaign: rate limit em mesas por DM.
--     Antes: usuário podia spam-criar mesas sem limite.
--     Cap em 20 mesas/DM (sane default — DM real raramente passa de 5).
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.create_campaign(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_code text;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) = 0 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  -- Cap anti-abuso (#5 super review).
  select count(*) into v_count from public.campaigns where dm_id = v_uid;
  if v_count >= 20 then
    raise exception 'too_many_campaigns' using errcode = 'P0003',
      hint = 'Limite de 20 mesas por DM. Apague uma antiga antes.';
  end if;

  v_code := public.gen_campaign_invite_code();

  insert into public.campaigns (name, dm_id, invite_code)
    values (btrim(p_name), v_uid, v_code)
    returning id into v_id;

  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_id, v_uid, 'dm');

  return v_id;
end;
$$;
