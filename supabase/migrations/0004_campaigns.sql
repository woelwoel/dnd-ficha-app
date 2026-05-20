-- PR 3: schema de campanhas/mesas. Sem UI ainda — só prepara o terreno.
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

-- ─────────────────────────────────────────────────────────────────────
-- Tabelas
-- ─────────────────────────────────────────────────────────────────────

create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  dm_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index campaigns_dm_id_idx      on public.campaigns (dm_id);
create index campaigns_invite_code_idx on public.campaigns (invite_code);

create trigger campaigns_touch_updated_at
  before update on public.campaigns
  for each row execute function public.touch_updated_at();

create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('dm', 'player')),
  created_at  timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index campaign_members_user_id_idx on public.campaign_members (user_id);

create table public.join_attempts (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ts         timestamptz not null default now()
);

create index join_attempts_user_ts_idx on public.join_attempts (user_id, ts desc);

-- ─────────────────────────────────────────────────────────────────────
-- Geração de invite_code (10 chars, mesmo alfabeto sem ambíguos do short_id)
-- ─────────────────────────────────────────────────────────────────────

-- Usa gen_random_bytes (pgcrypto / CSPRNG) em vez de random() pra que o código
-- não seja previsível por quem souber o seed do RNG. Alfabeto sem ambíguos
-- (sem 0/O/1/I/l). pgcrypto já vem habilitado em todo projeto Supabase.
create function public.gen_campaign_invite_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  alen     int  := length(alphabet);
  candidate text;
  bytes     bytea;
  attempts  int := 0;
begin
  loop
    candidate := '';
    bytes := gen_random_bytes(10);
    for i in 1..10 loop
      -- get_byte é 0-indexed, retorna 0..255. mod alen tem viés residual
      -- (256 mod 54 = 40), aceitável aqui — espaço 54^10 ≈ 2.4e17.
      candidate := candidate || substr(alphabet, 1 + (get_byte(bytes, i - 1) % alen), 1);
    end loop;
    if not exists (select 1 from public.campaigns where invite_code = candidate) then
      return candidate;
    end if;
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'could_not_generate_unique_invite_code';
    end if;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Helpers pra usar dentro de policies (stable, security definer)
-- Security definer pra escapar do RLS na hora de checar membership.
-- ─────────────────────────────────────────────────────────────────────

create function public.is_campaign_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.campaign_members
    where campaign_id = cid and user_id = auth.uid()
  );
$$;

create function public.is_campaign_dm(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.campaigns
    where id = cid and dm_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- RLS: campaigns
-- ─────────────────────────────────────────────────────────────────────

alter table public.campaigns enable row level security;

-- DM vê a própria mesa; membros veem a mesa em que entraram.
create policy "campaigns_select_dm_or_member"
  on public.campaigns for select
  to authenticated
  using (dm_id = auth.uid() or public.is_campaign_member(id));

-- Criação: precisa setar dm_id = self. (Na prática usuários usam create_campaign RPC,
-- mas a policy existe pra permitir o insert que a RPC faz quando `security definer`
-- volta ao contexto do usuário — security definer já burla RLS, mas mantemos a
-- policy permissiva pra simetria.)
create policy "campaigns_insert_self_dm"
  on public.campaigns for insert
  to authenticated
  with check (dm_id = auth.uid());

create policy "campaigns_update_dm"
  on public.campaigns for update
  to authenticated
  using (dm_id = auth.uid())
  with check (dm_id = auth.uid());

create policy "campaigns_delete_dm"
  on public.campaigns for delete
  to authenticated
  using (dm_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- RLS: campaign_members
-- Insert sem policy permissiva = bloqueado pra todo mundo. Único caminho:
-- RPCs create_campaign e join_campaign (security definer fazem o bypass).
-- ─────────────────────────────────────────────────────────────────────

alter table public.campaign_members enable row level security;

-- Cada user vê suas próprias linhas; também vê outros membros das mesas em que está.
create policy "campaign_members_select_self_or_same_campaign"
  on public.campaign_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_campaign_member(campaign_id)
  );

-- DM da mesa pode remover qualquer um; usuário pode remover a si próprio
-- desde que NÃO seja o DM (DM sai apagando a mesa inteira).
create policy "campaign_members_delete_dm_or_self_non_dm"
  on public.campaign_members for delete
  to authenticated
  using (
    public.is_campaign_dm(campaign_id)
    or (user_id = auth.uid() and role <> 'dm')
  );

-- ─────────────────────────────────────────────────────────────────────
-- RLS: join_attempts
-- Usuário pode ver suas próprias tentativas (debug); insert só via RPC
-- (security definer). Sem update/delete (auditoria).
-- ─────────────────────────────────────────────────────────────────────

alter table public.join_attempts enable row level security;

create policy "join_attempts_select_self"
  on public.join_attempts for select
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- characters: vincular opcionalmente a uma campanha.
-- ─────────────────────────────────────────────────────────────────────

alter table public.characters
  add column campaign_id uuid references public.campaigns(id) on delete set null;

create index characters_campaign_id_idx on public.characters (campaign_id);

-- Substitui o select_own pra também permitir DM ler fichas de membros da mesa.
-- Insert ganha check extra: se campaign_id setado, precisa ser membro.

drop policy "characters_select_own"   on public.characters;
drop policy "characters_insert_own"   on public.characters;

create policy "characters_select_own_or_dm_of_campaign"
  on public.characters for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (campaign_id is not null and public.is_campaign_dm(campaign_id))
  );

create policy "characters_insert_own_in_own_campaign"
  on public.characters for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (
      campaign_id is null
      or public.is_campaign_member(campaign_id)
    )
  );

-- update e delete permanecem owner-only (já estão criados em 0002_characters.sql,
-- não precisam ser recriados). Spec: DM NÃO edita ficha de jogador.
