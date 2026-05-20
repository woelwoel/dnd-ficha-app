# Supabase Migration — PR 2: Fichas no Postgres

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover a persistência das fichas de `localStorage` para a tabela `characters` no Supabase Postgres, mantendo a mesma fachada de funções de `src/utils/storage.js` (mas agora `async`). Sem mesas ainda — toda ficha pertence a `auth.uid()` do dono via RLS.

**Architecture:** `storage.js` é reescrito como camada thin async sobre `supabase.from('characters')`. RLS no Postgres filtra automaticamente por `owner_id = auth.uid()`. Componentes que carregavam sincronamente (`useState(loadCharacters)`, `useMemo(loadCharacterById)`) viram `useEffect` com loading state. Posições no mapa atualizam via RPC `update_character_position` (jsonb_set) pra evitar reescrita do payload inteiro.

**Tech Stack:** `@supabase/supabase-js` v2, React 19, Postgres com RLS, Vitest com mock inline via `vi.hoisted`.

**Spec de referência:** `docs/superpowers/specs/2026-05-19-sair-do-localstorage-design.md` (seção 2: schema `characters` parcial — sem campaign_id ainda; seção 3 parcial — RLS owner-only; seção 4: camada de dados completa; segurança itens 8, 11).

---

## File Structure

**Criar:**
- `supabase/migrations/0002_characters.sql` — DDL da tabela `characters`, RLS, constraints e RPC

**Modificar (reescrita completa):**
- `src/utils/storage.js` — todas funções viram `async`, leem/escrevem via Supabase
- `src/test/storage.test.js` — usa mock inline do supabase

**Modificar (adaptação de await):**
- `src/hooks/useAutoSave.js` — `await upsertCharacter`
- `src/components/CharacterList/CharacterList.jsx` — `useEffect` + loading
- `src/components/CharacterSheet/CharacterSheet.jsx` — `useEffect` + loading
- `src/components/CharacterWizardV2/CharacterWizardV2.jsx` — `await` no handler de conclusão
- `src/components/CharacterList/BackupMenu.jsx` — `await export/import`
- `src/test/CharacterList/CharacterList.test.jsx` — mock storage async
- `src/test/integration/characterList.test.jsx` — mock storage async
- `src/test/integration/character-list-mapa.test.jsx` — mock storage async
- `CHANGELOG.md` — entrada PR 2

**Sem mudança esperada:**
- `src/auth/*` — auth já está pronta no PR 1
- `src/lib/supabase.js` — cliente singleton já existe
- Tudo em `src/domain/`, `src/components/CharacterSheet/blocks/`, etc — só consomem `useCharacter` ou contextos, não `storage.js` direto

---

## Premissas

1. **`owner_id` é setado pelo Postgres**, não pelo cliente. Coluna tem `default auth.uid()`. Cliente envia só `{id, data, last_opened_at}`.
2. **Ordenação default** de `loadCharacters()`: `order by created_at asc` (matches comportamento atual de inserção sequencial em localStorage).
3. **RLS é a única barreira**. Sem auth.uid() (anon), nenhuma query retorna dados.
4. **Sem realtime nesta PR**. Mudança em outro device só aparece com refresh. Realtime opcional vem em PR 5.
5. **Sem cache local**. Cada chamada hit a rede. Loading skeletons cobrem latência.
6. **Tamanho máximo do payload**: 200 KB. Quantidade máxima de fichas por usuário: 100. Ambos enforced no SQL.

---

### Task 1: Migration `characters` + RPC

**Files:**
- Create: `supabase/migrations/0002_characters.sql`

- [ ] **Step 1: Criar o arquivo da migration**

Arquivo `supabase/migrations/0002_characters.sql`:
```sql
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
```

- [ ] **Step 2: Aplicar no Supabase Dashboard (manual)**

Usuário abre **SQL Editor** no dashboard, cola o conteúdo do arquivo, clica **Run**.
Verificar em **Table Editor → public → characters** que a tabela apareceu com as 6 colunas.

- [ ] **Step 3: Verificar RLS isolando (manual)**

No SQL Editor, rodar (substitua `<seu-user-id>` pelo UUID em `public.profiles`):
```sql
-- Como service_role (bypass RLS): inserir uma ficha de teste
insert into public.characters (id, owner_id, data)
  values (gen_random_uuid(), '<seu-user-id>', '{"info":{"name":"Teste"}}'::jsonb);

-- Como anônimo via PostgREST: a query a seguir DEVE retornar 0 linhas
-- (apenas para validação visual no SQL Editor; o painel roda como service_role)
select count(*) from public.characters;
-- Esperado no SQL Editor: 1 (porque service_role bypassa RLS)
-- Esperado via app sem auth: 0 (RLS bloqueia)
```

- [ ] **Step 4: Commit + push**

```bash
git add supabase/migrations/0002_characters.sql
git commit -m "feat(supabase): migration 0002 — tabela characters + RLS owner-only + RPCs"
git push
```

---

### Task 2: Reescrever `storage.js` (async) + testes

**Files:**
- Modify: `src/utils/storage.js` (reescrita completa)
- Modify: `src/test/storage.test.js` (reescrita completa)

- [ ] **Step 1: Escrever os testes primeiro (substituir conteúdo)**

Substituir TODO o conteúdo de `src/test/storage.test.js` por:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock in-memory do supabase. Cada teste limpa via beforeEach.
const store = vi.hoisted(() => ({
  rows: [],
  uid: 'user-1',
}))

const supabaseMock = vi.hoisted(() => {
  // Builder pra chain .from('characters').select()... etc.
  function from(table) {
    if (table !== 'characters') {
      throw new Error('Mock supports only characters table: ' + table)
    }
    const ctx = { filter: () => true, single: false, columns: '*' }
    const builder = {
      select(cols = '*') { ctx.columns = cols; return builder },
      order() { return builder },
      eq(col, val) { const prev = ctx.filter; ctx.filter = (r) => prev(r) && r[col] === val; return builder },
      single() { ctx.single = true; return builder },
      maybeSingle() { ctx.single = true; ctx.maybe = true; return builder },
      // Terminators that return Promises:
      then(resolve) {
        const rows = store.rows.filter(ctx.filter)
        if (ctx.single) return resolve({ data: rows[0] ?? null, error: rows.length === 0 && !ctx.maybe ? { message: 'No rows' } : null })
        return resolve({ data: rows, error: null })
      },
      async upsert(record) {
        const arr = Array.isArray(record) ? record : [record]
        const out = []
        for (const r of arr) {
          if (!r.id) return { data: null, error: { message: 'id required' } }
          const stamped = { owner_id: store.uid, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...r }
          const idx = store.rows.findIndex(x => x.id === r.id)
          if (idx >= 0) store.rows[idx] = { ...store.rows[idx], ...stamped, updated_at: new Date().toISOString() }
          else store.rows.push(stamped)
          out.push(stamped)
        }
        return { data: out, error: null }
      },
      async insert(record) {
        return builder.upsert(record)
      },
      async delete() {
        const before = store.rows.length
        store.rows = store.rows.filter(r => !ctx.filter(r))
        return { data: null, error: null, count: before - store.rows.length }
      },
    }
    return builder
  }
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: store.uid } }, error: null })) },
    from,
    rpc: vi.fn(async (name, args) => {
      if (name === 'update_character_position') {
        const row = store.rows.find(r => r.id === args.p_id)
        if (!row) return { data: null, error: { message: 'not found' } }
        row.data = { ...row.data, position: args.p_position }
        return { data: null, error: null }
      }
      if (name === 'touch_character_last_opened') {
        const row = store.rows.find(r => r.id === args.p_id)
        if (!row) return { data: null, error: { message: 'not found' } }
        row.last_opened_at = new Date().toISOString()
        return { data: null, error: null }
      }
      return { data: null, error: { message: 'unknown rpc: ' + name } }
    }),
  }
})

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import {
  loadCharacters,
  loadCharacterById,
  upsertCharacter,
  deleteCharacter,
  updateCharacterPosition,
  touchCharacterLastOpened,
  exportAllCharacters,
  importAllCharacters,
} from '../utils/storage'

function makeChar(id, name = 'Frodo', level = 1) {
  return {
    id,
    meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', version: '1.0', schemaVersion: 2 },
    info: { name, race: 'humano', class: 'mago', level, alignment: '' },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: {
      maxHp: 10, currentHp: 10, tempHp: 0, armorClass: 10, speed: 30,
      hitDice: { pool: { d6: { total: 1, used: 0 } } }, attacks: [],
      deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    personality: { traits: [], ideals: [], bonds: [], flaws: [] },
    notes: '',
    position: { x: 0.5, y: 0.5 },
  }
}

describe('storage (Supabase backend)', () => {
  beforeEach(() => {
    store.rows = []
  })

  it('loadCharacters() retorna [] quando vazio', async () => {
    const out = await loadCharacters()
    expect(out).toEqual([])
  })

  it('upsertCharacter() insere e loadCharacters() devolve', async () => {
    const r = await upsertCharacter(makeChar('id-a'))
    expect(r.ok).toBe(true)
    const list = await loadCharacters()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('id-a')
    expect(list[0].info.name).toBe('Frodo')
  })

  it('upsertCharacter() rejeita payload inválido (sem persistir)', async () => {
    const bad = { id: 'x', meta: {} } // não passa Zod
    const r = await upsertCharacter(bad)
    expect(r.ok).toBe(false)
    expect(r.errors).toBeTruthy()
    expect(await loadCharacters()).toHaveLength(0)
  })

  it('upsertCharacter() atualiza existente por id', async () => {
    await upsertCharacter(makeChar('id-a', 'Frodo', 1))
    await upsertCharacter(makeChar('id-a', 'Frodo', 5))
    const list = await loadCharacters()
    expect(list).toHaveLength(1)
    expect(list[0].info.level).toBe(5)
  })

  it('loadCharacterById() retorna ficha ou null', async () => {
    await upsertCharacter(makeChar('id-a'))
    expect((await loadCharacterById('id-a')).id).toBe('id-a')
    expect(await loadCharacterById('nope')).toBeNull()
  })

  it('deleteCharacter() remove do storage', async () => {
    await upsertCharacter(makeChar('id-a'))
    await upsertCharacter(makeChar('id-b'))
    const r = await deleteCharacter('id-a')
    expect(r.ok).toBe(true)
    const list = await loadCharacters()
    expect(list.map(c => c.id)).toEqual(['id-b'])
  })

  it('updateCharacterPosition() altera só a posição', async () => {
    await upsertCharacter(makeChar('id-a'))
    const r = await updateCharacterPosition('id-a', { x: 0.1, y: 0.9 })
    expect(r.ok).toBe(true)
    const ch = await loadCharacterById('id-a')
    expect(ch.position).toEqual({ x: 0.1, y: 0.9 })
    expect(ch.info.name).toBe('Frodo') // resto intacto
  })

  it('touchCharacterLastOpened() seta timestamp', async () => {
    await upsertCharacter(makeChar('id-a'))
    const r = await touchCharacterLastOpened('id-a')
    expect(r.ok).toBe(true)
  })

  it('exportAllCharacters() retorna payload de backup', async () => {
    await upsertCharacter(makeChar('id-a', 'Frodo'))
    await upsertCharacter(makeChar('id-b', 'Sam'))
    const payload = await exportAllCharacters()
    expect(payload.app).toBe('dnd-ficha-app')
    expect(payload.count).toBe(2)
    expect(payload.characters).toHaveLength(2)
  })

  it('importAllCharacters() merge sobrescreve por id e adiciona novos', async () => {
    await upsertCharacter(makeChar('id-a', 'Frodo', 1))
    const payload = {
      characters: [makeChar('id-a', 'Frodo', 5), makeChar('id-b', 'Sam', 2)],
    }
    const r = await importAllCharacters(payload, 'merge')
    expect(r.ok).toBe(true)
    expect(r.imported).toBe(2)
    const list = await loadCharacters()
    expect(list).toHaveLength(2)
    expect(list.find(c => c.id === 'id-a').info.level).toBe(5)
  })

  it('importAllCharacters() replace apaga tudo antes', async () => {
    await upsertCharacter(makeChar('id-a'))
    await upsertCharacter(makeChar('id-b'))
    const payload = { characters: [makeChar('id-c', 'Pippin')] }
    const r = await importAllCharacters(payload, 'replace')
    expect(r.ok).toBe(true)
    const list = await loadCharacters()
    expect(list.map(c => c.id)).toEqual(['id-c'])
  })

  it('importAllCharacters() formato inválido → ok:false sem tocar storage', async () => {
    await upsertCharacter(makeChar('id-a'))
    const r = await importAllCharacters({ não: 'reconhecido' }, 'merge')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('invalid-format')
    expect(await loadCharacters()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Rodar testes — devem FALHAR (storage.js ainda sync com localStorage)**

Run: `npx vitest run src/test/storage.test.js`
Expected: FAIL — os testes esperam async + Supabase, storage.js ainda usa localStorage sync.

- [ ] **Step 3: Reescrever `src/utils/storage.js`**

Substituir TODO o conteúdo de `src/utils/storage.js` por:

```js
import { safeParseCharacter, migrateCharacter } from '../domain/characterSchema'
import { clampPosition } from './token-position'
import { supabase } from '../lib/supabase'

const TABLE = 'characters'
const CURRENT_VERSION = '1.0'

/* ── Helpers ─────────────────────────────────────────────────────── */

function validateForSave(character) {
  const migrated = migrateCharacter(character)
  const stamped = {
    ...migrated,
    meta: { ...(migrated?.meta ?? {}), version: CURRENT_VERSION },
  }
  const result = safeParseCharacter(stamped)
  if (!result.success) return { ok: false, errors: result.error.issues }
  return { ok: true, data: result.data }
}

function rowToCharacter(row) {
  // O payload da ficha vive em row.data. last_opened_at é metadado relacional.
  if (!row?.data) return null
  return {
    ...row.data,
    lastOpenedAt: row.last_opened_at ? Date.parse(row.last_opened_at) : (row.data.lastOpenedAt ?? null),
  }
}

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[storage] ${label}:`, payload)
  }
}

/* ── API pública ─────────────────────────────────────────────────── */

export async function loadCharacters() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, last_opened_at, created_at')
    .order('created_at', { ascending: true })
  if (error) {
    logDev('loadCharacters falhou', error)
    return []
  }
  const valid = []
  for (const row of data ?? []) {
    const ch = rowToCharacter(row)
    const parsed = safeParseCharacter(ch)
    if (parsed.success) valid.push(parsed.data)
    else logDev('ficha ignorada (schema)', parsed.error.issues.slice(0, 3))
  }
  return valid
}

export async function loadCharacterById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, last_opened_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const ch = rowToCharacter(data)
  const parsed = safeParseCharacter(ch)
  return parsed.success ? parsed.data : null
}

export async function upsertCharacter(character) {
  const v = validateForSave(character)
  if (!v.ok) {
    logDev('upsert: ficha inválida', v.errors.slice(0, 3))
    return { ok: false, reason: 'invalid', errors: v.errors }
  }
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      id: v.data.id,
      data: v.data,
      last_opened_at: v.data.lastOpenedAt ? new Date(v.data.lastOpenedAt).toISOString() : null,
    })
  if (error) {
    logDev('upsert falhou', error)
    return { ok: false, reason: error.message?.includes('character_limit_reached') ? 'limit' : 'unknown' }
  }
  return { ok: true }
}

export async function deleteCharacter(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) {
    logDev('delete falhou', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true }
}

export async function updateCharacterPosition(id, position) {
  const { error } = await supabase.rpc('update_character_position', {
    p_id: id,
    p_position: clampPosition(position),
  })
  if (error) {
    logDev('updatePosition falhou', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true }
}

export async function touchCharacterLastOpened(id) {
  const { error } = await supabase.rpc('touch_character_last_opened', { p_id: id })
  if (error) return { ok: false, reason: 'unknown' }
  return { ok: true }
}

export async function exportAllCharacters() {
  const characters = await loadCharacters()
  return {
    app: 'dnd-ficha-app',
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    count: characters.length,
    characters,
  }
}

export async function importAllCharacters(rawPayload, mode = 'merge') {
  const list = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray(rawPayload?.characters)
      ? rawPayload.characters
      : null

  if (!list) return { ok: false, reason: 'invalid-format', imported: 0, invalid: 0, total: 0 }

  // Pré-valida antes de tocar no servidor (evita inserts parciais em payload ruim)
  const valid = []
  let invalid = 0
  for (const raw of list) {
    const v = validateForSave(raw)
    if (v.ok) valid.push(v.data)
    else invalid += 1
  }
  if (valid.length === 0) {
    return { ok: false, reason: 'no-valid-characters', imported: 0, invalid, total: list.length }
  }

  if (mode === 'replace') {
    // Apaga tudo do usuário antes
    const current = await loadCharacters()
    for (const c of current) {
      const r = await deleteCharacter(c.id)
      if (!r.ok) return { ok: false, reason: r.reason ?? 'save-failed', imported: 0, invalid, total: list.length }
    }
  }

  let imported = 0
  for (const c of valid) {
    const r = await upsertCharacter(c)
    if (!r.ok) return { ok: false, reason: r.reason ?? 'save-failed', imported, invalid, total: list.length }
    imported += 1
  }

  return { ok: true, imported, invalid, total: list.length }
}
```

- [ ] **Step 4: Rodar testes — devem PASSAR**

Run: `npx vitest run src/test/storage.test.js`
Expected: PASS — 12 testes.

> Se algum teste falhar por causa de algum método não-suportado pelo mock (ex: `.maybeSingle().then`), adicione o método no builder do mock. Reporte exatamente o erro pra eu te ajudar.

- [ ] **Step 5: Commit + push**

```bash
git add src/utils/storage.js src/test/storage.test.js
git commit -m "feat(storage): migra para Supabase Postgres mantendo fachada async"
git push
```

---

### Task 3: Adaptar `useAutoSave`

**Files:**
- Modify: `src/hooks/useAutoSave.js`

- [ ] **Step 1: Reescrever o hook**

Substituir TODO o conteúdo de `src/hooks/useAutoSave.js` por:

```js
import { useEffect, useRef, useState } from 'react'
import { upsertCharacter } from '../utils/storage'

/**
 * Salva `character` no Supabase com debounce de `delayMs`.
 * Retorna `{ saved, error }` para feedback visual.
 */
export function useAutoSave(character, delayMs = 500) {
  const [status, setStatus] = useState({ saved: false, error: null })
  const debounceRef = useRef(null)
  const flashRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (flashRef.current) clearTimeout(flashRef.current)
  }, [])

  useEffect(() => {
    if (!character?.id) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const result = await upsertCharacter(character)
      if (!mountedRef.current) return
      if (result.ok) {
        setStatus({ saved: true, error: null })
        if (flashRef.current) clearTimeout(flashRef.current)
        flashRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus(s => ({ ...s, saved: false }))
        }, 1500)
      } else {
        setStatus({ saved: false, error: result.reason ?? 'unknown' })
      }
    }, delayMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [character, delayMs])

  return status
}
```

- [ ] **Step 2: Confirmar que não há teste dedicado pra useAutoSave**

Run: `ls src/test/ | grep -i autoSave || echo "no dedicated test"`
Expected: `no dedicated test` (o hook é coberto indiretamente por testes de CharacterSheet — fora desta task).

- [ ] **Step 3: Commit + push**

```bash
git add src/hooks/useAutoSave.js
git commit -m "feat(autosave): await upsertCharacter async"
git push
```

---

### Task 4: Adaptar `CharacterList` para carga async

**Files:**
- Modify: `src/components/CharacterList/CharacterList.jsx`

- [ ] **Step 1: Reescrever o componente**

Substituir TODO o conteúdo de `src/components/CharacterList/CharacterList.jsx` por:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { CharacterMap } from './CharacterMap'
import { CharacterSidebar } from './CharacterSidebar'
import { CharacterListView } from './CharacterListView'
import { EmptyState } from './EmptyState'
import { BackupMenu } from './BackupMenu'
import { Button } from '../ui/Button'
import { useAuth } from '../../auth/AuthProvider'
import {
  loadCharacters,
  touchCharacterLastOpened,
  updateCharacterPosition,
  deleteCharacter,
} from '../../utils/storage'
import {
  CAMPAIGN_NAME_DEFAULT,
  CAMPAIGN_NAME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from '../../utils/config'

const VIEW_MAP = 'map'
const VIEW_LIST = 'list'

function readView() {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return v === VIEW_LIST ? VIEW_LIST : VIEW_MAP
  } catch { return VIEW_MAP }
}
function writeView(v) {
  try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, v) } catch { /* localStorage indisponível */ }
}

function readCampaignName() {
  try {
    return localStorage.getItem(CAMPAIGN_NAME_STORAGE_KEY) || CAMPAIGN_NAME_DEFAULT
  } catch { return CAMPAIGN_NAME_DEFAULT }
}

export function CharacterList({ onSelect, onCreate }) {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(readView)
  const [campaignName] = useState(readCampaignName)
  const { signOut } = useAuth()

  // Carga inicial + recarga.
  const reload = useCallback(async () => {
    setLoading(true)
    const list = await loadCharacters()
    setCharacters(list)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleSelect = useCallback(async (id) => {
    await touchCharacterLastOpened(id)
    if (onSelect) onSelect(id)
  }, [onSelect])

  const switchView = useCallback((v) => {
    setView(v)
    writeView(v)
  }, [])

  const handlePositionChange = useCallback(async (id, position) => {
    // Otimista: atualiza local imediatamente, depois envia.
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, position } : c))
    await updateCharacterPosition(id, position)
  }, [])

  const handleDelete = useCallback(async (id) => {
    await deleteCharacter(id)
    await reload()
  }, [reload])

  const isEmpty = !loading && characters.length === 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg-canvas)', color: 'var(--color-ink-primary)' }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
          borderColor: 'var(--color-shell-border)',
          color: 'var(--color-ink-inverse)',
        }}
      >
        <h1
          className="text-base font-bold"
          style={{
            fontFamily: 'IM Fell English SC, serif',
            color: 'var(--color-gold-400)',
            letterSpacing: '0.12em',
          }}
        >
          {campaignName.replace(/⚜\s*/g, '')}
        </h1>

        <div className="flex items-center gap-2" role="group" aria-label="Modo de visualização">
          <Button
            variant={view === VIEW_MAP ? 'gold' : 'ghost-dark'}
            size="sm"
            onClick={() => switchView(VIEW_MAP)}
            aria-pressed={view === VIEW_MAP}
          >
            ▦ Mapa
          </Button>
          <Button
            variant={view === VIEW_LIST ? 'gold' : 'ghost-dark'}
            size="sm"
            onClick={() => switchView(VIEW_LIST)}
            aria-pressed={view === VIEW_LIST}
          >
            ≡ Lista
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost-dark" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
          <BackupMenu
            characterCount={characters.length}
            onImported={reload}
          />
          <Button variant="gold" size="md" onClick={onCreate}>
            ⚔ Recrutar
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden w-full max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-amber-400 text-sm">
            Carregando heróis…
          </div>
        ) : view === VIEW_MAP ? (
          <>
            <div className="flex-1 relative p-3 min-w-0">
              <CharacterMap
                characters={characters}
                campaignName={campaignName}
                onSelect={handleSelect}
                onPositionChange={handlePositionChange}
              />
              {isEmpty && <EmptyState onCreate={onCreate} />}
            </div>
            <div className="hidden md:block w-[260px] flex-shrink-0 p-3 pl-0">
              <CharacterSidebar
                characters={characters}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 max-w-3xl mx-auto w-full">
            <CharacterListView
              characters={characters}
              onSelect={handleSelect}
            />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit + push (testes serão corrigidos na Task 8)**

```bash
git add src/components/CharacterList/CharacterList.jsx
git commit -m "feat(list): CharacterList carrega via Supabase com loading state"
git push
```

> Testes desse componente vão quebrar até a Task 8 — está OK, vamos consertar lá.

---

### Task 5: Adaptar `CharacterSheet` para carga async

**Files:**
- Modify: `src/components/CharacterSheet/CharacterSheet.jsx` (apenas o trecho que usa `loadCharacterById`)

- [ ] **Step 1: Trocar `useMemo(loadCharacterById)` por `useEffect`**

Em `src/components/CharacterSheet/CharacterSheet.jsx`, substituir:

```jsx
const initialCharacter = useMemo(() => {
    if (!characterId || characterId === 'new') return null
    return loadCharacterById(characterId)
  }, [characterId])

  const { character, setCharacter, ...updaters } = useCharacter(initialCharacter)
```

Por:

```jsx
const [initialCharacter, setInitialCharacter] = useState(null)
  const [loadingCharacter, setLoadingCharacter] = useState(true)

  useEffect(() => {
    let alive = true
    if (!characterId || characterId === 'new') {
      setInitialCharacter(null)
      setLoadingCharacter(false)
      return
    }
    setLoadingCharacter(true)
    loadCharacterById(characterId).then(ch => {
      if (!alive) return
      setInitialCharacter(ch)
      setLoadingCharacter(false)
    })
    return () => { alive = false }
  }, [characterId])

  const { character, setCharacter, ...updaters } = useCharacter(initialCharacter)
```

E garantir que `useState` esteja importado (já está, vide linha 1: `import { useEffect, useMemo, useState } from 'react'`).

- [ ] **Step 2: Adicionar early return de loading APÓS todos os hooks**

**Importante (regras de hooks):** o early return precisa vir **depois de TODOS os hooks** chamados no componente — `useState`, `useEffect`, `useCharacter`, `useCharacterCalculations`, `useTabValidation`, `useAutoSave`, `useSheetHandlers`, etc. Colocar antes desses hooks viola "rules of hooks" e quebra React.

Localizar o `return (` final do componente. Logo antes dele (depois de todos os hooks), adicionar:

```jsx
if (loadingCharacter) {
    return (
      <div className="min-h-screen flex items-center justify-center text-amber-400 text-sm">
        Carregando ficha…
      </div>
    )
  }
```

Isso assume que `useCharacter(null)` e os demais hooks downstream toleram `initialCharacter === null` (já era o caso quando `characterId === 'new'`). Se algum hook crashar com `null`, reportar como BLOCKED — vamos precisar adicionar guardas nos hooks downstream antes de seguir.

> Se algo no arquivo ficar referenciando `useMemo` sem necessidade, remover o import. Rodar lint depois.

- [ ] **Step 3: Verificar que o app não quebra (build)**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 4: Commit + push**

```bash
git add src/components/CharacterSheet/CharacterSheet.jsx
git commit -m "feat(sheet): CharacterSheet carrega ficha via await com loading state"
git push
```

---

### Task 6: Adaptar `CharacterWizardV2` para save async

**Files:**
- Modify: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`

- [ ] **Step 1: Localizar onde `upsertCharacter` é chamado**

Run: `grep -n "upsertCharacter" src/components/CharacterWizardV2/CharacterWizardV2.jsx`
Expected: 1+ ocorrências, provavelmente em handler de conclusão (ex: `handleFinish`).

- [ ] **Step 2: Converter o handler para async**

Localize a função que chama `upsertCharacter` (deve ser algo como `function handleComplete() { ... upsertCharacter(...) ... onComplete(id) }`). Converta para `async` e adicione `await`:

```jsx
async function handleComplete() {
  // ... lógica existente ...
  const result = await upsertCharacter(character)
  if (!result.ok) {
    // Logar e mostrar erro pro usuário (banner ou alert simples)
    console.error('[wizard] falha ao salvar:', result.errors ?? result.reason)
    return
  }
  onComplete(character.id)
}
```

Se houver um botão "Concluir" disparando esse handler, garantir que ele aceite uma função async (geralmente já aceita).

> O texto exato depende do nome do handler — adapte conforme o arquivo. Não toque em outra lógica do wizard.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: passa.

- [ ] **Step 4: Commit + push**

```bash
git add src/components/CharacterWizardV2/CharacterWizardV2.jsx
git commit -m "feat(wizard): await upsertCharacter ao concluir + trata falha"
git push
```

---

### Task 7: Adaptar `BackupMenu` (export/import async)

**Files:**
- Modify: `src/components/CharacterList/BackupMenu.jsx`

- [ ] **Step 1: Converter `handleExport` para async**

Em `BackupMenu.jsx`, substituir a função `handleExport`:

```jsx
async function handleExport() {
  const payload = await exportAllCharacters()
  downloadJson(`dnd-ficha-backup-${todayStamp()}.json`, payload)
  setFeedback({ tone: 'success', text: `Backup gerado com ${payload.count} personagem(ns).` })
}
```

- [ ] **Step 2: Converter `handleFile` (leitor de arquivo) para tratar import async**

Substituir a função `handleFile` por:

```jsx
function handleFile(e) {
  const file = e.target.files?.[0]
  const mode = e.target.dataset.mode === 'replace' ? 'replace' : 'merge'
  e.target.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = async ev => {
    let raw
    try {
      raw = JSON.parse(ev.target.result)
    } catch {
      setFeedback({ tone: 'error', text: 'Arquivo inválido (JSON malformado).' })
      return
    }
    const result = await importAllCharacters(raw, mode)
    if (!result.ok) {
      setFeedback({ tone: 'error', text: REASON_MESSAGES[result.reason] ?? 'Falha ao importar.' })
      return
    }
    const extras = result.invalid > 0 ? ` (${result.invalid} descartado(s) por schema inválido)` : ''
    setFeedback({
      tone: 'success',
      text: `${result.imported} personagem(ns) importado(s)${extras}.`,
    })
    onImported?.()
  }
  reader.onerror = () => setFeedback({ tone: 'error', text: 'Falha ao ler o arquivo.' })
  reader.readAsText(file)
}
```

- [ ] **Step 3: Atualizar o texto descritivo do modal**

Localizar a string `Todo o trabalho fica no seu navegador. Exporte sempre que terminar uma sessão.` e substituir por:

```
Backup local da sua conta. Útil pra arquivamento ou transferir entre contas.
```

- [ ] **Step 4: Adicionar mensagem para `reason: 'limit'`**

Em `REASON_MESSAGES`, adicionar:

```js
'limit': 'Você atingiu o limite de 100 fichas por conta.',
```

- [ ] **Step 5: Commit + push**

```bash
git add src/components/CharacterList/BackupMenu.jsx
git commit -m "feat(backup): export/import async via Supabase + msg de limite"
git push
```

---

### Task 8: Corrigir testes existentes (CharacterList + integration)

**Files:**
- Modify: `src/test/CharacterList/CharacterList.test.jsx`
- Modify: `src/test/integration/characterList.test.jsx`
- Modify: `src/test/integration/character-list-mapa.test.jsx`

> **Estratégia:** mockar `../../utils/storage` (não o supabase) — fica mais simples, e os componentes só veem a fachada de storage.js de qualquer jeito. O `useAuth` já estava mockado dos testes existentes do PR 1.

- [ ] **Step 1: Atualizar `src/test/CharacterList/CharacterList.test.jsx`**

Adicionar logo abaixo do mock existente de `useAuth` (linha ~5-9 do arquivo) o seguinte bloco de mock de storage:

```jsx
// Mock do storage Supabase — backend em memória controlado pelos testes.
const store = vi.hoisted(() => ({ rows: [] }))
vi.mock('../../utils/storage', () => ({
  loadCharacters: async () => [...store.rows],
  loadCharacterById: async (id) => store.rows.find(c => c.id === id) ?? null,
  upsertCharacter: async (c) => {
    const idx = store.rows.findIndex(r => r.id === c.id)
    if (idx >= 0) store.rows[idx] = c
    else store.rows.push(c)
    return { ok: true }
  },
  deleteCharacter: async (id) => {
    store.rows = store.rows.filter(c => c.id !== id)
    return { ok: true }
  },
  updateCharacterPosition: async (id, position) => {
    const r = store.rows.find(c => c.id === id)
    if (r) r.position = position
    return { ok: true }
  },
  touchCharacterLastOpened: async () => ({ ok: true }),
  exportAllCharacters: async () => ({ app: 'dnd-ficha-app', version: '1.0', exportedAt: '', count: store.rows.length, characters: [...store.rows] }),
  importAllCharacters: async () => ({ ok: true, imported: 0, invalid: 0, total: 0 }),
}))
```

E remover qualquer `import { upsertCharacter } from '../../utils/storage'` real (use o mock através do `store.rows.push` direto OU re-importe `upsertCharacter` do módulo mockado — Vitest devolve o mock automaticamente).

No `beforeEach` (ou onde houver setup), garantir limpeza:

```jsx
beforeEach(() => {
  store.rows = []
})
```

Onde os testes usavam `upsertCharacter(...)` pra setup, agora podem usar `store.rows.push(...)` diretamente (ou continuar chamando upsertCharacter que cai no mock).

Os testes que dependem de comportamento sync (`useState(loadCharacters)`) devem ser refeitos pra aguardar a renderização async. Use `waitFor` ou `findByText`:

```jsx
import { waitFor } from '@testing-library/react'

// Em vez de:
render(<CharacterList ... />)
expect(screen.getByText('Aragorn')).toBeInTheDocument()

// Use:
render(<CharacterList ... />)
expect(await screen.findByText('Aragorn')).toBeInTheDocument()
```

- [ ] **Step 2: Atualizar `src/test/integration/characterList.test.jsx`**

Mesma estratégia: adicionar mock de storage similar ao Step 1 (copie o bloco, ajuste paths se necessário). Mockar também `useAuth` (já feito).

> Os testes desse arquivo já estavam quebrados antes (UI antiga "Tomo dos Heróis"), então o objetivo aqui é **não introduzir novas falhas além das que já existiam**. Se o arquivo ainda falhar por causa de UI velha, é tarefa separada (fora do PR 2).

- [ ] **Step 3: Atualizar `src/test/integration/character-list-mapa.test.jsx`**

Mesma estratégia. Adicionar mock de storage no topo (após mock de useAuth). Converter `expect(screen.getByText(...))` para `findByText` onde necessário.

- [ ] **Step 4: Rodar os testes desses 3 arquivos**

Run: `npx vitest run src/test/CharacterList/CharacterList.test.jsx src/test/integration/character-list-mapa.test.jsx src/test/integration/characterList.test.jsx`

Expected: `src/test/CharacterList/CharacterList.test.jsx` deve PASSAR em todos. Os outros 2 podem ainda ter falhas pré-existentes (UI antiga); confirmar que o NÚMERO de falhas não aumentou em relação ao baseline (15 falhas eram pré-PR 1).

- [ ] **Step 5: Rodar a suite completa do `src/`**

Run: `npx vitest run src/ 2>&1 | tail -10`
Expected: número total de falhas <= baseline pré-PR 2 + 0 novas em `src/test/auth/`, `src/test/lib/`, `src/test/storage.test.js`, `src/test/CharacterList/`.

- [ ] **Step 6: Commit + push**

```bash
git add src/test/CharacterList/CharacterList.test.jsx src/test/integration/characterList.test.jsx src/test/integration/character-list-mapa.test.jsx
git commit -m "test(list): mock storage Supabase + waitFor pra carga async"
git push
```

---

### Task 9: Smoke manual + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Smoke manual em produção**

Pré-requisito: deploy do último commit `Ready` no Vercel.

Abre `https://dnd-ficha-app.vercel.app` em **dois browsers diferentes** (ou um normal + uma janela anônima) com a **mesma conta** logada.

1. **Browser A:** lista de fichas vazia (skeleton "Carregando heróis…" aparece brevemente).
2. **Browser A:** clica "⚔ Recrutar", completa o wizard, cria uma ficha de teste.
3. **Browser A:** volta pra lista, ficha aparece.
4. **Browser B:** abre o app. Loading e depois aparece a ficha criada no Browser A. ✅ **Sync confirmado.**
5. **Browser B:** abre a ficha, edita um campo (ex: HP). Aguarda "Salvo" no header.
6. **Browser A:** F5. Ficha mostra o valor atualizado pelo Browser B. ✅ **Mudança bidirecional.**
7. **Browser A:** arrasta o token no mapa pra outra posição.
8. **Browser B:** F5. Token aparece na nova posição. ✅ **updatePosition funcionou.**
9. **Browser A:** abre **BackupMenu**, clica **Baixar backup**. Arquivo JSON é gerado com a(s) ficha(s).
10. **Browser A:** deleta a ficha de teste (no mapa).
11. **Browser A:** abre **BackupMenu → Mesclar**, seleciona o JSON baixado. Mensagem "1 personagem(ns) importado(s)" aparece.
12. **Browser A:** ficha está de volta na lista.
13. **No painel Supabase → Table Editor → public.characters**, conferir que cada operação alterou as linhas correspondentes (e que nenhuma ficha de outro `owner_id` apareceu).

Anotar qualquer falha. Não fechar a task até os 13 itens passarem.

- [ ] **Step 2: Atualizar CHANGELOG**

Em `CHANGELOG.md`, adicionar logo após a entrada do PR 1 (dentro da mesma seção `[Não lançado]`):

```markdown
### Adicionado (PR 2 — Fichas no Postgres)
- Persistência das fichas migrada de `localStorage` para Supabase Postgres
  (tabela `public.characters` com RLS owner-only).
- Fichas agora sincronizam entre dispositivos da mesma conta automaticamente
  (refresh manual ainda necessário — realtime fica pra PR 5).
- `storage.js` mantém a mesma fachada de funções, agora todas `async`.
- RPCs `update_character_position` (jsonb_set) e `touch_character_last_opened`
  evitam reescrever o payload completo em operações de alta frequência.
- Limite anti-abuse: 100 fichas por conta + 200 KB por ficha.

### Removido (PR 2)
- Persistência de fichas em `localStorage`. Backup local (export JSON) continua
  funcionando como mecanismo de portabilidade.
- Listener cross-tab `storage` event no `CharacterList` (não se aplica mais).

### Notas (PR 2)
- Setup adicional: aplicar migration `supabase/migrations/0002_characters.sql`
  no SQL Editor do Supabase antes do primeiro uso.
```

- [ ] **Step 3: Commit + push**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): PR 2 — fichas migradas pra Postgres"
git push
```

---

## Critério de aceite do PR

- [ ] `npm run build` passa.
- [ ] `npx vitest run src/test/storage.test.js` — 12 testes verdes.
- [ ] `npx vitest run src/test/auth/ src/test/lib/` — todos os testes do PR 1 ainda passam.
- [ ] `npx vitest run src/test/CharacterList/CharacterList.test.jsx` — verde.
- [ ] Smoke manual da Task 9 — 13 itens — completo.
- [ ] Migration aplicada no dashboard Supabase com tabela `characters` visível.
- [ ] Sem `localStorage.setItem` ou `.getItem` envolvendo dados de ficha em `src/` (ok pra `VIEW_MODE_STORAGE_KEY` e `CAMPAIGN_NAME_STORAGE_KEY`, que são preferências de UI).
- [ ] Sem chamadas sync a storage em código de produção (`grep -rn "loadCharacters\(\)\|upsertCharacter\(" src/ | grep -v "await\|=>"` deve estar vazio modulo declarações).

## Fora do escopo deste PR (vai pra PR 3+)

- Tabelas `campaigns`, `campaign_members` e RPCs associadas.
- UI de mesas / convites.
- DM ler fichas de jogadores.
- AccountMenu completo (Minha conta, Apagar conta).
- Realtime entre dispositivos sem F5.
- Banner persistente de erro de rede em `useAutoSave`.
- Migração de UI antiga em `src/test/integration/characterList.test.jsx` (testes obsoletos).
