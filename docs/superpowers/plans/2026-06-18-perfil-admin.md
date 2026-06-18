# Perfil de Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao dono do app um perfil de admin que vê todas as fichas e mesas e pode editá-las/apagá-las, reusando as telas existentes.

**Architecture:** Abordagem A do spec — flag `profiles.is_admin` + helper `is_admin()` no Postgres, políticas RLS `FOR ALL` aditivas pro admin e relaxamento das RPCs de save/posição. No cliente, `AuthProvider` expõe `isAdmin`, o editor de ficha libera edição pro admin, e uma tela `/admin` (com `lib/admin.js`) lista tudo. As listas pessoais (`loadCharacters`) passam a filtrar por dono pra não vazar dados de terceiros pro admin.

**Tech Stack:** React + Vite, react-router-dom, Supabase (Postgres + RLS + RPC), Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-18-perfil-admin-design.md`

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/0010_admin.sql` | Create | flag, helper `is_admin()`, políticas admin, relaxar `save_character`/`update_character_position` |
| `src/utils/storage.js` | Modify | escopar `'personal'`/`'mine'` por `owner_id` |
| `src/lib/admin.js` | Create | `adminListCharacters()`, `adminListCampaigns()` |
| `src/lib/campaigns.js` | Modify | `renameCampaign(id, name)` |
| `src/auth/AuthProvider.jsx` | Modify | expor `isAdmin` |
| `src/components/CharacterSheet/sheet-access.js` | Create | helper puro `isSheetReadOnly()` |
| `src/components/CharacterSheet/CharacterSheet.jsx` | Modify | usar `isAdmin` no `readOnly` |
| `src/components/Admin/AdminScreen.jsx` | Create | UI admin (abas Fichas/Mesas) |
| `src/components/CharacterList/CharacterList.jsx` | Modify | botão "Admin" (só admin) |
| `src/App.jsx` | Modify | rota `/admin` protegida |

---

## Task 1: Migration 0010 (banco)

> **Nota:** migration é aplicada manualmente no SQL Editor do Supabase (como todas as outras). Não há teste automatizado de SQL; a verificação é manual. O cliente degrada com segurança se a migration ainda não foi aplicada (sem admin).

**Files:**
- Create: `supabase/migrations/0010_admin.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Conteúdo completo de `supabase/migrations/0010_admin.sql`:

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0010_admin.sql
git commit -m "feat(admin): migration 0010 — flag is_admin, políticas e RPCs relaxadas"
```

- [ ] **Step 3 (MANUAL — dono): aplicar no Supabase**

No SQL Editor do Supabase, rodar o conteúdo de `0010_admin.sql` e depois:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'gvfaria.gv@gmail.com');
```

Verificar: `select id, is_admin from public.profiles where is_admin;` deve listar 1 linha.

---

## Task 2: Escopar listas pessoais por dono (`storage.js`)

Com o RLS aberto pro admin, `loadCharacters('personal'|'mine')` passaria a trazer fichas de todos. Filtrar por `owner_id = self` nesses escopos.

**Files:**
- Modify: `src/utils/storage.js` (função `loadCharacters`)
- Test: `src/test/storage.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final do `describe` principal em `src/test/storage.test.js` (o mock já expõe `store.uid` e `auth.getUser`):

```js
it("loadCharacters('mine') só traz fichas do dono atual (não vaza de outros)", async () => {
  store.rows = [
    { id: 'a', owner_id: store.uid, campaign_id: null, data: { id: 'a', info: {} }, version: 1 },
    { id: 'b', owner_id: 'outro-user', campaign_id: null, data: { id: 'b', info: {} }, version: 1 },
  ]
  const list = await loadCharacters('mine')
  expect(list.map(c => c.id)).toEqual(['a'])
})

it("loadCharacters('personal') filtra por dono E por campaign_id null", async () => {
  store.rows = [
    { id: 'a', owner_id: store.uid, campaign_id: null, data: { id: 'a', info: {} }, version: 1 },
    { id: 'c', owner_id: store.uid, campaign_id: 'camp-1', data: { id: 'c', info: {} }, version: 1 },
    { id: 'b', owner_id: 'outro-user', campaign_id: null, data: { id: 'b', info: {} }, version: 1 },
  ]
  const list = await loadCharacters('personal')
  expect(list.map(c => c.id)).toEqual(['a'])
})
```

> Nota: a ficha precisa passar no `safeParseCharacter`. Se o mock mínimo `{ id, info: {} }` for rejeitado, reutilize o helper de fixture já usado nos outros testes do arquivo (ex.: `makeChar(...)`/objeto válido existente) em vez de `{ info: {} }`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/storage.test.js`
Expected: FAIL — hoje `'mine'` traz `['a','b']` e `'personal'` traz `['a','b']`.

- [ ] **Step 3: Implementar o filtro por dono**

Em `src/utils/storage.js`, na função `loadCharacters`, trocar o trecho que monta a query:

```js
export async function loadCharacters(scope = 'mine') {
  let q = supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true })

  if (scope === 'personal' || scope === 'mine') {
    // Com o RLS aberto pro admin, sem este filtro a home traria fichas de
    // todos. 'personal'/'mine' são sempre do próprio usuário; a visão de mesa
    // do DM usa o escopo { campaignId }.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) q = q.eq('owner_id', user.id)
    if (scope === 'personal') q = q.is('campaign_id', null)
  } else if (scope && typeof scope === 'object' && scope.campaignId) {
    q = q.eq('campaign_id', scope.campaignId)
  }

  const { data, error } = await q
  // ...resto inalterado...
```

(Remover o antigo `if (scope === 'personal') ... else if (...campaignId)` que ficava logo após o `.order(...)`.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/storage.test.js`
Expected: PASS (todos, incluindo os 2 novos e os antigos).

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.js src/test/storage.test.js
git commit -m "fix(storage): escopar listas pessoais por dono (não vazar pro admin)"
```

---

## Task 3: `lib/admin.js` — listar tudo

**Files:**
- Create: `src/lib/admin.js`
- Test: `src/test/admin.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/admin.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ characters: [], campaigns: [] }))

const supabaseMock = vi.hoisted(() => ({
  from(table) {
    const rows = table === 'characters' ? store.characters : store.campaigns
    return {
      select() { return this },
      order() { return Promise.resolve({ data: rows, error: null }) },
    }
  },
}))

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import { adminListCharacters, adminListCampaigns } from '../lib/admin'

describe('lib/admin', () => {
  beforeEach(() => { store.characters = []; store.campaigns = [] })

  it('adminListCharacters mapeia dono, nome e nível', async () => {
    store.characters = [{
      id: 'a', owner_id: 'u1', campaign_id: null, short_id: 'SHORT12345',
      updated_at: '2026-06-18T00:00:00Z',
      data: { info: { name: 'Allyson', class: 'ladino', level: 5 } },
      profiles: { display_name: 'Gabriel' },
    }]
    const out = await adminListCharacters()
    expect(out[0]).toMatchObject({
      id: 'a', ownerName: 'Gabriel', name: 'Allyson', className: 'ladino', level: 5, shortId: 'SHORT12345',
    })
  })

  it('adminListCampaigns mapeia DM e contagem de membros', async () => {
    store.campaigns = [{
      id: 'c1', name: 'Mesa do Allyson', dm_id: 'u1', created_at: '2026-06-18T00:00:00Z',
      profiles: { display_name: 'Gabriel' },
      campaign_members: [{ count: 3 }],
    }]
    const out = await adminListCampaigns()
    expect(out[0]).toMatchObject({ id: 'c1', name: 'Mesa do Allyson', dmName: 'Gabriel', memberCount: 3 })
  })

  it('em erro retorna []', async () => {
    const orig = supabaseMock.from
    supabaseMock.from = () => ({ select() { return this }, order() { return Promise.resolve({ data: null, error: { message: 'x' } }) } })
    expect(await adminListCharacters()).toEqual([])
    supabaseMock.from = orig
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/admin.test.js`
Expected: FAIL — `lib/admin` não existe.

- [ ] **Step 3: Implementar `src/lib/admin.js`**

```js
import { supabase } from './supabase'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[admin] ${label}:`, payload)
  }
}

/** Todas as fichas (qualquer dono). Só retorna tudo pra admin — RLS garante. */
export async function adminListCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('id, owner_id, campaign_id, short_id, data, updated_at, profiles:owner_id(display_name)')
    .order('updated_at', { ascending: false })
  if (error) { logDev('adminListCharacters', error); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    shortId: row.short_id ?? null,
    ownerId: row.owner_id,
    ownerName: row.profiles?.display_name ?? '—',
    campaignId: row.campaign_id ?? null,
    name: row.data?.info?.name ?? 'Sem nome',
    className: row.data?.info?.class ?? '',
    level: row.data?.info?.level ?? 1,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : null,
  }))
}

/** Todas as mesas com DM e contagem de membros. */
export async function adminListCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, dm_id, created_at, profiles:dm_id(display_name), campaign_members(count)')
    .order('created_at', { ascending: true })
  if (error) { logDev('adminListCampaigns', error); return [] }
  return (data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    dmId: c.dm_id,
    dmName: c.profiles?.display_name ?? '—',
    memberCount: c.campaign_members?.[0]?.count ?? 0,
    createdAt: c.created_at ? Date.parse(c.created_at) : null,
  }))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/admin.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin.js src/test/admin.test.js
git commit -m "feat(admin): lib/admin lista todas as fichas e mesas"
```

---

## Task 4: `renameCampaign` (`campaigns.js`)

**Files:**
- Modify: `src/lib/campaigns.js`
- Test: `src/test/campaigns-rename.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/campaigns-rename.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

const calls = vi.hoisted(() => ({ update: null, eq: null }))
const supabaseMock = vi.hoisted(() => ({
  from() {
    return {
      update(patch) { calls.update = patch; return this },
      eq(col, val) { calls.eq = [col, val]; return Promise.resolve({ error: null }) },
    }
  },
}))
vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import { renameCampaign } from '../lib/campaigns'

describe('renameCampaign', () => {
  it('faz update do name (trim) na mesa certa', async () => {
    const r = await renameCampaign('c1', '  Nova Mesa  ')
    expect(r.ok).toBe(true)
    expect(calls.update).toEqual({ name: 'Nova Mesa' })
    expect(calls.eq).toEqual(['id', 'c1'])
  })

  it('rejeita nome vazio sem ir ao servidor', async () => {
    calls.update = null
    const r = await renameCampaign('c1', '   ')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('invalid-name')
    expect(calls.update).toBe(null)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/campaigns-rename.test.js`
Expected: FAIL — `renameCampaign` não existe.

- [ ] **Step 3: Implementar**

Em `src/lib/campaigns.js`, adicionar (perto de `deleteCampaign`):

```js
/**
 * Renomeia a mesa. RLS garante que só DM (ou admin via política
 * campaigns_admin_all) consegue. Valida nome 1..80 antes de ir ao servidor.
 */
export async function renameCampaign(campaignId, name) {
  const trimmed = (name ?? '').trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { ok: false, reason: 'invalid-name' }
  }
  const { error } = await supabase
    .from(T_CAMPAIGNS)
    .update({ name: trimmed })
    .eq('id', campaignId)
  if (error) { logDev('renameCampaign', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/campaigns-rename.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaigns.js src/test/campaigns-rename.test.js
git commit -m "feat(admin): renameCampaign em lib/campaigns"
```

---

## Task 5: `AuthProvider` expõe `isAdmin`

**Files:**
- Modify: `src/auth/AuthProvider.jsx`
- Test: `src/test/auth/AuthProvider.test.jsx`

- [ ] **Step 1: Estender o mock e escrever o teste que falha**

Em `src/test/auth/AuthProvider.test.jsx`, adicionar `from` ao `supabaseMock` (dentro do `vi.hoisted`, junto de `auth`/`rpc`). Usar `authState.isAdmin` controlável:

```js
// dentro do objeto authState:
//   isAdmin: false,
// dentro de supabaseMock (irmão de auth/rpc):
from: vi.fn((table) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: async () => table === 'profiles'
        ? ({ data: { is_admin: authState.isAdmin }, error: null })
        : ({ data: null, error: null }),
    }),
  }),
})),
```

Adicionar `isAdmin: false` ao objeto `authState`, e no `beforeEach` resetar `authState.isAdmin = false`.

Adicionar ao `Probe`: `<span data-testid="admin">{auth.isAdmin ? 'admin' : 'normal'}</span>`.

Novo teste:

```js
it('expõe isAdmin lido do profile quando sessão existe', async () => {
  authState.isAdmin = true
  authState.session = { user: { id: 'u1', email: 'a@b.com' } }
  render(<AuthProvider><Probe /></AuthProvider>)
  await waitFor(() => expect(screen.getByTestId('admin').textContent).toBe('admin'))
})

it('isAdmin é false sem sessão', async () => {
  render(<AuthProvider><Probe /></AuthProvider>)
  await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
  expect(screen.getByTestId('admin').textContent).toBe('normal')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/auth/AuthProvider.test.jsx`
Expected: FAIL — `auth.isAdmin` é `undefined`.

- [ ] **Step 3: Implementar no `AuthProvider.jsx`**

Adicionar estado e busca:

```js
const [isAdmin, setIsAdmin] = useState(false)

const refreshAdmin = useCallback(async (u) => {
  if (!u) { setIsAdmin(false); return }
  // Banco sem a migration 0010 → coluna is_admin ausente: trata como não-admin.
  const { data } = await supabase
    .from('profiles').select('is_admin').eq('id', u.id).maybeSingle()
  setIsAdmin(data?.is_admin === true)
}, [])
```

No `getSession().then(...)`: depois de `setUser(...)`, chamar `refreshAdmin(data.session?.user ?? null)`.
No `onAuthStateChange`:
- em `SIGNED_OUT`: `setIsAdmin(false)`.
- nos demais caminhos que setam user: chamar `refreshAdmin(session?.user ?? null)`.

Incluir `isAdmin` no objeto `value`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/auth/AuthProvider.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthProvider.jsx src/test/auth/AuthProvider.test.jsx
git commit -m "feat(admin): AuthProvider expõe isAdmin do profile"
```

---

## Task 6: Helper `isSheetReadOnly` + editor libera admin

**Files:**
- Create: `src/components/CharacterSheet/sheet-access.js`
- Test: `src/test/sheet-access.test.js`
- Modify: `src/components/CharacterSheet/CharacterSheet.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/sheet-access.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { isSheetReadOnly } from '../components/CharacterSheet/sheet-access'

describe('isSheetReadOnly', () => {
  it('dono edita a própria ficha', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u1', isAdmin: false })).toBe(false)
  })
  it('não-dono fica em readOnly', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2', isAdmin: false })).toBe(true)
  })
  it('admin edita ficha de qualquer dono', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2', isAdmin: true })).toBe(false)
  })
  it('sem ownerId/usuário não trava (ficha nova local)', () => {
    expect(isSheetReadOnly({ ownerId: null, currentUserId: 'u1', isAdmin: false })).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/sheet-access.test.js`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o helper**

Criar `src/components/CharacterSheet/sheet-access.js`:

```js
/**
 * Ficha é somente-leitura quando um usuário que NÃO é o dono a abre
 * (caso clássico: DM lendo ficha de jogador). Exceção: admin edita qualquer
 * ficha.
 */
export function isSheetReadOnly({ ownerId, currentUserId, isAdmin }) {
  if (isAdmin) return false
  return !!(ownerId && currentUserId && ownerId !== currentUserId)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/sheet-access.test.js`
Expected: PASS

- [ ] **Step 5: Usar o helper no `CharacterSheet.jsx`**

Trocar a linha 107 e o uso de `useAuth`:

```js
import { isSheetReadOnly } from './sheet-access'
// ...
const { user, isAdmin } = useAuth()
const currentUserId = user?.id ?? null
const readOnly = isSheetReadOnly({ ownerId: character?.ownerId, currentUserId, isAdmin })
```

- [ ] **Step 6: Rodar os testes da ficha pra garantir que nada quebrou**

Run: `npx vitest run src/test/sheet-access.test.js src/components/CharacterSheet`
Expected: PASS (se não houver testes nesse path, rodar só o do helper).

- [ ] **Step 7: Commit**

```bash
git add src/components/CharacterSheet/sheet-access.js src/components/CharacterSheet/CharacterSheet.jsx src/test/sheet-access.test.js
git commit -m "feat(admin): editor de ficha libera edição pro admin"
```

---

## Task 7: Tela `/admin` + rota protegida + botão na home

**Files:**
- Create: `src/components/Admin/AdminScreen.jsx`
- Test: `src/test/AdminScreen.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/CharacterList/CharacterList.jsx`

- [ ] **Step 1: Escrever o teste que falha (AdminScreen)**

Criar `src/test/AdminScreen.test.jsx`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const data = vi.hoisted(() => ({ chars: [], camps: [] }))
vi.mock('../lib/admin', () => ({
  adminListCharacters: async () => data.chars,
  adminListCampaigns: async () => data.camps,
}))
const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))

import { AdminScreen } from '../components/Admin/AdminScreen'

describe('AdminScreen', () => {
  beforeEach(() => {
    data.chars = [{ id: 'a', shortId: 'S1', name: 'Allyson', className: 'ladino', level: 5, ownerName: 'Gabriel', campaignId: null, updatedAt: Date.now() }]
    data.camps = [{ id: 'c1', name: 'Mesa do Allyson', dmName: 'Gabriel', memberCount: 3, createdAt: Date.now() }]
    nav.mockClear()
  })

  it('mostra fichas com nome e dono', async () => {
    render(<AdminScreen onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('Allyson')).toBeInTheDocument())
    expect(screen.getByText(/Gabriel/)).toBeInTheDocument()
  })

  it('troca pra aba Mesas e mostra a mesa', async () => {
    render(<AdminScreen onBack={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Mesas/i }))
    expect(screen.getByText('Mesa do Allyson')).toBeInTheDocument()
  })

  it('clicar em abrir ficha navega pra /c/:id', async () => {
    render(<AdminScreen onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('Allyson')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /abrir ficha allyson/i }))
    expect(nav).toHaveBeenCalledWith('/c/S1')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/AdminScreen.test.jsx`
Expected: FAIL — `AdminScreen` não existe.

- [ ] **Step 3: Implementar `src/components/Admin/AdminScreen.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminListCharacters, adminListCampaigns } from '../../lib/admin'
import { deleteCharacter } from '../../utils/storage'
import { deleteCampaign, renameCampaign } from '../../lib/campaigns'

const TABS = [['fichas', 'Fichas'], ['mesas', 'Mesas']]

export function AdminScreen({ onBack }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('fichas')
  const [chars, setChars] = useState([])
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [c, m] = await Promise.all([adminListCharacters(), adminListCampaigns()])
    setChars(c); setCamps(m); setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const onDeleteChar = useCallback(async (id, name) => {
    if (!window.confirm(`Apagar a ficha "${name}"? Isso não tem volta.`)) return
    await deleteCharacter(id); reload()
  }, [reload])

  const onDeleteCamp = useCallback(async (id, name) => {
    if (!window.confirm(`Apagar a mesa "${name}"? Isso não tem volta.`)) return
    await deleteCampaign(id); reload()
  }, [reload])

  const onRenameCamp = useCallback(async (id, current) => {
    const name = window.prompt('Novo nome da mesa:', current)
    if (!name || name.trim() === current) return
    await renameCampaign(id, name); reload()
  }, [reload])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display text-amber-400">Administração</h1>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-200">← Voltar</button>
      </div>

      <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-sm font-medium ${tab === id ? 'bg-blue-700/50 text-blue-200' : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'}`}
          >{label}</button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando…</p>}

      {!loading && tab === 'fichas' && (
        <div className="space-y-1.5">
          {chars.length === 0 && <p className="text-sm text-gray-500">Nenhuma ficha.</p>}
          {chars.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-700 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {c.className} nv {c.level} · dono: {c.ownerName}{c.campaignId ? ' · em mesa' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/c/${c.shortId ?? c.id}`)}
                  aria-label={`Abrir ficha ${c.name}`}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >Abrir</button>
                <button
                  onClick={() => onDeleteChar(c.id, c.name)}
                  aria-label={`Apagar ficha ${c.name}`}
                  className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200"
                >Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'mesas' && (
        <div className="space-y-1.5">
          {camps.length === 0 && <p className="text-sm text-gray-500">Nenhuma mesa.</p>}
          {camps.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 border border-gray-700 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate">{m.name}</p>
                <p className="text-xs text-gray-500 truncate">DM: {m.dmName} · {m.memberCount} membro(s)</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/campaigns/${m.id}`)}
                  aria-label={`Abrir mesa ${m.name}`}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >Abrir</button>
                <button
                  onClick={() => onRenameCamp(m.id, m.name)}
                  aria-label={`Renomear mesa ${m.name}`}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >Renomear</button>
                <button
                  onClick={() => onDeleteCamp(m.id, m.name)}
                  aria-label={`Apagar mesa ${m.name}`}
                  className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200"
                >Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/AdminScreen.test.jsx`
Expected: PASS

- [ ] **Step 5: Adicionar a rota protegida no `App.jsx`**

Adicionar o lazy import junto dos outros:

```js
const AdminScreen = lazyWithReload(() =>
  import('./components/Admin/AdminScreen').then(m => ({ default: m.AdminScreen }))
)
```

Adicionar o wrapper de rota (perto dos outros `*Route`):

```jsx
function AdminRoute() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <AdminScreen onBack={() => navigate('/')} />
    </RouteShell>
  )
}
```

Adicionar a `<Route>` dentro de `AuthedRoutes` (antes do catch-all `*`):

```jsx
<Route path="/admin" element={<AdminRoute />} />
```

- [ ] **Step 6: Botão "Admin" na home (`CharacterList.jsx`)**

No topo de `CharacterList.jsx`, importar `useAuth`:

```js
import { useAuth } from '../../auth/AuthProvider'
```

Dentro do componente, ler o flag:

```js
const { isAdmin } = useAuth()
```

Na barra de ações do cabeçalho (onde ficam `AccountMenu`/`BackupMenu`/botões), adicionar — só pra admin:

```jsx
{isAdmin && (
  <Button variant="ghost" onClick={() => navigate('/admin')}>Admin</Button>
)}
```

> Localizar a linha do cabeçalho que já renderiza `AccountMenu`/`BackupMenu` e inserir o botão ao lado, seguindo o mesmo padrão visual dos botões existentes. `navigate` já vem de `useNavigate()` (linha 48).

- [ ] **Step 7: Rodar a suíte das telas tocadas**

Run: `npx vitest run src/test/AdminScreen.test.jsx src/test/CharacterList`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/Admin/AdminScreen.jsx src/test/AdminScreen.test.jsx src/App.jsx src/components/CharacterList/CharacterList.jsx
git commit -m "feat(admin): tela /admin (fichas + mesas), rota protegida e botão na home"
```

---

## Task 8: Suíte completa + deploy

**Files:** nenhum (verificação)

- [ ] **Step 1: Rodar a suíte completa**

Run: `npx vitest run`
Expected: tudo verde (108+ arquivos). Se algum teste pré-existente quebrar por causa do escopo de `loadCharacters` ('mine'/'personal' agora owner-only), ajustar o teste/fixture conforme o novo comportamento documentado no spec.

- [ ] **Step 2: Push (dispara deploy)**

```bash
git push
```

> Sem mudança em `public/srd-data/` → não precisa bumpar o `cacheName` do SW.

- [ ] **Step 3 (dono): confirmar pós-deploy**

Logar com a conta admin, ver o botão "Admin" na home, abrir `/admin`, abrir uma ficha de outro usuário e confirmar que está editável; conferir que um usuário comum NÃO vê o botão e que `/admin` o redireciona.

---

## Self-Review (cobertura do spec)

- Flag `is_admin` + helper + políticas + relaxar RPCs → Task 1. ✅
- Não vazar listas pessoais pro admin → Task 2. ✅
- Listar todas fichas/mesas → Task 3. ✅
- Editar mesa (renomear) → Task 4; apagar mesa/remover membro → reuso (`deleteCampaign`/`removeMember`) via RLS. ✅
- `isAdmin` no AuthProvider → Task 5. ✅
- Editor libera admin → Task 6. ✅
- Tela `/admin` + rota protegida + botão na home → Task 7. ✅
- Segurança server-side (cliente só UI) → coberto por Task 1 (RLS/RPC) + Task 7 (guard). ✅
- Degradação sem migration (is_admin ausente → false) → Task 5 (`maybeSingle`, `data?.is_admin === true`). ✅

Fora de escopo (mantido fora): editar perfis de terceiros, criar ficha/mesa por terceiros, auditoria, múltiplos níveis de admin, hard-delete de auth.users.
