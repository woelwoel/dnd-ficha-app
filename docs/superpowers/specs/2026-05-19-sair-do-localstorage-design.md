# Sair do localStorage — Migração para Supabase

**Data:** 2026-05-19
**Status:** Design aprovado, aguardando plano de implementação

## Contexto e objetivo

Hoje o app guarda tudo em `localStorage` via `src/utils/storage.js`. Limitações:
- Dados não sincronizam entre dispositivos.
- Limpeza de cache/navegador apaga as fichas.
- Não há conceito de usuário nem de mesa/grupo.

Objetivo: mover a persistência pra Supabase (Postgres + Auth + RLS), com modelo de **mesas/campanhas**, autenticação por email/senha + Google, e operação **somente online** (sem camada offline).

Migração de fichas existentes do localStorage **não é necessária** — pode começar do zero.

## Decisões

- **Backend:** Supabase. Cliente fala direto via `@supabase/supabase-js`; RLS é a única barreira de autorização.
- **Auth:** email/senha + Google OAuth. Confirmação de email obrigatória. Senha checada contra HIBP.
- **Modelo de acesso:** mesa/campanha como grupo. Mestre vê fichas dos jogadores em read-only. Fichas podem ser pessoais (sem mesa) ou vinculadas a uma mesa.
- **Convite:** código curto (8 chars alfanuméricos sem ambíguos) gerado servidor-side, com rate limit.
- **Sincronização:** só online. Sem cache local, sem offline. Realtime opcional no PR 5.
- **Persistência da ficha:** coluna `jsonb data` — mantém o schema Zod atual sem normalizar.
- **API do storage.js:** mesma fachada de funções, todas async.

## Stack e arquitetura

- **Cliente Supabase:** `src/lib/supabase.js` singleton. Credenciais via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (env vars do Vercel + `.env.local` pra dev).
- **Estado de auth:** `src/auth/AuthProvider.jsx` com contexto React. Escuta `supabase.auth.onAuthStateChange`. Expõe `{ user, loading, signIn, signUp, signOut, signInWithGoogle }`.
- **Gating em `App.jsx`:** `loading` → spinner; `!user` → `<LoginScreen/>`; senão → app atual.
- **Sem router:** continua app de uma página. Tela de login é condicional.
- **Deploy:** Vercel. Allowed Origins no Supabase cobrem `localhost:5173`, domínio prod e pattern de previews `*.vercel.app`.

## Schema do banco

Todas tabelas em `public`, com `created_at`/`updated_at` (`updated_at` via trigger).

### `profiles`
- `id uuid PK` — FK → `auth.users.id` (cascade)
- `display_name text`
- `avatar_url text` (futuro)

Trigger `on auth.users insert` cria `profiles` com `display_name = email`.

### `campaigns`
- `id uuid PK default gen_random_uuid()`
- `name text not null`
- `dm_id uuid not null` — FK → `profiles.id`
- `invite_code text unique not null` — 8 chars alfanuméricos sem `O/0/I/1/l`
- `archived_at timestamptz` (soft-delete opcional)

### `campaign_members`
- `id uuid PK`
- `campaign_id uuid not null` — FK → `campaigns.id` (cascade)
- `user_id uuid not null` — FK → `profiles.id`
- `role text not null check (role in ('dm','player'))`
- `unique(campaign_id, user_id)`

DM é membro com `role='dm'` (criado em transação pela RPC `create_campaign`).

### `characters`
- `id uuid PK` — fornecido pelo cliente (preserva `character.id` do schema Zod)
- `owner_id uuid not null` — FK → `profiles.id`
- `campaign_id uuid` — FK → `campaigns.id` (nullable = ficha pessoal)
- `data jsonb not null` — payload completo da ficha (schema Zod atual)
- `name text generated always as (data->>'name') stored`
- `last_opened_at timestamptz`
- Índices: `(owner_id)`, `(campaign_id) where campaign_id is not null`
- Constraints:
  - `check (octet_length(data::text) < 200000)` — limite de 200KB por ficha
  - Trigger `before insert` — limite de 100 fichas por `owner_id`

## RLS e RPCs

### Funções helper

```sql
create function is_campaign_member(cid uuid)
returns boolean language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = cid and user_id = auth.uid()
  );
$$;

create function is_campaign_dm(cid uuid)
returns boolean language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from campaigns
    where id = cid and dm_id = auth.uid()
  );
$$;
```

### Policies

**`profiles`**
- `select`: autenticado, retorna apenas `display_name` (info pública).
- `update`: `auth.uid() = id`.

**`campaigns`**
- `select`: `dm_id = auth.uid()` OR `is_campaign_member(id)`.
- `insert`: autenticado com `dm_id = auth.uid()`.
- `update` / `delete`: `dm_id = auth.uid()`.

**`campaign_members`**
- `select`: `user_id = auth.uid()` OR `is_campaign_member(campaign_id)`.
- `insert`: bloqueado por RLS (sem policy permissiva). Inserção sempre via RPC `create_campaign` / `join_campaign` (SECURITY DEFINER faz o bypass controlado).
- `delete`: DM remove qualquer um da própria mesa; usuário remove a si mesmo (não DM da mesa).

**`characters`**
- `select`: `owner_id = auth.uid()` OR (`campaign_id is not null` AND `is_campaign_dm(campaign_id)`).
- `insert`: `owner_id = auth.uid()` (e se `campaign_id` setado, precisa `is_campaign_member`).
- `update`: `owner_id = auth.uid()` (DM **não** edita ficha de jogador no escopo inicial).
- `delete`: `owner_id = auth.uid()`.

### RPCs (todas `SECURITY DEFINER` com `set search_path = public, pg_temp` e check `auth.uid() is not null`)

- `create_campaign(name text) returns uuid` — cria campanha + insere criador como `dm`.
- `join_campaign(code text) returns uuid` — resolve `invite_code` → insere `campaign_members(role='player')`. Falha com mensagem genérica se código não existe ou já é membro.
- `rotate_invite_code(campaign_id uuid) returns text` — só DM da campanha.
- `update_character_position(id uuid, pos jsonb)` — `jsonb_set(data, '{position}', pos)`. RLS aplica.
- `delete_my_account() returns void` — apaga `profiles` (cascade limpa o resto).

### Rate limit

Tabela `join_attempts(user_id uuid, ts timestamptz default now())`. RPC `join_campaign` insere registro e rejeita se `count(*) where ts > now() - interval '1 min' and user_id = auth.uid()` ≥ 10.

## Camada de dados no cliente

### `src/utils/storage.js` (reescrito, mesma fachada)

Funções viram `async`. Mantêm contrato de retorno (`{ ok, errors? }`):

- `loadCharacters({ scope } = {})` — `scope`: `'mine'` (default), `'personal'`, `'campaign:<id>'`.
- `loadCharacterById(id)`
- `upsertCharacter(character)` — Zod local + upsert em `characters`. Inclui `owner_id`, `campaign_id`, `data`.
- `deleteCharacter(id)`
- `updateCharacterPosition(id, position)` — RPC `update_character_position`.
- `touchCharacterLastOpened(id)` — `update last_opened_at`.
- `exportAllCharacters()` — mesmo formato JSON.
- `importAllCharacters(payload, mode)` — usa `upsertCharacter` em loop.

### `src/lib/campaigns.js` (novo)

- `listMyCampaigns()` — mesas onde sou membro, com `role`.
- `createCampaign(name)` → RPC.
- `joinCampaign(code)` → RPC. Erros: `not-found-or-already-member` (mensagem única), `rate-limited`.
- `listMembers(campaignId)`
- `removeMember(campaignId, userId)` / `leaveCampaign(campaignId)`
- `rotateInviteCode(campaignId)`

### Hooks

- `useAutoSave(character)` — internals async, mesmo debounce. Erros: `'network' | 'auth' | 'invalid' | 'rls'`. Após 3 falhas seguidas, banner persistente.
- `CharacterList.jsx` — `useEffect` pra carregar; `onAuthStateChange` recarrega; remove listener `storage` cross-tab.

### Validação

Zod permanece como fonte da verdade do formato. Postgres só guarda `data jsonb`. `migrateCharacter` continua rodando no cliente no load.

### Testes

- Mock de `src/lib/supabase.js` com tabela em memória pra testes unitários.
- `storage.test.js` continua testando contrato (agora async).
- Novo `auth.test.jsx` — gating de login, logout.
- E2E (Playwright): decisão concreta no plano — usar Supabase local via Docker no CI, ou stub do client.

## Segurança

### Princípios

- **Anon key é pública por design** — RLS é a única barreira. Toda tabela precisa ter RLS habilitado E policies explícitas.
- **Defesa em profundidade** — RPCs `SECURITY DEFINER` validam `auth.uid()` e usam `set search_path`.
- **Mínimo privilégio** — DM não edita ficha; usuário não enumera mesas.

### Checklist obrigatório (entra no plano)

- [ ] RLS habilitado em `profiles`, `campaigns`, `campaign_members`, `characters`
- [ ] Policy explícita pra cada operação em cada tabela
- [ ] Teste automatizado com 2 usuários confirmando isolamento (script Node ou pgTAP)
- [ ] Toda RPC `SECURITY DEFINER` tem `set search_path = public, pg_temp` e check `auth.uid()`
- [ ] `invite_code` com ≥ 8 chars, sem ambíguos, `gen_random_bytes`
- [ ] Rate limit em `join_campaign` (10/min/user)
- [ ] Resposta de erro genérica em `join_campaign` (não enumera)
- [ ] Email confirmação obrigatória (config Supabase)
- [ ] HIBP check habilitado (config Supabase)
- [ ] Senha mínima 8 chars
- [ ] Allowed Origins configurado (localhost + prod + previews)
- [ ] Constraint `octet_length(data::text) < 200000`
- [ ] Trigger limite 100 fichas/user
- [ ] RPC `delete_my_account` (até PR 4)
- [ ] CSP no `vercel.json` (PR 5): `connect-src` só `*.supabase.co` + `script-src 'self'`
- [ ] Auditoria de `dangerouslySetInnerHTML` / `innerHTML` no projeto antes do PR 2
- [ ] Botão "Encerrar todas as sessões" (`signOut({ scope: 'global' })`)
- [ ] Rodapé com aviso de armazenamento e contato (LGPD básico)

### Não tratado nesta fase

- Cookie HttpOnly pra JWT (mantém localStorage do supabase-js).
- 2FA.
- Auditoria de acessos.

## UI

### Telas novas

- `LoginScreen` — abas Entrar/Criar conta, botão Google, link "esqueci a senha".
- `ResetPasswordScreen` — formulário de nova senha (chegada via email).
- `CampaignsScreen` — cards de mesas (nome, papel, contagem). Botão "Criar mesa". Campo "Entrar com código".
- `CampaignDetail` (DM) — nome, código com botões copiar/regenerar, lista de membros, lista de fichas dos jogadores (read-only).
- `AccountMenu` — avatar/iniciais no header com Minha conta / Sair / Apagar conta.

### Telas que mudam

- `App.jsx` — gating de auth.
- `CharacterList` — seletor de contexto (pessoais / mesa X / mesa Y). Criação de ficha pergunta destino.
- `CharacterSheet` — badge "Mesa: X". Banner "Modo leitura" pra DM.

### Estados

- Skeleton na lista durante load.
- Badge header: "Salvando…" / "Salvo" / "Sem conexão — tentando reconectar".

## Divisão em PRs

### PR 1 — Supabase + Auth (sem tocar fichas)

- Projeto Supabase + env vars no Vercel.
- `src/lib/supabase.js`, `AuthProvider`, `LoginScreen`, `ResetPasswordScreen`.
- Gating em `App.jsx`. Trigger SQL `auth.users → profiles`.
- localStorage continua sendo fonte de fichas.
- **Aceite:** criar conta, logout, login, reset de senha, login Google. App funciona como antes após login.

### PR 2 — Fichas no Postgres (sem mesas)

- Tabela `characters` + RLS owner-only + RPC `update_character_position`.
- Constraints de tamanho e quantidade.
- `storage.js` reescrito async. `useAutoSave`, `CharacterList`, `CharacterSheet` adaptados.
- Migração de testes unitários e e2e.
- localStorage some do fluxo de fichas.
- **Aceite:** CRUD de ficha, login em outro device mostra mesmas fichas, export/import JSON funciona.

### PR 3 — Schema de campanhas (sem UI)

- Tabelas `campaigns` + `campaign_members` + `join_attempts`.
- RPCs `create_campaign`, `join_campaign`, `rotate_invite_code`, `delete_my_account`.
- RLS completa. `characters.campaign_id` nullable + policies atualizadas.
- Script de teste de isolamento (2 usuários).
- **Aceite:** testes de isolamento passam; RPCs funcionam via SQL editor.

### PR 4 — UI de mesas

- `CampaignsScreen`, `CampaignDetail`, seletor de contexto no `CharacterList`, badge em `CharacterSheet`, criação de ficha com escolha de mesa.
- DM vê fichas de jogadores em read-only.
- `AccountMenu` com "Apagar conta".
- **Aceite:** criar mesa, gerar código, segundo user entra com código, mestre vê ficha do jogador em read-only.

### PR 5 — Polimento

- Loading skeletons, banner offline, badge auto-save, CSP no `vercel.json`, rodapé LGPD.
- Opcional: realtime no `CampaignDetail`.

## YAGNI explícito (fora de escopo)

- DM editar ficha de jogador.
- Convite por email/SMTP.
- Múltiplos DMs por mesa.
- Histórico/versionamento de fichas.
- Avatar upload (Supabase Storage).
- Notificações.
- 2FA.
- Migração automática de fichas do localStorage existente.
- Multi-idioma das mensagens do Supabase Auth (traduzir manualmente as comuns).
