# D&D 2024 — Fase 1: fundação do eixo `ruleset` — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa.
> Os passos usam checkbox (`- [ ]`) para rastreamento.

**Spec:** `docs/superpowers/specs/2026-08-25-dnd-2024-fundacao-ruleset-design.md`

**Goal:** Introduzir `meta.ruleset: '2014' | '2024'` como terceiro eixo de
variação da ficha, provado de ponta a ponta por uma divergência-piloto
(exaustão) que atravessa domínio, rolagens, ficha e tela do Mestre.

**Architecture:** Um módulo de domínio novo (`ruleset.js`) fornece
`rulesetOf`/`byRuleset`; `characterSchema` sobe para v5 carimbando `'2014'` em
tudo que existe; um segundo módulo (`exhaustion.js`) consolida a exaustão hoje
espalhada e hard-coded, despachando por ruleset com um shape unificado que os
consumidores aplicam sem ramificar. O seletor fica atrás do escape hatch
`?ruleset=2024`; só o badge é público.

**Tech Stack:** React 18, Zod, Vitest + Testing Library, Playwright,
Tailwind v4, Supabase.

---

## Contexto que o executor precisa saber

Cinco fatos do código atual que não são óbvios e mudam o que se escreve:

1. **`build-character.js:166` grava `schemaVersion: 2` hard-coded.** Toda ficha
   nova nasce v2 e sobe a escada de migração no primeiro `parseCharacter`.
   Consequência direta: `migrateV4ToV5` **só pode carimbar `'2014'` quando o
   campo está ausente** — se sobrescrever, apaga o ruleset escolhido no wizard.
   Isso não é hipotético: é o caminho normal de toda ficha criada.

2. **`getExhaustionEffects` em `utils/calculations.js` é código morto.** O único
   importador é `src/test/exhaustion.test.js`. Terceira ocorrência do padrão de
   teste que dá confiança sobre código que ninguém usa.

3. **`effectiveMaxHp` nunca aplicou exaustão nível 4** e a desvantagem dos
   níveis 1 e 3 não é aplicada em rolagem nenhuma. A exaustão 2014 real do app
   é só `effectiveSpeed`, com os níveis 2 e 5 hard-coded.

4. **O ponto de injeção nas rolagens é único**: `EffectsSync.jsx` registra um
   resolver que `DiceRollerContext.roll` consulta por `category`
   (`attack`/`check`/`save`/`damage`). Hoje ele devolve `extraDice`,
   `advantage`, `labelSuffix`, `onApplied` — **não** modificador plano.

5. **`parseAndRoll` aceita multi-termo com flat negativo.** O regex
   `^\d*d\d+(?:[+-]\d+|\+\d*d\d+)*$` casa `1d20+5+1d4-4`, e `modifier` soma
   todos os flats. Então `flatMod` pode ser **concatenado** na notação, sem
   aritmética manual. Cuidado só com o ramo de número puro (`"5"`), que não é
   notação de dado.

**Rodar testes:** `npx vitest run <arquivo> [<arquivo>...]` — sempre nomeando
os arquivos. Para a suíte cheia, **em fatias por diretório com
`--maxWorkers=2`**: `npx vitest run` sem flags estoura a memória da máquina e
finge falhas aleatórias em arquivos sem relação.

**Nunca use `-t <padrão>` para restringir o escopo.** O `-t` filtra o NOME do
teste mas ainda carrega e transforma os 333 arquivos da suíte — leva ~10
minutos e é o mesmo caminho que estoura a memória. Para rodar um subconjunto,
liste os arquivos.

**Não bumpar `srd-data-vN`** em `vite.config.js`: nenhum JSON de
`public/srd-data` muda nesta fase.

---

## Estrutura de arquivos

**Criar**
| Arquivo | Responsabilidade |
|---|---|
| `src/systems/dnd5e/domain/ruleset.js` | O eixo: constantes, `rulesetOf`, `is2024`, `byRuleset` |
| `src/systems/dnd5e/domain/exhaustion.js` | Exaustão nos dois rulesets, shape unificado |
| `src/systems/dnd5e/rulesetFlag.js` | Escape hatch `?ruleset=2024` (função pura, `search` injetável) |
| `src/systems/dnd5e/components/RulesetPicker.jsx` | Seletor de ruleset na criação |
| `src/systems/dnd5e/components/RulesetBadge.jsx` | Selo read-only, só renderiza em 2024 |
| `src/test/dnd5e/ruleset.test.js` | Testes do eixo |
| `src/test/dnd5e/exhaustion-rulesets.test.js` | Testes da exaustão nos dois rulesets |
| `src/test/dnd5e/ruleset-flag.test.js` | Testes do escape hatch |
| `src/test/dnd5e/ruleset-migration-anchor.test.js` | Âncora de não-regressão da migração |
| `src/test/dnd5e/RulesetPicker.test.jsx` | Testes do seletor |
| `src/test/dnd5e/RulesetBadge.test.jsx` | Testes do selo |
| `e2e-pw/ruleset-2024.spec.js` | E2E do carimbo + badge |

**Modificar**
| Arquivo | Mudança |
|---|---|
| `src/systems/dnd5e/domain/characterSchema.js` | `meta.ruleset`, `SCHEMA_VERSION` 4→5, `migrateV4ToV5` |
| `src/systems/dnd5e/domain/conditions.js` | `EXHAUSTION_EFFECTS` sai; texto passa a vir de `exhaustion.js` |
| `src/systems/dnd5e/domain/rules.js` | `effectiveSpeed` e `effectiveMaxHp` consomem `exhaustionEffects` |
| `src/systems/dnd5e/utils/calculations.js` | `getExhaustionEffects` deletado |
| `src/context/DiceRollerContext.jsx` | Resolver passa a aceitar `flatMod` |
| `src/systems/dnd5e/components/CharacterSheet/v2/EffectsSync.jsx` | Injeta exaustão junto com os buffs |
| `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx` | Badge + texto de exaustão por ruleset |
| `src/systems/dnd5e/components/CharacterWizardV2/hooks/useDraft.js` | `ruleset` no draft inicial |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js` | Grava `meta.ruleset` |
| `src/systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal.jsx` | Monta o `RulesetPicker` atrás do flag |
| `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` | Repassa o ruleset do setup ao draft |
| `src/systems/dnd5e/components/Encounter/CombatantRow.jsx` | Badge por combatente |
| `src/test/exhaustion.test.js` | Deletado (substituído pelo teste novo) |

---

## Task 1: O eixo — `domain/ruleset.js`

**Files:**
- Create: `src/systems/dnd5e/domain/ruleset.js`
- Test: `src/test/dnd5e/ruleset.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/ruleset.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { RULESETS, rulesetOf, is2024, byRuleset } from '../../systems/dnd5e/domain/ruleset'

describe('rulesetOf', () => {
  it('devolve 2024 quando a ficha carimba 2024', () => {
    expect(rulesetOf({ meta: { ruleset: '2024' } })).toBe('2024')
  })

  it('cai em 2014 para ficha legada (sem meta, sem campo, valor inválido)', () => {
    expect(rulesetOf({ meta: { ruleset: '2014' } })).toBe('2014')
    expect(rulesetOf({ meta: {} })).toBe('2014')
    expect(rulesetOf({})).toBe('2014')
    expect(rulesetOf(null)).toBe('2014')
    expect(rulesetOf(undefined)).toBe('2014')
    expect(rulesetOf({ meta: { ruleset: '2077' } })).toBe('2014')
    expect(rulesetOf({ meta: { ruleset: 2024 } })).toBe('2014')
  })
})

describe('is2024', () => {
  it('é verdadeiro só para ficha 2024', () => {
    expect(is2024({ meta: { ruleset: '2024' } })).toBe(true)
    expect(is2024({ meta: { ruleset: '2014' } })).toBe(false)
    expect(is2024({})).toBe(false)
  })
})

describe('byRuleset', () => {
  it('escolhe o ramo do ruleset da ficha', () => {
    const branches = { '2014': 'velho', '2024': 'novo' }
    expect(byRuleset({ meta: { ruleset: '2014' } }, branches)).toBe('velho')
    expect(byRuleset({ meta: { ruleset: '2024' } }, branches)).toBe('novo')
    expect(byRuleset({}, branches)).toBe('velho')
  })

  it('aceita ramo com valor falsy sem cair no outro', () => {
    expect(byRuleset({ meta: { ruleset: '2024' } }, { '2014': 1, '2024': 0 })).toBe(0)
  })

  it('lança quando falta um ramo — força responder "isso muda entre rulesets?"', () => {
    expect(() => byRuleset({}, { '2014': 'a' })).toThrow(/2024/)
    expect(() => byRuleset({}, { '2024': 'b' })).toThrow(/2014/)
  })

  it('RULESETS tem os dois códigos com rótulo em PT-BR', () => {
    expect(Object.keys(RULESETS)).toEqual(['2014', '2024'])
    expect(RULESETS['2024'].label).toMatch(/2024/)
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/ruleset.test.js`
Esperado: FAIL — `Failed to resolve import ".../domain/ruleset"`

- [ ] **Step 3: Escreva a implementação mínima**

Crie `src/systems/dnd5e/domain/ruleset.js`:

```js
/**
 * Eixo de REGRA da ficha (2014 vs 2024). Fonte única de verdade.
 *
 * IMPORTANTE — a diferença para `domain/sources.js`, que é o inverso disto:
 *
 *   `source`  é ADITIVO      e decide o que é OFERECIDO nos pickers.
 *   `ruleset` é SUBSTITUTIVO e decide QUAL REGRA VALE.
 *
 * Um item de catálogo NUNCA carrega `ruleset` — um talento não é "do 2024",
 * a FICHA é. Catálogos 2024 são arquivos próprios, escolhidos pelo ruleset da
 * ficha.
 *
 * O ruleset é escolhido uma vez na criação e é IMUTÁVEL depois: trocar
 * 2014→2024 numa ficha pronta não é um toggle, é uma conversão (a espécie
 * perde o bônus de atributo, a subclasse muda de nível, os talentos mudam de
 * categoria).
 */

export const RULESETS = {
  '2014': { code: '2014', label: 'D&D 5e (2014)', abbr: '5e' },
  '2024': { code: '2024', label: 'D&D 5e (2024)', abbr: '5e24' },
}

export const DEFAULT_RULESET = '2014'

/** Ruleset da ficha. Ausente, inválido ou ficha legada → '2014'. */
export function rulesetOf(character) {
  const raw = character?.meta?.ruleset
  return typeof raw === 'string' && raw in RULESETS ? raw : DEFAULT_RULESET
}

export function is2024(character) {
  return rulesetOf(character) === '2024'
}

/**
 * Dispatch por ruleset. Exige os DOIS ramos de propósito: quem escreve regra
 * é obrigado a responder "isso muda entre rulesets?" em vez de esquecer o
 * ramo novo em silêncio — a mesma armadilha das listas fechadas que já
 * engoliram conteúdo neste projeto.
 */
export function byRuleset(character, branches) {
  for (const code of Object.keys(RULESETS)) {
    if (!branches || !(code in branches)) {
      throw new Error(`byRuleset: falta o ramo '${code}'`)
    }
  }
  return branches[rulesetOf(character)]
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/ruleset.test.js`
Esperado: PASS — 6 testes

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/ruleset.js src/test/dnd5e/ruleset.test.js
git commit -m "feat(2024): eixo ruleset no dominio"
```

---

## Task 2: Schema v5 — o campo e a migração

**Files:**
- Modify: `src/systems/dnd5e/domain/characterSchema.js`
- Test: `src/test/characterSchema.test.js`

- [ ] **Step 1: Escreva os testes que falham**

Acrescente ao final de `src/test/characterSchema.test.js`:

```js
describe('migração v4 → v5 (eixo ruleset)', () => {
  it('carimba 2014 em ficha legada sem o campo', () => {
    const doc = {
      meta: { schemaVersion: 4, createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'Legada', race: 'humano', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10 },
    }
    const m = migrateCharacter(doc)
    expect(m.meta.ruleset).toBe('2014')
    expect(m.meta.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('PRESERVA um ruleset já escolhido ao subir a escada de migração', () => {
    // build-character.js grava schemaVersion: 2 hard-coded, então TODA ficha
    // criada pelo wizard sobe a escada inteira no primeiro parse. Se a
    // migração sobrescrevesse, apagaria a escolha do jogador.
    const doc = {
      meta: { schemaVersion: 2, ruleset: '2024', createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'Nova', race: '', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10, hitDice: '1d6' },
    }
    expect(migrateCharacter(doc).meta.ruleset).toBe('2024')
  })

  it('é idempotente: migrar duas vezes não muda nada', () => {
    const doc = {
      meta: { schemaVersion: 4, createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'X', race: 'humano', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10 },
    }
    const once = migrateCharacter(doc)
    expect(migrateCharacter(once)).toEqual(once)
  })

  it('schema rejeita ruleset fora do enum', () => {
    const bad = {
      meta: { schemaVersion: 5, ruleset: '2077', createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'X', race: '', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10 },
    }
    expect(safeParseCharacter(bad).success).toBe(false)
  })
})
```

Confirme que o `import` no topo do arquivo traz `safeParseCharacter` além do
que já traz; se não trouxer, acrescente ao import existente.

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/characterSchema.test.js`
Esperado: FAIL — `expected undefined to be '2014'`

- [ ] **Step 3: Implemente**

Em `src/systems/dnd5e/domain/characterSchema.js`:

**3a.** Acrescente ao histórico no comentário de `SCHEMA_VERSION`, logo depois
da linha do `v4`:

```
 *  - v5 → `meta.ruleset` ('2014' | '2024') escolhe QUAL CONJUNTO DE REGRAS a
 *         ficha usa. Imutável após a criação. Ficha legada = '2014'. Ver
 *         domain/ruleset.js. A migração só carimba quando o campo está
 *         AUSENTE: `build-character.js` grava schemaVersion 2 hard-coded, e
 *         sobrescrever apagaria o ruleset escolhido no wizard.
```

**3b.** Troque a constante:

```js
export const SCHEMA_VERSION = 5
```

**3c.** Em `metaSchema`, acrescente o campo **depois** de `settings` e **fora**
dele (`settings` é o que o jogador liga e desliga a qualquer momento; ruleset
não é):

```js
  /**
   * Conjunto de regras da ficha. Imutável após a criação — trocar não é um
   * toggle, é uma conversão. Ver domain/ruleset.js.
   */
  ruleset: z.enum(['2014', '2024']).default('2014'),
```

**3d.** Acrescente a função de migração, ao lado das outras:

```js
/**
 * v4 → v5: carimba o eixo `ruleset` nas fichas que nasceram antes dele.
 *
 * SÓ carimba quando ausente. `build-character.js` grava `schemaVersion: 2`
 * hard-coded, então toda ficha criada pelo wizard — inclusive as 2024 — sobe
 * a escada inteira no primeiro parse. Sobrescrever aqui apagaria a escolha do
 * jogador.
 */
function migrateV4ToV5(doc) {
  if (doc.meta?.ruleset === '2014' || doc.meta?.ruleset === '2024') return doc
  return { ...doc, meta: { ...(doc.meta ?? {}), ruleset: '2014' } }
}
```

**3e.** Ligue na escada, dentro do `for` de `migrateCharacter`, junto dos
outros:

```js
      if (v === 4) doc = migrateV4ToV5(doc)
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/characterSchema.test.js`
Esperado: PASS — incluindo os 4 testes novos

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/characterSchema.js src/test/characterSchema.test.js
git commit -m "feat(2024): meta.ruleset no schema (v5) preservando escolha do wizard"
```

---

## Task 3: Âncora de não-regressão da migração

O ponto desta tarefa: garantir que subir para v5 **não muda mais nada** numa
ficha real. A armadilha conhecida é escrever uma fixture a partir da mesma
suposição da spec — aí o teste passa mentindo. A âncora aqui é comparar o
documento **consigo mesmo**, campo a campo, em vez de contra uma expectativa
escrita à mão.

**Files:**
- Test: `src/test/dnd5e/ruleset-migration-anchor.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/ruleset-migration-anchor.test.js`:

```js
/**
 * Âncora: subir para v5 pode acrescentar `meta.ruleset` e mexer em
 * `meta.schemaVersion` — e NADA mais. O teste não escreve o resultado
 * esperado à mão; compara o documento migrado contra ele mesmo com esses
 * dois campos neutralizados.
 */
import { describe, it, expect } from 'vitest'
import { migrateCharacter, parseCharacter } from '../../systems/dnd5e/domain/characterSchema'

/** Ficha v4 completa e realista — multiclasse, magias, itens, condições. */
function fichaV4() {
  return {
    id: 'anchor-1',
    meta: {
      schemaVersion: 4,
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-02-03T04:05:06.000Z',
      version: '1.0',
      creationMethod: 'wizard-v2',
      settings: {
        abilityScoreMethod: 'standard-array',
        allowFeats: true,
        allowMulticlass: true,
        sources: ['phb', 'tasha'],
        flexibleRacialAsi: false,
      },
    },
    info: {
      name: 'Vestrit', playerName: 'Gabriel',
      race: 'anao', subrace: 'anao-da-montanha',
      class: 'guerreiro', subclass: 'campeao', level: 6,
      multiclasses: [{ class: 'mago', level: 2 }],
      chosenFeatures: { 'guerreiro-estilo-de-combate': 'defesa' },
      background: 'soldado', alignment: 'leal-neutro', xp: 14000,
      scoreMethod: 'standard-array',
      feats: [{ index: 'alerta', name: 'Alerta', takenAtLevel: 4 }],
      asiOrFeatByLevel: { 'guerreiro:4': 'feat' },
    },
    attributes: { str: 18, dex: 12, con: 16, int: 14, wis: 10, cha: 8 },
    appliedRacialBonuses: { str: 2, con: 2 },
    combat: {
      maxHp: 52, currentHp: 41, tempHp: 5, armorClass: 18, speed: 7.5,
      hitDice: { pool: { d10: { total: 6, used: 2 }, d6: { total: 2, used: 0 } } },
      deathSaves: { successes: 0, failures: 0 },
      isDead: false, isStable: false,
      exhaustion: 2, inspiration: true,
      conditions: ['prone'],
      attacks: [], concentrating: { spellIndex: null, spellName: null },
      classFeatureUses: [
        { id: 'fighter-action-surge', name: 'Surto de Ação', max: 1, used: 1, recharge: 'short', source: 'guerreiro' },
      ],
    },
    spellcasting: { abilitiesByClass: { mago: 'int' } },
    inventory: { items: [] },
  }
}

/** Remove os campos que a migração v4→v5 TEM licença para tocar. */
function semCamposDaMigracao(doc) {
  const { schemaVersion, ruleset, ...restoMeta } = doc.meta ?? {}
  return { ...doc, meta: restoMeta }
}

describe('âncora da migração v4 → v5', () => {
  it('o único delta é meta.schemaVersion e meta.ruleset', () => {
    const antes = fichaV4()
    const depois = migrateCharacter(fichaV4())
    expect(semCamposDaMigracao(depois)).toEqual(semCamposDaMigracao(antes))
    expect(depois.meta.ruleset).toBe('2014')
  })

  it('a ficha migrada passa por parseCharacter sem perder campo', () => {
    const parsed = parseCharacter(fichaV4())
    expect(parsed.meta.ruleset).toBe('2014')
    expect(parsed.info.name).toBe('Vestrit')
    expect(parsed.combat.exhaustion).toBe(2)
    expect(parsed.combat.hitDice.pool.d10.total).toBe(6)
    expect(parsed.meta.settings.sources).toEqual(['phb', 'tasha'])
  })

  it('não dispara autosave à toa: migrar já-migrada devolve valor igual', () => {
    const once = migrateCharacter(fichaV4())
    expect(migrateCharacter(once)).toEqual(once)
  })
})
```

- [ ] **Step 2: Rode e confirme o estado**

Rode: `npx vitest run src/test/dnd5e/ruleset-migration-anchor.test.js`
Esperado: PASS — a Task 2 já implementou o comportamento. Se algum teste
falhar aqui, a migração da Task 2 está tocando em campo que não deveria;
conserte a migração, não o teste.

- [ ] **Step 3: Commit**

```bash
git add src/test/dnd5e/ruleset-migration-anchor.test.js
git commit -m "test(2024): ancora de nao-regressao da migracao v4 para v5"
```

---

## Task 4: `domain/exhaustion.js` — a divergência-piloto

**Files:**
- Create: `src/systems/dnd5e/domain/exhaustion.js`
- Test: `src/test/dnd5e/exhaustion-rulesets.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/exhaustion-rulesets.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { exhaustionEffects, exhaustionLevelsText } from '../../systems/dnd5e/domain/exhaustion'

const ficha = (level, ruleset = '2014') => ({
  meta: { ruleset },
  combat: { exhaustion: level },
})

describe('exaustão 2014 (PHB p.291 — tabela de 6 degraus)', () => {
  it('nível 0: tudo neutro', () => {
    expect(exhaustionEffects(ficha(0))).toEqual({
      level: 0, dead: false,
      abilityCheckDisadvantage: false, attackDisadvantage: false, saveDisadvantage: false,
      speedMultiplier: 1, maxHpMultiplier: 1,
      d20Penalty: 0, speedPenaltyMeters: 0,
    })
  })

  it('nível 1: desvantagem em testes de habilidade', () => {
    const e = exhaustionEffects(ficha(1))
    expect(e.abilityCheckDisadvantage).toBe(true)
    expect(e.attackDisadvantage).toBe(false)
    expect(e.saveDisadvantage).toBe(false)
    expect(e.speedMultiplier).toBe(1)
  })

  it('nível 2: deslocamento à metade', () => {
    expect(exhaustionEffects(ficha(2)).speedMultiplier).toBe(0.5)
  })

  it('nível 3: desvantagem também em ataques e salvaguardas', () => {
    const e = exhaustionEffects(ficha(3))
    expect(e.attackDisadvantage).toBe(true)
    expect(e.saveDisadvantage).toBe(true)
  })

  it('nível 4: PV máximo à metade', () => {
    expect(exhaustionEffects(ficha(4)).maxHpMultiplier).toBe(0.5)
  })

  it('nível 5: deslocamento zero', () => {
    expect(exhaustionEffects(ficha(5)).speedMultiplier).toBe(0)
  })

  it('nível 6: morte', () => {
    expect(exhaustionEffects(ficha(6)).dead).toBe(true)
  })

  it('os campos do ramo 2024 saem neutros', () => {
    for (const lvl of [0, 1, 3, 6]) {
      const e = exhaustionEffects(ficha(lvl))
      expect(e.d20Penalty).toBe(0)
      expect(e.speedPenaltyMeters).toBe(0)
    }
  })
})

describe('exaustão 2024 (LdJ 2024, Ap. C p.368 — acumulativa)', () => {
  it('nível 0: tudo neutro', () => {
    expect(exhaustionEffects(ficha(0, '2024'))).toEqual({
      level: 0, dead: false,
      abilityCheckDisadvantage: false, attackDisadvantage: false, saveDisadvantage: false,
      speedMultiplier: 1, maxHpMultiplier: 1,
      d20Penalty: 0, speedPenaltyMeters: 0,
    })
  })

  it('testes de d20 reduzidos em 2 × nível', () => {
    expect(exhaustionEffects(ficha(1, '2024')).d20Penalty).toBe(-2)
    expect(exhaustionEffects(ficha(3, '2024')).d20Penalty).toBe(-6)
    expect(exhaustionEffects(ficha(5, '2024')).d20Penalty).toBe(-10)
  })

  it('deslocamento reduzido em 1,5 m × nível', () => {
    expect(exhaustionEffects(ficha(1, '2024')).speedPenaltyMeters).toBe(1.5)
    expect(exhaustionEffects(ficha(4, '2024')).speedPenaltyMeters).toBe(6)
  })

  it('nível 6 mata, como no 2014', () => {
    expect(exhaustionEffects(ficha(6, '2024')).dead).toBe(true)
  })

  it('os campos do ramo 2014 saem neutros — sem desvantagem, sem multiplicador', () => {
    for (const lvl of [1, 2, 3, 4, 5]) {
      const e = exhaustionEffects(ficha(lvl, '2024'))
      expect(e.abilityCheckDisadvantage).toBe(false)
      expect(e.attackDisadvantage).toBe(false)
      expect(e.saveDisadvantage).toBe(false)
      expect(e.speedMultiplier).toBe(1)
      expect(e.maxHpMultiplier).toBe(1)
    }
  })
})

describe('clamp e entradas malformadas', () => {
  it('clampa fora da faixa 0-6 nos dois rulesets', () => {
    expect(exhaustionEffects(ficha(-3)).level).toBe(0)
    expect(exhaustionEffects(ficha(99)).level).toBe(6)
    expect(exhaustionEffects(ficha(99, '2024')).d20Penalty).toBe(-12)
  })

  it('ficha sem combat vira nível 0', () => {
    expect(exhaustionEffects({}).level).toBe(0)
    expect(exhaustionEffects(null).level).toBe(0)
  })
})

describe('exhaustionLevelsText', () => {
  it('2014 devolve 7 entradas (níveis 0 a 6)', () => {
    const t = exhaustionLevelsText('2014')
    expect(t).toHaveLength(7)
    expect(t[6]).toMatch(/[Mm]orte/)
  })

  it('2024 descreve a regra acumulativa, não a tabela', () => {
    const t = exhaustionLevelsText('2024')
    expect(t).toHaveLength(7)
    expect(t[1]).toMatch(/-2|−2/)
    expect(t[6]).toMatch(/[Mm]orte/)
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js`
Esperado: FAIL — `Failed to resolve import ".../domain/exhaustion"`

- [ ] **Step 3: Implemente**

Crie `src/systems/dnd5e/domain/exhaustion.js`:

```js
/**
 * Exaustão nos dois rulesets.
 *
 *   2014 (PHB p.291)      — tabela de 6 degraus: desvantagens que entram em
 *                           níveis diferentes, deslocamento pela metade e
 *                           depois zero, PV máximo pela metade.
 *   2024 (LdJ 2024 p.368) — acumulativa e uniforme: todo teste de d20 perde
 *                           2 × nível, deslocamento perde 1,5 m × nível.
 *                           Sem desvantagem, sem multiplicador, sem PV.
 *
 * Nos dois, nível 6 mata.
 *
 * `exhaustionEffects` devolve um SHAPE UNIFICADO: os dois ramos preenchem o
 * objeto inteiro, e o que não se aplica sai em valor neutro (false / 1 / 0).
 * Assim o consumidor aplica tudo sem nunca perguntar o ruleset — se cada tela
 * ramificasse por conta própria, o dispatch se espalharia pela UI toda.
 */
import { byRuleset } from './ruleset'

export const MAX_EXHAUSTION = 6

function levelOf(character) {
  const raw = Number(character?.combat?.exhaustion) || 0
  return Math.max(0, Math.min(MAX_EXHAUSTION, Math.floor(raw)))
}

const NEUTRO = {
  abilityCheckDisadvantage: false,
  attackDisadvantage: false,
  saveDisadvantage: false,
  speedMultiplier: 1,
  maxHpMultiplier: 1,
  d20Penalty: 0,
  speedPenaltyMeters: 0,
}

function effects2014(lvl) {
  return {
    ...NEUTRO,
    abilityCheckDisadvantage: lvl >= 1,
    attackDisadvantage: lvl >= 3,
    saveDisadvantage: lvl >= 3,
    speedMultiplier: lvl >= 5 ? 0 : (lvl >= 2 ? 0.5 : 1),
    maxHpMultiplier: lvl >= 4 ? 0.5 : 1,
  }
}

function effects2024(lvl) {
  return {
    ...NEUTRO,
    d20Penalty: -2 * lvl,
    speedPenaltyMeters: 1.5 * lvl,
  }
}

/** Efeitos da exaustão da ficha, no shape unificado. */
export function exhaustionEffects(character) {
  const level = levelOf(character)
  const branch = byRuleset(character, { '2014': effects2014, '2024': effects2024 })
  return { level, dead: level >= MAX_EXHAUSTION, ...branch(level) }
}

const TEXTO_2014 = [
  'Sem efeito',
  'Desvantagem em testes de habilidade',
  'Deslocamento reduzido à metade',
  'Desvantagem em ataques e salvaguardas',
  'PV máximo reduzido à metade',
  'Deslocamento reduzido a 0',
  'Morte',
]

const TEXTO_2024 = [
  'Sem efeito',
  '−2 em testes de d20 · −1,5 m de deslocamento',
  '−4 em testes de d20 · −3 m de deslocamento',
  '−6 em testes de d20 · −4,5 m de deslocamento',
  '−8 em testes de d20 · −6 m de deslocamento',
  '−10 em testes de d20 · −7,5 m de deslocamento',
  'Morte',
]

/** Descrição por nível (índices 0 a 6) do ruleset dado. */
export function exhaustionLevelsText(ruleset) {
  return ruleset === '2024' ? TEXTO_2024 : TEXTO_2014
}
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js`
Esperado: PASS — 17 testes

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/exhaustion.js src/test/dnd5e/exhaustion-rulesets.test.js
git commit -m "feat(2024): exaustao nos dois rulesets com shape unificado"
```

---

## Task 5: Matar o código morto

`getExhaustionEffects` não tem importador de produção; `EXHAUSTION_EFFECTS`
tem só a UI. Os dois saem agora que existe a função viva.

**Files:**
- Modify: `src/systems/dnd5e/utils/calculations.js` (remover)
- Modify: `src/systems/dnd5e/domain/conditions.js` (remover)
- Delete: `src/test/exhaustion.test.js`

- [ ] **Step 1: Confirme que ninguém de produção importa**

Rode: `npx grep -rn "getExhaustionEffects\|EXHAUSTION_EFFECTS" src`

Esperado: só `utils/calculations.js` (a definição), `src/test/exhaustion.test.js`
(o teste que morre junto) e `domain/conditions.js` (a definição). Se aparecer
qualquer consumidor de produção que este plano não previu, **pare** e reporte —
o plano precisa de um passo a mais.

- [ ] **Step 2: Remova de `utils/calculations.js`**

Apague o bloco inteiro: o comentário `/** Efeitos de exaustão (PHB p.291)...`
e a função `export function getExhaustionEffects(level = 0) { ... }`.

- [ ] **Step 3: Remova de `domain/conditions.js`**

Apague as duas últimas linhas úteis do arquivo — o comentário
`/** Descrições de exaustão por nível (PHB p.291). */` e o
`export const EXHAUSTION_EFFECTS = [...]`.

Atualize o comentário do topo do arquivo, que hoje diz
`Condições D&D 5e (PHB p.290–296) + Exaustão (p.291).`, para:

```js
/**
 * Condições D&D 5e (PHB p.290–296).
 *
 * Exaustão NÃO mora aqui: ela diverge entre rulesets (tabela de 6 degraus no
 * 2014, −2 acumulativo no 2024) e vive em `domain/exhaustion.js`.
 *
 * Fonte única de verdade — consumida pelo HeaderV2 (chips e seletor de
 * condições da ficha) e pela tela de combate (CombatantRow, ConditionPalette).
 * Cada entrada traz `rule` em texto curto compatível com tooltip de UI
 * (1-3 linhas).
 */
```

- [ ] **Step 4: Apague o teste órfão**

```bash
git rm src/test/exhaustion.test.js
```

- [ ] **Step 5: Rode os testes tocados e confirme que passam**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js src/test/dnd5e/ruleset.test.js`
Esperado: PASS

Rode também, para pegar qualquer importador esquecido:
`npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js src/test/dnd5e/ruleset.test.js src/test/sheetV2-HeaderV2-conditions.test.jsx --maxWorkers=2`
Esperado: nenhum erro de import.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/utils/calculations.js src/systems/dnd5e/domain/conditions.js src/test/exhaustion.test.js
git commit -m "refactor(2024): mata getExhaustionEffects (codigo morto) e EXHAUSTION_EFFECTS"
```

---

## Task 6: `effectiveSpeed` consome o domínio

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js` (`effectiveSpeed`, ~linha 1004)
- Test: `src/test/dnd5e/exhaustion-rulesets.test.js` (acrescentar)

- [ ] **Step 1: Escreva os testes que falham**

Acrescente ao final de `src/test/dnd5e/exhaustion-rulesets.test.js`:

```js
import { effectiveSpeed } from '../../systems/dnd5e/domain/rules'

describe('effectiveSpeed com exaustão', () => {
  const anda = (exhaustion, ruleset, speed = 9, conditions = []) =>
    effectiveSpeed({ meta: { ruleset }, combat: { speed, exhaustion, conditions } })

  it('2014: metade no nível 2, zero no 5', () => {
    expect(anda(0, '2014')).toBe(9)
    expect(anda(1, '2014')).toBe(9)
    expect(anda(2, '2014')).toBe(4.5)
    expect(anda(4, '2014')).toBe(4.5)
    expect(anda(5, '2014')).toBe(0)
  })

  it('2024: subtrai 1,5 m por nível', () => {
    expect(anda(0, '2024')).toBe(9)
    expect(anda(1, '2024')).toBe(7.5)
    expect(anda(4, '2024')).toBe(3)
  })

  it('2024: piso 0, nunca negativo', () => {
    expect(anda(5, '2024', 6)).toBe(0)
    expect(anda(6, '2024', 9)).toBe(0)
  })

  it('condição que zera o deslocamento vence nos dois rulesets', () => {
    expect(anda(0, '2014', 9, ['grappled'])).toBe(0)
    expect(anda(0, '2024', 9, ['grappled'])).toBe(0)
  })

  it('ficha legada sem meta continua sob a regra 2014', () => {
    expect(effectiveSpeed({ combat: { speed: 9, exhaustion: 2 } })).toBe(4.5)
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js`
Esperado: FAIL — os casos 2024 dão 9 em vez de 7.5 (a função ainda é 2014-only)

- [ ] **Step 3: Implemente**

Em `src/systems/dnd5e/domain/rules.js`, acrescente ao bloco de imports do topo:

```js
import { exhaustionEffects } from './exhaustion'
```

Substitua a função inteira (comentário incluído):

```js
/**
 * Deslocamento efetivo em metros, derivado das condições ativas e da
 * exaustão. A exaustão diverge por ruleset (2014 multiplica, 2024 subtrai
 * metros) — ver domain/exhaustion.js. Não altera `combat.speed`: é derivação
 * de leitura, como a CA.
 */
export function effectiveSpeed(character) {
  const base = character.combat?.speed ?? 9
  const conditions = character.combat?.conditions ?? []
  if (conditions.some(c => SPEED_ZERO_CONDITIONS.has(c))) return 0
  const fx = exhaustionEffects(character)
  return Math.max(0, base * fx.speedMultiplier - fx.speedPenaltyMeters)
}
```

Note que a ordem mudou de propósito: a condição que zera passou a ser checada
**antes** da exaustão, e não entre os dois ramos dela. O resultado é o mesmo
(zero vence de qualquer jeito) e o código deixa de ter dois caminhos de saída.

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js`
Esperado: PASS

Rode a suíte de regras, que já cobre deslocamento:
`npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js src/test/sheetV2-AbilityStrip.test.jsx src/test/sheetV2-HeaderV2-conditions.test.jsx --maxWorkers=2`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/exhaustion-rulesets.test.js
git commit -m "feat(2024): effectiveSpeed despacha exaustao por ruleset"
```

---

## Task 7: `effectiveMaxHp` consome o domínio

Esta tarefa **corrige um bug de 2014**: o nível 4 de exaustão (PV máximo à
metade) nunca foi aplicado. Ficha 2014 existente com exaustão ≥ 4 vai mudar —
efeito colateral aprovado e registrado na spec.

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js` (`effectiveMaxHp`, ~linha 1078)
- Test: `src/test/dnd5e/exhaustion-rulesets.test.js` (acrescentar)

- [ ] **Step 1: Escreva os testes que falham**

Acrescente ao final de `src/test/dnd5e/exhaustion-rulesets.test.js` e amplie o
import de `rules` para incluir `effectiveMaxHp`:

```js
describe('effectiveMaxHp com exaustão', () => {
  const pv = (exhaustion, ruleset, maxHp = 40) =>
    effectiveMaxHp({ meta: { ruleset }, combat: { maxHp, exhaustion } })

  it('2014: nível 4 corta o PV máximo pela metade (regra que nunca funcionou)', () => {
    expect(pv(3, '2014')).toBe(40)
    expect(pv(4, '2014')).toBe(20)
    expect(pv(5, '2014')).toBe(20)
  })

  it('2024: exaustão não mexe no PV máximo', () => {
    expect(pv(4, '2024')).toBe(40)
    expect(pv(5, '2024')).toBe(40)
  })

  it('piso 1: nunca devolve 0 ou negativo', () => {
    expect(pv(4, '2014', 1)).toBe(1)
  })

  it('arredonda para baixo, como toda divisão de PV no PHB', () => {
    expect(pv(4, '2014', 41)).toBe(20)
  })

  it('ficha legada sem meta segue a regra 2014', () => {
    expect(effectiveMaxHp({ combat: { maxHp: 40, exhaustion: 4 } })).toBe(20)
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js`
Esperado: FAIL — `expected 40 to be 20` no caso 2014 nível 4

- [ ] **Step 3: Implemente**

Em `src/systems/dnd5e/domain/rules.js`, substitua a função:

```js
/**
 * PV máximo efetivo. Aplica a exaustão (só o 2014 mexe em PV — nível 4 corta
 * pela metade, PHB p.291) e depois a penalidade do Caçador de Sangue, nessa
 * ordem. Piso 1: uma ficha nunca fica com PV máximo 0 por derivação.
 */
export function effectiveMaxHp(character) {
  const stored = Number(character?.combat?.maxHp) || 0
  const fx = exhaustionEffects(character)
  const afterExhaustion = Math.floor(stored * fx.maxHpMultiplier)
  return Math.max(1, afterExhaustion - bloodHunterMaxHpPenalty(character))
}
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js`
Esperado: PASS

Rode as suítes que tocam PV e Caçador de Sangue, para pegar regressão:
`npx vitest run src/test/dnd5e/exhaustion-rulesets.test.js src/test/sheetV2-HeaderV2-hp.test.jsx --maxWorkers=2`
`npx vitest run src/test/dnd5e/blood-hunter-mutagens-sheet.test.js`
Esperado: PASS nas duas. Se algum teste de Caçador de Sangue quebrar, verifique
a **ordem**: exaustão multiplica primeiro, penalidade subtrai depois.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/exhaustion-rulesets.test.js
git commit -m "fix(regras): exaustao nivel 4 passa a cortar o PV maximo (2014)"
```

---

## Task 8: `flatMod` no resolver de rolagens

**Files:**
- Modify: `src/context/DiceRollerContext.jsx` (~linhas 62-76)
- Test: `src/test/diceRoller-effects.test.jsx`

- [ ] **Step 1: Escreva os testes que falham**

Acrescente a `src/test/diceRoller-effects.test.jsx`, seguindo o padrão dos
testes que já existem no arquivo (eles montam o provider e registram um
resolver via `result.current.setRollEffectsResolver`):

```js
  it('aplica flatMod negativo na notação', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ flatMod: -4 })))
    let out
    act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
    expect(out.modifier).toBe(1)
  })

  it('soma flatMod COM os riders de dado, sem substituir', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({
      extraDice: ['1d4'], flatMod: -2,
    })))
    let out
    act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
    expect(out.modifier).toBe(3)
    expect(out.groups).toHaveLength(2)
    expect(out.groups[1].sides).toBe(4)
  })

  it('flatMod 0 não muda a notação', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ flatMod: 0 })))
    let out
    act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
    expect(out.modifier).toBe(5)
  })

  it('ignora flatMod em notação sem dado (número puro)', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ flatMod: -4 })))
    let out
    act(() => { out = result.current.roll('7', 'Fixo', { category: 'check' }) })
    expect(out.total).toBe(7)
  })
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/diceRoller-effects.test.jsx`
Esperado: FAIL — `expected 5 to be 1` (o `flatMod` é ignorado hoje)

- [ ] **Step 3: Implemente**

Em `src/context/DiceRollerContext.jsx`, dentro do `if (eff)` do bloco de
efeitos, acrescente logo **depois** do laço de `extraDice`:

```js
        // Modificador plano (penalidade de exaustão 2024, por exemplo).
        // `parseAndRoll` aceita multi-termo com flat negativo — "1d20+5+1d4-4"
        // casa e `modifier` soma tudo. O ramo de número puro ("7") não é
        // notação de dado e não aceita concatenação, então fica de fora.
        if (eff.flatMod && /d\d/.test(effNotation)) {
          effNotation += eff.flatMod > 0 ? `+${eff.flatMod}` : `${eff.flatMod}`
        }
```

Atualize também o comentário do `roll` para mencionar o campo novo, e o
JSDoc/comentário que descreve o contrato do resolver, se houver.

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/diceRoller-effects.test.jsx`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/context/DiceRollerContext.jsx src/test/diceRoller-effects.test.jsx
git commit -m "feat(rolagem): resolver de efeitos aceita modificador plano"
```

---

## Task 9: `EffectsSync` injeta a exaustão

Duas armadilhas nesta tarefa. Primeira: hoje o componente chama
`setRollEffectsResolver(null)` quando não há efeito ativo nenhum — com
exaustão, a condição de saída muda. Segunda: a exaustão precisa **somar** com
os buffs, nunca substituir.

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/EffectsSync.jsx`
- Test: `src/test/effectsSync.test.jsx`

- [ ] **Step 1: Escreva os testes que falham**

Acrescente a `src/test/effectsSync.test.jsx`, seguindo o padrão de montagem do
arquivo (ele renderiza `EffectsSync` dentro de um contexto de personagem e lê
o resolver registrado):

```js
  it('2024: registra resolver por exaustão mesmo SEM buff nenhum', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2024' },
      combat: { exhaustion: 2, activeEffects: [] },
    })
    expect(resolver).not.toBeNull()
    expect(resolver('check', 'dex').flatMod).toBe(-4)
    expect(resolver('attack', null).flatMod).toBe(-4)
    expect(resolver('save', 'con').flatMod).toBe(-4)
  })

  it('2024: dano NÃO recebe a penalidade (a regra fala de teste de d20)', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2024' },
      combat: { exhaustion: 3, activeEffects: [] },
    })
    expect(resolver('damage', null)?.flatMod ?? 0).toBe(0)
  })

  it('2014: exaustão 1 dá desvantagem em teste, não em ataque nem salvaguarda', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2014' },
      combat: { exhaustion: 1, activeEffects: [] },
    })
    expect(resolver('check', 'dex').advantage).toBe('dis')
    expect(resolver('attack', null)?.advantage ?? null).toBeNull()
    expect(resolver('save', 'con')?.advantage ?? null).toBeNull()
  })

  it('2014: exaustão 3 estende a desvantagem a ataque e salvaguarda', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2014' },
      combat: { exhaustion: 3, activeEffects: [] },
    })
    expect(resolver('attack', null).advantage).toBe('dis')
    expect(resolver('save', 'con').advantage).toBe('dis')
  })

  it('2014: nunca emite flatMod', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2014' },
      combat: { exhaustion: 5, activeEffects: [] },
    })
    expect(resolver('check', 'dex').flatMod ?? 0).toBe(0)
  })

  it('sem exaustão e sem buff, o resolver volta a ser null', () => {
    const resolver = montarResolver({
      meta: { ruleset: '2024' },
      combat: { exhaustion: 0, activeEffects: [] },
    })
    expect(resolver).toBeNull()
  })
```

Se o arquivo ainda não tiver um helper `montarResolver`, escreva-o no topo do
`describe`, reaproveitando a montagem que os testes existentes já fazem:
ele renderiza `EffectsSync` com o personagem dado e devolve a função que foi
passada a `setRollEffectsResolver` (ou `null`).

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/effectsSync.test.jsx`
Esperado: FAIL — o resolver é `null` quando não há buff, então o primeiro teste
quebra em `expect(resolver).not.toBeNull()`

- [ ] **Step 3: Implemente**

Substitua o corpo de `EffectsSync.jsx`:

```jsx
import { useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'
import { aggregateSpellEffects } from '../../../domain/activeEffects'
import { exhaustionEffects } from '../../../domain/exhaustion'

/** Categorias de rolagem que são teste de d20 (dano não é). */
const D20_CATEGORIES = ['attack', 'check', 'save']

/**
 * Registra no DiceRollerProvider o resolver de efeitos da ficha
 * (padrão DiceAccentSync): riders (+1d4 da Bênção), vantagens e a penalidade
 * de exaustão entram nas rolagens anotadas com category/ability.
 * v2-only — o v1 não monta isto.
 *
 * Exaustão e buffs SOMAM: a penalidade 2024 se junta aos riders, e a
 * desvantagem 2014 se combina com a vantagem de um buff pela matriz do PHB
 * (que `combineMode` aplica do lado do provider).
 */
export function EffectsSync() {
  const { character, updaters } = useCharacterContext()
  const { setRollEffectsResolver } = useDiceRoller()
  const activeEffects = character.combat?.activeEffects
  const exhaustion = character.combat?.exhaustion ?? 0
  const ruleset = character.meta?.ruleset
  // Só isto é usado no efeito; depender do objeto `updaters` inteiro
  // re-registraria o resolver a cada render da ficha (churn desnecessário).
  const removeActiveEffect = updaters.removeActiveEffect

  useEffect(() => {
    const { riders, advantages } = aggregateSpellEffects(activeEffects ?? [])
    const fx = exhaustionEffects({ meta: { ruleset }, combat: { exhaustion } })

    if (riders.length === 0 && advantages.length === 0 && fx.level === 0) {
      setRollEffectsResolver(null)
      return () => setRollEffectsResolver(null)
    }

    setRollEffectsResolver((category, ability) => {
      const applicable = riders.filter(r => r.categories.includes(category))
      const adv = advantages.find(a =>
        a.categories.includes(category) &&
        (a.abilities ? (ability != null && a.abilities.includes(ability)) : true)
      )

      const isD20 = D20_CATEGORIES.includes(category)
      const flatMod = isD20 ? fx.d20Penalty : 0
      const exhaustionDis = isD20 && (
        (category === 'check'  && fx.abilityCheckDisadvantage) ||
        (category === 'attack' && fx.attackDisadvantage) ||
        (category === 'save'   && fx.saveDisadvantage)
      )

      if (applicable.length === 0 && !adv && !flatMod && !exhaustionDis) return null

      return {
        extraDice: applicable.map(r => r.dice),
        // A desvantagem da exaustão entra como se fosse mais um efeito: o
        // provider combina com o modo do usuário pela matriz do PHB.
        advantage: adv ? adv.mode : (exhaustionDis ? 'dis' : null),
        flatMod,
        labelSuffix: applicable.map(r => ` · ${r.effectName} +${r.dice}`).join(''),
        onApplied: () => {
          for (const r of applicable) {
            if (r.oneShot) removeActiveEffect?.(r.effectId)
          }
        },
      }
    })
    return () => setRollEffectsResolver(null)
  }, [activeEffects, exhaustion, ruleset, setRollEffectsResolver, removeActiveEffect])

  return null
}
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/effectsSync.test.jsx src/test/diceRoller-effects.test.jsx`
Esperado: PASS nos dois arquivos

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/EffectsSync.jsx src/test/effectsSync.test.jsx
git commit -m "feat(2024): exaustao entra nas rolagens somando com os buffs"
```

---

## Task 10: Texto de exaustão por ruleset no `HeaderV2`

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
  (chip ~linha 104, `ConditionsPanel` ~linha 353)
- Test: `src/test/sheetV2-header-exhaustion.test.jsx` (criar)

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/sheetV2-header-exhaustion.test.jsx`, usando o helper de
contexto que a suíte v2 já tem (`src/test/helpers/sheetV2TestContext.jsx`):

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithSheetV2Context } from './helpers/sheetV2TestContext'
import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

describe('chip de exaustão por ruleset', () => {
  it('2014: descreve o degrau da tabela', () => {
    renderWithSheetV2Context(<HeaderV2 />, {
      character: { meta: { ruleset: '2014' }, combat: { exhaustion: 2 } },
    })
    const chip = screen.getByText(/Exaustão 2/)
    expect(chip.getAttribute('title')).toMatch(/metade/i)
  })

  it('2024: descreve a penalidade acumulativa', () => {
    renderWithSheetV2Context(<HeaderV2 />, {
      character: { meta: { ruleset: '2024' }, combat: { exhaustion: 2 } },
    })
    const chip = screen.getByText(/Exaustão 2/)
    expect(chip.getAttribute('title')).toMatch(/-4|−4/)
  })

  it('sem exaustão, nenhum chip', () => {
    renderWithSheetV2Context(<HeaderV2 />, {
      character: { meta: { ruleset: '2024' }, combat: { exhaustion: 0 } },
    })
    expect(screen.queryByText(/Exaustão/)).toBeNull()
  })
})
```

Abra `src/test/helpers/sheetV2TestContext.jsx` antes de escrever e use o nome
e a assinatura reais do helper que estiver lá — se ele se chamar diferente de
`renderWithSheetV2Context`, ajuste os três casos.

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/sheetV2-header-exhaustion.test.jsx`
Esperado: FAIL — o chip não tem `title`

- [ ] **Step 3: Implemente**

Em `HeaderV2.jsx`, acrescente aos imports:

```jsx
import { exhaustionLevelsText } from '../../../domain/exhaustion'
import { rulesetOf } from '../../../domain/ruleset'
```

(confira a profundidade relativa contra os imports que já existem no arquivo).

Troque o chip de exaustão por:

```jsx
        {(combat?.exhaustion ?? 0) > 0 && (
          <span
            className="v2-chip"
            style={{ color: 'var(--v2-warning)' }}
            title={exhaustionLevelsText(rulesetOf(character))[combat.exhaustion]}
          >
            Exaustão {combat.exhaustion}
          </span>
        )}
```

No `ConditionsPanel`, mostre a mesma descrição ao lado do contador. Troque a
linha `<span>Exaustão</span>` por:

```jsx
        <span>
          Exaustão
          {exhaustion > 0 && (
            <span className="ink-italic" style={{ display: 'block', fontSize: '0.75em' }}>
              {exhaustionLevelsText(rulesetOf(character))[exhaustion]}
            </span>
          )}
        </span>
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/sheetV2-header-exhaustion.test.jsx`
Esperado: PASS

Rode a suíte do header, para pegar regressão:
`npx vitest run src/test/sheetV2-HeaderV2.test.jsx src/test/sheetV2-HeaderV2-conditions.test.jsx src/test/sheetV2-HeaderV2-hp.test.jsx src/test/sheetV2-HeaderV2-identity.test.jsx src/test/sheetV2-HeaderV2-progression.test.jsx src/test/sheetV2-HeaderV2-settings.test.jsx --maxWorkers=2`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx src/test/sheetV2-header-exhaustion.test.jsx
git commit -m "feat(2024): chip e painel de exaustao seguem o ruleset da ficha"
```

---

## Task 11: Escape hatch `?ruleset=2024`

**Files:**
- Create: `src/systems/dnd5e/rulesetFlag.js`
- Test: `src/test/dnd5e/ruleset-flag.test.js`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/ruleset-flag.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { isRulesetPickerEnabled } from '../../systems/dnd5e/rulesetFlag'

describe('isRulesetPickerEnabled', () => {
  it('liga com ?ruleset=2024', () => {
    expect(isRulesetPickerEnabled('?ruleset=2024')).toBe(true)
  })

  it('fica desligado sem o parâmetro', () => {
    expect(isRulesetPickerEnabled('')).toBe(false)
    expect(isRulesetPickerEnabled('?outra=coisa')).toBe(false)
  })

  it('não liga com valor diferente', () => {
    expect(isRulesetPickerEnabled('?ruleset=2014')).toBe(false)
    expect(isRulesetPickerEnabled('?ruleset=sim')).toBe(false)
  })

  it('convive com outros parâmetros', () => {
    expect(isRulesetPickerEnabled('?adm=1&ruleset=2024')).toBe(true)
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/ruleset-flag.test.js`
Esperado: FAIL — `Failed to resolve import`

- [ ] **Step 3: Implemente**

Crie `src/systems/dnd5e/rulesetFlag.js`, no mesmo formato de
`src/theme/flag.js` (função pura com `search` injetável, testável sem jsdom):

```js
/**
 * Escape hatch do seletor de ruleset. Enquanto o conteúdo 2024 não existe
 * (Fases 2 a 5), só quem passa `?ruleset=2024` na URL vê a opção no setup —
 * mesmo padrão de `?theme=parchment` e `?adm=1`.
 *
 * Ao contrário do flag de tema, este NÃO persiste: é ferramenta de
 * desenvolvimento, não preferência de usuário. Quando o pacote 2024 estiver
 * pronto (Fase 2 ou 3), este arquivo morre e o seletor vira público.
 */
export function isRulesetPickerEnabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
) {
  return new URLSearchParams(search).get('ruleset') === '2024'
}
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/ruleset-flag.test.js`
Esperado: PASS — 4 testes

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/rulesetFlag.js src/test/dnd5e/ruleset-flag.test.js
git commit -m "feat(2024): escape hatch ?ruleset=2024"
```

---

## Task 12: `RulesetPicker`

**Files:**
- Create: `src/systems/dnd5e/components/RulesetPicker.jsx`
- Test: `src/test/dnd5e/RulesetPicker.test.jsx`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/RulesetPicker.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesetPicker } from '../../systems/dnd5e/components/RulesetPicker'

describe('RulesetPicker', () => {
  it('mostra as duas opções com o rótulo em PT-BR', () => {
    render(<RulesetPicker value="2014" onChange={() => {}} />)
    expect(screen.getByLabelText(/D&D 5e \(2014\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/D&D 5e \(2024\)/)).toBeInTheDocument()
  })

  it('marca a opção do valor atual', () => {
    render(<RulesetPicker value="2024" onChange={() => {}} />)
    expect(screen.getByLabelText(/D&D 5e \(2024\)/)).toBeChecked()
    expect(screen.getByLabelText(/D&D 5e \(2014\)/)).not.toBeChecked()
  })

  it('avisa o chamador ao trocar', async () => {
    const onChange = vi.fn()
    render(<RulesetPicker value="2014" onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/D&D 5e \(2024\)/))
    expect(onChange).toHaveBeenCalledWith('2024')
  })

  it('deixa claro que a escolha é definitiva', () => {
    render(<RulesetPicker value="2014" onChange={() => {}} />)
    expect(screen.getByText(/não dá para trocar depois|imutável|definitiv/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/RulesetPicker.test.jsx`
Esperado: FAIL — `Failed to resolve import`

- [ ] **Step 3: Implemente**

Crie `src/systems/dnd5e/components/RulesetPicker.jsx`, seguindo o visual de
`SourcePicker.jsx` (mesmo `fieldset`/`legend`, mesmas classes de pergaminho),
mas com `radio` em vez de `checkbox` — os rulesets são exclusivos:

```jsx
import { RULESETS } from '../domain/ruleset'

/**
 * Escolhe o conjunto de regras da ficha. Exclusivo e DEFINITIVO: ao contrário
 * das fontes, o ruleset não pode ser trocado depois da criação.
 *
 * value: '2014' | '2024'. onChange recebe o código escolhido.
 */
export function RulesetPicker({ value = '2014', onChange }) {
  return (
    <fieldset className="ruleset-picker flex flex-col gap-2">
      <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
        Conjunto de regras
      </legend>
      {Object.values(RULESETS).map(r => {
        const checked = value === r.code
        return (
          <label
            key={r.code}
            className={[
              'flex items-center gap-3 py-2 px-3 rounded-sm border-2 transition-all cursor-pointer',
              checked
                ? 'border-ink-500 bg-parchment-100'
                : 'border-parchment-600/50 hover:border-parchment-600 hover:bg-parchment-100/60',
            ].join(' ')}
          >
            <input
              type="radio"
              name="ruleset"
              value={r.code}
              checked={checked}
              onChange={() => onChange(r.code)}
              aria-label={r.label}
              className="w-4 h-4 shrink-0 accent-ink-500"
            />
            <span className="flex-1 text-sm font-semibold font-display tracking-wide text-ink-500">
              {r.label}
            </span>
            <span className="shrink-0 text-[10px] font-display tracking-widest uppercase text-ink-300">
              {r.abbr}
            </span>
          </label>
        )
      })}
      <p className="text-xs ink-italic">
        A escolha é definitiva: não dá para trocar depois que a ficha existe.
      </p>
    </fieldset>
  )
}
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/RulesetPicker.test.jsx`
Esperado: PASS — 4 testes

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/RulesetPicker.jsx src/test/dnd5e/RulesetPicker.test.jsx
git commit -m "feat(2024): componente RulesetPicker"
```

---

## Task 13: O ruleset atravessa o wizard até a ficha

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/hooks/useDraft.js`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js:162-169`
- Test: `src/test/dnd5e/ruleset-wizard.test.js` (criar)

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/ruleset-wizard.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { parseCharacter } from '../../systems/dnd5e/domain/characterSchema'

/** Draft mínimo que `buildCharacter` aceita. */
function draft(overrides = {}) {
  return {
    ...INITIAL_DRAFT_V2,
    name: 'Teste', class: 'mago', level: 1, race: 'humano',
    baseAttributes: { str: 8, dex: 14, con: 12, int: 15, wis: 10, cha: 13 },
    ...overrides,
  }
}

const classData = { hit_die: 6, index: 'mago', name: 'Mago' }

describe('ruleset no draft do wizard', () => {
  it('o draft inicial nasce em 2014', () => {
    expect(INITIAL_DRAFT_V2.ruleset).toBe('2014')
  })

  it('ruleset fica FORA de settings — settings é o que se liga e desliga', () => {
    expect(INITIAL_DRAFT_V2.settings.ruleset).toBeUndefined()
  })
})

describe('buildCharacter carimba o ruleset', () => {
  it('grava 2024 quando o draft escolheu 2024', () => {
    const char = buildCharacter(draft({ ruleset: '2024' }), classData, [])
    expect(char.meta.ruleset).toBe('2024')
  })

  it('grava 2014 por padrão', () => {
    expect(buildCharacter(draft(), classData, []).meta.ruleset).toBe('2014')
  })

  it('SOBREVIVE à escada de migração — build grava schemaVersion 2', () => {
    // Regressão do risco real: build-character grava schemaVersion 2 hard-coded,
    // então a ficha 2024 sobe v2→v3→v4→v5 no primeiro parse. Se migrateV4ToV5
    // sobrescrevesse, a escolha do jogador sumiria aqui.
    const char = buildCharacter(draft({ ruleset: '2024' }), classData, [])
    expect(char.meta.schemaVersion).toBeLessThan(5)
    expect(parseCharacter(char).meta.ruleset).toBe('2024')
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/ruleset-wizard.test.js`
Esperado: FAIL — `expected undefined to be '2014'`

- [ ] **Step 3: Implemente**

**3a.** Em `useDraft.js`, acrescente o campo a `INITIAL_DRAFT_V2`, **fora** de
`settings`, logo depois do bloco `settings`:

```js
  // Conjunto de regras da ficha. FORA de `settings` de propósito: settings é
  // o que o jogador liga e desliga a qualquer momento; o ruleset é escolhido
  // uma vez e é definitivo. Ver domain/ruleset.js.
  ruleset: '2014',
```

**3b.** Em `build-character.js`, no objeto `meta` do retorno de
`buildCharacter`, acrescente após `creationMethod`:

```js
      ruleset: draft.ruleset ?? '2014',
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/ruleset-wizard.test.js`
Esperado: PASS — 5 testes

Rode a suíte do wizard, para pegar regressão:
`npx vitest run src/test/integration/wizardV2-shell.test.jsx`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/hooks/useDraft.js src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js src/test/dnd5e/ruleset-wizard.test.js
git commit -m "feat(2024): ruleset viaja do draft ate meta da ficha"
```

---

## Task 14: `CampaignSetupModal` e o wiring do wizard

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal.jsx`
  (estado ~linha 137, `onConfirm` ~linha 166-173, JSX ~linha 362)
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx`
  (~linha 88 e ~linha 435)
- Test: `src/test/dnd5e/RulesetPicker.test.jsx` (acrescentar)

- [ ] **Step 1: Escreva os testes que falham**

Acrescente a `src/test/dnd5e/RulesetPicker.test.jsx`:

```jsx
import { CampaignSetupModal } from '../../systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal'

describe('RulesetPicker no setup, atrás do escape hatch', () => {
  it('NÃO aparece sem ?ruleset=2024 na URL', () => {
    window.history.replaceState({}, '', '/')
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.queryByText(/Conjunto de regras/i)).toBeNull()
  })

  it('aparece com ?ruleset=2024 na URL', () => {
    window.history.replaceState({}, '', '/?ruleset=2024')
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/Conjunto de regras/i)).toBeInTheDocument()
    window.history.replaceState({}, '', '/')
  })

  it('entrega o ruleset escolhido no payload do onConfirm', async () => {
    window.history.replaceState({}, '', '/?ruleset=2024')
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByLabelText(/D&D 5e \(2024\)/))
    await userEvent.click(screen.getByRole('button', { name: /come|criar|confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ ruleset: '2024' })
    )
    window.history.replaceState({}, '', '/')
  })
})
```

Antes de escrever o terceiro caso, abra o `CampaignSetupModal` e confirme o
rótulo real do botão de confirmação — ajuste o regex do `getByRole` para casar
com ele.

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/RulesetPicker.test.jsx`
Esperado: FAIL nos casos novos — o seletor não está montado

- [ ] **Step 3: Implemente**

**3a.** Em `CampaignSetupModal.jsx`, acrescente aos imports:

```jsx
import { RulesetPicker } from '../RulesetPicker'
import { isRulesetPickerEnabled } from '../../rulesetFlag'
```

**3b.** Acrescente o estado, junto dos outros `useState`:

```jsx
  const [ruleset, setRuleset] = useState('2014')
  const rulesetPickerOn = isRulesetPickerEnabled()
```

**3c.** Monte o seletor no JSX, logo **acima** do `<SourcePicker ... />` (o
conjunto de regras precede as fontes: ele decide de qual pacote as fontes
saem):

```jsx
        {rulesetPickerOn && <RulesetPicker value={ruleset} onChange={setRuleset} />}
```

**3d.** No handler de confirmação, o `ruleset` viaja **ao lado** do objeto
`settings`, não dentro dele. Onde hoje está:

```jsx
    if (showDestination) onConfirm({ settings, campaignId })
    else onConfirm(settings)
```

troque por:

```jsx
    // `ruleset` viaja ao lado de `settings`, não dentro: settings vira
    // meta.settings, e o ruleset mora em meta.ruleset. Ver domain/ruleset.js.
    if (showDestination) onConfirm({ settings, ruleset, campaignId })
    else onConfirm({ settings, ruleset })
```

**3e.** Em `CharacterWizardV2.jsx`, o `onConfirm` legado agora sempre recebe um
objeto. Troque o handler:

```jsx
        onConfirm={payload => {
          // payload = { settings, ruleset } e, com destino, também campaignId.
          if (showDestination) setCampaignId(payload.campaignId)
          setPendingSettings(payload.settings)
          setPendingRuleset(payload.ruleset ?? '2014')
          setPhase('grid')
        }}
```

Declare `pendingRuleset` junto de `pendingSettings` (mesmo `useState`, mesmo
lugar), e passe-o ao `useDraft`. Localize a chamada existente na linha ~88 e
acrescente o campo ao objeto de opções, no formato que o hook já usa para
`initialSettings` — o draft precisa nascer com `ruleset: pendingRuleset`.

Em `useDraft.js`, no ramo que monta `merged` a partir de `initialSettings`,
acrescente uma opção irmã. Troque a assinatura:

```js
export function useDraft({ initialSettings = null, initialRuleset = null, resume = false } = {}) {
```

e, dentro do ramo `if (initialSettings)`, depois do bloco de `startLevel`:

```js
      if (initialRuleset === '2014' || initialRuleset === '2024') {
        merged.ruleset = initialRuleset
      }
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/RulesetPicker.test.jsx src/test/dnd5e/ruleset-wizard.test.js`
Esperado: PASS

Rode a suíte do wizard inteira, já que o contrato do `onConfirm` mudou:
`npx vitest run src/test/integration/wizardV2-shell.test.jsx`
Esperado: PASS. Se algum teste montava o modal e afirmava `onConfirm(settings)`
com o objeto de settings cru, atualize-o para o payload novo — o contrato
mudou de propósito.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal.jsx src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx src/systems/dnd5e/components/CharacterWizardV2/hooks/useDraft.js src/test/dnd5e/RulesetPicker.test.jsx
git commit -m "feat(2024): seletor de ruleset no setup atras do escape hatch"
```

---

## Task 15: `RulesetBadge` na ficha

**Files:**
- Create: `src/systems/dnd5e/components/RulesetBadge.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/dnd5e/RulesetBadge.test.jsx`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/test/dnd5e/RulesetBadge.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RulesetBadge } from '../../systems/dnd5e/components/RulesetBadge'

describe('RulesetBadge', () => {
  it('não renderiza nada em ficha 2014 — a ficha fica idêntica ao que era', () => {
    const { container } = render(<RulesetBadge character={{ meta: { ruleset: '2014' } }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('não renderiza nada em ficha legada sem o campo', () => {
    const { container } = render(<RulesetBadge character={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra o selo em ficha 2024', () => {
    render(<RulesetBadge character={{ meta: { ruleset: '2024' } }} />)
    expect(screen.getByText('5e24')).toBeInTheDocument()
  })

  it('explica o selo no title', () => {
    render(<RulesetBadge character={{ meta: { ruleset: '2024' } }} />)
    expect(screen.getByText('5e24').closest('[title]')?.getAttribute('title'))
      .toMatch(/2024/)
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/RulesetBadge.test.jsx`
Esperado: FAIL — `Failed to resolve import`

- [ ] **Step 3: Implemente**

Crie `src/systems/dnd5e/components/RulesetBadge.jsx`:

```jsx
import { RULESETS, is2024, rulesetOf } from '../domain/ruleset'

/**
 * Selo read-only do conjunto de regras. Só aparece em ficha 2024: 2014 é o
 * padrão silencioso, e marcá-lo poluiria toda ficha existente sem informar
 * nada. O ruleset é imutável, então o selo não é clicável.
 */
export function RulesetBadge({ character }) {
  if (!is2024(character)) return null
  const rs = RULESETS[rulesetOf(character)]
  return (
    <span
      className="v2-chip"
      title={`Esta ficha usa as regras de ${rs.label}. A escolha é definitiva.`}
    >
      {rs.abbr}
    </span>
  )
}
```

Em `HeaderV2.jsx`, importe e monte o selo na mesma faixa de chips onde já
ficam Inspiração e Exaustão, como **primeiro** item da faixa:

```jsx
import { RulesetBadge } from '../../RulesetBadge'
```

```jsx
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <RulesetBadge character={character} />
        {combat?.inspiration && (
```

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/RulesetBadge.test.jsx`
Esperado: PASS — 4 testes

Rode a suíte do header, para confirmar que a ficha 2014 não mudou:
`npx vitest run src/test/sheetV2-HeaderV2.test.jsx src/test/sheetV2-HeaderV2-conditions.test.jsx src/test/sheetV2-HeaderV2-hp.test.jsx src/test/sheetV2-HeaderV2-identity.test.jsx src/test/sheetV2-HeaderV2-progression.test.jsx src/test/sheetV2-HeaderV2-settings.test.jsx --maxWorkers=2`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/RulesetBadge.jsx src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx src/test/dnd5e/RulesetBadge.test.jsx
git commit -m "feat(2024): selo de ruleset na ficha (so aparece em 2024)"
```

---

## Task 16: Badge na tela do Mestre

**Files:**
- Modify: `src/systems/dnd5e/components/Encounter/CombatantRow.jsx` (~linha 96)
- Test: `src/test/dnd5e/RulesetBadge.test.jsx` (acrescentar)

- [ ] **Step 1: Escreva os testes que falham**

Acrescente a `src/test/dnd5e/RulesetBadge.test.jsx`:

```jsx
import { CombatantRow } from '../../systems/dnd5e/components/Encounter/CombatantRow'

const pc = (name = 'Vestrit') => ({
  id: 'c1', kind: 'pc', name, initiative: 12,
})
const noop = () => {}
const rowProps = {
  active: false,
  onSelect: noop, onDamage: noop, onHeal: noop,
  onRemove: noop, onInitiativeChange: noop, onToggleTarget: noop,
}

describe('badge de ruleset na mesa do Mestre', () => {
  it('ficha 2024 do jogador mostra o selo na linha', () => {
    render(<CombatantRow
      {...rowProps}
      combatant={pc()}
      doc={{ meta: { ruleset: '2024' }, combat: { maxHp: 30, currentHp: 30, armorClass: 16 } }}
    />)
    expect(screen.getByText('5e24')).toBeInTheDocument()
  })

  it('ficha 2014 não polui a linha', () => {
    render(<CombatantRow
      {...rowProps}
      combatant={pc()}
      doc={{ meta: { ruleset: '2014' }, combat: { maxHp: 30, currentHp: 30, armorClass: 16 } }}
    />)
    expect(screen.queryByText('5e24')).toBeNull()
  })

  it('monstro (sem doc) não quebra nem mostra selo', () => {
    render(<CombatantRow
      {...rowProps}
      combatant={{ id: 'm1', kind: 'monster', name: 'Goblin', initiative: 9, currentHp: 7, maxHp: 7, ac: 15 }}
      doc={null}
    />)
    expect(screen.queryByText('5e24')).toBeNull()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

Rode: `npx vitest run src/test/dnd5e/RulesetBadge.test.jsx`
Esperado: FAIL — o selo não aparece na linha

- [ ] **Step 3: Implemente**

Em `CombatantRow.jsx`, importe o selo:

```jsx
import { RulesetBadge } from '../RulesetBadge'
```

Monte-o ao lado do nome do combatente, logo depois de `{combatant.name}` e
antes do aviso de `orphaned`. `RulesetBadge` já devolve `null` para `doc` nulo
ou ficha 2014, então não precisa de guarda extra:

```jsx
          {combatant.name}
        </span>
        {isPc && <RulesetBadge character={doc} />}
        {isPc && combatant.orphaned && (
```

Confira o JSX real ao redor da linha 96 antes de editar — o fechamento do
`<span>` do nome precisa continuar equilibrado.

- [ ] **Step 4: Rode e confirme que passa**

Rode: `npx vitest run src/test/dnd5e/RulesetBadge.test.jsx`
Esperado: PASS — 7 testes

Rode a suíte de encontro:
`npx vitest run src/test/CombatantRow.test.jsx --maxWorkers=2`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/CombatantRow.jsx src/test/dnd5e/RulesetBadge.test.jsx
git commit -m "feat(2024): tela do Mestre mostra o ruleset de cada ficha"
```

---

## Task 17: E2E no navegador real

O padrão de `e2e-pw/` é **semear a ficha pronta** e abrir por `/c/<shortId>` —
não percorrer o wizard. `installAuthedApp(context, { characters: [...] })`
recebe o **context** (não a page) e stuba a sessão e o Supabase.

Duas armadilhas conhecidas, ambas já pagas por specs anteriores:
- As versões mobile e desktop da ficha **coexistem no DOM** (só uma visível).
  Todo texto precisa ser buscado com `visible: true`, senão `.first()` cai
  numa cópia oculta e o teste falha sem haver defeito.
- `short_id` tem 10 caracteres de um alfabeto que exclui os pares ambíguos:
  `I` e `O` maiúsculos, `i`/`l`/`o` minúsculos, e os dígitos `0` e `1`.
  `L` **maiúsculo** é válido (migration `0003_characters_short_id.sql`).

**Files:**
- Create: `e2e-pw/ruleset-2024.spec.js`

- [ ] **Step 1: Escreva o spec**

Crie `e2e-pw/ruleset-2024.spec.js`:

```js
import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

/**
 * Eixo `ruleset` (Fase 1 do D&D 2024).
 *
 * A prova que interessa aqui é a assimetria: a ficha 2024 ganha um selo e uma
 * descrição de exaustão diferentes, e a ficha 2014 fica EXATAMENTE como era.
 * Uma fundação que muda a ficha 2014 sem querer é uma fundação quebrada.
 *
 * NOTA: as versões mobile e desktop da ficha coexistem no DOM (só uma fica
 * visível). Por isso todo texto aqui é buscado com `visible: true`.
 */
const ID_2024 = '77777777-7777-4777-7777-777777777777'
const ID_2014 = '66666666-6666-4666-6666-666666666666'

/** Primeiro nó VISÍVEL com este texto (evita a cópia mobile/desktop oculta). */
function visivel(page, texto) {
  return page.getByText(texto).filter({ visible: true }).first()
}

/** Ficha com ruleset e exaustão dados. Nível 2 de exaustão em ambas. */
function ficha(id, nome, shortId, ruleset) {
  return makeCharacter(id, nome, {
    shortId,
    meta: {
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: '1.0',
      schemaVersion: 5,
      ruleset,
    },
    combat: {
      maxHp: 28, currentHp: 28, tempHp: 0, armorClass: 16, speed: 9,
      hitDice: { pool: { d10: { total: 3, used: 0 } } }, attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      conditions: [], inspiration: false, exhaustion: 2,
    },
  })
}

test('ficha 2024: selo visível e exaustão descrita pela regra nova', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [ficha(ID_2024, 'Yolande', 'RULESETAA', '2024')] })
  await page.goto('/c/RULESETAA')
  await expect(visivel(page, 'Yolande')).toBeVisible()

  await expect(visivel(page, '5e24')).toBeVisible()

  // −4 = 2 × nível 2. A regra 2024 é acumulativa, não uma tabela de degraus.
  const chip = visivel(page, /Exaustão 2/)
  await expect(chip).toHaveAttribute('title', /−4|-4/)
})

test('ficha 2014: nenhum selo novo e a tabela de degraus intacta', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [ficha(ID_2014, 'Vestrit', 'RULESETBB', '2014')] })
  await page.goto('/c/RULESETBB')
  await expect(visivel(page, 'Vestrit')).toBeVisible()

  // A fundação NÃO pode marcar a ficha 2014: 2014 é o padrão silencioso.
  await expect(page.getByText('5e24')).toHaveCount(0)

  // Nível 2 no 2014 é deslocamento pela metade, não penalidade numérica.
  const chip = visivel(page, /Exaustão 2/)
  await expect(chip).toHaveAttribute('title', /metade/i)
})

test('o seletor de ruleset só existe com o escape hatch', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [] })

  await page.goto('/')
  await page.getByRole('button', { name: /criar|nova ficha/i }).first().click()
  await expect(page.getByText(/Conjunto de regras/i)).toHaveCount(0)

  await page.goto('/?ruleset=2024')
  await page.getByRole('button', { name: /criar|nova ficha/i }).first().click()
  await expect(page.getByText(/Conjunto de regras/i)).toBeVisible()
  await expect(page.getByLabel(/D&D 5e \(2024\)/)).toBeVisible()
})
```

Antes de rodar, abra `e2e-pw/smoke.spec.js` e confirme o rótulo real do botão
que abre a criação de ficha na lista vazia — ajuste o regex
`/criar|nova ficha/i` do terceiro teste para casar com ele.

**Por que a rolagem com `-4` não está aqui:** ela depende do painel de dados e
da fila do 3D, o que torna o teste sensível a tempo sem provar nada que os
testes das Tasks 8 e 9 já não provem de forma determinística. A cadeia até a
notação fica coberta por unidade, e a Task 18 confere no navegador com os
próprios olhos.

- [ ] **Step 2: Rode**

Rode: `npx playwright test e2e-pw/ruleset-2024.spec.js`
Esperado: PASS — 3 testes

Se o selo não for encontrado, confira primeiro se `RulesetBadge` está montado
na faixa de chips do `HeaderV2` que fica **visível** no viewport do teste — a
cópia mobile e a desktop têm faixas separadas.

- [ ] **Step 3: Commit**

```bash
git add e2e-pw/ruleset-2024.spec.js
git commit -m "test(2024): e2e do selo, da exaustao por ruleset e do escape hatch"
```

---

## Task 18: Verificação final e integração

- [ ] **Step 1: Rode a suíte inteira, em fatias**

`npx vitest run` sem flags **estoura a memória da máquina** e finge falhas
aleatórias em arquivos sem relação. Rode em fatias:

```bash
npx vitest run src/test/dnd5e --maxWorkers=2
```
```bash
npx vitest run src/test/integration --maxWorkers=2
```
```bash
npx vitest run src/test --maxWorkers=2 --exclude "src/test/dnd5e/**" --exclude "src/test/integration/**"
```

Esperado: PASS nas três. Se algo vermelho aparecer, conserte antes de seguir —
não prossiga com suíte quebrada.

- [ ] **Step 2: Rode o E2E**

```bash
npx playwright test
```

Esperado: PASS.

- [ ] **Step 3: Confira que nada de conteúdo mudou**

```bash
git diff --stat master -- public/srd-data vite.config.js supabase
```

Esperado: **vazio**. Se `public/srd-data` aparecer, algo saiu do escopo; se
`vite.config.js` aparecer, alguém bumpou `srd-data-vN` sem precisar — reverta.

- [ ] **Step 4: Prova visual no navegador**

Suba o preview e confirme com os próprios olhos:

1. Uma ficha 2014 existente: nenhum selo novo, chip de exaustão com a
   descrição da tabela de 6 degraus.
2. `?ruleset=2024` no setup: o seletor aparece; escolhendo 2024 e criando a
   ficha, o selo `5e24` aparece no header.
3. Ficha 2024 com exaustão 2: uma rolagem de perícia sai com `-4` na notação.
4. A mesma ficha na tela do Mestre: o selo aparece na linha do combatente.

- [ ] **Step 5: Merge e deploy**

```bash
git checkout master && git merge --no-ff - && git push
```

Confirme que o deploy de produção disparou.

- [ ] **Step 6: Atualize a spec e a memória**

Marque a spec como **ENTREGUE** no cabeçalho, anotando na própria linha onde a
implementação divergiu do previsto. Atualize
`project_dnd_2024_fronteira.md` na memória: Fase 1 entregue, o que a Fase 2
herda, e qualquer gotcha novo descoberto na execução.

```bash
git add docs/superpowers/specs/2026-08-25-dnd-2024-fundacao-ruleset-design.md
git commit -m "docs(2024): marca a Fase 1 como entregue"
git push
```

---

## Cobertura da spec

| Requisito da spec | Task |
|---|---|
| `domain/ruleset.js` com `RULESETS`/`rulesetOf`/`is2024`/`byRuleset` | 1 |
| Aviso no topo distinguindo `source` (aditivo) de `ruleset` (substitutivo) | 1 |
| `meta.ruleset` fora de `meta.settings`, `SCHEMA_VERSION` 4→5 | 2 |
| `migrateV4ToV5` carimba `'2014'`, idempotente | 2 |
| Âncora: único delta é `schemaVersion` + `ruleset` | 3 |
| `exhaustion.js` com shape unificado, dois ramos | 4 |
| `exhaustionLevelsText` substitui `EXHAUSTION_EFFECTS` | 4, 5 |
| `getExhaustionEffects` deletado; teste reescrito | 4, 5 |
| `effectiveSpeed` consome (metade/zero vs −1,5 m/nível, piso 0) | 6 |
| `effectiveMaxHp` consome; corrige exaustão 4 no 2014 | 7 |
| `flatMod` no `DiceRollerContext` | 8 |
| `EffectsSync` soma exaustão com buffs; `damage` fora | 9 |
| Chip e painel de exaustão por ruleset | 10 |
| Escape hatch `?ruleset=2024` | 11 |
| `RulesetPicker` no `CampaignSetupModal` atrás do flag | 12, 14 |
| `useDraft` + `build-character` carregam o ruleset | 13 |
| `RulesetBadge` só em 2024; ficha 2014 idêntica | 15 |
| Badge na tela do Mestre; carimbo preservado | 16 |
| E2E do escape hatch e do selo | 17 |
| Iniciativa coberta via `category: 'check'` já existente | 9 (sem código novo) |
| Não bumpar `srd-data-vN`; sem migration | 18 |
