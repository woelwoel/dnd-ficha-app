-- Tabela characters: persistência das fichas (era localStorage).
-- owner_id setado automaticamente via auth.uid() em insert.

create table public.characters (
  id              uuid primary key,
  owner_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  data            jsonb not null,
  last_opened_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint characters_data_size check (octet_length(data::text) < 200000)
);

create index characters_owner_id_idx on public.characters (owner_id);

-- Trigger: atualiza updated_at em qualquer UPDATE.
create trigger characters_touch_updated_at
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- Trigger: limita 100 fichas por usuário (anti-abuse).
create function public.enforce_character_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cnt int;
begin
  select count(*) into cnt from public.characters where owner_id = new.owner_id;
  if cnt >= 100 then
    raise exception 'character_limit_reached'
      using errcode = '23505',
            hint = 'Máximo de 100 fichas por usuário.';
  end if;
  return new;
end;
$$;

create trigger characters_enforce_limit
  before insert on public.characters
  for each row execute function public.enforce_character_limit();

-- RLS: owner-only.
alter table public.characters enable row level security;

create policy "characters_select_own"
  on public.characters for select
  to authenticated
  using (owner_id = auth.uid());

create policy "characters_insert_own"
  on public.characters for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "characters_update_own"
  on public.characters for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "characters_delete_own"
  on public.characters for delete
  to authenticated
  using (owner_id = auth.uid());

-- RPC: atualiza só character.data.position sem reescrever payload inteiro.
-- Útil pra drag-to-move no mapa (alta frequência).
create function public.update_character_position(p_id uuid, p_position jsonb)
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
    where id = p_id and owner_id = auth.uid();
  if not found then
    raise exception 'character_not_found_or_not_owner' using errcode = '42704';
  end if;
end;
$$;

-- RPC: atualiza last_opened_at sem reescrever data.
create function public.touch_character_last_opened(p_id uuid)
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
    set last_opened_at = now()
    where id = p_id and owner_id = auth.uid();
end;
$$;
