-- Adiciona short_id à tabela characters: identificador URL-friendly de 10 chars
-- (sem 0/O, 1/I/l) pra usar nas URLs em vez do UUID.
-- UUID continua existindo como PK; URLs antigas com UUID continuam funcionando.

create function public.gen_character_short_id()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  alen int := length(alphabet);
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := '';
    for i in 1..10 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * alen)::int, 1);
    end loop;
    if not exists (select 1 from public.characters where short_id = candidate) then
      return candidate;
    end if;
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'could_not_generate_unique_short_id';
    end if;
  end loop;
end;
$$;

alter table public.characters
  add column short_id text unique;

-- Backfill rows existentes.
update public.characters
  set short_id = public.gen_character_short_id()
  where short_id is null;

alter table public.characters
  alter column short_id set not null;

create index characters_short_id_idx on public.characters (short_id);

-- Trigger: auto-gera short_id em inserts que não vieram com um.
create function public.set_character_short_id()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.short_id is null or new.short_id = '' then
    new.short_id := public.gen_character_short_id();
  end if;
  return new;
end;
$$;

create trigger characters_set_short_id
  before insert on public.characters
  for each row execute function public.set_character_short_id();
