-- Fix: gen_campaign_invite_code falhava com 42883 ("gen_random_bytes(integer)
-- does not exist") em projetos Supabase onde pgcrypto vive no schema
-- `extensions` (default em projetos novos). O search_path = public, pg_temp
-- da função SECURITY DEFINER não enxergava extensions.
--
-- Bug pré-existente desde 0004 — só aparece na primeira tentativa de criar
-- mesa num projeto onde pgcrypto não está no schema public.

create or replace function public.gen_campaign_invite_code()
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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

NOTIFY pgrst, 'reload schema';
