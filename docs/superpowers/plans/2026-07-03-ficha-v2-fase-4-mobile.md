# Ficha v2 — Fase 4: Mobile (bottom nav + barra compacta) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Em telas < lg, a ficha v2 vira navegação por abas na base da tela (alcance de polegar): `Ficha` (atributos+salvaguardas+sentidos+perícias), `Ações`, `Magias`, `Itens` e `Mais` (características, notas, utilitários), com header compacto no topo. Em ≥ lg, NADA muda.

**Architecture:** O `MainBox` ganha modo controlado (`activeTab`/`onTabChange` opcionais). O `SheetV2` ganha estado `mobileSection` + `BottomNav`; a alternância desktop/mobile é 100% CSS (`hidden lg:block` / `lg:hidden`) — sem media-query em JS, sem listener de resize (evita bugs de hidratação/rotate). Spec: `docs/superpowers/specs/2026-07-03-redesign-ficha-pagina-unica-design.md`. Pré-requisito: fases 1–3 mergeadas.

**Tech Stack:** React 19, Tailwind (utilitários de layout e breakpoints APENAS), tokens v2, Vitest + Testing Library, preview/resize pra verificação manual.

---

## ⚠️ Regras deste projeto

1. **NUNCA use utilitários de COR do Tailwind no v2** — cores via `v2-*`/`var(--v2-*)`. `hidden`, `lg:hidden`, `lg:block`, `fixed`, `bottom-0` etc. são layout: permitidos.
2. **Nenhum arquivo v1 é editado.**
3. Commits pequenos com trailer `Co-Authored-By:`; push é do controlador.
4. Alvos de toque ≥ 44px de altura na BottomNav e nos controles novos.
5. jsdom não aplica media queries — os testes verificam estrutura/props/aria; o comportamento responsivo real é verificado manualmente (Step de verificação visual) com viewport 375px.

---

### Task 1: MainBox controlado

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx`
- Test: adicionar casos em `src/test/sheetV2-MainBox.test.jsx`

- [ ] **Step 1: Write the failing tests** (adicionar ao describe existente):

```jsx
  it('modo controlado: activeTab manda e onTabChange recebe cliques', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    renderWithSheetContext(<MainBox activeTab="magias" onTabChange={onTabChange} />)
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Notas' }))
    expect(onTabChange).toHaveBeenCalledWith('notas')
    // não muda sozinho: continua controlado pelo prop
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })

  it('modo controlado: hideTablist esconde a barra de abas', () => {
    renderWithSheetContext(<MainBox activeTab="magias" onTabChange={() => {}} hideTablist />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: FAIL. Step 3: Implement.** Padrão controlado/não-controlado clássico:

```jsx
export function MainBox({ activeTab, onTabChange, hideTablist = false }) {
  const isControlled = activeTab !== undefined
  const [internalTab, setInternalTab] = useState('acoes')
  const tab = isControlled ? activeTab : internalTab
  const setTab = isControlled ? (id => onTabChange?.(id)) : setInternalTab
  ...
```

O efeito de `focusSpellId` continua chamando `setTab('magias')` (no modo controlado isso vira `onTabChange('magias')` — o pai decide). O tablist inteiro fica dentro de `{!hideTablist && (...)}`. O tabpanel: quando `hideTablist`, remova `role="tabpanel"`/`aria-labelledby` (não existe tab visível pra referenciar — deixe um `<fieldset>` simples com `aria-label` do rótulo da aba).

- [ ] **Step 4:** `npx vitest run src/test/sheetV2-MainBox.test.jsx` → todos PASS (os 4 antigos + 2 novos; os antigos provam que o modo não-controlado não regrediu). **Step 5: Commit** — `git commit -m "feat(ficha-v2): MainBox com modo controlado e hideTablist"`

---

### Task 2: BottomNav

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/BottomNav.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/tokens.css` (estilos da nav)
- Test: `src/test/sheetV2-BottomNav.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/sheetV2-BottomNav.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav, MOBILE_SECTIONS } from '../systems/dnd5e/components/CharacterSheet/v2/BottomNav'

describe('BottomNav', () => {
  it('renderiza as 5 seções e marca a ativa', () => {
    render(<BottomNav active="ficha" onChange={() => {}} />)
    expect(screen.getAllByRole('tab')).toHaveLength(MOBILE_SECTIONS.length)
    expect(screen.getByRole('tab', { name: 'Ficha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clique muda a seção', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BottomNav active="ficha" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Magias' }))
    expect(onChange).toHaveBeenCalledWith('magias')
  })

  it('navega com as setas (roving tabindex)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BottomNav active="ficha" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Ficha' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('acoes')
  })
})
```

- [ ] **Step 2: FAIL. Step 3: Implement**

```jsx
// src/systems/dnd5e/components/CharacterSheet/v2/BottomNav.jsx
/* eslint-disable react-refresh/only-export-components */
import { useRef } from 'react'

export const MOBILE_SECTIONS = [
  { id: 'ficha',      label: 'Ficha',  icon: '◆' },
  { id: 'acoes',      label: 'Ações',  icon: '⊛' },
  { id: 'magias',     label: 'Magias', icon: '✧' },
  { id: 'inventario', label: 'Itens',  icon: '◈' },
  { id: 'mais',       label: 'Mais',   icon: '≡' },
]

/**
 * Navegação inferior do mobile (< lg). Componente CONTROLADO: `active` + `onChange`.
 * Mesmo padrão de teclado do tablist do MainBox (roving tabindex + setas).
 */
export function BottomNav({ active, onChange }) {
  const refs = useRef({})

  function go(i) {
    const target = MOBILE_SECTIONS[(i + MOBILE_SECTIONS.length) % MOBILE_SECTIONS.length]
    onChange(target.id)
    queueMicrotask(() => refs.current[target.id]?.focus())
  }

  function onKeyDown(e) {
    const idx = MOBILE_SECTIONS.findIndex(s => s.id === active)
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); go(idx + 1); break
      case 'ArrowLeft':  e.preventDefault(); go(idx - 1); break
      case 'Home':       e.preventDefault(); go(0); break
      case 'End':        e.preventDefault(); go(MOBILE_SECTIONS.length - 1); break
      default:
    }
  }

  return (
    <nav className="v2-bottomnav lg:hidden" aria-label="Seções da ficha">
      <div role="tablist" aria-label="Seções da ficha" onKeyDown={onKeyDown} style={{ display: 'flex' }}>
        {MOBILE_SECTIONS.map(s => (
          <button
            key={s.id}
            ref={el => { refs.current[s.id] = el }}
            role="tab"
            type="button"
            className="v2-bottomnav-item"
            aria-selected={active === s.id}
            tabIndex={active === s.id ? 0 : -1}
            onClick={() => onChange(s.id)}
          >
            <span aria-hidden style={{ fontSize: 16 }}>{s.icon}</span>
            <span style={{ fontSize: 11 }}>{s.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
```

E em `tokens.css`:

```css
.sheet-v2 .v2-bottomnav,
.v2-bottomnav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 40;
  background: var(--v2-surface-1);
  border-top: 1px solid var(--v2-border);
  padding-bottom: env(safe-area-inset-bottom);
}
.v2-bottomnav-item {
  flex: 1;
  min-height: 52px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border: 0; background: transparent; color: var(--v2-text-2); cursor: pointer;
}
.v2-bottomnav-item[aria-selected='true'] { color: var(--v2-accent); }
```

(Nota: a nav é renderizada DENTRO do div `.sheet-v2`, então as vars existem; o seletor duplo cobre o teste isolado.)

- [ ] **Step 4:** `npx vitest run src/test/sheetV2-BottomNav.test.jsx` → PASS. **Step 5: Commit** — `git commit -m "feat(ficha-v2): bottom nav mobile com 5 secoes"`

---

### Task 3: SheetV2 responsivo

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx`, `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx`
- Test: `src/test/sheetV2-SheetV2-mobile.test.jsx`

- [ ] **Step 1: Write the failing test** (estrutura, não media query — os DOIS layouts coexistem no DOM e o CSS esconde um deles):

```jsx
// src/test/sheetV2-SheetV2-mobile.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/Attacks', () => ({ Attacks: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CombatClassActions', () => ({ CombatClassActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/ManeuversPanel', () => ({ ManeuversPanel: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Spells', () => ({ Spells: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Inventory', () => ({ Inventory: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/FeaturesTab', () => ({ FeaturesTab: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Notes', () => ({ Notes: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel', () => ({ ArtificerInfusionsPanel: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({ CharacterInfo: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/SkillsList', () => ({ SkillsList: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/LevelProgression', () => ({ LevelProgression: () => <div /> }))
vi.mock('../systems/dnd5e/components/SourcePicker', () => ({ SourcePicker: () => <div /> }))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => [] }))

import { SheetV2 } from '../systems/dnd5e/components/CharacterSheet/v2/SheetV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, onImport: noop, onImportError: noop, saving: false, saved: false, saveError: null }

describe('SheetV2 — mobile', () => {
  it('renderiza a BottomNav e o container mobile', () => {
    renderWithSheetContext(<SheetV2 {...props} />)
    expect(screen.getByRole('tablist', { name: 'Seções da ficha' })).toBeInTheDocument()
  })

  it('trocar seção na BottomNav troca o conteúdo mobile', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<SheetV2 {...props} />)
    const nav = screen.getByRole('tablist', { name: 'Seções da ficha' })
    await user.click(within(nav).getByRole('tab', { name: 'Magias' }))
    expect(within(nav).getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: FAIL. Step 3: Implement no SheetV2:**
  1. Estado `const [mobileSection, setMobileSection] = useState('ficha')`.
  2. O layout desktop atual (faixa + grid de 3 colunas) fica dentro de `<div className="hidden lg:block">` (o header fica FORA — é compartilhado).
  3. Novo bloco `<div className="lg:hidden" style={{ paddingBottom: 72 }}>` com o conteúdo mobile por seção:
     - `ficha`: `<AbilityStrip />` + `<SavesPanel />` + `<SensesPanel />` + `<ProficienciesPanel />` + `<SkillsPanel />` empilhados (`space-y-3`)
     - `acoes` / `magias` / `inventario`: `<MainBox activeTab={mobileSection} onTabChange={setMobileSection} hideTablist />` — um único MainBox controlado renderiza a aba correspondente
     - `mais`: `<MainBox activeTab="caracteristicas" ... hideTablist />` + `<MainBox activeTab="notas" ... hideTablist />`? NÃO — dois MainBox duplicam hooks pesados. Em vez disso: estado auxiliar `maisTab` ('caracteristicas'|'notas') com dois chips de alternância + um MainBox controlado `activeTab={maisTab}` `hideTablist`.
     - IMPORTANTE: use UM ÚNICO `<MainBox>` no bloco mobile (mapeie `mobileSection`→aba: acoes→'acoes', magias→'magias', inventario→'inventario', mais→maisTab; na seção 'ficha' o MainBox mobile não renderiza).
  4. `<BottomNav active={mobileSection} onChange={setMobileSection} />` no final do root `.sheet-v2`.
  5. O efeito de `focusSpellId` do MainBox controlado chama `onTabChange('magias')` — que aqui seta `mobileSection='magias'`. Confirme que no desktop (`hidden lg:block`) o MainBox NÃO-controlado continua como está (dois MainBox no DOM: um desktop não-controlado, um mobile controlado — aceitável; se os hooks pesados duplicados incomodarem (useLazySrdDataset é cache), anote e siga).
  6. **HeaderV2 compacto**: em < lg, esconder com `hidden sm:flex`/`lg:flex` os botões Exportar/Imprimir/Descansos e o resumo textual (mantendo: voltar, nome, PV, dano/cura, chips de condições). Os botões escondidos ficam acessíveis pela seção "Mais": SheetV2 passa `onExport`/`onPrint` também pra um bloco de utilitários renderizado na seção 'mais' (botões v2-btn: Exportar, Imprimir, Descansos abre o mesmo details/dialog, Configurações, ▲ Nível).

- [ ] **Step 4:** `npx vitest run src/test/sheetV2-SheetV2-mobile.test.jsx src/test/sheetV2-SheetV2.test.jsx` → PASS (o smoke da fase 1 pode precisar de `getAllByRole('tab')` com contagem ajustada — agora existem os tabs do MainBox desktop + BottomNav; ajuste o assert antigo para `within` no quadro desktop, mantendo a intenção).

- [ ] **Step 5: Verificação manual OBRIGATÓRIA** no dev server com `?sheetV2=1`:
  - Viewport 375×812: bottom nav presente, cada seção renderiza, alvos ≥ 44px, nada escondido sob a nav (padding-bottom), header compacto sem overflow horizontal.
  - Viewport 1280×800: layout desktop IDÊNTICO ao da fase 3 (bottom nav invisível).
  - Rotacionar (landscape 812×375): usável.

- [ ] **Step 6: Commit** — `git commit -m "feat(ficha-v2): layout mobile com bottom nav e header compacto"`

---

### Task 4: Verificação final da fase

- [ ] **Step 1:** `npm run test` → PASS (flake conhecido: re-rodar isolado). **Step 2:** `npm run build` → verde. **Step 3:** `npm run test:e2e` → verde (toggle off).
- [ ] **Step 4:** Passada manual mobile completa (viewport 375px): jogar um "turno" — olhar perícia na seção Ficha, usar recurso na Ações, gastar espaço na Magias, aplicar dano pelo header. Sem beco sem saída de navegação.
- [ ] **Step 5:** Commit final — `git commit -m "chore(ficha-v2): fase 4 verificada (mobile)"`

## Fora deste plano

Gestos de swipe entre seções (descartado no design); corte do v1 (fase 5).
