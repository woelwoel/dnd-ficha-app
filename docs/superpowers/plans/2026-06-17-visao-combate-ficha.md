# Visão de Combate na ficha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar óbvio, na ficha, tudo que o personagem faz/usa em combate — separando combate essencial de situacional e limpando o ruído das demais habilidades.

**Architecture:** Marcação explícita nos JSONs de SRD (`combat: "essencial"|"situacional"` ou `category: "defesa"|"exploracao"|"social"|"magia"`). Um helper puro (`src/domain/featureCategories.js`) traduz essa marcação em baldes e selos de tipo. A `FeaturesTab` consome o helper: aba **Combate** com controle segmentado `[Essencial|Situacional]` e aba **Habilidades** com seções recolhíveis por categoria.

**Tech Stack:** React (JSX), Vitest + @testing-library/react, dados em JSON estático sob `public/srd-data/`.

**Spec:** `docs/superpowers/specs/2026-06-17-visao-combate-ficha-design.md`

---

## File Structure

- **Create** `src/domain/featureCategories.js` — helper puro: detecção de tipo de ação (movida de `FeaturesTab`), resolução de tier de combate, categoria não-combate, selo de tipo, e detector de "Aumento de Atributo".
- **Create** `src/test/featureCategories.test.js` — unitários do helper.
- **Create** `src/test/srd-combat-tags.test.js` — testes-âncora + integridade de schema sobre os dados reais.
- **Modify** `public/srd-data/phb-class-progression-pt.json` — adiciona `combat`/`category`/`actionType` nas features das 12 classes.
- **Modify** `public/srd-data/phb-class-choices-pt.json` — adiciona os mesmos campos nas opções de subclasse.
- **Modify** `src/components/CharacterSheet/FeaturesTab.jsx` — nova estrutura de abas/filtros consumindo o helper.
- **Create** `src/test/FeaturesTab-combat.test.jsx` — testes de UI (providers mockados).
- **Create** `docs/superpowers/notes/2026-06-17-revisao-subclasses-combate.md` — lista de revisão dos cinzentos de subclasse (saída da Task 5).

---

## Task 1: Helper puro de categorização

**Files:**
- Create: `src/domain/featureCategories.js`
- Test: `src/test/featureCategories.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/featureCategories.test.js
import { describe, it, expect } from 'vitest'
import {
  detectActionType, combatTier, featureCategory, actionTypeOf,
  isAttributeIncrease, COMBAT_TIERS, FEATURE_CATEGORIES,
} from '../domain/featureCategories'

describe('featureCategories', () => {
  it('detectActionType reconhece os três tipos pela descrição', () => {
    expect(detectActionType('Como ação bônus, você entra em fúria')).toBe('ação bônus')
    expect(detectActionType('Como reação ao ser acertado')).toBe('reação')
    expect(detectActionType('Como ação, você assume a forma')).toBe('ação')
    expect(detectActionType('Você ganha +1 de CA')).toBe(null)
  })

  it('combatTier devolve só valores válidos, senão null', () => {
    expect(combatTier({ combat: 'essencial' })).toBe('essencial')
    expect(combatTier({ combat: 'situacional' })).toBe('situacional')
    expect(combatTier({ combat: 'xpto' })).toBe(null)
    expect(combatTier({})).toBe(null)
  })

  it('featureCategory cai em "outras" quando ausente/ inválida', () => {
    expect(featureCategory({ category: 'defesa' })).toBe('defesa')
    expect(featureCategory({ category: 'lixo' })).toBe('outras')
    expect(featureCategory({})).toBe('outras')
  })

  it('actionTypeOf: actionType explícito vence; senão heurística; senão "passiva"', () => {
    expect(actionTypeOf({ actionType: 'reação', desc: 'Como ação' })).toBe('reação')
    expect(actionTypeOf({ desc: 'Como ação bônus, ...' })).toBe('ação bônus')
    expect(actionTypeOf({ desc: 'Bônus passivo de dano' })).toBe('passiva')
  })

  it('isAttributeIncrease pega "Aumento de Atributo"', () => {
    expect(isAttributeIncrease({ name: 'Aumento de Atributo' })).toBe(true)
    expect(isAttributeIncrease({ name: 'Ataque Extra' })).toBe(false)
  })

  it('expõe as listas de valores válidos', () => {
    expect(COMBAT_TIERS).toEqual(['essencial', 'situacional'])
    expect(FEATURE_CATEGORIES).toEqual(['defesa', 'exploracao', 'social', 'magia'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/featureCategories.test.js`
Expected: FAIL — `Failed to resolve import '../domain/featureCategories'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/domain/featureCategories.js
/**
 * Classificação de features de classe/raça para a ficha.
 *
 * A fonte da verdade é a marcação nos JSONs de SRD:
 *  - combat:   "essencial" | "situacional"  → feature de combate
 *  - category: "defesa" | "exploracao" | "social" | "magia" → não-combate
 *  - actionType (opcional): força o selo de tipo na visão Combate
 *
 * Este módulo é puro (sem React) para ser testável isoladamente.
 */

export const COMBAT_TIERS = ['essencial', 'situacional']
export const FEATURE_CATEGORIES = ['defesa', 'exploracao', 'social', 'magia']

const ACTION_KEYWORDS = [
  { type: 'reação',     patterns: ['como reação', 'como sua reação', 'usa sua reação', 'usa a reação'] },
  { type: 'ação bônus', patterns: ['ação bônus', 'como ação bônus', 'ação de bônus'] },
  { type: 'ação',       patterns: ['como ação', 'usar a ação', 'use sua ação', 'usar uma ação', 'como uma ação'] },
]

/** Infere o tipo de ação a partir da descrição. Retorna null se nada casar. */
export function detectActionType(desc = '') {
  const lower = desc.toLowerCase()
  for (const { type, patterns } of ACTION_KEYWORDS) {
    if (patterns.some(p => lower.includes(p))) return type
  }
  return null
}

/** 'essencial' | 'situacional' | null */
export function combatTier(feature) {
  return COMBAT_TIERS.includes(feature?.combat) ? feature.combat : null
}

/** 'defesa' | 'exploracao' | 'social' | 'magia' | 'outras' */
export function featureCategory(feature) {
  return FEATURE_CATEGORIES.includes(feature?.category) ? feature.category : 'outras'
}

/** Selo de tipo na visão Combate: 'ação' | 'ação bônus' | 'reação' | 'passiva' */
export function actionTypeOf(feature) {
  if (feature?.actionType) return feature.actionType
  return detectActionType(feature?.desc ?? '') ?? 'passiva'
}

/** "Aumento de Atributo" é tratado no sistema de atributos — some das Habilidades. */
export function isAttributeIncrease(feature) {
  return (feature?.name ?? '').toLowerCase().startsWith('aumento de atributo')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/featureCategories.test.js`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/featureCategories.js src/test/featureCategories.test.js
git commit -m "feat: helper puro de categorização de features (combate/habilidades)"
```

---

## Task 2: Teste de integridade de schema dos dados

Garante que qualquer marcação que adicionarmos use só valores válidos (pega typo tipo `combat: "essencail"`). Roda sobre os dois JSONs reais.

**Files:**
- Create: `src/test/srd-combat-tags.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/srd-combat-tags.test.js
import { describe, it, expect } from 'vitest'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import choices from '../../public/srd-data/phb-class-choices-pt.json'
import { COMBAT_TIERS, FEATURE_CATEGORIES } from '../domain/featureCategories'

const VALID_ACTION_TYPES = ['ação', 'ação bônus', 'reação', 'passiva']

function allBaseFeatures() {
  const out = []
  for (const [cls, data] of Object.entries(progression)) {
    for (const lvl of data.levels ?? []) {
      for (const f of lvl.features ?? []) out.push({ cls, ...f })
    }
  }
  return out
}

function allChoiceOptions() {
  const out = []
  for (const [cls, data] of Object.entries(choices)) {
    for (const ch of data.choices ?? []) {
      for (const o of ch.options ?? []) out.push({ cls, choice: ch.id, ...o })
    }
  }
  return out
}

describe('integridade das marcações de combate', () => {
  it('toda feature/opção usa combat/category/actionType válidos (ou ausentes)', () => {
    const bad = []
    for (const f of [...allBaseFeatures(), ...allChoiceOptions()]) {
      if (f.combat !== undefined && !COMBAT_TIERS.includes(f.combat))
        bad.push(`combat inválido "${f.combat}" em ${f.cls}/${f.name}`)
      if (f.category !== undefined && !FEATURE_CATEGORIES.includes(f.category))
        bad.push(`category inválida "${f.category}" em ${f.cls}/${f.name}`)
      if (f.actionType !== undefined && !VALID_ACTION_TYPES.includes(f.actionType))
        bad.push(`actionType inválido "${f.actionType}" em ${f.cls}/${f.name}`)
      if (f.combat !== undefined && f.category !== undefined)
        bad.push(`combat E category juntos em ${f.cls}/${f.name} (mutuamente exclusivos)`)
    }
    expect(bad).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/test/srd-combat-tags.test.js`
Expected: PASS — os dados ainda não têm marcação, então não há valor inválido. (Este teste é uma rede de segurança que protege as Tasks 3-5.)

- [ ] **Step 3: Commit**

```bash
git add src/test/srd-combat-tags.test.js
git commit -m "test: integridade de schema das marcações de combate"
```

---

## Task 3: Marcar as 12 classes base (test-âncora)

Adiciona `combat`/`category`/`actionType` em cada feature de `phb-class-progression-pt.json`, seguindo o critério e a adjudicação do spec (seção 4). O teste-âncora trava os casos representativos; a marcação completa é feita item a item conforme o critério.

**Critério (do spec):** combate `essencial` = acionado proativamente quase toda luta; `situacional` = condicional/reativo raro/nicho/capstone; `category` = não-combate (defesa, exploração, social, magia). Na dúvida essencial vs situacional → essencial. "Aumento de Atributo" e placeholders de subclasse (`Característica do/da ...`) ficam **sem marcação** (não são combate nem categoria — caem em "Outras"/já tratados).

**Files:**
- Modify: `public/srd-data/phb-class-progression-pt.json`
- Test: `src/test/srd-combat-tags.test.js` (estende)

- [ ] **Step 1: Add the failing anchor test**

Adicione ao final de `src/test/srd-combat-tags.test.js`, dentro de um novo `describe`:

```js
describe('âncoras de classe base', () => {
  const byName = (cls, name) => {
    for (const lvl of progression[cls].levels ?? [])
      for (const f of lvl.features ?? [])
        if (f.name.startsWith(name)) return f
    return null
  }

  const ESSENCIAL = [
    ['barbaro', 'Fúria'], ['barbaro', 'Ataque Extra'], ['barbaro', 'Crítico Brutal'],
    ['barbaro', 'Defesa Desarmada'],
    ['guerreiro', 'Estilo de Combate'], ['guerreiro', 'Ataque Extra'], ['guerreiro', 'Surto de Ação'],
    ['ladino', 'Ataque Furtivo'], ['ladino', 'Esquiva Instintiva'],
    ['paladino', 'Golpe Divino'], ['paladino', 'Ataque Extra'],
    ['monge', 'Artes Marciais'], ['monge', 'Golpe Atordoante'], ['monge', 'Ki'],
  ]
  const SITUACIONAL = [
    ['barbaro', 'Sentido de Perigo'], ['barbaro', 'Fúria Implacável'],
    ['guerreiro', 'Indomável'], ['ladino', 'Sentido Cego'], ['ladino', 'Mente Escorregadia'],
    ['paladino', 'Toque Purificador'], ['monge', 'Tranquilidade Mental'],
  ]
  const NAO_COMBATE = [
    ['barbaro', 'Força Indomável', undefined],
    ['paladino', 'Saúde Divina', 'defesa'], ['paladino', 'Sentido Divino', undefined],
    ['patrulheiro', 'Passo da Terra', 'exploracao'], ['patrulheiro', 'Inimigo Favorito', undefined],
    ['monge', 'Pureza de Corpo', 'defesa'],
  ]

  it.each(ESSENCIAL)('%s/%s é combate essencial', (cls, name) => {
    expect(byName(cls, name)?.combat).toBe('essencial')
  })
  it.each(SITUACIONAL)('%s/%s é combate situacional', (cls, name) => {
    expect(byName(cls, name)?.combat).toBe('situacional')
  })
  it.each(NAO_COMBATE)('%s/%s não é combate (category=%s)', (cls, name, cat) => {
    const f = byName(cls, name)
    expect(f?.combat).toBeUndefined()
    if (cat) expect(f?.category).toBe(cat)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/srd-combat-tags.test.js`
Expected: FAIL — as âncoras ainda não têm `combat`/`category`.

- [ ] **Step 3: Marcar todas as features das 12 classes**

Em `public/srd-data/phb-class-progression-pt.json`, percorra cada `levels[].features[]` das 12 classes e adicione o campo apropriado, aplicando o critério acima e a adjudicação do spec. Trabalhe classe por classe. Exemplos (Bárbaro):

```json
{ "name": "Fúria", "desc": "Como ação bônus, ...", "combat": "essencial" }
{ "name": "Defesa Desarmada", "desc": "...", "combat": "essencial" }
{ "name": "Ataque Descuidado", "desc": "...", "combat": "essencial" }
{ "name": "Sentido de Perigo", "desc": "...", "combat": "situacional" }
{ "name": "Ataque Extra", "desc": "...", "combat": "essencial" }
{ "name": "Movimentação Veloz", "desc": "...", "combat": "situacional" }
{ "name": "Crítico Brutal (1 dado)", "desc": "...", "combat": "essencial" }
{ "name": "Fúria Implacável", "desc": "...", "combat": "situacional" }
{ "name": "Força Indomável", "desc": "...", "category": "social" }
{ "name": "Campeão Primitivo", "desc": "...", "combat": "situacional" }
{ "name": "Caminho Primitivo", "desc": "..." }
{ "name": "Aumento de Atributo", "desc": "..." }
```

Regras de mão:
- Não marque "Aumento de Atributo" nem placeholders "Característica do/da ..." (ficam sem campo).
- Conjuração / "Magias de Domínio" / "Recuperação Arcana" / metas de magia → `category: "magia"`.
- Idiomas, gírias, perícias, rastreio, terreno → `category: "social"` ou `"exploracao"`.
- Imunidades a doença/veneno, resistências passivas fora-de-turno → `category: "defesa"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/srd-combat-tags.test.js`
Expected: PASS (integridade + todas as âncoras).

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/phb-class-progression-pt.json src/test/srd-combat-tags.test.js
git commit -m "feat(dados): marca combate essencial/situacional nas 12 classes base"
```

---

## Task 4: Marcar opções de subclasse + lista de revisão

Mesma marcação em `phb-class-choices-pt.json` (`choices[].options[]`), pelo mesmo critério, e gera a lista de cinzentos de subclasse pro dono revisar.

**Files:**
- Modify: `public/srd-data/phb-class-choices-pt.json`
- Modify: `src/test/srd-combat-tags.test.js` (estende)
- Create: `docs/superpowers/notes/2026-06-17-revisao-subclasses-combate.md`

- [ ] **Step 1: Add the failing anchor test**

Adicione ao final de `src/test/srd-combat-tags.test.js`:

```js
describe('âncoras de subclasse', () => {
  const opt = (cls, choiceId, value) =>
    (choices[cls].choices.find(c => c.id === choiceId)?.options ?? [])
      .find(o => o.value === value) ?? null

  it('Estilo de Combate / Defesa é combate essencial', () => {
    expect(opt('guerreiro', 'fighting_style', 'defesa')?.combat).toBe('essencial')
  })
  it('Estilo de Combate / Arqueiro é combate essencial', () => {
    expect(opt('guerreiro', 'fighting_style', 'arqueiro')?.combat).toBe('essencial')
  })
})
```

(Ajuste `choiceId`/`value` conforme os ids reais do arquivo, conferidos ao abrir o JSON.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/srd-combat-tags.test.js -t subclasse`
Expected: FAIL — opções sem `combat`.

- [ ] **Step 3: Marcar as opções de subclasse**

Percorra `choices[].options[]` de todas as classes e marque pelo mesmo critério (manobras/ataques/buffs de combate → `essencial`/`situacional`; opções de utilidade → `category`). Ao marcar, anote os casos cinzentos em `docs/superpowers/notes/2026-06-17-revisao-subclasses-combate.md` no formato:

```markdown
# Revisão — cinzentos de subclasse (combate)

Decisões que merecem conferência do dono. Formato: classe / escolha / opção — marcação aplicada — porquê.

- guerreiro / fighting_style / protecao — situacional — usa reação, depende de aliado adjacente
- patrulheiro / hunter_prey / colossus_slayer — essencial — dano extra recorrente
- ... (preencher durante a marcação)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/srd-combat-tags.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/phb-class-choices-pt.json src/test/srd-combat-tags.test.js docs/superpowers/notes/2026-06-17-revisao-subclasses-combate.md
git commit -m "feat(dados): marca combate nas opções de subclasse + lista de revisão"
```

---

## Task 5: FeaturesTab — filtros Combate/Habilidades/Recursos consumindo o helper

Renomeia o filtro padrão para **Combate**, importa o helper e remove a `detectActionType` duplicada do arquivo. Esta task troca a fonte da categorização sem ainda mudar o layout interno (segmentado e seções vêm nas Tasks 6-7).

**Files:**
- Modify: `src/components/CharacterSheet/FeaturesTab.jsx`
- Test: `src/test/FeaturesTab-combat.test.jsx`

- [ ] **Step 1: Write the failing UI test**

```jsx
// src/test/FeaturesTab-combat.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeaturesTab } from '../components/CharacterSheet/FeaturesTab'

// Fixture mínima de progressão (Ladino nv 5): âncora Ataque Furtivo + ruído ASI.
const PROGRESSION = {
  ladino: {
    name: 'Ladino',
    levels: [
      { level: 1, features: [
        { name: 'Ataque Furtivo (1d6)', desc: 'Dano extra 1x por turno.', combat: 'essencial' },
        { name: 'Gíria dos Ladrões', desc: 'Idioma secreto.', category: 'social' },
      ] },
      { level: 4, features: [
        { name: 'Aumento de Atributo', desc: 'Suba atributos.' },
      ] },
      { level: 5, features: [
        { name: 'Esquiva Instintiva', desc: 'Como reação, reduz dano pela metade.', combat: 'essencial' },
        { name: 'Sentido Cego', desc: 'Percebe invisíveis a 3m.', combat: 'situacional' },
      ] },
    ],
  },
}

vi.mock('../providers/SrdProvider', () => ({
  useSrd: () => ({ progression: PROGRESSION, races: [], classChoices: {} }),
  useLazySrdDataset: () => [],
}))

const character = { info: { class: 'ladino', level: 5, race: '', multiclasses: [], feats: [], chosenFeatures: {} } }

describe('FeaturesTab — aba Combate', () => {
  it('abre na aba Combate por padrão e mostra a feature essencial', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    expect(screen.getByRole('button', { name: /Combate/i })).toBeInTheDocument()
    expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx`
Expected: FAIL — não existe filtro "Combate" (hoje é "Ações") e o default é `'acoes'`.

- [ ] **Step 3: Implementar a troca de filtros + consumo do helper**

Em `src/components/CharacterSheet/FeaturesTab.jsx`:

1. No topo, troque a definição local de `ACTION_KEYWORDS`/`detectActionType` por import:

```jsx
import {
  detectActionType, combatTier, featureCategory, actionTypeOf, isAttributeIncrease,
} from '../../domain/featureCategories'
```

Remova o bloco `const ACTION_KEYWORDS = [...]` e a função `detectActionType` locais (linhas ~12-24).

2. Troque a constante `FILTERS` e o estado inicial:

```jsx
const FILTERS = [
  { id: 'combate',     label: 'Combate',     icon: <Icon name="sword" size={12} strokeWidth={1.75} /> },
  { id: 'habilidades', label: 'Habilidades', icon: <Icon name="book" size={12} strokeWidth={1.75} /> },
  { id: 'recursos',    label: 'Recursos',    icon: <Icon name="target" size={12} strokeWidth={1.75} /> },
]
```

```jsx
const [activeFilter, setActiveFilter] = useState('combate')
```

3. **Unifique a fonte.** Hoje o `useMemo` monta duas listas paralelas: features resolvidas (`classFeatures`/`multiFeatures`, com nome/desc já resolvidos da escolha) e features cruas (`allClassFeatures`, usadas pras ações). Para que `combat`/`category` cheguem aos dois lados, **enriqueça as features resolvidas** copiando os campos do dado bruto. Onde hoje cada feature resolvida é montada (ex.: o `.map` dentro de `classFeatures`), adicione:

```jsx
// f = feature crua de lvl.features (carrega combat/category/actionType do JSON)
return {
  id: `${classIndex}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
  name:   chosen ? `${f.name}: ${chosen.name}` : f.name,
  desc:   chosen ? chosen.desc : f.desc,
  source: classData?.name ?? classIndex,
  level:  lvl.level,
  combat:     f.combat,      // ← propaga a marcação
  category:   f.category,    // ←
  actionType: f.actionType,  // ←
}
```

Faça o mesmo no `.map` de `multiFeatures` e nas `subChoiceFeatures`.

4. **Derive os dois baldes de uma única lista enriquecida.** No retorno do `useMemo`, em vez de `classActions/classBonusActions/...`, exponha:

```jsx
const enriched = [...classFeaturesAll, ...multiFeatures]   // features resolvidas+enriquecidas
const combatFeatures = enriched
  .filter(f => combatTier(f) !== null)
  .map(f => ({ ...f, tier: combatTier(f), type: actionTypeOf(f) }))
const nonCombatFeatures = enriched.filter(f => combatTier(f) === null)
return { combatFeatures, nonCombatFeatures, raceFeatures, featFeatures }
```

(Remova as antigas `classActions/classBonusActions/classReactions/raceActions` e a função `toAction`; a `raceWithType` heurística sai — raça volta a aparecer só em Habilidades/Traços Raciais, como já era.)

5. Atualize o bloco de filtros renderizado: troque `activeFilter === 'acoes'` por `'combate'` e renderize, por enquanto, todas as `combatFeatures` numa lista única com o `ActionCard` existente (agrupamento fino vem na Task 6). Ajuste as vistas `'habilidades'`/`'recursos'` pra continuarem funcionando com `nonCombatFeatures`.

6. Atualize a contagem do chip `'combate'` para `combatFeatures.length` e a de `'habilidades'` para `nonCombatFeatures.length + raceFeatures.length + featFeatures.length`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet/FeaturesTab.jsx src/test/FeaturesTab-combat.test.jsx
git commit -m "feat(ficha): aba Combate como padrão, consumindo helper de categorização"
```

---

## Task 6: Controle segmentado [Essencial | Situacional] na aba Combate

**Files:**
- Modify: `src/components/CharacterSheet/FeaturesTab.jsx`
- Test: `src/test/FeaturesTab-combat.test.jsx` (estende)

- [ ] **Step 1: Add the failing test**

Adicione ao `describe` de Combate:

```jsx
import userEvent from '@testing-library/user-event'

it('segmenta essencial vs situacional', async () => {
  const user = userEvent.setup()
  render(<FeaturesTab character={character} featureUses={[]} />)
  // Essencial (padrão): Ataque Furtivo visível, Sentido Cego não
  expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
  expect(screen.queryByText(/Sentido Cego/i)).not.toBeInTheDocument()
  // Trocar pro segmento Situacional
  await user.click(screen.getByRole('button', { name: /Situacional/i }))
  expect(screen.getByText(/Sentido Cego/i)).toBeInTheDocument()
  expect(screen.queryByText(/Ataque Furtivo/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx -t segmenta`
Expected: FAIL — não há controle segmentado; tudo aparece junto.

- [ ] **Step 3: Implementar o segmentado**

Em `FeaturesTab.jsx`:

1. Novo estado: `const [combatTierView, setCombatTierView] = useState('essencial')`.
2. Na vista `'combate'`, antes dos cards, renderize o controle segmentado:

```jsx
<div className="inline-flex rounded-lg border border-gray-700 overflow-hidden mb-4">
  {[['essencial', 'Essencial'], ['situacional', 'Situacional']].map(([id, label]) => (
    <button
      key={id}
      onClick={() => setCombatTierView(id)}
      className={[
        'px-4 py-1.5 text-sm font-medium transition-colors',
        combatTierView === id
          ? 'bg-blue-700/50 text-blue-200'
          : 'bg-gray-800/60 text-gray-400 hover:text-gray-200',
      ].join(' ')}
    >{label}</button>
  ))}
</div>
```

3. Filtre os cards pelo tier ativo e agrupe por tipo de ação (Ações/Bônus/Reações/Passivas) reusando `ActionGroup`:

```jsx
const tierFeatures = combatFeatures.filter(f => f.tier === combatTierView)
const byType = t => tierFeatures.filter(f => f.type === t)
// Render: ActionGroup "Ações" byType('ação'); "Ações Bônus" byType('ação bônus');
//         "Reações" byType('reação'); "Passivas" byType('passiva').
```

Mostre um empty-state por segmento quando `tierFeatures.length === 0` (ex.: "Nenhuma habilidade situacional neste nível.").

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet/FeaturesTab.jsx src/test/FeaturesTab-combat.test.jsx
git commit -m "feat(ficha): controle segmentado Essencial/Situacional na aba Combate"
```

---

## Task 7: Habilidades em seções por categoria + de-ruído de ASI

**Files:**
- Modify: `src/components/CharacterSheet/FeaturesTab.jsx`
- Test: `src/test/FeaturesTab-combat.test.jsx` (estende)

- [ ] **Step 1: Add the failing test**

```jsx
describe('FeaturesTab — aba Habilidades', () => {
  it('agrupa não-combate por categoria e esconde Aumento de Atributo', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)
    await user.click(screen.getByRole('button', { name: /Habilidades/i }))
    // Gíria dos Ladrões (social) aparece
    expect(screen.getByText(/Gíria dos Ladrões/i)).toBeInTheDocument()
    // Cabeçalho de seção Social & Conhecimento
    expect(screen.getByText(/Social & Conhecimento/i)).toBeInTheDocument()
    // ASI não aparece
    expect(screen.queryByText(/^Aumento de Atributo$/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx -t Habilidades`
Expected: FAIL — sem seções por categoria; ASI ainda aparece.

- [ ] **Step 3: Implementar seções + de-ruído**

Em `FeaturesTab.jsx`:

1. No `useMemo`, monte as features não-combate agrupadas por categoria, **excluindo** ASI:

```jsx
const CATEGORY_SECTIONS = [
  ['defesa',     'Defesas & Resistências'],
  ['exploracao', 'Exploração & Viagem'],
  ['social',     'Social & Conhecimento'],
  ['magia',      'Magia & Recursos'],
  ['outras',     'Outras Características'],
]

const nonCombatByCategory = {}
for (const f of nonCombatFeatures) {               // vindo do useMemo (combatTier === null)
  if (isAttributeIncrease(f)) continue
  const cat = featureCategory(f)
  ;(nonCombatByCategory[cat] ??= []).push(f)
}
```

(`nonCombatFeatures` é a lista já exposta pelo `useMemo` na Task 5. Reaproveite o `FeatureGroup` existente para cada seção; ele já é recolhível.)

2. Na vista `'habilidades'`, renderize uma `FeatureGroup` por entrada de `CATEGORY_SECTIONS` que tenha features, usando o label como título. Mantenha Traços Raciais e Talentos como grupos próprios (heurística atual segue valendo pra raça/talento — fora do escopo de marcação).

3. Garanta que ASI sumiu de todas as listas de Habilidades (o `continue` acima).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet/FeaturesTab.jsx src/test/FeaturesTab-combat.test.jsx
git commit -m "feat(ficha): Habilidades em seções por categoria, sem ruído de ASI"
```

---

## Task 8: Suíte completa + ajuste de testes existentes

**Files:**
- Possible modify: testes que dependiam do filtro "Ações" antigo.

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: investigar qualquer falha. Suspeitos: testes que procuram o texto/aria "Ações" no FeaturesTab.

- [ ] **Step 2: Corrigir testes legados**

Para cada falha por causa do rename "Ações"→"Combate" ou da nova estrutura, ajuste a asserção do teste para o novo rótulo/fluxo (sem afrouxar o que ele garantia). Mostre o diff mínimo por teste.

- [ ] **Step 3: Rodar de novo até verde**

Run: `npx vitest run`
Expected: PASS (suíte inteira).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: ajusta testes legados à nova aba Combate"
```

---

## Verificação final (manual)

- [ ] `npx vitest run` — tudo verde.
- [ ] Rodar a app, abrir ficha de Bárbaro nv 9: aba Combate abre em Essencial mostrando Fúria/Ataque Extra/Crítico Brutal; Situacional mostra Sentido de Perigo/Fúria Implacável; Habilidades sem "Aumento de Atributo".
- [ ] Abrir ficha de Ladino: Ataque Furtivo aparece em Combate/Essencial.
- [ ] Entregar `docs/superpowers/notes/2026-06-17-revisao-subclasses-combate.md` pro dono revisar os cinzentos de subclasse.
