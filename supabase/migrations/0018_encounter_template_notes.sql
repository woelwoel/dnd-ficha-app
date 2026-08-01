-- supabase/migrations/0018_encounter_template_notes.sql
-- Telas de Preparação (spec 2026-07-31): notas por encontro salvo — gancho da
-- cena, tática dos monstros, tesouro.
--
-- Texto livre e opcional. Template gravado antes disto lê `null`, e a UI mostra
-- o campo vazio: não há retrofit nem valor padrão a inventar.
--
-- Sem limite de tamanho no banco de propósito: o campo é uma anotação de
-- preparação, não um documento, e um CHECK apertado aqui só devolveria erro de
-- banco onde a UI já pode avisar antes.
--
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

alter table public.encounter_templates
  add column if not exists notes text;

comment on column public.encounter_templates.notes is
  'Anotação livre do Mestre sobre o encontro (gancho, tática, tesouro).';
