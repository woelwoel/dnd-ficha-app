-- Super review (resultadoReview.md) #3 [ALTO] — last-write-wins silencioso
-- entre dispositivos da MESMA conta. O autosave reescrevia o payload inteiro
-- sem verificação de versão: celular na mesa + notebook em casa = cada
-- debounce de 500ms sobrescrevia o que o outro dispositivo salvou.
--
-- Fix mínimo: coluna `version` + RPC de save condicional. No conflito o
-- client refetcha e avisa ("ficha alterada em outro dispositivo").
-- Aplique no SQL Editor do Supabase.

-- ─────────────────────────────────────────────────────────────────────
-- Coluna version. Linhas existentes ganham 1 via default.
-- ─────────────────────────────────────────────────────────────────────

alter table public.characters
  add column if not exists version int not null default 1;

-- ─────────────────────────────────────────────────────────────────────
-- Trigger: bump automático em QUALQUER caminho de escrita que mude `data`
-- (RPC save_character, upsert do import, update_character_position).
-- Centralizar o bump aqui garante que nenhum caminho esqueça de versionar.
--
-- Só bumpa quando `data` muda de fato: touch_character_last_opened (que o
-- client chama ao ABRIR a ficha) e o vínculo/desvínculo de mesa não podem
-- gerar conflito falso no primeiro save depois de abrir.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.bump_character_version()
returns trigger
language plpgsql
as $$
begin
  if new.data is distinct from old.data then
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists characters_bump_version on public.characters;

create trigger characters_bump_version
  before update on public.characters
  for each row execute function public.bump_character_version();

-- ─────────────────────────────────────────────────────────────────────
-- RPC: save_character(id, data, expected_version) -> nova version
-- UPDATE condicional: só aplica se a versão no banco for a esperada.
-- Versão divergente = outro dispositivo salvou no meio → version_conflict
-- (P0010), e o client refetcha em vez de sobrescrever às cegas.
--
-- RETURNING devolve a versão PÓS-trigger (já bumpada). Se p_data for igual
-- ao que está no banco (save redundante pós-refetch), o trigger não bumpa e
-- a versão volta inalterada — no-op de verdade.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.save_character(
  p_id uuid,
  p_data jsonb,
  p_expected_version int,
  p_last_opened_at timestamptz default null
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_new int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  update public.characters
    set data = p_data,
        last_opened_at = coalesce(p_last_opened_at, last_opened_at)
    where id = p_id
      and owner_id = v_uid
      and version = p_expected_version
    returning version into v_new;

  if v_new is null then
    if exists (select 1 from public.characters where id = p_id and owner_id = v_uid) then
      raise exception 'version_conflict' using errcode = 'P0010',
        hint = 'A ficha foi alterada em outro dispositivo. Recarregue antes de salvar.';
    end if;
    raise exception 'character_not_found_or_not_owner' using errcode = '42704';
  end if;

  return v_new;
end;
$$;

NOTIFY pgrst, 'reload schema';
