# Perfil de Admin — design

**Data:** 2026-06-18
**Status:** aprovado (abordagem A)

## Problema

O dono do app precisa de um perfil de administrador que possa **ver todas as
fichas e todas as mesas** criadas por qualquer usuário e **fazer alterações**
(editar e apagar) nelas.

Hoje tudo é trancado por RLS no Postgres:
- `characters` é owner-only (o DM só *lê* fichas de membros da sua mesa, e não edita).
- `campaigns`/`campaign_members` são do DM.
- Não existe nenhum conceito de admin no banco nem no cliente.

## Decisões (do brainstorming)

- **Quem é admin:** flag `profiles.is_admin` no banco, ligada manualmente via SQL.
  Só o dono por enquanto; promover outro é um `UPDATE`. Sem e-mail/UID chumbado no cliente.
- **Poder sobre fichas:** ver + editar + apagar.
- **Poder sobre mesas:** ver + editar (renomear, remover membro) + apagar.
- **Abordagem:** A — abrir o RLS para o admin e **reusar as telas existentes**
  (editor de ficha e detalhe de mesa), em vez de criar RPCs/telas paralelas.
- **Entrada:** botão "Admin" na lista de fichas (home), visível só pro admin.

## Princípio de segurança

A barreira real é **server-side** (RLS + RPC). O `isAdmin` no cliente serve
apenas para mostrar/esconder UI e habilitar edição local. Mesmo que alguém forje
o flag no cliente (via REST com a ANON_KEY), o banco bloqueia: as políticas e a
RPC checam `public.is_admin()`, que lê `profiles.is_admin` do `auth.uid()`.

## Arquitetura

### 1. Banco — migration `0010_admin.sql`

```sql
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;
```

Políticas **aditivas** (permissivas) — não afetam quem não é admin, porque
`is_admin()` retorna false para eles:

```sql
create policy "characters_admin_all" on public.characters
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "campaigns_admin_all" on public.campaigns
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "campaign_members_admin_all" on public.campaign_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

Relaxar a RPC de save (mantendo o version-lock) e a de posição para aceitar admin:

```sql
-- save_character: troca "owner_id = v_uid" por "(owner_id = v_uid or public.is_admin())"
--   no UPDATE e na checagem de existência. Mantém "version = p_expected_version".
-- update_character_position: idem no WHERE.
```

`NOTIFY pgrst, 'reload schema';` ao final.

**Passo manual (uma vez, no SQL Editor do Supabase):**

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'gvfaria.gv@gmail.com');
```

### 2. Cliente — camada de dados (`src/lib/admin.js`, novo)

- `adminListCharacters()` → todas as fichas com o dono:
  `from('characters').select('id, owner_id, campaign_id, short_id, data, updated_at, profiles:owner_id(display_name)')`.
  Funciona porque o RLS está aberto para admin; para não-admin retorna só o que o RLS já permitia.
- `adminListCampaigns()` → todas as mesas com DM e contagem de membros
  (`campaigns` + join `profiles:dm_id(display_name)` + `campaign_members(count)`).

Reuso para editar/apagar: as funções existentes (`saveCharacterVersioned`,
`deleteCharacter`, `deleteCampaign`, `renomear via update em campaigns`,
`removeMember`) já passam a funcionar para o admin via RLS/RPC relaxados.

### 3. Escopo das listas normais (`src/utils/storage.js`)

Com o RLS aberto, `loadCharacters('personal'|'mine')` (que não filtra por dono)
passaria a devolver fichas de todo mundo para o admin. Correção: esses escopos
passam a filtrar explicitamente `owner_id = <usuário atual>`.

- `'personal'` → `.is('campaign_id', null).eq('owner_id', self)`
- `'mine'` (default) → `.eq('owner_id', self)`
- `{ campaignId }` → inalterado (visão de mesa do DM continua via RLS).

Isso também é mais correto em geral (não só pro admin) e mantém a visão de mesa
do DM intacta, que usa o escopo `{campaignId}` / `loadCampaignCharacters`.

### 4. Auth (`src/auth/AuthProvider.jsx`)

Após login, buscar `is_admin` do perfil
(`from('profiles').select('is_admin').eq('id', uid).single()`) e expor `isAdmin`
no contexto (default `false`; re-buscado em SIGNED_IN, limpo em SIGNED_OUT).

### 5. Editor de ficha (`src/components/CharacterSheet/CharacterSheet.jsx`)

`readOnly` deixa de valer para admin:

```js
const { isAdmin } = useAuth()
const readOnly = !isAdmin && !!(character?.ownerId && currentUserId && character.ownerId !== currentUserId)
```

### 6. Tela `/admin` (`src/components/Admin/AdminScreen.jsx`, novo)

- Rota protegida em `App.jsx`: se `!isAdmin`, `<Navigate to="/" replace />`.
- Duas abas (controle segmentado, padrão visual do app):
  - **Fichas:** lista de todas as fichas — nome, classe/nível, **dono**
    (display_name), mesa, atualizada. Ações: **Abrir** (`/c/:id`, editável porque
    é admin) e **Apagar** (`deleteCharacter`).
  - **Mesas:** lista de todas as mesas — nome, **DM** (display_name), nº de
    membros, criada. Ações: **Abrir** (`/campaigns/:id`), **Renomear** (inline),
    **Apagar** (`deleteCampaign`).
- Entrada: botão "Admin" no topo da lista de fichas, renderizado só quando `isAdmin`.

## Componentes e limites

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `0010_admin.sql` | flag, helper, políticas, relaxar RPCs | migrations anteriores |
| `lib/admin.js` | listar tudo para o admin | supabase, RLS aberto |
| `storage.js` (ajuste) | escopar listas pessoais por dono | supabase.auth |
| `AuthProvider` | expor `isAdmin` | profiles |
| `CharacterSheet` (ajuste) | edição liberada p/ admin | `useAuth` |
| `AdminScreen` | UI de admin (fichas + mesas) | lib/admin, telas existentes |

## Tratamento de erros

- `adminList*` em erro → `[]` + log dev (padrão do `storage.js`/`campaigns.js`).
- Apagar/renomear seguem os retornos `{ ok, reason }` já usados.
- Não-admin que force `/admin` é redirecionado; se forçar via REST, o RLS bloqueia.
- Banco sem a migration 0010: `is_admin` ausente → `AuthProvider` trata como
  `false` (sem admin) e o app segue normal.

## Testes

- `storage.js`: `'personal'`/`'mine'` filtram por `owner_id` (novo); `{campaignId}` inalterado.
- `lib/admin.js`: `adminListCharacters/Campaigns` montam a query certa (supabase mockado).
- `AuthProvider`: expõe `isAdmin` lido do perfil; `false` quando ausente.
- `CharacterSheet`: `readOnly` é `false` para admin abrindo ficha de outro dono.
- `AdminScreen`: renderiza as duas abas/listas; redireciona não-admin.
- Migration é aplicada manualmente no Supabase (como todas) — coberta por doc, não por teste automatizado.

## Fora de escopo (YAGNI)

- Editar perfis de outros usuários (display_name).
- Criar fichas/mesas em nome de terceiros.
- Auditoria/log de ações de admin.
- Vários níveis de admin / tabela de admins separada.
- Hard-delete de `auth.users` pela tela admin (já existe `/api/delete-account`).
