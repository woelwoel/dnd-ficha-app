# Checklist de configuração Supabase

Itens que **não** dão pra versionar via migration — precisam ser conferidos
manualmente no painel do Supabase. Revisar sempre que provisionar um novo
projeto (preview, produção, etc).

## Authentication

- [ ] **Confirm email = ON**
  Painel: Authentication → Providers → Email → "Confirm email".
  Sem isso, qualquer um cria conta com email alheio (#8 do super review).

- [ ] **Secure email change = ON**
  Painel: Authentication → Email Templates / Settings → "Secure email change".
  Exige confirmação nos dois endereços antes de trocar.

- [ ] **Rate limits revisados**
  Painel: Authentication → Rate Limits.
  Defaults do Supabase costumam ser ok pra signUp/signIn.
  `join_campaign` já tem rate limit próprio (10/min) na nossa função.

- [ ] **Magic Link / OTP**
  Confirmar se queremos habilitar. Hoje só email+senha.

## Database

- [ ] **pg_cron habilitado**
  Painel: Database → Extensions → habilitar `pg_cron`.
  Necessário pro purge automático de `join_attempts` (migration `0006_join_attempts_purge.sql`).
  Se não habilitar, rodar o purge manual periodicamente:
  ```sql
  delete from public.join_attempts where ts < now() - interval '1 day';
  ```

- [ ] **Region da instância**
  Conferir região. LGPD: documentar na página /privacidade onde os dados moram.

## Storage

- Hoje não usamos Supabase Storage (avatars são URL externa via `profiles.avatar_url`).

## Conferir RLS

Roda no SQL Editor pra listar todas as policies e checar se cobrem o esperado:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Esperado:
- `profiles` — SELECT só própria + via view `public_profiles`
- `characters` — SELECT/INSERT/UPDATE/DELETE por `owner_id = auth.uid()` ou DM da mesa
- `campaigns` — SELECT por membro, INSERT autenticado, UPDATE/DELETE só DM
- `campaign_members` — SELECT por membro da mesma mesa, INSERT/DELETE via RPCs
- `join_attempts` — INSERT por authenticated, SELECT só do próprio user_id

## Testes RLS

```bash
npm run test:rls
```

Roda contra o projeto definido em `.env.test` (ou skipa se não definido).
