-- Resumo de fichas da mesa visível a QUALQUER membro, sem expor o `data`
-- completo. Aplique no SQL Editor do Supabase, NÃO via cliente.
--
-- Contexto: a RLS de `characters` (0004/0007) só devolve a linha inteira pro
-- DONO ou pro DM da mesa. Logo, um jogador comum, na visão da mesa, só
-- enxergaria o próprio token — nunca a companhia. Esta RPC abre um canal
-- SEPARADO que devolve apenas campos de RESUMO (nome, classe, raça, nível,
-- HP/CA, posição) de todas as fichas da mesa pra qualquer membro. O `data`
-- completo continua protegido pela RLS — quem quiser ABRIR a ficha alheia
-- esbarra nela (só dono/DM passam).

create or replace function public.campaign_roster(p_campaign_id uuid)
returns table (
  id             uuid,
  owner_id       uuid,
  short_id       text,
  campaign_id    uuid,
  name           text,
  class          text,
  race           text,
  level          int,
  max_hp         int,
  current_hp     int,
  armor_class    int,
  position       jsonb,
  last_opened_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  -- O predicado is_campaign_member não depende da linha: se o chamador não
  -- for membro, a cláusula vira FALSE e o resultado é vazio (sem vazamento).
  select
    c.id,
    c.owner_id,
    c.short_id,
    c.campaign_id,
    c.data->'info'->>'name'                       as name,
    c.data->'info'->>'class'                      as class,
    c.data->'info'->>'race'                       as race,
    nullif(c.data->'info'->>'level', '')::int     as level,
    nullif(c.data->'combat'->>'maxHp', '')::int   as max_hp,
    nullif(c.data->'combat'->>'currentHp', '')::int as current_hp,
    nullif(c.data->'combat'->>'armorClass', '')::int as armor_class,
    c.data->'position'                            as position,
    c.last_opened_at
  from public.characters c
  where c.campaign_id = p_campaign_id
    and public.is_campaign_member(p_campaign_id);
$$;

grant execute on function public.campaign_roster(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';
