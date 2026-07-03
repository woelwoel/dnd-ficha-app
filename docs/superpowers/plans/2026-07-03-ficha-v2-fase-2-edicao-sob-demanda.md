# Ficha v2 — Fase 2: Edição sob demanda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a ficha v2 jogável de verdade: toda informação editável ganha seu editor sob demanda (modal/popover), incluindo dano/cura/testes de morte, condições interativas, identidade, perícias, configurações com import e o painel de progressão.

**Architecture:** Um primitivo `EditDialog` (Headless UI `Dialog`, já dependência do projeto) estilizado com os tokens v2. Editores complexos REUSAM os componentes v1 (CharacterInfo, SkillsList, SourcePicker, LevelProgression, DamageModal) embrulhados no dialog — mesma estratégia da fase 1. Editores simples (atributo, PV, CA, condições) são nativos v2. Spec: `docs/superpowers/specs/2026-07-03-redesign-ficha-pagina-unica-design.md`.

**Tech Stack:** React 19, @headlessui/react 2.x (Dialog), Vitest + Testing Library, tokens CSS v2.

---

## ⚠️ Regras deste projeto (leia antes de qualquer task)

1. **NUNCA use utilitários de COR do Tailwind no v2** (`bg-*`, `text-*`, `border-*` com cor) — o `index.css` remapeia pra parchment com escala invertida. Cores = classes `v2-*` de `tokens.css` ou `style` inline com `var(--v2-*)`. Tailwind só pra layout (`flex`, `grid`, `gap-*`, `p-*`, `min-w-0`, `fixed`, `inset-0`, `z-*`, breakpoints).
2. **Nenhum arquivo v1 é editado** (exceto `CharacterSheet.jsx`, apenas para passar novas props ao `SheetV2`). Componentes v1 são reusados por import.
3. Commits pequenos por task com trailer `Co-Authored-By:`; quem controla o push é o controlador (subagentes NÃO pusham).
4. TDD: teste falhando → implementação → teste passando, em toda task com lógica.
5. **GOTCHA do portal**: o `Dialog` do Headless UI porta o conteúdo pro `<body>`, FORA do escopo `.sheet-v2` — o `DialogPanel` DEVE receber `className="sheet-v2 ..."` de novo, senão os tokens `--v2-*` não existem lá dentro.
6. Rode testes com `npx vitest run <arquivo>`; suíte completa só na task final. Flake conhecido: `LoginScreen`/`ResetPasswordScreen` — re-rode isolado antes de suspeitar do seu código.

## Interfaces do código existente (verificadas)

- `updateAttribute(attr, value)` — parseia int e clampa 1–30 (`useCharacter.js:175`)
- `updateCombat(key, value)` / `updateInfo(key, value)` — patch de seção
- `toggleCondition(id)` (`useCharacter.js:564`), `setInspiration(bool)` (`:576`), `setExhaustion(0-6)` (`:580`)
- `applyDamage`, `applyHealing`, `stabilize`, `rollDeathSave`, `updateDeathSaves` — todos em `updaters` do contexto (uso de referência: `SheetContent.jsx:100-105` e `CombatStats.jsx`)
- `DamageModal({ open, onClose, onConfirm })` — payload do `onConfirm`: **verifique em `CombatStats.jsx:203`** antes de wirar
- Import de JSON: mecanismo em `SheetHeader.jsx:45-60` (FileReader + validação que produz "Arquivo inválido...") — copie de lá
- Props de `CharacterInfo`, `SkillsList`, `SourcePicker`, `LevelProgression`: **fonte da verdade é `SheetContent.jsx`** (linhas ~162-373); copie exatamente
- `calc.suggestedAC`, `calc.suggestedMaxHp`, `calc.featSpeedBonus`; velocidade sugerida = `baseSpeedMeters(character, races.find(r => r.index === character.info?.race)?.speed) + (calc.featSpeedBonus ?? 0)` (copiado de `SheetContent.jsx:236`)
- `CONDITIONS` / `CONDITIONS_BY_ID` (`domain/conditions.js`) — campo de exibição é **`label`**
- Helper de teste: `src/test/helpers/sheetV2TestContext.jsx` (`renderWithSheetContext`, `makeCharacter`, `makeCalc`)
- `character.combat.deathSaves` — **verifique o shape exato em `useCharacter.js`** (procure `deathSaves`) antes da Task 3

---

### Task 1: Primitivo EditDialog + spy de updaters no helper de teste

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/EditDialog.jsx`
- Modify: `src/test/helpers/sheetV2TestContext.jsx` (adicionar `makeUpdaters`)
- Test: `src/test/sheetV2-EditDialog.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-EditDialog.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditDialog } from '../systems/dnd5e/components/CharacterSheet/v2/EditDialog'

describe('EditDialog', () => {
  it('renderiza título e conteúdo quando aberto', () => {
    render(
      <EditDialog open onClose={() => {}} title="Editar atributo">
        <div>conteúdo do editor</div>
      </EditDialog>
    )
    expect(screen.getByText('Editar atributo')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do editor')).toBeInTheDocument()
  })

  it('não renderiza nada quando fechado', () => {
    render(
      <EditDialog open={false} onClose={() => {}} title="Oculto">
        <div>invisível</div>
      </EditDialog>
    )
    expect(screen.queryByText('invisível')).not.toBeInTheDocument()
  })

  it('chama onClose no botão fechar e no Esc', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EditDialog open onClose={onClose} title="X"><div /></EditDialog>
    )
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('painel carrega a classe sheet-v2 (tokens no portal)', () => {
    render(
      <EditDialog open onClose={() => {}} title="Tokens"><div /></EditDialog>
    )
    expect(document.querySelector('.sheet-v2 .v2-panel')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/sheetV2-EditDialog.test.jsx`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Write EditDialog**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/EditDialog.jsx
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

const WIDTHS = { sm: 360, md: 560, lg: 760, full: 'min(1100px, 96vw)' }

/**
 * Modal de edição do design system v2 (Headless UI Dialog).
 * O Dialog porta pro <body> — FORA do escopo .sheet-v2 — então o painel
 * reaplica a classe pra manter os tokens --v2-* disponíveis.
 */
export function EditDialog({ open, onClose, title, size = 'sm', children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          className="sheet-v2 v2-panel"
          style={{ width: WIDTHS[size] ?? WIDTHS.sm, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div className="v2-row" style={{ marginBottom: 8 }}>
            <DialogTitle className="v2-title" style={{ margin: 0 }}>{title}</DialogTitle>
            <button type="button" className="v2-btn" onClick={onClose} aria-label="Fechar">✕</button>
          </div>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 4: Extend the test helper** — add to `src/test/helpers/sheetV2TestContext.jsx` (below `noopBag`):

```jsx
// Updaters espiáveis: makeUpdaters({ updateAttribute: vi.fn() }) — chaves não
// especificadas viram noop, então componentes que destructuram tudo não quebram.
export function makeUpdaters(overrides = {}) {
  return new Proxy(overrides, { get: (t, k) => (k in t ? t[k] : noop) })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/sheetV2-EditDialog.test.jsx`
Expected: PASS (4 testes)

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/EditDialog.jsx src/test/helpers/sheetV2TestContext.jsx src/test/sheetV2-EditDialog.test.jsx
git commit -m "feat(ficha-v2): primitivo EditDialog + spy de updaters no helper"
```

---

### Task 2: Popover de edição de atributos (AbilityStrip)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx`
- Test: `src/test/sheetV2-AbilityStrip-edit.test.jsx` (novo arquivo; o teste da fase 1 continua intacto)

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-AbilityStrip-edit.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeUpdaters } from './helpers/sheetV2TestContext'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip — edição', () => {
  it('clicar num atributo abre o editor e salvar chama updateAttribute', async () => {
    const user = userEvent.setup()
    const updateAttribute = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateAttribute }) })
    await user.click(screen.getByRole('button', { name: /Editar FOR/ }))
    const input = screen.getByLabelText('Valor')
    await user.clear(input)
    await user.type(input, '18')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateAttribute).toHaveBeenCalledWith('str', '18')
  })

  it('readOnly não abre editor', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<AbilityStrip />, { readOnly: true })
    // Em readOnly os cards não são botões de edição
    expect(screen.queryByRole('button', { name: /Editar FOR/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/test/sheetV2-AbilityStrip-edit.test.jsx` → FAIL

- [ ] **Step 3: Implement.** Em `AbilityStrip.jsx`: adicionar estado `const [editing, setEditing] = useState(null)` (key do atributo em edição) e `readOnly` do contexto. Cada card de atributo vira `<button type="button" aria-label={`Editar ${a.abbr}`} onClick={() => setEditing(a.key)}>` quando `!readOnly` (e continua `<div>` quando `readOnly`). Ao final do componente, o editor:

```jsx
      <AbilityEditor
        abilityKey={editing}
        onClose={() => setEditing(null)}
      />
```

E no mesmo arquivo (componente local, não exportado):

```jsx
function AbilityEditor({ abilityKey, onClose }) {
  const { character, updaters } = useCharacterContext()
  const [value, setValue] = useState('')
  useEffect(() => {
    if (abilityKey) setValue(String(character.attributes[abilityKey] ?? 10))
  }, [abilityKey, character.attributes])
  const abbr = ABILITIES.find(a => a.key === abilityKey)?.abbr ?? ''
  const racial = character.appliedRacialBonuses?.[abilityKey] ?? 0
  return (
    <EditDialog open={abilityKey != null} onClose={onClose} title={`Editar ${abbr}`}>
      <label className="v2-row" style={{ gap: 12 }}>
        <span className="v2-mut">Valor</span>
        <input
          type="number" min="1" max="30" value={value}
          onChange={e => setValue(e.target.value)}
          style={{ width: 90, background: 'var(--v2-surface-2)', color: 'var(--v2-text-1)', border: '1px solid var(--v2-border)', borderRadius: 8, padding: '6px 10px' }}
        />
      </label>
      {racial > 0 && (
        <p className="v2-mut" style={{ fontSize: 12, margin: '6px 0 0' }}>
          Bônus racial já aplicado: +{racial}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className="v2-btn" onClick={() => { updaters.updateAttribute(abilityKey, value); onClose() }}>
          Aplicar
        </button>
      </div>
    </EditDialog>
  )
}
```

(Imports novos: `useState, useEffect` do react e `EditDialog` de `./EditDialog`. `updateAttribute` já clampa 1–30 e ignora NaN — não duplique validação.)

- [ ] **Step 4: Run both** — `npx vitest run src/test/sheetV2-AbilityStrip-edit.test.jsx src/test/sheetV2-AbilityStrip.test.jsx` → tudo PASS (o teste da fase 1 não pode quebrar; se `getByText` do teste antigo falhar porque o card virou button, ajuste o MÍNIMO no componente — os textos devem continuar os mesmos).

- [ ] **Step 5: Commit** — `git commit -m "feat(ficha-v2): popover de edicao de atributos"`

---

### Task 3: Bloco PV — editor, dano/cura e testes de morte

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/sheetV2-HeaderV2-hp.test.jsx`

- [ ] **Step 1: Verify shapes first.** Leia em `CombatStats.jsx:203` o payload do `onConfirm` do `DamageModal` e como ele chama `applyDamage`/`applyHealing`. Leia em `useCharacter.js` o shape de `combat.deathSaves` (procure `deathSaves`) e a assinatura de `updateDeathSaves`/`rollDeathSave`/`stabilize`. Anote — os passos seguintes usam esses fatos.

- [ ] **Step 2: Write the failing test**

```jsx
// src/test/sheetV2-HeaderV2-hp.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'
import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — PV', () => {
  it('abre editor de PV e aplica PV máximo', async () => {
    const user = userEvent.setup()
    const updateCombat = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ updateCombat }) })
    await user.click(screen.getByRole('button', { name: /Editar pontos de vida/ }))
    const input = screen.getByLabelText('PV máximo')
    await user.clear(input)
    await user.type(input, '140')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateCombat).toHaveBeenCalledWith('maxHp', 140)
  })

  it('tem botões de dano e cura', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByRole('button', { name: 'Dano' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cura' })).toBeInTheDocument()
  })

  it('com PV 0 mostra testes de morte no lugar da barra', () => {
    const ch = makeCharacter()
    ch.combat = { ...ch.combat, currentHp: 0 }
    renderWithSheetContext(<HeaderV2 {...props} />, { character: ch })
    expect(screen.getByText(/Testes de morte/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rolar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Estabilizar/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run to verify it fails** — FAIL (novos elementos não existem)

- [ ] **Step 4: Implement em HeaderV2.jsx:**
  1. O bloco de PV ganha um botão de lápis `aria-label="Editar pontos de vida"` (oculto em readOnly) que abre um `EditDialog` com dois campos numéricos rotulados **PV máximo** (default `combat.maxHp`, com linha "Sugerido: {calc.suggestedMaxHp}" clicável que preenche o campo) e **PV temporário** (default `combat.tempHp`). Botão `Aplicar` chama `updaters.updateCombat('maxHp', Number(v))` e `updateCombat('tempHp', Number(t))` e fecha. Use o mesmo estilo de input da Task 2.
  2. Botões **Dano** e **Cura** ao lado do bloco PV (ocultos em readOnly): cada um abre o `DamageModal` v1 (import `{ DamageModal } from '../DamageModal'`), wireado EXATAMENTE como `CombatStats.jsx:203` faz (payload verificado no Step 1) → `applyDamage`/`applyHealing` dos updaters.
  3. Quando `combat.currentHp === 0`: no lugar da barra, renderizar bloco "Testes de morte" com sucessos/falhas (shape verificado no Step 1, ex.: `●●○ / ●○○`), botão `Rolar` → `updaters.rollDeathSave()` e `Estabilizar` → `updaters.stabilize()` (ocultos em readOnly). PV temporário > 0 aparece como chip `+N temp` ao lado do PV.

- [ ] **Step 5: Run all HeaderV2 tests** — `npx vitest run src/test/sheetV2-HeaderV2-hp.test.jsx src/test/sheetV2-HeaderV2.test.jsx` → PASS (fase 1 intacta)

- [ ] **Step 6: Commit** — `git commit -m "feat(ficha-v2): editor de PV, dano/cura e testes de morte no header"`

---

### Task 4: Popover de CA e velocidade

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx`
- Test: `src/test/sheetV2-AbilityStrip-ca.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-AbilityStrip-ca.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeUpdaters } from './helpers/sheetV2TestContext'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip — CA/VEL', () => {
  it('abre editor de CA e aplica valor', async () => {
    const user = userEvent.setup()
    const updateCombat = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateCombat }) })
    await user.click(screen.getByRole('button', { name: /Editar CA/ }))
    const input = screen.getByLabelText('Classe de Armadura')
    await user.clear(input)
    await user.type(input, '16')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateCombat).toHaveBeenCalledWith('armorClass', 16)
  })

  it('sugerido preenche o campo de CA', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<AbilityStrip />)
    await user.click(screen.getByRole('button', { name: /Editar CA/ }))
    await user.click(screen.getByRole('button', { name: /Sugerido: 11/ }))
    expect(screen.getByLabelText('Classe de Armadura')).toHaveValue(11)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL

- [ ] **Step 3: Implement.** O card de CA (quando `!readOnly`) vira botão `aria-label="Editar CA"` abrindo `EditDialog` com: campo **Classe de Armadura** (default `combat.armorClass`), botão "Sugerido: {calc.suggestedAC}" que seta o campo, campo **Velocidade (m)** (default `combat.speed`) com sugerido `baseSpeedMeters(character, races.find(r => r.index === character.info?.race)?.speed) + (calc.featSpeedBonus ?? 0)` (import `baseSpeedMeters` de `../../../domain/rules`; `races` vem do contexto). `Aplicar` → `updateCombat('armorClass', Number(ca))` e `updateCombat('speed', Number(vel))`.

- [ ] **Step 4: Run** — os 3 arquivos de teste do AbilityStrip → PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(ficha-v2): editor de CA e velocidade com sugeridos"`

---

### Task 5: Condições interativas no header

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/sheetV2-HeaderV2-conditions.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-HeaderV2-conditions.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeUpdaters } from './helpers/sheetV2TestContext'
import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — condições interativas', () => {
  it('remove condição pelo × do chip', async () => {
    const user = userEvent.setup()
    const toggleCondition = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ toggleCondition }) })
    await user.click(screen.getByRole('button', { name: 'Remover Envenenado' }))
    expect(toggleCondition).toHaveBeenCalledWith('poisoned')
  })

  it('+ Condição abre painel com a lista completa e alterna condição', async () => {
    const user = userEvent.setup()
    const toggleCondition = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ toggleCondition }) })
    await user.click(screen.getByRole('button', { name: '+ Condição' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByLabelText('Cego'))
    expect(toggleCondition).toHaveBeenCalledWith('blinded')
  })

  it('stepper de exaustão chama setExhaustion', async () => {
    const user = userEvent.setup()
    const setExhaustion = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ setExhaustion }) })
    await user.click(screen.getByRole('button', { name: '+ Condição' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar exaustão' }))
    expect(setExhaustion).toHaveBeenCalledWith(3) // fixture tem exaustão 2
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL

- [ ] **Step 3: Implement em HeaderV2.jsx** (quando `!readOnly`; em readOnly os chips continuam somente leitura, sem × nem "+ Condição"):
  1. Chips de condição ganham `<button aria-label={`Remover ${label}`} onClick={() => updaters.toggleCondition(id)}>×</button>` embutido.
  2. Chip **"+ Condição"** (button) abre `EditDialog title="Condições"` com: grid `repeat(3, 1fr)` de checkboxes (uma por item de `CONDITIONS`, `<label>` com `<input type="checkbox" checked={conditions.includes(c.id)} onChange={() => updaters.toggleCondition(c.id)} />` + `c.label`); linha de exaustão com botões `aria-label="Diminuir exaustão"` / `aria-label="Aumentar exaustão"` chamando `updaters.setExhaustion(combat.exhaustion - 1 | + 1)` e o nível atual entre eles; toggle de inspiração (`<label><input type="checkbox" checked={!!combat.inspiration} onChange={e => updaters.setInspiration(e.target.checked)} /> Inspiração</label>`).
  3. O chip de inspiração no header continua como está (leitura).

- [ ] **Step 4: Run all HeaderV2 test files** — PASS (fase 1 + hp + conditions)

- [ ] **Step 5: Commit** — `git commit -m "feat(ficha-v2): condicoes interativas com painel, exaustao e inspiracao"`

---

### Task 6: Modal de identidade (embrulha CharacterInfo v1)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/sheetV2-HeaderV2-identity.test.jsx`

- [ ] **Step 1: Write the failing test** (mocka o CharacterInfo — pesado e já testado no v1):

```jsx
// src/test/sheetV2-HeaderV2-identity.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({
  CharacterInfo: () => <div data-testid="character-info-v1" />,
}))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — identidade', () => {
  it('clicar no nome abre o modal com o CharacterInfo', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: /Editar identidade/ }))
    expect(screen.getByTestId('character-info-v1')).toBeInTheDocument()
  })

  it('readOnly não expõe o botão de identidade', () => {
    renderWithSheetContext(<HeaderV2 {...props} />, { readOnly: true })
    expect(screen.queryByRole('button', { name: /Editar identidade/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL

- [ ] **Step 3: Implement.** O bloco nome+resumo vira `<button aria-label="Editar identidade">` quando `!readOnly` (mantém a mesma renderização interna). Abre `EditDialog size="md" title="Identidade"` embrulhando `CharacterInfo` com props copiadas VERBATIM de `SheetContent.jsx:195-207` (info com languages mescladas, `onUpdate={updateInfo}`, races/classes/backgrounds do contexto, `errors={fichaErrors}`, e os handlers `handleRaceChange`/`handleSubraceChange`/`handleBackgroundChange`/`handleClassChange` de `handlers` + `onToggleLanguage={toggleLanguage}` dos updaters). `fichaErrors` e `handlers` já estão no contexto.

- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `git commit -m "feat(ficha-v2): modal de identidade embrulhando CharacterInfo"`

---

### Task 7: Editor de perícias (embrulha SkillsList v1)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SkillsPanel.jsx`
- Test: `src/test/sheetV2-SkillsPanel-edit.test.jsx`

- [ ] **Step 1: Write the failing test** (mocka SkillsList):

```jsx
// src/test/sheetV2-SkillsPanel-edit.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/SkillsList', () => ({
  SkillsList: () => <div data-testid="skills-list-v1" />,
}))

import { SkillsPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsPanel'

describe('SkillsPanel — edição', () => {
  it('engrenagem abre o seletor de proficiências', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<SkillsPanel />)
    await user.click(screen.getByRole('button', { name: 'Editar perícias' }))
    expect(screen.getByTestId('skills-list-v1')).toBeInTheDocument()
  })

  it('readOnly esconde a engrenagem', () => {
    renderWithSheetContext(<SkillsPanel />, { readOnly: true })
    expect(screen.queryByRole('button', { name: 'Editar perícias' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: FAIL. Step 3: Implement.** Título do painel vira linha flex com `<button aria-label="Editar perícias">⚙</button>` à direita (só `!readOnly`), abrindo `EditDialog size="md" title="Perícias"` com `SkillsList` — props copiadas VERBATIM de `SheetContent.jsx:162-169` (`attributes`, `proficiencies`, `profBonus`, `onToggle={toggleSkillProficiency}`, `onToggleExpertise={toggleExpertiseSkill}`, `classData`) usando contexto/updaters.

- [ ] **Step 4: Run os 2 arquivos do SkillsPanel** — PASS. **Step 5: Commit** — `git commit -m "feat(ficha-v2): editor de pericias embrulhando SkillsList"`

---

### Task 8: Modal de configurações (fontes, multiclasse, talentos, import)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`, `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx`, `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`
- Test: `src/test/sheetV2-HeaderV2-settings.test.jsx`

- [ ] **Step 1: Wiring de props primeiro.** `SheetV2` e `HeaderV2` ganham props `onImport` e `onImportError`. Em `CharacterSheet.jsx`, o ramo `sheetV2` passa `onImport={handleImport}` e `onImportError={setImportError}` (funções que JÁ existem no SheetBody). Única mudança no CharacterSheet.jsx.

- [ ] **Step 2: Write the failing test**

```jsx
// src/test/sheetV2-HeaderV2-settings.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/SourcePicker', () => ({
  SourcePicker: () => <div data-testid="source-picker-v1" />,
}))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({ CharacterInfo: () => <div /> }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, onImport: noop, onImportError: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — configurações', () => {
  it('engrenagem abre o modal com fontes e import', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: 'Configurações da ficha' }))
    expect(screen.getByTestId('source-picker-v1')).toBeInTheDocument()
    expect(screen.getByText('Importar JSON')).toBeInTheDocument()
  })
})
```

VERIFIQUE o caminho real do SourcePicker no import do `SheetContent.jsx` (linha 17: `../SourcePicker` a partir de CharacterSheet/ → `src/systems/dnd5e/components/SourcePicker`) e ajuste o mock se o arquivo for `SourcePicker/index.jsx` ou similar.

- [ ] **Step 3: FAIL. Step 4: Implement.** Botão `aria-label="Configurações da ficha"` (⚙, sempre visível — o modal em si respeita readOnly) abrindo `EditDialog size="md" title="Configurações da ficha"` com:
  1. `SourcePicker` — props copiadas VERBATIM de `SheetContent.jsx:259-271` (value de `meta.settings.sources`, onChange com guard de readOnly via setCharacter).
  2. Toggles `allowMulticlass` / `allowFeats` (checkboxes lendo `character.meta?.settings?.allowMulticlass ?? true` / `allowFeats ?? false`, gravando pelo MESMO padrão setCharacter+meta.settings do SourcePicker; desabilitados em readOnly).
  3. Seção **Importar JSON**: `<input type="file" accept=".json">` oculto + botão "Importar JSON" — mecanismo copiado de `SheetHeader.jsx:45-60` (FileReader → parse/validação; sucesso → `onImport(parsed.data)`, falha → `onImportError('Arquivo inválido...')`). Desabilitado em readOnly.

- [ ] **Step 5: Run** — PASS. **Step 6: `npm run build`** (valida o wiring do CharacterSheet.jsx). **Step 7: Commit** — `git commit -m "feat(ficha-v2): modal de configuracoes com fontes, toggles e import"`

---

### Task 9: Painel de progressão via "▲ Nível"

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/sheetV2-HeaderV2-progression.test.jsx`

- [ ] **Step 1: Write the failing test** (mocka LevelProgression):

```jsx
// src/test/sheetV2-HeaderV2-progression.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/LevelProgression', () => ({
  LevelProgression: () => <div data-testid="level-progression-v1" />,
}))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({ CharacterInfo: () => <div /> }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, onImport: noop, onImportError: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — progressão', () => {
  it('▲ Nível abre o painel de progressão', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: /Nível/ }))
    expect(screen.getByTestId('level-progression-v1')).toBeInTheDocument()
  })

  it('readOnly esconde o botão de nível', () => {
    renderWithSheetContext(<HeaderV2 {...props} />, { readOnly: true })
    expect(screen.queryByRole('button', { name: /▲ Nível/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: FAIL. Step 3: Implement.** Botão **"▲ Nível"** no header (só `!readOnly`) abre `EditDialog size="full" title="Progressão"` com `LevelProgression` — props copiadas VERBATIM de `SheetContent.jsx:361-373`: `character`, `classData`, `classes`, `onLevelChange={lvl => updateInfo('level', lvl)}`, `onApplyLevelUp={handlers.handleApplyLevelUp}`, `onAddMulticlass`, `onRemoveMulticlass`, `onChosenFeaturesChange={handlers.handleChosenFeaturesChange}`, `onNavigateToSpells` (do contexto — já salta o MainBox pra Magias via focusSpellId; ao usar, FECHE o dialog antes: embrulhe `onNavigateToSpells` num wrapper que chama `setOpen(false)` e depois o original), `allowMulticlass`/`allowFeats` de `meta.settings` (mesmas expressões do SheetContent).

- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `git commit -m "feat(ficha-v2): painel de progressao via botao Nivel"`

---

### Task 10: Verificação final da fase

- [ ] **Step 1:** `npx vitest run src/test/sheetV2-` (todos os arquivos v2) → PASS
- [ ] **Step 2:** `npm run test` (suíte completa) → PASS (flake conhecido: re-rodar isolado)
- [ ] **Step 3:** `npm run build` → verde
- [ ] **Step 4:** `npm run test:e2e` → 20/20 (toggle off, v1 intacto)
- [ ] **Step 5:** Verificação manual com `?sheetV2=1` no dev server: abrir cada editor (atributo, PV, dano/cura, CA, condições, identidade, perícias, configurações, progressão), aplicar uma edição de cada e conferir persistência visual. Em uma ficha de DM (readOnly), conferir que NENHUM editor abre.
- [ ] **Step 6:** Commit final se houver ajustes — `git commit -m "chore(ficha-v2): fase 2 verificada"`

## Fora deste plano

Re-skin visual dos componentes v1 embrulhados (os modais de identidade/perícias/progressão vão renderizar em estilo parchment dentro do dialog escuro — esperado; a ponte CSS da fase 3 resolve). Acento por classe, fusão da aba Ações, mobile e corte: fases 3–5.
