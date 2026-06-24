-- ─────────────────────────────────────────────────────────────────────
-- 0012_character_system.sql
-- Coluna `system` derivada do blob JSONB da ficha. A fonte da verdade segue
-- sendo data->>'system' (viaja com export/import e mantém o corpo
-- self-describing); a coluna é só pra roteamento/filtro server-side.
--
-- Como é GENERATED ALWAYS ... STORED a partir de coalesce(data->>'system',
-- 'dnd5e'), toda ficha legada (sem o campo) deriva 'dnd5e' no instante em que
-- a migration roda — backfill automático, nenhuma row é mutada/apagada. O
-- cliente nunca escreve a coluna (faz upsert só de `data`; o Postgres recalcula).
-- ─────────────────────────────────────────────────────────────────────

alter table public.characters
  add column system text
  generated always as (lower(coalesce(data->>'system', 'dnd5e'))) stored;

create index if not exists characters_system_idx on public.characters (system);

-- ── DOWN (rollback) ──────────────────────────────────────────────────
-- drop index if exists characters_system_idx;
-- alter table public.characters drop column if exists system;
