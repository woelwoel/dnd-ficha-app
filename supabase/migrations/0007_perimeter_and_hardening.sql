-- Super review (resultadoReview.md) — fecha o perímetro DM↔jogador no SERVIDOR
-- e endurece o schema. Aplique no SQL Editor do Supabase.
--
-- Achados cobertos:
--   #1 [ALTO]  UPDATE de characters não revalidava campaign_id (membership só
--              era checada client-side, contornável via REST com a ANON_KEY).
--   #2 [ALTO]  Remover/sair da mesa não desvinculava as fichas → DM continuava
--              lendo ficha de ex-membro indefinidamente.
--   #-  [BAIXO] profiles.display_name sem limite de tamanho.

-- ─────────────────────────────────────────────────────────────────────
-- #1  characters: UPDATE precisa revalidar campaign_id contra membership.
--     A policy de 0002 era owner-only no USING/CHECK e NÃO checava
--     campaign_id — um owner podia setar campaign_id de qualquer mesa cujo
--     UUID conhecesse, sem ser membro. Agora o CHECK exige membership
--     (ou campaign_id null = ficha pessoal).
-- ─────────────────────────────────────────────────────────────────────

drop policy if exists "characters_update_own" on public.characters;

create policy "characters_update_own"
  on public.characters for update
  to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (campaign_id is null or public.is_campaign_member(campaign_id))
  );

-- ─────────────────────────────────────────────────────────────────────
-- #2  Desvincular fichas quando o vínculo de membership some.
--     A policy characters_select_own_or_dm_of_campaign (0004) só checa
--     is_campaign_dm(campaign_id) — não checa se o DONO ainda é membro.
--     Sem este trigger, deletar a linha de campaign_members (removeMember/
--     leaveCampaign) deixa characters.campaign_id apontando pra mesa, e o
--     DM segue lendo a ficha do ex-membro. Não dá pra confiar no client.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.detach_characters_on_member_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.characters
    set campaign_id = null
    where campaign_id = old.campaign_id
      and owner_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists campaign_members_detach_characters on public.campaign_members;

create trigger campaign_members_detach_characters
  after delete on public.campaign_members
  for each row execute function public.detach_characters_on_member_removal();

-- ─────────────────────────────────────────────────────────────────────
-- display_name: limite de tamanho (paridade com campaigns.name 1..80).
--     Sem isso, um UPDATE direto na REST grava megabytes no próprio perfil.
-- ─────────────────────────────────────────────────────────────────────

alter table public.profiles
  drop constraint if exists display_name_len;

alter table public.profiles
  add constraint display_name_len
  check (char_length(display_name) between 1 and 60);

NOTIFY pgrst, 'reload schema';
