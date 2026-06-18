-- Perfil de admin: flag + helper + políticas RLS aditivas + relaxamento das
-- RPCs de save/posição. Aplique no SQL Editor do Supabase, NÃO via cliente.

-- ─────────────────────────────────────────────────────────────────────
-- Flag de admin no profile.
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Helper usado dentro das policies e RPCs. security definer pra ler profiles
-- sem esbarrar no RLS; stable porque não muda dentro da mesma query.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Políticas ADITIVAS de admin (FOR ALL = select/insert/update/delete).
-- Permissivas: o Postgres faz OR com as policies existentes. Não afetam
-- não-admins porque is_admin() retorna false pra eles.
-- ─────────────────────────────────────────────────────────────────────
create policy "characters_admin_all" on public.characters
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "campaigns_admin_all" on public.campaigns
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "campaign_members_admin_all" on public.campaign_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────
-- Relaxar save_character: admin pode salvar ficha de qualquer dono,
-- mantendo o version-lock otimista (migration 0009).
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
      and (owner_id = v_uid or public.is_admin())
      and version = p_expected_version
    returning version into v_new;

  if v_new is null then
    if exists (
      select 1 from public.characters
      where id = p_id and (owner_id = v_uid or public.is_admin())
    ) then
      raise exception 'version_conflict' using errcode = 'P0010',
        hint = 'A ficha foi alterada em outro dispositivo. Recarregue antes de salvar.';
    end if;
    raise exception 'character_not_found_or_not_owner' using errcode = '42704';
  end if;

  return v_new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Relaxar update_character_position pra admin (edição no mapa).
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.update_character_position(p_id uuid, p_position jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.characters
    set data = jsonb_set(data, '{position}', p_position, true)
    where id = p_id and (owner_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'character_not_found_or_not_owner' using errcode = '42704';
  end if;
end;
$$;

NOTIFY pgrst, 'reload schema';
