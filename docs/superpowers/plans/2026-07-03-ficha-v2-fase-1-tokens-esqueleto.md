# Ficha v2 — Fase 1: Tokens + Esqueleto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o esqueleto da ficha em página única (layout Beyond, direção "App moderno" escuro) em `v2/`, atrás do toggle `?sheetV2=1`, embrulhando o conteúdo das abas atuais — sem tocar em nenhuma lógica.

**Architecture:** Componentes novos em `src/systems/dnd5e/components/CharacterSheet/v2/` consomem o `CharacterContext` existente (mesmo provider, mesmos updaters). O `SheetBody` em `CharacterSheet.jsx` escolhe v1/v2 pelo toggle. Tokens de cor em CSS puro escopado em `.sheet-v2`. Spec: `docs/superpowers/specs/2026-07-03-redesign-ficha-pagina-unica-design.md` (este plano cobre a fase interna 1; popovers, fusão da aba Ações, mobile e corte são planos futuros).

**Tech Stack:** React 19, Vite 8, Tailwind 4 (só utilitários de LAYOUT), Vitest + Testing Library, CSS variables.

---

## ⚠️ Regras deste projeto (leia antes de qualquer task)

1. **NUNCA use utilitários de COR do Tailwind dentro do v2** (`bg-*`, `text-*`, `border-*` com cor). O `src/index.css` remapeia as cores do Tailwind pra paleta parchment **com escala invertida** — qualquer cor Tailwind sai errada. Cores no v2 = classes `v2-*` de `tokens.css` ou `style` inline com `var(--v2-*)`. Tailwind é permitido só pra layout: `flex`, `grid`, `gap-*`, `p-*`, `space-y-*`, `min-w-0`, breakpoints `lg:`.
2. **Nenhum arquivo v1 é editado**, exceto `CharacterSheet.jsx` (ponto de entrada do toggle). Componentes v1 são REUSADOS por import.
3. Commits pequenos por task; **sempre `git push` após commit** (preferência do dono do projeto).
4. Rodar testes com `npx vitest run <arquivo>` (rápido) durante a task; suite completa (`npm run test`) só na task final. Flake conhecido: timeouts em `LoginScreen`/`ResetPasswordScreen` na suíte cheia — se falharem, re-rode o arquivo isolado antes de suspeitar do seu código.
5. O visual dos componentes v1 embrulhados (parchment dentro do v2 escuro) vai destoar — **esperado na fase 1**; o re-skin é a fase 3.

## Interfaces do código existente (referência)

- `character.attributes = { str, dex, con, int, wis, cha }` (números)
- `character.combat`: `maxHp, currentHp, tempHp, armorClass, speed, conditions: string[], inspiration: bool, exhaustion: 0-6, attacks: [], classFeatureUses: []`
- `character.proficiencies`: `skills: string[], expertiseSkills: string[], languages: string[]`
- `calc` (de `useCharacterCalculations`): `profBonus, mods, effectiveAttrs, savingThrows (por key str/dex/...), passivePerception, initiative, hpPercent, hpColor, suggestedAC, suggestedMaxHp, featSpeedBonus, fmt(n)`
- `useCharacterContext()` (de `../CharacterContext`): `{ character, setCharacter, calc, classData, races, classes, backgrounds, updaters, handlers, fichaErrors, featureUses, readOnly, onNavigateToSpells, focusSpellId, clearFocusSpell }`
- `SKILLS` (de `src/systems/dnd5e/utils/calculations.js`): `[{ key, name, ability, abbr }]` — 18 itens
- `CONDITIONS_BY_ID` (de `src/systems/dnd5e/domain/conditions.js`)
- `getEffectiveSaveProficiencies(character)`, `effectiveSpeed(character)` (de `src/systems/dnd5e/domain/rules.js`)
- Props dos componentes v1 embrulhados: copie EXATAMENTE de `SheetContent.jsx` (fonte da verdade)

---

### Task 1: Toggle `sheetV2`

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/flag.js`
- Test: `src/test/sheetV2-flag.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/sheetV2-flag.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { isSheetV2Enabled } from '../systems/dnd5e/components/CharacterSheet/v2/flag'

function makeStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  }
}

describe('isSheetV2Enabled', () => {
  let storage
  beforeEach(() => { storage = makeStorage() })

  it('liga com ?sheetV2=1 e persiste no storage', () => {
    expect(isSheetV2Enabled('?sheetV2=1', storage)).toBe(true)
    expect(storage.getItem('sheetV2')).toBe('1')
  })

  it('desliga com ?sheetV2=0 e limpa o storage', () => {
    storage.setItem('sheetV2', '1')
    expect(isSheetV2Enabled('?sheetV2=0', storage)).toBe(false)
    expect(storage.getItem('sheetV2')).toBe(null)
  })

  it('sem query param, lê do storage', () => {
    storage.setItem('sheetV2', '1')
    expect(isSheetV2Enabled('', storage)).toBe(true)
  })

  it('sem query param e sem storage, desligado', () => {
    expect(isSheetV2Enabled('', storage)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-flag.test.js`
Expected: FAIL — `Cannot find module '.../v2/flag'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/components/CharacterSheet/v2/flag.js
/**
 * Toggle temporário do redesign da ficha (spec 2026-07-03).
 * ?sheetV2=1 liga e persiste; ?sheetV2=0 desliga e limpa; sem query, lê o storage.
 * Removido no corte final (plano da fase 5).
 */
export function isSheetV2Enabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  const q = new URLSearchParams(search).get('sheetV2')
  if (q === '1') { storage?.setItem('sheetV2', '1'); return true }
  if (q === '0') { storage?.removeItem('sheetV2'); return false }
  return storage?.getItem('sheetV2') === '1'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-flag.test.js`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/flag.js src/test/sheetV2-flag.test.js
git commit -m "feat(ficha-v2): toggle sheetV2 via query param + localStorage"
git push
```

---

### Task 2: Tokens CSS do design system v2

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/tokens.css`

Sem teste unitário (CSS puro); a validação é o build + o uso nas tasks seguintes.

- [ ] **Step 1: Create tokens.css**

```css
/* Design system da ficha v2 — direção "App moderno" escuro.
   Escopado em .sheet-v2 pra não vazar pro v1/parchment.
   NÃO usar utilitários de cor do Tailwind dentro do v2 (index.css remapeia). */
.sheet-v2 {
  --v2-surface-0: #0f141a;
  --v2-surface-1: #1a222c;
  --v2-surface-2: #24313f;
  --v2-border: #2b3644;
  --v2-border-strong: #3a4756;
  --v2-text-1: #e7edf3;
  --v2-text-2: #8b99a7;
  --v2-text-3: #5c6a78;
  --v2-accent: #4fc7ab; /* fallback; mapa por classe vem na fase 3 */
  --v2-success: #58c98c;
  --v2-warning: #e8b04c;
  --v2-danger: #f0908a;

  background: var(--v2-surface-0);
  color: var(--v2-text-1);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
}

.sheet-v2 .v2-panel {
  background: var(--v2-surface-1);
  border: 1px solid var(--v2-border);
  border-radius: 10px;
  padding: 10px 12px;
}
.sheet-v2 .v2-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--v2-text-2);
  margin-bottom: 6px;
}
.sheet-v2 .v2-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
}
.sheet-v2 .v2-chip {
  background: var(--v2-surface-2);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  white-space: nowrap;
}
.sheet-v2 .v2-btn {
  background: var(--v2-surface-2);
  border: 1px solid var(--v2-border);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--v2-text-1);
  cursor: pointer;
}
.sheet-v2 .v2-btn:hover { border-color: var(--v2-border-strong); }
.sheet-v2 .v2-btn:focus-visible { outline: 2px solid var(--v2-accent); outline-offset: 1px; }
.sheet-v2 .v2-mut { color: var(--v2-text-2); }
.sheet-v2 .v2-acc { color: var(--v2-accent); }
.sheet-v2 .v2-ability {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
}
.sheet-v2 .v2-ability-mod {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
}
.sheet-v2 .v2-tab {
  border: 0;
  background: transparent;
  color: var(--v2-text-2);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.sheet-v2 .v2-tab[aria-selected='true'] {
  background: var(--v2-surface-2);
  color: var(--v2-text-1);
  font-weight: 600;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build verde (o arquivo ainda não é importado; só garante que nada quebrou)

- [ ] **Step 3: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/tokens.css
git commit -m "feat(ficha-v2): tokens CSS do design system escuro"
git push
```

---

### Task 3: Helper de teste com CharacterContext fake

**Files:**
- Create: `src/test/helpers/sheetV2TestContext.jsx`

- [ ] **Step 1: Create the helper**

```jsx
// src/test/helpers/sheetV2TestContext.jsx
// Render helper pros componentes v2 (que consomem useCharacterContext).
import { render } from '@testing-library/react'
import { CharacterProvider } from '../../systems/dnd5e/components/CharacterSheet/CharacterContext'

export function makeCharacter(overrides = {}) {
  return {
    id: 'test-1',
    info: {
      name: 'THOR', race: 'human', subrace: '', class: 'fighter', level: 13,
      background: 'outlander', alignment: 'Neutro', playerName: 'Gabriel', xp: 0,
    },
    attributes: { str: 20, dex: 13, con: 18, int: 18, wis: 9, cha: 8 },
    proficiencies: {
      skills: ['athletics', 'acrobatics', 'arcana', 'investigation'],
      expertiseSkills: ['athletics'],
      languages: ['Comum', 'Anão'],
    },
    combat: {
      maxHp: 131, currentHp: 97, tempHp: 0, armorClass: 11, speed: 9,
      conditions: ['poisoned'], inspiration: true, exhaustion: 2,
      attacks: [], classFeatureUses: [],
    },
    spellcasting: { spells: [], slots: [], usedSlots: [] },
    inventory: { items: [], currency: {} },
    traits: {},
    meta: { settings: { sources: ['phb'] } },
    ...overrides,
  }
}

export function makeCalc(overrides = {}) {
  const mods = { str: 5, dex: 1, con: 4, int: 4, wis: -1, cha: -1 }
  return {
    profBonus: 5,
    mods,
    effectiveAttrs: { str: 20, dex: 13, con: 18, int: 18, wis: 9, cha: 8 },
    savingThrows: { str: 5, dex: 1, con: 9, int: 9, wis: -1, cha: -1 },
    passivePerception: 9,
    initiative: 1,
    hpPercent: 74,
    hpColor: 'green',
    suggestedAC: 11,
    suggestedMaxHp: 131,
    featSpeedBonus: 0,
    fmt: n => (n >= 0 ? `+${n}` : `${n}`),
    ...overrides,
  }
}

const noop = () => {}
const noopBag = new Proxy({}, { get: () => noop })

export function renderWithSheetContext(ui, { character, calc, ...rest } = {}) {
  const value = {
    character: character ?? makeCharacter(),
    setCharacter: noop,
    calc: calc ?? makeCalc(),
    classData: null,
    races: [], classes: [], backgrounds: [],
    updaters: noopBag,
    handlers: noopBag,
    fichaErrors: {},
    featureUses: [],
    readOnly: false,
    onNavigateToSpells: noop,
    focusSpellId: null,
    clearFocusSpell: noop,
    ...rest,
  }
  return render(<CharacterProvider value={value}>{ui}</CharacterProvider>)
}
```

- [ ] **Step 2: Verify it compiles (smoke via vitest)**

Run: `npx vitest run src/test/helpers` (nenhum teste — só não pode dar erro de parse)
Expected: "No test files found" sem erro de sintaxe. A validação real vem na Task 4.

- [ ] **Step 3: Commit e push**

```bash
git add src/test/helpers/sheetV2TestContext.jsx
git commit -m "test(ficha-v2): helper de contexto fake pra componentes v2"
git push
```

---

### Task 4: AbilityStrip (faixa de atributos + CA + INIT/VEL)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx`
- Test: `src/test/sheetV2-AbilityStrip.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-AbilityStrip.test.jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip', () => {
  it('renderiza os 6 atributos com modificador e valor', () => {
    renderWithSheetContext(<AbilityStrip />)
    for (const abbr of ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR']) {
      expect(screen.getByText(abbr)).toBeInTheDocument()
    }
    expect(screen.getByText('+5')).toBeInTheDocument()   // FOR 20
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('renderiza CA e iniciativa', () => {
    renderWithSheetContext(<AbilityStrip />)
    expect(screen.getByText('CA')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('INIT')).toBeInTheDocument()
    // +1 aparece 2x: mod de DES e iniciativa — ambos na faixa
    expect(screen.getAllByText('+1', { selector: '.v2-ability-mod' })).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-AbilityStrip.test.jsx`
Expected: FAIL — módulo `AbilityStrip` não existe

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx
import { useCharacterContext } from '../CharacterContext'
import { effectiveSpeed } from '../../../domain/rules'

const ABILITIES = [
  { key: 'str', abbr: 'FOR' }, { key: 'dex', abbr: 'DES' }, { key: 'con', abbr: 'CON' },
  { key: 'int', abbr: 'INT' }, { key: 'wis', abbr: 'SAB' }, { key: 'cha', abbr: 'CAR' },
]

export function AbilityStrip() {
  const { character, calc } = useCharacterContext()
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {ABILITIES.map(a => (
        <div key={a.key} className="v2-panel v2-ability">
          <span className="v2-title" style={{ margin: 0 }}>{a.abbr}</span>
          <span className="v2-ability-mod">{calc.fmt(calc.mods[a.key])}</span>
          <span className="v2-chip v2-acc">{calc.effectiveAttrs?.[a.key] ?? character.attributes[a.key]}</span>
        </div>
      ))}
      <div className="v2-panel v2-ability" style={{ background: 'var(--v2-surface-2)' }}>
        <span className="v2-title" style={{ margin: 0 }}>CA</span>
        <span className="v2-ability-mod">{character.combat?.armorClass ?? 10}</span>
        <span className="v2-mut" style={{ fontSize: 11 }}>armadura</span>
      </div>
      <div className="v2-panel v2-ability" style={{ background: 'var(--v2-surface-2)' }}>
        <span className="v2-title" style={{ margin: 0 }}>INIT</span>
        <span className="v2-ability-mod">{calc.fmt(calc.initiative)}</span>
        <span className="v2-mut" style={{ fontSize: 11 }}>VEL {effectiveSpeed(character)}m</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-AbilityStrip.test.jsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx src/test/sheetV2-AbilityStrip.test.jsx
git commit -m "feat(ficha-v2): faixa de atributos com CA e iniciativa"
git push
```

---

### Task 5: skillBonus helper + painéis laterais (Salvaguardas, Sentidos, Proficiências)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/skillBonus.js`
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/SidePanels.jsx`
- Test: `src/test/sheetV2-SidePanels.test.jsx`

Nota DRY: o v1 `SkillsList` tem esse cálculo embutido no JSX; extraí-lo violaria a regra "não editar v1". O helper v2 é a versão canônica — o corte final (plano da fase 5) elimina a duplicata junto com o v1.

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-SidePanels.test.jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext, makeCharacter, makeCalc } from './helpers/sheetV2TestContext'
import { skillBonus } from '../systems/dnd5e/components/CharacterSheet/v2/skillBonus'
import { SavesPanel, SensesPanel, ProficienciesPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SidePanels'

describe('skillBonus', () => {
  const character = makeCharacter()
  const calc = makeCalc()
  it('soma proficiência', () => {
    // arcana: INT +4, proficiente (+5) = +9
    expect(skillBonus(character, calc, 'arcana')).toBe(9)
  })
  it('dobra proficiência com expertise', () => {
    // athletics: FOR +5, expertise (+10) = +15
    expect(skillBonus(character, calc, 'athletics')).toBe(15)
  })
  it('sem proficiência retorna só o mod', () => {
    // stealth: DES +1
    expect(skillBonus(character, calc, 'stealth')).toBe(1)
  })
})

describe('SavesPanel', () => {
  it('renderiza as 6 salvaguardas com bônus do calc', () => {
    renderWithSheetContext(<SavesPanel />)
    expect(screen.getByText('Salvaguardas')).toBeInTheDocument()
    expect(screen.getAllByText('+9').length).toBeGreaterThanOrEqual(1) // CON/INT proficientes
    expect(screen.getAllByText('-1').length).toBeGreaterThanOrEqual(1) // SAB/CAR
  })
})

describe('SensesPanel', () => {
  it('renderiza os 3 sentidos passivos', () => {
    renderWithSheetContext(<SensesPanel />)
    expect(screen.getByText('Percepção passiva')).toBeInTheDocument()
    // investigation proficiente: 10 + 4 + 5 = 19
    expect(screen.getByText('19')).toBeInTheDocument()
    // insight sem prof: 10 - 1 = 9 (e percepção passiva do calc = 9)
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(2)
  })
})

describe('ProficienciesPanel', () => {
  it('renderiza idiomas e bônus de proficiência', () => {
    renderWithSheetContext(<ProficienciesPanel />)
    expect(screen.getByText(/Comum, Anão/)).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-SidePanels.test.jsx`
Expected: FAIL — módulos não existem

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/components/CharacterSheet/v2/skillBonus.js
import { SKILLS } from '../../../utils/calculations'

const BY_KEY = Object.fromEntries(SKILLS.map(s => [s.key, s]))

export function skillBonus(character, calc, skillKey) {
  const skill = BY_KEY[skillKey]
  if (!skill) return 0
  const expert = character.proficiencies?.expertiseSkills?.includes(skillKey)
  const prof = character.proficiencies?.skills?.includes(skillKey)
  const profPart = expert ? 2 * calc.profBonus : prof ? calc.profBonus : 0
  return calc.mods[skill.ability] + profPart
}
```

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/SidePanels.jsx
import { useCharacterContext } from '../CharacterContext'
import { getEffectiveSaveProficiencies } from '../../../domain/rules'
import { skillBonus } from './skillBonus'

const SAVE_LABELS = [
  ['str', 'FOR'], ['dex', 'DES'], ['con', 'CON'],
  ['int', 'INT'], ['wis', 'SAB'], ['cha', 'CAR'],
]

export function SavesPanel() {
  const { character, calc } = useCharacterContext()
  const profs = getEffectiveSaveProficiencies(character) ?? []
  return (
    <section className="v2-panel" aria-label="Salvaguardas">
      <h3 className="v2-title">Salvaguardas</h3>
      {SAVE_LABELS.map(([key, label]) => {
        const isProf = profs.includes(key)
        return (
          <div key={key} className="v2-row">
            <span className={isProf ? '' : 'v2-mut'}>
              <span aria-hidden className={isProf ? 'v2-acc' : 'v2-mut'}>{isProf ? '●' : '○'}</span> {label}
            </span>
            <span className={isProf ? 'v2-acc' : ''}>{calc.fmt(calc.savingThrows[key])}</span>
          </div>
        )
      })}
    </section>
  )
}

export function SensesPanel() {
  const { character, calc } = useCharacterContext()
  const senses = [
    ['Percepção passiva', calc.passivePerception],
    ['Investigação passiva', 10 + skillBonus(character, calc, 'investigation')],
    ['Intuição passiva', 10 + skillBonus(character, calc, 'insight')],
  ]
  return (
    <section className="v2-panel" aria-label="Sentidos">
      <h3 className="v2-title">Sentidos</h3>
      {senses.map(([label, value]) => (
        <div key={label} className="v2-row">
          <span className="v2-mut">{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </section>
  )
}

export function ProficienciesPanel() {
  const { character, calc } = useCharacterContext()
  const languages = character.proficiencies?.languages ?? []
  return (
    <section className="v2-panel" aria-label="Proficiências">
      <h3 className="v2-title">Proficiências</h3>
      <div style={{ fontSize: 13 }}>{languages.length ? languages.join(', ') : '—'}</div>
      <div className="v2-row" style={{ marginTop: 6 }}>
        <span className="v2-mut">Bônus de proficiência</span>
        <span className="v2-acc">{calc.fmt(calc.profBonus)}</span>
      </div>
    </section>
  )
}
```

Atenção: confirme em `src/systems/dnd5e/domain/rules.js` (linha ~705) que `getEffectiveSaveProficiencies` retorna array de keys (`['con','int']`). Se retornar outra forma, adapte `profs.includes(key)` — o teste do SavesPanel pega a diferença.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-SidePanels.test.jsx`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/skillBonus.js src/systems/dnd5e/components/CharacterSheet/v2/SidePanels.jsx src/test/sheetV2-SidePanels.test.jsx
git commit -m "feat(ficha-v2): paineis de salvaguardas, sentidos e proficiencias"
git push
```

---

### Task 6: SkillsPanel (lista vertical das 18 perícias)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/SkillsPanel.jsx`
- Test: `src/test/sheetV2-SkillsPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-SkillsPanel.test.jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'
import { SkillsPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsPanel'
import { SKILLS } from '../systems/dnd5e/utils/calculations'

describe('SkillsPanel', () => {
  it('renderiza as 18 perícias', () => {
    renderWithSheetContext(<SkillsPanel />)
    for (const s of SKILLS) {
      expect(screen.getByText(s.name)).toBeInTheDocument()
    }
  })

  it('mostra bônus com proficiência e expertise', () => {
    renderWithSheetContext(<SkillsPanel />)
    expect(screen.getByText('+15')).toBeInTheDocument() // Atletismo expertise
    // +9 aparece 2x: Arcanismo e Investigação (ambos INT +4, prof +5)
    expect(screen.getAllByText('+9').length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-SkillsPanel.test.jsx`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/SkillsPanel.jsx
import { useCharacterContext } from '../CharacterContext'
import { SKILLS } from '../../../utils/calculations'
import { skillBonus } from './skillBonus'

export function SkillsPanel() {
  const { character, calc } = useCharacterContext()
  return (
    <section className="v2-panel" aria-label="Perícias">
      <h3 className="v2-title">Perícias</h3>
      {SKILLS.map(s => {
        const expert = character.proficiencies?.expertiseSkills?.includes(s.key)
        const prof = expert || character.proficiencies?.skills?.includes(s.key)
        return (
          <div key={s.key} className="v2-row">
            <span className={prof ? '' : 'v2-mut'} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span aria-hidden className={prof ? 'v2-acc' : 'v2-mut'}>{expert ? '◆' : prof ? '●' : '○'}</span>{' '}
              {s.name} <span className="v2-mut" style={{ fontSize: 11 }}>{s.abbr}</span>
            </span>
            <span className={prof ? 'v2-acc' : ''}>{calc.fmt(skillBonus(character, calc, s.key))}</span>
          </div>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-SkillsPanel.test.jsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/SkillsPanel.jsx src/test/sheetV2-SkillsPanel.test.jsx
git commit -m "feat(ficha-v2): coluna de pericias em lista vertical"
git push
```

---

### Task 7: HeaderV2 (identidade, PV, condições, descansos, utilitários)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/sheetV2-HeaderV2.test.jsx`

Fase 1: condições/inspiração/exaustão são chips **somente leitura** (popover de edição é o plano da fase 2). Descansos reusam o `RestActions` v1 dentro de um `<details>`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-HeaderV2.test.jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'
import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: true, saveError: null }

describe('HeaderV2', () => {
  it('renderiza nome, PV e barra', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByText('THOR')).toBeInTheDocument()
    expect(screen.getByText('97')).toBeInTheDocument()
    expect(screen.getByText('/ 131')).toBeInTheDocument()
  })

  it('renderiza chips de condições, exaustão e inspiração', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByText('Envenenado')).toBeInTheDocument()
    expect(screen.getByText('Exaustão 2')).toBeInTheDocument()
    expect(screen.getByText('Inspiração')).toBeInTheDocument()
  })

  it('mostra indicador de salvamento', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })
})
```

Nota: o teste de "Envenenado" depende do nome em `CONDITIONS_BY_ID.poisoned.name` — confirme o texto exato em `src/systems/dnd5e/domain/conditions.js` e ajuste o assert se o nome for outro (ex.: "Envenenado(a)").

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-HeaderV2.test.jsx`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx
import { useCharacterContext } from '../CharacterContext'
import { RestActions } from '../RestActions'
import { CONDITIONS_BY_ID } from '../../../domain/conditions'

export function HeaderV2({ onBack, onExport, onPrint, saving, saved, saveError }) {
  const { character, setCharacter, calc, readOnly } = useCharacterContext()
  const { info, combat } = character
  const summary = [
    info.race || null,
    info.class ? `${info.class} N${info.level ?? 1}` : null,
    info.background || null,
  ].filter(Boolean).join(' · ')
  const hpPct = Math.max(0, Math.min(100, calc.hpPercent ?? 0))
  const barColor = hpPct > 50 ? 'var(--v2-success)' : hpPct > 25 ? 'var(--v2-warning)' : 'var(--v2-danger)'
  const conditions = combat?.conditions ?? []

  return (
    <header className="v2-panel" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <button type="button" className="v2-btn" onClick={onBack}>← Personagens</button>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{info.name || 'Sem nome'}</div>
        <div className="v2-mut" style={{ fontSize: 12 }}>{summary}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {combat?.inspiration && (
          <span className="v2-chip" style={{ color: 'var(--v2-warning)' }}>Inspiração</span>
        )}
        {(combat?.exhaustion ?? 0) > 0 && (
          <span className="v2-chip" style={{ color: 'var(--v2-warning)' }}>Exaustão {combat.exhaustion}</span>
        )}
        {conditions.map(id => (
          <span key={id} className="v2-chip" style={{ color: 'var(--v2-danger)' }}>
            {CONDITIONS_BY_ID[id]?.name ?? id}
          </span>
        ))}
      </div>

      <details style={{ position: 'relative' }}>
        <summary className="v2-btn" style={{ listStyle: 'none', cursor: 'pointer' }}>Descansos</summary>
        <div style={{ position: 'absolute', right: 0, zIndex: 40, marginTop: 6, minWidth: 320 }}>
          <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0 }}>
            <RestActions character={character} onApply={setCharacter} />
          </fieldset>
        </div>
      </details>

      <button type="button" className="v2-btn" onClick={onExport}>Exportar</button>
      <button type="button" className="v2-btn" onClick={onPrint}>Imprimir</button>

      <div style={{ textAlign: 'right', minWidth: 130 }}>
        <div className="v2-title" style={{ margin: 0 }}>Pontos de vida</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          {combat?.currentHp ?? 0} <span className="v2-mut" style={{ fontSize: 13 }}>/ {combat?.maxHp ?? 0}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--v2-surface-2)' }}>
          <div style={{ height: 4, borderRadius: 2, width: `${hpPct}%`, background: barColor }} />
        </div>
        <div className="v2-mut" style={{ fontSize: 11, minHeight: 14 }} role="status">
          {saveError ? 'Erro ao salvar' : saving ? 'Salvando…' : saved ? 'Salvo' : ''}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-HeaderV2.test.jsx`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx src/test/sheetV2-HeaderV2.test.jsx
git commit -m "feat(ficha-v2): header com identidade, PV, condicoes e descansos"
git push
```

---

### Task 8: MainBox (quadro principal com 5 abas embrulhando conteúdo v1)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx`
- Test: `src/test/sheetV2-MainBox.test.jsx`

As props dos componentes embrulhados são cópia exata de `SheetContent.jsx` — se algo divergir, `SheetContent.jsx` é a fonte da verdade. A aba Ações desta fase só EMPILHA `Attacks` + `CombatClassActions` + `ManeuversPanel` (a fusão com filtros é o plano da fase 3).

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-MainBox.test.jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'
import { MainBox, MAIN_TABS } from '../systems/dnd5e/components/CharacterSheet/v2/MainBox'

describe('MainBox', () => {
  it('renderiza as 5 abas com Ações ativa por padrão', () => {
    renderWithSheetContext(<MainBox />)
    expect(screen.getAllByRole('tab')).toHaveLength(MAIN_TABS.length)
    expect(screen.getByRole('tab', { name: 'Ações' })).toHaveAttribute('aria-selected', 'true')
  })

  it('troca de aba ao clicar', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<MainBox />)
    await user.click(screen.getByRole('tab', { name: 'Notas' }))
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Ações' })).toHaveAttribute('aria-selected', 'false')
  })

  it('pula pra aba Magias quando focusSpellId chega', () => {
    renderWithSheetContext(<MainBox />, { focusSpellId: 'fireball' })
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-MainBox.test.jsx`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx
import { useEffect, useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useLazySrdDataset } from '../../../data/SrdProvider'
import { Attacks } from '../Attacks'
import { CombatClassActions } from '../CombatClassActions'
import { ManeuversPanel } from '../ManeuversPanel'
import { Spells } from '../Spells'
import { Inventory } from '../Inventory'
import { FeaturesTab } from '../FeaturesTab'
import { Notes } from '../Notes'
import { ArtificerInfusionsPanel } from '../ArtificerInfusionsPanel'
import { artificerLevelOf, pruneOrphanActive, getMaxAttunement } from '../../../domain/artificerInfusions'

export const MAIN_TABS = [
  { id: 'acoes', label: 'Ações' },
  { id: 'magias', label: 'Magias' },
  { id: 'inventario', label: 'Inventário' },
  { id: 'caracteristicas', label: 'Características' },
  { id: 'notas', label: 'Notas' },
]

export function MainBox() {
  const {
    character, setCharacter, calc, classData, backgrounds,
    updaters, featureUses, readOnly, focusSpellId, clearFocusSpell,
  } = useCharacterContext()
  const [tab, setTab] = useState('acoes')

  // onNavigateToSpells (contexto) seta focusSpellId; no v2 é este efeito que
  // leva o usuário até a aba Magias (o activeTab global do v1 não está montado).
  useEffect(() => {
    if (focusSpellId != null) setTab('magias')
  }, [focusSpellId])

  const infusionsCatalog = useLazySrdDataset('infusions')
  const artLevel = artificerLevelOf(character)
  const infusionItems = (character.inventory?.items ?? []).map(i => ({ id: i.id, name: i.name }))
  const storedInfusions = character.combat?.artificerInfusions ?? { known: [], active: [] }
  const infusionsValue = {
    known: storedInfusions.known ?? [],
    active: pruneOrphanActive(storedInfusions.active ?? [], infusionItems.map(i => i.id)),
  }

  const {
    updateTraits, updateCombat,
    updateCurrency, addItem, removeItem, updateItem,
    updateSpellcasting, addSpell, removeSpell, togglePrepared, toggleSlot,
    spendPactSlot, regainPactSlot, setConcentration,
    addAttack, removeAttack, updateAttack,
    setChosenFeature, spendFeatureUse, regainFeatureUse,
    setRageActive, setWildShape, applyDamage, toggleKnownBeast,
    setRangerCompanion, updatePortent,
  } = updaters

  return (
    <section className="v2-panel" style={{ padding: 0 }}>
      <div role="tablist" aria-label="Conteúdo da ficha" style={{ display: 'flex', gap: 2, flexWrap: 'wrap', padding: 8, borderBottom: '1px solid var(--v2-border)' }}>
        {MAIN_TABS.map(t => (
          <button
            key={t.id}
            id={`v2-tab-${t.id}`}
            role="tab"
            type="button"
            className="v2-tab"
            aria-selected={tab === t.id}
            aria-controls={`v2-tabpanel-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <fieldset
        role="tabpanel"
        id={`v2-tabpanel-${tab}`}
        aria-labelledby={`v2-tab-${tab}`}
        disabled={readOnly}
        style={{ border: 0, margin: 0, minWidth: 0, padding: 12 }}
        className={readOnly ? 'opacity-70' : ''}
      >
        {tab === 'acoes' && (
          <div className="space-y-4">
            <Attacks
              attacks={character.combat?.attacks ?? []}
              attributes={character.attributes}
              profBonus={calc.profBonus}
              inventoryItems={character.inventory?.items ?? []}
              onAdd={addAttack}
              onRemove={removeAttack}
              onUpdate={updateAttack}
              onUpdateItem={updateItem}
            />
            <CombatClassActions
              character={character}
              featureUses={featureUses}
              onToggleRage={setRageActive}
              onSpendFeatureUse={id => spendFeatureUse(id, featureUses)}
              onRegainFeatureUse={id => regainFeatureUse(id, featureUses)}
              onToggleSlot={toggleSlot}
              onSetWildShape={setWildShape}
              onApplyDamage={applyDamage}
              onToggleKnownBeast={toggleKnownBeast}
              onSetRangerCompanion={setRangerCompanion}
              onUpdatePortent={updatePortent}
            />
            <ManeuversPanel
              character={character}
              featureUses={featureUses}
              onSpend={id => spendFeatureUse(id, featureUses)}
            />
          </div>
        )}

        {tab === 'magias' && (
          <Spells
            character={character}
            attributes={character.attributes}
            level={character.info.level}
            profBonus={calc.profBonus}
            classData={classData}
            onUpdateSpellcasting={updateSpellcasting}
            onAddSpell={addSpell}
            onRemoveSpell={removeSpell}
            onTogglePrepared={togglePrepared}
            onToggleSlot={toggleSlot}
            onSpendPactSlot={spendPactSlot}
            onRegainPactSlot={regainPactSlot}
            onSetConcentration={setConcentration}
            focusSpellId={focusSpellId}
            onClearFocusSpell={clearFocusSpell}
          />
        )}

        {tab === 'inventario' && (
          <Inventory
            inventory={character.inventory}
            attributes={character.attributes}
            maxAttunement={getMaxAttunement(character)}
            activeSources={character.meta?.settings?.sources ?? ['phb']}
            onUpdateCurrency={updateCurrency}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onAddAttack={addAttack}
            onRemoveAttack={removeAttack}
          />
        )}

        {tab === 'caracteristicas' && (
          <div className="space-y-4">
            <FeaturesTab
              character={character}
              featureUses={featureUses}
              onSpend={id => spendFeatureUse(id, featureUses)}
              onRegain={id => regainFeatureUse(id, featureUses)}
              onSetChosenFeature={setChosenFeature}
            />
            {artLevel >= 2 && (
              <ArtificerInfusionsPanel
                value={infusionsValue}
                catalog={infusionsCatalog ?? []}
                artificerLevel={artLevel}
                activeSources={character.meta?.settings?.sources ?? ['phb']}
                inventoryItems={infusionItems}
                readOnly={readOnly}
                onChange={next => updateCombat('artificerInfusions', next)}
              />
            )}
          </div>
        )}

        {tab === 'notas' && (
          <Notes
            traits={character.traits}
            onUpdate={updateTraits}
            background={backgrounds.find(b => b.index === character.info.background) ?? null}
          />
        )}
      </fieldset>
    </section>
  )
}
```

Nota: `setCharacter` não é usado diretamente aqui — se o lint acusar variável não usada, remova-o do destructuring.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-MainBox.test.jsx`
Expected: PASS (3 testes). Se `Spells`/`Inventory` exigirem providers SRD no mount, o teste da aba padrão (Ações) ainda passa; os testes só montam Ações/Notas/Magias — se a aba Magias quebrar por falta de SrdProvider no teste de focusSpellId, embrulhe o assert num mock leve: o objetivo do teste é o `aria-selected`, não o conteúdo. Alternativa aceita: `vi.mock` dos módulos pesados (`../Spells` etc.) retornando stubs `() => <div />`.

- [ ] **Step 5: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx src/test/sheetV2-MainBox.test.jsx
git commit -m "feat(ficha-v2): quadro principal com 5 abas embrulhando conteudo v1"
git push
```

---

### Task 9: SheetV2 (layout raiz) + wiring do toggle em CharacterSheet.jsx

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx` (função `SheetBody`, retorno a partir da linha ~265)
- Test: `src/test/sheetV2-SheetV2.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-SheetV2.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

// Módulos pesados das abas não interessam ao smoke do esqueleto.
vi.mock('../systems/dnd5e/components/CharacterSheet/Spells', () => ({ Spells: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Inventory', () => ({ Inventory: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/FeaturesTab', () => ({ FeaturesTab: () => <div /> }))

import { SheetV2 } from '../systems/dnd5e/components/CharacterSheet/v2/SheetV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('SheetV2 (esqueleto)', () => {
  it('monta header + faixa + colunas + quadro', () => {
    renderWithSheetContext(<SheetV2 {...props} />)
    expect(screen.getByText('THOR')).toBeInTheDocument()            // header
    expect(screen.getByText('FOR')).toBeInTheDocument()             // faixa
    expect(screen.getByText('Salvaguardas')).toBeInTheDocument()    // col 1
    expect(screen.getByText('Perícias')).toBeInTheDocument()        // col 2
    expect(screen.getAllByRole('tab').length).toBe(5)               // quadro
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-SheetV2.test.jsx`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Write SheetV2**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx
import './tokens.css'
import { HeaderV2 } from './HeaderV2'
import { AbilityStrip } from './AbilityStrip'
import { SavesPanel, SensesPanel, ProficienciesPanel } from './SidePanels'
import { SkillsPanel } from './SkillsPanel'
import { MainBox } from './MainBox'

export function SheetV2({ onBack, onExport, onPrint, saving, saved, saveError }) {
  return (
    <div className="sheet-v2 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 py-4 space-y-3">
        <HeaderV2
          onBack={onBack}
          onExport={onExport}
          onPrint={onPrint}
          saving={saving}
          saved={saved}
          saveError={saveError}
        />
        <AbilityStrip />
        <div className="grid grid-cols-1 lg:grid-cols-[210px_230px_minmax(0,1fr)] gap-3 items-start">
          <div className="space-y-3 min-w-0">
            <SavesPanel />
            <SensesPanel />
            <ProficienciesPanel />
          </div>
          <SkillsPanel />
          <MainBox />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-SheetV2.test.jsx`
Expected: PASS (1 teste)

- [ ] **Step 5: Wire o toggle no SheetBody**

Em `CharacterSheet.jsx`:

1. Adicione os imports no topo:

```jsx
import { SheetV2 } from './v2/SheetV2'
import { isSheetV2Enabled } from './v2/flag'
```

2. Dentro de `SheetBody`, junto dos outros `useState` (após a linha `const [focusSpellId, setFocusSpellId] = useState(null)`):

```jsx
// Toggle temporário do redesign (spec 2026-07-03). Lido uma vez no mount —
// trocar exige reload, o que evita layouts trocando com a ficha suja.
const [sheetV2] = useState(() => isSheetV2Enabled())
```

3. Substitua o retorno do `SheetBody` (o bloco `<CharacterProvider>...</CharacterProvider>` inteiro) por:

```jsx
return (
  <CharacterProvider value={contextValue}>
    {sheetV2 ? (
      <SheetV2
        onBack={onBack}
        onExport={handleExport}
        onPrint={() => setPrintOpen(true)}
        saving={saving}
        saved={saved}
        saveError={saveError}
      />
    ) : (
      <div className="min-h-screen flex flex-col">

        {/* ── Header único (navegação + barra de combate integrada) ── */}
        <div className="sticky top-0 z-30">
          <SheetHeader
            characterName={character.info.name}
            characterId={character?.id ?? null}
            saving={saving}
            saved={saved}
            saveError={saveError}
            onBack={onBack}
            onExport={handleExport}
            onImport={handleImport}
            onImportError={setImportError}
            onPrint={() => setPrintOpen(true)}
            showPrint={true}
            quickStats={quickStats}
            readOnly={readOnly}
            campaignId={character?.campaignId ?? null}
            onMoved={(newCampaignId) => {
              setCharacter(prev => ({ ...prev, campaignId: newCampaignId }))
            }}
          />
        </div>

        {/* ── Corpo: sidebar + conteúdo ────────────────────────── */}
        <div className="flex flex-1">

          {/* Sidebar de navegação (embutida em SheetTabs) */}
          <SheetTabs activeTab={activeTab} onChange={handleTabChange} />

          {/* Área de conteúdo (sem scroll próprio — flui no documento pra permitir print) */}
          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6 space-y-4">

              {importError && (
                <ImportErrorBanner
                  message={importError}
                  onDismiss={() => setImportError(null)}
                />
              )}

              {conflictNotice && (
                <ImportErrorBanner
                  message="Esta ficha foi alterada em outro dispositivo. Recarregamos a versão mais recente — confira sua última edição."
                  onDismiss={() => setConflictNotice(false)}
                />
              )}

              {navBlocked && (
                <NavBlockedBanner
                  onReview={() => focusFirstError(activeTab)}
                  onDismiss={() => setNavBlocked(false)}
                />
              )}

              <SheetContent activeTab={activeTab} />
            </div>
          </main>
        </div>
      </div>
    )}

    {/* Ficha para impressão/PDF — invisível na UI, visível apenas em @media print.
        Fica FORA do condicional: v1 e v2 imprimem igual. */}
    <PrintView
      character={character}
      calc={calc}
      classData={classData}
      backgrounds={backgrounds}
      options={printOptions}
    />

    {/* Confirmação antes de window.print() */}
    <PrintPreviewModal
      open={printOpen}
      onClose={() => setPrintOpen(false)}
      onConfirm={() => {
        setPrintOpen(false)
        // setTimeout pra dar tempo da React reagir ao close + DOM
        // settle antes do print. Sem isso, o modal pode "aparecer"
        // no PDF/print em alguns browsers.
        setTimeout(() => window.print(), 50)
      }}
      characterName={character.info.name}
      isSpellcaster={isSpellcaster}
      options={printOptions}
      onChangeOptions={patch => setPrintOptions(prev => ({ ...prev, ...patch }))}
    />
  </CharacterProvider>
)
```

(É o markup v1 atual movido pro ramo `else`, com `PrintView`/`PrintPreviewModal` içados pra fora do condicional. Nenhuma outra linha do v1 muda.)

- [ ] **Step 6: Verificação manual no navegador**

Run: `npm run dev`
Abra uma ficha existente com `?sheetV2=1` na URL — deve renderizar o layout escuro em página única (header, faixa de atributos, 3 colunas, quadro com abas). Sem o param (após limpar com `?sheetV2=0`), a ficha v1 aparece intacta.

- [ ] **Step 7: Commit e push**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx src/test/sheetV2-SheetV2.test.jsx
git commit -m "feat(ficha-v2): layout raiz de pagina unica atras do toggle sheetV2"
git push
```

---

### Task 10: Verificação final da fase

- [ ] **Step 1: Suite completa**

Run: `npm run test`
Expected: PASS. Se `LoginScreen`/`ResetPasswordScreen` derem timeout (flake conhecido), re-rode isolados: `npx vitest run src/test/LoginScreen.test.jsx`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 3: E2E com toggle desligado**

Run: `npm run test:e2e`
Expected: PASS — os E2E navegam sem `?sheetV2=1`, então exercitam o v1 intacto.

- [ ] **Step 4: Commit final (se houver ajuste) e push**

```bash
git add -A
git commit -m "chore(ficha-v2): fase 1 verificada (testes + build + e2e)"
git push
```

---

## Fora deste plano (planos seguintes, na ordem)

2. **Popovers de edição**: atributos, PV/CA, identidade, perícias, condições interativas, configurações (fontes/multiclasse/talentos), painel de progressão via "▲ Nível", import de JSON no v2.
3. **Re-skin profundo das abas**: fusão Ações (Attacks+CombatClassActions+manobras com filtros Todas/Ação/Bônus/Reação/Limitadas), re-skin de Magias/Inventário/Características/Notas, acento por classe (mapa de cores das 13 classes), banners (importError/conflictNotice) no v2.
4. **Mobile**: bottom nav de 5 itens + barra compacta de topo.
5. **Corte**: E2E no v2, remover toggle + componentes v1 + remapeamento parchment do index.css.
