-- supabase/migrations/0015_encounters.sql
-- Mesa de Combate (spec 2026-07-26).
--   1. tabela `encounters` — estado do combate, visível SÓ pro Mestre da mesa;
--   2. dm_apply_combat_state — patch estreito em data->'combat' de uma ficha;
--   3. dm_save_character     — doc completo (só o descanso em lote usa).
--
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Tabela
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.encounters (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  version     int not null default 1,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Um encontro ATIVO por mesa. Índice parcial (constraint de tabela não aceita
-- WHERE). Encerrar = active=false, então o histórico não colide.
create unique index if not exists encounters_one_active_per_campaign
  on public.encounters (campaign_id) where active;

create index if not exists encounters_campaign_idx
  on public.encounters (campaign_id);

alter table public.encounters enable row level security;

-- Só o Mestre da mesa. Sem policy pra jogador = bloqueado por padrão (não
-- existe Player View no escopo desta entrega).
drop policy if exists "encounters_all_dm" on public.encounters;
create policy "encounters_all_dm"
  on public.encounters for all
  to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));

-- version + updated_at automáticos (mesmo padrão de characters em 0009).
create or replace function public.bump_encounter_version()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.state is distinct from old.state then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists encounters_bump_version on public.encounters;
create trigger encounters_bump_version
  before update on public.encounters
  for each row execute function public.bump_encounter_version();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Guarda comum: quem chama é o Mestre da mesa DESTA ficha?
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.assert_dm_of_character(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cid uuid;
begin
  -- security definer: lê campaign_id sem passar pela RLS. Não devolve dado
  -- nenhum — só levanta exceção ou retorna void.
  select campaign_id into v_cid from public.characters where id = p_character_id;
  if v_cid is null or not public.is_campaign_dm(v_cid) then
    raise exception 'not_dm_of_campaign' using errcode = '42501';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC estreita do combate ao vivo
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.dm_apply_combat_state(
  p_character_id uuid,
  p_patch jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Lista FECHADA: exatamente o que applyDamage/applyHealing mexem, mais
  -- conditions. Qualquer coisa fora daqui é recusada.
  v_allowed text[] := array['currentHp','tempHp','deathSaves','isStable','isDead','conditions'];
  v_key text;
  v_new int;
begin
  perform public.assert_dm_of_character(p_character_id);

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_patch' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed)) then
      raise exception 'illegal_patch_key: %', v_key using errcode = '22023';
    end if;
  end loop;

  update public.characters
     set data = jsonb_set(
           data, '{combat}',
           coalesce(data->'combat', '{}'::jsonb) || p_patch,
           true)
   where id = p_character_id
     and version = p_expected_version
  returning version into v_new;  -- trigger characters_bump_version já subiu

  if v_new is null then
    raise exception 'version_conflict' using errcode = 'P0010';
  end if;

  return v_new;
end;
$$;

grant execute on function public.dm_apply_combat_state(uuid, jsonb, int) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC de doc completo — ÚNICO consumidor: descanso em lote
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.dm_save_character(
  p_character_id uuid,
  p_data jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new int;
begin
  perform public.assert_dm_of_character(p_character_id);

  update public.characters
     set data = p_data
   where id = p_character_id
     and version = p_expected_version
  returning version into v_new;

  if v_new is null then
    raise exception 'version_conflict' using errcode = 'P0010';
  end if;

  return v_new;
end;
$$;

grant execute on function public.dm_save_character(uuid, jsonb, int) to authenticated;

NOTIFY pgrst, 'reload schema';
