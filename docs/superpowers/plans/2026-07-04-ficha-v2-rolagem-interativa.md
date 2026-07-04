# Ficha v2 — Rolagem interativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perícias, salvaguardas, testes de atributo, iniciativa e ataques nativos da ficha v2 clicáveis para rolar no dice roller 2D existente (estilo D&D Beyond).

**Architecture:** A interação do `RollButton` (click/Shift/Alt/long-press → `roll` + `openPanel`) é extraída para o hook headless `useRollInteraction` (fonte única do gesto); o `RollButton` passa a consumi-lo sem mudança de comportamento. No v2, o primitivo `RollableRow` (um `<button>` com layout de `v2-row`) e um card de atributo com DOIS botões irmãos (rolar + ✎ editar — nunca aninhados) usam o mesmo hook. Spec: `docs/superpowers/specs/2026-07-04-ficha-v2-rolagem-interativa-design.md`.

**Tech Stack:** React 19, Vitest + Testing Library, Playwright (gate axe), tokens CSS v2.

---

## ⚠️ Regras deste projeto

1. **NUNCA use utilitários de COR do Tailwind no v2** — cores via classes `v2-*`/`var(--v2-*)` (index.css remapeia paletas pro tema parchment). Utilitários de LAYOUT são permitidos.
2. Único arquivo v1 tocado: `RollButton.jsx` (refactor interno; API e comportamento idênticos, provados pelos testes existentes).
3. Commits pequenos com trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; push é do controlador.
4. jsdom não tem timers de long-press confiáveis em teste — os testes cobrem click normal (e os existentes do RollButton já cobrem o resto do gesto).

## Interfaces verificadas (2026-07-04)

- `useDiceRoller()` → `{ roll(notation, label, opts), openPanel, ... }`; contexto criado em `src/hooks/useDiceRoller.js` (`DiceRollerContext`), provider real em `src/context/DiceRollerContext.jsx` (value: `{ history, open, mode, roll, clearHistory, togglePanel, openPanel, setMode }`).
- `RollButton` atual: `src/components/DiceRoller/RollButton.jsx` (gesto completo inline — será extraído).
- `AttackRollButton` (v1): props `attackNotation, damageNotation, weaponName, disabled, onAfterRoll, size` — fluxo ataque→crítico→dano. Já re-tematizado pela ponte CSS.
- `findAmmoForAttack(atk, inventoryItems)` em `src/systems/dnd5e/utils/weaponI18n.js`.
- Labels v1 (paridade): perícia = nome ("Atletismo"); salvaguarda = `Salvaguarda — {ABBR}`; iniciativa = `Iniciativa`; dano avulso = `Dano avulso · {arma}`. Teste de atributo NÃO existe no v1 — label novo: `Teste de {Nome}`.
- Testes existentes que provam o RollButton: `src/test/integration/dice.test.jsx`, `src/test/AttackRollButton.test.jsx`.
- GOTCHA global: `@media (pointer: coarse)` no index.css força `min-height: 36px` em buttons — as linhas roláveis ficam mais altas no touch. É desejado (alvo de toque), não é bug.

---

### Task 1: Hook `useRollInteraction` + refactor do RollButton

**Files:**
- Create: `src/hooks/useRollInteraction.js`
- Modify: `src/components/DiceRoller/RollButton.jsx`
- Test (existentes, são o harness): `src/test/integration/dice.test.jsx`, `src/test/AttackRollButton.test.jsx`

- [ ] **Step 1: Baseline.** Rode `npx vitest run src/test/integration/dice.test.jsx src/test/AttackRollButton.test.jsx` → PASS (anote a contagem; ela não pode mudar).

- [ ] **Step 2: Crie o hook** — o corpo é o do RollButton atual, extraído VERBATIM:

```js
// src/hooks/useRollInteraction.js
import { useRef, useState, useEffect } from 'react'
import { useDiceRoller } from './useDiceRoller'

const LONG_PRESS_MS = 500

/**
 * Interação de rolagem compartilhada (fonte única do gesto):
 *   - Click            → rolagem normal
 *   - Shift+Click      → vantagem · Alt+Click → desvantagem
 *   - Long-press ≥500ms→ vantagem (mobile; vibra se suportado)
 * Extraída do RollButton pra qualquer elemento (linha, card) virar gatilho.
 * Retorna { handlers, longPressActive, title } — espalhe `handlers` no elemento.
 */
export function useRollInteraction({ notation, label, crit = false, onAfterRoll }) {
  const { roll, openPanel } = useDiceRoller()
  const timerRef = useRef(null)
  const longPressedRef = useRef(false)
  const [longPressActive, setLongPressActive] = useState(false)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  function startLongPressTimer() {
    longPressedRef.current = false
    setLongPressActive(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      setLongPressActive(true)
      try { navigator.vibrate?.(40) } catch { /* ignore */ }
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startLongPressTimer()
  }

  function handlePointerEnd() {
    cancelLongPress()
    setTimeout(() => setLongPressActive(false), 100)
  }

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()
    const opts = { crit }
    if (longPressedRef.current) opts.mode = 'adv'
    else if (e.shiftKey) opts.mode = 'adv'
    else if (e.altKey) opts.mode = 'dis'
    roll(notation, label, opts)
    openPanel()
    onAfterRoll?.()
    longPressedRef.current = false
  }

  const baseTitle = `Rolar ${notation}${label ? ` — ${label}` : ''}`
  const title = crit
    ? `${baseTitle} (dado dobrado — crítico)`
    : `${baseTitle} · Shift+click: vantagem · Alt+click: desvantagem · segurar: vantagem`

  return {
    longPressActive,
    title,
    handlers: {
      onClick: handleClick,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerEnd,
      onPointerLeave: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onContextMenu: e => e.preventDefault(),
    },
  }
}
```

- [ ] **Step 3: Refatore o RollButton** para consumir o hook (mesma UI, mesmos classNames, mesma API — `onAfterRoll` NÃO vira prop do RollButton, YAGNI):

```jsx
// src/components/DiceRoller/RollButton.jsx (arquivo inteiro)
import { useRollInteraction } from '../../hooks/useRollInteraction'
import { Icon } from '../ui/Icon'

/**
 * Botão compacto pra disparar uma rolagem e abrir o painel de histórico.
 * Gesto (click/Shift/Alt/long-press) vive em useRollInteraction — fonte única.
 *
 * Props:
 *  - notation: string  — ex: "1d20+3", "2d6+5"
 *  - label:    string  — nome exibido no histórico (ex: "Atletismo")
 *  - size:     'xs'|'sm' — tamanho do ícone (default 'sm')
 *  - className: string — classes extras
 *  - icon:     string | ReactNode — sobrescreve o glifo padrão (raro)
 */
export function RollButton({ notation, label, size = 'sm', className = '', crit = false, icon }) {
  const { handlers, longPressActive, title } = useRollInteraction({ notation, label, crit })
  return (
    <button
      {...handlers}
      title={title}
      aria-label={`Rolar ${label || notation}`}
      className={[
        'inline-flex items-center justify-center active:scale-95',
        'transition-all select-none leading-none touch-none',
        crit ? 'text-amber-700 hover:text-amber-900' : 'text-gilt-500 hover:text-ink-500',
        size === 'xs' ? 'text-[13px]' : 'text-sm',
        longPressActive ? 'scale-125 !text-emerald-700' : '',
        className,
      ].join(' ')}
    >
      {icon ?? <Icon name="dice" size={size === 'xs' ? 14 : 16} />}
    </button>
  )
}
```

- [ ] **Step 4:** `npx vitest run src/test/integration/dice.test.jsx src/test/AttackRollButton.test.jsx` → PASS com a MESMA contagem do Step 1 (equivalência provada). `npx eslint src/hooks/useRollInteraction.js src/components/DiceRoller/RollButton.jsx` → limpo.

- [ ] **Step 5: Commit** — `git commit -m "refactor(dice): interacao de rolagem extraida para useRollInteraction (fonte unica do gesto)"`

---

### Task 2: Helper de teste com dados + primitivo `RollableRow`

**Files:**
- Modify: `src/test/helpers/sheetV2TestContext.jsx`
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/RollableRow.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/tokens.css`
- Test: `src/test/sheetV2-RollableRow.test.jsx`

- [ ] **Step 1: Helper.** Em `sheetV2TestContext.jsx`, adicione o provider de dados espiável (componentes v2 com rolagem quebram sem o contexto):

```jsx
// no topo, junto dos imports existentes:
import { DiceRollerContext } from '../../hooks/useDiceRoller'

// exporta um value de contexto espiável (mesmo shape do DiceRollerProvider real)
export function makeDice(overrides = {}) {
  return {
    history: [], open: false, mode: 'normal',
    roll: noop, clearHistory: noop, togglePanel: noop, openPanel: noop, setMode: noop,
    ...overrides,
  }
}
```

E no `renderWithSheetContext`, aceite `dice` e embrulhe:

```jsx
export function renderWithSheetContext(ui, { character, calc, dice, ...rest } = {}) {
  const value = { /* ...inalterado... */ }
  return render(
    <DiceRollerContext.Provider value={makeDice(dice)}>
      <CharacterProvider value={value}>{ui}</CharacterProvider>
    </DiceRollerContext.Provider>
  )
}
```

- [ ] **Step 2: Write the failing test**

```jsx
// src/test/sheetV2-RollableRow.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceRollerContext } from '../hooks/useDiceRoller'
import { makeDice } from './helpers/sheetV2TestContext'
import { RollableRow } from '../systems/dnd5e/components/CharacterSheet/v2/RollableRow'

describe('RollableRow', () => {
  it('é um button com aria-label e rola no click', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    const openPanel = vi.fn()
    render(
      <DiceRollerContext.Provider value={makeDice({ roll, openPanel })}>
        <RollableRow notation="1d20+5" label="Atletismo" ariaLabel="Rolar Atletismo, bônus +5">
          <span>Atletismo</span><span>+5</span>
        </RollableRow>
      </DiceRollerContext.Provider>
    )
    const row = screen.getByRole('button', { name: 'Rolar Atletismo, bônus +5' })
    await user.click(row)
    expect(roll).toHaveBeenCalledWith('1d20+5', 'Atletismo', { crit: false })
    expect(openPanel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: FAIL.** `npx vitest run src/test/sheetV2-RollableRow.test.jsx` → módulo não existe.

- [ ] **Step 4: Implemente**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/RollableRow.jsx
import { useRollInteraction } from '../../../../../hooks/useRollInteraction'

/**
 * Linha rolável do v2 (estilo D&D Beyond): a linha INTEIRA é um <button> que
 * rola `notation`. Gesto de vantagem/desvantagem herdado do useRollInteraction.
 */
export function RollableRow({ notation, label, ariaLabel, children }) {
  const { handlers, longPressActive, title } = useRollInteraction({ notation, label })
  return (
    <button
      type="button"
      {...handlers}
      title={title}
      aria-label={ariaLabel ?? `Rolar ${label}`}
      className={`v2-row v2-rollable${longPressActive ? ' v2-rollable-armed' : ''}`}
    >
      {children}
    </button>
  )
}
```

E em `tokens.css` (depois do bloco `.v2-tab[aria-selected='true']`):

```css
/* Linhas/cards roláveis (rolagem interativa) */
.sheet-v2 .v2-rollable {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
}
.sheet-v2 .v2-rollable:hover { background: var(--v2-surface-2); }
.sheet-v2 .v2-rollable:active { transform: scale(0.99); }
.sheet-v2 .v2-rollable-armed { outline: 2px solid var(--v2-success); outline-offset: -2px; }
```

- [ ] **Step 5:** `npx vitest run src/test/sheetV2-RollableRow.test.jsx` → PASS. Rode também a suíte v2 existente (o helper mudou): `npx vitest run src/test/sheetV2-SkillsPanel.test.jsx src/test/sheetV2-SidePanels.test.jsx src/test/sheetV2-AbilityStrip.test.jsx` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(ficha-v2): primitivo RollableRow + contexto de dados no helper de teste"`

---

### Task 3: Perícias e salvaguardas roláveis

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SkillsPanel.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SidePanels.jsx` (só o SavesPanel)
- Test: `src/test/sheetV2-roll-rows.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-roll-rows.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/SkillsList', () => ({ SkillsList: () => <div /> }))

import { SkillsPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsPanel'
import { SavesPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SidePanels'

describe('rolagem nas linhas do v2', () => {
  it('clicar numa perícia rola 1d20+bônus com o nome como label', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    const openPanel = vi.fn()
    renderWithSheetContext(<SkillsPanel />, { dice: { roll, openPanel } })
    // fixture: Atletismo proficiente+expertise (str 20, prof 5) → +15 (ver makeCharacter/makeCalc)
    await user.click(screen.getByRole('button', { name: /Rolar Atletismo/ }))
    expect(roll).toHaveBeenCalledWith('1d20+15', 'Atletismo', { crit: false })
    expect(openPanel).toHaveBeenCalled()
  })

  it('clicar numa salvaguarda rola com o label do v1', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    renderWithSheetContext(<SavesPanel />, { dice: { roll, openPanel: vi.fn() } })
    // makeCalc: savingThrows.con = 9
    await user.click(screen.getByRole('button', { name: /Rolar salvaguarda de CON/ }))
    expect(roll).toHaveBeenCalledWith('1d20+9', 'Salvaguarda — CON', { crit: false })
  })
})
```

ATENÇÃO: confirme o bônus real de Atletismo do fixture rodando o teste — `skillBonus` com str 20 (+5), profBonus 5 e expertise (`expertiseSkills: ['athletics']`) dá +15; se o valor divergir, corrija o assert para o valor computado (a fonte é o fixture, não este plano).

- [ ] **Step 2: FAIL. Step 3: Implemente no `SkillsPanel.jsx`** — a linha vira `RollableRow` (conteúdo interno idêntico):

```jsx
// import novo no topo:
import { RollableRow } from './RollableRow'

// dentro do map (substitui o <div key={s.key} className="v2-row">...</div>):
{SKILLS.map(s => {
  const { prof, expert } = skillProficiencyState(character.proficiencies, s.key)
  const bonus = skillBonus(character, calc, s.key)
  return (
    <RollableRow
      key={s.key}
      notation={`1d20${calc.fmt(bonus)}`}
      label={s.name}
      ariaLabel={`Rolar ${s.name}, bônus ${calc.fmt(bonus)}`}
    >
      <span className={prof ? '' : 'v2-mut'} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span aria-hidden className={prof ? 'v2-acc' : 'v2-mut'}>{expert ? '◆' : prof ? '●' : '○'}</span>{' '}
        {s.name} <span className="v2-mut" style={{ fontSize: 11 }}>{s.abbr}</span>
      </span>
      <span className={prof ? 'v2-acc' : ''}>{calc.fmt(bonus)}</span>
    </RollableRow>
  )
})}
```

- [ ] **Step 4: Implemente no `SavesPanel`** (em SidePanels.jsx; SensesPanel/ProficienciesPanel INTOCADOS):

```jsx
// import novo no topo do arquivo:
import { RollableRow } from './RollableRow'

// dentro do map do SavesPanel (substitui o <div key={key} className="v2-row">):
{SAVE_LABELS.map(([key, label]) => {
  const isProf = profs.includes(key)
  const bonus = calc.savingThrows[key]
  return (
    <RollableRow
      key={key}
      notation={`1d20${calc.fmt(bonus)}`}
      label={`Salvaguarda — ${label}`}
      ariaLabel={`Rolar salvaguarda de ${label}, bônus ${calc.fmt(bonus)}`}
    >
      <span className={isProf ? '' : 'v2-mut'}>
        <span aria-hidden className={isProf ? 'v2-acc' : 'v2-mut'}>{isProf ? '●' : '○'}</span> {label}
      </span>
      <span className={isProf ? 'v2-acc' : ''}>{calc.fmt(bonus)}</span>
    </RollableRow>
  )
})}
```

- [ ] **Step 5:** `npx vitest run src/test/sheetV2-roll-rows.test.jsx src/test/sheetV2-SkillsPanel.test.jsx src/test/sheetV2-SkillsPanel-edit.test.jsx src/test/sheetV2-SidePanels.test.jsx src/test/sheetV2-SheetV2.test.jsx` → PASS (se algum teste antigo quebrar por role/aria — ex.: `getByText` que virou button — ajuste a QUERY mantendo a intenção; não mude o componente).

- [ ] **Step 6: Commit** — `git commit -m "feat(ficha-v2): pericias e salvaguardas clicaveis rolam d20"`

---

### Task 4: Cards de atributo e iniciativa roláveis (✎ edita)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/tokens.css`
- Test: adicionar casos em `src/test/sheetV2-roll-rows.test.jsx`

- [ ] **Step 1: Write the failing tests** (adicionar ao arquivo da Task 3; precisa dos mocks do AbilityStrip — copie os do `sheetV2-AbilityStrip.test.jsx` existente se houver, senão nenhum):

```jsx
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip — rolagem', () => {
  it('clicar no card rola o teste de atributo; ✎ ainda abre o editor', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { dice: { roll, openPanel: vi.fn() } })
    // makeCalc: mods.str = +5
    await user.click(screen.getByRole('button', { name: /Rolar teste de Força/ }))
    expect(roll).toHaveBeenCalledWith('1d20+5', 'Teste de Força', { crit: false })
    // edição preservada: o ✎ mantém o aria-label da fase 2
    await user.click(screen.getByRole('button', { name: 'Editar FOR' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('card INIT rola iniciativa', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { dice: { roll, openPanel: vi.fn() } })
    // makeCalc: initiative = 1
    await user.click(screen.getByRole('button', { name: /Rolar iniciativa/ }))
    expect(roll).toHaveBeenCalledWith('1d20+1', 'Iniciativa', { crit: false })
  })

  it('readOnly: rola, mas não mostra ✎', () => {
    renderWithSheetContext(<AbilityStrip />, { readOnly: true, dice: { roll: vi.fn(), openPanel: vi.fn() } })
    expect(screen.getByRole('button', { name: /Rolar teste de Força/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar FOR' })).not.toBeInTheDocument()
  })
})
```

ATENÇÃO: o aria-label EXATO de edição da fase 2 é `Editar ${a.label}` (label = 'FOR'…'Carisma'). CONFIRME em `sheetV2-AbilityStrip-edit.test.jsx` antes de assertar — o ✎ precisa herdar exatamente esses labels pros testes antigos seguirem passando.

- [ ] **Step 2: FAIL. Step 3: Implemente no `AbilityStrip.jsx`.** Adicione `name` às ABILITIES e substitua o corpo dos cards (dois botões IRMÃOS num container — nunca botão dentro de botão):

```jsx
// import novo:
import { useRollInteraction } from '../../../../../hooks/useRollInteraction'

const ABILITIES = [
  { key: 'str', abbr: 'FOR', label: 'FOR', name: 'Força' },
  { key: 'dex', abbr: 'DES', label: 'DES', name: 'Destreza' },
  { key: 'con', abbr: 'CON', label: 'CON', name: 'Constituição' },
  { key: 'int', abbr: 'INT', label: 'INT', name: 'Inteligência' },
  { key: 'wis', abbr: 'SAB', label: 'SAB', name: 'Sabedoria' },
  { key: 'cha', abbr: 'CAR', label: 'Carisma', name: 'Carisma' },
]

// Card de atributo: botão de rolar (área toda) + ✎ irmão absoluto (edição).
function AbilityCard({ a, mod, score, fmt, readOnly, onEdit }) {
  const { handlers, longPressActive, title } = useRollInteraction({
    notation: `1d20${fmt(mod)}`,
    label: `Teste de ${a.name}`,
  })
  return (
    <div className="v2-panel v2-ability" style={{ position: 'relative', padding: 0 }}>
      <button
        type="button"
        {...handlers}
        title={title}
        aria-label={`Rolar teste de ${a.name}, modificador ${fmt(mod)}`}
        className={`v2-ability-roll${longPressActive ? ' v2-rollable-armed' : ''}`}
      >
        <span className="v2-title" style={{ margin: 0 }}>{a.abbr}</span>
        <span className="v2-ability-mod">{fmt(mod)}</span>
        <span className="v2-chip v2-acc">{score}</span>
      </button>
      {!readOnly && (
        <button type="button" className="v2-ability-edit" aria-label={`Editar ${a.label}`} onClick={onEdit}>✎</button>
      )}
    </div>
  )
}

// Card INIT: o card inteiro é o botão de rolar (não tem editor).
function InitiativeCard() {
  const { character, calc } = useCharacterContext()
  const { handlers, longPressActive, title } = useRollInteraction({
    notation: `1d20${calc.fmt(calc.initiative)}`,
    label: 'Iniciativa',
  })
  return (
    <button
      type="button"
      {...handlers}
      title={title}
      aria-label={`Rolar iniciativa, bônus ${calc.fmt(calc.initiative)}`}
      className={`v2-panel v2-ability${longPressActive ? ' v2-rollable-armed' : ''}`}
      style={{ background: 'var(--v2-surface-2)', border: '1px solid var(--v2-border)', width: '100%', cursor: 'pointer' }}
    >
      <span className="v2-title" style={{ margin: 0 }}>INIT</span>
      <span className="v2-ability-mod">{calc.fmt(calc.initiative)}</span>
      <span className="v2-mut" style={{ fontSize: 11 }}>VEL {effectiveSpeed(character)}m</span>
    </button>
  )
}
```

No corpo do `AbilityStrip`, o map dos cards vira (substitui o par readOnly/button atual INTEIRO — o card readOnly também rola agora):

```jsx
{ABILITIES.map(a => (
  <AbilityCard
    key={a.key}
    a={a}
    mod={calc.mods[a.key]}
    score={calc.effectiveAttrs?.[a.key] ?? character.attributes[a.key]}
    fmt={calc.fmt}
    readOnly={readOnly}
    onEdit={() => setEditing(a.key)}
  />
))}
```

E o card INIT no fim (substitui o `<div className="v2-panel v2-ability" ...>INIT...</div>`) vira `<InitiativeCard />`. O card CA fica EXATAMENTE como está (clique = editor).

Em `tokens.css`, adicione:

```css
.sheet-v2 .v2-ability-roll {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 100%; padding: 8px 4px;
  border: 0; background: transparent; color: inherit; font: inherit;
  cursor: pointer; border-radius: 10px;
}
.sheet-v2 .v2-ability-roll:hover { background: var(--v2-surface-2); }
.sheet-v2 .v2-ability-edit {
  position: absolute; top: 2px; right: 2px;
  min-width: 24px; min-height: 24px;
  border: 0; background: transparent; color: var(--v2-text-3);
  cursor: pointer; border-radius: 6px; font-size: 12px; line-height: 1;
}
.sheet-v2 .v2-ability-edit:hover { color: var(--v2-text-1); background: var(--v2-surface-2); }
```

- [ ] **Step 4:** `npx vitest run src/test/sheetV2-roll-rows.test.jsx src/test/sheetV2-AbilityStrip.test.jsx src/test/sheetV2-AbilityStrip-edit.test.jsx src/test/sheetV2-AbilityStrip-ca.test.jsx src/test/sheetV2-SheetV2.test.jsx` → PASS (testes antigos que clicavam o card pra editar agora clicam o ✎ — mesmo aria-label, então só quebram se assertavam a TAG; ajuste queries mantendo a intenção).

- [ ] **Step 5: Commit** — `git commit -m "feat(ficha-v2): cards de atributo e INIT rolam; edicao migra pro lapis"`

---

### Task 5: Ataques nativos da aba Ações rolam (com munição)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/ActionsTab.jsx`
- Test: adicionar casos em `src/test/sheetV2-ActionsTab.test.jsx`

- [ ] **Step 1: Write the failing tests** (no arquivo existente; NÃO mocke AttackRollButton/RollButton — são reais, o helper provê o contexto de dados):

```jsx
// novos casos no describe('ActionsTab'):
  it('linha de ataque tem botão Atacar (fluxo completo do v1)', () => {
    renderWithSheetContext(<ActionsTab />, { character: charWithAttack(), dice: { roll: vi.fn(), openPanel: vi.fn() } })
    expect(screen.getByRole('button', { name: /Atacar com Machado grande/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rolar Dano avulso · Machado grande/ })).toBeInTheDocument()
  })

  it('atacar com arma de munição consome 1 do inventário', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // determinístico (lição do flake do DamageModal)
    const user = userEvent.setup()
    const updateItem = vi.fn()
    const ch = makeCharacter()
    ch.combat = { ...ch.combat, attacks: [{ id: 'atk2', name: 'Arco longo', damageDice: '1d8', proficient: true, properties: ['ammunition'] }] }
    ch.inventory = { items: [{ id: 'i1', name: 'Flechas', qty: 20 }], currency: {} }
    renderWithSheetContext(<ActionsTab />, {
      character: ch,
      updaters: makeUpdaters({ updateItem }),
      dice: { roll: vi.fn(() => ({ rolls: [11], total: 13 })), openPanel: vi.fn() },
    })
    await user.click(screen.getByRole('button', { name: /Atacar com Arco longo/ }))
    expect(updateItem).toHaveBeenCalledWith('i1', { qty: 19 })
    vi.restoreAllMocks()
  })
```

ATENÇÃO (2 verificações no início da task): (1) `findAmmoForAttack` — leia a implementação em `utils/weaponI18n.js` pra confirmar como ela casa ataque↔item (nome? propriedade?); ajuste o fixture do item ("Flechas") pro matching real. (2) `AttackRollButton` chama `onAfterRoll` — confirme QUANDO (após ataque? após dano?) lendo `AttackRollButton.jsx`, e se o mock de `roll` retornando `{ rolls: [11] }` satisfaz o fluxo interno; se o componente usa o retorno de `roll()` pra decidir crítico, o mock precisa devolver esse shape.

- [ ] **Step 2: FAIL. Step 3: Implemente no `ActionsTab.jsx`:**

```jsx
// imports novos:
import { AttackRollButton } from '../AttackRollButton'
import { RollButton } from '../../../../../components/DiceRoller/RollButton'
import { findAmmoForAttack } from '../../../utils/weaponI18n'
```

`AttackRowV2` ganha rolagem + munição (assinatura e corpo novos; cálculo INALTERADO):

```jsx
function AttackRowV2({ atk, attributes, profBonus, ammoItem, onUpdateItem }) {
  const bonus = calculateWeaponAttackBonus(atk, attributes, profBonus)
  const dmg = calculateWeaponDamage(atk, attributes, {})
  const abbr = abbrOfKey(resolveAttackAbility(atk, attributes))
  const noAmmo = !!ammoItem && (ammoItem.qty ?? 0) <= 0

  // Mesma semântica do AttackRow v1: 1 consumo por clique em Atacar.
  function consumeAmmo() {
    if (!ammoItem || (ammoItem.qty ?? 0) <= 0) return
    onUpdateItem?.(ammoItem.id, { qty: Math.max(0, (ammoItem.qty ?? 0) - 1) })
  }

  return (
    <div className="v2-row">
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {atk.name}
        <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>{abbr}</span>
        {ammoItem && (
          <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
            {noAmmo ? '⚠ sem munição' : `🏹 ${ammoItem.qty ?? 0}`}
          </span>
        )}
      </span>
      <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="v2-acc" style={{ fontWeight: 600 }}>{formatModifier(bonus)}</span>
        <span className="v2-mut">·</span>
        {dmg.expression}
        {atk.damageType ? <span className="v2-mut">{atk.damageType}</span> : null}
        <AttackRollButton
          attackNotation={`1d20${formatModifier(bonus)}`}
          damageNotation={dmg.expression}
          weaponName={atk.name}
          disabled={noAmmo}
          onAfterRoll={consumeAmmo}
          size="xs"
        />
        <RollButton notation={dmg.expression} label={`Dano avulso · ${atk.name}`} size="xs" />
      </span>
    </div>
  )
}
```

E o call site (dentro do bloco `showAttacks`):

```jsx
: attacks.map(atk => (
  <AttackRowV2
    key={atk.id}
    atk={atk}
    attributes={character.attributes}
    profBonus={calc.profBonus}
    ammoItem={findAmmoForAttack(atk, character.inventory?.items ?? [])}
    onUpdateItem={updateItem}
  />
))
```

(`updateItem` já está destructurado dos updaters no ActionsTab.)

- [ ] **Step 4:** `npx vitest run src/test/sheetV2-ActionsTab.test.jsx src/test/sheetV2-MainBox.test.jsx` → PASS. `npx eslint` nos arquivos tocados → limpo.

- [ ] **Step 5: Commit** — `git commit -m "feat(ficha-v2): ataques nativos da aba Acoes rolam (fluxo critico + municao)"`

---

### Task 6: Gates finais

- [ ] **Step 1:** `npm run test` → suíte inteira PASS (flakes conhecidos de LoginScreen/ResetPasswordScreen na suíte cheia: re-rode o arquivo isolado antes de concluir regressão).
- [ ] **Step 2:** `npm run build` → verde.
- [ ] **Step 3:** `npm run test:e2e` → verde. O teste axe da ficha v2 é o gate de a11y dos novos buttons (zero critical/serious).
- [ ] **Step 4:** Verificação visual (o e2e stub permite sem login): spec temporário em `e2e-pw/` com `installAuthedApp` + `makeCharacter` + screenshot de `/c/SHEETAXEBC?sheetV2=1` — conferir hover/foco das linhas e o ✎ nos cards; deletar o spec depois.
- [ ] **Step 5: Commit final** — `git commit -m "chore(ficha-v2): rolagem interativa verificada (gates verdes)"`

## Fora deste plano

Dados 3D; rolagem em componentes v1 embrulhados além do listado; mudanças no painel de histórico; CA/sentidos/proficiência não rolam (spec).
