# Caçador de Sangue — Fase 1 (fonte de terceiros + classe base)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar em produção a classe Caçador de Sangue (versão 2016 oficial, em português) do 1º ao 20º nível, sob um código de fonte novo `homebrew`, com Ritual Vermelho e Sangue Maldito mecanicamente vivos.

**Architecture:** A classe entra pelo eixo `source` (aditivo), copiando o pacote de dados que o Artífice do Tasha já provou: três JSONs em `public/srd-data/` compostos no `SrdProvider`. A regra da classe mora num módulo puro `domain/bloodHunter.js`, no molde de `domain/runes.js`. Só duas costuras tocam o núcleo: `calculateWeaponDamage` passa a somar o dado de rito da arma imbuída, e `useCharacterCalculations` passa a expor `effectiveMaxHp` (o rito reduz o teto de PV), no mesmo padrão de `effectiveAC`/`effectiveSpeed`.

**Tech Stack:** React 18, Vite, Vitest, Zod (schema da ficha), Tailwind v4 com tema `.theme-v2`.

**Fonte do conteúdo:** `Caçador_de_Sangue_CriticalRole_dnd_5e.pdf` (22 páginas, PT). A tradução do PDF tem defeitos ("Ordem do Ghostslayer", "Regeneration Licantrópica", "Charisma", "MASTERIA", "descanço") — **corrija a redação ao transcrever, mantendo a regra intacta.**

**Fora desta fase:** as quatro Ordens (fases 2 e 3) e a Ordem da Alma Profana (projeto separado). Nesta fase a escolha de Ordem existe no dado, mas nenhuma opção é jogável ainda.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `src/systems/dnd5e/domain/bloodHunter.js` | **criar** — toda a regra da classe, puro, sem React |
| `src/systems/dnd5e/domain/sources.js` | **modificar** — registrar o código de fonte `homebrew` |
| `src/systems/dnd5e/domain/characterSchema.js` | **modificar** — campo `combat.crimsonRites` |
| `src/systems/dnd5e/domain/rules.js` | **modificar** — tracker de Sangue Maldito; clamp de cura no teto efetivo |
| `src/systems/dnd5e/utils/attacks.js` | **modificar** — somar o dado de rito ao dano |
| `src/systems/dnd5e/hooks/useCharacterCalculations.js` | **modificar** — expor `effectiveMaxHp` |
| `src/systems/dnd5e/data/SrdProvider.jsx` | **modificar** — registrar os três datasets |
| `src/systems/dnd5e/components/CharacterSheet/v2/CrimsonRitePanel.jsx` | **criar** — painel do Ritual Vermelho |
| `src/systems/dnd5e/components/CharacterSheet/v2/ActionsTab.jsx` | **modificar** — carimbar `rite` no ataque e montar o painel |
| `public/srd-data/homebrew-classes-pt.json` | **criar** — identidade da classe |
| `public/srd-data/homebrew-class-progression-pt.json` | **criar** — 20 níveis |
| `public/srd-data/homebrew-class-choices-pt.json` | **criar** — escolhas |
| `vite.config.js` | **modificar** — bump do `cacheName` do Service Worker |

**Como rodar os testes:** sempre em fatia, nunca a suíte inteira — sem `--maxWorkers=2` o vitest estoura a memória da máquina e finge falhas em arquivos sem relação.

```bash
npx vitest run src/test/dnd5e/blood-hunter-rules.test.js --maxWorkers=2
```

---

## Task 1: Código de fonte `homebrew`

**Files:**
- Modify: `src/systems/dnd5e/domain/sources.js`
- Test: `src/test/dnd5e/homebrew-source.test.js`

> **Gating por geração fica pendente.** `domain/rulesets.js` (eixo 2014/2024)
> não existe nesta base — vive só na branch `feat/dnd-2024-eixo-ruleset`, que
> não terminou. Este projeto sai da master de propósito, para ser entregável
> sem esperar o 2024. A spec registra as duas linhas a acrescentar quando
> aquele eixo mergear.

- [ ] **Step 1: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import { SOURCES, filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

describe('fonte homebrew (conteúdo de terceiros)', () => {
  it('está registrada com rótulo e abreviação próprios', () => {
    expect(SOURCES.homebrew).toEqual({
      code: 'homebrew',
      label: 'Conteúdo de Terceiros',
      abbr: '3P',
    })
  })

  it('só oferece o item de terceiros quando a fonte está ligada', () => {
    const catalogo = [
      { index: 'guerreiro', source: 'phb' },
      { index: 'cacador-de-sangue', source: 'homebrew' },
    ]
    expect(filterCatalogBySources(catalogo, []).map(c => c.index))
      .toEqual(['guerreiro'])
    expect(filterCatalogBySources(catalogo, ['homebrew']).map(c => c.index))
      .toEqual(['guerreiro', 'cacador-de-sangue'])
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/homebrew-source.test.js --maxWorkers=2
```

Esperado: FAIL — `expected undefined to equal { code: 'homebrew', ... }`.

- [ ] **Step 3: Registre a fonte**

Em `src/systems/dnd5e/domain/sources.js`, dentro de `SOURCES`, depois de `xanathar`:

```js
  homebrew: { code: 'homebrew', label: 'Conteúdo de Terceiros',            abbr: '3P' },
```


- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/homebrew-source.test.js --maxWorkers=2
```

Esperado: PASS, 2 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/sources.js src/test/dnd5e/homebrew-source.test.js
git commit -m "feat(homebrew): codigo de fonte para conteudo de terceiros"
```

---

## Task 2: `bloodHunter.js` — catálogo de ritos, dado de rito e maldições conhecidas

O dado de rito (chamado "Dado de Dano Ritual de Sangue" na tabela do PDF) escala por nível de caçador de sangue: 1d4 nos níveis 1–5, 1d6 nos 6–10, 1d8 nos 11–15, 1d10 nos 16–20.

Maldições de sangue conhecidas: 1 a partir do 2º nível, e mais uma no 5º, 9º, 13º, 16º e 20º — totalizando 6 no nível 20. Abaixo do 2º nível, nenhuma.

Os tipos de dano usam o vocabulário que o app já fala (`fogo`, `frio`, `elétrico`, `trovejante`, `psíquico`, `necrótico`) — o PDF escreve "Dano de Gelo" e "Dano de Relâmpago", que aqui são `frio` e `elétrico`.

**Files:**
- Create: `src/systems/dnd5e/domain/bloodHunter.js`
- Test: `src/test/dnd5e/blood-hunter-rules.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import { BLOOD_HUNTER, RITES, riteDieFor, bloodCursesKnown } from '../../systems/dnd5e/domain/bloodHunter'

describe('bloodHunter — tabelas da classe', () => {
  it('usa o index canônico da classe', () => {
    expect(BLOOD_HUNTER).toBe('cacador-de-sangue')
  })

  it('escala o dado de rito a cada 5 níveis', () => {
    const esperado = {
      1: '1d4', 5: '1d4', 6: '1d6', 10: '1d6',
      11: '1d8', 15: '1d8', 16: '1d10', 20: '1d10',
    }
    for (const [nivel, dado] of Object.entries(esperado)) {
      expect(riteDieFor(Number(nivel))).toBe(dado)
    }
  })

  it('devolve o menor dado para nível inválido em vez de quebrar', () => {
    expect(riteDieFor(0)).toBe('1d4')
    expect(riteDieFor(undefined)).toBe('1d4')
    expect(riteDieFor(99)).toBe('1d10')
  })

  it('conta maldições de sangue conhecidas por nível', () => {
    expect(bloodCursesKnown(1)).toBe(0)
    expect(bloodCursesKnown(2)).toBe(1)
    expect(bloodCursesKnown(4)).toBe(1)
    expect(bloodCursesKnown(5)).toBe(2)
    expect(bloodCursesKnown(9)).toBe(3)
    expect(bloodCursesKnown(13)).toBe(4)
    expect(bloodCursesKnown(16)).toBe(5)
    expect(bloodCursesKnown(20)).toBe(6)
  })

  it('separa Rituais Primais de Esotéricos com o tipo de dano do app', () => {
    expect(RITES.chamas).toEqual({ name: 'Ritual das Chamas', damageType: 'fogo', tier: 'primal' })
    expect(RITES.congelamento.damageType).toBe('frio')
    expect(RITES.tempestade.damageType).toBe('elétrico')
    expect(RITES.rugido).toEqual({ name: 'Ritual do Rugido', damageType: 'trovejante', tier: 'esoteric' })
    expect(RITES.eter.damageType).toBe('psíquico')
    expect(RITES.morto.damageType).toBe('necrótico')
    expect(Object.keys(RITES)).toHaveLength(6)
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-rules.test.js --maxWorkers=2
```

Esperado: FAIL — `Failed to resolve import ".../domain/bloodHunter"`.

- [ ] **Step 3: Crie o módulo**

`src/systems/dnd5e/domain/bloodHunter.js`:

```js
/**
 * Caçador de Sangue (Matt Mercer, 2016) — conteúdo de terceiros, fonte
 * `homebrew`.
 *
 * Fonte única da regra da classe. Puro (sem React): o painel do Ritual
 * Vermelho, `defaultClassFeatureUses` e o motor de ataque leem daqui, então os
 * ids não podem divergir entre card e tracker.
 *
 * Duas mecânicas desta classe não existem no núcleo e por isso vivem aqui:
 * o rito soma um dado de dano NA ARMA IMBUÍDA (não em todo ataque) e reduz o
 * TETO de PV enquanto ativo.
 */

export const BLOOD_HUNTER = 'cacador-de-sangue'

/**
 * Rituais de sangue. `tier` decide onde a escolha é oferecida: Primais no 1º,
 * 6º e 11º níveis; Esotéricos só a partir do 14º.
 *
 * Os tipos usam o vocabulário de dano do app — o PDF escreve "Gelo" e
 * "Relâmpago", que aqui são `frio` e `elétrico`.
 */
export const RITES = {
  chamas:       { name: 'Ritual das Chamas',       damageType: 'fogo',       tier: 'primal' },
  congelamento: { name: 'Ritual do Congelamento',  damageType: 'frio',       tier: 'primal' },
  tempestade:   { name: 'Ritual da Tempestade',    damageType: 'elétrico',   tier: 'primal' },
  rugido:       { name: 'Ritual do Rugido',        damageType: 'trovejante', tier: 'esoteric' },
  eter:         { name: 'Ritual do Éter',          damageType: 'psíquico',   tier: 'esoteric' },
  morto:        { name: 'Ritual do Morto',         damageType: 'necrótico',  tier: 'esoteric' },
}

/** Dado de rito por nível de caçador de sangue (tabela A Caçador de Sangue). */
export function riteDieFor(level) {
  const lv = Number(level) || 0
  if (lv >= 16) return '1d10'
  if (lv >= 11) return '1d8'
  if (lv >= 6)  return '1d6'
  return '1d4'
}

/** Níveis em que uma maldição de sangue é aprendida. */
const CURSE_LEVELS = [2, 5, 9, 13, 16, 20]

/** Quantas maldições de sangue o personagem conhece no nível dado. */
export function bloodCursesKnown(level) {
  const lv = Number(level) || 0
  return CURSE_LEVELS.filter(n => lv >= n).length
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-rules.test.js --maxWorkers=2
```

Esperado: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/bloodHunter.js src/test/dnd5e/blood-hunter-rules.test.js
git commit -m "feat(homebrew): tabelas do Cacador de Sangue (rito e maldicoes)"
```

---

## Task 3: `bloodHunter.js` — CD de Hemocraft, ritos ativos e redutor de PV máximo

Regras do PDF que esta task codifica:

- A CD das maldições é **8 + bônus de proficiência + modificador de Sabedoria**.
- Ativar um rito **reduz o PV máximo em um valor igual ao nível de personagem** (nível total, não o de classe). Ritos em várias armas custam a redução de cada um, acumulada.
- **Maestria Sanguínea (20º nível):** "quando você invoca um ritual vermelho, você não reduz seus pontos de vida máximos" — no 20º a penalidade é zero, mesmo com ritos ativos.

Um caçador de sangue multiclasse tem nível de personagem maior que o de classe: a redução usa o **nível de personagem**, e o dado de rito e o nível 20 da Maestria usam o **nível de classe**. Não confunda os dois.

O nível de classe vem de `classLevel(character, BLOOD_HUNTER)`, já exportado por `domain/rules.js`. Para evitar ciclo de import (`rules.js` vai importar `bloodHunter.js` na Task 10), este módulo **não** importa `rules.js` — ele lê o personagem direto.

**Files:**
- Modify: `src/systems/dnd5e/domain/bloodHunter.js`
- Test: `src/test/dnd5e/blood-hunter-rules.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Acrescente ao arquivo de teste, e troque a linha de import do topo por:

```js
import {
  BLOOD_HUNTER, RITES, riteDieFor, bloodCursesKnown,
  bloodHunterLevel, hemocraftDC, activeRites, bloodHunterMaxHpPenalty, riteDamageFor,
} from '../../systems/dnd5e/domain/bloodHunter'
```

```js
/** Ficha mínima de caçador de sangue para os testes de regra. */
function ficha({ level = 5, wis = 16, rites = [], multiclasses = [] } = {}) {
  return {
    info: { level, classIndex: BLOOD_HUNTER, multiclasses },
    attributes: { wisdom: wis },
    combat: { maxHp: 44, currentHp: 44, crimsonRites: rites },
  }
}

describe('bloodHunter — nível de classe', () => {
  it('lê o nível da classe principal', () => {
    expect(bloodHunterLevel(ficha({ level: 7 }))).toBe(7)
  })

  it('lê o nível da multiclasse quando a classe principal é outra', () => {
    const char = {
      info: { level: 3, classIndex: 'guerreiro', multiclasses: [{ classIndex: BLOOD_HUNTER, level: 4 }] },
    }
    expect(bloodHunterLevel(char)).toBe(4)
  })

  it('devolve 0 para quem não é caçador de sangue', () => {
    expect(bloodHunterLevel({ info: { level: 9, classIndex: 'mago' } })).toBe(0)
  })
})

describe('bloodHunter — CD de Hemocraft', () => {
  it('é 8 + proficiência + modificador de Sabedoria', () => {
    // nível 5 → proficiência +3; SAB 16 → +3. 8 + 3 + 3 = 14
    expect(hemocraftDC(ficha({ level: 5, wis: 16 }))).toBe(14)
    // nível 1 → proficiência +2; SAB 10 → +0. 8 + 2 + 0 = 10
    expect(hemocraftDC(ficha({ level: 1, wis: 10 }))).toBe(10)
    // nível 17 → proficiência +6; SAB 20 → +5. 8 + 6 + 5 = 19
    expect(hemocraftDC(ficha({ level: 17, wis: 20 }))).toBe(19)
  })
})

describe('bloodHunter — redutor de PV máximo', () => {
  it('é zero sem rito ativo', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5 }))).toBe(0)
  })

  it('custa o nível de personagem por rito ativo', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5, rites: [{ attackId: 'a1', rite: 'chamas' }] }))).toBe(5)
  })

  it('acumula quando há rito em mais de uma arma', () => {
    const rites = [{ attackId: 'a1', rite: 'chamas' }, { attackId: 'a2', rite: 'morto' }]
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5, rites }))).toBe(10)
  })

  it('usa o nível de PERSONAGEM, não o de classe, na multiclasse', () => {
    const char = {
      info: { level: 3, classIndex: 'guerreiro', multiclasses: [{ classIndex: BLOOD_HUNTER, level: 2 }] },
      attributes: { wisdom: 14 },
      combat: { crimsonRites: [{ attackId: 'a1', rite: 'chamas' }] },
    }
    // 3 de guerreiro + 2 de caçador de sangue = nível de personagem 5
    expect(bloodHunterMaxHpPenalty(char)).toBe(5)
  })

  it('é zero no 20º nível de classe — Maestria Sanguínea', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 20, rites: [{ attackId: 'a1', rite: 'chamas' }] }))).toBe(0)
  })

  it('ignora rito com chave desconhecida em vez de cobrar por ele', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5, rites: [{ attackId: 'a1', rite: 'inexistente' }] }))).toBe(0)
  })
})

describe('bloodHunter — dano do rito por arma', () => {
  it('devolve dado e tipo só para a arma imbuída', () => {
    const char = ficha({ level: 11, rites: [{ attackId: 'espada', rite: 'chamas' }] })
    expect(riteDamageFor({ id: 'espada' }, char)).toEqual({ dice: '1d8', damageType: 'fogo' })
    expect(riteDamageFor({ id: 'arco' }, char)).toBeNull()
  })

  it('devolve null quando não há rito ativo', () => {
    expect(riteDamageFor({ id: 'espada' }, ficha())).toBeNull()
  })

  it('lista os ritos ativos ignorando entradas malformadas', () => {
    const char = ficha({ rites: [{ attackId: 'a1', rite: 'chamas' }, { rite: 'morto' }, null] })
    expect(activeRites(char)).toEqual([{ attackId: 'a1', rite: 'chamas' }])
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-rules.test.js --maxWorkers=2
```

Esperado: FAIL — `bloodHunterLevel is not a function`.

- [ ] **Step 3: Implemente**

Acrescente ao fim de `src/systems/dnd5e/domain/bloodHunter.js`:

```js
/** Modificador de atributo (PHB p.13). Local para não importar `rules.js`. */
function modOf(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2)
}

/** Nível TOTAL de personagem = classe principal + todas as multiclasses. */
function characterLevel(character) {
  const base = Number(character?.info?.level) || 0
  const extra = (character?.info?.multiclasses ?? [])
    .reduce((sum, mc) => sum + (Number(mc?.level) || 0), 0)
  return base + extra
}

/** Nível de caçador de sangue, seja como classe principal ou multiclasse. */
export function bloodHunterLevel(character) {
  if (character?.info?.classIndex === BLOOD_HUNTER) return Number(character.info.level) || 0
  const mc = (character?.info?.multiclasses ?? []).find(m => m?.classIndex === BLOOD_HUNTER)
  return Number(mc?.level) || 0
}

/** Bônus de proficiência pelo nível de personagem (PHB p.15). */
function proficiencyBonus(character) {
  return Math.floor((Math.max(1, characterLevel(character)) - 1) / 4) + 2
}

/** CD das maldições de sangue = 8 + proficiência + modificador de Sabedoria. */
export function hemocraftDC(character) {
  return 8 + proficiencyBonus(character) + modOf(character?.attributes?.wisdom)
}

/** Ritos ativos, descartando entradas sem arma ou com rito desconhecido. */
export function activeRites(character) {
  return (character?.combat?.crimsonRites ?? [])
    .filter(r => r && typeof r.attackId === 'string' && r.attackId && RITES[r.rite])
    .map(r => ({ attackId: r.attackId, rite: r.rite }))
}

/**
 * Redução do teto de PV: nível de PERSONAGEM por rito ativo.
 * Maestria Sanguínea (20º de classe) remove o sacrifício.
 */
export function bloodHunterMaxHpPenalty(character) {
  if (bloodHunterLevel(character) >= 20) return 0
  return activeRites(character).length * characterLevel(character)
}

/** Dado e tipo de dano do rito ativo NESTA arma, ou null. */
export function riteDamageFor(attack, character) {
  const found = activeRites(character).find(r => r.attackId === attack?.id)
  if (!found) return null
  return { dice: riteDieFor(bloodHunterLevel(character)), damageType: RITES[found.rite].damageType }
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-rules.test.js --maxWorkers=2
```

Esperado: PASS, 13 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/bloodHunter.js src/test/dnd5e/blood-hunter-rules.test.js
git commit -m "feat(homebrew): CD de Hemocraft, ritos ativos e redutor de PV maximo"
```

---

## Task 4: Campo `combat.crimsonRites` no schema da ficha

**Files:**
- Modify: `src/systems/dnd5e/domain/characterSchema.js`
- Test: `src/test/dnd5e/blood-hunter-schema.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Descubra primeiro o nome do parser exportado e a versão corrente do schema:

```bash
grep -n "^export function parse\|^export const characterSchema\|SCHEMA_VERSION" src/systems/dnd5e/domain/characterSchema.js
```

Use o parser que esse grep revelar no teste abaixo (nos exemplos, `parseCharacter`):

```js
import { describe, it, expect } from 'vitest'
import { parseCharacter } from '../../systems/dnd5e/domain/characterSchema'

describe('schema — combat.crimsonRites', () => {
  it('nasce como lista vazia numa ficha que não declara o campo', () => {
    const doc = parseCharacter({ info: { name: 'Teste' } })
    expect(doc.combat.crimsonRites).toEqual([])
  })

  it('preserva os ritos gravados', () => {
    const doc = parseCharacter({
      info: { name: 'Teste' },
      combat: { crimsonRites: [{ attackId: 'a1', rite: 'chamas' }] },
    })
    expect(doc.combat.crimsonRites).toEqual([{ attackId: 'a1', rite: 'chamas' }])
  })

  it('descarta rito sem arma em vez de rejeitar a ficha inteira', () => {
    const doc = parseCharacter({
      info: { name: 'Teste' },
      combat: { crimsonRites: [{ rite: 'chamas' }] },
    })
    expect(doc.combat.crimsonRites).toEqual([])
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-schema.test.js --maxWorkers=2
```

Esperado: FAIL — `expected undefined to equal []`.

- [ ] **Step 3: Acrescente o campo**

Em `src/systems/dnd5e/domain/characterSchema.js`, dentro do objeto `combat`, logo depois de `activeEffects`:

```js
  /**
   * Ritual Vermelho ativo por arma (Caçador de Sangue, fonte homebrew).
   * `attackId` referencia `combat.attacks[].id`; `rite` é chave de
   * `domain/bloodHunter.js RITES`. Entradas malformadas são descartadas em vez
   * de invalidar a ficha — mesma postura do resto do schema com dado antigo.
   */
  crimsonRites: z.array(z.object({
    attackId: z.string().min(1),
    rite:     z.string().min(1),
  })).catch([]).default([]),
```

Se o `.catch([])` não descartar a entrada malformada isoladamente (o Zod anula a lista inteira), troque por um `preprocess` que filtra antes de validar:

```js
  crimsonRites: z.preprocess(
    v => (Array.isArray(v) ? v.filter(r => r && typeof r.attackId === 'string' && r.attackId) : []),
    z.array(z.object({ attackId: z.string().min(1), rite: z.string().min(1) })),
  ).default([]),
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-schema.test.js --maxWorkers=2
```

Esperado: PASS, 3 testes.

- [ ] **Step 5: Rode a fatia de schema inteira para garantir que nada regrediu**

```bash
npx vitest run src/test/dnd5e/ --maxWorkers=2 -t schema
```

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/characterSchema.js src/test/dnd5e/blood-hunter-schema.test.js
git commit -m "feat(homebrew): campo combat.crimsonRites no schema da ficha"
```

---

## Task 5: Dano do rito somado ao dano da arma

O rito soma **um dado inteiro** ao dano da arma imbuída, e o dado é de outro tipo de dano (fogo, frio, etc.). A expressão vira `1d8 + 3 + 1d6 fogo`.

`calculateWeaponDamage` hoje devolve `{ expression, modifier, dice }`. Ela ganha um quarto campo `rite` e passa a incluir o dado na expressão. **Não** mexa em `modifier` nem em `dice` — o resto do app lê esses dois, e mudá-los quebraria o rolador.

**Files:**
- Modify: `src/systems/dnd5e/utils/attacks.js`
- Test: `src/test/dnd5e/blood-hunter-attack-damage.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import { calculateWeaponDamage } from '../../systems/dnd5e/utils/attacks'

const forca16 = { strength: 16, dexterity: 10 }

describe('dano de arma com Ritual Vermelho', () => {
  const espada = { id: 'espada', damageDice: '1d8', damageType: 'cortante', properties: [] }

  it('sem rito, a expressão não muda', () => {
    const r = calculateWeaponDamage(espada, forca16)
    expect(r.expression).toBe('1d8 + 3')
    expect(r.rite).toBeNull()
  })

  it('com rito, acrescenta o dado com o tipo de dano do rito', () => {
    const atk = { ...espada, rite: { dice: '1d6', damageType: 'fogo' } }
    const r = calculateWeaponDamage(atk, forca16)
    expect(r.expression).toBe('1d8 + 3 + 1d6 fogo')
    expect(r.rite).toEqual({ dice: '1d6', damageType: 'fogo' })
  })

  it('não contamina dice nem modifier — o rolador depende deles', () => {
    const atk = { ...espada, rite: { dice: '1d6', damageType: 'fogo' } }
    const r = calculateWeaponDamage(atk, forca16)
    expect(r.dice).toBe('1d8')
    expect(r.modifier).toBe(3)
  })

  it('convive com Estilo de Luta na mesma arma sem um comer o outro', () => {
    // Duelismo: +2 no dano de arma corpo-a-corpo em uma mão.
    const atk = { ...espada, fightingStyles: ['dueling'], rite: { dice: '1d6', damageType: 'fogo' } }
    const r = calculateWeaponDamage(atk, forca16)
    expect(r.modifier).toBe(5)
    expect(r.expression).toBe('1d8 + 5 + 1d6 fogo')
  })

  it('com modificador zero, ainda mostra o dado do rito', () => {
    const adaga = { id: 'adaga', damageDice: '1d4', properties: [], rite: { dice: '1d4', damageType: 'frio' } }
    const r = calculateWeaponDamage(adaga, { strength: 10, dexterity: 10 })
    expect(r.expression).toBe('1d4 + 1d4 frio')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-attack-damage.test.js --maxWorkers=2
```

Esperado: FAIL — `expected undefined to be null` no primeiro teste.

- [ ] **Step 3: Implemente**

Em `src/systems/dnd5e/utils/attacks.js`, substitua o corpo final de `calculateWeaponDamage` (as quatro últimas linhas, de `const sign` até o `return`) por:

```js
  const sign   = modifier >= 0 ? '+' : '−'
  const absMod = Math.abs(modifier)
  const base   = modifier === 0 ? dice : `${dice} ${sign} ${absMod}`

  // Ritual Vermelho (Caçador de Sangue): dado inteiro de OUTRO tipo de dano,
  // carimbado por arma em ActionsTab. Fora de `dice`/`modifier` de propósito —
  // o rolador lê esses dois e não sabe somar dois tipos de dano na mesma linha.
  const rite = attack?.rite?.dice
    ? { dice: attack.rite.dice, damageType: attack.rite.damageType ?? '' }
    : null
  const expression = rite ? `${base} + ${rite.dice} ${rite.damageType}`.trimEnd() : base

  return { expression, modifier, dice, rite }
```

Atualize também o bloco JSDoc acima da função, acrescentando à lista de campos do `attack`:

```js
 *   - rite?: { dice: string, damageType: string } — Ritual Vermelho ativo
 *     NESTA arma (domain/bloodHunter.js). Carimbado na renderização, como
 *     `fightingStyles`.
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-attack-damage.test.js --maxWorkers=2
```

Esperado: PASS, 5 testes.

- [ ] **Step 5: Rode os testes de ataque existentes — esta função é usada pelas 13 classes**

```bash
npx vitest run src/test/ --maxWorkers=2 -t attack
```

Esperado: PASS, sem regressão.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/utils/attacks.js src/test/dnd5e/blood-hunter-attack-damage.test.js
git commit -m "feat(homebrew): dado do Ritual Vermelho no dano da arma imbuida"
```

---

## Task 6: `effectiveMaxHp` — o rito derruba o teto de PV

`combat.maxHp` é valor **armazenado**, não derivado: `rules.js` só o incrementa no level-up. O teto efetivo entra em `useCharacterCalculations`, no mesmo lugar e no mesmo formato de `effectiveAC` e `effectiveSpeed`.

Cuidado com a cura: `applyHeal` faz `clampHp(curHp + heal, maxHp)` lendo o teto cru. Sem ajuste, o personagem curaria acima do próprio teto reduzido.

**Files:**
- Modify: `src/systems/dnd5e/hooks/useCharacterCalculations.js`
- Modify: `src/systems/dnd5e/domain/rules.js`
- Test: `src/test/dnd5e/blood-hunter-max-hp.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Confirme antes a assinatura de `applyHeal` — ela mudou de forma ao longo do projeto:

```bash
grep -n "export function applyHeal" -A 12 src/systems/dnd5e/domain/rules.js
```

```js
import { describe, it, expect } from 'vitest'
import { applyHeal } from '../../systems/dnd5e/domain/rules'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

function ficha(rites) {
  return {
    info: { level: 5, classIndex: BLOOD_HUNTER, multiclasses: [] },
    attributes: { wisdom: 14 },
    combat: { maxHp: 44, currentHp: 20, crimsonRites: rites },
  }
}

describe('cura respeita o teto reduzido pelo Ritual Vermelho', () => {
  it('cura até o teto cheio sem rito ativo', () => {
    const out = applyHeal(ficha([]), 100)
    expect(out.combat.currentHp).toBe(44)
  })

  it('não passa do teto reduzido com um rito ativo', () => {
    // nível 5, um rito → teto 44 − 5 = 39
    const out = applyHeal(ficha([{ attackId: 'a1', rite: 'chamas' }]), 100)
    expect(out.combat.currentHp).toBe(39)
  })

  it('não passa do teto reduzido com dois ritos ativos', () => {
    const rites = [{ attackId: 'a1', rite: 'chamas' }, { attackId: 'a2', rite: 'morto' }]
    expect(applyHeal(ficha(rites), 100).combat.currentHp).toBe(34)
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-max-hp.test.js --maxWorkers=2
```

Esperado: FAIL no segundo teste — `expected 44 to be 39`.

- [ ] **Step 3: Implemente o teto efetivo no domínio**

Em `src/systems/dnd5e/domain/rules.js`, no topo, acrescente o import:

```js
import { bloodHunterMaxHpPenalty } from './bloodHunter'
```

Acrescente a função exportada, junto das outras de PV:

```js
/**
 * Teto de PV efetivo = valor armazenado menos o sacrifício do Ritual Vermelho.
 * `combat.maxHp` é armazenado (o level-up o incrementa), então o teto efetivo
 * é derivado aqui, no mesmo espírito de `effectiveSpeed`.
 * Nunca desce abaixo de 1 — teto zero mataria a ficha por arredondamento.
 */
export function effectiveMaxHp(character) {
  const stored = Number(character?.combat?.maxHp) || 0
  return Math.max(1, stored - bloodHunterMaxHpPenalty(character))
}
```

Dentro de `applyHeal`, troque a linha que lê o teto cru:

```js
  const maxHp = effectiveMaxHp(character)
```

`bloodHunter.js` não importa `rules.js` (Task 3 evitou isso de propósito), então este import é de mão única e não cria ciclo.

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-max-hp.test.js --maxWorkers=2
```

Esperado: PASS, 3 testes.

- [ ] **Step 5: Aplique o teto efetivo também ao dano massivo**

`applyDamage` usa `combat.maxHp` cru em duas regras de morte instantânea (PHB
p.197): dano ≥ teto em personagem a 0 PV, e dano remanescente ≥ teto. Com o
rito ativo o teto real é menor, então o limiar tem de acompanhar — senão o
sacrifício do rito não aumenta o risco de morte que ele deveria aumentar.

Acrescente ao arquivo de teste:

```js
import { applyDamage } from '../../systems/dnd5e/domain/rules'

describe('dano massivo usa o teto reduzido pelo rito', () => {
  it('mata na hora quando o dano alcança o teto REDUZIDO, estando a 0 PV', () => {
    const char = { ...ficha([{ attackId: 'a1', rite: 'chamas' }]) }
    char.combat.currentHp = 0
    // teto efetivo 39: 40 de dano mata na hora, e 38 não
    expect(applyDamage(char, 40).combat.deathSaves?.failures ?? 3).toBe(3)
  })
})
```

Confirme antes a forma exata do retorno de `applyDamage` (o campo de morte
instantânea mudou de nome ao longo do projeto) e ajuste a asserção ao que ela
de fato devolve:

```bash
grep -n "export function applyDamage" -A 40 src/systems/dnd5e/domain/rules.js
```

Dentro de `applyDamage`, troque as duas leituras de `combat.maxHp` por
`effectiveMaxHp(character)`, reaproveitando uma única variável local no topo da
função.

- [ ] **Step 6: Exponha o teto na ficha**

Em `src/systems/dnd5e/hooks/useCharacterCalculations.js`, acrescente ao import de `domain/rules`:

```js
import { calculateMaxHpMulticlass, listSpellcastingClasses, getEffectiveSaveProficiencies, effectiveSpeed as domainEffectiveSpeed, effectiveMaxHp as domainEffectiveMaxHp } from '../domain/rules'
```

Junto de `effectiveAC` e `effectiveSpeed`:

```js
    // Ritual Vermelho reduz o TETO enquanto ativo. Como effectiveAC, não
    // contamina o valor armazenado (que continua editável na ficha).
    const effectiveMaxHp = domainEffectiveMaxHp(character)
```

E acrescente `effectiveMaxHp,` ao objeto de retorno, na mesma lista de `effectiveAC` e `effectiveSpeed`.

- [ ] **Step 7: Rode a fatia de PV e de ficha**

```bash
npx vitest run src/test/ --maxWorkers=2 -t "HP"
npx vitest run src/test/dnd5e/blood-hunter-max-hp.test.js --maxWorkers=2
```

Esperado: PASS nas duas.

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/systems/dnd5e/hooks/useCharacterCalculations.js src/test/dnd5e/blood-hunter-max-hp.test.js
git commit -m "feat(homebrew): teto de PV efetivo reduzido pelo Ritual Vermelho"
```

---

## Task 7: `homebrew-classes-pt.json` e registro no SrdProvider

Bloco de identidade da classe, do PDF: dado de vida d10, salvaguardas de **Força e Sabedoria**, armaduras leves/médias/escudos, armas simples e marciais, suprimentos de alquimista, **duas** perícias entre Atletismo, Acrobacia, Arcanismo, Intuição, Investigação e Sobrevivência.

Use `tasha-classes-pt.json` como molde de formato — ele tem exatamente os campos que o app consome.

**Files:**
- Create: `public/srd-data/homebrew-classes-pt.json`
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Modify: `vite.config.js`
- Test: `src/test/dnd5e/homebrew-catalog.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import catalogo from '../../../public/srd-data/homebrew-classes-pt.json'

describe('catálogo de classes de terceiros', () => {
  const bh = catalogo.find(c => c.index === 'cacador-de-sangue')

  it('traz o Caçador de Sangue', () => {
    expect(bh).toBeDefined()
    expect(bh.name).toBe('Caçador de Sangue')
  })

  it('tem o bloco de identidade do PDF', () => {
    expect(bh.hit_die).toBe(10)
    expect(bh.saving_throws).toEqual(['Força', 'Sabedoria'])
    expect(bh.skill_choices.count).toBe(2)
    expect(bh.skill_choices.from).toEqual(
      ['Acrobacia', 'Arcanismo', 'Atletismo', 'Intuição', 'Investigação', 'Sobrevivência']
    )
  })

  it('não declara conjuração — a classe base não conjura', () => {
    expect(bh.spellcasting_ability).toBeUndefined()
  })

  it('tem resumo e lore para o modal de informação da classe', () => {
    expect(bh.summary.length).toBeGreaterThan(40)
    expect(bh.fullDescription.length).toBeGreaterThan(200)
    expect(Array.isArray(bh.roles)).toBe(true)
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/homebrew-catalog.test.js --maxWorkers=2
```

Esperado: FAIL — não consegue resolver o import do JSON.

- [ ] **Step 3: Crie o JSON**

`public/srd-data/homebrew-classes-pt.json`:

```json
[
  {
    "index": "cacador-de-sangue",
    "name": "Caçador de Sangue",
    "roles": ["COMBATE CORPO A CORPO", "CONTROLE", "PERSEGUIÇÃO"],
    "hit_die": 10,
    "saving_throws": ["Força", "Sabedoria"],
    "armor_proficiencies": ["Armaduras leves, armaduras médias, escudos"],
    "weapon_proficiencies": ["Armas simples", "Armas marciais"],
    "tool_proficiencies": ["Suprimentos de alquimista"],
    "skill_choices": {
      "count": 2,
      "from": ["Acrobacia", "Arcanismo", "Atletismo", "Intuição", "Investigação", "Sobrevivência"]
    },
    "summary": "Guerreiros que sacrificam a própria vitalidade em rituais de sangue proibidos para caçar monstros com as armas do próprio inimigo.",
    "fullDescription": "TRANSCREVER do PDF: seções 'Caçador de Sangue', 'Tornando-se o inimigo para entender o inimigo' e 'Tão temidos quanto suas presas', com a redação revisada."
  }
]
```

O campo `fullDescription` acima é o **único** ponto de transcrição desta task: copie as três seções de abertura do PDF (página 1), corrigindo a redação. Os demais campos estão completos.

Confira os rótulos de `roles` contra os já usados no projeto antes de gravar, senão as pílulas do modal de classe saem sem legenda:

```bash
node -e "const c=require('./public/srd-data/phb-classes-pt.json');console.log([...new Set(c.flatMap(x=>x.roles??[]))].join(' | '))"
```

- [ ] **Step 4: Registre no SrdProvider**

Em `src/systems/dnd5e/data/SrdProvider.jsx`, em `DATASETS`, junto das outras partes não-lazy:

```js
  classesHomebrew:   { pt: 'homebrew-classes-pt.json',     fallback: null,                      lazy: false },
```

Em `COMPOSED`, na entrada `classes`:

```js
  classes:      { strategy: 'array',  parts: [['classes', 'phb'], ['classesTasha', 'tasha'], ['classesHomebrew', 'homebrew']] },
```

Não acrescente `classesHomebrew` a `CORE_LOGICAL` — partes de composição nunca viram chave de state própria, só o resultado composto (`classes`) entra lá, e ele já está.

- [ ] **Step 5: Bump do Service Worker**

Em `vite.config.js`, linha ~110, troque `cacheName: 'srd-data-v37'` por `cacheName: 'srd-data-v38'`.

Sem isso o SW serve o catálogo antigo e o deploy não chega em nenhum usuário que já abriu o app.

- [ ] **Step 6: Rode os testes**

```bash
npx vitest run src/test/dnd5e/homebrew-catalog.test.js --maxWorkers=2
npx vitest run src/test/dnd5e/SrdProvider-composed.test.jsx --maxWorkers=2
```

Esperado: PASS nas duas.

- [ ] **Step 7: Commit**

```bash
git add public/srd-data/homebrew-classes-pt.json src/systems/dnd5e/data/SrdProvider.jsx vite.config.js src/test/dnd5e/homebrew-catalog.test.js
git commit -m "feat(homebrew): catalogo do Cacador de Sangue e bump do SW (v38)"
```

---

## Task 8: `homebrew-class-progression-pt.json` — os 20 níveis

Molde de formato: `tasha-class-progression-pt.json` (chave `artifice`), com `index`, `name`, `hit_die`, `primary_ability`, `saving_throws`, proficiências, `skill_choices` e `levels[]` — cada nível com `{ level, prof, features: [{ name, desc }] }`.

**Tabela completa do PDF** (transcreva as descrições; a lista de nomes abaixo é a verdade, não invente nem omita):

| Nv | Prof | Features |
|---|---|---|
| 1 | +2 | Perdição do Caçador, Ritual Vermelho |
| 2 | +2 | Estilo de Luta, Sangue Maldito |
| 3 | +2 | Ordem do Caçador de Sangue |
| 4 | +2 | Incremento no Valor de Habilidade |
| 5 | +3 | Ataque Extra |
| 6 | +3 | Sangue Maldito (2), Ritual Primal adicional |
| 7 | +3 | Característica da Ordem |
| 8 | +3 | Incremento no Valor de Habilidade |
| 9 | +4 | Psicometria Sinistra |
| 10 | +4 | Velocidade Sombria |
| 11 | +4 | Característica da Ordem, Sangue Maldito (3), Ritual Primal adicional |
| 12 | +4 | Incremento no Valor de Habilidade |
| 13 | +5 | — (a tabela do PDF não concede nada neste nível) |
| 14 | +5 | Alma Endurecida, Ritual Esotérico |
| 15 | +5 | Característica da Ordem |
| 16 | +5 | Incremento no Valor de Habilidade |
| 17 | +6 | Sangue Maldito (4) |
| 18 | +6 | Característica da Ordem |
| 19 | +6 | Incremento no Valor de Habilidade |
| 20 | +6 | Maestria Sanguinária |

O nível 13 aparece em branco na tabela original. Mantenha `features: []` — não invente característica para preencher.

Regras curtas que valem transcrever com precisão, porque o jogador vai ler na ficha:
- **Perdição do Caçador (1º):** vantagem em Sabedoria (Sobrevivência) para rastrear fadas, demônios e mortos-vivos, e em Inteligência para lembrar informação sobre eles; rastreando ativamente um desses tipos, não pode ser surpreendido por criatura desse tipo; um tipo por vez. No 11º nível, ganha vantagem em Sabedoria (Intuição) e Carisma (Intimidação).
- **Velocidade Sombria (10º):** deslocamento aumenta em 3 metros e ataques de oportunidade contra você têm desvantagem.
- **Alma Endurecida (14º):** não pode mais ficar amedrontado e tem vantagem em resistências contra encantamento mágico.
- **Maestria Sanguinária (20º):** invocar um ritual vermelho não reduz mais o PV máximo.

**Files:**
- Create: `public/srd-data/homebrew-class-progression-pt.json`
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Test: `src/test/dnd5e/homebrew-progression.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import progressao from '../../../public/srd-data/homebrew-class-progression-pt.json'

describe('progressão do Caçador de Sangue', () => {
  const bh = progressao['cacador-de-sangue']

  it('cobre os 20 níveis, em ordem, sem buraco', () => {
    expect(bh.levels).toHaveLength(20)
    expect(bh.levels.map(l => l.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('tem o bônus de proficiência certo em cada nível', () => {
    for (const l of bh.levels) {
      expect(l.prof).toBe(Math.floor((l.level - 1) / 4) + 2)
    }
  })

  it('concede as features de abertura nos níveis certos', () => {
    const nomes = n => bh.levels[n - 1].features.map(f => f.name)
    expect(nomes(1)).toEqual(['Perdição do Caçador', 'Ritual Vermelho'])
    expect(nomes(2)).toEqual(['Estilo de Luta', 'Sangue Maldito'])
    expect(nomes(3)).toEqual(['Ordem do Caçador de Sangue'])
    expect(nomes(20)).toEqual(['Maestria Sanguinária'])
  })

  it('mantém o nível 13 vazio, como na tabela original', () => {
    expect(bh.levels[12].features).toEqual([])
  })

  it('dá descrição de verdade a toda feature — ficha sem texto é ficha quebrada', () => {
    for (const l of bh.levels) {
      for (const f of l.features) {
        expect(f.desc.length, `${f.name} (nv ${l.level})`).toBeGreaterThan(40)
      }
    }
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/homebrew-progression.test.js --maxWorkers=2
```

Esperado: FAIL — não resolve o import.

- [ ] **Step 3: Crie o JSON**

Formato (primeiros níveis mostrados na íntegra; siga o mesmo molde até o 20º, usando a tabela acima):

```json
{
  "cacador-de-sangue": {
    "index": "cacador-de-sangue",
    "name": "Caçador de Sangue",
    "hit_die": 10,
    "primary_ability": "Força ou Destreza",
    "saving_throws": ["Força", "Sabedoria"],
    "armor_proficiencies": ["Leve", "Média", "Escudos"],
    "weapon_proficiencies": ["Simples", "Marciais"],
    "tool_proficiencies": ["Suprimentos de alquimista"],
    "skill_choices": {
      "count": 2,
      "from": ["Acrobacia", "Arcanismo", "Atletismo", "Intuição", "Investigação", "Sobrevivência"]
    },
    "levels": [
      {
        "level": 1,
        "prof": 2,
        "features": [
          {
            "name": "Perdição do Caçador",
            "desc": "Você sobreviveu à assimilação da Perdição do Caçador, uma mistura alquímica venenosa que altera a constituição do seu sangue, unindo você para sempre à escuridão e aprimorando seus sentidos contra ela. Você tem vantagem em testes de Sabedoria (Sobrevivência) para rastrear criaturas fadas, demônios e mortos-vivos, bem como em testes de Inteligência para recuperar informações sobre eles. Se estiver rastreando ativamente uma criatura de um desses tipos, você não pode ser surpreendido por nenhuma criatura desse tipo. Você só pode rastrear um tipo de criatura por vez. Ao chegar ao 11º nível, você ganha vantagem em testes de Sabedoria (Intuição) e testes de Carisma (Intimidação), à medida que sua natureza inquietante se desenvolve."
          },
          {
            "name": "Ritual Vermelho",
            "desc": "TRANSCREVER do PDF, seção Ritual Vermelho, incluindo: custo de ação bônus, redução do PV máximo igual ao nível de personagem, o dado adicional de dano elemental, o fato de o dano ser mágico e cumulativo com encantamentos, o rito se desfazer se a arma sair do seu controle, e o acesso a Rituais Primais adicionais no 6º e 11º níveis e a Rituais Esotéricos a partir do 14º."
          }
        ]
      },
      {
        "level": 13,
        "prof": 5,
        "features": []
      }
    ]
  }
}
```

- [ ] **Step 4: Registre no SrdProvider**

Em `DATASETS`:

```js
  progressionHomebrew: { pt: 'homebrew-class-progression-pt.json', fallback: null,              lazy: false },
```

Em `COMPOSED`, na entrada `progression`:

```js
  progression:  { strategy: 'object', parts: [['progression', 'phb'], ['progressionTasha', 'tasha'], ['progressionHomebrew', 'homebrew']] },
```

- [ ] **Step 5: Rode os testes**

```bash
npx vitest run src/test/dnd5e/homebrew-progression.test.js --maxWorkers=2
```

Esperado: PASS, 5 testes.

- [ ] **Step 6: Commit**

```bash
git add public/srd-data/homebrew-class-progression-pt.json src/systems/dnd5e/data/SrdProvider.jsx src/test/dnd5e/homebrew-progression.test.js
git commit -m "feat(homebrew): progressao de 20 niveis do Cacador de Sangue"
```

---

## Task 9: `homebrew-class-choices-pt.json` — escolhas da classe

Quatro escolhas. Molde de formato: `tasha-class-choices-pt.json`, com `{ choices: [{ level, id, featureName, prompt, options: [{ value, name, desc }] }] }`.

1. **Ritual Primal** (nível 1) — Chamas, Congelamento, Tempestade.
2. **Estilo de Luta** (nível 2) — Arquearia, Duelismo, Combate com Armas Grandes, Combate com Duas Armas. Reaproveite as chaves que `domain/fightingStyles.js` já usa; confira antes com `grep -n "archery\|dueling\|great-weapon\|two-weapon" src/systems/dnd5e/domain/fightingStyles.js`, senão o Estilo de Luta não vai somar no ataque.
3. **Ordem do Caçador de Sangue** (nível 3) — as quatro Ordens, **todas marcadas como indisponíveis nesta fase**.
4. **Maldição de Sangue** (nível 2, múltipla escolha) — as 8 maldições do PDF: Amarração, Sem Olhos, Fantoche Caído, Desvio, Marcado, Sofrimento Mútuo, Quebrador de Feitiços, Purgação. Cada `desc` deve trazer o efeito **e** o parágrafo "Amplifique:".

As Ordens ganham conteúdo real nas fases 2 e 3. Aqui elas existem só para o jogador ver que a classe tem quatro caminhos, com o motivo de estarem travadas à vista.

**Files:**
- Create: `public/srd-data/homebrew-class-choices-pt.json`
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Test: `src/test/dnd5e/homebrew-choices.test.js`

- [ ] **Step 1: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import choices from '../../../public/srd-data/homebrew-class-choices-pt.json'
import { RITES } from '../../systems/dnd5e/domain/bloodHunter'

describe('escolhas do Caçador de Sangue', () => {
  const lista = choices['cacador-de-sangue'].choices
  const por = id => lista.find(c => c.id === id)

  it('oferece os três Rituais Primais no 1º nível', () => {
    const c = por('cacador_de_sangue_primal_rite')
    expect(c.level).toBe(1)
    expect(c.options.map(o => o.value).sort()).toEqual(['chamas', 'congelamento', 'tempestade'])
  })

  it('usa exatamente as chaves de rito que o domínio conhece', () => {
    const c = por('cacador_de_sangue_primal_rite')
    for (const o of c.options) expect(RITES[o.value]).toBeDefined()
  })

  it('oferece os quatro Estilos de Luta no 2º nível', () => {
    const c = por('cacador_de_sangue_fighting_style')
    expect(c.level).toBe(2)
    expect(c.options).toHaveLength(4)
  })

  it('lista as oito maldições de sangue, cada uma com o parágrafo de amplificação', () => {
    const c = por('cacador_de_sangue_blood_curses')
    expect(c.options).toHaveLength(8)
    for (const o of c.options) expect(o.desc).toMatch(/Amplifique:/)
  })

  it('mostra as quatro Ordens, todas travadas nesta fase, com o motivo à vista', () => {
    const c = por('cacador_de_sangue_order')
    expect(c.level).toBe(3)
    expect(c.options).toHaveLength(4)
    for (const o of c.options) {
      expect(o.unavailable).toBe(true)
      expect(o.unavailableReason.length).toBeGreaterThan(10)
    }
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/homebrew-choices.test.js --maxWorkers=2
```

Esperado: FAIL — não resolve o import.

- [ ] **Step 3: Crie o JSON**

Esqueleto com uma opção completa de cada tipo; complete as demais a partir do PDF:

```json
{
  "cacador-de-sangue": {
    "choices": [
      {
        "level": 1,
        "id": "cacador_de_sangue_primal_rite",
        "featureName": "Ritual Vermelho",
        "prompt": "Escolha seu Ritual Primal",
        "options": [
          { "value": "chamas", "name": "Ritual das Chamas", "desc": "Seu dano de ritual é do tipo fogo." },
          { "value": "congelamento", "name": "Ritual do Congelamento", "desc": "Seu dano de ritual é do tipo frio." },
          { "value": "tempestade", "name": "Ritual da Tempestade", "desc": "Seu dano de ritual é do tipo elétrico." }
        ]
      },
      {
        "level": 2,
        "id": "cacador_de_sangue_fighting_style",
        "featureName": "Estilo de Luta",
        "prompt": "Escolha um Estilo de Luta",
        "options": [
          { "value": "archery", "name": "Arquearia", "desc": "Você ganha +2 de bônus nas jogadas de ataque realizadas com uma arma de ataque à distância." }
        ]
      },
      {
        "level": 2,
        "id": "cacador_de_sangue_blood_curses",
        "featureName": "Sangue Maldito",
        "prompt": "Escolha suas Maldições de Sangue",
        "multiSelect": true,
        "options": [
          {
            "value": "purgacao",
            "name": "Maldição de Sangue da Purgação",
            "desc": "Como uma ação bônus, você pode manipular a vitalidade de uma criatura a até 18 metros para expurgar uma corrupção em seu sangue. A criatura alvo pode imediatamente fazer um teste de resistência contra uma condição de envenenamento que a aflige. Amplifique: o alvo pode, em vez disso, fazer um teste de resistência contra outra condição que o aflige — cego, ensurdecido ou paralisado."
          }
        ]
      },
      {
        "level": 3,
        "id": "cacador_de_sangue_order",
        "featureName": "Ordem do Caçador de Sangue",
        "prompt": "Escolha sua Ordem",
        "options": [
          {
            "value": "cacador-de-espectros",
            "name": "Ordem do Caçador de Espectros",
            "desc": "A mais antiga e organizada das ordens, que redescobriu os segredos da magia de sangue e a refinou para o combate contra o flagelo dos mortos-vivos.",
            "unavailable": true,
            "unavailableReason": "As Ordens ainda não foram implementadas. Chegam numa próxima entrega."
          }
        ]
      }
    ]
  }
}
```

Confira o nome do campo de múltipla escolha antes de gravar — o wizard e a ficha guardam multiSelect em formatos diferentes (array e string `"a,b"`):

```bash
grep -rn "multiSelect" src/systems/dnd5e/domain/ src/systems/dnd5e/components/ | head
```

Confira também se `unavailable`/`unavailableReason` já existem como convenção, e reaproveite o nome se existir em vez de criar um sinônimo:

```bash
grep -rn "unavailable\|indisponivel\|indisponível" src/systems/dnd5e --include=*.js --include=*.jsx | grep -v test | head
```

Se não existir convenção, os nomes acima passam a ser a convenção — e a UI que os respeita entra na Task 11.

- [ ] **Step 4: Registre no SrdProvider**

Em `DATASETS`:

```js
  classChoicesHomebrew: { pt: 'homebrew-class-choices-pt.json', fallback: null,                 lazy: false },
```

Em `COMPOSED`, na entrada `classChoices` (a estratégia `classChoices` encadeia via `mergeClassChoices`, então a ordem importa: homebrew por último):

```js
  classChoices: { strategy: 'classChoices', parts: [['classChoices', 'phb'], ['classChoicesTasha', 'tasha'], ['classChoicesXanathar', 'xanathar'], ['classChoicesHomebrew', 'homebrew']] },
```

- [ ] **Step 5: Rode os testes**

```bash
npx vitest run src/test/dnd5e/homebrew-choices.test.js --maxWorkers=2
npx vitest run src/test/dnd5e/SrdProvider-merge.test.jsx --maxWorkers=2
```

Esperado: PASS nas duas.

- [ ] **Step 6: Commit**

```bash
git add public/srd-data/homebrew-class-choices-pt.json src/systems/dnd5e/data/SrdProvider.jsx src/test/dnd5e/homebrew-choices.test.js
git commit -m "feat(homebrew): escolhas do Cacador de Sangue (ritos, estilo, maldicoes, ordens)"
```

---

## Task 10: Tracker de Sangue Maldito

Usos por descanso **curto ou longo** (`recharge: 'short'`, que no app já significa "recupera em curto ou longo"): 1 uso a partir do 2º nível, 2 no 6º, 3 no 11º, 4 no 17º.

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js`
- Test: `src/test/dnd5e/blood-hunter-feature-uses.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Espelhe `src/test/dnd5e/artificer-feature-uses.test.js` para a forma de montar a ficha — leia esse arquivo antes.

```js
import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

function ficha(level) {
  return { info: { level, classIndex: BLOOD_HUNTER, multiclasses: [] }, attributes: {}, combat: {} }
}
const maldito = level =>
  defaultClassFeatureUses(ficha(level)).find(u => u.id === 'cacador-de-sangue-blood-maledict')

describe('tracker de Sangue Maldito', () => {
  it('não existe no 1º nível — a feature só chega no 2º', () => {
    expect(maldito(1)).toBeUndefined()
  })

  it('escala os usos nos níveis 2, 6, 11 e 17', () => {
    expect(maldito(2).max).toBe(1)
    expect(maldito(5).max).toBe(1)
    expect(maldito(6).max).toBe(2)
    expect(maldito(10).max).toBe(2)
    expect(maldito(11).max).toBe(3)
    expect(maldito(16).max).toBe(3)
    expect(maldito(17).max).toBe(4)
    expect(maldito(20).max).toBe(4)
  })

  it('recupera em descanso curto ou longo', () => {
    const u = maldito(6)
    expect(u.recharge).toBe('short')
    expect(u.name).toBe('Sangue Maldito')
    expect(u.source).toBe(BLOOD_HUNTER)
    expect(u.used).toBe(0)
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-feature-uses.test.js --maxWorkers=2
```

Esperado: FAIL — `Cannot read properties of undefined (reading 'max')`.

- [ ] **Step 3: Implemente**

Em `defaultClassFeatureUses` de `src/systems/dnd5e/domain/rules.js`, junto dos outros blocos por classe (siga a forma exata dos vizinhos: `if (cls === '...' && level >= N)`):

```js
    // Caçador de Sangue (homebrew) — Sangue Maldito: 1 uso no 2º, 2 no 6º,
    // 3 no 11º, 4 no 17º; recupera em descanso curto ou longo.
    if (cls === BLOOD_HUNTER && level >= 2) {
      const usos = level >= 17 ? 4 : level >= 11 ? 3 : level >= 6 ? 2 : 1
      out.push({
        id: 'cacador-de-sangue-blood-maledict',
        name: 'Sangue Maldito',
        max: usos, used: 0, recharge: 'short', source: BLOOD_HUNTER,
      })
    }
```

O import de `BLOOD_HUNTER` já entrou em `rules.js` na Task 6 — acrescente o nome ao import existente:

```js
import { bloodHunterMaxHpPenalty, BLOOD_HUNTER } from './bloodHunter'
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-feature-uses.test.js --maxWorkers=2
```

Esperado: PASS, 3 testes.

- [ ] **Step 5: Rode os trackers das outras classes — a função é compartilhada**

```bash
npx vitest run src/test/ --maxWorkers=2 -t "feature"
```

Esperado: PASS, sem regressão.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/blood-hunter-feature-uses.test.js
git commit -m "feat(homebrew): tracker de usos do Sangue Maldito"
```

---

## Task 11: Painel do Ritual Vermelho e carimbo no ataque

Molde de UI: `ArtificerInfusionsPanel` (e seu teste `ArtificerInfusionsPanel.test.jsx`). Leia os dois antes de escrever.

Comportamento:
- Aparece só para quem tem nível de caçador de sangue ≥ 1.
- Lista os ataques registrados. Em cada um, um seletor com os ritos **conhecidos** (dos `chosenFeatures`) e um botão que ativa ou desfaz.
- Ao ativar, grava em `combat.crimsonRites`; ativar um rito numa arma que já tem rito **substitui** o anterior, sem acumular (regra do PDF).
- Mostra o custo: "−N PV máximo por rito ativo", e o teto efetivo atual.
- No 20º nível de classe, o painel diz que a Maestria Sanguinária dispensa o sacrifício.

**Atenção (aprendizado de painel anterior):** o Chrome usa `title` como nome acessível do botão e o jsdom **não** reproduz isso. Dê ao botão um texto visível ou `aria-label` explícito, senão o teste passa e o app quebra para leitor de tela.

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/CrimsonRitePanel.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/ActionsTab.jsx`
- Test: `src/test/dnd5e/CrimsonRitePanel.test.jsx`

- [ ] **Step 1: Escreva o teste que falha**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CrimsonRitePanel from '../../systems/dnd5e/components/CharacterSheet/v2/CrimsonRitePanel'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

function ficha({ level = 5, rites = [] } = {}) {
  return {
    info: { level, classIndex: BLOOD_HUNTER, multiclasses: [] },
    attributes: { wisdom: 14 },
    combat: {
      maxHp: 44, currentHp: 44, crimsonRites: rites,
      attacks: [{ id: 'espada', name: 'Espada Longa', damageDice: '1d8' }],
    },
    chosenFeatures: { cacador_de_sangue_primal_rite: 'chamas' },
  }
}

describe('CrimsonRitePanel', () => {
  it('não renderiza para quem não é caçador de sangue', () => {
    const char = { ...ficha(), info: { level: 5, classIndex: 'mago', multiclasses: [] } }
    const { container } = render(<CrimsonRitePanel character={char} onChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lista as armas registradas e o custo do rito', () => {
    render(<CrimsonRitePanel character={ficha()} onChange={vi.fn()} />)
    expect(screen.getByText('Espada Longa')).toBeInTheDocument()
    expect(screen.getByText(/5 PV máximo/)).toBeInTheDocument()
  })

  it('ativa o rito na arma e grava em combat.crimsonRites', () => {
    const onChange = vi.fn()
    render(<CrimsonRitePanel character={ficha()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ativar ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([{ attackId: 'espada', rite: 'chamas' }])
  })

  it('desfaz o rito ativo', () => {
    const onChange = vi.fn()
    const char = ficha({ rites: [{ attackId: 'espada', rite: 'chamas' }] })
    render(<CrimsonRitePanel character={char} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /desfazer ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('mostra o teto de PV já reduzido enquanto há rito ativo', () => {
    const char = ficha({ rites: [{ attackId: 'espada', rite: 'chamas' }] })
    render(<CrimsonRitePanel character={char} onChange={vi.fn()} />)
    expect(screen.getByText(/39/)).toBeInTheDocument()
  })

  it('no 20º nível avisa que a Maestria Sanguinária dispensa o sacrifício', () => {
    render(<CrimsonRitePanel character={ficha({ level: 20 })} onChange={vi.fn()} />)
    expect(screen.getByText(/Maestria Sanguinária/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/CrimsonRitePanel.test.jsx --maxWorkers=2
```

Esperado: FAIL — não resolve o import do componente.

- [ ] **Step 3: Implemente o painel**

Escreva `CrimsonRitePanel.jsx` copiando a moldura visual de `ArtificerInfusionsPanel` (mesmas classes `v2-*`, mesmo cabeçalho de seção), com esta lógica:

- `bloodHunterLevel(character) < 1` → `return null`.
- Ritos conhecidos vêm de `knownRites(character)`, que mora em `domain/bloodHunter.js` — **não** leia `chosenFeatures` dentro do componente. A regra de "quais ritos este personagem conhece" é regra, e o módulo é o dono único dela.

Acrescente a função a `src/systems/dnd5e/domain/bloodHunter.js`:

```js
/** Escolha de rito gravada: aceita string única, "a,b" (ficha) e array (wizard). */
function pickedValues(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string' && raw.length) return raw.split(',').filter(Boolean)
  return []
}

/** Ritos que o personagem conhece, em ordem de catálogo, sem repetidos. */
export function knownRites(character) {
  const chosen = character?.chosenFeatures ?? {}
  const picked = new Set([
    ...pickedValues(chosen.cacador_de_sangue_primal_rite),
    ...pickedValues(chosen.cacador_de_sangue_esoteric_rite),
  ])
  return Object.keys(RITES).filter(k => picked.has(k))
}
```

E o teste correspondente, em `src/test/dnd5e/blood-hunter-rules.test.js`:

```js
describe('bloodHunter — ritos conhecidos', () => {
  it('lê a escolha única do wizard', () => {
    expect(knownRites({ chosenFeatures: { cacador_de_sangue_primal_rite: 'chamas' } }))
      .toEqual(['chamas'])
  })

  it('lê a lista "a,b" que a ficha grava', () => {
    expect(knownRites({ chosenFeatures: { cacador_de_sangue_primal_rite: 'chamas,tempestade' } }))
      .toEqual(['chamas', 'tempestade'])
  })

  it('junta Primais e Esotéricos e descarta chave desconhecida', () => {
    const char = { chosenFeatures: {
      cacador_de_sangue_primal_rite: ['chamas', 'inexistente'],
      cacador_de_sangue_esoteric_rite: 'morto',
    } }
    expect(knownRites(char)).toEqual(['chamas', 'morto'])
  })

  it('devolve lista vazia para ficha sem escolha', () => {
    expect(knownRites({})).toEqual([])
  })
})
```

Acrescente `knownRites` ao import do topo do arquivo de teste.
- Para cada ataque em `character.combat.attacks`, uma linha com o nome, o seletor de rito e o botão. `aria-label` do botão: `` `Ativar ritual em ${atk.name}` `` ou `` `Desfazer ritual em ${atk.name}` ``.
- Ativar: `onChange([...outrosRitos, { attackId, rite }])` — filtre fora qualquer rito que já exista para aquele `attackId` antes de acrescentar.
- Desfazer: `onChange(ritos.filter(r => r.attackId !== attackId))`.
- Custo: `bloodHunterMaxHpPenalty` com um rito hipotético a mais, ou simplesmente o nível de personagem. Teto efetivo: `effectiveMaxHp(character)`.
- No 20º nível de classe, troque a linha de custo por um aviso citando **Maestria Sanguinária**.

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/CrimsonRitePanel.test.jsx --maxWorkers=2
```

Esperado: PASS, 6 testes.

- [ ] **Step 5: Ligue o painel e carimbe o rito no ataque**

Em `src/systems/dnd5e/components/CharacterSheet/v2/ActionsTab.jsx`:

Importe:

```jsx
import CrimsonRitePanel from './CrimsonRitePanel'
import { riteDamageFor } from '../../../domain/bloodHunter'
```

Na linha 37, onde hoje está `const atk = { ...rawAtk, fightingStyles }`, o rito precisa chegar até `AttackRowV2`. Passe-o como prop a partir da lista (linha ~211), no mesmo formato de `fightingStyles`:

```jsx
              <AttackRowV2
                key={atk.id}
                atk={atk}
                rite={riteDamageFor(atk, character)}
                ...
```

E na assinatura e no corpo de `AttackRowV2`:

```jsx
function AttackRowV2({ atk: rawAtk, rite = null, attributes, profBonus, ammoItem, fightingStyles = [], onUpdateItem }) {
  const atk = { ...rawAtk, fightingStyles, rite }
```

Monte o painel junto dos outros recursos de classe, dentro do bloco `showResources`, passando `onChange` que grava `combat.crimsonRites` pelo mesmo caminho de escrita que o `ActionsTab` já usa para o resto de `combat`.

- [ ] **Step 6: Verifique no navegador**

```bash
npx vitest run src/test/dnd5e/ --maxWorkers=2 -t "Actions"
```

Depois abra a ficha de um caçador de sangue no preview, ative um rito e confirme três coisas na tela: a linha de ataque mostra `1d8 + 3 + 1d4 fogo`, o teto de PV caiu, e desfazer o rito devolve o teto.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/CrimsonRitePanel.jsx src/systems/dnd5e/components/CharacterSheet/v2/ActionsTab.jsx src/test/dnd5e/CrimsonRitePanel.test.jsx
git commit -m "feat(homebrew): painel do Ritual Vermelho e dado do rito na linha de ataque"
```

---

## Task 12: Descanso longo desfaz os ritos

Um rito ativo atravessando o descanso longo deixaria o teto de PV reduzido para sempre, e o jogador não teria como descobrir por quê. Descanso longo limpa os ritos.

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js`
- Test: `src/test/dnd5e/blood-hunter-rest.test.js`

- [ ] **Step 1: Descubra o nome da função de descanso longo**

```bash
grep -n "export function.*[Ll]ongRest\|descansoLongo\|longRest" src/systems/dnd5e/domain/rules.js | head
```

Use o nome que aparecer (nos exemplos, `applyLongRest`).

- [ ] **Step 2: Escreva o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import { applyLongRest } from '../../systems/dnd5e/domain/rules'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

describe('descanso longo e Ritual Vermelho', () => {
  const ficha = {
    info: { level: 5, classIndex: BLOOD_HUNTER, multiclasses: [] },
    attributes: { wisdom: 14 },
    combat: {
      maxHp: 44, currentHp: 20,
      crimsonRites: [{ attackId: 'espada', rite: 'chamas' }],
      classFeatureUses: [],
    },
  }

  it('desfaz os ritos ativos', () => {
    expect(applyLongRest(ficha).combat.crimsonRites).toEqual([])
  })

  it('cura até o teto CHEIO, já que o rito acabou junto', () => {
    expect(applyLongRest(ficha).combat.currentHp).toBe(44)
  })
})
```

- [ ] **Step 3: Rode o teste e confirme que falha**

```bash
npx vitest run src/test/dnd5e/blood-hunter-rest.test.js --maxWorkers=2
```

Esperado: FAIL — os ritos sobrevivem ao descanso.

- [ ] **Step 4: Implemente**

Na função de descanso longo, junto do reset dos outros recursos, e **antes** de calcular a cura para o teto:

```js
    // Ritual Vermelho não sobrevive ao descanso longo: sem isso o teto de PV
    // ficaria reduzido para sempre, sem o jogador saber por quê.
    crimsonRites: [],
```

- [ ] **Step 5: Rode o teste e confirme que passa**

```bash
npx vitest run src/test/dnd5e/blood-hunter-rest.test.js --maxWorkers=2
```

Esperado: PASS, 2 testes.

- [ ] **Step 6: Rode a fatia de descanso das outras classes**

```bash
npx vitest run src/test/ --maxWorkers=2 -t "descanso"
npx vitest run src/test/ --maxWorkers=2 -t "rest"
```

Esperado: PASS, sem regressão.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/blood-hunter-rest.test.js
git commit -m "feat(homebrew): descanso longo desfaz o Ritual Vermelho"
```

---

## Verificação final da Fase 1

- [ ] **Rode a suíte em fatias** (nunca inteira — estoura a memória):

```bash
npx vitest run src/test/dnd5e/ --maxWorkers=2
```

```bash
npx vitest run src/test/ --maxWorkers=2 --exclude "src/test/dnd5e/**"
```

- [ ] **Confirme o gate de lint** (a baseline é ~616 erros pré-existentes; o gate é não aumentar):

```bash
npm run lint:gate
```

- [ ] **Confirme o bump do SW** — sem isso o deploy não chega em quem já abriu o app:

```bash
grep -n "srd-data-v" vite.config.js
```

Esperado: `srd-data-v38`.

- [ ] **Prova no navegador.** Crie um caçador de sangue de 5º nível pelo wizard com a fonte "Conteúdo de Terceiros" ligada e confirme, em ordem: a classe aparece no seletor; some ao desligar a fonte; a ficha traz Perdição do Caçador e Ritual Vermelho; o tracker de Sangue Maldito mostra 1 uso; ativar o rito soma o dado na linha de ataque e derruba o teto de PV; o descanso longo devolve o teto.

---

## O que fica para as próximas fases

**Fase 2 — Ordem do Caçador de Espectros e Ordem do Licantropo.** Ambas cabem no formato `• Nv N — ` que `domain/subclassFeatures.js` já parseia, com os cards por nível e os trackers nascendo daí. A Ordem do Licantropo precisa de atenção extra: a Transformação Híbrida concede seis sub-características de uma vez (Poder Selvagem, Pele Resistente, Ataque do Predador, Fraqueza do Amaldiçoado, Desejo de Sangue) e uma delas dá **+1 de CA condicional**, que terá de passar pelo mesmo caminho de `effectiveAC`.

**Fase 3 — Ordem do Mutante e os 14 mutagênicos.** Isolada de propósito: as fórmulas mexem em valor e teto de atributo, CA, deslocamento, iniciativa, resistências, visão no escuro e faixa de crítico — nada disso modelado hoje.

**Projeto separado — Ordem da Alma Profana.** Conjuração de pacto de um terço, com patrono e CD próprios.

Cada uma ganha seu próprio plano quando a anterior estiver verde.
