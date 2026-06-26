-- Privacidade na visão de mesa: o campaign_roster passa a REDIGIR raça/classe/
-- nível/HP/CA das fichas que NÃO são do chamador (a menos que o chamador seja o
-- DM da mesa), e expõe o nome do jogador (profiles.display_name). Aplique no SQL
-- Editor do Supabase, NÃO via cliente.
--
-- revealed = true quando a linha é do próprio chamador OU o chamador é o DM.
-- Quando false, os campos sensíveis voltam NULL — o dado nem chega no navegador.
-- `name` (personagem), `player_name` e `position` são sempre devolvidos (a ficha
-- precisa aparecer no mapa). O `data` completo segue protegido pela RLS de
-- characters (só dono/DM abrem a ficha).

-- A 0011 já criou esta função com OUTRA assinatura de retorno (sem player_name/
-- revealed). Postgres não deixa o `create or replace` mudar o tipo de retorno
-- (erro 42P13) → precisa dropar antes de recriar.
drop function if exists public.campaign_roster(uuid);

create or replace function public.campaign_roster(p_campaign_id uuid)
returns table (
  id             uuid,
  owner_id       uuid,
  short_id       text,
  campaign_id    uuid,
  name           text,
  player_name    text,
  revealed       boolean,
  class          text,
  race           text,
  level          int,
  max_hp         int,
  current_hp     int,
  armor_class    int,
  "position"     jsonb,
  last_opened_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.owner_id,
    c.short_id,
    c.campaign_id,
    c.data->'info'->>'name'                          as name,
    pr.display_name                                  as player_name,
    rev.revealed                                     as revealed,
    case when rev.revealed then c.data->'info'->>'class' end as class,
    case when rev.revealed then c.data->'info'->>'race'  end as race,
    case when rev.revealed then nullif(c.data->'info'->>'level', '')::int end       as level,
    case when rev.revealed then nullif(c.data->'combat'->>'maxHp', '')::int end     as max_hp,
    case when rev.revealed then nullif(c.data->'combat'->>'currentHp', '')::int end as current_hp,
    case when rev.revealed then nullif(c.data->'combat'->>'armorClass', '')::int end as armor_class,
    c.data->'position'                               as "position",
    c.last_opened_at
  from public.characters c
  left join public.profiles pr on pr.id = c.owner_id
  cross join lateral (
    select (
      c.owner_id = auth.uid()
      or auth.uid() = (select cm.dm_id from public.campaigns cm where cm.id = p_campaign_id)
    ) as revealed
  ) rev
  where c.campaign_id = p_campaign_id
    and public.is_campaign_member(p_campaign_id);
$$;

grant execute on function public.campaign_roster(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';
