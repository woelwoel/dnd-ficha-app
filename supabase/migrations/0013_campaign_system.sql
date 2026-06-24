-- ─────────────────────────────────────────────────────────────────────
-- 0013_campaign_system.sql
-- Mesa carrega o sistema (escolhido na criação). Uma mesa joga um sistema só.
--   1) coluna `system` em campaigns (default backfilla mesas existentes);
--   2) trigger que impede ligar uma ficha a uma mesa de outro sistema;
--   3) create_campaign ganha p_system (recriada — mudança de assinatura).
-- ─────────────────────────────────────────────────────────────────────

-- 1) Coluna comum (não gerada): o sistema é propriedade intrínseca da mesa,
-- definida uma vez na criação. Default 'dnd5e' backfilla as mesas existentes.
alter table public.campaigns
  add column system text not null default 'dnd5e';

-- 2) Integridade ficha↔mesa: characters.system (coluna gerada da 0012) precisa
-- bater com campaigns.system quando a ficha está vinculada a uma mesa.
-- SECURITY DEFINER + search_path travado pra ler campaigns sem depender da RLS
-- do usuário que está salvando.
create or replace function public.assert_character_campaign_system()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign_system text;
begin
  if new.campaign_id is not null then
    select system into v_campaign_system from public.campaigns where id = new.campaign_id;
    -- new.system é a coluna gerada (coalesce(data->>'system','dnd5e')).
    if v_campaign_system is not null and new.system <> v_campaign_system then
      raise exception 'system_mismatch' using errcode = 'P0004',
        hint = 'A ficha e a mesa precisam ser do mesmo sistema.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists characters_assert_system on public.characters;
create trigger characters_assert_system
  before insert or update on public.characters
  for each row execute function public.assert_character_campaign_system();

-- 3) create_campaign ganha p_system. Adicionar um parâmetro muda a assinatura,
-- então é preciso DROP + CREATE (não dá pra `create or replace` com nova arg).
-- O corpo parte da versão mais recente (0005_review_fixes.sql: cap de 20 mesas),
-- só somando o `system` no insert. p_system tem default pra chamadas antigas
-- ({p_name}) continuarem válidas.
drop function if exists public.create_campaign(text);

create function public.create_campaign(p_name text, p_system text default 'dnd5e')
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

  insert into public.campaigns (name, dm_id, invite_code, system)
    values (btrim(p_name), v_uid, v_code, coalesce(p_system, 'dnd5e'))
    returning id into v_id;

  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_id, v_uid, 'dm');

  return v_id;
end;
$$;

-- ── DOWN (rollback) ──────────────────────────────────────────────────
-- drop trigger if exists characters_assert_system on public.characters;
-- drop function if exists public.assert_character_campaign_system();
-- drop function if exists public.create_campaign(text, text);
-- -- e recriar a versão (text) a partir de 0005_review_fixes.sql:
-- --   create function public.create_campaign(p_name text) ... (corpo da 0005)
-- alter table public.campaigns drop column if exists system;
