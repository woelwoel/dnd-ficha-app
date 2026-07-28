-- supabase/migrations/0017_encounter_templates.sql
-- Construtor de Encontros (spec 2026-07-27): encontros salvos e nomeados por
-- mesa, visíveis SÓ pro Mestre.
--
-- Tabela separada de `encounters` de propósito: lá mora o COMBATE (state com
-- iniciativa, rodada, HP dos monstros), aqui mora a RECEITA
-- ([{monsterIndex, count}]). Misturar as duas faria `active = false` virar um
-- saco de "lutas terminadas" + "grupos preparados".
--
-- Sem coluna `version`: template é editado por uma pessoa, fora da sessão, e o
-- custo de um conflito é reescrever um nome. Last-write-wins de propósito.
--
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

create table if not exists public.encounter_templates (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name        text not null,
  monsters    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint encounter_templates_name_len
    check (char_length(btrim(name)) between 1 and 80)
);

-- Dois "Emboscada na ponte" na mesma mesa é erro de digitação, não intenção.
create unique index if not exists encounter_templates_name_per_campaign
  on public.encounter_templates (campaign_id, lower(btrim(name)));

create index if not exists encounter_templates_campaign_idx
  on public.encounter_templates (campaign_id);

alter table public.encounter_templates enable row level security;

drop policy if exists "encounter_templates_all_dm" on public.encounter_templates;
create policy "encounter_templates_all_dm"
  on public.encounter_templates for all
  to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));

create or replace function public.touch_encounter_template()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists encounter_templates_touch on public.encounter_templates;
create trigger encounter_templates_touch
  before update on public.encounter_templates
  for each row execute function public.touch_encounter_template();

NOTIFY pgrst, 'reload schema';
