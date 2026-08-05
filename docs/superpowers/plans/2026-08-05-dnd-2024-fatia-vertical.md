# D&D 2024 — fatia vertical (eixo `ruleset`) — Plano de Implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIO: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para rastreio.

**Goal:** Permitir criar uma ficha de Mago do D&D 2024 de ponta a ponta — aumento de atributo vindo do antecedente, talento de origem concedido, subclasse no nível 3, catálogo estritamente 2024 — sem alterar nenhum comportamento das fichas 2014 existentes.

**Architecture:** O 2024 entra como eixo `ruleset` (não como `source` nem como `system`). Um descritor declarativo em `domain/rulesets.js` concentra o delta entre gerações; `rules.js` continua sendo o motor único e consulta o descritor. O catálogo é trocado na camada de dados (`SrdProvider` compõe partes diferentes por ruleset, mantendo as mesmas chaves lógicas), então os ~21.000 linhas de componentes não mudam.

**Tech Stack:** React 19, Zod, Vitest, Vite/PWA (Workbox), Python 3.13 + pymupdf para extração de PDF.

**Spec:** `docs/superpowers/specs/2026-08-05-dnd-2024-eixo-ruleset-design.md`

---

## Desvio consciente da spec (decidido no planejamento)

A spec listava três costuras, sendo a terceira *"`filterCatalogBySources` — `phb` deixa de ser fixa"*.

**Essa costura é desnecessária e NÃO será implementada.** Motivo: a gating estrita
acontece na **camada de dados**, não no filtro. Com `COMPOSED_BY_RULESET`, o
catálogo de uma ficha 2024 contém *exclusivamente* itens `source: 'phb2024'` —
não existe item 2014 no array para vazar. O `'phb'` fixo do filtro passa a ser
inerte.

Mexer no filtro exigiria threading de um parâmetro novo por ~15 sítios de prop
(`activeSources` é repassado em cascata por `ClassBlock`, `LevelUpPanel`,
`MainBox`, `FeaturesTab`, `Inventory`…), com risco real de regressão no 2014
para zero ganho.

**Em troca, a Task 11 adiciona um teste-guarda** que falha se algum item de fonte
2014 aparecer no catálogo 2024. O risco nº 4 da spec fica coberto por teste, que
era o objetivo.

---

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `src/systems/dnd5e/domain/rulesets.js` | Descritor declarativo das gerações + `rulesetOf` + `sourcesFor` |
| `src/test/dnd5e/rulesets.test.js` | Testes do descritor |
| `src/test/dnd5e/ruleset-schema-migration.test.js` | Testes de schema v5 + migração |
| `src/test/dnd5e/ruleset-rules-seams.test.js` | Testes das duas costuras em `rules.js` |
| `src/test/dnd5e/ruleset-catalog-gating.test.js` | Teste-guarda de gating estrito |
| `scripts/ldj2024/README.md` | Receita da esteira, gotchas e mapa de páginas |
| `scripts/ldj2024/extract_text.py` | Extração com decodificação de versalete |
| `scripts/ldj2024/build_backgrounds.py` | Antecedentes → JSON |
| `scripts/ldj2024/build_species.py` | Espécies → JSON |
| `scripts/ldj2024/build_origin_feats.py` | Talentos de origem → JSON |
| `public/srd-data/ldj2024-backgrounds-pt.json` | Antecedentes 2024 |
| `public/srd-data/ldj2024-races-pt.json` | Espécies 2024 (chave lógica `races`) |
| `public/srd-data/ldj2024-feats-pt.json` | Talentos de origem 2024 |
| `public/srd-data/ldj2024-classes-pt.json` | Mago 2024 |
| `public/srd-data/ldj2024-class-choices-pt.json` | Subclasses do Mago (nível 3) |
| `public/srd-data/ldj2024-class-progression-pt.json` | Progressão do Mago |
| `public/srd-data/ldj2024-spells-pt.json` | Magias da lista de Mago |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `src/systems/dnd5e/domain/characterSchema.js` | `settings.ruleset`, `SCHEMA_VERSION` 4→5, `migrateV4ToV5` |
| `src/systems/dnd5e/domain/rules.js:235` | `computeRacialBonuses` respeita `abilityBonusFrom` |
| `src/systems/dnd5e/domain/rules.js:285` | `applyBackgroundChange` aplica atributo + talento de origem |
| `src/systems/dnd5e/data/SrdProvider.jsx` | `COMPOSED_BY_RULESET` + prop `ruleset` |
| `src/systems/dnd5e/ui.jsx` | Repassa `variant` para o `SrdProvider` |
| `src/systems/dnd5e/core.js` | `dataVariantOf` + selo `2024` no `summarize` |
| `src/utils/storage.js` | `getCharacterRouting(id)` |
| `src/App.jsx` | Rota da ficha usa `getCharacterRouting` |
| `src/components/CharacterList/CharacterToken.jsx` | Marca gráfica de geração |
| `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` | Passo de escolha de geração |
| `vite.config.js:110` | Bump `srd-data-v37` → `srd-data-v38` |

---

## Regras gerais de execução

- **Rodar testes em fatias:** `npx vitest run` sem flags estoura a memória da máquina e produz falhas falsas em arquivos sem relação. Sempre `npx vitest run <caminho> --maxWorkers=2`.
- **Commits frequentes**, um por tarefa concluída.
- **Nunca reimplementar a regra dentro do teste.** Todo teste importa a função de produção. Helper de teste que faz conta é o sinal de teste falso.
- Branch de trabalho: `feat/dnd-2024-eixo-ruleset` (já existe, contém a spec).

---

# FASE A — Motor

## Task 1: Descritor de ruleset

**Files:**
- Create: `src/systems/dnd5e/domain/rulesets.js`
- Test: `src/test/dnd5e/rulesets.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/dnd5e/rulesets.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { RULESETS, rulesetOf, rulesetFor, sourcesFor } from '../../systems/dnd5e/domain/rulesets'

describe('RULESETS — descritor', () => {
  it('2014 concede atributo pela raça e não tem nível de subclasse uniforme', () => {
    expect(RULESETS['2014'].abilityBonusFrom).toBe('race')
    expect(RULESETS['2014'].backgroundGrantsFeat).toBe(false)
    expect(RULESETS['2014'].subclassLevel).toBe(null)
  })
  it('2024 concede atributo pelo antecedente, com talento de origem e subclasse no 3', () => {
    expect(RULESETS['2024'].abilityBonusFrom).toBe('background')
    expect(RULESETS['2024'].backgroundGrantsFeat).toBe('origem')
    expect(RULESETS['2024'].subclassLevel).toBe(3)
  })
  it('as fontes de cada geração não se cruzam', () => {
    const a = new Set(RULESETS['2014'].sources)
    expect(RULESETS['2024'].sources.some(s => a.has(s))).toBe(false)
  })
})

describe('rulesetOf', () => {
  it('ficha legada sem ruleset é 2014', () => {
    expect(rulesetOf({ meta: { settings: {} } })).toBe('2014')
    expect(rulesetOf({})).toBe('2014')
    expect(rulesetOf(null)).toBe('2014')
  })
  it('lê o ruleset declarado na ficha', () => {
    expect(rulesetOf({ meta: { settings: { ruleset: '2024' } } })).toBe('2024')
  })
})

describe('rulesetFor', () => {
  it('devolve o descritor da ficha', () => {
    expect(rulesetFor({ meta: { settings: { ruleset: '2024' } } }).id).toBe('2024')
  })
  it('valor desconhecido cai no descritor 2014 (o schema é quem reprova)', () => {
    expect(rulesetFor({ meta: { settings: { ruleset: 'xpto' } } }).id).toBe('2014')
  })
})

describe('sourcesFor — gating estrito', () => {
  it('2014 mantém as fontes ligadas pelo jogador', () => {
    const c = { meta: { settings: { sources: ['phb', 'tasha'] } } }
    expect(sourcesFor(c)).toEqual(['phb', 'tasha'])
  })
  it('2024 descarta fonte 2014 mesmo se persistida na ficha', () => {
    const c = { meta: { settings: { ruleset: '2024', sources: ['phb', 'tasha', 'phb2024'] } } }
    expect(sourcesFor(c)).toEqual(['phb2024'])
  })
  it('ficha 2024 sem sources recebe a fonte base da geração', () => {
    const c = { meta: { settings: { ruleset: '2024' } } }
    expect(sourcesFor(c)).toEqual(['phb2024'])
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx vitest run src/test/dnd5e/rulesets.test.js --maxWorkers=2
```

Esperado: FAIL — `Failed to resolve import ".../domain/rulesets"`.

- [ ] **Step 3: Implementar o descritor**

Criar `src/systems/dnd5e/domain/rulesets.js`:

```js
/**
 * Geração de regra de D&D (o eixo `ruleset`). SUBSTITUTIVO, não aditivo:
 * troca a resposta de perguntas que já existem, ao contrário de `source`
 * (domain/sources.js), que só acrescenta opções ao mesmo picker.
 *
 * O descritor é DADO. Divergência que não couber em dado vira hook nomeado —
 * e cada hook é sinal de alerta de que a abordagem está degenerando em
 * ramificação espalhada por rules.js.
 */

export const DEFAULT_RULESET = '2014'

export const RULESETS = {
  '2014': {
    id: '2014',
    label: 'D&D 5e (2014)',
    sources: ['phb', 'tasha', 'xanathar'],
    /** Quem concede aumento de atributo na origem: 'race' | 'background'. */
    abilityBonusFrom: 'race',
    /** Categoria de talento concedida pelo antecedente, ou false. */
    backgroundGrantsFeat: false,
    /** Nível uniforme de subclasse, ou null quando é por classe. */
    subclassLevel: null,
  },
  '2024': {
    id: '2024',
    label: 'D&D 2024',
    sources: ['phb2024'],
    abilityBonusFrom: 'background',
    backgroundGrantsFeat: 'origem',
    subclassLevel: 3,
  },
}

/**
 * Geração declarada na ficha. Trata APENAS ausência (ficha legada → 2014);
 * validade é responsabilidade do schema, não daqui.
 */
export function rulesetOf(character) {
  return character?.meta?.settings?.ruleset ?? DEFAULT_RULESET
}

/** Descritor da ficha, com fallback defensivo para valor desconhecido. */
export function rulesetFor(character) {
  return RULESETS[rulesetOf(character)] ?? RULESETS[DEFAULT_RULESET]
}

/**
 * Fontes efetivamente oferecidas à ficha: interseção das fontes ligadas pelo
 * jogador com as permitidas pela geração. Ficha sem `sources` recebe a fonte
 * base da geração.
 */
export function sourcesFor(character) {
  const rs = rulesetFor(character)
  const allowed = new Set(rs.sources)
  const active = character?.meta?.settings?.sources ?? []
  const kept = active.filter(s => allowed.has(s))
  return kept.length ? kept : [rs.sources[0]]
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx vitest run src/test/dnd5e/rulesets.test.js --maxWorkers=2
```

Esperado: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/rulesets.js src/test/dnd5e/rulesets.test.js
git commit -m "feat(2024): descritor declarativo de ruleset"
```

---

## Task 2: Schema — `ruleset`, versão 5 e migração

**Files:**
- Modify: `src/systems/dnd5e/domain/characterSchema.js:32` (SCHEMA_VERSION), `:51-64` (settingsSchema), `:471-491` (migrateCharacter)
- Test: `src/test/dnd5e/ruleset-schema-migration.test.js`

**GOTCHA (leia antes de codar):** `settingsSchema` termina em `.partial()`. Em Zod,
`.partial()` embrulha cada campo em `ZodOptional`, e `ZodOptional` curto-circuita
antes de rodar o `.default()` interno. Ou seja, **`.default('2014')` dentro do
`settingsSchema` NÃO seria aplicado**. Por isso o campo é `.optional()` (valida
quando presente) e quem garante o valor é a migração + `rulesetOf`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/dnd5e/ruleset-schema-migration.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { SCHEMA_VERSION, migrateCharacter, safeParseCharacter } from '../../systems/dnd5e/domain/characterSchema'
import { rulesetOf } from '../../systems/dnd5e/domain/rulesets'

const fichaV4 = () => ({
  meta: { createdAt: 'x', updatedAt: 'x', schemaVersion: 4, settings: { sources: ['phb'] } },
  info: { name: 'Velha', class: 'mago', level: 1 },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
})

describe('migração v4 → v5', () => {
  it('SCHEMA_VERSION é 5', () => {
    expect(SCHEMA_VERSION).toBe(5)
  })
  it('carimba ruleset 2014 na ficha legada', () => {
    const out = migrateCharacter(fichaV4())
    expect(out.meta.settings.ruleset).toBe('2014')
    expect(out.meta.schemaVersion).toBe(5)
  })
  it('é idempotente: rodar duas vezes não muda o resultado', () => {
    const uma = migrateCharacter(fichaV4())
    const duas = migrateCharacter(uma)
    expect(duas.meta.settings.ruleset).toBe('2014')
    expect(duas.meta.schemaVersion).toBe(5)
  })
  it('não sobrescreve ruleset já declarado', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 4
    doc.meta.settings.ruleset = '2024'
    expect(migrateCharacter(doc).meta.settings.ruleset).toBe('2024')
  })
  it('ficha sem meta.settings ganha settings com ruleset', () => {
    const doc = fichaV4()
    delete doc.meta.settings
    expect(migrateCharacter(doc).meta.settings.ruleset).toBe('2014')
  })
})

describe('validação do ruleset', () => {
  it('aceita 2024', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 5
    doc.meta.settings.ruleset = '2024'
    expect(safeParseCharacter(doc).success).toBe(true)
  })
  it('REPROVA valor desconhecido em vez de cair calado no 2014', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 5
    doc.meta.settings.ruleset = 'xpto'
    expect(safeParseCharacter(doc).success).toBe(false)
  })
  it('rulesetOf continua devolvendo 2014 quando o campo está ausente', () => {
    expect(rulesetOf({ meta: { settings: {} } })).toBe('2014')
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/test/dnd5e/ruleset-schema-migration.test.js --maxWorkers=2
```

Esperado: FAIL — `expected 4 to be 5`.

- [ ] **Step 3: Adicionar o campo ao `settingsSchema`**

Em `src/systems/dnd5e/domain/characterSchema.js`, dentro de `settingsSchema` (depois de `sources`, antes do `})` que fecha o objeto):

```js
  /**
   * Geração de regra da ficha. Ausência = '2014' (ficha legada), resolvido por
   * domain/rulesets.js — NÃO use .default() aqui: o .partial() abaixo embrulha
   * o campo em ZodOptional, que curto-circuita antes do default rodar.
   * Valor desconhecido REPROVA o parse de propósito: cair calado no 2014
   * renderizaria uma ficha 2024 com números errados sem avisar ninguém.
   */
  ruleset: z.enum(['2014', '2024']).optional(),
```

- [ ] **Step 4: Bumpar a versão e registrar no histórico**

Em `characterSchema.js`, no bloco de comentário do histórico (linha ~30), acrescentar antes do `*/`:

```js
 *  - v5 → `meta.settings.ruleset` ('2014' | '2024') identifica a geração de
 *         regra da ficha. Fichas anteriores são carimbadas '2014'.
```

E trocar:

```js
export const SCHEMA_VERSION = 5
```

- [ ] **Step 5: Escrever a migração**

Em `characterSchema.js`, junto das outras funções `migrateVxToVy`:

```js
/**
 * v4 → v5: carimba a geração de regra. Toda ficha existente é 2014 por
 * definição — o 2024 só passa a existir depois desta versão.
 */
function migrateV4ToV5(doc) {
  const settings = doc.meta?.settings ?? {}
  if (settings.ruleset) return doc
  return {
    ...doc,
    meta: { ...(doc.meta ?? {}), settings: { ...settings, ruleset: '2014' } },
  }
}
```

E dentro do laço de `migrateCharacter`, depois da linha `if (v === 3) doc = migrateV3ToV4(doc)`:

```js
      if (v === 4) doc = migrateV4ToV5(doc)
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

```bash
npx vitest run src/test/dnd5e/ruleset-schema-migration.test.js --maxWorkers=2
```

Esperado: PASS, 8 testes.

- [ ] **Step 7: Rodar a suíte de schema existente (não-regressão)**

```bash
npx vitest run src/test/characterSchema.test.js --maxWorkers=2
```

Esperado: PASS. Se algum teste afirmar `SCHEMA_VERSION === 4`, atualize-o para 5 — é o único ajuste legítimo.

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/domain/characterSchema.js src/test/dnd5e/ruleset-schema-migration.test.js
git commit -m "feat(2024): meta.settings.ruleset + schema v5 com migracao"
```

---

## Task 3: Costura 1 — espécie 2024 não concede atributo

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js:235` (`computeRacialBonuses`) e `:261` (`applyRacialChange`)
- Test: `src/test/dnd5e/ruleset-rules-seams.test.js`

**Contexto:** `computeRacialBonuses(raceIndex, subraceIndex, races, opts)` não recebe
`character`. Quem recebe é `applyRacialChange`, que já lê
`character.meta.settings.flexibleRacialAsi`. A geração entra pelo mesmo caminho:
uma opção nova em `opts`, preenchida por `applyRacialChange`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/dnd5e/ruleset-rules-seams.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeRacialBonuses, applyRacialChange } from '../../systems/dnd5e/domain/rules'

const RACAS = [
  { index: 'anao', ability_bonuses: [{ ability: 'CON', bonus: 2 }], subraces: [] },
]

const ficha = (ruleset) => ({
  info: { name: 'X' },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  appliedRacialBonuses: {},
  meta: { settings: ruleset ? { ruleset } : {} },
})

describe('computeRacialBonuses — origem do aumento de atributo', () => {
  it('2014 (padrão): soma os bônus da raça', () => {
    expect(computeRacialBonuses('anao', null, RACAS)).toEqual({ con: 2 })
  })
  it('quando o aumento não vem da raça, devolve vazio', () => {
    expect(computeRacialBonuses('anao', null, RACAS, { abilityBonusFrom: 'background' })).toEqual({})
  })
})

describe('applyRacialChange — respeita a geração da ficha', () => {
  it('ficha 2014 recebe +2 CON do anão', () => {
    const out = applyRacialChange(ficha(), { race: 'anao' }, 'anao', null, RACAS)
    expect(out.attributes.con).toBe(12)
    expect(out.appliedRacialBonuses).toEqual({ con: 2 })
  })
  it('ficha 2024 NÃO recebe atributo da espécie', () => {
    const out = applyRacialChange(ficha('2024'), { race: 'anao' }, 'anao', null, RACAS)
    expect(out.attributes.con).toBe(10)
    expect(out.appliedRacialBonuses).toEqual({})
  })
  it('trocar de espécie numa ficha 2024 não deixa resíduo de atributo', () => {
    const um = applyRacialChange(ficha('2024'), { race: 'anao' }, 'anao', null, RACAS)
    const dois = applyRacialChange(um, { race: null }, null, null, RACAS)
    expect(dois.attributes.con).toBe(10)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/test/dnd5e/ruleset-rules-seams.test.js --maxWorkers=2
```

Esperado: FAIL — `expected { con: 2 } to equal {}`.

- [ ] **Step 3: Implementar a costura**

Em `rules.js`, adicionar o import no topo (junto dos outros imports de `./`):

```js
import { rulesetFor } from './rulesets'
```

Trocar a assinatura e o começo de `computeRacialBonuses` (linha 235):

```js
export function computeRacialBonuses(raceIndex, subraceIndex, races, { flexibleAsi = false, override = null, abilityBonusFrom = 'race' } = {}) {
  // Geração em que a origem do aumento não é a espécie (D&D 2024): o
  // antecedente é quem concede. Ver domain/rulesets.js.
  if (abilityBonusFrom !== 'race') return {}
  if (flexibleAsi && override && Object.keys(override).length) {
```

E em `applyRacialChange` (linha ~265), trocar a chamada:

```js
  const newBonuses = computeRacialBonuses(raceIndex, subraceIndex, races, {
    flexibleAsi,
    override,
    abilityBonusFrom: rulesetFor(character).abilityBonusFrom,
  })
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx vitest run src/test/dnd5e/ruleset-rules-seams.test.js --maxWorkers=2
```

Esperado: PASS, 5 testes.

- [ ] **Step 5: Rodar os testes de regra existentes (não-regressão)**

```bash
npx vitest run src/test/rules-speed.test.js src/test/rules-multiclass-skills.test.js src/test/rules-class-change-hitdice.test.js --maxWorkers=2
```

Esperado: PASS, sem alteração.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/ruleset-rules-seams.test.js
git commit -m "feat(2024): especie nao concede atributo quando a geracao nao manda"
```

---

## Task 4: Costura 2 — antecedente 2024 concede atributo e talento de origem

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js:285` (`applyBackgroundChange`)
- Test: `src/test/dnd5e/ruleset-rules-seams.test.js` (acrescentar)

**Formato do dado:** o antecedente 2024 traz `ability_bonuses` (mesmo formato da
raça 2014: `[{ ability, bonus }]`) e `origin_feat` (índice de talento, string).
O `build_backgrounds.py` da Task 7 produz exatamente isso.

**Invariante:** como em `applyRacialChange`, o reducer reverte o bônus antigo antes
de somar o novo. O campo espelho chama-se `appliedBackgroundBonuses`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `src/test/dnd5e/ruleset-rules-seams.test.js`:

```js
import { applyBackgroundChange } from '../../systems/dnd5e/domain/rules'

const ANTECEDENTES = [
  {
    index: 'acolito', name: 'Acólito',
    skill_proficiencies: [], equipment: '',
    ability_bonuses: [{ ability: 'INT', bonus: 2 }, { ability: 'SAB', bonus: 1 }],
    origin_feat: 'iniciado-em-magia',
  },
  {
    index: 'artesao', name: 'Artesão',
    skill_proficiencies: [], equipment: '',
    ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'DES', bonus: 1 }],
    origin_feat: 'habilidoso',
  },
]

const semEquip = () => ({ items: [], gold: 0 })
const idFake = () => 'id-1'

const fichaBg = (ruleset) => ({
  info: { name: 'X', background: null },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  inventory: { items: [], currency: { gp: 0 } },
  meta: { settings: ruleset ? { ruleset } : {} },
})

describe('applyBackgroundChange — antecedente como origem do aumento', () => {
  it('ficha 2014 ignora ability_bonuses do antecedente', () => {
    const out = applyBackgroundChange(fichaBg(), 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(out.attributes.int).toBe(10)
    expect(out.info.originFeat).toBeUndefined()
  })
  it('ficha 2024 recebe +2 INT / +1 SAB do Acólito', () => {
    const out = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(out.attributes.int).toBe(12)
    expect(out.attributes.wis).toBe(11)
    expect(out.appliedBackgroundBonuses).toEqual({ int: 2, wis: 1 })
  })
  it('ficha 2024 registra o talento de origem concedido', () => {
    const out = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(out.info.originFeat).toBe('iniciado-em-magia')
  })
  it('trocar de antecedente reverte o bônus anterior antes de somar o novo', () => {
    const um = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    const dois = applyBackgroundChange(um, 'artesao', ANTECEDENTES, semEquip, idFake)
    expect(dois.attributes.int).toBe(10)
    expect(dois.attributes.wis).toBe(10)
    expect(dois.attributes.str).toBe(12)
    expect(dois.attributes.dex).toBe(11)
    expect(dois.info.originFeat).toBe('habilidoso')
  })
  it('remover o antecedente numa ficha 2024 zera bônus e talento', () => {
    const um = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    const dois = applyBackgroundChange(um, null, ANTECEDENTES, semEquip, idFake)
    expect(dois.attributes.int).toBe(10)
    expect(dois.appliedBackgroundBonuses).toEqual({})
    expect(dois.info.originFeat).toBe(null)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/test/dnd5e/ruleset-rules-seams.test.js --maxWorkers=2
```

Esperado: FAIL — `expected 10 to be 12`.

- [ ] **Step 3: Implementar a costura**

Em `rules.js`, substituir o corpo de `applyBackgroundChange` (linha 285) por:

```js
export function applyBackgroundChange(character, newBgIndex, backgrounds, parseEquipment, generateId) {
  const bg = backgrounds?.find(b => b.index === newBgIndex)
  const prevBg = backgrounds?.find(b => b.index === character.info.background)

  const bgSkillKeys = (bg?.skill_proficiencies ?? [])
    .map(name => ({ name, key: skillKeyByName(name) }))
    .filter(x => x.key)
    .map(x => x.key)

  const { items: bgItems, gold: bgGold } = parseEquipment(bg?.equipment) ?? { items: [], gold: 0 }
  const { gold: prevBgGold } = parseEquipment(prevBg?.equipment) ?? { gold: 0 }

  const keepItems = (character.inventory?.items ?? []).filter(i => i.source !== 'background')
  const newItems = [
    ...keepItems,
    ...bgItems.map(i => ({ ...i, id: generateId() })),
  ]

  const currentGp = character.inventory?.currency?.gp ?? 0
  const gpWithoutOldBg = Math.max(0, currentGp - prevBgGold)
  const newGp = gpWithoutOldBg + (newBgIndex ? bgGold : 0)

  // D&D 2024: o antecedente é quem concede aumento de atributo e um talento de
  // origem. São DUAS perguntas distintas no descritor, e cada uma tem seu campo
  // — mesmo que no LdJ'24 elas coincidam. Mesma estratégia "diff" de
  // applyRacialChange: reverte o aplicado antes de somar o novo.
  const rs = rulesetFor(character)
  const grantsAbility = rs.abilityBonusFrom === 'background'
  const grantsFeat = rs.backgroundGrantsFeat !== false
  let attrs = character.attributes
  let appliedBg = character.appliedBackgroundBonuses ?? {}
  let originFeat = character.info?.originFeat ?? null

  if (grantsAbility) {
    const next = {}
    for (const b of (bg?.ability_bonuses ?? [])) {
      const key = keyFromName(b.ability) ?? b.ability?.toLowerCase?.()
      if (key && b.bonus) next[key] = (next[key] ?? 0) + b.bonus
    }
    const draft = { ...character.attributes }
    for (const [k, v] of Object.entries(appliedBg)) {
      draft[k] = clampAbility((draft[k] ?? 10) - v)
    }
    for (const [k, v] of Object.entries(next)) {
      draft[k] = clampAbility((draft[k] ?? 10) + v, MAX_ATTRIBUTE_VALUE)
    }
    attrs = draft
    appliedBg = next
  }

  if (grantsFeat) {
    originFeat = bg?.origin_feat ?? null
  }

  return {
    ...character,
    info: {
      ...character.info,
      background: newBgIndex,
      ...(grantsFeat ? { originFeat } : {}),
    },
    attributes: attrs,
    ...(grantsAbility ? { appliedBackgroundBonuses: appliedBg } : {}),
    proficiencies: {
      ...character.proficiencies,
      backgroundSkills: bgSkillKeys,
    },
    inventory: {
      ...character.inventory,
      items: newItems,
      currency: { ...character.inventory.currency, gp: newGp },
    },
  }
}
```

- [ ] **Step 4: Adicionar os campos novos ao schema**

Em `characterSchema.js`, no schema de `info` (junto de `background`), acrescentar:

```js
  /** D&D 2024: talento de origem concedido pelo antecedente. */
  originFeat: z.string().nullable().optional(),
```

E no schema raiz do personagem, junto de `appliedRacialBonuses`:

```js
  /** D&D 2024: espelho dos bônus de atributo já aplicados pelo antecedente. */
  appliedBackgroundBonuses: z.record(z.number()).optional(),
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

```bash
npx vitest run src/test/dnd5e/ruleset-rules-seams.test.js --maxWorkers=2
```

Esperado: PASS, 10 testes.

- [ ] **Step 6: Rodar a suíte de domínio inteira (não-regressão)**

```bash
npx vitest run src/test/ --maxWorkers=2
```

Esperado: PASS. Qualquer falha aqui é regressão real no 2014 — investigar antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/systems/dnd5e/domain/characterSchema.js src/test/dnd5e/ruleset-rules-seams.test.js
git commit -m "feat(2024): antecedente concede atributo e talento de origem"
```

---

# FASE B — Esteira de extração e conteúdo

## Task 5: Esteira `ldj2024` com decodificação de versalete

**Files:**
- Create: `scripts/ldj2024/extract_text.py`, `scripts/ldj2024/README.md`

**PDF:** `C:\Users\gvfar\OneDrive\Área de Trabalho\Conteúdos D&D\D&D 2024\dampd-5e---livro-do-jogador-2024.pdf`
(fora do repo, 397 páginas).

- [ ] **Step 1: Criar o extrator**

Criar `scripts/ldj2024/extract_text.py`:

```python
"""Extrai texto do PDF do Livro do Jogador 2024 como UTF-8 limpo.

DESCOBERTA CRÍTICA (sondagem 2026-08-05): os títulos usam versalete
(MrsEavesOT-Roman) e o pymupdf devolve as MINÚSCULAS na Área de Uso Privado
do Unicode, como `U+F700 + codepoint`. Sem decodificar, "Descrições das
Espécies" vira "D  E" e QUALQUER ancoragem por título falha EM SILÊNCIO.

A camada de texto é digital (não OCR): acentuação íntegra, sem os glifos
corrompidos que o Xanathar exigiu curar à mão.

Uso:
    python scripts/ldj2024/extract_text.py "<pdf>" --pages 182-190 -o out.txt
    python scripts/ldj2024/extract_text.py "<pdf>" --pages 191-202 --titles
"""
import argparse
import fitz  # pymupdf

PUA_LO, PUA_HI = 0xF700, 0xF7FF


def unsmallcaps(s):
    """Reverte versalete: U+F700 + codepoint -> codepoint."""
    return "".join(
        chr(ord(c) - PUA_LO) if PUA_LO <= ord(c) <= PUA_HI else c for c in s
    )


def dehyphenate(s):
    """Junta palavras quebradas por hifen no fim da linha."""
    out = []
    for line in s.split("\n"):
        if out and out[-1].endswith("-") and line[:1].islower():
            out[-1] = out[-1][:-1] + line
        else:
            out.append(line)
    return "\n".join(out)


def extract(pdf_path, pages=None, titles=False, min_size=12.0):
    doc = fitz.open(pdf_path)
    rng = range(len(doc))
    if pages:
        a, b = pages.split("-")
        rng = range(int(a), int(b) + 1)

    chunks = []
    for pno in rng:
        if not (0 <= pno < len(doc)):
            continue
        if titles:
            vistos = set()
            for block in doc[pno].get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    for span in line["spans"]:
                        t = unsmallcaps(span["text"]).strip()
                        # Spans duplicados existem (titulo de capitulo aparece 2x).
                        chave = (round(span["size"], 1), t)
                        if span["size"] >= min_size and t and chave not in vistos:
                            vistos.add(chave)
                            chunks.append(f"p.{pno}\tsize={span['size']:.1f}\t{t}\n")
        else:
            chunks.append(dehyphenate(unsmallcaps(doc[pno].get_text())))
            chunks.append(f"\n\n----- p.{pno} -----\n\n")
    return "".join(chunks)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--pages", default=None, help="intervalo 0-indexado, ex: 182-190")
    ap.add_argument("--titles", action="store_true", help="só títulos, com tamanho de fonte")
    ap.add_argument("--min-size", type=float, default=12.0)
    ap.add_argument("-o", "--out", default=None)
    args = ap.parse_args()
    text = extract(args.pdf, args.pages, args.titles, args.min_size)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
    else:
        import sys
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verificar que a decodificação funciona**

```bash
python scripts/ldj2024/extract_text.py "C:/Users/gvfar/OneDrive/Área de Trabalho/Conteúdos D&D/D&D 2024/dampd-5e---livro-do-jogador-2024.pdf" --pages 191-193 --titles
```

Esperado, entre outras linhas:

```
p.191	size=18.0	Descrições das Espécies
p.191	size=15.0	Aasimar
p.192	size=15.0	Anão
p.193	size=15.0	Draconato
```

Se aparecer `D  E` ou letras soltas, a decodificação não está sendo aplicada — pare e corrija antes de seguir.

- [ ] **Step 3: Escrever o README da esteira**

Criar `scripts/ldj2024/README.md`:

```markdown
# Esteira de extração — Livro do Jogador 2024 (LdJ'24)

Ferramenta descartável pra converter o PDF do LdJ 2024 (fora do repo) em JSON
nos schemas de `public/srd-data/`.

## O PDF

`C:\Users\gvfar\OneDrive\Área de Trabalho\Conteúdos D&D\D&D 2024\dampd-5e---livro-do-jogador-2024.pdf`

- 397 páginas. Camada de texto **digital**, não OCR: acentuação íntegra e sem
  os glifos corrompidos que o Xanathar exigiu curar à mão.
- **Numeração:** `get_toc()` devolve páginas 1-based sobre o índice do pymupdf
  (`toc − 1 = índice`). A numeração impressa é `índice − 5`.

## GOTCHA principal: versalete em Área de Uso Privado

Títulos usam `MrsEavesOT-Roman` em versalete e o pymupdf devolve as minúsculas
como `U+F700 + codepoint`. "Descrições das Espécies" sai como
`D\uf765\uf773...`, que num terminal imprime `D  E`.

**Sem `unsmallcaps()`, toda ancoragem por título falha EM SILÊNCIO** — o script
não acha a seção e produz JSON vazio sem erro.

## Âncora por tamanho de fonte

`--titles` lista os títulos com o tamanho. A hierarquia é limpa, mas **o limiar
varia por seção**:

| Seção | Tamanho do nome da entrada |
|---|---|
| Antecedentes (p.182+) | 18,0 |
| Espécies (p.191+) | 15,0 |
| Talentos (p.205+) | 12,5 |
| Características de classe | 12,5 |

Spans duplicados existem (título de capítulo aparece 2×) — o extrator já dedupa
por `(tamanho, texto)`.

## Mapa de páginas (índice pymupdf)

| Conteúdo | Páginas |
|---|---|
| Mago | 152 |
| Lista de Magias de Mago | 155 |
| Subclasses de Mago | 159 |
| Descrições dos Antecedentes | 182 |
| Descrições das Espécies | 191 |
| Talentos de Origem | 205 |

## Uso

```bash
PDF="/c/Users/gvfar/OneDrive/Área de Trabalho/Conteúdos D&D/D&D 2024/dampd-5e---livro-do-jogador-2024.pdf"

# Mapear títulos de uma seção
python scripts/ldj2024/extract_text.py "$PDF" --pages 182-190 --titles

# Texto corrido já decodificado e sem hifenização de quebra
python scripts/ldj2024/extract_text.py "$PDF" --pages 182-190 -o saida.txt
```

Arquivos de trabalho intermediários NÃO vão pro git.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/ldj2024/
git commit -m "chore(2024): esteira de extracao com decodificacao de versalete"
```

---

## Task 6: Espécies 2024

**Files:**
- Create: `scripts/ldj2024/build_species.py`, `public/srd-data/ldj2024-races-pt.json`

**Schema alvo:** o mesmo de `phb-races-pt.json`. Conferir os campos exatos com:

```bash
python -c "import json;d=json.load(open('public/srd-data/phb-races-pt.json',encoding='utf-8'));print(json.dumps(d[0],ensure_ascii=False,indent=2)[:1500])"
```

**Diferença canônica do 2024:** as dez espécies **não têm `ability_bonuses`**. O
campo deve sair ausente ou `[]` — nunca preenchido.

As dez espécies são: Aasimar, Anão, Draconato, Elfo, Gnomo, Golias, Humano, Orc,
Pequenino, Tiferino.

- [ ] **Step 1: Mapear os limites de cada espécie**

```bash
PDF="/c/Users/gvfar/OneDrive/Área de Trabalho/Conteúdos D&D/D&D 2024/dampd-5e---livro-do-jogador-2024.pdf"
python scripts/ldj2024/extract_text.py "$PDF" --pages 191-202 --titles
```

Anotar a página inicial de cada uma das 10 espécies (spans de `size=15.0`) e dos blocos "Traços de X" (`size=12.5`).

- [ ] **Step 2: Escrever o builder**

Criar `scripts/ldj2024/build_species.py`:

```python
"""Estrutura as 10 especies do LdJ'24 no schema de phb-races-pt.json.

Le o texto ja decodificado da entrada padrao (ou de --pdf) e ancora nos spans
de titulo tamanho 15.0 (nome da especie) e 12.5 ("Tracos de X").

INVARIANTE: especie 2024 NAO tem ability_bonuses. Se o builder produzir esse
campo preenchido, e bug -- o aumento vem do antecedente.
"""
import argparse
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from extract_text import unsmallcaps, dehyphenate  # noqa: E402

import fitz  # noqa: E402

ESPECIES = [
    "Aasimar", "Anão", "Draconato", "Elfo", "Gnomo",
    "Golias", "Humano", "Orc", "Pequenino", "Tiferino",
]

SLUG = str.maketrans("áàâãéêíóôõúüç", "aaaaeeiooouuc")


def slug(nome):
    return nome.lower().translate(SLUG).replace(" ", "-")


def titulos(doc, ini, fim):
    """[(pagina, tamanho, texto)] deduplicado, ja decodificado."""
    out, vistos = [], set()
    for pno in range(ini, fim + 1):
        for block in doc[pno].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    t = unsmallcaps(span["text"]).strip()
                    chave = (pno, round(span["size"], 1), t)
                    if t and span["size"] >= 12.0 and chave not in vistos:
                        vistos.add(chave)
                        out.append((pno, round(span["size"], 1), t))
    return out


def corpo(doc, ini, fim):
    return "\n".join(dehyphenate(unsmallcaps(doc[p].get_text())) for p in range(ini, fim + 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--ini", type=int, default=191)
    ap.add_argument("--fim", type=int, default=202)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    tit = titulos(doc, args.ini, args.fim)

    # Pagina inicial de cada especie: span de 15.0 cujo texto e o nome exato.
    inicio = {}
    for pno, size, txt in tit:
        if size == 15.0 and txt in ESPECIES and txt not in inicio:
            inicio[txt] = pno

    faltando = [e for e in ESPECIES if e not in inicio]
    if faltando:
        sys.stderr.write(f"ATENCAO: nao ancorou {faltando}\n")

    ordenadas = sorted(inicio.items(), key=lambda kv: kv[1])
    saida = []
    for i, (nome, pini) in enumerate(ordenadas):
        pfim = ordenadas[i + 1][1] if i + 1 < len(ordenadas) else args.fim
        texto = corpo(doc, pini, pfim)
        saida.append({
            "index": slug(nome),
            "name": nome,
            "source": "phb2024",
            "speed": 9,          # CURAR: ler "Deslocamento" no bloco de tracos
            "size": "Médio",     # CURAR: ler "Tamanho"
            "traits": [],        # CURAR: quebrar por spans 12.5 "Tracos de X"
            "subraces": [],
            "_raw": texto,       # removido na curadoria
        })

    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(saida, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Gerar o cru e inspecionar**

```bash
PDF="/c/Users/gvfar/OneDrive/Área de Trabalho/Conteúdos D&D/D&D 2024/dampd-5e---livro-do-jogador-2024.pdf"
python scripts/ldj2024/build_species.py "$PDF" > /tmp/especies-cru.json
```

Esperado: sem linha `ATENCAO` no stderr, e 10 entradas na saída. Se alguma espécie não ancorar, ajustar o limiar de tamanho antes de seguir.

- [ ] **Step 4: Curar e gravar o JSON final**

Preencher `speed`, `size` e `traits` a partir de `_raw` de cada entrada, remover `_raw`, e gravar em `public/srd-data/ldj2024-races-pt.json`.

Critério de aceitação: 10 entradas, nenhuma com `ability_bonuses` preenchido, todas com `source: "phb2024"`, `traits` não vazio.

- [ ] **Step 5: Verificar o invariante do arquivo gravado**

```bash
python -c "import json;d=json.load(open('public/srd-data/ldj2024-races-pt.json',encoding='utf-8'));assert len(d)==10,len(d);assert all(not x.get('ability_bonuses') for x in d),'especie com bonus de atributo';assert all(x['source']=='phb2024' for x in d);assert all(x.get('traits') for x in d);print('OK',[x['index'] for x in d])"
```

Esperado: `OK ['aasimar', 'anao', ...]` com 10 índices.

- [ ] **Step 6: Commit**

```bash
git add scripts/ldj2024/build_species.py public/srd-data/ldj2024-races-pt.json
git commit -m "feat(2024): 10 especies do LdJ24 (sem bonus de atributo)"
```

---

## Task 7: Antecedentes 2024

**Files:**
- Create: `scripts/ldj2024/build_backgrounds.py`, `public/srd-data/ldj2024-backgrounds-pt.json`

**Schema alvo:** o de `phb-backgrounds-pt.json`, mais **dois campos novos** que a
Task 4 já consome:

```json
{
  "index": "acolito",
  "name": "Acólito",
  "source": "phb2024",
  "ability_bonuses": [{ "ability": "INT", "bonus": 2 }, { "ability": "SAB", "bonus": 1 }],
  "origin_feat": "iniciado-em-magia",
  "skill_proficiencies": ["Intuição", "Religião"],
  "equipment": "..."
}
```

Nome da entrada ancora em span **tamanho 18,0** nesta seção (diferente das espécies).

- [ ] **Step 1: Mapear os antecedentes**

```bash
PDF="/c/Users/gvfar/OneDrive/Área de Trabalho/Conteúdos D&D/D&D 2024/dampd-5e---livro-do-jogador-2024.pdf"
python scripts/ldj2024/extract_text.py "$PDF" --pages 182-190 --titles --min-size 17
```

Esperado: os nomes dos antecedentes em ordem alfabética, começando por `Acólito`, `Andarilho`, `Artesão`, `Artista`.

- [ ] **Step 2: Escrever o builder**

Criar `scripts/ldj2024/build_backgrounds.py` seguindo a mesma estrutura de `build_species.py`, com estas três diferenças:

```python
# 1) Ancora em 18.0, nao 15.0:
ANCORA = 18.0

# 2) Extrai os valores de atributo da linha "Valores de Atributo:" do corpo.
ABREV = {"Força": "FOR", "Destreza": "DES", "Constituição": "CON",
         "Inteligência": "INT", "Sabedoria": "SAB", "Carisma": "CAR"}

def ability_bonuses(texto):
    """2024: o antecedente lista TRES atributos; a distribuicao (+2/+1 ou
    +1/+1/+1) e escolha do jogador. Gravamos os tres com bonus 0 e a UI
    distribui -- EXCETO quando o livro fixa os valores, ai gravamos o fixo."""
    m = re.search(r"Valores de Atributo[:.]?\s*([^\n]+)", texto)
    if not m:
        return []
    nomes = [n.strip() for n in re.split(r",| e ", m.group(1)) if n.strip() in ABREV]
    return [{"ability": ABREV[n], "bonus": 0} for n in nomes]

# 3) Extrai o talento de origem da linha "Talento:" / "Talento de Origem:".
def origin_feat(texto):
    m = re.search(r"Talento(?: de Origem)?[:.]?\s*([^\n.]+)", texto)
    return slug(m.group(1).strip()) if m else None
```

> **Decisão de modelagem:** o 2024 deixa a distribuição (+2/+1 ou +1/+1/+1) a
> critério do jogador. `bonus: 0` marca "atributo elegível, valor a distribuir".
> A distribuição em si é UI da Task 13 — o reducer da Task 4 soma o que estiver
> gravado, então `bonus: 0` é neutro e seguro até lá.

- [ ] **Step 3: Gerar, curar e gravar**

```bash
python scripts/ldj2024/build_backgrounds.py "$PDF" > /tmp/antecedentes-cru.json
```

Curar e gravar em `public/srd-data/ldj2024-backgrounds-pt.json`.

Critério de aceitação: toda entrada tem exatamente 3 itens em `ability_bonuses` e um `origin_feat` não nulo.

- [ ] **Step 4: Verificar o invariante**

```bash
python -c "import json;d=json.load(open('public/srd-data/ldj2024-backgrounds-pt.json',encoding='utf-8'));assert all(len(x['ability_bonuses'])==3 for x in d),'antecedente sem 3 atributos';assert all(x.get('origin_feat') for x in d),'antecedente sem talento de origem';assert all(x['source']=='phb2024' for x in d);print('OK',len(d),'antecedentes')"
```

- [ ] **Step 5: Commit**

```bash
git add scripts/ldj2024/build_backgrounds.py public/srd-data/ldj2024-backgrounds-pt.json
git commit -m "feat(2024): antecedentes com valores de atributo e talento de origem"
```

---

## Task 8: Talentos de origem 2024

**Files:**
- Create: `scripts/ldj2024/build_origin_feats.py`, `public/srd-data/ldj2024-feats-pt.json`

**Schema alvo:** o de `phb-feats-pt.json`, com um campo novo `category: "origem"`.

Os talentos de origem estão nas páginas 205-206, com nome em span **12,5**. Os
identificados na sondagem: Alerta, Artifista, Atacante Selvagem, Curandeiro,
Habilidoso, Iniciado em Magia, Músico, Sortudo.

- [ ] **Step 1: Mapear**

```bash
python scripts/ldj2024/extract_text.py "$PDF" --pages 205-207 --titles --min-size 12.4
```

Anotar todos os nomes até o span `Talentos Gerais` (p.207), que marca o fim da seção.

- [ ] **Step 2: Escrever o builder**

Criar `scripts/ldj2024/build_origin_feats.py`:

```python
"""Estrutura os talentos de origem do LdJ'24 no schema de phb-feats-pt.json.

Ancora em spans de titulo tamanho 12.5 e para no titulo "Talentos Gerais",
que marca o fim da secao de origem.
"""
import argparse
import json
import sys

import fitz

sys.path.insert(0, __file__.replace("\\", "/").rsplit("/", 1)[0])
from extract_text import unsmallcaps, dehyphenate  # noqa: E402

ANCORA = 12.5
FIM = "Talentos Gerais"
SLUG = str.maketrans("áàâãéêíóôõúüç", "aaaaeeiooouuc")


def slug(nome):
    return nome.lower().translate(SLUG).replace(" ", "-")


def spans(doc, ini, fim):
    """[(pagina, ordem, tamanho, texto)] deduplicado e decodificado."""
    out, vistos = [], set()
    for pno in range(ini, fim + 1):
        ordem = 0
        for block in doc[pno].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    t = unsmallcaps(span["text"]).strip()
                    chave = (pno, round(span["size"], 1), t)
                    if t and chave not in vistos:
                        vistos.add(chave)
                        out.append((pno, ordem, round(span["size"], 1), t))
                        ordem += 1
    return out


def corpo(doc, ini, fim):
    return "\n".join(dehyphenate(unsmallcaps(doc[p].get_text())) for p in range(ini, fim + 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--ini", type=int, default=205)
    ap.add_argument("--fim", type=int, default=207)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    todos = spans(doc, args.ini, args.fim)

    nomes = []
    for pno, _ordem, size, txt in todos:
        if txt == FIM:
            break
        if size == ANCORA and txt not in ("Talentos de Origem",):
            nomes.append((txt, pno))

    if not nomes:
        sys.stderr.write("ATENCAO: nenhum talento ancorou -- confira o tamanho ANCORA\n")

    texto_secao = corpo(doc, args.ini, args.fim)
    saida = []
    for i, (nome, pno) in enumerate(nomes):
        ini = texto_secao.find(nome)
        prox = texto_secao.find(nomes[i + 1][0]) if i + 1 < len(nomes) else len(texto_secao)
        corte = texto_secao.find(FIM)
        if corte != -1:
            prox = min(prox, corte) if prox != -1 else corte
        desc = texto_secao[ini + len(nome):prox].strip() if ini != -1 else ""
        saida.append({
            "index": slug(nome),
            "name": nome,
            "source": "phb2024",
            "category": "origem",
            "description": desc,
            "prerequisite": None,
        })

    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(saida, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Gerar, curar e gravar em `public/srd-data/ldj2024-feats-pt.json`**

Critério de aceitação: todo talento tem `category: "origem"` e `description` não vazia.

- [ ] **Step 4: Verificar o invariante e o cruzamento com os antecedentes**

```bash
python -c "
import json
f=json.load(open('public/srd-data/ldj2024-feats-pt.json',encoding='utf-8'))
b=json.load(open('public/srd-data/ldj2024-backgrounds-pt.json',encoding='utf-8'))
idx={x['index'] for x in f}
assert all(x['category']=='origem' for x in f)
assert all(x.get('description') for x in f)
orfaos=sorted({x['origin_feat'] for x in b}-idx)
assert not orfaos, f'antecedente aponta pra talento inexistente: {orfaos}'
print('OK',len(f),'talentos, nenhum orfao')
"
```

Esperado: `OK N talentos, nenhum orfao`. Se houver órfão, o `slug()` do nome do talento no antecedente não bate com o índice gerado — corrigir o mapeamento antes de seguir.

- [ ] **Step 5: Commit**

```bash
git add scripts/ldj2024/build_origin_feats.py public/srd-data/ldj2024-feats-pt.json
git commit -m "feat(2024): talentos de origem"
```

---

## Task 9: Mago 2024 — classe, progressão, subclasses e magias

**Files:**
- Create: `public/srd-data/ldj2024-classes-pt.json`, `ldj2024-class-progression-pt.json`, `ldj2024-class-choices-pt.json`, `ldj2024-spells-pt.json`

**Schemas alvo:** `phb-classes-pt.json`, `phb-class-progression-pt.json`,
`phb-class-choices-pt.json`, `phb-spells-pt.json`. Inspecionar cada um antes de
gerar:

```bash
python -c "import json;d=json.load(open('public/srd-data/phb-class-choices-pt.json',encoding='utf-8'));print(json.dumps(d.get('mago'),ensure_ascii=False,indent=2)[:2000])"
```

**Fatos confirmados na sondagem:**
- Características do Mago (p.152-154): Nv1 Adepto de Ritual, Nv1 Conjuração, Nv1 Recuperação Arcana, Nv2 Acadêmico, **Nv3 Subclasse de Mago**, Nv4 Aumento no Valor de Atributo, Nv5 Memorizar Magia, Nv18 Maestria de Magias, Nv19 Dádiva Épica, Nv20 Assinatura Mágica.
- Subclasses (p.159+): Abjurador, Adivinhador, Evocador, Ilusionista.
- Lista de magias de Mago: p.155.

- [ ] **Step 1: Extrair as características e a tabela de progressão**

```bash
python scripts/ldj2024/extract_text.py "$PDF" --pages 152-158 -o /tmp/mago.txt
```

- [ ] **Step 2: Montar `ldj2024-classes-pt.json`**

Uma entrada, `index: "mago"`, `source: "phb2024"`, com `hit_die`, `spellcasting_ability: "int"`, proficiências e as características por nível extraídas do passo 1.

- [ ] **Step 3: Montar `ldj2024-class-progression-pt.json`**

Objeto `{ "mago": { ... } }` no mesmo formato do arquivo PHB, com a tabela de espaços de magia por nível.

- [ ] **Step 4: Montar `ldj2024-class-choices-pt.json` — a escolha crítica**

Objeto `{ "mago": { "choices": [ ... ] } }`. A escolha de subclasse **deve estar
no nível 3** (é o que a fatia inteira existe pra provar):

```json
{
  "mago": {
    "choices": [
      {
        "id": "subclasse_mago",
        "level": 3,
        "label": "Subclasse de Mago",
        "options": [
          { "value": "abjurador", "label": "Abjurador", "source": "phb2024" },
          { "value": "adivinhador", "label": "Adivinhador", "source": "phb2024" },
          { "value": "evocador", "label": "Evocador", "source": "phb2024" },
          { "value": "ilusionista", "label": "Ilusionista", "source": "phb2024" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Montar `ldj2024-spells-pt.json`**

Extrair a lista de magias de Mago (p.155) e as descrições correspondentes do capítulo 7 (p.244+). Todas com `source: "phb2024"`.

Esta fatia **não** inclui `spell-mechanics` para as magias 2024 — conjuração interativa das magias novas fica para o sub-projeto 2.

- [ ] **Step 6: Verificar os invariantes**

```bash
python -c "
import json
c=json.load(open('public/srd-data/ldj2024-class-choices-pt.json',encoding='utf-8'))
sub=[x for x in c['mago']['choices'] if x['id']=='subclasse_mago'][0]
assert sub['level']==3, f\"subclasse no nivel {sub['level']}, deveria ser 3\"
assert len(sub['options'])==4
cl=json.load(open('public/srd-data/ldj2024-classes-pt.json',encoding='utf-8'))
assert len(cl)==1 and cl[0]['index']=='mago'
s=json.load(open('public/srd-data/ldj2024-spells-pt.json',encoding='utf-8'))
assert all(x['source']=='phb2024' for x in s)
print('OK: subclasse no nivel 3,',len(s),'magias')
"
```

- [ ] **Step 7: Commit**

```bash
git add public/srd-data/ldj2024-*.json
git commit -m "feat(2024): Mago com subclasse no nivel 3, progressao e magias"
```

---

# FASE C — Camada de dados

## Task 10: `SrdProvider` composto por ruleset

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx:12-60`, `:113`
- Modify: `vite.config.js:110`

- [ ] **Step 1: Registrar os datasets 2024**

Em `SrdProvider.jsx`, dentro de `DATASETS`, acrescentar (não-lazy os quatro do core, lazy os talentos):

```js
  // D&D 2024 (LdJ'24). Partes de composição do ruleset '2024' — nunca expostas
  // como chave de state própria. Ver COMPOSED_BY_RULESET.
  races2024:        { pt: 'ldj2024-races-pt.json',            fallback: null, lazy: false },
  classes2024:      { pt: 'ldj2024-classes-pt.json',          fallback: null, lazy: false },
  backgrounds2024:  { pt: 'ldj2024-backgrounds-pt.json',      fallback: null, lazy: false },
  spells2024:       { pt: 'ldj2024-spells-pt.json',           fallback: null, lazy: false },
  progression2024:  { pt: 'ldj2024-class-progression-pt.json', fallback: null, lazy: false },
  classChoices2024: { pt: 'ldj2024-class-choices-pt.json',    fallback: null, lazy: false },
  feats2024:        { pt: 'ldj2024-feats-pt.json',            fallback: null, lazy: true },
```

- [ ] **Step 2: Trocar `COMPOSED` por `COMPOSED_BY_RULESET`**

Substituir a constante `COMPOSED` (linha ~47) por:

```js
// Datasets lógicos compostos por partes carimbadas por fonte, POR GERAÇÃO.
// A chave lógica (`classes`, `spells`…) é a mesma nas duas gerações — só as
// PARTES mudam. É isso que permite os componentes não saberem que o 2024
// existe. Ver domain/rulesets.js.
const COMPOSED_BY_RULESET = {
  '2014': {
    feats:        { strategy: 'array',  parts: [['feats', 'phb'], ['featsTasha', 'tasha'], ['featsXanathar', 'xanathar']] },
    classes:      { strategy: 'array',  parts: [['classes', 'phb'], ['classesTasha', 'tasha']] },
    spells:       { strategy: 'array',  parts: [['spells', 'phb'], ['spellsTasha', 'tasha'], ['spellsXanathar', 'xanathar']] },
    classChoices: { strategy: 'classChoices', parts: [['classChoices', 'phb'], ['classChoicesTasha', 'tasha'], ['classChoicesXanathar', 'xanathar']] },
    progression:  { strategy: 'object', parts: [['progression', 'phb'], ['progressionTasha', 'tasha']] },
    infusions:    { strategy: 'array',  parts: [['infusionsTasha', 'tasha']] },
    magicItems:   { strategy: 'array',  parts: [['magicItems', 'phb'], ['magicItemsTasha', 'tasha'], ['magicItemsXanathar', 'xanathar']] },
  },
  '2024': {
    races:        { strategy: 'array',  parts: [['races2024', 'phb2024']] },
    classes:      { strategy: 'array',  parts: [['classes2024', 'phb2024']] },
    backgrounds:  { strategy: 'array',  parts: [['backgrounds2024', 'phb2024']] },
    spells:       { strategy: 'array',  parts: [['spells2024', 'phb2024']] },
    feats:        { strategy: 'array',  parts: [['feats2024', 'phb2024']] },
    classChoices: { strategy: 'classChoices', parts: [['classChoices2024', 'phb2024']] },
    progression:  { strategy: 'object', parts: [['progression2024', 'phb2024']] },
    // Itens mágicos e infusões não entram nesta fatia: seguem vazios no 2024.
    infusions:    { strategy: 'array',  parts: [] },
    magicItems:   { strategy: 'array',  parts: [] },
  },
}

const DEFAULT_DATA_RULESET = '2014'
```

- [ ] **Step 3: Fazer `loadComposed` e `loadDataset` respeitarem a geração**

Trocar a assinatura de `loadComposed` e o resolvedor de chave lógica:

```js
function composedDef(ruleset, name) {
  return COMPOSED_BY_RULESET[ruleset]?.[name] ?? null
}

async function loadComposed(ruleset, name) {
  const def = composedDef(ruleset, name)
  if (!def) return null
  const loaded = await Promise.all(
    def.parts.map(async ([key, code]) => [code, await loadDataset(key, DATASETS[key])])
  )
  if (def.strategy === 'array') {
    return loaded.flatMap(([code, data]) => tagSource(Array.isArray(data) ? data : [], code))
  }
  if (def.strategy === 'classChoices') {
    const [primeiro, ...rest] = loaded
    const base = primeiro ? primeiro[1] : {}
    return rest.reduce((acc, [code, data]) => mergeClassChoices(acc, data, code), base ?? {})
  }
  return Object.assign({}, ...loaded.map(([, data]) => (data && typeof data === 'object' && !Array.isArray(data) ? data : {})))
}
```

- [ ] **Step 4: Fazer o provider aceitar a prop `ruleset`**

Substituir a assinatura e o efeito de boot:

```js
export function SrdProvider({ children, ruleset = DEFAULT_DATA_RULESET }) {
  const [data, setData] = useState(() => ({ ...EMPTY_DEFAULTS, ready: false }))
  const rs = COMPOSED_BY_RULESET[ruleset] ? ruleset : DEFAULT_DATA_RULESET

  useEffect(() => {
    let cancelled = false
    setData(prev => (prev.ready ? { ...EMPTY_DEFAULTS, ready: false } : prev))

    Promise.all(
      CORE_LOGICAL.map(async (name) => {
        // Chave lógica composta na geração → monta as partes; senão é dataset
        // comum às duas gerações (ex.: `levels`, que o 2024 não redefine).
        const value = composedDef(rs, name)
          ? await loadComposed(rs, name)
          : await loadDataset(name, DATASETS[name])
        return [name, value]
      })
    ).then(entries => {
      if (cancelled) return
      setData(prev => ({ ...prev, ...Object.fromEntries(entries), ready: true }))
    })

    return () => { cancelled = true }
  }, [rs])

  const requestDataset = useCallback((name) => {
    const carregar = composedDef(rs, name)
      ? loadComposed(rs, name)
      : (DATASETS[name] ? loadDataset(name, DATASETS[name]) : Promise.resolve(null))
    return carregar.then(value => {
      if (value == null) return null
      setData(prev => (prev[name] === value ? prev : { ...prev, [name]: value }))
      return value
    })
  }, [rs])
```

- [ ] **Step 5: Bumpar o cache do Service Worker**

Em `vite.config.js:110`, trocar `cacheName: 'srd-data-v37'` por:

```js
              cacheName: 'srd-data-v38',
```

Sem isso o SW serve o dado antigo e os arquivos `ldj2024-*` nunca chegam ao usuário.

- [ ] **Step 6: Rodar os testes que montam o provider**

```bash
npx vitest run src/test/dnd5e/ --maxWorkers=2
```

Esperado: PASS. O default `'2014'` garante que nada existente muda.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/data/SrdProvider.jsx vite.config.js
git commit -m "feat(2024): SrdProvider compoe catalogo por ruleset (SW v38)"
```

---

## Task 11: Roteamento da geração + teste-guarda de gating

**Files:**
- Modify: `src/systems/dnd5e/core.js`, `src/systems/dnd5e/ui.jsx`, `src/utils/storage.js`, `src/App.jsx`
- Test: `src/test/dnd5e/ruleset-catalog-gating.test.js`

- [ ] **Step 1: Escrever o teste-guarda que falha**

Criar `src/test/dnd5e/ruleset-catalog-gating.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dataVariantOf } from '../../systems/dnd5e/core'

const ler = f => JSON.parse(readFileSync(`public/srd-data/${f}`, 'utf-8'))

describe('dataVariantOf', () => {
  it('ficha legada roteia pro catálogo 2014', () => {
    expect(dataVariantOf({ meta: { settings: {} } })).toBe('2014')
  })
  it('ficha 2024 roteia pro catálogo 2024', () => {
    expect(dataVariantOf({ meta: { settings: { ruleset: '2024' } } })).toBe('2024')
  })
})

describe('gating estrito do catálogo (risco nº 4 da spec)', () => {
  const FONTES_2014 = new Set(['phb', 'tasha', 'xanathar'])
  const ARQUIVOS_2024 = [
    'ldj2024-races-pt.json',
    'ldj2024-backgrounds-pt.json',
    'ldj2024-feats-pt.json',
    'ldj2024-classes-pt.json',
    'ldj2024-spells-pt.json',
  ]

  it('nenhum arquivo 2024 contém item de fonte 2014', () => {
    for (const arq of ARQUIVOS_2024) {
      const itens = ler(arq)
      const intrusos = itens.filter(i => FONTES_2014.has(i.source ?? 'phb'))
      expect({ arq, intrusos: intrusos.map(i => i.index) }).toEqual({ arq, intrusos: [] })
    }
  })

  it('nenhum arquivo 2014 contém item de fonte 2024', () => {
    for (const arq of ['phb-races-pt.json', 'phb-feats-pt.json', 'tasha-feats-pt.json']) {
      const itens = ler(arq)
      expect(itens.filter(i => i.source === 'phb2024')).toEqual([])
    }
  })

  it('espécie 2024 nunca traz aumento de atributo', () => {
    for (const e of ler('ldj2024-races-pt.json')) {
      expect(e.ability_bonuses ?? []).toEqual([])
    }
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/test/dnd5e/ruleset-catalog-gating.test.js --maxWorkers=2
```

Esperado: FAIL — `dataVariantOf is not a function`.

- [ ] **Step 3: Adicionar `dataVariantOf` e o selo ao `core.js`**

Em `src/systems/dnd5e/core.js`, acrescentar o import e as duas mudanças:

```js
import { rulesetOf, RULESETS, DEFAULT_RULESET } from './domain/rulesets'
```

```js
/**
 * Variante de dado que a casca deve montar para esta ficha. String OPACA do
 * ponto de vista da casca: ela repassa pro DataProvider sem saber o que
 * significa. Irmão de `summarize()`.
 */
export function dataVariantOf(character) {
  return rulesetOf(character)
}
```

E no `summarize`, trocar a linha de `badges`:

```js
    badges: [
      ...(info.level != null ? [`Nv ${info.level}`] : []),
      // Só a geração nova se anuncia; o silêncio é o 2014.
      ...(rulesetOf(character) !== DEFAULT_RULESET ? [RULESETS[rulesetOf(character)].id] : []),
    ],
```

- [ ] **Step 4: Repassar a variante pelas superfícies**

Em `src/systems/dnd5e/ui.jsx`, trocar `Wizard` e `Sheet` para aceitar e repassar `variant` (as demais superfícies seguem no default):

```js
export function Wizard({ variant, ...props }) {
  return (
    <SrdProvider ruleset={variant ?? '2014'}>
      <CharacterWizardV2 {...props} />
    </SrdProvider>
  )
}

export function Sheet({ variant, ...props }) {
  return (
    <SrdProvider ruleset={variant ?? '2014'}>
      <RawSheet {...props} />
    </SrdProvider>
  )
}
```

- [ ] **Step 5: Resolver a variante na casca**

Em `src/utils/storage.js`, junto de `getCharacterSystem`:

```js
/**
 * Roteamento de uma ficha: qual sistema monta a tela e qual variante de dado
 * ele deve carregar. UMA consulta, e NUNCA nomeia coluna opcional no select
 * (coluna ausente derruba a query inteira em silêncio).
 */
export async function getCharacterRouting(id) {
  const { data: row } = await supabase.from(TABLE).select('data').eq('id', id).maybeSingle()
  const raw = row?.data ?? null
  const system = raw?.system ?? DEFAULT_SYSTEM
  const core = getSystemCore(system)
  return { system, variant: core?.dataVariantOf?.(raw) ?? null }
}
```

Acrescentar o import de `getSystemCore` no topo de `storage.js` se ainda não houver:

```js
import { getSystemCore } from '../systems'
```

Em `src/App.jsx`, na rota da ficha (~linha 150-170), trocar o estado `system` por um objeto de roteamento:

```js
  const [routing, setRouting] = useState(null)
  useEffect(() => {
    let vivo = true
    getCharacterRouting(id).then(r => { if (vivo) setRouting(r) })
    return () => { vivo = false }
  }, [id])

  if (routing === null) return <Loader />
  const Sheet = getLazySheet(routing.system)
  if (!Sheet) return <Navigate to="/" replace />
```

E no JSX da rota, passar a variante:

```jsx
        <Sheet variant={routing.variant} {...propsExistentes} />
```

Trocar também o import: `getCharacterSystem` → `getCharacterRouting`.

- [ ] **Step 6: Rodar os testes**

```bash
npx vitest run src/test/dnd5e/ruleset-catalog-gating.test.js src/test/auth/App.gating.test.jsx --maxWorkers=2
```

Esperado: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/core.js src/systems/dnd5e/ui.jsx src/utils/storage.js src/App.jsx src/test/dnd5e/ruleset-catalog-gating.test.js
git commit -m "feat(2024): roteamento de variante de dado + selo + guarda de gating"
```

---

# FASE D — UI

## Task 12: Marca de geração no token do mapa

**Files:**
- Modify: `src/components/CharacterList/CharacterToken.jsx:32`

**Contexto:** o token lê `info` direto e **não** passa pelo `summarize()`. Esse
acoplamento da casca com D&D é pré-existente e aqui é aceito, não corrigido. Os
rótulos já truncam ("Nott ”…"), então a marca é **gráfica, nunca texto**.

- [ ] **Step 1: Ler a geração e aplicar a marca**

Em `CharacterToken.jsx`, depois da desestruturação da linha 32:

```js
  const ruleset2024 = character?.meta?.settings?.ruleset === '2024'
```

E no anel do token, acrescentar a classe condicional (o anel é o elemento com as classes de borda do botão):

```js
    className={`... ${ruleset2024 ? 'ring-2 ring-amber-400/70' : ''}`}
```

Acrescentar também ao `ariaLabel`, para não depender de cor:

```js
  const ariaLabel = revealed
    ? [info.name || 'Personagem', info.class, `nível ${lv}`, ruleset2024 ? 'D&D 2024' : null]
        .filter(Boolean).join(', ')
    : (info.name || 'Personagem')
```

- [ ] **Step 2: Verificar no navegador**

Abrir a lista com o preview e confirmar que uma ficha 2024 tem o anel âmbar e a 2014 não. Nenhum rótulo pode ter mudado de largura.

- [ ] **Step 3: Commit**

```bash
git add src/components/CharacterList/CharacterToken.jsx
git commit -m "feat(2024): marca grafica de geracao no token do mapa"
```

---

## Task 13: Escolha da geração no wizard

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx:103`

**Requisito da spec:** a escolha é **explícita e antes de qualquer escolha de
personagem** — o jogador não pode descobrir no meio que está montando na regra
errada. A escolha vive no wizard do D&D, nunca na casca.

- [ ] **Step 1: Ler o `draft` e propagar a geração**

Em `CharacterWizardV2.jsx`, trocar a linha 103:

```js
  const ruleset = draft?.settings?.ruleset ?? '2014'
  const activeSources = sourcesFor({ meta: { settings: draft?.settings ?? {} } })
```

Acrescentar o import:

```js
import { sourcesFor, RULESETS } from '../../domain/rulesets'
```

- [ ] **Step 2: Renderizar o seletor antes dos blocos de personagem**

Acrescentar, no topo do formulário (antes do primeiro bloco de raça/classe):

```jsx
      <fieldset className="ui-card mb-4">
        <legend className="px-2 text-sm ink-italic">Geração de regra</legend>
        <div className="flex gap-2 p-2">
          {Object.values(RULESETS).map(rs => (
            <button
              key={rs.id}
              type="button"
              className={`ui-btn flex-1 ${ruleset === rs.id ? 'ring-2 ring-amber-400' : ''}`}
              aria-pressed={ruleset === rs.id}
              onClick={() => {
                setDraft(d => ({
                  ...d,
                  settings: { ...(d.settings ?? {}), ruleset: rs.id, sources: [rs.sources[0]] },
                }))
                // Remonta o SrdProvider da rota com o catálogo da geração.
                onVariantChange?.(rs.id)
              }}
            >
              {rs.label}
            </button>
          ))}
        </div>
        <p className="px-2 pb-2 text-xs ink-italic">
          Define quais regras e qual catálogo a ficha usa. Não dá pra trocar depois.
        </p>
      </fieldset>
```

- [ ] **Step 3: Passar a variante pro provider da tela do wizard**

Na rota do wizard em `src/App.jsx`, o `Wizard` é montado antes de existir ficha —
a geração começa no default e muda com o clique. Como o `SrdProvider` embrulha o
`Wizard` por fora, o seletor precisa remontar o provider. Trocar a montagem para
que a rota carregue o wizard com a variante escolhida guardada em estado local:

```jsx
  const [variant, setVariant] = useState('2014')
  const Wizard = getLazyWizard(resolved)
  if (!Wizard) return <Navigate to="/" replace />
  return (
    <RouteShell>
      <Wizard variant={variant} onVariantChange={setVariant} {...propsExistentes} />
    </RouteShell>
  )
```

`CharacterWizardV2` recebe `onVariantChange` como prop — o `onClick` do passo 2 já a chama.

> **Por que a variante vive na rota e não só no `draft`:** o `SrdProvider`
> embrulha o `Wizard` **por fora** (`ui.jsx`), então ele não enxerga o `draft`.
> Sem levantar a escolha para a rota, o catálogo não trocaria ao clicar.

- [ ] **Step 4: Verificar o fluxo no navegador**

Criar uma ficha escolhendo **D&D 2024** e confirmar, na ordem:

1. O picker de espécie mostra as 10 espécies 2024 e **nenhuma** raça do PHB 2014.
2. O picker de classe mostra **só** o Mago.
3. Escolher um antecedente **soma atributo** e mostra o talento de origem.
4. Escolher espécie **não** soma atributo.
5. Subir para nível 3 oferece a escolha de subclasse (Abjurador/Adivinhador/Evocador/Ilusionista).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx src/App.jsx
git commit -m "feat(2024): escolha de geracao no wizard, antes das escolhas de personagem"
```

---

# FASE E — Verificação final

## Task 14: Fechamento da fatia

- [ ] **Step 1: Rodar a suíte inteira em fatias**

```bash
npx vitest run src/test/dnd5e/ --maxWorkers=2
```

```bash
npx vitest run src/test/ --maxWorkers=2 --exclude "src/test/dnd5e/**"
```

Esperado: PASS nas duas. **Nenhuma falha nova em relação à master** — comparar com `git stash && npx vitest run ... ` se houver dúvida sobre falha pré-existente.

- [ ] **Step 2: Conferir o critério de pronto da spec**

Marcar cada um, testando no navegador:

- [ ] Criar um Mago 2024 do zero
- [ ] Aumento de atributo veio do antecedente
- [ ] Talento de origem concedido e visível
- [ ] Subclasse aparece no nível 3
- [ ] Catálogo estritamente 2024 nos pickers
- [ ] Ficha abre e rola normalmente
- [ ] **Uma ficha 2014 existente continua idêntica ao que era** (abrir uma ficha antiga e comparar atributos, perícias e características antes/depois)

- [ ] **Step 3: Rodar o lint sem piorar a linha de base**

```bash
npx eslint src --format unix | tail -5
```

Esperado: contagem igual ou menor que a linha de base registrada em `scripts/lint-baseline.json`. O projeto tem ~611 erros pré-existentes; o portão é **não aumentar**.

- [ ] **Step 4: Commit final e merge**

```bash
git add -A
git commit -m "feat(2024): fatia vertical completa do eixo ruleset"
git push
```

Merge na master e push, seguindo o fluxo de deploy automático do projeto.

---

## Fora desta fatia (sub-projetos seguintes)

2. Catálogo completo do LdJ'24 — as outras 11 classes, subclasses, todas as magias, equipamento.
3. Maestria de arma — mexe no motor de ataque, que hoje não tem esse conceito.
4. Condições e descanso revisados — exaustão numérica, Inspiração Heroica, construção de encontro 2024.

Itens conhecidos e deliberadamente adiados:

- `spell-mechanics` das magias 2024 (conjuração interativa) — sub-projeto 2.
- Distribuição +2/+1 vs +1/+1/+1 na UI do antecedente: a Task 7 grava os três atributos com `bonus: 0` e a Task 13 não distribui. A UI de distribuição entra no sub-projeto 2, junto com o resto do catálogo.
- Trava de geração por mesa (o Mestre exigir que a campanha inteira seja 2024).
- Itens mágicos e infusões no 2024 (seguem vazios).
