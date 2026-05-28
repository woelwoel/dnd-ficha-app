# Supabase Migration — PR 4: UI de Mesas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir todas as telas e fluxos que consomem o schema de campanhas criado no PR 3: criar/entrar/listar mesas, ver detalhe da mesa como DM (com fichas dos jogadores em read-only), vincular ficha a mesa na criação, badge de mesa na ficha, AccountMenu com apagar conta.

**Architecture:** Camada nova `src/lib/campaigns.js` espelhando o estilo de `src/utils/storage.js` (async funções finas sobre `supabase.rpc`/`.from`). Telas novas em `src/components/Campaigns/`. Rotas novas no `App.jsx` (`/campaigns`, `/campaigns/:id`). CharacterList ganha selector "Pessoais / Mesa X / Mesa Y" que filtra a listagem; criar ficha estando filtrado já vincula à mesa. CharacterSheet detecta `owner_id ≠ auth.uid()` e entra em modo readonly (sem auto-save, banner explícito). AccountMenu substitui o botão "Sair" solto e centraliza Apagar Conta com modal de confirmação digitando "APAGAR".

**Tech Stack:** React 19, react-router-dom v7, Supabase (`@supabase/supabase-js` v2), Vitest com mock inline via `vi.hoisted`, Tailwind v4.

**Spec de referência:** `docs/superpowers/specs/2026-05-19-sair-do-localstorage-design.md`, seção "Camada de dados no cliente" (`campaigns.js`), "UI" (telas novas/alteradas), "Divisão em PRs → PR 4 — UI de mesas".

**Decisões UX confirmadas (2026-05-20):**
- Acesso às mesas: botão "Mesas" no header do `CharacterList` (ao lado de "Recrutar"), navega pra `/campaigns`.
- Vínculo ficha↔mesa: selector "Pessoais / Mesa X / Mesa Y" no `CharacterList` filtra a listagem; criar ficha estando filtrado em mesa já vincula. Estando em "Pessoais", wizard pergunta no início.
- Apagar conta: modal com input que precisa receber "APAGAR" antes de habilitar o botão final.

---

## File Structure

**Criar (novos arquivos):**
- `src/lib/campaigns.js` — fachada async sobre RPCs e tabelas (`listMyCampaigns`, `createCampaign`, `joinCampaign`, `listMembers`, `removeMember`, `leaveCampaign`, `rotateInviteCode`, `loadCampaignCharacters`, `deleteMyAccount`)
- `src/test/campaigns.test.js` — testes unitários com mock inline
- `src/components/Campaigns/index.js` — barrel
- `src/components/Campaigns/CampaignsScreen.jsx` — lista de mesas + formulários de criar/entrar
- `src/components/Campaigns/CampaignCard.jsx` — card individual de mesa na lista
- `src/components/Campaigns/CreateCampaignForm.jsx` — formulário inline "Criar mesa"
- `src/components/Campaigns/JoinCampaignForm.jsx` — formulário inline "Entrar com código"
- `src/components/Campaigns/CampaignDetail.jsx` — detalhe (info + código + membros + fichas)
- `src/components/Campaigns/InviteCodeBox.jsx` — caixinha com código + copy + rotate (DM only)
- `src/components/Campaigns/MembersList.jsx` — lista de membros + remover
- `src/components/Campaigns/CampaignCharactersList.jsx` — fichas dos jogadores (DM-only, read-only)
- `src/components/CharacterList/CampaignSelector.jsx` — dropdown "Pessoais / Mesa X / Mesa Y"
- `src/components/CharacterWizardV2/steps/DestinationModal.jsx` — modal "pessoal ou mesa?" antes de começar o wizard
- `src/components/ui/AccountMenu.jsx` — avatar + dropdown
- `src/components/ui/DeleteAccountModal.jsx` — modal "digite APAGAR"
- `src/hooks/useCampaignContext.js` — hook que devolve o scope ativo (lê localStorage)

**Modificar:**
- `src/utils/storage.js` — `loadCharacters({ scope })` aceita `'mine' | 'personal' | { campaignId }`; `upsertCharacter` aceita `campaignId` opcional
- `src/test/storage.test.js` — cobertura dos novos paths de scope
- `src/components/CharacterList/CharacterList.jsx` — selector de scope + botão "Mesas" + recarregar quando scope muda; passa `campaignId` adiante na criação
- `src/components/CharacterWizardV2/CharacterWizardV2.jsx` — recebe `campaignId` opcional via prop ou modal de destino; passa pro `upsertCharacter`
- `src/components/CharacterSheet/CharacterSheet.jsx` — detecta modo readonly (ownerId ≠ user) e propaga via contexto; bloqueia auto-save
- `src/components/CharacterSheet/SheetHeader.jsx` — badge "Mesa: X" + estado readonly visível
- `src/hooks/useAutoSave.js` — respeita flag readonly (no-op)
- `src/App.jsx` — rotas `/campaigns`, `/campaigns/:id`, `/new?campaignId=...`
- `src/domain/characterSchema.js` — `campaignId: z.string().uuid().nullable().optional()` no topo do objeto
- `src/auth/AuthProvider.jsx` — expor `deleteAccount()` (chama RPC + signOut)
- `CHANGELOG.md` — entrada PR 4

**Sem mudança:**
- Migrations (PR 3 cobriu todo o schema).
- `src/lib/supabase.js` (cliente já está pronto).
- Lógica de regras D&D (`src/domain/rules.js`, `src/hooks/useCharacterCalculations.js` etc — readonly só bloqueia escrita, não cálculo).

---

## Premissas

1. **`owner_id` continua sendo o critério de edição** — DM lê mas não escreve. Toda decisão de "posso editar?" usa `character.ownerId === auth.uid()`.
2. **`ownerId` precisa estar disponível no character** — `rowToCharacter` em `storage.js` passa a expor `ownerId: row.owner_id` além de `shortId` e `lastOpenedAt`.
3. **Scope ativo persiste em `localStorage`** (`CAMPAIGN_SCOPE_STORAGE_KEY`) — F5 mantém. Valores: `'personal'` (default) ou `{ campaignId: '<uuid>' }`. Reset pra `'personal'` se a mesa some.
4. **Listagem com scope** — `loadCharacters({ scope })` aplica `.is('campaign_id', null)` pra personal, `.eq('campaign_id', id)` pra mesa, e nada pra `'mine'` (todas as do user). RLS já garante que DM só vê suas próprias fichas + fichas de mesas onde é DM nessa última.
5. **DM vê fichas dos jogadores via `loadCampaignCharacters(campaignId)`** — separado de `loadCharacters`. RLS permite `select` via policy `characters_select_own_or_dm_of_campaign`.
6. **Modo readonly bloqueia auto-save** — `useAutoSave` recebe `enabled` (default `true`); CharacterSheet passa `enabled={isOwner}`. Não muda contrato de outros consumidores (default mantém comportamento).
7. **Apagar conta** — chama RPC `delete_my_account`, depois `supabase.auth.signOut()`, redireciona pra `/` (Gate vai pra LoginScreen). Linha em `auth.users` permanece (admin API fica de fora — botão da UI faz só o lado client).
8. **Sem realtime** — DM precisa F5 pra ver fichas atualizadas dos jogadores. Spec adia realtime opcional pro PR 5.
9. **Mensagens de erro genéricas** mantidas — `joinCampaign` retorna `{ ok: false, reason: 'not-found-or-already-member' | 'rate-limited' | 'unknown' }`; UI traduz pra mensagem amigável.
10. **Wizard "pessoal vs mesa"** vira modal leve (não step) — pergunta uma vez antes do wizard montar de fato. Se chega com `campaignId` na query string ou via state, pula o modal.

---

### Task 1: Data layer — `src/lib/campaigns.js` + testes

**Files:**
- Create: `src/lib/campaigns.js`
- Create: `src/test/campaigns.test.js`

- [ ] **Step 1: Escrever os testes primeiro (TDD)**

Arquivo `src/test/campaigns.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({
  uid: 'user-1',
  campaigns: [],     // {id, name, dm_id, invite_code}
  members: [],       // {campaign_id, user_id, role}
  characters: [],    // {id, owner_id, campaign_id, data, last_opened_at, short_id}
  rpcErr: null,      // injeta erro nos rpcs pra testar
}))

const supabaseMock = vi.hoisted(() => {
  function from(table) {
    const ctx = { filter: () => true, single: false }
    const data = () => store[table]
    const b = {
      select() { return b },
      order() { return b },
      eq(col, val) { const p = ctx.filter; ctx.filter = (r) => p(r) && r[col] === val; return b },
      is(col, val) { const p = ctx.filter; ctx.filter = (r) => p(r) && r[col] === val; return b },
      maybeSingle() { ctx.single = true; return b },
      single() { ctx.single = true; return b },
      then(resolve) {
        const rows = data().filter(ctx.filter)
        if (ctx.single) return resolve({ data: rows[0] ?? null, error: null })
        return resolve({ data: rows, error: null })
      },
      delete() {
        const dctx = { filter: ctx.filter }
        const db = {
          eq(c, v) { const p = dctx.filter; dctx.filter = (r) => p(r) && r[c] === v; return db },
          then(resolve) {
            const arr = data()
            for (let i = arr.length - 1; i >= 0; i--) if (dctx.filter(arr[i])) arr.splice(i, 1)
            return resolve({ data: null, error: null })
          },
        }
        return db
      },
    }
    return b
  }
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: store.uid } } })) },
    from,
    rpc: vi.fn(async (name, args) => {
      if (store.rpcErr) return { data: null, error: { message: store.rpcErr } }
      if (name === 'create_campaign') {
        const id = `camp-${store.campaigns.length + 1}`
        const code = 'ABCDEFGHJK'
        store.campaigns.push({ id, name: args.p_name, dm_id: store.uid, invite_code: code })
        store.members.push({ campaign_id: id, user_id: store.uid, role: 'dm' })
        return { data: id, error: null }
      }
      if (name === 'join_campaign') {
        const c = store.campaigns.find(x => x.invite_code === args.p_code)
        if (!c) return { data: null, error: { message: 'not_found_or_already_member' } }
        if (store.members.some(m => m.campaign_id === c.id && m.user_id === store.uid)) {
          return { data: null, error: { message: 'not_found_or_already_member' } }
        }
        store.members.push({ campaign_id: c.id, user_id: store.uid, role: 'player' })
        return { data: c.id, error: null }
      }
      if (name === 'rotate_invite_code') {
        const c = store.campaigns.find(x => x.id === args.p_campaign_id)
        if (!c) return { data: null, error: { message: 'not_found' } }
        c.invite_code = 'ZZZZZZZZZZ'
        return { data: c.invite_code, error: null }
      }
      if (name === 'delete_my_account') {
        store.campaigns = store.campaigns.filter(c => c.dm_id !== store.uid)
        store.members  = store.members.filter(m => m.user_id !== store.uid)
        return { data: null, error: null }
      }
      return { data: null, error: { message: 'unknown rpc: ' + name } }
    }),
  }
})

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import {
  listMyCampaigns, createCampaign, joinCampaign,
  rotateInviteCode, leaveCampaign, removeMember,
  listMembers, loadCampaignCharacters, deleteMyAccount,
} from '../lib/campaigns'

describe('campaigns (lib)', () => {
  beforeEach(() => {
    store.uid = 'user-1'
    store.campaigns = []
    store.members = []
    store.characters = []
    store.rpcErr = null
  })

  it('createCampaign retorna ok+id e me insere como dm', async () => {
    const r = await createCampaign('Mesa do Frodo')
    expect(r.ok).toBe(true)
    expect(typeof r.id).toBe('string')
    expect(store.members).toEqual([{ campaign_id: r.id, user_id: 'user-1', role: 'dm' }])
  })

  it('listMyCampaigns devolve mesas com role do usuário', async () => {
    const { id } = await createCampaign('M1')
    const list = await listMyCampaigns()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id, name: 'M1', role: 'dm' })
  })

  it('joinCampaign com código bom retorna ok+id; código ruim retorna reason', async () => {
    const { id } = await createCampaign('M1')
    const code = store.campaigns[0].invite_code
    store.uid = 'user-2'
    expect(await joinCampaign(code)).toEqual({ ok: true, id })
    expect(await joinCampaign('NOPE')).toEqual({ ok: false, reason: 'not-found-or-already-member' })
  })

  it('rotateInviteCode devolve novo código', async () => {
    const { id } = await createCampaign('M1')
    const oldCode = store.campaigns[0].invite_code
    const r = await rotateInviteCode(id)
    expect(r.ok).toBe(true)
    expect(r.code).not.toBe(oldCode)
  })

  it('deleteMyAccount apaga campanhas onde sou DM', async () => {
    await createCampaign('M1')
    const r = await deleteMyAccount()
    expect(r.ok).toBe(true)
    expect(store.campaigns).toEqual([])
  })

  it('listMembers devolve membros da mesa', async () => {
    const { id } = await createCampaign('M1')
    store.members.push({ campaign_id: id, user_id: 'user-2', role: 'player' })
    const list = await listMembers(id)
    expect(list).toHaveLength(2)
  })

  it('leaveCampaign remove a si próprio', async () => {
    const { id } = await createCampaign('M1')
    store.uid = 'user-2'
    await joinCampaign(store.campaigns[0].invite_code)
    const r = await leaveCampaign(id)
    expect(r.ok).toBe(true)
    expect(store.members.some(m => m.user_id === 'user-2')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar testes — esperado FAIL (módulo não existe)**

```bash
npm run test -- src/test/campaigns.test.js
```

Esperado: erro de import de `../lib/campaigns`.

- [ ] **Step 3: Criar `src/lib/campaigns.js`**

```js
import { supabase } from './supabase'

const T_CAMPAIGNS = 'campaigns'
const T_MEMBERS   = 'campaign_members'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[campaigns] ${label}:`, payload)
  }
}

/** Lista mesas em que o usuário corrente é membro (com role). */
export async function listMyCampaigns() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // 1) descobre as memberships (RLS já filtra)
  const { data: members, error: e1 } = await supabase
    .from(T_MEMBERS)
    .select('campaign_id, role')
    .eq('user_id', user.id)
  if (e1) { logDev('listMyCampaigns members', e1); return [] }
  const ids = members.map(m => m.campaign_id)
  if (ids.length === 0) return []
  // 2) busca as campaigns
  const { data: campaigns, error: e2 } = await supabase
    .from(T_CAMPAIGNS)
    .select('id, name, dm_id, invite_code, created_at')
    .order('created_at', { ascending: true })
  if (e2) { logDev('listMyCampaigns campaigns', e2); return [] }
  // 3) merge com role
  const roleById = Object.fromEntries(members.map(m => [m.campaign_id, m.role]))
  return campaigns
    .filter(c => ids.includes(c.id))
    .map(c => ({ ...c, role: roleById[c.id] }))
}

export async function createCampaign(name) {
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name })
  if (error) { logDev('createCampaign', error); return { ok: false, reason: 'unknown' } }
  return { ok: true, id: data }
}

export async function joinCampaign(code) {
  const { data, error } = await supabase.rpc('join_campaign', { p_code: code })
  if (error) {
    if (/rate_limited/.test(error.message)) return { ok: false, reason: 'rate-limited' }
    if (/not_found_or_already_member/.test(error.message)) return { ok: false, reason: 'not-found-or-already-member' }
    logDev('joinCampaign', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true, id: data }
}

export async function rotateInviteCode(campaignId) {
  const { data, error } = await supabase.rpc('rotate_invite_code', { p_campaign_id: campaignId })
  if (error) { logDev('rotateInviteCode', error); return { ok: false, reason: 'unknown' } }
  return { ok: true, code: data }
}

export async function listMembers(campaignId) {
  const { data, error } = await supabase
    .from(T_MEMBERS)
    .select('user_id, role, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
  if (error) { logDev('listMembers', error); return [] }
  return data ?? []
}

export async function removeMember(campaignId, userId) {
  const { error } = await supabase
    .from(T_MEMBERS)
    .delete()
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
  if (error) { logDev('removeMember', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}

export async function leaveCampaign(campaignId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not-authenticated' }
  return removeMember(campaignId, user.id)
}

/** Carrega fichas DA MESA (apenas o DM vê via policy). */
export async function loadCampaignCharacters(campaignId) {
  const { data, error } = await supabase
    .from('characters')
    .select('id, owner_id, data, last_opened_at, short_id, campaign_id')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
  if (error) { logDev('loadCampaignCharacters', error); return [] }
  return data ?? []
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) { logDev('deleteMyAccount', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}
```

- [ ] **Step 4: Rodar testes — esperado PASS**

```bash
npm run test -- src/test/campaigns.test.js
```

Esperado: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaigns.js src/test/campaigns.test.js
git commit -m "feat(campaigns): data layer src/lib/campaigns.js + testes"
git push
```

---

### Task 2: Estender `storage.js` — scope filter + campaign_id no upsert + ownerId no rowToCharacter

**Files:**
- Modify: `src/utils/storage.js`
- Modify: `src/test/storage.test.js`
- Modify: `src/domain/characterSchema.js`

- [ ] **Step 1: Adicionar `campaignId` no schema**

Editar `src/domain/characterSchema.js`. Procurar o `z.object({` raiz e adicionar campo (junto com `id`):

```js
  campaignId: z.string().uuid().nullable().optional(),
```

- [ ] **Step 2: Atualizar `rowToCharacter` e exportar `ownerId`/`campaignId`**

Em `src/utils/storage.js`, substituir `rowToCharacter`:

```js
function rowToCharacter(row) {
  if (!row?.data) return null
  return {
    ...row.data,
    shortId: row.short_id ?? null,
    ownerId: row.owner_id ?? row.data.ownerId ?? null,
    campaignId: row.campaign_id ?? row.data.campaignId ?? null,
    lastOpenedAt: row.last_opened_at ? Date.parse(row.last_opened_at) : (row.data.lastOpenedAt ?? null),
  }
}
```

- [ ] **Step 3: `loadCharacters` aceita scope**

Substituir a função:

```js
/**
 * scope:
 *   - 'mine'                       → todas as fichas que o user pode ver (default)
 *   - 'personal'                   → só fichas com campaign_id IS NULL
 *   - { campaignId: '<uuid>' }     → só dessa mesa
 */
export async function loadCharacters(scope = 'mine') {
  let q = supabase
    .from(TABLE)
    .select('id, data, last_opened_at, created_at, short_id, owner_id, campaign_id')
    .order('created_at', { ascending: true })

  if (scope === 'personal') q = q.is('campaign_id', null)
  else if (scope && typeof scope === 'object' && scope.campaignId) q = q.eq('campaign_id', scope.campaignId)

  const { data, error } = await q
  if (error) { logDev('loadCharacters falhou', error); return [] }
  const valid = []
  for (const row of data ?? []) {
    const ch = rowToCharacter(row)
    const parsed = safeParseCharacter(ch)
    if (parsed.success) valid.push(parsed.data)
    else logDev('ficha ignorada (schema)', parsed.error.issues.slice(0, 3))
  }
  return valid
}
```

- [ ] **Step 4: `upsertCharacter` aceita `campaignId` opcional**

Substituir:

```js
export async function upsertCharacter(character, opts = {}) {
  const v = validateForSave(character)
  if (!v.ok) {
    logDev('upsert: ficha inválida', v.errors.slice(0, 3))
    return { ok: false, reason: 'invalid', errors: v.errors }
  }
  const row = {
    id: v.data.id,
    data: v.data,
    last_opened_at: v.data.lastOpenedAt ? new Date(v.data.lastOpenedAt).toISOString() : null,
  }
  // campaignId pode vir como override em opts (criação no contexto de mesa)
  // ou já no objeto character (replays). null = explicitamente pessoal.
  if (opts.campaignId !== undefined) row.campaign_id = opts.campaignId
  else if (character.campaignId !== undefined) row.campaign_id = character.campaignId

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row)
    .select('short_id, campaign_id')
    .maybeSingle()
  if (error) {
    logDev('upsert falhou', error)
    return { ok: false, reason: error.message?.includes('character_limit_reached') ? 'limit' : 'unknown' }
  }
  return { ok: true, shortId: data?.short_id ?? null, campaignId: data?.campaign_id ?? null }
}
```

- [ ] **Step 5: Adicionar testes ao `storage.test.js`**

No final do `describe('storage (Supabase backend)', () => {`, antes do `})` final, adicionar:

```js
  it('loadCharacters({ campaignId }) filtra por mesa', async () => {
    await upsertCharacter({ ...makeChar('a'), campaignId: 'camp-1' })
    await upsertCharacter({ ...makeChar('b'), campaignId: 'camp-2' })
    await upsertCharacter(makeChar('c')) // pessoal
    const m1 = await loadCharacters({ campaignId: 'camp-1' })
    expect(m1.map(x => x.id)).toEqual(['a'])
    const personal = await loadCharacters('personal')
    expect(personal.map(x => x.id)).toEqual(['c'])
  })

  it('upsertCharacter({campaignId}) vincula à mesa via opts', async () => {
    const r = await upsertCharacter(makeChar('a'), { campaignId: 'camp-1' })
    expect(r.ok).toBe(true)
    expect(r.campaignId).toBe('camp-1')
  })
```

Atualizar o mock de supabase em `storage.test.js` (no `vi.hoisted` que cria o `supabaseMock`) pra que `.is(col, val)` funcione e o builder de upsert leia `campaign_id` da row. No bloco que define o builder, adicionar dentro de `const builder = {`:

```js
      is(col, val) { const prev = ctx.filter; ctx.filter = (r) => prev(r) && r[col] === val; return builder },
```

E no `upsert(record)`, no `stamped`, garantir que `campaign_id` é copiado:

```js
          const stamped = {
            owner_id: store.uid,
            campaign_id: r.campaign_id ?? null,
            created_at: new Date().toISOString(),
            ...
          }
```

- [ ] **Step 6: Rodar testes**

```bash
npm run test
```

Esperado: novos testes passam; existentes continuam verdes.

- [ ] **Step 7: Commit**

```bash
git add src/utils/storage.js src/test/storage.test.js src/domain/characterSchema.js
git commit -m "feat(storage): scope filter + campaignId em upsert; expõe ownerId/campaignId"
git push
```

---

### Task 3: `CampaignsScreen` + sub-componentes

**Files:**
- Create: `src/components/Campaigns/CampaignsScreen.jsx`
- Create: `src/components/Campaigns/CampaignCard.jsx`
- Create: `src/components/Campaigns/CreateCampaignForm.jsx`
- Create: `src/components/Campaigns/JoinCampaignForm.jsx`
- Create: `src/components/Campaigns/index.js`

- [ ] **Step 1: Criar `CampaignCard.jsx`**

```jsx
import { Button } from '../ui/Button'

export function CampaignCard({ campaign, onOpen }) {
  return (
    <button
      onClick={() => onOpen(campaign.id)}
      className="w-full text-left p-4 rounded border bg-gray-900 hover:bg-gray-800 transition"
      style={{ borderColor: 'var(--color-shell-border)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-amber-300 font-semibold">{campaign.name}</h3>
        <span className="text-xs uppercase tracking-wider text-gray-400">
          {campaign.role === 'dm' ? 'Mestre' : 'Jogador'}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
      </p>
    </button>
  )
}
```

- [ ] **Step 2: Criar `CreateCampaignForm.jsx`**

```jsx
import { useState } from 'react'
import { createCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'

export function CreateCampaignForm({ onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true); setErr(null)
    const r = await createCampaign(name.trim())
    setBusy(false)
    if (!r.ok) { setErr('Falha ao criar a mesa. Tente novamente.'); return }
    setName('')
    onCreated?.(r.id)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 p-4 rounded border" style={{ borderColor: 'var(--color-shell-border)' }}>
      <label className="text-sm text-gray-300">Criar mesa nova</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da mesa"
        maxLength={80}
        className="px-3 py-2 bg-gray-950 border border-gray-700 rounded text-gray-100"
      />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <Button type="submit" variant="gold" size="sm" disabled={busy || !name.trim()}>
        {busy ? 'Criando…' : 'Criar mesa'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Criar `JoinCampaignForm.jsx`**

```jsx
import { useState } from 'react'
import { joinCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'

export function JoinCampaignForm({ onJoined }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true); setErr(null)
    const r = await joinCampaign(code.trim())
    setBusy(false)
    if (!r.ok) {
      setErr(
        r.reason === 'rate-limited'
          ? 'Muitas tentativas. Aguarde um minuto.'
          : 'Código inválido ou você já é membro.'
      )
      return
    }
    setCode('')
    onJoined?.(r.id)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 p-4 rounded border" style={{ borderColor: 'var(--color-shell-border)' }}>
      <label className="text-sm text-gray-300">Entrar com código</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Ex: AbCdEfGhJk"
        maxLength={10}
        className="px-3 py-2 bg-gray-950 border border-gray-700 rounded text-gray-100 font-mono tracking-wider"
      />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <Button type="submit" variant="gold" size="sm" disabled={busy || code.trim().length !== 10}>
        {busy ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
```

(Atenção: invite_code é case-sensitive no Postgres — não normaliza pra uppercase. Placeholder mostra mix maiúsculas/minúsculas pra dar a dica.)

- [ ] **Step 4: Criar `CampaignsScreen.jsx`**

```jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyCampaigns } from '../../lib/campaigns'
import { CampaignCard } from './CampaignCard'
import { CreateCampaignForm } from './CreateCampaignForm'
import { JoinCampaignForm } from './JoinCampaignForm'
import { Button } from '../ui/Button'

export function CampaignsScreen() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const reload = useCallback(async () => {
    setLoading(true)
    setCampaigns(await listMyCampaigns())
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--color-bg-canvas)' }}>
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl text-amber-400" style={{ fontFamily: 'IM Fell English SC, serif' }}>
          Mesas
        </h1>
        <Button variant="ghost-dark" size="sm" onClick={() => navigate('/')}>← Personagens</Button>
      </header>

      <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2 mb-8">
        <CreateCampaignForm onCreated={(id) => navigate(`/campaigns/${id}`)} />
        <JoinCampaignForm  onJoined={(id) => navigate(`/campaigns/${id}`)} />
      </div>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Suas mesas</h2>
        {loading ? (
          <p className="text-amber-400 text-sm">Carregando…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500 text-sm">Você ainda não tem mesas. Crie uma ou entre com código.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onOpen={(id) => navigate(`/campaigns/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Criar `src/components/Campaigns/index.js`**

```js
export { CampaignsScreen } from './CampaignsScreen'
export { CampaignDetail }  from './CampaignDetail'
```

(O `CampaignDetail` é criado na Task 5 — o import vai ficar quebrado até lá. Tudo bem, o barrel é só pra Task 4 importar.)

- [ ] **Step 6: Commit**

```bash
git add src/components/Campaigns
git commit -m "feat(campaigns): CampaignsScreen + cards + forms criar/entrar"
git push
```

(Build vai quebrar até Task 5 por causa do barrel. Aceitável dentro do PR; o commit final passa no build.)

---

### Task 4: Rotas `/campaigns` + botão "Mesas" no `CharacterList`

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CharacterList/CharacterList.jsx`

- [ ] **Step 1: Adicionar rota em `App.jsx`**

No topo do `App.jsx`, adicionar import:

```jsx
const CampaignsScreen = lazy(() =>
  import('./components/Campaigns').then(m => ({ default: m.CampaignsScreen }))
)
const CampaignDetail = lazy(() =>
  import('./components/Campaigns').then(m => ({ default: m.CampaignDetail }))
)
```

Dentro do `<Routes>` no `AuthedRoutes`, adicionar antes do fallback `*`:

```jsx
          <Route path="/campaigns"        element={<Suspense fallback={<Loader />}><CampaignsScreen /></Suspense>} />
          <Route path="/campaigns/:id"    element={<Suspense fallback={<Loader />}><CampaignDetailRoute /></Suspense>} />
```

E adicionar wrapper `CampaignDetailRoute` (ao lado dos outros wrappers tipo `ListRoute`):

```jsx
function CampaignDetailRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  return <CampaignDetail campaignId={id} onBack={() => navigate('/campaigns')} />
}
```

- [ ] **Step 2: Adicionar botão "Mesas" no header do `CharacterList`**

Em `src/components/CharacterList/CharacterList.jsx`, importar `useNavigate`:

```jsx
import { useNavigate } from 'react-router-dom'
```

Dentro do componente, junto com os outros hooks:

```jsx
  const navigate = useNavigate()
```

No bloco direito do header (junto com "Sair", `BackupMenu`, "Recrutar"), antes de `BackupMenu`:

```jsx
          <Button variant="ghost-dark" size="sm" onClick={() => navigate('/campaigns')}>
            ⚔ Mesas
          </Button>
```

- [ ] **Step 3: Build + smoke local**

```bash
npm run build
```

Esperado: passa sem erro. Iniciar `npm run dev`, logar, clicar "Mesas" — deve abrir `/campaigns`. Criar uma mesa pelo formulário — esperado: redirect pra `/campaigns/<id>` (vai dar erro porque `CampaignDetail` ainda não foi criado).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/CharacterList/CharacterList.jsx
git commit -m "feat(routing): rota /campaigns + botão Mesas no header"
git push
```

---

### Task 5: `CampaignDetail` — info, código (rotate/copy), membros

**Files:**
- Create: `src/components/Campaigns/CampaignDetail.jsx`
- Create: `src/components/Campaigns/InviteCodeBox.jsx`
- Create: `src/components/Campaigns/MembersList.jsx`

- [ ] **Step 1: Criar `InviteCodeBox.jsx`**

```jsx
import { useState } from 'react'
import { rotateInviteCode } from '../../lib/campaigns'
import { Button } from '../ui/Button'

export function InviteCodeBox({ campaignId, code, isDM, onRotated }) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onCopy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {/* ignore */}
  }

  async function onRotate() {
    if (!confirm('Gerar código novo? O atual deixa de funcionar.')) return
    setBusy(true)
    const r = await rotateInviteCode(campaignId)
    setBusy(false)
    if (r.ok) onRotated?.(r.code)
  }

  return (
    <div className="p-4 rounded border bg-gray-900" style={{ borderColor: 'var(--color-shell-border)' }}>
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Código de convite</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-2xl text-amber-300 tracking-wider">{code}</span>
        <Button variant="ghost-dark" size="sm" onClick={onCopy}>{copied ? '✓ Copiado' : 'Copiar'}</Button>
        {isDM && (
          <Button variant="ghost-dark" size="sm" onClick={onRotate} disabled={busy}>
            {busy ? '...' : '↻ Rotacionar'}
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `MembersList.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { listMembers, removeMember, leaveCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'

export function MembersList({ campaignId, currentUserId, isDM, onChanged }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    setMembers(await listMembers(campaignId))
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [campaignId])

  async function onRemove(userId) {
    if (!confirm('Remover este jogador da mesa?')) return
    const r = await removeMember(campaignId, userId)
    if (r.ok) { await reload(); onChanged?.() }
  }

  async function onLeave() {
    if (!confirm('Sair desta mesa?')) return
    const r = await leaveCampaign(campaignId)
    if (r.ok) onChanged?.({ left: true })
  }

  if (loading) return <p className="text-amber-400 text-sm">Carregando membros…</p>

  return (
    <div className="rounded border bg-gray-900" style={{ borderColor: 'var(--color-shell-border)' }}>
      <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b" style={{ borderColor: 'var(--color-shell-border)' }}>
        Membros ({members.length})
      </div>
      <ul className="divide-y" style={{ borderColor: 'var(--color-shell-border)' }}>
        {members.map(m => {
          const isSelf = m.user_id === currentUserId
          return (
            <li key={m.user_id} className="flex items-center justify-between px-4 py-2 text-sm">
              <div>
                <span className="text-gray-200">{isSelf ? 'Você' : m.user_id.slice(0, 8)}…</span>
                <span className="ml-2 text-xs uppercase text-gray-500">{m.role === 'dm' ? 'Mestre' : 'Jogador'}</span>
              </div>
              {isDM && !isSelf && (
                <Button variant="ghost-dark" size="sm" onClick={() => onRemove(m.user_id)}>Remover</Button>
              )}
              {!isDM && isSelf && (
                <Button variant="ghost-dark" size="sm" onClick={onLeave}>Sair</Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Criar `CampaignDetail.jsx`**

```jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { InviteCodeBox } from './InviteCodeBox'
import { MembersList } from './MembersList'
import { CampaignCharactersList } from './CampaignCharactersList'
import { Button } from '../ui/Button'

export function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  const reload = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, dm_id, invite_code')
      .eq('id', campaignId)
      .maybeSingle()
    setCampaign(data)
    setLoading(false)
  }, [campaignId])

  useEffect(() => { reload() }, [reload])

  if (loading) return <div className="p-6 text-amber-400 text-sm">Carregando mesa…</div>
  if (!campaign) return (
    <div className="p-6 text-amber-400 text-sm">
      <p>Mesa não encontrada (ou sem permissão).</p>
      <Button variant="ghost-dark" size="sm" onClick={onBack}>Voltar</Button>
    </div>
  )

  const isDM = campaign.dm_id === userId

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--color-bg-canvas)' }}>
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <div>
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-amber-300">← Mesas</button>
          <h1 className="text-2xl text-amber-400 mt-1" style={{ fontFamily: 'IM Fell English SC, serif' }}>
            {campaign.name}
          </h1>
          <p className="text-xs text-gray-500">{isDM ? 'Você é o Mestre' : 'Você é Jogador'}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto grid gap-4">
        <InviteCodeBox
          campaignId={campaign.id}
          code={campaign.invite_code}
          isDM={isDM}
          onRotated={(code) => setCampaign(c => ({ ...c, invite_code: code }))}
        />
        <MembersList
          campaignId={campaign.id}
          currentUserId={userId}
          isDM={isDM}
          onChanged={(ev) => ev?.left ? navigate('/campaigns') : null}
        />
        {isDM && (
          <CampaignCharactersList
            campaignId={campaign.id}
            onOpen={(idOrShort) => navigate(`/c/${idOrShort}`)}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit (CampaignCharactersList stub temporário)**

Criar stub mínimo pra não quebrar import:

`src/components/Campaigns/CampaignCharactersList.jsx`:

```jsx
export function CampaignCharactersList({ campaignId, onOpen }) {
  return <div className="p-4 text-gray-500 text-sm">Fichas da mesa: (em construção — Task 6)</div>
}
```

```bash
git add src/components/Campaigns
git commit -m "feat(campaigns): CampaignDetail + InviteCodeBox + MembersList"
git push
```

---

### Task 6: `CampaignCharactersList` — fichas dos jogadores (DM read-only)

**Files:**
- Modify: `src/components/Campaigns/CampaignCharactersList.jsx`

- [ ] **Step 1: Implementar componente real**

Substituir o stub por:

```jsx
import { useEffect, useState } from 'react'
import { loadCampaignCharacters } from '../../lib/campaigns'

export function CampaignCharactersList({ campaignId, onOpen }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadCampaignCharacters(campaignId).then(list => {
      if (!alive) return
      setRows(list)
      setLoading(false)
    })
    return () => { alive = false }
  }, [campaignId])

  if (loading) return <div className="p-4 text-amber-400 text-sm">Carregando fichas…</div>

  return (
    <div className="rounded border bg-gray-900" style={{ borderColor: 'var(--color-shell-border)' }}>
      <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b" style={{ borderColor: 'var(--color-shell-border)' }}>
        Fichas dos jogadores ({rows.length}) — modo leitura
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-gray-500 text-sm">Nenhum jogador criou ficha vinculada à mesa ainda.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--color-shell-border)' }}>
          {rows.map(r => (
            <li key={r.id}>
              <button
                onClick={() => onOpen(r.short_id ?? r.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-800 transition flex items-center justify-between"
              >
                <span className="text-amber-300">{r.data?.info?.name ?? '(sem nome)'}</span>
                <span className="text-xs text-gray-500">
                  {r.data?.info?.race} {r.data?.info?.class} — Nv {r.data?.info?.level}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Campaigns/CampaignCharactersList.jsx
git commit -m "feat(campaigns): CampaignCharactersList (DM lê fichas dos jogadores)"
git push
```

---

### Task 7: Modo readonly na `CharacterSheet`

**Files:**
- Modify: `src/components/CharacterSheet/CharacterSheet.jsx`
- Modify: `src/components/CharacterSheet/SheetHeader.jsx`
- Modify: `src/hooks/useAutoSave.js`
- Modify: `src/components/CharacterSheet/CharacterContext.jsx` (se existir; senão, propagar via prop)

- [ ] **Step 1: Adicionar parâmetro `enabled` ao `useAutoSave`**

Em `src/hooks/useAutoSave.js`, mudar a assinatura:

```js
export function useAutoSave(character, { enabled = true } = {}) {
  // ... lógica existente
  // Envolver o efeito de debounce + upsert em: `if (!enabled) return`
}
```

(O subagente que executar esta task deve LER o arquivo inteiro primeiro pra preservar o comportamento; só inseri `enabled` como toggle no início do effect.)

- [ ] **Step 2: Detectar owner no `CharacterSheet` e propagar `readOnly`**

Em `SheetBody` (dentro de `src/components/CharacterSheet/CharacterSheet.jsx`), logo após `useCharacter`:

```jsx
  const [currentUserId, setCurrentUserId] = useState(null)
  useEffect(() => {
    let alive = true
    import('../../lib/supabase').then(({ supabase }) =>
      supabase.auth.getUser().then(({ data }) => { if (alive) setCurrentUserId(data?.user?.id ?? null) })
    )
    return () => { alive = false }
  }, [])

  const readOnly = !!(character?.ownerId && currentUserId && character.ownerId !== currentUserId)
```

Passar `enabled: !readOnly` pro `useAutoSave`:

```jsx
  const { saving, saved, error: saveError } = useAutoSave(character, { enabled: !readOnly })
```

Adicionar `readOnly` ao `contextValue` (no `useMemo`):

```jsx
    readOnly,
```

Passar `readOnly` e `campaignId` pro `SheetHeader`:

```jsx
  <SheetHeader
    /* ...props existentes... */
    readOnly={readOnly}
    campaignId={character?.campaignId ?? null}
  />
```

- [ ] **Step 3: Banner + badge no `SheetHeader`**

Em `src/components/CharacterSheet/SheetHeader.jsx`, na renderização do header (procurar onde o nome do personagem é mostrado), adicionar logo abaixo do nome:

```jsx
{props.campaignId && (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-amber-900 text-amber-200 text-xs uppercase tracking-wider">
    Mesa
  </span>
)}
```

E logo acima do bloco de status de save, mostrar banner se `readOnly`:

```jsx
{props.readOnly && (
  <div className="bg-amber-950 border-l-4 border-amber-500 px-3 py-1 text-xs text-amber-200">
    Modo leitura — você não é dono desta ficha.
  </div>
)}
```

Também: se `readOnly`, esconder o status de auto-save:

```jsx
{!props.readOnly && (/* bloco existente de Salvando…/Salvo/Sem salvar */)}
```

- [ ] **Step 4: Build + smoke**

```bash
npm run build && npm run test
```

Esperado: build passa, testes verdes.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet src/hooks/useAutoSave.js
git commit -m "feat(sheet): modo readonly quando owner_id != user (DM lê ficha do player)"
git push
```

---

### Task 8: `CampaignSelector` + filtro no `CharacterList`

**Files:**
- Create: `src/components/CharacterList/CampaignSelector.jsx`
- Create: `src/hooks/useCampaignContext.js`
- Modify: `src/components/CharacterList/CharacterList.jsx`
- Modify: `src/utils/config.js` (adicionar storage key)

- [ ] **Step 1: Adicionar storage key em `src/utils/config.js`**

Adicionar no final do arquivo:

```js
export const CAMPAIGN_SCOPE_STORAGE_KEY = 'dnd-ficha:campaign-scope'
```

- [ ] **Step 2: Criar `useCampaignContext.js`**

```js
import { useCallback, useEffect, useState } from 'react'
import { CAMPAIGN_SCOPE_STORAGE_KEY } from '../utils/config'

/** Scope persistido: 'personal' (default) ou { campaignId: '<uuid>' }. */
function readScope() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_SCOPE_STORAGE_KEY)
    if (!raw) return 'personal'
    if (raw === 'personal') return 'personal'
    const parsed = JSON.parse(raw)
    if (parsed?.campaignId && typeof parsed.campaignId === 'string') return parsed
    return 'personal'
  } catch { return 'personal' }
}
function writeScope(scope) {
  try {
    localStorage.setItem(
      CAMPAIGN_SCOPE_STORAGE_KEY,
      scope === 'personal' ? 'personal' : JSON.stringify(scope)
    )
  } catch { /* sem localStorage */ }
}

export function useCampaignContext() {
  const [scope, setScopeState] = useState(readScope)
  const setScope = useCallback((s) => { setScopeState(s); writeScope(s) }, [])
  useEffect(() => { writeScope(scope) }, [scope])
  return [scope, setScope]
}
```

- [ ] **Step 3: Criar `CampaignSelector.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { listMyCampaigns } from '../../lib/campaigns'

export function CampaignSelector({ scope, onChange }) {
  const [campaigns, setCampaigns] = useState([])
  useEffect(() => { listMyCampaigns().then(setCampaigns) }, [])

  const value = scope === 'personal' ? 'personal' : scope?.campaignId
  function onSelect(e) {
    const v = e.target.value
    if (v === 'personal') onChange('personal')
    else onChange({ campaignId: v })
  }

  return (
    <select
      value={value}
      onChange={onSelect}
      className="px-3 py-1 bg-gray-900 border rounded text-gray-100 text-sm"
      style={{ borderColor: 'var(--color-shell-border)' }}
      aria-label="Contexto"
    >
      <option value="personal">Personagens pessoais</option>
      {campaigns.map(c => (
        <option key={c.id} value={c.id}>Mesa: {c.name}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 4: Integrar no `CharacterList.jsx`**

Importar:

```jsx
import { useCampaignContext } from '../../hooks/useCampaignContext'
import { CampaignSelector } from './CampaignSelector'
```

Substituir o state local de scope (não existe ainda) por:

```jsx
  const [scope, setScope] = useCampaignContext()
```

Em `reload`, passar o scope:

```jsx
  const reload = useCallback(async () => {
    setLoading(true)
    const list = await loadCharacters(scope)
    setCharacters(list)
    setLoading(false)
  }, [scope])
```

`useEffect` reage a `reload` que muda quando `scope` muda — listagem recarrega automaticamente.

Adicionar o `CampaignSelector` no header (logo após o `<h1>`):

```jsx
        <CampaignSelector scope={scope} onChange={setScope} />
```

Mudar `handleSelect` pra não passar lógica de campaign — continua passando shortId/id, sem mudança.

Passar `scope` pro botão "Recrutar" via state da navegação:

```jsx
          <Button
            variant="gold"
            size="md"
            onClick={() => {
              const campaignId = scope === 'personal' ? null : scope.campaignId
              if (onCreate) onCreate(campaignId)
            }}
          >
            ⚔ Recrutar
          </Button>
```

E em `App.jsx`, ajustar `ListRoute` pra encaminhar:

```jsx
function ListRoute() {
  const navigate = useNavigate()
  return (
    <CharacterList
      onSelect={(id) => navigate(`/c/${id}`)}
      onCreate={(campaignId) => navigate(campaignId ? `/new?campaignId=${campaignId}` : '/new')}
    />
  )
}
```

- [ ] **Step 5: Build + smoke**

```bash
npm run build
```

Smoke local: criar 2 mesas, alternar no selector, criar uma ficha em cada — deve filtrar a listagem.

- [ ] **Step 6: Commit**

```bash
git add src/components/CharacterList src/hooks/useCampaignContext.js src/utils/config.js src/App.jsx
git commit -m "feat(list): selector de contexto Pessoais/Mesa X + filtro de listagem"
git push
```

---

### Task 9: Wizard recebe `campaignId` + modal de destino se vier de Pessoais

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`
- Create: `src/components/CharacterWizardV2/steps/DestinationModal.jsx`

- [ ] **Step 1: `App.jsx` lê query string e passa pro Wizard**

Adicionar import `useSearchParams`:

```jsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
```

Substituir `NewRoute`:

```jsx
function NewRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const campaignId = params.get('campaignId') || null
  return (
    <Suspense fallback={<Loader />}>
      <CharacterWizard
        initialCampaignId={campaignId}
        onBack={() => navigate('/')}
        onComplete={(id) => navigate(`/c/${id}`, { replace: true })}
      />
    </Suspense>
  )
}
```

- [ ] **Step 2: Criar `DestinationModal.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { listMyCampaigns } from '../../../lib/campaigns'
import { Button } from '../../ui/Button'

export function DestinationModal({ onChoose }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyCampaigns().then(list => { setCampaigns(list); setLoading(false) })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border rounded p-6 max-w-md w-full mx-4" style={{ borderColor: 'var(--color-shell-border)' }}>
        <h2 className="text-amber-400 text-lg mb-1" style={{ fontFamily: 'IM Fell English SC, serif' }}>Onde criar?</h2>
        <p className="text-gray-400 text-xs mb-4">Esta ficha será pessoal ou vinculada a uma mesa?</p>

        <Button variant="gold" size="md" onClick={() => onChoose(null)} className="w-full mb-2">
          Personagem pessoal
        </Button>

        {loading ? (
          <p className="text-amber-400 text-xs">Carregando mesas…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500 text-xs">Você ainda não tem mesas.</p>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-gray-400 mt-3 mb-1">Vincular a mesa:</p>
            <div className="flex flex-col gap-1">
              {campaigns.map(c => (
                <Button key={c.id} variant="ghost-dark" size="sm" onClick={() => onChoose(c.id)}>
                  {c.name}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wizard usa `initialCampaignId` ou modal**

Em `src/components/CharacterWizardV2/CharacterWizardV2.jsx`:

```jsx
import { DestinationModal } from './steps/DestinationModal'
```

Adicionar prop `initialCampaignId` à assinatura. No topo do componente:

```jsx
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? undefined)
  const needsDestination = campaignId === undefined
```

Renderizar modal antes do wizard quando `needsDestination`:

```jsx
  if (needsDestination) {
    return <DestinationModal onChoose={(id) => setCampaignId(id)} />
  }
```

(`campaignId` pode ser `null` → pessoal; `string uuid` → mesa.)

Em `handleFinalize`, passar via opts:

```jsx
  const result = await upsertCharacter(character, { campaignId })
```

- [ ] **Step 4: Build + smoke**

```bash
npm run build
```

Smoke: estando em "Pessoais", clicar Recrutar → vê modal "Onde criar?"; escolhe pessoal → segue normal. Estando em "Mesa X", clicar Recrutar → vai direto pro wizard (sem modal).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/CharacterWizardV2
git commit -m "feat(wizard): aceita campaignId via query OU modal de destino"
git push
```

---

### Task 10: `AccountMenu` no header

**Files:**
- Create: `src/components/ui/AccountMenu.jsx`
- Modify: `src/components/CharacterList/CharacterList.jsx`

- [ ] **Step 1: Criar `AccountMenu.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { DeleteAccountModal } from './DeleteAccountModal'

function getInitials(email) {
  if (!email) return '?'
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export function AccountMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 rounded-full bg-amber-900 text-amber-200 text-sm font-bold flex items-center justify-center hover:bg-amber-800 transition"
          aria-label="Menu da conta"
          aria-expanded={open}
        >
          {getInitials(user?.email)}
        </button>
        {open && (
          <div
            className="absolute right-0 mt-2 w-56 rounded border shadow-lg z-40"
            style={{ background: 'var(--color-shell-800)', borderColor: 'var(--color-shell-border)' }}
            role="menu"
          >
            <div className="px-3 py-2 text-xs text-gray-400 border-b" style={{ borderColor: 'var(--color-shell-border)' }}>
              {user?.email}
            </div>
            <button
              onClick={() => { setOpen(false); signOut() }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
              role="menuitem"
            >
              Sair
            </button>
            <button
              onClick={() => { setOpen(false); setShowDelete(true) }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 border-t"
              style={{ borderColor: 'var(--color-shell-border)' }}
              role="menuitem"
            >
              Apagar conta
            </button>
          </div>
        )}
      </div>
      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Substituir botão "Sair" no `CharacterList` por `AccountMenu`**

Em `src/components/CharacterList/CharacterList.jsx`:

Adicionar import:

```jsx
import { AccountMenu } from '../ui/AccountMenu'
```

Remover esta linha (e o `useAuth`/`signOut` se não usado em outro lugar):

```jsx
          <Button variant="ghost-dark" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
```

E substituir por:

```jsx
          <AccountMenu />
```

(No fim do bloco direito do header, logo após `Recrutar`.)

- [ ] **Step 3: Commit (DeleteAccountModal vira stub temporário)**

Criar stub mínimo em `src/components/ui/DeleteAccountModal.jsx`:

```jsx
export function DeleteAccountModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded">
        <p>DeleteAccountModal — Task 11.</p>
        <button onClick={onClose} className="mt-2 text-amber-400">Fechar</button>
      </div>
    </div>
  )
}
```

```bash
git add src/components/ui/AccountMenu.jsx src/components/ui/DeleteAccountModal.jsx src/components/CharacterList/CharacterList.jsx
git commit -m "feat(ui): AccountMenu no header (substitui botão Sair solto)"
git push
```

---

### Task 11: `DeleteAccountModal` com confirmação digitada

**Files:**
- Modify: `src/components/ui/DeleteAccountModal.jsx`
- Modify: `src/auth/AuthProvider.jsx`

- [ ] **Step 1: Expor `deleteAccount` no `AuthProvider`**

Em `src/auth/AuthProvider.jsx`, importar:

```jsx
import { deleteMyAccount } from '../lib/campaigns'
```

Dentro do componente provider, adicionar função:

```jsx
  const deleteAccount = async () => {
    const r = await deleteMyAccount()
    if (!r.ok) return { ok: false, reason: r.reason }
    await supabase.auth.signOut()
    return { ok: true }
  }
```

(Garantir que `supabase` está importado/disponível no escopo do provider — se não estiver, importar de `'../lib/supabase'`.)

Adicionar `deleteAccount` ao value do contexto:

```jsx
  const value = {
    user, loading, recoveryMode,
    signIn, signUp, signOut,
    requestPasswordReset, updatePassword, signInWithGoogle,
    deleteAccount,
  }
```

- [ ] **Step 2: Implementar `DeleteAccountModal`**

Substituir o stub:

```jsx
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from './Button'

const CONFIRM_WORD = 'APAGAR'

export function DeleteAccountModal({ onClose }) {
  const { deleteAccount } = useAuth()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onDelete() {
    if (typed !== CONFIRM_WORD) return
    setBusy(true); setErr(null)
    const r = await deleteAccount()
    setBusy(false)
    if (!r.ok) { setErr('Falha ao apagar conta. Tente novamente.'); return }
    // signOut já roda dentro de deleteAccount; Gate redireciona pra LoginScreen.
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-red-900 rounded p-6 max-w-md w-full">
        <h2 className="text-red-400 text-lg font-bold mb-2">Apagar conta?</h2>
        <p className="text-sm text-gray-300 mb-2">
          Essa ação <strong>não pode ser desfeita</strong>. Tudo será removido:
        </p>
        <ul className="text-sm text-gray-400 list-disc list-inside mb-4 space-y-0.5">
          <li>Todas as suas fichas</li>
          <li>Sua participação em mesas</li>
          <li>Mesas onde você é o Mestre (incluindo fichas dos jogadores nelas)</li>
        </ul>
        <p className="text-xs text-gray-400 mb-1">
          Para confirmar, digite <code className="text-red-300">{CONFIRM_WORD}</code>:
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-gray-100 mb-3"
          autoFocus
        />
        {err && <p className="text-xs text-red-400 mb-2">{err}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost-dark" size="sm" onClick={onClose} disabled={busy}>Cancelar</Button>
          <button
            onClick={onDelete}
            disabled={busy || typed !== CONFIRM_WORD}
            className="px-4 py-1.5 rounded bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm transition"
          >
            {busy ? 'Apagando…' : 'Apagar para sempre'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build + smoke local**

```bash
npm run build
```

Smoke: abrir AccountMenu → "Apagar conta" → modal abre, botão "Apagar" só habilita quando digitar exatamente `APAGAR`. **Não testar de verdade no usuário real ainda**; usar uma conta descartável (ex: `test-dm@example.com` se quiser).

- [ ] **Step 4: Commit**

```bash
git add src/auth/AuthProvider.jsx src/components/ui/DeleteAccountModal.jsx
git commit -m "feat(account): DeleteAccountModal com confirmação digitada"
git push
```

---

### Task 12: Smoke completo + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Smoke manual em produção (após deploy automático)**

Sequência:

1. Login como user A → criar mesa "Mesa Teste" → copiar código → ver na lista
2. Logout → login como user B → ir em Mesas → entrar com código → mesa aparece
3. User B em CharacterList → selector → mudar pra "Mesa Teste" → criar ficha "Personagem do B"
4. Logout → login como user A → ir em /campaigns/<id> → ver "Personagem do B" na lista de fichas dos jogadores → clicar → ficha abre com banner "Modo leitura" e sem auto-save
5. User A rotaciona código → user B tenta entrar de novo (com código velho) → falha
6. User A remove user B da mesa → user B perde acesso à listagem da mesa (mas ficha continua existindo, RLS bloqueia DM e a ficha some da lista de "Mesa X" pra user B porque ficou órfã da mesa? Não — RLS de characters mantém pro owner. user B continua vendo a ficha em "Mesa X" filter ou "Pessoais"? Comportamento atual: o campaign_id da ficha continua apontando pra mesa, mas RLS de campaigns bloqueia ver a mesa. User B precisa mover a ficha — pode esperar PR futuro. Por ora documentar como limitação conhecida.)
7. AccountMenu → testar com conta descartável: "Apagar conta" → digitar APAGAR → confirma → vai pra LoginScreen → tentar logar de novo dá erro (linha em auth.users ainda existe; profiles não — login OK mas tudo vazio).

Se algum passo falhar, ler erro no console e ajustar. Os mais prováveis:
- Banner "Modo leitura" não aparece → checar Task 7 Step 2 (`character.ownerId`)
- DM não vê ficha do player → policy RLS errada (verificar `is_campaign_dm` aplicada em `characters_select_own_or_dm_of_campaign`)

- [ ] **Step 2: Atualizar CHANGELOG**

Em `CHANGELOG.md`, dentro de `## [Não lançado]`, antes da entrada `### Adicionado (PR 3 — Schema de Campanhas)`, adicionar:

```markdown
### Adicionado (PR 4 — UI de Mesas)
- **Tela `/campaigns`**: cria mesa, entra com código, lista mesas em que sou
  membro com badge Mestre/Jogador.
- **Tela `/campaigns/:id`**: mostra código de convite com botão copiar e
  rotacionar (DM only), lista de membros (DM remove; player sai), e — pra DM —
  lista de fichas dos jogadores em modo leitura.
- **Selector de contexto no CharacterList**: "Pessoais / Mesa X / Mesa Y"
  filtra a listagem. Persiste em `localStorage`.
- **Wizard de criação aceita destino**: se vier de "Pessoais", abre modal
  perguntando "pessoal ou mesa?"; se vier de uma mesa selecionada, já cria
  vinculado.
- **Badge "Mesa" e banner "Modo leitura"** na CharacterSheet quando o usuário
  não é o owner (DM lendo ficha de jogador). Auto-save fica desligado.
- **AccountMenu no header**: avatar com iniciais → dropdown com Sair e
  Apagar conta. Substitui o botão "Sair" solto.
- **Modal de Apagar conta** com confirmação digitando `APAGAR`. Chama RPC
  `delete_my_account` (criada no PR 3).
- `src/lib/campaigns.js` — fachada async sobre as RPCs criadas no PR 3.

### Notas (PR 4)
- Limitação conhecida: ao ser removido de uma mesa, a ficha do jogador continua
  com `campaign_id` apontando pra mesa apagada/inacessível. Move-pra-pessoal
  manual fica pra um PR futuro.
- "Apagar conta" deleta `profiles` (cascade), mas a linha em `auth.users`
  permanece. Login com o mesmo email funciona, porém vai criar profile zerado.
  Apagamento completo precisa admin API (fora de escopo).
```

- [ ] **Step 3: Commit final**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): PR 4 — UI de mesas"
git push
```

---

## Checklist de aceite (do spec)

- [x] Criar mesa pela UI (Task 3)
- [x] Gerar código de convite — automaticamente no `create_campaign` (PR 3) + UI mostra (Task 5)
- [x] Segundo user entra com código (Task 3, Task 5 confirma)
- [x] Mestre vê ficha do jogador em read-only (Tasks 6 + 7)
- [x] AccountMenu com "Apagar conta" (Tasks 10 + 11)
- [x] Seletor de contexto + criação vinculada a mesa (Tasks 8 + 9)
- [x] Badge "Mesa: X" na ficha (Task 7)

## YAGNI explícito (fora deste PR)

- Realtime no `CampaignDetail` (PR 5 opcional).
- Mover ficha entre mesas / pra pessoal (PR futuro).
- DM editar ficha de jogador (spec explicitamente fora).
- Apagar `auth.users` de verdade (precisa admin API).
- Convite por email/SMTP.
- Múltiplos DMs por mesa.
