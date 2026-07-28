# Construtor de Encontros — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Mestre um medidor de dificuldade ao vivo e encontros salvos e nomeados, para preparar o combate antes da sessão em vez de montar o grupo de monstros na hora.

**Architecture:** Domínio puro novo com a tabela de limiares e a escada de multiplicadores; uma tabela `encounter_templates` só do Mestre guardando a RECEITA do encontro (`[{ monsterIndex, count }]`); o painel de montar monstros é extraído do `SetupPanel` para ser reusado pela rota nova de preparação.

**Tech Stack:** React 19 + Vite, Supabase (Postgres + RLS), Vitest + Testing Library, Playwright.

**Spec:** [`docs/superpowers/specs/2026-07-27-construtor-de-encontros-design.md`](../specs/2026-07-27-construtor-de-encontros-design.md)

---

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `src/systems/dnd5e/domain/party.js` | nível total de uma ficha (soma multiclasse, clamp 1..20) |
| `src/systems/dnd5e/domain/encounterDifficulty.js` | limiares, escada de multiplicadores, faixa |
| `src/lib/encounterTemplates.js` | CRUD dos encontros salvos |
| `src/systems/dnd5e/components/Encounter/DifficultyMeter.jsx` | XP bruto/ajustado, faixa e controles de companhia |
| `src/systems/dnd5e/components/Encounter/MonsterGroupPanel.jsx` | montar grupo de monstros (extraído do `SetupPanel`) |
| `src/systems/dnd5e/components/Encounter/EncounterLibraryScreen.jsx` | a rota de preparação |
| `supabase/migrations/0017_encounter_templates.sql` | tabela + RLS + trigger |

**Modificados:**

| Arquivo | Mudança |
|---|---|
| `SetupPanel.jsx` | usa o `MonsterGroupPanel`; ganha medidor e "Carregar encontro salvo" |
| `EncounterScreen.jsx` | `party` passa a carregar `level` |
| `data/SrdProvider.jsx` | registra `monsters` como dataset preguiçoso (hoje só o `BestiaryModal` carrega, com fetch próprio) |
| `ui.jsx`, `ui-registry.js`, `App.jsx`, `CampaignDetail.jsx` | expor a rota `/campaigns/:id/encontros` |
| `scripts/test-rls-isolation.mjs` | bloco `[#6]` de perímetro |
| `e2e-pw/support/supabase-stub.js`, `e2e-pw/encounter.spec.js` | stub e spec dos templates |

---

## Task 1: Domínio — nível de personagem

**Files:**
- Create: `src/systems/dnd5e/domain/party.js`
- Test: `src/test/party-levels.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/party-levels.test.js
import { describe, it, expect } from 'vitest'
import { characterLevel, partyLevels } from '../systems/dnd5e/domain/party'

describe('characterLevel', () => {
  it('soma a classe primária com as multiclasses', () => {
    expect(characterLevel({ info: { level: 3, multiclasses: [{ level: 2 }, { level: 1 }] } })).toBe(6)
  })

  it('ficha sem multiclasse usa só o nível primário', () => {
    expect(characterLevel({ info: { level: 5 } })).toBe(5)
  })

  it('clampa em 1..20 pra não estourar a tabela de limiares', () => {
    expect(characterLevel({ info: { level: 0 } })).toBe(1)
    expect(characterLevel({ info: { level: 25 } })).toBe(20)
    expect(characterLevel({ info: { level: 18, multiclasses: [{ level: 9 }] } })).toBe(20)
  })

  it('lixo e ausência viram nível 1', () => {
    expect(characterLevel({})).toBe(1)
    expect(characterLevel(null)).toBe(1)
    expect(characterLevel({ info: { level: 'abc' } })).toBe(1)
  })
})

describe('partyLevels', () => {
  it('aceita mapa de docs (como a tela guarda)', () => {
    const docs = { a: { info: { level: 3 } }, b: { info: { level: 5 } } }
    expect(partyLevels(docs)).toEqual([3, 5])
  })

  it('aceita lista de docs', () => {
    expect(partyLevels([{ info: { level: 2 } }])).toEqual([2])
  })

  it('vazio devolve lista vazia', () => {
    expect(partyLevels(null)).toEqual([])
    expect(partyLevels({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/party-levels.test.js`
Expected: FAIL — `Failed to resolve import ".../domain/party"`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/domain/party.js
/**
 * Nível da companhia — a entrada da conta de dificuldade de encontro.
 *
 * Separado de `encounterDifficulty.js` de propósito: aqui mora o que é da
 * FICHA (somar multiclasse), lá mora o que é da regra de encontro.
 */
export const MIN_LEVEL = 1
export const MAX_LEVEL = 20

/** Nível total: classe primária + multiclasses, clampado em 1..20. */
export function characterLevel(doc) {
  const primary = Number(doc?.info?.level) || 0
  const extra = (doc?.info?.multiclasses ?? [])
    .reduce((s, m) => s + (Number(m?.level) || 0), 0)
  const total = primary + extra
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, total))
}

/** Aceita o mapa `characterId → doc` que as telas guardam, ou uma lista. */
export function partyLevels(docs) {
  const list = Array.isArray(docs) ? docs : Object.values(docs ?? {})
  return list.map(characterLevel)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/party-levels.test.js`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/party.js src/test/party-levels.test.js
git commit -m "feat(construtor-de-encontros): nivel total da ficha com clamp de 1 a 20"
```

---

## Task 2: Domínio — limiares de XP por companhia

**Files:**
- Create: `src/systems/dnd5e/domain/encounterDifficulty.js`
- Test: `src/test/encounter-thresholds.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounter-thresholds.test.js
import { describe, it, expect } from 'vitest'
import { thresholdsForLevel, partyThresholds } from '../systems/dnd5e/domain/encounterDifficulty'

describe('thresholdsForLevel', () => {
  it('bate com a tabela em pontos-chave', () => {
    expect(thresholdsForLevel(1)).toEqual({ easy: 25, medium: 50, hard: 75, deadly: 100 })
    expect(thresholdsForLevel(5)).toEqual({ easy: 250, medium: 500, hard: 750, deadly: 1100 })
    expect(thresholdsForLevel(11)).toEqual({ easy: 800, medium: 1600, hard: 2400, deadly: 3600 })
    expect(thresholdsForLevel(20)).toEqual({ easy: 2800, medium: 5700, hard: 8500, deadly: 12700 })
  })

  it('clampa nível fora de 1..20 em vez de estourar o índice', () => {
    expect(thresholdsForLevel(0)).toEqual(thresholdsForLevel(1))
    expect(thresholdsForLevel(99)).toEqual(thresholdsForLevel(20))
    expect(thresholdsForLevel(undefined)).toEqual(thresholdsForLevel(1))
  })
})

describe('partyThresholds', () => {
  it('soma personagem por personagem', () => {
    // 4 personagens de nível 3: 4 × { 75, 150, 225, 400 }
    expect(partyThresholds([3, 3, 3, 3])).toEqual({ easy: 300, medium: 600, hard: 900, deadly: 1600 })
  })

  it('NÃO usa nível médio — 1/1/5/5 difere de 3/3/3/3', () => {
    const media = partyThresholds([3, 3, 3, 3])
    const real = partyThresholds([1, 1, 5, 5])
    // 2×{25,50,75,100} + 2×{250,500,750,1100}
    expect(real).toEqual({ easy: 550, medium: 1100, hard: 1650, deadly: 2400 })
    expect(real).not.toEqual(media)
  })

  it('companhia vazia devolve tudo zero', () => {
    expect(partyThresholds([])).toEqual({ easy: 0, medium: 0, hard: 0, deadly: 0 })
    expect(partyThresholds(null)).toEqual({ easy: 0, medium: 0, hard: 0, deadly: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounter-thresholds.test.js`
Expected: FAIL — `Failed to resolve import ".../domain/encounterDifficulty"`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/domain/encounterDifficulty.js
/**
 * Dificuldade de encontro (spec 2026-07-27 Construtor de Encontros).
 *
 * Camada PURA: só números entram e saem. Sem React, sem Supabase, sem catálogo
 * de monstros — quem soma o XP dos monstros é o domínio do encontro.
 *
 * Os limiares e a escada de multiplicadores são do DMG, fora do SRD 5.1. Entram
 * aqui como TABELA DE NÚMEROS, pela decisão de 2026-07-02 (mecânica de jogo não
 * é protegível por copyright, só a expressão do texto). Os valores foram
 * conferidos contra as regras básicas públicas, não escritos de memória.
 */
import { MIN_LEVEL, MAX_LEVEL } from './party'

/** Índice = nível − 1. */
const TABLE = [
  { easy: 25, medium: 50, hard: 75, deadly: 100 },        //  1
  { easy: 50, medium: 100, hard: 150, deadly: 200 },      //  2
  { easy: 75, medium: 150, hard: 225, deadly: 400 },      //  3
  { easy: 125, medium: 250, hard: 375, deadly: 500 },     //  4
  { easy: 250, medium: 500, hard: 750, deadly: 1100 },    //  5
  { easy: 300, medium: 600, hard: 900, deadly: 1400 },    //  6
  { easy: 350, medium: 750, hard: 1100, deadly: 1700 },   //  7
  { easy: 450, medium: 900, hard: 1400, deadly: 2100 },   //  8
  { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },  //  9
  { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },  // 10
  { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },  // 11
  { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 }, // 12
  { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 }, // 13
  { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 }, // 14
  { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 }, // 15
  { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 }, // 16
  { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 }, // 17
  { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 }, // 18
  { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },// 19
  { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },// 20
]

export function thresholdsForLevel(level) {
  const n = Math.floor(Number(level))
  const clamped = Number.isFinite(n)
    ? Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n))
    : MIN_LEVEL
  return TABLE[clamped - 1]
}

/**
 * Limiar da companhia = soma PERSONAGEM POR PERSONAGEM. Usar nível médio
 * achataria a diferença entre 1/1/5/5 e 3/3/3/3, que têm orçamentos distintos.
 */
export function partyThresholds(levels) {
  return (levels ?? []).reduce((acc, level) => {
    const t = thresholdsForLevel(level)
    return {
      easy: acc.easy + t.easy,
      medium: acc.medium + t.medium,
      hard: acc.hard + t.hard,
      deadly: acc.deadly + t.deadly,
    }
  }, { easy: 0, medium: 0, hard: 0, deadly: 0 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounter-thresholds.test.js`
Expected: PASS — 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/encounterDifficulty.js src/test/encounter-thresholds.test.js
git commit -m "feat(construtor-de-encontros): tabela de limiares de XP somada por personagem"
```

---

## Task 3: Domínio — escada de multiplicadores

**Files:**
- Modify: `src/systems/dnd5e/domain/encounterDifficulty.js` (append)
- Test: `src/test/encounter-multiplier.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounter-multiplier.test.js
import { describe, it, expect } from 'vitest'
import { encounterMultiplier, MULTIPLIER_LADDER } from '../systems/dnd5e/domain/encounterDifficulty'

const GRUPO_NORMAL = 4 // 3..5 personagens: sem ajuste

describe('encounterMultiplier — faixas por quantidade', () => {
  it('cobre as seis faixas', () => {
    expect(encounterMultiplier(1, GRUPO_NORMAL)).toBe(1)
    expect(encounterMultiplier(2, GRUPO_NORMAL)).toBe(1.5)
    expect(encounterMultiplier(3, GRUPO_NORMAL)).toBe(2)
    expect(encounterMultiplier(6, GRUPO_NORMAL)).toBe(2)
    expect(encounterMultiplier(7, GRUPO_NORMAL)).toBe(2.5)
    expect(encounterMultiplier(10, GRUPO_NORMAL)).toBe(2.5)
    expect(encounterMultiplier(11, GRUPO_NORMAL)).toBe(3)
    expect(encounterMultiplier(14, GRUPO_NORMAL)).toBe(3)
    expect(encounterMultiplier(15, GRUPO_NORMAL)).toBe(4)
    expect(encounterMultiplier(40, GRUPO_NORMAL)).toBe(4)
  })

  it('sem monstro não multiplica nada', () => {
    expect(encounterMultiplier(0, GRUPO_NORMAL)).toBe(1)
  })
})

describe('encounterMultiplier — ajuste por tamanho do grupo', () => {
  it('companhia pequena (1-2) sobe um degrau', () => {
    expect(encounterMultiplier(1, 2)).toBe(1.5)
    expect(encounterMultiplier(3, 2)).toBe(2.5)
    expect(encounterMultiplier(15, 1)).toBe(4) // já no topo, não passa disso
  })

  it('companhia grande (6+) desce um degrau, incluindo o ×0,5', () => {
    expect(encounterMultiplier(1, 6)).toBe(0.5)
    expect(encounterMultiplier(2, 6)).toBe(1)
    expect(encounterMultiplier(3, 7)).toBe(1.5)
  })

  it('grupo de 3 a 5 não desloca', () => {
    for (const tamanho of [3, 4, 5]) {
      expect(encounterMultiplier(3, tamanho)).toBe(2)
    }
  })

  it('companhia vazia não aplica o bônus de grupo pequeno', () => {
    expect(encounterMultiplier(3, 0)).toBe(2)
  })

  it('a escada tem sete posições e começa no meio-multiplicador', () => {
    expect(MULTIPLIER_LADDER).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 4])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounter-multiplier.test.js`
Expected: FAIL — `encounterMultiplier is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append em `src/systems/dnd5e/domain/encounterDifficulty.js`:

```js
/**
 * Sete posições: o ×0,5 existe porque companhia de 6+ DESCE um degrau, e um
 * monstro solitário contra seis personagens cai abaixo do ×1.
 */
export const MULTIPLIER_LADDER = [0.5, 1, 1.5, 2, 2.5, 3, 4]

/** Posição na escada antes do ajuste por tamanho de grupo. */
function ladderIndexFor(monsterCount) {
  if (monsterCount <= 1) return 1  // ×1
  if (monsterCount === 2) return 2 // ×1,5
  if (monsterCount <= 6) return 3  // ×2
  if (monsterCount <= 10) return 4 // ×2,5
  if (monsterCount <= 14) return 5 // ×3
  return 6                         // ×4
}

/**
 * Multiplicador de encontro. `partySize` 0 (companhia desconhecida) não aplica
 * ajuste nenhum — o bônus de "grupo pequeno" só faz sentido com gente na mesa.
 */
export function encounterMultiplier(monsterCount, partySize) {
  const count = Math.max(0, Math.floor(Number(monsterCount) || 0))
  if (count === 0) return 1
  const size = Math.max(0, Math.floor(Number(partySize) || 0))
  let i = ladderIndexFor(count)
  if (size > 0 && size < 3) i += 1
  else if (size >= 6) i -= 1
  return MULTIPLIER_LADDER[Math.min(MULTIPLIER_LADDER.length - 1, Math.max(0, i))]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounter-multiplier.test.js`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/encounterDifficulty.js src/test/encounter-multiplier.test.js
git commit -m "feat(construtor-de-encontros): escada de multiplicadores com ajuste por tamanho do grupo"
```

---

## Task 4: Domínio — faixa de dificuldade e resumo

**Files:**
- Modify: `src/systems/dnd5e/domain/encounterDifficulty.js` (append)
- Test: `src/test/encounter-difficulty-band.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounter-difficulty-band.test.js
import { describe, it, expect } from 'vitest'
import {
  adjustedXp, difficultyBand, summarizeEncounter, partyThresholds,
} from '../systems/dnd5e/domain/encounterDifficulty'

const QUATRO_NV3 = [3, 3, 3, 3] // limiares: 300 / 600 / 900 / 1600

describe('adjustedXp', () => {
  it('aplica o multiplicador da quantidade', () => {
    expect(adjustedXp(200, 4, 4)).toBe(400)  // ×2
    expect(adjustedXp(200, 1, 4)).toBe(200)  // ×1
    expect(adjustedXp(200, 2, 4)).toBe(300)  // ×1,5
  })

  it('arredonda meio XP em vez de deixar fração na tela', () => {
    expect(adjustedXp(25, 2, 4)).toBe(38)    // 25 × 1,5 = 37,5
  })

  it('lixo e negativo viram zero', () => {
    expect(adjustedXp(-50, 3, 4)).toBe(0)
    expect(adjustedXp('abc', 3, 4)).toBe(0)
  })
})

describe('difficultyBand — igual entra na faixa de cima', () => {
  const t = partyThresholds(QUATRO_NV3)

  it('bate exatamente nas fronteiras', () => {
    expect(difficultyBand(299, t)).toBe('trivial')
    expect(difficultyBand(300, t)).toBe('easy')
    expect(difficultyBand(599, t)).toBe('easy')
    expect(difficultyBand(600, t)).toBe('medium')
    expect(difficultyBand(899, t)).toBe('medium')
    expect(difficultyBand(900, t)).toBe('hard')
    expect(difficultyBand(1599, t)).toBe('hard')
    expect(difficultyBand(1600, t)).toBe('deadly')
    expect(difficultyBand(99999, t)).toBe('deadly')
  })

  it('sem companhia não inventa faixa', () => {
    expect(difficultyBand(500, partyThresholds([]))).toBeNull()
    expect(difficultyBand(500, null)).toBeNull()
  })
})

describe('summarizeEncounter', () => {
  it('junta tudo num resumo pronto pra tela', () => {
    // 3 goblins de 50 XP = 150 bruto; ×2 (3-6 monstros) = 300 ajustado;
    // limiar fácil de 4 personagens nv3 = 300 → cai em "easy" na fronteira.
    expect(summarizeEncounter({ monsterXpTotal: 150, monsterCount: 3, levels: QUATRO_NV3 }))
      .toEqual({
        raw: 150,
        adjusted: 300,
        multiplier: 2,
        partySize: 4,
        thresholds: { easy: 300, medium: 600, hard: 900, deadly: 1600 },
        band: 'easy',
      })
  })

  it('encontro vazio é trivial, não quebra', () => {
    const r = summarizeEncounter({ monsterXpTotal: 0, monsterCount: 0, levels: QUATRO_NV3 })
    expect(r.adjusted).toBe(0)
    expect(r.band).toBe('trivial')
  })

  it('sem companhia devolve band null e partySize 0', () => {
    const r = summarizeEncounter({ monsterXpTotal: 500, monsterCount: 2, levels: [] })
    expect(r).toMatchObject({ band: null, partySize: 0, adjusted: 750 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounter-difficulty-band.test.js`
Expected: FAIL — `adjustedXp is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append em `src/systems/dnd5e/domain/encounterDifficulty.js`:

```js
export const BANDS = ['trivial', 'easy', 'medium', 'hard', 'deadly']

export function adjustedXp(monsterXpTotal, monsterCount, partySize) {
  const xp = Math.max(0, Math.floor(Number(monsterXpTotal) || 0))
  return Math.round(xp * encounterMultiplier(monsterCount, partySize))
}

/**
 * Faixa do encontro. A fronteira é sempre "igual entra na faixa de cima":
 * bater exatamente o limiar mortal é mortal, não difícil.
 * Companhia vazia devolve `null` — sem orçamento não existe faixa, e inventar
 * uma seria pior que admitir que não dá pra saber.
 */
export function difficultyBand(xp, thresholds) {
  if (!thresholds || thresholds.deadly <= 0) return null
  const n = Math.max(0, Math.floor(Number(xp) || 0))
  if (n >= thresholds.deadly) return 'deadly'
  if (n >= thresholds.hard) return 'hard'
  if (n >= thresholds.medium) return 'medium'
  if (n >= thresholds.easy) return 'easy'
  return 'trivial'
}

/** Tudo que a tela precisa, numa chamada só. */
export function summarizeEncounter({ monsterXpTotal = 0, monsterCount = 0, levels = [] } = {}) {
  const partySize = (levels ?? []).length
  const thresholds = partyThresholds(levels)
  const multiplier = encounterMultiplier(monsterCount, partySize)
  const adjusted = adjustedXp(monsterXpTotal, monsterCount, partySize)
  return {
    raw: Math.max(0, Math.floor(Number(monsterXpTotal) || 0)),
    adjusted,
    multiplier,
    partySize,
    thresholds,
    band: difficultyBand(adjusted, thresholds),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounter-difficulty-band.test.js`
Expected: PASS — 6 testes.

- [ ] **Step 5: Rodar o domínio inteiro**

Run: `npx vitest run src/test/party-levels.test.js src/test/encounter-thresholds.test.js src/test/encounter-multiplier.test.js src/test/encounter-difficulty-band.test.js`
Expected: PASS nos quatro.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/encounterDifficulty.js src/test/encounter-difficulty-band.test.js
git commit -m "feat(construtor-de-encontros): faixa de dificuldade e resumo pronto pra tela"
```

---

## Task 5: Migration 0017 — tabela dos encontros salvos

**Files:**
- Create: `supabase/migrations/0017_encounter_templates.sql`

Sem teste automatizado aqui: SQL só roda contra o Postgres real. O perímetro é
verificado na Task 6.

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0017_encounter_templates.sql
-- Construtor de Encontros (spec 2026-07-27): encontros salvos e nomeados por
-- mesa, visíveis SÓ pro Mestre.
--
-- Tabela separada de `encounters` de propósito: lá mora o COMBATE (state com
-- iniciativa, rodada, HP dos monstros), aqui mora a RECEITA
-- ([{monsterIndex, count}]). Misturar as duas faria `active = false` virar um
-- saco de "lutas terminadas" + "grupos preparados".
--
-- Sem coluna `version`: template é editado por uma pessoa, fora da sessão, e o
-- custo de um conflito é reescrever um nome. Last-write-wins de propósito.
--
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

create table if not exists public.encounter_templates (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name        text not null,
  monsters    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint encounter_templates_name_len
    check (char_length(btrim(name)) between 1 and 80)
);

-- Dois "Emboscada na ponte" na mesma mesa é erro de digitação, não intenção.
create unique index if not exists encounter_templates_name_per_campaign
  on public.encounter_templates (campaign_id, lower(btrim(name)));

create index if not exists encounter_templates_campaign_idx
  on public.encounter_templates (campaign_id);

alter table public.encounter_templates enable row level security;

drop policy if exists "encounter_templates_all_dm" on public.encounter_templates;
create policy "encounter_templates_all_dm"
  on public.encounter_templates for all
  to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));

create or replace function public.touch_encounter_template()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists encounter_templates_touch on public.encounter_templates;
create trigger encounter_templates_touch
  before update on public.encounter_templates
  for each row execute function public.touch_encounter_template();

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Conferir estaticamente contra as migrations existentes**

Rode e leia:

```bash
grep -rn "is_campaign_dm" supabase/migrations/0004_campaigns.sql | head -3
grep -rn "encounter_templates" supabase/migrations/ | grep -v 0017 | head
```

Expected: `is_campaign_dm(uuid)` existe em 0004; a segunda busca não devolve
nada (nenhuma migration anterior criou essa tabela). Se qualquer uma divergir,
**PARE e reporte NEEDS_CONTEXT**.

- [ ] **Step 3: Aplicar no Supabase**

Cole o arquivo inteiro no SQL Editor do projeto e rode.
Expected: `Success. No rows returned`.

**Este passo é ação do dono** (banco real). Se você é um agente, PARE aqui,
reporte que a migration está pronta e siga para a Task 6 sem aplicar.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0017_encounter_templates.sql
git commit -m "feat(construtor-de-encontros): migration 0017 - tabela de encontros salvos"
```

---

## Task 6: Perímetro da tabela nova no harness de RLS

**Files:**
- Modify: `scripts/test-rls-isolation.mjs`

- [ ] **Step 1: Adicionar o bloco**

Insira imediatamente ANTES da linha
`console.log('\n▶ Rate limit: tentativas FRACASSADAS acumulam e barram (0016)')`:

```js
    console.log('\n▶ [#6] Construtor de Encontros: perímetro de encounter_templates (0017)')
    {
      // O bloco [#5] já revinculou o player à mesa e deixou tudo no estado real.
      const { data: tpl, error: t1 } = await dm.from('encounter_templates')
        .insert({ campaign_id: campaignId, name: 'Emboscada na ponte', monsters: [{ monsterIndex: 'goblin', count: 3 }] })
        .select('id, name')
        .single()
      assert(!t1 && !!tpl?.id, `DM cria encontro salvo (err=${t1?.message})`)

      // Nome repetido na MESMA mesa → recusado pelo índice único (case-insensitive).
      const { error: t2 } = await dm.from('encounter_templates')
        .insert({ campaign_id: campaignId, name: '  emboscada NA ponte ', monsters: [] })
      assert(!!t2, `nome duplicado recusado (err=${t2?.message})`)

      // Nome vazio → recusado pelo check.
      const { error: t3 } = await dm.from('encounter_templates')
        .insert({ campaign_id: campaignId, name: '   ', monsters: [] })
      assert(!!t3, `nome em branco recusado (err=${t3?.message})`)

      // Player não lê nem escreve.
      const { data: pRows } = await player.from('encounter_templates')
        .select('id').eq('campaign_id', campaignId)
      assert((pRows ?? []).length === 0, `player não enxerga encontros salvos (got ${(pRows ?? []).length})`)

      const { error: t4 } = await player.from('encounter_templates')
        .insert({ campaign_id: campaignId, name: 'Do jogador', monsters: [] })
      assert(!!t4, `player bloqueado ao criar encontro salvo (err=${t4?.message})`)

      // DM de OUTRA mesa também não escreve nesta (otherCampaignId é do mesmo DM,
      // então usamos o player como não-DM; aqui checamos o update do proprio DM).
      if (tpl?.id) {
        const { error: t5 } = await player.from('encounter_templates')
          .update({ name: 'Renomeado pelo jogador' }).eq('id', tpl.id)
        const { data: after } = await dm.from('encounter_templates')
          .select('name').eq('id', tpl.id).maybeSingle()
        assert(after?.name === 'Emboscada na ponte',
          `update do player não pega (err=${t5?.message}, nome=${after?.name})`)

        await dm.from('encounter_templates').delete().eq('id', tpl.id)
      }
    }
```

- [ ] **Step 2: Validar sintaxe**

Run: `node --check scripts/test-rls-isolation.mjs`
Expected: sem saída.

Run: `npx eslint scripts/test-rls-isolation.mjs`
Expected: exit 0.

- [ ] **Step 3: Rodar contra o Supabase real**

Run: `npm run test:rls`
Expected: todos os `✓`, incluindo os 6 asserts novos.

**Este passo é ação do dono** — exige `TEST_DM_EMAIL`, `TEST_DM_PASSWORD`,
`TEST_PLAYER_EMAIL` e `TEST_PLAYER_PASSWORD` no `.env.local`, além das
migrations aplicadas. Se você é um agente, PARE aqui e reporte.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-rls-isolation.mjs
git commit -m "test(construtor-de-encontros): perimetro de encounter_templates"
```

---

## Task 7: `lib/encounterTemplates.js`

**Files:**
- Create: `src/lib/encounterTemplates.js`
- Test: `src/test/encounterTemplates-lib.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounterTemplates-lib.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ rows: [], nextError: null }))

vi.mock('../lib/supabase', () => {
  function from() {
    const ctx = { filter: () => true, single: false, op: null, payload: null }
    const b = {
      select() { return b },
      order() { return b },
      eq(col, val) { const p = ctx.filter; ctx.filter = r => p(r) && r[col] === val; return b },
      maybeSingle() { ctx.single = true; return b },
      single() { ctx.single = true; return b },
      insert(payload) { ctx.op = 'insert'; ctx.payload = payload; return b },
      update(payload) { ctx.op = 'update'; ctx.payload = payload; return b },
      delete() { ctx.op = 'delete'; return b },
      then(resolve) {
        if (store.nextError) return resolve({ data: null, error: store.nextError })
        if (ctx.op === 'insert') {
          const row = { id: `tpl-${store.rows.length + 1}`, ...ctx.payload }
          store.rows.push(row)
          return resolve({ data: ctx.single ? row : [row], error: null })
        }
        if (ctx.op === 'update') {
          const hit = store.rows.filter(ctx.filter)
          for (const r of hit) Object.assign(r, ctx.payload)
          return resolve({ data: ctx.single ? (hit[0] ?? null) : hit, error: null })
        }
        if (ctx.op === 'delete') {
          for (let i = store.rows.length - 1; i >= 0; i--) if (ctx.filter(store.rows[i])) store.rows.splice(i, 1)
          return resolve({ data: null, error: null })
        }
        const rows = store.rows.filter(ctx.filter)
        return resolve({ data: ctx.single ? (rows[0] ?? null) : rows, error: null })
      },
    }
    return b
  }
  return { supabase: { from } }
})

const {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
} = await import('../lib/encounterTemplates')

beforeEach(() => { store.rows = []; store.nextError = null })

describe('lib/encounterTemplates', () => {
  it('lista vazia quando a mesa não tem nada', async () => {
    expect(await listTemplates('camp-1')).toEqual([])
  })

  it('cria e lista', async () => {
    const res = await createTemplate('camp-1', 'Emboscada', [{ monsterIndex: 'goblin', count: 3 }])
    expect(res.ok).toBe(true)
    expect(res.row).toMatchObject({ campaign_id: 'camp-1', name: 'Emboscada' })
    expect(await listTemplates('camp-1')).toHaveLength(1)
  })

  it('apara espaços do nome antes de salvar', async () => {
    const res = await createTemplate('camp-1', '  Emboscada  ', [])
    expect(res.row.name).toBe('Emboscada')
  })

  it('recusa nome vazio sem ir ao servidor', async () => {
    expect(await createTemplate('camp-1', '   ', [])).toEqual({ ok: false, reason: 'invalid-name' })
    expect(store.rows).toHaveLength(0)
  })

  it('recusa nome longo demais sem ir ao servidor', async () => {
    expect(await createTemplate('camp-1', 'x'.repeat(81), [])).toEqual({ ok: false, reason: 'invalid-name' })
    expect(store.rows).toHaveLength(0)
  })

  it('traduz nome duplicado do banco', async () => {
    store.nextError = { code: '23505', message: 'duplicate key value violates unique constraint' }
    expect(await createTemplate('camp-1', 'Emboscada', [])).toMatchObject({ ok: false, reason: 'duplicate-name' })
  })

  it('atualiza nome e monstros', async () => {
    const { row } = await createTemplate('camp-1', 'Antes', [])
    const res = await updateTemplate(row.id, { name: 'Depois', monsters: [{ monsterIndex: 'ogre', count: 1 }] })
    expect(res.ok).toBe(true)
    expect(store.rows[0]).toMatchObject({ name: 'Depois' })
  })

  it('apaga', async () => {
    const { row } = await createTemplate('camp-1', 'Some', [])
    expect(await deleteTemplate(row.id)).toEqual({ ok: true })
    expect(store.rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounterTemplates-lib.test.js`
Expected: FAIL — `Cannot find module '../lib/encounterTemplates'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/encounterTemplates.js
import { supabase } from './supabase'

/**
 * Encontros salvos por mesa (migration 0017). Camada da CASCA: não conhece o
 * shape de `monsters` — pra ela é jsonb opaco. Quem interpreta é o sistema.
 *
 * Sem lock otimista de propósito: template é editado por uma pessoa, fora da
 * sessão, e o custo de um conflito é reescrever um nome.
 */
const T = 'encounter_templates'
const NAME_MAX = 80

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[encounterTemplates] ${label}:`, payload)
  }
}

/** Mesma regra do check da 0017 — validar aqui evita ida ao servidor. */
function cleanName(name) {
  const trimmed = String(name ?? '').trim()
  return trimmed.length >= 1 && trimmed.length <= NAME_MAX ? trimmed : null
}

function reasonFor(error) {
  if (error?.code === '23505') return 'duplicate-name'
  if (error?.code === '23514') return 'invalid-name'
  return 'unknown'
}

export async function listTemplates(campaignId) {
  const { data, error } = await supabase
    .from(T)
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name', { ascending: true })
  if (error) { logDev('listTemplates', error); return [] }
  return data ?? []
}

export async function createTemplate(campaignId, name, monsters) {
  const clean = cleanName(name)
  if (!clean) return { ok: false, reason: 'invalid-name' }
  const { data, error } = await supabase
    .from(T)
    .insert({ campaign_id: campaignId, name: clean, monsters: monsters ?? [] })
    .select('*')
    .single()
  if (error) {
    logDev('createTemplate', error)
    return { ok: false, reason: reasonFor(error), message: error.message }
  }
  return { ok: true, row: data }
}

export async function updateTemplate(id, { name, monsters }) {
  const patch = {}
  if (name !== undefined) {
    const clean = cleanName(name)
    if (!clean) return { ok: false, reason: 'invalid-name' }
    patch.name = clean
  }
  if (monsters !== undefined) patch.monsters = monsters ?? []
  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase.from(T).update(patch).eq('id', id)
  if (error) {
    logDev('updateTemplate', error)
    return { ok: false, reason: reasonFor(error), message: error.message }
  }
  return { ok: true }
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from(T).delete().eq('id', id)
  if (error) { logDev('deleteTemplate', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounterTemplates-lib.test.js`
Expected: PASS — 8 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/encounterTemplates.js src/test/encounterTemplates-lib.test.js
git commit -m "feat(construtor-de-encontros): camada de acesso dos encontros salvos"
```

---

## Task 8: `DifficultyMeter`

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/DifficultyMeter.jsx`
- Test: `src/test/DifficultyMeter.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/DifficultyMeter.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DifficultyMeter } from '../systems/dnd5e/components/Encounter/DifficultyMeter'

describe('DifficultyMeter', () => {
  it('mostra XP bruto, ajustado e a faixa', () => {
    // 3 monstros de 50 XP contra 4 personagens nv3: 150 bruto, ×2 = 300 = fácil
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.getByText(/150 XP/)).toBeInTheDocument()
    expect(screen.getByText(/300 XP ajustado/i)).toBeInTheDocument()
    expect(screen.getByText(/fácil/i)).toBeInTheDocument()
  })

  it('mostra o multiplicador aplicado', () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.getByText(/×2/)).toBeInTheDocument()
  })

  it('sem companhia avisa em vez de inventar faixa', () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[]} />)
    expect(screen.getByText(/sem companhia/i)).toBeInTheDocument()
    expect(screen.queryByText(/mortal/i)).toBeNull()
  })

  it('sem monstros diz que não há encontro', () => {
    render(<DifficultyMeter monsterXpTotal={0} monsterCount={0} levels={[3, 3]} />)
    expect(screen.getByText(/sem monstros/i)).toBeInTheDocument()
  })

  it('ajuste manual muda a conta sem tocar na companhia real', async () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.getByText(/fácil/i)).toBeInTheDocument()

    // Mesmo encontro contra 2 personagens de nível 1: 150 × 2,5 (grupo pequeno
    // sobe um degrau) = 375, contra limiar mortal de 200 → mortal.
    const qtd = screen.getByLabelText(/personagens/i)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '2')
    const nivel = screen.getByLabelText(/n[íi]vel/i)
    await userEvent.clear(nivel)
    await userEvent.type(nivel, '1')

    expect(screen.getByText(/mortal/i)).toBeInTheDocument()
  })

  it('botão volta pro que a mesa realmente tem', async () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    const qtd = screen.getByLabelText(/personagens/i)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '1')
    await userEvent.click(screen.getByRole('button', { name: /companhia da mesa/i }))
    expect(screen.getByLabelText(/personagens/i)).toHaveValue(4)
  })

  it('avisa quando os números não são os da mesa', async () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.queryByText(/ajustado manualmente/i)).toBeNull()
    const qtd = screen.getByLabelText(/personagens/i)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '6')
    expect(screen.getByText(/ajustado manualmente/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/DifficultyMeter.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/DifficultyMeter'`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/Encounter/DifficultyMeter.jsx
import { useMemo, useState } from 'react'
import { summarizeEncounter } from '../../domain/encounterDifficulty'

const BAND_LABEL = {
  trivial: 'Trivial',
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  deadly: 'Mortal',
}

const BAND_CLASS = {
  trivial: 'border-parchment-600 text-ink-300',
  easy: 'border-green-800 text-green-800',
  medium: 'border-amber-700 text-amber-800',
  hard: 'border-orange-700 text-orange-800',
  deadly: 'border-red-700 text-red-700',
}

/** Média arredondada, só pra preencher o campo de nível do ajuste manual. */
function averageLevel(levels) {
  if (!levels?.length) return 1
  return Math.round(levels.reduce((s, l) => s + l, 0) / levels.length)
}

/**
 * Medidor de dificuldade. Começa com a companhia REAL (níveis vindos das
 * fichas) e deixa o Mestre mexer em quantidade e nível pra preparar uma sessão
 * que ainda não aconteceu — sem alterar ficha nenhuma.
 *
 * @param {number} monsterXpTotal — soma do XP dos monstros do encontro
 * @param {number} monsterCount — quantos monstros (define o multiplicador)
 * @param {number[]} levels — nível de cada personagem da mesa
 */
export function DifficultyMeter({ monsterXpTotal, monsterCount, levels }) {
  const [override, setOverride] = useState(null) // { size, level } | null

  const realSize = levels?.length ?? 0
  const realLevel = averageLevel(levels)
  const size = override?.size ?? realSize
  const level = override?.level ?? realLevel
  const manual = override !== null && (override.size !== realSize || override.level !== realLevel)

  const effectiveLevels = useMemo(
    () => (manual ? Array.from({ length: Math.max(0, size) }, () => level) : (levels ?? [])),
    [manual, size, level, levels],
  )

  const s = useMemo(
    () => summarizeEncounter({ monsterXpTotal, monsterCount, levels: effectiveLevels }),
    [monsterXpTotal, monsterCount, effectiveLevels],
  )

  function patch(field, raw) {
    const n = Math.max(0, Math.min(field === 'level' ? 20 : 12, Math.floor(Number(raw) || 0)))
    setOverride(prev => ({ size: prev?.size ?? realSize, level: prev?.level ?? realLevel, [field]: n }))
  }

  return (
    <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
        Dificuldade
      </h2>
      <div className="p-4 flex flex-col gap-3">
        {monsterCount === 0 ? (
          <p className="text-sm ink-italic text-ink-300">Sem monstros no encontro.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-500">{s.raw} XP</span>
            <span className="text-xs ink-italic text-ink-300">×{s.multiplier}</span>
            <span className="text-sm text-ink-500">{s.adjusted} XP ajustado</span>
            {s.band ? (
              <span className={`text-xs px-2 py-0.5 rounded-sm border-2 font-display tracking-wide uppercase ${BAND_CLASS[s.band]}`}>
                {BAND_LABEL[s.band]}
              </span>
            ) : (
              <span className="text-xs ink-italic text-red-700">sem companhia — ajuste abaixo</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs ink-italic text-ink-300 flex items-center gap-2">
            personagens
            <input
              type="number" min="0" max="12"
              aria-label="Quantidade de personagens"
              value={size}
              onChange={e => patch('size', e.target.value)}
              className="w-14 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
            />
          </label>
          <label className="text-xs ink-italic text-ink-300 flex items-center gap-2">
            nível
            <input
              type="number" min="1" max="20"
              {/* NÃO use "Nível dos personagens": colidiria com o
                  getByLabelText(/personagens/i) do campo de quantidade. */}
              aria-label="Nível da companhia"
              value={level}
              onChange={e => patch('level', e.target.value)}
              className="w-14 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
            />
          </label>
          {manual && (
            <>
              <span className="text-xs ink-italic text-amber-800">ajustado manualmente</span>
              <button
                type="button"
                onClick={() => setOverride(null)}
                className="text-xs text-ink-500 underline hover:text-ink-600"
              >
                usar a companhia da mesa
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/DifficultyMeter.test.jsx`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/DifficultyMeter.jsx src/test/DifficultyMeter.test.jsx
git commit -m "feat(construtor-de-encontros): medidor de dificuldade com ajuste manual de companhia"
```

---

## Task 9: Extrair `MonsterGroupPanel` do `SetupPanel`

Refactor puro: o comportamento não muda, e os testes que já existem do
`SetupPanel` são a rede de segurança.

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/MonsterGroupPanel.jsx`
- Modify: `src/systems/dnd5e/components/Encounter/SetupPanel.jsx`
- Test: `src/test/MonsterGroupPanel.test.jsx`

- [ ] **Step 1: Rodar os testes do SetupPanel ANTES de mexer**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx`
Expected: PASS — 5 testes. Anote o número; ele tem que continuar igual no fim.

- [ ] **Step 2: Write the failing test do componente novo**

```jsx
// src/test/MonsterGroupPanel.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonsterGroupPanel } from '../systems/dnd5e/components/Encounter/MonsterGroupPanel'
import { emptyEncounterState, addNpc } from '../systems/dnd5e/domain/encounter'

const GOBLIN = { index: 'goblin', name: 'Goblin', hit_points: 7, hit_points_roll: '2d6', dexterity: 14, xp: 50, armor_class: [{ value: 15 }] }

vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick(GOBLIN)}>stub-add-goblin</button>
    : null,
}))

function setup(initial = emptyEncounterState()) {
  const onChange = vi.fn()
  const utils = render(<MonsterGroupPanel value={initial} onChange={onChange} />)
  return { onChange, ...utils }
}

describe('MonsterGroupPanel', () => {
  it('adiciona monstro pelo bestiário e avisa o pai', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.combatants.map(c => c.name)).toEqual(['Goblin'])
  })

  it('lista os monstros já escolhidos com HP e CA', () => {
    setup(addNpc(emptyEncounterState(), GOBLIN))
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText(/7 PV · CA 15/)).toBeInTheDocument()
  })

  it('remover avisa o pai sem o monstro', async () => {
    const { onChange } = setup(addNpc(emptyEncounterState(), GOBLIN))
    await userEvent.click(screen.getByRole('button', { name: /remover goblin/i }))
    expect(onChange.mock.calls.at(-1)[0].combatants).toEqual([])
  })

  it('rolar HP é opção do momento de adicionar', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByLabelText(/rolar HP/i))
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    const npc = onChange.mock.calls.at(-1)[0].combatants[0]
    expect(npc.maxHp).toBeGreaterThanOrEqual(2)
    expect(npc.maxHp).toBeLessThanOrEqual(12)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/test/MonsterGroupPanel.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/MonsterGroupPanel'`.

- [ ] **Step 4: Criar o componente extraído**

```jsx
// src/systems/dnd5e/components/Encounter/MonsterGroupPanel.jsx
import { useMemo, useState } from 'react'
import { BestiaryModal } from '../Bestiary/BestiaryModal'
import { Button } from '../../../../components/ui/Button'
import { addNpc, removeCombatant, totalXp } from '../../domain/encounter'

/**
 * Montar um grupo de monstros. Controlado: recebe um `state` de encontro só
 * com monstros e devolve o novo por `onChange`.
 *
 * Extraído do `SetupPanel` pra ser reusado pela tela de preparação — as duas
 * precisam exatamente do mesmo gesto de adicionar/remover, e mantê-lo em dois
 * lugares garantiria que divergissem.
 */
export function MonsterGroupPanel({ value, onChange }) {
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const [rollHp, setRollHp] = useState(false)

  const xp = useMemo(() => totalXp(value), [value])

  return (
    <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100 flex items-center justify-between">
        <span>Monstros ({value.combatants.length})</span>
        {xp > 0 && <span className="ink-italic normal-case tracking-normal">{xp} XP</span>}
      </h2>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setBestiaryOpen(true)}>
            Adicionar monstros
          </Button>
          <label className="flex items-center gap-2 text-xs ink-italic text-ink-300">
            <input
              type="checkbox"
              checked={rollHp}
              onChange={e => setRollHp(e.target.checked)}
              aria-label="Rolar HP em vez da média"
              className="w-4 h-4"
            />
            rolar HP em vez da média
          </label>
        </div>
        {value.combatants.length > 0 && (
          <ul className="divide-y divide-parchment-600/50">
            {value.combatants.map(m => (
              <li key={m.id} className="py-2 flex items-center gap-3 text-sm text-ink-500">
                <span className="flex-1">{m.name}</span>
                <span className="text-xs ink-italic text-ink-300">{m.currentHp} PV · CA {m.ac}</span>
                <button
                  type="button"
                  aria-label={`Remover ${m.name}`}
                  onClick={() => onChange(removeCombatant(value, m.id))}
                  className="text-xs text-red-700 hover:underline"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BestiaryModal
        isOpen={bestiaryOpen}
        onClose={() => setBestiaryOpen(false)}
        onPick={(monster) => onChange(addNpc(value, monster, { rollHp }))}
      />
    </section>
  )
}
```

- [ ] **Step 5: Usar o componente no `SetupPanel`**

No `SetupPanel.jsx`: apague o `useState` de `bestiaryOpen` e de `rollHp`, o
`useMemo` do `xp`, a `<section>` inteira de monstros e o `<BestiaryModal>` do
fim. Troque a seção de monstros por:

```jsx
      <MonsterGroupPanel value={monsters} onChange={setMonsters} />
```

Ajuste os imports do topo — saem `BestiaryModal`, `addNpc`, `removeCombatant` e
`totalXp`; entra `MonsterGroupPanel`:

```jsx
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { emptyEncounterState, addPc, rollInitiative, startEncounter } from '../../domain/encounter'
import { MonsterGroupPanel } from './MonsterGroupPanel'
```

- [ ] **Step 6: Rodar os dois arquivos de teste**

Run: `npx vitest run src/test/MonsterGroupPanel.test.jsx src/test/EncounterSetupPanel.test.jsx`
Expected: 4 + 5 testes passando. Os 5 do `SetupPanel` **não podem** ter mudado —
se algum quebrou, o refactor mudou comportamento: PARE e reporte.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/MonsterGroupPanel.jsx src/systems/dnd5e/components/Encounter/SetupPanel.jsx src/test/MonsterGroupPanel.test.jsx
git commit -m "refactor(construtor-de-encontros): extrai MonsterGroupPanel do SetupPanel"
```

---

## Task 10: Medidor dentro do combate

**Files:**
- Modify: `src/systems/dnd5e/components/Encounter/SetupPanel.jsx`, `src/systems/dnd5e/components/Encounter/EncounterScreen.jsx`
- Test: `src/test/EncounterSetupPanel.test.jsx` (acrescentar)

- [ ] **Step 1: Write the failing test**

Acrescente ao final do `describe('SetupPanel', …)` em
`src/test/EncounterSetupPanel.test.jsx`:

```jsx
  it('mostra a dificuldade contra quem está marcado na cena', async () => {
    const { rerender } = render(
      <SetupPanel
        party={[
          { characterId: 'a', name: 'Ana', initiativeBonus: 2, level: 3 },
          { characterId: 'b', name: 'Bruno', initiativeBonus: 0, level: 3 },
        ]}
        onStart={() => {}}
        rng={() => 0.5}
      />,
    )
    void rerender
    // Sem monstros ainda.
    expect(screen.getByText(/sem monstros/i)).toBeInTheDocument()
  })

  it('desmarcar um PJ muda a companhia usada no medidor', async () => {
    render(
      <SetupPanel
        party={[
          { characterId: 'a', name: 'Ana', initiativeBonus: 2, level: 3 },
          { characterId: 'b', name: 'Bruno', initiativeBonus: 0, level: 3 },
        ]}
        onStart={() => {}}
        rng={() => 0.5}
      />,
    )
    expect(screen.getByLabelText(/quantidade de personagens/i)).toHaveValue(2)
    await userEvent.click(screen.getByLabelText('Bruno'))
    expect(screen.getByLabelText(/quantidade de personagens/i)).toHaveValue(1)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx`
Expected: FAIL — não existe campo "quantidade de personagens" nem texto "sem monstros".

- [ ] **Step 3: Ligar o medidor no `SetupPanel`**

Import novo no topo:

```jsx
import { DifficultyMeter } from './DifficultyMeter'
import { totalXp } from '../../domain/encounter'
```

Dentro do componente, antes do `return`:

```jsx
  // O medidor usa quem está MARCADO na cena, não a mesa inteira — é a
  // informação mais precisa disponível neste momento.
  const levels = chosen.map(p => p.level ?? 1)
```

E no JSX, logo depois do `<MonsterGroupPanel …>`:

```jsx
      <DifficultyMeter
        monsterXpTotal={totalXp(monsters)}
        monsterCount={monsters.combatants.length}
        levels={levels}
      />
```

- [ ] **Step 4: Fazer a tela passar o nível**

Em `EncounterScreen.jsx`, o `useMemo` do `party` ganha o nível. Import novo:

```jsx
import { characterLevel } from '../../domain/party'
```

E o memo:

```jsx
  const party = useMemo(() => Object.values(docs).map(doc => ({
    characterId: doc.id,
    name: doc.info?.name ?? 'Sem nome',
    level: characterLevel(doc),
    initiativeBonus: calculateInitiative(doc.attributes?.dex ?? 10, { feats: doc.info?.feats ?? [] }),
  })), [docs])
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx src/test/EncounterScreen.test.jsx`
Expected: PASS nos dois arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/SetupPanel.jsx src/systems/dnd5e/components/Encounter/EncounterScreen.jsx src/test/EncounterSetupPanel.test.jsx
git commit -m "feat(construtor-de-encontros): dificuldade ao vivo na montagem do combate"
```

---

## Task 11: `EncounterLibraryScreen`

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/EncounterLibraryScreen.jsx`
- Modify: `src/systems/dnd5e/components/Encounter/index.js`
- Test: `src/test/EncounterLibraryScreen.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/EncounterLibraryScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({ templates: [], party: [], created: [], deleted: [], createResult: null }))

vi.mock('../lib/encounterTemplates', () => ({
  listTemplates: vi.fn(async () => api.templates),
  createTemplate: vi.fn(async (campaignId, name, monsters) => {
    if (api.createResult) return api.createResult
    const row = { id: `tpl-${api.created.length + 1}`, campaign_id: campaignId, name, monsters }
    api.created.push(row)
    api.templates = [...api.templates, row]
    return { ok: true, row }
  }),
  updateTemplate: vi.fn(async () => ({ ok: true })),
  deleteTemplate: vi.fn(async (id) => { api.deleted.push(id); api.templates = api.templates.filter(t => t.id !== id); return { ok: true } }),
}))
vi.mock('../lib/campaigns', () => ({ loadCampaignCharacters: vi.fn(async () => api.party) }))
vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick({ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] })}>stub-add-goblin</button>
    : null,
}))

const { EncounterLibraryScreen } = await import('../systems/dnd5e/components/Encounter/EncounterLibraryScreen')

function anaRow() {
  return {
    id: 'a', owner_id: 'u2', campaign_id: 'camp-1', version: 1,
    data: { id: 'a', info: { name: 'Ana', level: 3 }, attributes: { dex: 14 }, combat: {} },
  }
}

beforeEach(() => {
  api.templates = []
  api.party = [anaRow(), { ...anaRow(), id: 'b', data: { ...anaRow().data, id: 'b', info: { name: 'Bruno', level: 3 } } }]
  api.created = []
  api.deleted = []
  api.createResult = null
})

describe('EncounterLibraryScreen', () => {
  it('mesa sem encontros salvos convida a criar o primeiro', async () => {
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByText(/nenhum encontro salvo/i)).toBeInTheDocument()
  })

  it('lista os salvos com a faixa contra a companhia ATUAL', async () => {
    // 3 goblins = 150 XP bruto, ×2 = 300; 2 personagens nv3 → limiares
    // 150/300/450/800 → 300 cai em "médio".
    api.templates = [{ id: 't1', name: 'Emboscada', monsters: [{ monsterIndex: 'goblin', count: 3 }] }]
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByText('Emboscada')).toBeInTheDocument()
    expect(await screen.findByText(/médio/i)).toBeInTheDocument()
  })

  it('cria um encontro com nome e monstros', async () => {
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Emboscada na ponte')
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0]).toMatchObject({ name: 'Emboscada na ponte' })
    expect(api.created[0].monsters).toEqual([{ monsterIndex: 'goblin', count: 1 }])
  })

  it('agrupa monstros repetidos em count', async () => {
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Três goblins')
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    const add = screen.getByText('stub-add-goblin')
    await userEvent.click(add)
    await userEvent.click(add)
    await userEvent.click(add)
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(api.created).toHaveLength(1))
    expect(api.created[0].monsters).toEqual([{ monsterIndex: 'goblin', count: 3 }])
  })

  it('nome duplicado avisa e não sai da edição', async () => {
    api.createResult = { ok: false, reason: 'duplicate-name' }
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /novo encontro/i }))
    await userEvent.type(screen.getByLabelText(/nome do encontro/i), 'Repetido')
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    expect(await screen.findByText(/já existe um encontro com esse nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nome do encontro/i)).toBeInTheDocument()
  })

  it('apagar pede confirmação', async () => {
    api.templates = [{ id: 't1', name: 'Emboscada', monsters: [] }]
    render(<EncounterLibraryScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /apagar emboscada/i }))
    await userEvent.click(screen.getByRole('button', { name: /^apagar$/i }))
    await waitFor(() => expect(api.deleted).toEqual(['t1']))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterLibraryScreen.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/EncounterLibraryScreen'`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/Encounter/EncounterLibraryScreen.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../../../lib/encounterTemplates'
import { loadCampaignCharacters } from '../../../../lib/campaigns'
import { rowToCharacter } from '../../../../utils/storage'
import { Button } from '../../../../components/ui/Button'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { partyLevels } from '../../domain/party'
import { emptyEncounterState, addNpc, totalXp } from '../../domain/encounter'
import { summarizeEncounter } from '../../domain/encounterDifficulty'
import { MonsterGroupPanel } from './MonsterGroupPanel'
import { DifficultyMeter } from './DifficultyMeter'
import { useLazySrdDataset } from '../../data/SrdProvider'

const BAND_LABEL = {
  trivial: 'Trivial', easy: 'Fácil', medium: 'Médio', hard: 'Difícil', deadly: 'Mortal',
}

/** `state` de encontro → receita salva: agrupa repetidos em `count`. */
export function toRecipe(state) {
  const byIndex = new Map()
  for (const c of state.combatants) {
    if (c.kind !== 'npc') continue
    byIndex.set(c.monsterIndex, (byIndex.get(c.monsterIndex) ?? 0) + 1)
  }
  return [...byIndex].map(([monsterIndex, count]) => ({ monsterIndex, count }))
}

/** Receita salva → `state` de encontro, usando o catálogo pra achar o statblock. */
export function fromRecipe(recipe, monstersByIndex) {
  let s = emptyEncounterState()
  const unknown = []
  for (const item of recipe ?? []) {
    const monster = monstersByIndex.get(item.monsterIndex)
    if (!monster) { unknown.push(item.monsterIndex); continue }
    const count = Math.max(1, Math.floor(Number(item.count) || 1))
    for (let i = 0; i < count; i++) s = addNpc(s, monster)
  }
  return { state: s, unknown }
}

/**
 * Tela de preparação: a biblioteca de encontros salvos da mesa.
 *
 * Separada da tela de combate de propósito — abrir aquela CRIA um encontro
 * ativo no banco, e preparar não deveria abrir uma luta que ninguém joga.
 */
export function EncounterLibraryScreen({ campaignId, onBack }) {
  // Catálogo sob demanda: 1,3 MB que só esta tela e o bestiário precisam.
  const catalog = useLazySrdDataset('monsters')
  const [templates, setTemplates] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { id|null, name, group }
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const byIndex = useMemo(() => {
    const m = new Map()
    for (const mon of catalog ?? []) m.set(mon.index, mon)
    return m
  }, [catalog])

  const reload = useCallback(async () => {
    const [rows, chars] = await Promise.all([
      listTemplates(campaignId),
      loadCampaignCharacters(campaignId),
    ])
    setTemplates(rows)
    setLevels(partyLevels(chars.map(rowToCharacter).filter(Boolean)))
    setLoading(false)
  }, [campaignId])

  useEffect(() => { reload() }, [reload])

  function novo() {
    setError(null)
    setEditing({ id: null, name: '', group: emptyEncounterState() })
  }

  function editar(tpl) {
    setError(null)
    const { state } = fromRecipe(tpl.monsters, byIndex)
    setEditing({ id: tpl.id, name: tpl.name, group: state })
  }

  async function salvar() {
    const recipe = toRecipe(editing.group)
    const res = editing.id
      ? await updateTemplate(editing.id, { name: editing.name, monsters: recipe })
      : await createTemplate(campaignId, editing.name, recipe)
    if (!res.ok) {
      setError(res.reason === 'duplicate-name'
        ? 'Já existe um encontro com esse nome nesta mesa.'
        : res.reason === 'invalid-name'
          ? 'O nome precisa ter de 1 a 80 caracteres.'
          : 'Não consegui salvar. Tente de novo.')
      return
    }
    setEditing(null)
    setError(null)
    reload()
  }

  if (loading) return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando encontros…</div>

  return (
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="max-w-3xl mx-auto mb-4">
        <button onClick={onBack} className="text-xs ink-italic text-ink-300 hover:text-ink-500">← Mesa</button>
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500 mt-1">Encontros</h1>
      </header>

      <div className="max-w-3xl mx-auto grid gap-4">
        {editing ? (
          <>
            <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 p-4 flex flex-col gap-3">
              <label className="text-xs ink-italic text-ink-300 flex flex-col gap-1">
                Nome do encontro
                <input
                  type="text"
                  aria-label="Nome do encontro"
                  value={editing.name}
                  onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                  className="px-2 py-1 text-sm text-ink-500 border-2 border-parchment-600 bg-parchment-50 rounded-sm"
                />
              </label>
              {error && <p className="text-xs text-red-700">{error}</p>}
            </section>

            <MonsterGroupPanel value={editing.group} onChange={g => setEditing(v => ({ ...v, group: g }))} />

            <DifficultyMeter
              monsterXpTotal={totalXp(editing.group)}
              monsterCount={editing.group.combatants.length}
              levels={levels}
            />

            <div className="flex gap-2">
              <Button size="sm" onClick={salvar}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setError(null) }}>Cancelar</Button>
            </div>
          </>
        ) : (
          <>
            <div><Button size="sm" onClick={novo}>Novo encontro</Button></div>

            <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
              <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
                Salvos ({templates.length})
              </h2>
              {templates.length === 0 ? (
                <p className="p-4 text-sm ink-italic text-ink-300">
                  Nenhum encontro salvo nesta mesa ainda.
                </p>
              ) : (
                <ul className="divide-y divide-parchment-600/50">
                  {templates.map(tpl => {
                    const { state, unknown } = fromRecipe(tpl.monsters, byIndex)
                    const s = summarizeEncounter({
                      monsterXpTotal: totalXp(state),
                      monsterCount: state.combatants.length,
                      levels,
                    })
                    return (
                      <li key={tpl.id} className="px-4 py-2 flex flex-wrap items-center gap-3">
                        <span className="flex-1 text-sm font-display tracking-wide">{tpl.name}</span>
                        <span className="text-xs ink-italic text-ink-300">{s.adjusted} XP ajustado</span>
                        {s.band && <span className="text-xs text-ink-500">{BAND_LABEL[s.band]}</span>}
                        {unknown.length > 0 && (
                          <span className="text-xs ink-italic text-red-700">
                            {unknown.length} monstro(s) desconhecido(s)
                          </span>
                        )}
                        <button type="button" onClick={() => editar(tpl)}
                          className="text-xs text-ink-500 underline">editar</button>
                        <button
                          type="button"
                          aria-label={`Apagar ${tpl.name}`}
                          onClick={() => setConfirmDelete(tpl)}
                          className="text-xs text-red-700 underline"
                        >
                          apagar
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Apagar encontro salvo?"
        message={<p>O encontro <strong>{confirmDelete?.name}</strong> some da mesa. Não há como desfazer.</p>}
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => {
          const alvo = confirmDelete
          setConfirmDelete(null)
          if (alvo) { await deleteTemplate(alvo.id); reload() }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Registrar os monstros como dataset preguiçoso**

O `SrdProvider` **não** conhecia monstros até agora — quem carregava era o
`BestiaryModal`, com `fetch` próprio. Registrar o catálogo como dataset lazy
evita que cada tela nova repita esse fetch.

Em `src/systems/dnd5e/data/SrdProvider.jsx`, dentro do bloco `lazy: true` de
`DATASETS` (depois de `spellMechanics`):

```js
  // Catálogo do bestiário: 1,3 MB, só o construtor de encontros e o bestiário
  // precisam. `pt` aponta direto pro arquivo SRD, mesmo padrão de `levels` —
  // o PT dos monstros é um OVERLAY parcial (63 de 334), não um substituto.
  monsters:        { pt: '5e-SRD-Monsters.json',         fallback: null,                      lazy: true },
```

Teste, em `src/test/srd-monsters-dataset.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('dataset de monstros no SrdProvider', () => {
  it('está registrado como lazy e aponta pro arquivo SRD', () => {
    const src = readFileSync('src/systems/dnd5e/data/SrdProvider.jsx', 'utf8')
    expect(src).toMatch(/monsters:\s*\{\s*pt:\s*'5e-SRD-Monsters\.json'[^}]*lazy:\s*true/)
  })

  it('o arquivo existe e tem os campos que a conta de dificuldade usa', () => {
    const list = JSON.parse(readFileSync('public/srd-data/5e-SRD-Monsters.json', 'utf8'))
    expect(list.length).toBeGreaterThan(300)
    const goblin = list.find(m => m.index === 'goblin')
    expect(goblin).toMatchObject({ xp: 50 })
    expect(goblin.armor_class[0].value).toBe(15)
  })
})
```

Run: `npx vitest run src/test/srd-monsters-dataset.test.js`
Expected: PASS — 2 testes.

- [ ] **Step 5: Exportar no barrel**

Em `src/systems/dnd5e/components/Encounter/index.js`:

```js
export { EncounterScreen } from './EncounterScreen'
export { EncounterLibraryScreen } from './EncounterLibraryScreen'
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterLibraryScreen.test.jsx`
Expected: PASS — 7 testes.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/EncounterLibraryScreen.jsx src/systems/dnd5e/components/Encounter/index.js src/systems/dnd5e/data/SrdProvider.jsx src/test/EncounterLibraryScreen.test.jsx src/test/srd-monsters-dataset.test.js
git commit -m "feat(construtor-de-encontros): biblioteca de encontros salvos da mesa"
```

---

## Task 12: Rota `/campaigns/:id/encontros`

**Files:**
- Modify: `src/systems/dnd5e/ui.jsx`, `src/systems/ui-registry.js`, `src/App.jsx`, `src/components/Campaigns/CampaignDetail.jsx`
- Test: `src/test/EncounterLibraryRoute.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/EncounterLibraryRoute.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { getLazyEncounterLibrary } from '../systems/ui-registry'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

describe('registro de UI — biblioteca de encontros', () => {
  it('expõe a tela do dnd5e', () => {
    expect(getLazyEncounterLibrary('dnd5e')).toBeTruthy()
  })

  it('sistema desconhecido não tem a tela', () => {
    expect(getLazyEncounterLibrary('daggerheart')).toBeNull()
  })

  it('memoiza o lazy', () => {
    expect(getLazyEncounterLibrary('dnd5e')).toBe(getLazyEncounterLibrary('dnd5e'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterLibraryRoute.test.jsx`
Expected: FAIL — `getLazyEncounterLibrary is not a function`.

- [ ] **Step 3: Write minimal implementation**

Em `src/systems/ui-registry.js`:

```js
export const getLazyEncounterLibrary = (systemId) => getLazy(systemId, 'EncounterLibrary')
```

Em `src/systems/dnd5e/ui.jsx` (o import do barrel já existe; acrescente o nome):

```jsx
import { EncounterScreen, EncounterLibraryScreen } from './components/Encounter'

export function EncounterLibrary(props) {
  return (
    <SrdProvider>
      <EncounterLibraryScreen {...props} />
    </SrdProvider>
  )
}
```

Em `src/App.jsx`, junto do `EncounterRoute` (que já resolve sistema e papel do
Mestre em paralelo — copie o mesmo padrão, inclusive a guarda de DM):

```jsx
function EncounterLibraryRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [resolved, setResolved] = useState(null)
  useEffect(() => {
    let alive = true
    setResolved(null)
    Promise.all([getCampaignSystem(id), isCampaignDM(id)])
      .then(([system, isDM]) => { if (alive) setResolved({ system, isDM }) })
    return () => { alive = false }
  }, [id])

  if (resolved === null) return <Loader />
  if (!resolved.isDM) return <Navigate to={`/campaigns/${id}`} replace />
  const Library = getLazyEncounterLibrary(resolved.system)
  if (!Library) return <Navigate to={`/campaigns/${id}`} replace />
  return (
    <RouteShell>
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Library campaignId={id} onBack={() => navigate(`/campaigns/${id}`)} />
    </RouteShell>
  )
}
```

Acrescente `getLazyEncounterLibrary` ao import de `./systems/ui-registry` e a
rota, antes da curinga `*`:

```jsx
          <Route path="/campaigns/:id/encontros" element={<EncounterLibraryRoute />} />
```

Em `src/components/Campaigns/CampaignDetail.jsx`, no mesmo bloco `isDM` do botão
"Rodar combate", ao lado dele:

```jsx
            <Button size="sm" variant="ghost" onClick={() => navigate(`/campaigns/${campaign.id}/encontros`)}>
              Encontros
            </Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterLibraryRoute.test.jsx src/test/EncounterRoute.test.jsx src/test/App-routing.test.jsx`
Expected: PASS nos três.

- [ ] **Step 5: Commit**

```bash
git add src/systems/ui-registry.js src/systems/dnd5e/ui.jsx src/App.jsx src/components/Campaigns/CampaignDetail.jsx src/test/EncounterLibraryRoute.test.jsx
git commit -m "feat(construtor-de-encontros): rota /campaigns/:id/encontros com guarda do Mestre"
```

---

## Task 13: Carregar encontro salvo dentro do combate

**Files:**
- Modify: `src/systems/dnd5e/components/Encounter/SetupPanel.jsx`
- Test: `src/test/EncounterSetupPanel.test.jsx` (acrescentar)

- [ ] **Step 1: Write the failing test**

Acrescente ao `src/test/EncounterSetupPanel.test.jsx`. No topo do arquivo, junto
dos outros mocks:

```jsx
const tpl = vi.hoisted(() => ({ list: [] }))
vi.mock('../lib/encounterTemplates', () => ({
  listTemplates: vi.fn(async () => tpl.list),
}))
```

E os testes, dentro do `describe`:

```jsx
  it('sem encontros salvos não oferece carregar', async () => {
    tpl.list = []
    setup()
    await waitFor(() => expect(screen.queryByRole('button', { name: /carregar encontro salvo/i })).toBeNull())
  })

  it('carregar um salvo injeta os monstros na cena', async () => {
    tpl.list = [{ id: 't1', name: 'Emboscada', monsters: [{ monsterIndex: 'goblin', count: 2 }] }]
    setup({ campaignId: 'camp-1' })
    await userEvent.click(await screen.findByRole('button', { name: /carregar encontro salvo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^emboscada$/i }))
    expect(await screen.findByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Goblin 2')).toBeInTheDocument()
  })
```

Ajuste o `setup()` do arquivo para repassar props extras e importe `waitFor` de
`@testing-library/react` se ainda não estiver importado.

O mock do `BestiaryModal` que já existe no arquivo devolve o goblin; para este
teste o `SetupPanel` precisa do catálogo. Acrescente ao topo:

```jsx
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => ([{ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] }]),
}))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx`
Expected: FAIL — não existe o botão "Carregar encontro salvo".

- [ ] **Step 3: Write minimal implementation**

No `SetupPanel.jsx`, imports novos:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { listTemplates } from '../../../../lib/encounterTemplates'
import { useLazySrdDataset } from '../../data/SrdProvider'
import { fromRecipe } from './EncounterLibraryScreen'
```

A assinatura ganha `campaignId`:

```jsx
export function SetupPanel({ party, onStart, campaignId, rng = Math.random }) {
```

Estado e carga:

```jsx
  const catalog = useLazySrdDataset('monsters')
  const [saved, setSaved] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let alive = true
    if (!campaignId) return
    listTemplates(campaignId).then(rows => { if (alive) setSaved(rows) })
    return () => { alive = false }
  }, [campaignId])

  const byIndex = useMemo(() => {
    const m = new Map()
    for (const mon of catalog ?? []) m.set(mon.index, mon)
    return m
  }, [catalog])

  function carregar(tpl) {
    // Acrescenta à cena em vez de substituir: o Mestre pode juntar dois grupos.
    const { state: grupo } = fromRecipe(tpl.monsters, byIndex)
    setMonsters(prev => grupo.combatants.reduce(
      (s, m) => ({ ...s, nextSeq: s.nextSeq + 1, combatants: [...s.combatants, { ...m, id: `k${s.nextSeq}` }] }),
      prev,
    ))
    setPickerOpen(false)
  }
```

E no JSX, logo acima do `<MonsterGroupPanel …>`:

```jsx
      {saved.length > 0 && (
        <div className="flex flex-col gap-2">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setPickerOpen(o => !o)}>
              Carregar encontro salvo
            </Button>
          </div>
          {pickerOpen && (
            <ul className="rounded-sm border-2 border-parchment-600 bg-parchment-50 divide-y divide-parchment-600/50">
              {saved.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => carregar(t)}
                    className="w-full text-left px-4 py-2 text-sm text-ink-500 hover:bg-parchment-200"
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
```

- [ ] **Step 4: Passar `campaignId` do `EncounterScreen`**

Em `EncounterScreen.jsx`:

```jsx
          <SetupPanel party={party} campaignId={campaignId} onStart={(next) => update(() => next)} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx src/test/EncounterScreen.test.jsx`
Expected: PASS nos dois.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/SetupPanel.jsx src/systems/dnd5e/components/Encounter/EncounterScreen.jsx src/test/EncounterSetupPanel.test.jsx
git commit -m "feat(construtor-de-encontros): carregar encontro salvo na montagem do combate"
```

---

## Task 14: E2E e fechamento

**Files:**
- Modify: `e2e-pw/support/supabase-stub.js`, `e2e-pw/encounter.spec.js`

- [ ] **Step 1: Estender o stub**

Em `stubSupabase`, junto do estado de `encounters`:

```js
  const templates = new Map()                  // id → row
  let tplSeq = 1
```

E no roteador REST, antes do bloco de `encounters`:

```js
    if (path.startsWith('encounter_templates')) {
      if (method === 'GET') return json(route, [...templates.values()])
      if (method === 'POST') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const incoming = Array.isArray(body) ? body[0] : body
        const dup = [...templates.values()].some(
          t => t.name.trim().toLowerCase() === String(incoming.name).trim().toLowerCase())
        if (dup) return json(route, { code: '23505', message: 'duplicate key' }, 409)
        const row = { id: `tpl-${tplSeq++}`, ...incoming }
        templates.set(row.id, row)
        return json(route, wantsSingle ? row : [row], 201)
      }
      if (method === 'PATCH') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const row = templates.get(id)
        if (row) Object.assign(row, body)
        return json(route, wantsSingle ? (row ?? null) : (row ? [row] : []))
      }
      if (method === 'DELETE') {
        const id = url.searchParams.get('id')?.replace('eq.', '')
        templates.delete(id)
        return json(route, wantsSingle ? null : [])
      }
    }
```

- [ ] **Step 2: Escrever o spec**

Acrescente a `e2e-pw/encounter.spec.js`:

```js
test('Mestre salva um encontro na prep e carrega no combate', async ({ page, context }) => {
  await installAuthedApp(context, {
    characters: [ANA],
    campaigns: [{ id: CAMPAIGN_ID, name: 'Mesa de Teste', dm_id: USER_ID, system: 'dnd5e' }],
  })

  // Preparação: cria o encontro salvo.
  await page.goto(`/campaigns/${CAMPAIGN_ID}/encontros`)
  await page.getByRole('button', { name: /novo encontro/i }).click()
  await page.getByLabel(/nome do encontro/i).fill('Emboscada na ponte')
  await page.getByRole('button', { name: /adicionar monstros/i }).click()
  await page.getByRole('button', { name: /adicionar ao combate/i }).click()
  await page.getByRole('button', { name: /fechar/i }).first().click()
  await page.getByRole('button', { name: /^salvar$/i }).click()
  await expect(page.getByText('Emboscada na ponte')).toBeVisible()

  // Combate: carrega o mesmo encontro.
  await page.goto(`/campaigns/${CAMPAIGN_ID}/combate`)
  await page.getByRole('button', { name: /carregar encontro salvo/i }).click()
  await page.getByRole('button', { name: /^emboscada na ponte$/i }).click()
  await expect(page.getByText(/1 PV|PV · CA/).first()).toBeVisible()
})
```

- [ ] **Step 3: Rodar até passar**

Run: `npx playwright test e2e-pw/encounter.spec.js --reporter=line`

Na primeira execução é esperado ajustar seletores (o nome do monstro escolhido
no bestiário depende de qual linha o teste clicou). **Ajuste apenas o spec e o
stub — nunca `src/`.** Se o e2e revelar um bug de produção, PARE e reporte.

- [ ] **Step 4: Suíte e2e inteira**

Run: `npx playwright test`
Expected: nenhuma falha nova.

- [ ] **Step 5: Fechamento**

```bash
npm run lint:gate
npm run typecheck
npx vitest run
```

Expected: gate OK (baseline 616), typecheck sem erro novo, e a suíte unitária
verde. **Nota:** `src/test/sheetV2-HeaderV2-hp.test.jsx` tem flake de timeout
conhecido sob carga total — se falhar, rode isolado para confirmar que passa
(`npx vitest run src/test/sheetV2-HeaderV2-hp.test.jsx`) e siga.

Confirme também que nenhum JSON mudou, o que dispensa bump do service worker:

```bash
git diff --name-only master...HEAD -- public/srd-data
```

Expected: saída vazia.

- [ ] **Step 6: Commit**

```bash
git add e2e-pw/support/supabase-stub.js e2e-pw/encounter.spec.js
git commit -m "test(construtor-de-encontros): e2e de salvar na prep e carregar no combate"
```

---

## Self-review

**Cobertura do spec:**

| Requisito | Task |
|---|---|
| Nível total da ficha somando multiclasse, clamp 1..20 | 1 |
| Tabela de limiares, soma por personagem (não média) | 2 |
| Escada de 7 posições, ajuste por tamanho de grupo nos dois sentidos | 3 |
| Faixa com "igual entra na faixa de cima"; sem companhia = null | 4 |
| Tabela `encounter_templates`, nome único case-insensitive, check de tamanho, RLS do Mestre, trigger de `updated_at`, sem `version` | 5 |
| Perímetro: player não lê nem escreve; nome duplicado e vazio recusados | 6 |
| CRUD com validação de nome no cliente e tradução do 23505 | 7 |
| Medidor com XP bruto/ajustado/multiplicador/faixa e ajuste manual | 8 |
| `MonsterGroupPanel` extraído e reusado | 9 |
| Medidor no combate usando quem está marcado na cena | 10 |
| Biblioteca: listar com faixa contra a companhia ATUAL, criar, editar, apagar com confirmação, monstro desconhecido não derruba | 11 |
| Rota própria com guarda do Mestre + botão na mesa | 12 |
| "Carregar encontro salvo" no combate | 13 |
| E2E do fluxo prep → combate; sem bump de SW | 14 |
| Template é receita (`monsterIndex` + `count`), não instância | 11 (`toRecipe`/`fromRecipe`) |
| `count` ausente ou ≤ 0 vira 1 | 11 (`fromRecipe`) |

**Consistência de nomes verificada:** `characterLevel`, `partyLevels`,
`thresholdsForLevel`, `partyThresholds`, `MULTIPLIER_LADDER`,
`encounterMultiplier`, `adjustedXp`, `difficultyBand`, `summarizeEncounter`,
`BANDS`, `listTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`,
`DifficultyMeter`, `MonsterGroupPanel`, `EncounterLibraryScreen`, `toRecipe`,
`fromRecipe`, `getLazyEncounterLibrary` — usados com o mesmo nome em toda task
que os referencia.

**Contratos externos confirmados na escrita do plano:** `is_campaign_dm(uuid)`
(migration 0004); `ConfirmDialog` com `open`/`title`/`message`/`confirmLabel`/
`onConfirm`/`onCancel`/`variant`/`busy`; `Button` com `variant` e `size`;
`isCampaignDM` e `getCampaignSystem` em `lib/campaigns.js`; `useLazySrdDataset(name)`
em `SrdProvider.jsx`, que pede o dataset e devolve `ctx[name]`.

**Uma suposição foi checada e REPROVADA durante a escrita:** o `SrdProvider`
não conhecia monstros — quem carrega o catálogo hoje é o `BestiaryModal`, com
`fetch` próprio. Por isso a Task 11 ganhou o passo de registrar `monsters` como
dataset preguiçoso, em vez de as telas novas repetirem o fetch. O `pt` aponta
direto para o arquivo SRD (mesmo padrão de `levels`), porque o PT dos monstros
é overlay parcial de 63 de 334, não um substituto.
