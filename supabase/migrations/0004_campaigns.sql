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
