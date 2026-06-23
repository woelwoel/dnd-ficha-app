# Fronteira multi-sistema — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair todo o D&D 5e pra trás de um contrato `System`, fazendo a casca (storage, roteamento, lista, mesas) rotear por sistema — sem mudar o comportamento visível, deixando o app pronto pra um 2o sistema (Daggerheart) entrar como "criar uma pasta + uma linha no registry".

**Architecture:** Duas fases. **Fase A** = relocação pura dos arquivos de D&D pra `src/systems/dnd5e/`, só mudando caminhos de import (zero lógica nova, zero banco; a suíte de 1017 testes é o guardião). **Fase B** = introduzir a costura (envelope compartilhado + registry + adaptador `core`/`ui` + dispatch no storage + roteamento por sistema + vínculo mesa↔sistema com migrations). As entranhas do dnd5e NÃO dependem do contrato — só um adaptador fino conhece.

**Tech Stack:** React + Vite, react-router-dom, Zod (validação), Supabase (Postgres + RLS + RPC), Vitest (`npm test`), RLS harness (`npm run test:rls`).

**Spec:** `docs/superpowers/specs/2026-06-23-multi-sistema-fronteira-design.md`
**Branch:** `multi-sistema-fronteira` · **Ponto de retorno:** tag `pre-multi-sistema` (`8b9f3c1`)

---

## File Structure (alvo)

```
src/
  systems/
    index.js          ← registry de cores (puro): getSystemCore, listSystems
    ui-registry.js    ← React.lazy memoizado: getLazyWizard, getLazySheet
    envelope.js       ← schema compartilhado + parseEnvelope, systemOf, DEFAULT_SYSTEM
    dnd5e/
      core.js         ← adaptador fino: id, name, createCharacter, parseCharacter, migrate, summarize
      ui.js           ← lazy: Wizard, Sheet, DataProvider (cada um self-wrap em SrdProvider)
      domain/         ← movido de src/domain/*
      components/     ← movido: CharacterSheet/, CharacterWizardV2/, Bestiary/, PrintView/, SpellDetailModal, SrdSearchModal, DetailsModal, CantripsGrantPicker
      data/           ← movido: SrdProvider.jsx, fetchSrd.js
  utils/
    characterCodec.js ← novo, compartilhado: parseCharacterDispatch, migrateCharacterDispatch
    storage.js        ← passa a usar characterCodec (dispatch por sistema)
  components/         ← CASCA (ficam): CharacterList/, Campaigns/, Admin/, DiceRoller/, ui/
  App.jsx             ← roteamento por sistema
supabase/migrations/
  0012_character_system.sql   ← coluna gerada `system` em characters
  0013_campaign_system.sql    ← coluna `system` em campaigns + trigger mismatch + create_campaign(p_system)
```

**O que FICA na casca, intocado:** `auth/`, `lib/`, `context/`, `hooks/`, `components/CharacterList`, `components/Campaigns`, `components/Admin`, `components/DiceRoller`, `components/ui`, `ErrorBoundary.jsx`, `PWAUpdatePrompt.jsx`, `PrivacyPage.jsx`.

**O que NÃO se move:** `public/srd-data/*` (mover forçaria bump do `cacheName` do Service Worker em `vite.config.js` e mudaria URLs — risco sem ganho). Os JSONs ficam; o DataProvider busca os mesmos caminhos.

---

## FASE A — Relocação pura (sem banco)

> **Natureza:** isto é mudança de pasta + caminho de import. **Não há TDD aqui** — não existe lógica nova pra testar. A suíte existente É o teste: cada move só está correto quando `npm test` volta verde. O Vitest falha rápido em import não-resolvido, então o loop é: mover → rodar → corrigir imports que o runner apontar → repetir até verde → commit.
>
> **Flake conhecido:** timeout em `LoginScreen`/`ResetPasswordScreen` na suíte cheia (memória `variant-human-feat`). Um vermelho isolado nesses dois é o flake — re-rodar confirma; não é regressão da relocação.

### Task A1: Scaffold + mover `domain/`

**Files:**
- Create: `src/systems/dnd5e/` (diretório)
- Move: `src/domain/*` → `src/systems/dnd5e/domain/*`

- [ ] **Step 1: Criar a estrutura de pastas**

```bash
mkdir -p src/systems/dnd5e/domain src/systems/dnd5e/components src/systems/dnd5e/data
```

- [ ] **Step 2: Mover os 11 arquivos de domain preservando histórico**

```bash
git mv src/domain/attributes.js        src/systems/dnd5e/domain/attributes.js
git mv src/domain/characterSchema.js   src/systems/dnd5e/domain/characterSchema.js
git mv src/domain/conditions.js        src/systems/dnd5e/domain/conditions.js
git mv src/domain/equipment.js         src/systems/dnd5e/domain/equipment.js
git mv src/domain/featureCategories.js src/systems/dnd5e/domain/featureCategories.js
git mv src/domain/featureMeta.js       src/systems/dnd5e/domain/featureMeta.js
git mv src/domain/itemLookup.js        src/systems/dnd5e/domain/itemLookup.js
git mv src/domain/magicItems.js        src/systems/dnd5e/domain/magicItems.js
git mv src/domain/racialBonuses.js     src/systems/dnd5e/domain/racialBonuses.js
git mv src/domain/rules.js             src/systems/dnd5e/domain/rules.js
git mv src/domain/subclassSpells.js    src/systems/dnd5e/domain/subclassSpells.js
```

- [ ] **Step 3: Corrigir imports — loop guiado pelo runner**

Rode `npm test` e corrija cada erro de import não-resolvido que aparecer. Mapeamento de referência:
- Imports **dentro** de `domain/` que apontam pra outro arquivo de domain (`./rules`, `./attributes`) → **não mudam** (moveram juntos).
- Imports **dentro** de `domain/` pra fora (ex.: `../lib/supabase`, `../utils/...`) → ganham mais um nível: `../../lib/supabase`, `../../utils/...`.
- Imports **de fora** pra domain (em componentes, utils, testes): `../domain/rules` / `../../domain/rules` etc. → reapontam pra `../systems/dnd5e/domain/rules` ajustando a profundidade relativa.

Use busca global por `domain/` pra achar todos os importadores: `grep -rn "domain/" src --include=*.js --include=*.jsx`.

- [ ] **Step 4: Rodar a suíte até verde**

Run: `npm test`
Expected: PASS (mesmo total de testes de antes do move; ignore flake isolado de Login/Reset — re-rode pra confirmar).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(systems): move domain/* para systems/dnd5e/domain (relocacao pura)"
```

### Task A2: Mover os data providers do D&D

**Files:**
- Move: `src/providers/SrdProvider.jsx` → `src/systems/dnd5e/data/SrdProvider.jsx`
- Move: `src/utils/fetchSrd.js` → `src/systems/dnd5e/data/fetchSrd.js`

- [ ] **Step 1: Mover**

```bash
git mv src/providers/SrdProvider.jsx src/systems/dnd5e/data/SrdProvider.jsx
git mv src/utils/fetchSrd.js         src/systems/dnd5e/data/fetchSrd.js
```

- [ ] **Step 2: Corrigir imports (mesmo loop da A1)**

Importadores conhecidos de `SrdProvider`/`useSrd`/`useLazySrdDataset`/`useClassDataMap`: vários componentes em `CharacterSheet/`, `CharacterWizardV2/`, `Bestiary/`, mais `App.jsx`. Achar todos: `grep -rn "providers/SrdProvider\|utils/fetchSrd" src`. O `App.jsx` ainda importa `SrdProvider` daqui — será religado na Fase B; por ora só ajuste o caminho pra `./systems/dnd5e/data/SrdProvider`.

- [ ] **Step 3: Suíte verde**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(systems): move SrdProvider e fetchSrd para systems/dnd5e/data"
```

### Task A3: Mover os componentes do D&D

**Files:**
- Move: `src/components/CharacterSheet/` → `src/systems/dnd5e/components/CharacterSheet/`
- Move: `src/components/CharacterWizardV2/` → `src/systems/dnd5e/components/CharacterWizardV2/`
- Move: `src/components/Bestiary/` → `src/systems/dnd5e/components/Bestiary/`
- Move: `src/components/PrintView/` → `src/systems/dnd5e/components/PrintView/`
- Move: `src/components/SpellDetailModal.jsx`, `SrdSearchModal.jsx`, `DetailsModal.jsx`, `CantripsGrantPicker.jsx` → `src/systems/dnd5e/components/`

- [ ] **Step 1: Mover diretórios e arquivos soltos de D&D**

```bash
git mv src/components/CharacterSheet     src/systems/dnd5e/components/CharacterSheet
git mv src/components/CharacterWizardV2  src/systems/dnd5e/components/CharacterWizardV2
git mv src/components/Bestiary           src/systems/dnd5e/components/Bestiary
git mv src/components/PrintView          src/systems/dnd5e/components/PrintView
git mv src/components/SpellDetailModal.jsx   src/systems/dnd5e/components/SpellDetailModal.jsx
git mv src/components/SrdSearchModal.jsx     src/systems/dnd5e/components/SrdSearchModal.jsx
git mv src/components/DetailsModal.jsx       src/systems/dnd5e/components/DetailsModal.jsx
git mv src/components/CantripsGrantPicker.jsx src/systems/dnd5e/components/CantripsGrantPicker.jsx
```

> **Atenção (TopicList/Tooltip/DiceRoller):** `TopicList.jsx` e `Tooltip.jsx` em `src/components/` podem ser usados tanto por D&D quanto pela casca. **Não mova** componentes que a casca (CharacterList/Campaigns/Admin) também importa — confirme com `grep -rn "components/Tooltip\|components/TopicList" src` antes. Se só D&D usa, mova junto; se a casca usa, deixe em `src/components/`.

- [ ] **Step 2: Corrigir imports (loop do runner)**

Estes componentes importam muito de `domain/`, `data/SrdProvider`, e entre si. Ajuste profundidades relativas. Também ajuste os importadores externos: `App.jsx` (lazy de CharacterSheet/CharacterWizardV2), `BestiaryButton` (se ficou na casca), e os testes em `src/test/`. Achar todos: `grep -rn "components/CharacterSheet\|components/CharacterWizardV2\|components/Bestiary\|components/PrintView\|SpellDetailModal\|SrdSearchModal" src`.

- [ ] **Step 3: Suíte verde**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(systems): move componentes de D&D para systems/dnd5e/components"
```

### Task A4: Gate de fim da Fase A

- [ ] **Step 1: Suíte cheia + build**

Run: `npm test`
Expected: PASS (total de testes igual ao de antes da Fase A).

Run: `npm run build`
Expected: build sem erros (pega imports quebrados que o teste não cobre).

- [ ] **Step 2: Verificar que `src/domain/` e `src/providers/` sumiram**

Run: `ls src/domain src/providers 2>/dev/null || echo "OK: removidos"`
Expected: `OK: removidos` (ou erro de "não existe").

- [ ] **Step 3: Commit (se houve ajuste no build)**

```bash
git add -A
git commit -m "refactor(systems): gate fim da Fase A — relocacao completa e verde" --allow-empty
```

---

## FASE B — A costura (contrato + dispatch + migrations)

> A partir daqui há lógica nova → **TDD de verdade** (teste falha → implementa → passa → commit).

### Task B1: Envelope compartilhado

**Files:**
- Create: `src/systems/envelope.js`
- Test: `src/test/systems/envelope.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/systems/envelope.test.js
import { describe, it, expect } from 'vitest'
import { parseEnvelope, systemOf, DEFAULT_SYSTEM } from '../../systems/envelope'

describe('envelope', () => {
  it('default de system é dnd5e quando ausente', () => {
    const r = parseEnvelope({ id: 'abc', meta: { createdAt: 'x', updatedAt: 'y' } })
    expect(r.success).toBe(true)
    expect(r.data.system).toBe('dnd5e')
  })

  it('preserva system explícito', () => {
    const r = parseEnvelope({ id: 'abc', system: 'daggerheart', meta: {} })
    expect(r.success).toBe(true)
    expect(r.data.system).toBe('daggerheart')
  })

  it('systemOf devolve default pra objeto sem system', () => {
    expect(systemOf({ id: 'abc' })).toBe(DEFAULT_SYSTEM)
    expect(systemOf({ id: 'abc', system: 'daggerheart' })).toBe('daggerheart')
  })

  it('rejeita envelope sem id', () => {
    expect(parseEnvelope({ system: 'dnd5e' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- src/test/systems/envelope.test.js`
Expected: FAIL ("Cannot find module '../../systems/envelope'").

- [ ] **Step 3: Implementar**

```js
// src/systems/envelope.js
import { z } from 'zod'

/** Sistema assumido quando uma ficha não declara `system` (fichas legadas). */
export const DEFAULT_SYSTEM = 'dnd5e'

/**
 * Schema do "envelope": os campos que a casca conhece de QUALQUER ficha,
 * independente do sistema. O corpo específico (atributos, combate, magias) é
 * validado pelo módulo do sistema via getSystemCore(system).parseCharacter.
 * passthrough() preserva o corpo intacto.
 */
const envelopeSchema = z.object({
  id: z.string(),
  system: z.string().default(DEFAULT_SYSTEM),
  meta: z.object({}).passthrough().optional(),
  // espelhos relacionais preenchidos por rowToCharacter (opcionais no parse)
  ownerId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  shortId: z.string().nullable().optional(),
  lastOpenedAt: z.number().nullable().optional(),
  version: z.number().nullable().optional(),
}).passthrough()

export function parseEnvelope(raw) {
  return envelopeSchema.safeParse(raw)
}

/** Lê o sistema de um objeto cru, caindo no default quando ausente/ inválido. */
export function systemOf(raw) {
  return (raw && typeof raw.system === 'string' && raw.system) || DEFAULT_SYSTEM
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- src/test/systems/envelope.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/envelope.js src/test/systems/envelope.test.js
git commit -m "feat(systems): envelope compartilhado (system discriminator + parse)"
```

### Task B2: Registry de cores + adaptador dnd5e core

**Files:**
- Create: `src/systems/dnd5e/core.js`
- Create: `src/systems/index.js`
- Test: `src/test/systems/registry.test.js`
- Modify: `src/systems/dnd5e/domain/characterSchema.js` (default de `system`)

- [ ] **Step 1: Adicionar default de `system` ao schema do dnd5e**

No `src/systems/dnd5e/domain/characterSchema.js`, no objeto raiz do personagem (o schema validado por `safeParseCharacter`), adicionar o campo:

```js
// dentro do z.object({ ... }) raiz do personagem:
system: z.string().default('dnd5e'),
```

Isso faz toda ficha (inclusive legada) ganhar `system: 'dnd5e'` ao ser parseada/salva — stamping automático, sem tocar dados.

- [ ] **Step 2: Escrever o teste do registry/core que falha**

```js
// src/test/systems/registry.test.js
import { describe, it, expect } from 'vitest'
import { getSystemCore, listSystems } from '../../systems'

describe('registry de sistemas', () => {
  it('resolve o core do dnd5e', () => {
    const core = getSystemCore('dnd5e')
    expect(core).toBeTruthy()
    expect(core.id).toBe('dnd5e')
    expect(typeof core.parseCharacter).toBe('function')
    expect(typeof core.summarize).toBe('function')
  })

  it('devolve null pra sistema desconhecido', () => {
    expect(getSystemCore('xpto')).toBeNull()
  })

  it('listSystems inclui dnd5e', () => {
    expect(listSystems().some(s => s.id === 'dnd5e')).toBe(true)
  })

  it('summarize do dnd5e monta title/subtitle/badges', () => {
    const core = getSystemCore('dnd5e')
    const s = core.summarize({ info: { name: 'Aragorn', race: 'Humano', class: 'Guerreiro', level: 5 } })
    expect(s.title).toBe('Aragorn')
    expect(s.subtitle).toBe('Humano · Guerreiro')
    expect(s.badges).toContain('Nv 5')
  })

  it('createCharacter carimba system=dnd5e', () => {
    const core = getSystemCore('dnd5e')
    expect(core.createCharacter({ id: 'x' }).system).toBe('dnd5e')
  })
})
```

- [ ] **Step 3: Rodar — deve falhar**

Run: `npm test -- src/test/systems/registry.test.js`
Expected: FAIL ("Cannot find module '../../systems'").

- [ ] **Step 4: Implementar o adaptador `core.js`**

```js
// src/systems/dnd5e/core.js
// Adaptador FINO entre o contrato System e o domínio D&D existente.
// As entranhas (domain/*) não conhecem este arquivo — só ele conhece o contrato.
import { safeParseCharacter, migrateCharacter } from './domain/characterSchema'

export const id = 'dnd5e'
export const name = 'D&D 5e'

/** Carimba o sistema num seed de ficha. O Wizard monta o resto. */
export function createCharacter(seed = {}) {
  return { ...seed, system: id }
}

export function parseCharacter(raw) {
  return safeParseCharacter(raw)
}

export function migrate(raw) {
  return migrateCharacter(raw)
}

/** Resumo agnóstico pra a CharacterList renderizar sem conhecer regras de D&D. */
export function summarize(character) {
  const info = character?.info ?? {}
  return {
    title: info.name || 'Sem nome',
    subtitle: [info.race, info.class].filter(Boolean).join(' · ') || '—',
    badges: info.level != null ? [`Nv ${info.level}`] : [],
    icon: info.class ?? null, // chave usada pelo ClassIcon
  }
}
```

- [ ] **Step 5: Implementar o registry**

```js
// src/systems/index.js
import * as dnd5e from './dnd5e/core'

// Registry de módulos `core` (lógica pura, sem React). Síncrono e leve — pode
// ser importado pelo storage.js sem arrastar a árvore React.
// Adicionar um sistema = importar seu core e adicionar uma entrada aqui.
const CORES = {
  [dnd5e.id]: dnd5e,
}

export function getSystemCore(id) {
  return CORES[id] ?? null
}

export function listSystems() {
  return Object.values(CORES).map(c => ({ id: c.id, name: c.name }))
}
```

- [ ] **Step 6: Rodar — deve passar**

Run: `npm test -- src/test/systems/registry.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/systems/index.js src/systems/dnd5e/core.js src/test/systems/registry.test.js src/systems/dnd5e/domain/characterSchema.js
git commit -m "feat(systems): registry de cores + adaptador dnd5e (parse/migrate/summarize/createCharacter)"
```

### Task B3: Codec de dispatch (validação por sistema)

**Files:**
- Create: `src/utils/characterCodec.js`
- Test: `src/test/systems/characterCodec.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/systems/characterCodec.test.js
import { describe, it, expect } from 'vitest'
import { parseCharacterDispatch, migrateCharacterDispatch } from '../../utils/characterCodec'

const valid = {
  id: '00000000-0000-4000-8000-000000000001',
  meta: { createdAt: 'a', updatedAt: 'b' },
  info: { name: 'X', class: 'guerreiro', race: 'humano', level: 1 },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
}

describe('characterCodec dispatch', () => {
  it('ficha legada (sem system) valida pelo dnd5e', () => {
    const r = parseCharacterDispatch(valid)
    expect(r.success).toBe(true)
    expect(r.data.system).toBe('dnd5e')
  })

  it('sistema desconhecido falha graciosamente (sem throw)', () => {
    const r = parseCharacterDispatch({ ...valid, system: 'daggerheart' })
    expect(r.success).toBe(false)
    expect(Array.isArray(r.error.issues)).toBe(true)
  })

  it('migrate desconhecido devolve o raw intocado', () => {
    const raw = { ...valid, system: 'daggerheart' }
    expect(migrateCharacterDispatch(raw)).toBe(raw)
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- src/test/systems/characterCodec.test.js`
Expected: FAIL ("Cannot find module '../../utils/characterCodec'").

- [ ] **Step 3: Implementar**

```js
// src/utils/characterCodec.js
// Camada de dispatch: a casca valida só o envelope e delega o corpo da ficha
// pro módulo do sistema. Mantém storage.js agnóstico a sistema.
import { getSystemCore } from '../systems'
import { parseEnvelope, systemOf } from '../systems/envelope'

/**
 * Valida uma ficha crua escolhendo o validador pelo `system`. Mesma forma de
 * retorno do zod safeParse: { success, data } | { success:false, error }.
 * Sistema não registrado → failure graciosa (caller já trata como ficha
 * rejeitada via reportError; não derruba a lista).
 */
export function parseCharacterDispatch(raw) {
  const env = parseEnvelope(raw)
  if (!env.success) return env

  const sys = systemOf(raw)
  const core = getSystemCore(sys)
  if (!core) {
    return {
      success: false,
      error: { issues: [{ path: ['system'], message: `sistema não registrado: ${sys}` }] },
    }
  }
  return core.parseCharacter(raw)
}

/** Migração incremental escolhida pelo sistema. Desconhecido → raw intocado. */
export function migrateCharacterDispatch(raw) {
  const core = getSystemCore(systemOf(raw))
  return core ? core.migrate(raw) : raw
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- src/test/systems/characterCodec.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/characterCodec.js src/test/systems/characterCodec.test.js
git commit -m "feat(systems): characterCodec — valida envelope + delega corpo ao sistema"
```

### Task B4: Religar `storage.js` ao dispatch

**Files:**
- Modify: `src/utils/storage.js` (linha 1 e os usos de `safeParseCharacter`/`migrateCharacter`)
- Test: `src/test/storage.test.js` (já existe — guardião) + adicionar caso de sistema desconhecido

- [ ] **Step 1: Escrever o teste novo que falha**

Adicionar ao `src/test/storage.test.js` (ou criar `src/test/storage-system.test.js`) um caso que carrega uma row com `system` desconhecido e espera que seja ignorada sem derrubar as demais. Como `loadCharacters` usa o cliente Supabase mockado, siga o padrão de mock já existente no arquivo. Esqueleto:

```js
it('ignora ficha de sistema não registrado sem derrubar a lista', async () => {
  // mock: retorna 2 rows — uma dnd5e válida, uma com data.system='daggerheart'
  // (use o mesmo mock de supabase.from(...).select(...) usado nos outros testes)
  const result = await loadCharacters('mine')
  expect(result).toHaveLength(1)
  expect(result[0].system).toBe('dnd5e')
})
```

> Se o arquivo de teste atual não mocka o Supabase de forma reaproveitável, replique o setup de mock do teste vizinho mais próximo no mesmo arquivo. NÃO invente um mock novo de outro formato.

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- src/test/storage.test.js`
Expected: FAIL (a ficha desconhecida hoje seria rejeitada pelo schema dnd5e por outros motivos, ou aceita errado — confirme o vermelho antes de seguir).

- [ ] **Step 3: Trocar os imports e usos no `storage.js`**

Linha 1 — substituir:

```js
import { safeParseCharacter, migrateCharacter } from '../domain/characterSchema'
```

por:

```js
import { parseCharacterDispatch, migrateCharacterDispatch } from './characterCodec'
```

Depois, substituir TODAS as chamadas no arquivo:
- `safeParseCharacter(` → `parseCharacterDispatch(`
- `migrateCharacter(` → `migrateCharacterDispatch(`

Locais: `validateForSave` (usa migrate + parse), `loadCharacters` (parse no loop), `loadCharacterById`, `loadCharacterByRouteParam`. Confirme com `grep -n "safeParseCharacter\|migrateCharacter" src/utils/storage.js` que sobrou zero.

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- src/test/storage.test.js`
Expected: PASS

- [ ] **Step 5: Suíte cheia (storage é central)**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/storage.js src/test/storage.test.js
git commit -m "refactor(storage): dispatch de validacao por sistema via characterCodec"
```

### Task B5: UI registry (lazy por sistema) + módulo `ui.js` do dnd5e

**Files:**
- Create: `src/systems/dnd5e/ui.js`
- Create: `src/systems/ui-registry.js`
- Test: `src/test/systems/ui-registry.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/systems/ui-registry.test.js
import { describe, it, expect } from 'vitest'
import { getLazyWizard, getLazySheet } from '../../systems/ui-registry'

describe('ui-registry', () => {
  it('devolve componente lazy pro dnd5e', () => {
    expect(getLazyWizard('dnd5e')).toBeTruthy()
    expect(getLazySheet('dnd5e')).toBeTruthy()
  })
  it('memoiza (mesma referência entre chamadas)', () => {
    expect(getLazyWizard('dnd5e')).toBe(getLazyWizard('dnd5e'))
  })
  it('devolve null pra sistema sem UI', () => {
    expect(getLazyWizard('xpto')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- src/test/systems/ui-registry.test.js`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementar `ui.js` do dnd5e**

```js
// src/systems/dnd5e/ui.js
// UI do sistema D&D 5e. Cada superfície self-wrap no SrdProvider (o provider de
// dados de D&D), pra que a casca não precise carregar dados de D&D na raiz.
import { SrdProvider } from './data/SrdProvider'
import { CharacterWizardV2 } from './components/CharacterWizardV2'
import { CharacterSheet as RawSheet } from './components/CharacterSheet/CharacterSheet'

export function Wizard(props) {
  return (
    <SrdProvider>
      <CharacterWizardV2 {...props} />
    </SrdProvider>
  )
}

export function Sheet(props) {
  return (
    <SrdProvider>
      <RawSheet {...props} />
    </SrdProvider>
  )
}

export { SrdProvider as DataProvider }
```

> Confirme os nomes de export reais de `CharacterWizardV2/index` e `CharacterSheet/CharacterSheet` (no `App.jsx` atual eles são importados como `m.CharacterWizardV2` e `m.CharacterSheet`). Ajuste o import se o caminho do índice diferir.

- [ ] **Step 4: Implementar o ui-registry**

```js
// src/systems/ui-registry.js
import { lazy } from 'react'

// Loaders dinâmicos do módulo `ui` de cada sistema (Wizard/Sheet/DataProvider
// são pesados → lazy). Adicionar sistema = uma entrada aqui.
const UI_LOADERS = {
  dnd5e: () => import('./dnd5e/ui'),
}

// Memoiza os React.lazy por (sistema, parte) — lazy precisa ser estável entre
// renders, senão remonta a árvore a cada render.
const cache = new Map()

function getLazy(systemId, key) {
  const loader = UI_LOADERS[systemId]
  if (!loader) return null
  const cacheKey = `${systemId}:${key}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const Comp = lazy(() => loader().then(m => ({ default: m[key] })))
  cache.set(cacheKey, Comp)
  return Comp
}

export const getLazyWizard = (systemId) => getLazy(systemId, 'Wizard')
export const getLazySheet = (systemId) => getLazy(systemId, 'Sheet')
```

- [ ] **Step 5: Rodar — deve passar**

Run: `npm test -- src/test/systems/ui-registry.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/ui.js src/systems/ui-registry.js src/test/systems/ui-registry.test.js
git commit -m "feat(systems): ui-registry lazy + modulo ui do dnd5e (self-wrap SrdProvider)"
```

### Task B6: `getCharacterSystem` no storage (pro roteamento)

**Files:**
- Modify: `src/utils/storage.js` (nova função export)
- Test: `src/test/storage.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
it('getCharacterSystem lê a coluna system, com fallback pro blob', async () => {
  // mock 1: select 'system' devolve { system: 'dnd5e' }
  // mock 2 (erro de coluna inexistente 42703): cai no select '*' e lê data.system
  const sys = await getCharacterSystem('00000000-0000-4000-8000-000000000001')
  expect(sys).toBe('dnd5e')
})
```

> Use o mesmo padrão de mock do arquivo. Importar `getCharacterSystem` no topo do teste.

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- src/test/storage.test.js`
Expected: FAIL ("getCharacterSystem is not a function")

- [ ] **Step 3: Implementar**

```js
// adicionar em src/utils/storage.js
import { DEFAULT_SYSTEM } from '../systems/envelope'

/**
 * Resolve só o sistema de uma ficha pra o roteamento escolher a UI certa, sem
 * baixar/parsear o blob inteiro. Usa a coluna gerada `system` (migration 0012);
 * se a coluna ainda não existe (42703), cai no fallback de ler data.system.
 */
export async function getCharacterSystem(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('system')
    .eq('id', id)
    .maybeSingle()
  if (!error && data?.system) return data.system
  // Fallback: coluna ausente (migration não aplicada) ou linha sem system.
  const { data: row } = await supabase.from(TABLE).select('data').eq('id', id).maybeSingle()
  return row?.data?.system ?? DEFAULT_SYSTEM
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- src/test/storage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.js src/test/storage.test.js
git commit -m "feat(storage): getCharacterSystem (coluna gerada + fallback no blob)"
```

### Task B7: Roteamento por sistema no `App.jsx`

**Files:**
- Modify: `src/App.jsx`
- Create: `src/components/SystemPicker.jsx` (seletor de sistema)
- Test: `src/test/App-routing.test.jsx` (novo) — testa skip do picker com 1 sistema e dispatch da Sheet

- [ ] **Step 1: Escrever o teste que falha**

```jsx
// src/test/App-routing.test.jsx
import { describe, it, expect } from 'vitest'
import { listSystems } from '../systems'

// Com 1 sistema registrado, o seletor é pulado. Este teste fixa o invariante de
// produto: enquanto só houver dnd5e, criar ficha não pede sistema.
describe('roteamento por sistema', () => {
  it('com 1 sistema, listSystems tem comprimento 1 (picker é pulado)', () => {
    expect(listSystems()).toHaveLength(1)
  })
})
```

> Testar a `App` inteira com router exige montar `MemoryRouter` + mocks de auth/supabase. Se o arquivo `src/test/` já tiver um helper pra isso (procure `MemoryRouter` em `src/test`), use-o pra um teste de integração que monta `/new` e afirma que o Wizard do dnd5e aparece sem tela de seleção. Caso contrário, o teste de invariante acima é suficiente pra esta task; o smoke test manual (Task B12) cobre o fluxo real.

- [ ] **Step 2: Rodar — deve falhar/passar**

Run: `npm test -- src/test/App-routing.test.jsx`
Expected: PASS já (listSystems=1). Serve de regressão pra quando entrar o 2o sistema.

- [ ] **Step 3: Criar o SystemPicker**

```jsx
// src/components/SystemPicker.jsx
import { listSystems } from '../systems'

/** Tela simples de escolha de sistema. Só aparece quando há 2+ sistemas. */
export function SystemPicker({ onPick, onBack }) {
  const systems = listSystems()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-amber-400 text-lg">Escolha o sistema</h1>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {systems.map(s => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="rounded border border-amber-700 px-4 py-3 text-left hover:bg-amber-950"
          >
            {s.name}
          </button>
        ))}
      </div>
      <button onClick={onBack} className="text-gray-400 text-sm underline">Voltar</button>
    </div>
  )
}
```

- [ ] **Step 4: Reescrever `NewRoute` e `SheetRoute` no `App.jsx`**

Remover os `lazyWithReload` fixos de `CharacterSheet` e `CharacterWizard` (linhas ~42-47) e a importação raiz de `SrdProvider`. Substituir por roteamento dinâmico:

```jsx
// topo do App.jsx
import { useState, useEffect } from 'react'
import { getLazyWizard, getLazySheet } from './systems/ui-registry'
import { listSystems, getSystemCore } from './systems'
import { DEFAULT_SYSTEM } from './systems/envelope'
import { getCharacterSystem } from './utils/storage'
import { getCampaignSystem } from './lib/campaigns'   // criada na Task B9
import { SystemPicker } from './components/SystemPicker'
```

```jsx
function NewRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const raw = params.get('campaignId')
  const campaignId = raw && UUID_RE.test(raw) ? raw : null
  const initialCampaignId = params.has('campaignId') && campaignId ? campaignId : undefined

  const systems = listSystems()
  const paramSystem = params.get('system')
  const [resolved, setResolved] = useState(null) // system id final, ou null enquanto decide

  useEffect(() => {
    let alive = true
    async function decide() {
      // 1) dentro de mesa → sistema forçado pela mesa
      if (campaignId) {
        const s = await getCampaignSystem(campaignId)
        if (alive) setResolved(getSystemCore(s) ? s : DEFAULT_SYSTEM)
        return
      }
      // 2) system explícito na URL e válido
      if (paramSystem && getSystemCore(paramSystem)) { if (alive) setResolved(paramSystem); return }
      // 3) único sistema → pula o picker
      if (systems.length === 1) { if (alive) setResolved(systems[0].id); return }
      // 4) precisa escolher
      if (alive) setResolved('')
    }
    decide()
    return () => { alive = false }
  }, [campaignId, paramSystem]) // systems é estável

  if (resolved === null) return <Loader />
  if (resolved === '') {
    return <SystemPicker
      onPick={(id) => navigate(`/new?system=${id}${campaignId ? `&campaignId=${campaignId}` : ''}`)}
      onBack={() => navigate('/')}
    />
  }
  const Wizard = getLazyWizard(resolved)
  if (!Wizard) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <Wizard
        initialCampaignId={initialCampaignId}
        onBack={() => navigate('/')}
        onComplete={(id) => navigate(`/c/${id}`, { replace: true })}
      />
    </RouteShell>
  )
}

function SheetRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const adminContext = params.get('adm') === '1'
  const [system, setSystem] = useState(null)

  useEffect(() => {
    let alive = true
    getCharacterSystem(id).then(s => { if (alive) setSystem(s) })
    return () => { alive = false }
  }, [id])

  if (system === null) return <Loader />
  const Sheet = getLazySheet(system)
  if (!Sheet) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <Sheet characterId={id} adminContext={adminContext} onBack={() => navigate('/')} />
    </RouteShell>
  )
}
```

- [ ] **Step 5: Mover o `SrdProvider` da raiz + fazer o BestiaryButton se auto-prover**

No `App()`, remover `<SrdProvider>...</SrdProvider>` de volta da árvore raiz (Wizard/Sheet já se embrulham via `ui.js`). O `BestiaryButton` (chrome global em `AuthedRoutes`) usa SRD — envolvê-lo no seu próprio provider:

```jsx
import { SrdProvider } from './systems/dnd5e/data/SrdProvider'
// ... em AuthedRoutes, trocar <BestiaryButton /> por:
<SrdProvider><BestiaryButton /></SrdProvider>
```

> O `moduleCache` do SrdProvider é a nível de módulo, então múltiplas instâncias compartilham o fetch — não há refetch duplicado. (Quando o 2o sistema entrar, o BestiaryButton vira system-aware; por ora segue D&D.)

- [ ] **Step 6: Suíte + build**

Run: `npm test` e `npm run build`
Expected: PASS / build limpo.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/SystemPicker.jsx src/test/App-routing.test.jsx
git commit -m "feat(app): roteamento por sistema (picker auto-skip, Sheet dispatch, SrdProvider sai da raiz)"
```

### Task B8: `CharacterList` consome `summarize()`

**Files:**
- Modify: `src/components/CharacterList/CharacterListView.jsx` (~linhas 157-171)
- Test: cobertura existente da lista (guardião)

- [ ] **Step 1: Trocar a montagem do card por `summarize`**

No `CharacterListView.jsx`, importar o resolvedor e usar a saída no card. Como a lista pode conter fichas de sistemas diferentes no futuro, resolver por ficha:

```jsx
import { getSystemCore } from '../../systems'
import { DEFAULT_SYSTEM } from '../../systems/envelope'

function summaryOf(character) {
  const core = getSystemCore(character.system ?? DEFAULT_SYSTEM)
  return core ? core.summarize(character) : { title: character?.info?.name || 'Sem nome', subtitle: '—', badges: [], icon: null }
}
```

No render do card, substituir o uso direto de `info.name`/`info.level`/`info.race`/`info.class` (linhas ~157-171) pelos campos de `const s = summaryOf(character)`: `s.title`, `s.subtitle`, `s.badges`, e `ClassIcon classKey={s.icon}`.

> A busca (linhas 57-59) e o `ClassIcon` continuam D&D-ish por ora — documentado como dnd5e-ism, sem mudança nesta task.

- [ ] **Step 2: Suíte verde**

Run: `npm test`
Expected: PASS (testes da lista continuam passando — mesma saída visual pra D&D).

- [ ] **Step 3: Commit**

```bash
git add src/components/CharacterList/CharacterListView.jsx
git commit -m "refactor(list): card usa summarize() do sistema em vez de campos D&D diretos"
```

### Task B9: Mesa ↔ sistema (cliente)

**Files:**
- Modify: `src/lib/campaigns.js` (`createCampaign` passa `p_system`; nova `getCampaignSystem`; precheck de mismatch em `moveCharacterToCampaign`)
- Modify: telas de criação de mesa em `src/components/Campaigns` (passar sistema escolhido; pular se 1 sistema)
- Test: `src/test/campaigns-system.test.js` (novo)

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/campaigns-system.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mockar o supabase client como nos demais testes de lib. Esqueleto:
vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }))
import { supabase } from '../lib/supabase'
import { createCampaign, getCampaignSystem } from '../lib/campaigns'

beforeEach(() => vi.clearAllMocks())

describe('mesa ↔ sistema', () => {
  it('createCampaign passa p_system', async () => {
    supabase.rpc.mockResolvedValue({ data: 'cid', error: null })
    await createCampaign('Mesa X', 'dnd5e')
    expect(supabase.rpc).toHaveBeenCalledWith('create_campaign', { p_name: 'Mesa X', p_system: 'dnd5e' })
  })

  it('getCampaignSystem lê a coluna system', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { system: 'dnd5e' }, error: null })
    supabase.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) })
    expect(await getCampaignSystem('cid')).toBe('dnd5e')
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- src/test/campaigns-system.test.js`
Expected: FAIL (assinatura antiga / função inexistente).

- [ ] **Step 3: Implementar no `campaigns.js`**

Trocar `createCampaign`:

```js
import { DEFAULT_SYSTEM } from '../systems/envelope'

export async function createCampaign(name, system = DEFAULT_SYSTEM) {
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name, p_system: system })
  if (error) {
    if (/too_many_campaigns/.test(error.message)) return { ok: false, reason: 'too-many-campaigns' }
    if (/invalid_name/.test(error.message)) return { ok: false, reason: 'invalid-name' }
    logDev('createCampaign', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true, id: data }
}

/** Sistema de uma mesa (pra forçar o sistema na criação de ficha dentro dela). */
export async function getCampaignSystem(campaignId) {
  const { data, error } = await supabase
    .from(T_CAMPAIGNS).select('system').eq('id', campaignId).maybeSingle()
  if (error || !data?.system) return DEFAULT_SYSTEM
  return data.system
}
```

Em `moveCharacterToCampaign`, traduzir o erro do trigger pra mensagem amigável (adicionar antes do `return { ok:false, reason:'unknown' }`):

```js
if (/system_mismatch/.test(error.message)) {
  return { ok: false, reason: 'system-mismatch' }
}
```

- [ ] **Step 4: UI de criar mesa passa o sistema**

Na tela que chama `createCampaign(name)` (procure em `src/components/Campaigns`), se `listSystems().length > 1`, mostrar escolha de sistema antes de criar; senão chamar `createCampaign(name, listSystems()[0].id)`. Importar `listSystems` de `../../systems`.

- [ ] **Step 5: Rodar — deve passar**

Run: `npm test -- src/test/campaigns-system.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/campaigns.js src/components/Campaigns src/test/campaigns-system.test.js
git commit -m "feat(campaigns): mesa carrega sistema (createCampaign p_system, getCampaignSystem, mismatch amigavel)"
```

### Task B10: Migration 0012 — coluna gerada `system` em `characters`

**Files:**
- Create: `supabase/migrations/0012_character_system.sql`

- [ ] **Step 1: Escrever a migration (com down documentado)**

```sql
-- supabase/migrations/0012_character_system.sql
-- Coluna `system` derivada do blob JSONB. Fonte da verdade segue sendo
-- data->>'system'; a coluna é só pra roteamento/filtro server-side. Fichas
-- legadas (sem o campo) derivam 'dnd5e' via coalesce — backfill automático.

alter table public.characters
  add column system text
  generated always as (lower(coalesce(data->>'system', 'dnd5e'))) stored;

create index if not exists characters_system_idx on public.characters (system);

-- ── DOWN (rollback) ─────────────────────────────────────────────────
-- drop index if exists characters_system_idx;
-- alter table public.characters drop column if exists system;
```

- [ ] **Step 2: Aplicar no SQL Editor do Supabase**

Antes: exportar (snapshot manual) a tabela `characters`. Depois colar e rodar a migration.
Expected: sem erro; `select system, count(*) from characters group by system` mostra todas como `dnd5e`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0012_character_system.sql
git commit -m "feat(db): coluna gerada system em characters (0012)"
```

### Task B11: Migration 0013 — `system` em `campaigns` + trigger + `create_campaign`

**Files:**
- Create: `supabase/migrations/0013_campaign_system.sql`

- [ ] **Step 1: Escrever a migration (com down)**

```sql
-- supabase/migrations/0013_campaign_system.sql
-- Mesa carrega o sistema (escolhido na criação). Default backfilla mesas
-- existentes como dnd5e. Trigger garante que uma ficha só entre em mesa do
-- mesmo sistema. create_campaign ganha p_system.

-- 1) coluna
alter table public.campaigns
  add column system text not null default 'dnd5e';

-- 2) trigger de integridade ficha↔mesa
create or replace function public.assert_character_campaign_system()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign_system text;
begin
  if new.campaign_id is not null then
    select system into v_campaign_system from public.campaigns where id = new.campaign_id;
    -- new.system é a coluna gerada (data->>'system' | 'dnd5e')
    if v_campaign_system is not null and new.system <> v_campaign_system then
      raise exception 'system_mismatch' using errcode = 'P0004',
        hint = 'A ficha e a mesa precisam ser do mesmo sistema.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists characters_assert_system on public.characters;
create trigger characters_assert_system
  before insert or update on public.characters
  for each row execute function public.assert_character_campaign_system();

-- 3) create_campaign ganha p_system (recriar — mudar assinatura)
drop function if exists public.create_campaign(text);

create function public.create_campaign(p_name text, p_system text default 'dnd5e')
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_code text;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) = 0 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  select count(*) into v_count from public.campaigns where dm_id = v_uid;
  if v_count >= 20 then
    raise exception 'too_many_campaigns' using errcode = 'P0003',
      hint = 'Limite de 20 mesas por DM. Apague uma antiga antes.';
  end if;

  v_code := public.gen_campaign_invite_code();

  insert into public.campaigns (name, dm_id, invite_code, system)
    values (btrim(p_name), v_uid, v_code, coalesce(p_system, 'dnd5e'))
    returning id into v_id;

  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_id, v_uid, 'dm');

  return v_id;
end;
$$;

-- ── DOWN (rollback) ─────────────────────────────────────────────────
-- drop trigger if exists characters_assert_system on public.characters;
-- drop function if exists public.assert_character_campaign_system();
-- drop function if exists public.create_campaign(text, text);
--   (e recriar a versão (text) a partir de 0005_review_fixes.sql)
-- alter table public.campaigns drop column if exists system;
```

> **Confirme antes de rodar:** que `create_campaign` mais recente nas migrations é a de `0005_review_fixes.sql` (com cap de 20). Se houver uma versão mais nova em migration posterior, parta DELA, não desta.

- [ ] **Step 2: Aplicar no Supabase**

Antes: snapshot manual de `campaigns`. Rodar a migration.
Expected: sem erro; mesas existentes têm `system='dnd5e'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_campaign_system.sql
git commit -m "feat(db): system em campaigns + trigger mismatch + create_campaign(p_system) (0013)"
```

### Task B12: Testes de RLS/DB + verificação final

**Files:**
- Modify: `scripts/test-rls-isolation.mjs` (adicionar casos de sistema)

- [ ] **Step 1: Adicionar casos ao harness de RLS**

No `scripts/test-rls-isolation.mjs`, seguindo o padrão dos casos existentes, adicionar:
1. Inserir ficha legada (data sem `system`) → `select system` devolve `'dnd5e'`.
2. Inserir ficha com `data.system='daggerheart'` → coluna `system` reflete `'daggerheart'`.
3. Criar mesa via `create_campaign(p_name, 'dnd5e')` e ligar ficha dnd5e → OK.
4. Tentar ligar ficha (system=daggerheart) a mesa dnd5e → erro `system_mismatch`.
5. Ficha+mesa existentes (ambos dnd5e) → ligar continua OK (não regrediu).

- [ ] **Step 2: Rodar o harness contra o banco real**

Run: `npm run test:rls`
Expected: PASS (inclusive os 5 casos novos).

- [ ] **Step 3: Suíte completa + build + lint dos arquivos tocados**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: build limpo.

Run: `npx eslint src/systems src/utils/characterCodec.js src/utils/storage.js src/App.jsx`
Expected: sem erros NOS ARQUIVOS NOVOS/TOCADOS (ignorar o backlog de ~611 erros pré-existentes em outros arquivos — memória `lint-debt-ungated`).

- [ ] **Step 4: Smoke test no app real**

Run: `npm run dev` e no navegador:
1. Criar ficha de D&D — o seletor de sistema **não** deve aparecer (só 1 sistema). Wizard abre direto.
2. Abrir uma ficha existente — carrega como D&D normalmente.
3. A lista renderiza nome/raça/classe/nível dos cards igual antes.
4. Criar uma mesa, mover uma ficha pra ela — funciona.
5. Bestiário (botão global) abre e lista monstros.

- [ ] **Step 5: Commit final da fase**

```bash
git add scripts/test-rls-isolation.mjs
git commit -m "test(db): casos de RLS pra system (coluna gerada, trigger mismatch)"
```

---

## Self-Review (cobertura do spec)

- **Contrato core/ui** → B2 (core), B5 (ui + ui-registry). ✓
- **Registry** → B2 (`getSystemCore`/`listSystems`), B5 (`getLazyWizard`/`getLazySheet`). ✓
- **Discriminador system no blob + default** → B2 step 1 (schema default), envelope B1. ✓
- **Coluna gerada** → B10. ✓
- **Validação despachada (envelope + corpo)** → B1, B3, B4 (storage rewire). ✓
- **Sistema desconhecido gracioso** → B3 + B4 (teste de lista). ✓
- **Runtime não depende de migration** → B6 (`getCharacterSystem` com fallback), B4 (parse lê system do blob). ✓
- **Roteamento /new (picker auto-skip) e /c/:id (dispatch)** → B7. ✓
- **DataProvider sai da raiz + BestiaryButton self-provide** → B7 step 5. ✓
- **Mesa↔sistema (coluna, trigger, create_campaign, força na criação)** → B9 (cliente), B11 (DB). ✓
- **summarize na lista** → B8. ✓
- **Testes + manter verde + lint só nos tocados + smoke** → A4, B12. ✓
- **Rollback** → tag/branch já criados; migrations com DOWN documentado em B10/B11. ✓

**Costuras adiadas (não são tasks, por design):** DiceRoller d20, mapa/tokens, `campaign_roster` D&D-shaped, BestiaryButton system-aware. Documentadas no spec §"Costuras adiadas".
