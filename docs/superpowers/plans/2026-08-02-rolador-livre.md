# Rolador livre no painel de dados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir rolar um dado qualquer (tipo + quantidade + modificador) direto do painel flutuante de rolagens, sem depender do que está pré-definido na ficha.

**Architecture:** Uma faixa nova (`QuickRollBar`) dentro do `DiceHistoryPanel`, apoiada num módulo puro (`quickRoll.js`) que cuida de montar a notação, prender a quantidade na faixa 1–20 e lembrar a última escolha no `localStorage`. A faixa não fala com o motor de rolagem: chama o `roll()` do `DiceRollerContext`, o mesmo que perícias e ataques usam, herdando dados 3D, histórico e o modo vantagem/desvantagem pendente.

**Tech Stack:** React 19, Vite, Vitest + Testing Library, Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-08-02-rolador-livre-design.md](../specs/2026-08-02-rolador-livre-design.md)

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/components/DiceRoller/quickRoll.js` | **novo** — lógica pura: notação, clamp, leitura/escrita da preferência. Sem React. |
| `src/components/DiceRoller/QuickRollBar.jsx` | **novo** — só UI e estado local; delega toda regra ao módulo acima. |
| `src/components/DiceRoller/DiceHistoryPanel.jsx` | modificado — monta `<QuickRollBar />` entre o bloco de modo e o histórico. |
| `src/test/quickRoll.test.js` | **novo** — testes do módulo puro. |
| `src/test/QuickRollBar.test.jsx` | **novo** — testes do componente (contexto falso). |
| `src/test/integration/dice.test.jsx` | modificado — um teste de ponta a ponta com o provider real. |

Separar o módulo puro do componente é deliberado: as três regras que podem dar errado (montagem da notação, clamp, preferência corrompida) ficam testáveis sem renderizar nada.

**Nada mais muda.** `useDiceRoller.js`, `DiceRollerContext.jsx` e `dice3d.js` ficam intocados — a faixa é só mais um call site do `roll()`.

---

### Task 1: Módulo puro — notação e clamp

**Files:**
- Create: `src/components/DiceRoller/quickRoll.js`
- Test: `src/test/quickRoll.test.js`

- [ ] **Step 1: Escreva os testes que falham**

Crie `src/test/quickRoll.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildNotation, clampCount, parseMod, QUICK_ROLL_SIDES } from '../components/DiceRoller/quickRoll'

describe('QUICK_ROLL_SIDES', () => {
  it('oferece só lados que a lib 3D sabe animar', () => {
    expect(QUICK_ROLL_SIDES).toEqual([4, 6, 8, 10, 12, 20, 100])
  })
})

describe('buildNotation', () => {
  it('omite o modificador quando é zero', () => {
    expect(buildNotation({ count: 1, sides: 20, mod: 0 })).toBe('1d20')
  })

  it('soma modificador positivo com sinal explícito', () => {
    expect(buildNotation({ count: 3, sides: 6, mod: 2 })).toBe('3d6+2')
  })

  it('mantém o sinal do modificador negativo', () => {
    expect(buildNotation({ count: 2, sides: 8, mod: -1 })).toBe('2d8-1')
  })

  it('prende a quantidade antes de montar', () => {
    expect(buildNotation({ count: 99, sides: 6, mod: 0 })).toBe('20d6')
  })
})

describe('clampCount', () => {
  it('prende no mínimo 1', () => {
    expect(clampCount(0)).toBe(1)
    expect(clampCount(-5)).toBe(1)
  })

  it('prende no máximo 20', () => {
    expect(clampCount(21)).toBe(20)
    expect(clampCount(999)).toBe(20)
  })

  it('devolve o mínimo para texto vazio ou lixo', () => {
    expect(clampCount('')).toBe(1)
    expect(clampCount('abc')).toBe(1)
  })

  it('trunca decimal', () => {
    expect(clampCount(3.7)).toBe(3)
  })
})

describe('parseMod', () => {
  it('trata vazio como zero', () => {
    expect(parseMod('')).toBe(0)
    expect(parseMod('   ')).toBe(0)
  })

  it('aceita o + explícito', () => {
    expect(parseMod('+2')).toBe(2)
  })

  it('aceita negativo', () => {
    expect(parseMod('-1')).toBe(-1)
  })

  it('trata lixo como zero', () => {
    expect(parseMod('x')).toBe(0)
  })
})
```

- [ ] **Step 2: Rode e veja falhar**

```bash
npx vitest run src/test/quickRoll.test.js --maxWorkers=2
```

Esperado: FAIL — `Failed to resolve import ".../quickRoll"`.

- [ ] **Step 3: Implemente o módulo**

Crie `src/components/DiceRoller/quickRoll.js`:

```js
/**
 * Regra pura do rolador livre — sem React, sem contexto.
 *
 * Os sete tipos oferecidos são exatamente os que a lib 3D sabe animar
 * (DICE3D_SIDES em dice3d.js): nenhuma rolagem saída daqui cai no fluxo
 * sem animação.
 */
export const QUICK_ROLL_SIDES = [4, 6, 8, 10, 12, 20, 100]

export const MIN_COUNT = 1
export const MAX_COUNT = 20

/** Quantidade sempre inteira dentro de [1, 20]; texto vazio ou lixo vira 1. */
export function clampCount(value) {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return MIN_COUNT
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, n))
}

/** Modificador: aceita "", "2", "+2", "-1". Qualquer outra coisa é 0. */
export function parseMod(value) {
  const n = Math.trunc(Number(String(value).trim()))
  return Number.isFinite(n) ? n : 0
}

/** "3d6+2" — formato que o parseAndRoll já entende. */
export function buildNotation({ count, sides, mod = 0 }) {
  const base = `${clampCount(count)}d${sides}`
  if (!mod) return base
  return mod > 0 ? `${base}+${mod}` : `${base}${mod}`
}
```

Nota: `Number('')` é `0` e `Number('  ')` é `0`, então vazio cai em zero sem tratamento especial; `Number('abc')` é `NaN` e cai no guarda de `Number.isFinite`.

- [ ] **Step 4: Rode e veja passar**

```bash
npx vitest run src/test/quickRoll.test.js --maxWorkers=2
```

Esperado: PASS, 12 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiceRoller/quickRoll.js src/test/quickRoll.test.js
git commit -m "feat(dados): regra pura do rolador livre (notacao + clamp)"
```

---

### Task 2: Preferência persistida

**Files:**
- Modify: `src/components/DiceRoller/quickRoll.js`
- Modify: `src/test/quickRoll.test.js`

- [ ] **Step 1: Escreva os testes que falham**

Acrescente ao topo de `src/test/quickRoll.test.js` o import (substituindo a linha de import existente):

```js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildNotation, clampCount, parseMod, QUICK_ROLL_SIDES,
  readQuickRollPref, writeQuickRollPref, QUICK_ROLL_KEY,
} from '../components/DiceRoller/quickRoll'
```

E acrescente ao fim do arquivo:

```js
describe('preferência persistida', () => {
  beforeEach(() => {
    window.localStorage.removeItem(QUICK_ROLL_KEY)
  })

  it('sem nada guardado, devolve d20 x1 sem modificador', () => {
    expect(readQuickRollPref()).toEqual({ sides: 20, count: 1, mod: 0 })
  })

  it('lê de volta o que gravou', () => {
    writeQuickRollPref({ sides: 6, count: 8, mod: -1 })
    expect(readQuickRollPref()).toEqual({ sides: 6, count: 8, mod: -1 })
  })

  it('JSON corrompido cai no padrão', () => {
    window.localStorage.setItem(QUICK_ROLL_KEY, '{isso não é json')
    expect(readQuickRollPref()).toEqual({ sides: 20, count: 1, mod: 0 })
  })

  it('lado desconhecido cai no d20', () => {
    window.localStorage.setItem(QUICK_ROLL_KEY, JSON.stringify({ sides: 7, count: 2, mod: 0 }))
    expect(readQuickRollPref().sides).toBe(20)
  })

  it('quantidade fora da faixa é presa na leitura', () => {
    window.localStorage.setItem(QUICK_ROLL_KEY, JSON.stringify({ sides: 6, count: 999, mod: 0 }))
    expect(readQuickRollPref().count).toBe(20)
  })
})
```

- [ ] **Step 2: Rode e veja falhar**

```bash
npx vitest run src/test/quickRoll.test.js --maxWorkers=2
```

Esperado: FAIL — `readQuickRollPref is not a function`.

- [ ] **Step 3: Implemente**

Acrescente ao fim de `src/components/DiceRoller/quickRoll.js`:

```js
export const QUICK_ROLL_KEY = 'dnd-ficha:quickroll'

const DEFAULTS = { sides: 20, count: MIN_COUNT, mod: 0 }

/**
 * Última escolha do usuário. Nunca confia no que está guardado: valor
 * corrompido, lado desconhecido ou quantidade fora da faixa caem no padrão —
 * mesmo tratamento das outras chaves do app (dnd-ficha:dice3d, :fab-dice).
 */
export function readQuickRollPref() {
  try {
    const raw = window.localStorage.getItem(QUICK_ROLL_KEY)
    if (!raw) return { ...DEFAULTS }
    const saved = JSON.parse(raw)
    return {
      sides: QUICK_ROLL_SIDES.includes(saved?.sides) ? saved.sides : DEFAULTS.sides,
      count: clampCount(saved?.count),
      mod: parseMod(saved?.mod ?? 0),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeQuickRollPref({ sides, count, mod }) {
  try {
    window.localStorage.setItem(QUICK_ROLL_KEY, JSON.stringify({ sides, count, mod }))
  } catch { /* storage indisponível — a preferência é conveniência, não estado */ }
}
```

- [ ] **Step 4: Rode e veja passar**

```bash
npx vitest run src/test/quickRoll.test.js --maxWorkers=2
```

Esperado: PASS, 17 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiceRoller/quickRoll.js src/test/quickRoll.test.js
git commit -m "feat(dados): rolador livre lembra a ultima escolha"
```

---

### Task 3: O componente `QuickRollBar`

**Files:**
- Create: `src/components/DiceRoller/QuickRollBar.jsx`
- Test: `src/test/QuickRollBar.test.jsx`

- [ ] **Step 1: Escreva os testes que falham**

Crie `src/test/QuickRollBar.test.jsx`. Os testes usam um contexto **falso** (`DiceRollerContext.Provider` com um `roll` espionado) — o objetivo aqui é a faixa, não o motor:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceRollerContext } from '../hooks/useDiceRoller'
import { QuickRollBar } from '../components/DiceRoller/QuickRollBar'
import { QUICK_ROLL_KEY } from '../components/DiceRoller/quickRoll'

function setup() {
  const roll = vi.fn()
  const view = render(
    <DiceRollerContext.Provider value={{ roll }}>
      <QuickRollBar />
    </DiceRollerContext.Provider>,
  )
  return { roll, view }
}

beforeEach(() => {
  window.localStorage.removeItem(QUICK_ROLL_KEY)
})

describe('QuickRollBar', () => {
  it('começa em 1d20 e mostra a notação no botão', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Rolar 1d20' })).toBeInTheDocument()
  })

  it('marca o tipo selecionado com aria-pressed', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByRole('button', { name: 'd20' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'd6' }))
    expect(screen.getByRole('button', { name: 'd6' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'd20' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('monta tipo + quantidade + modificador', async () => {
    const user = userEvent.setup()
    const { roll } = setup()
    await user.click(screen.getByRole('button', { name: 'd6' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.type(screen.getByRole('textbox', { name: 'Modificador' }), '2')
    await user.click(screen.getByRole('button', { name: 'Rolar 3d6+2' }))
    expect(roll).toHaveBeenCalledWith('3d6+2', 'Rolagem livre')
  })

  it('aceita modificador negativo', async () => {
    const user = userEvent.setup()
    const { roll } = setup()
    await user.click(screen.getByRole('button', { name: 'd8' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.type(screen.getByRole('textbox', { name: 'Modificador' }), '-1')
    await user.click(screen.getByRole('button', { name: 'Rolar 2d8-1' }))
    expect(roll).toHaveBeenCalledWith('2d8-1', 'Rolagem livre')
  })

  it('não deixa a quantidade passar de 20 nem descer de 1', async () => {
    const user = userEvent.setup()
    setup()
    const mais  = screen.getByRole('button', { name: 'Aumentar quantidade' })
    const menos = screen.getByRole('button', { name: 'Diminuir quantidade' })
    for (let i = 0; i < 25; i++) await user.click(mais)
    expect(screen.getByRole('button', { name: 'Rolar 20d20' })).toBeInTheDocument()
    for (let i = 0; i < 30; i++) await user.click(menos)
    expect(screen.getByRole('button', { name: 'Rolar 1d20' })).toBeInTheDocument()
  })

  it('normaliza quantidade digitada fora da faixa ao sair do campo', async () => {
    const user = userEvent.setup()
    setup()
    const campo = screen.getByRole('textbox', { name: 'Quantidade de dados' })
    await user.clear(campo)
    await user.type(campo, '99')
    await user.tab()
    expect(campo).toHaveValue('20')
  })

  it('guarda a escolha e a retoma na montagem seguinte', async () => {
    const user = userEvent.setup()
    const { view } = setup()
    await user.click(screen.getByRole('button', { name: 'd6' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    view.unmount()

    render(
      <DiceRollerContext.Provider value={{ roll: vi.fn() }}>
        <QuickRollBar />
      </DiceRollerContext.Provider>,
    )
    expect(screen.getByRole('button', { name: 'Rolar 2d6' })).toBeInTheDocument()
  })

  it('não passa opts para o roll (rolagem livre não recebe buffs)', async () => {
    const user = userEvent.setup()
    const { roll } = setup()
    await user.click(screen.getByRole('button', { name: 'Rolar 1d20' }))
    expect(roll).toHaveBeenCalledTimes(1)
    expect(roll.mock.calls[0]).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Rode e veja falhar**

```bash
npx vitest run src/test/QuickRollBar.test.jsx --maxWorkers=2
```

Esperado: FAIL — `Failed to resolve import ".../QuickRollBar"`.

- [ ] **Step 3: Implemente o componente**

Crie `src/components/DiceRoller/QuickRollBar.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useDiceRoller } from '../../hooks/useDiceRoller'
import { Button } from '../ui/Button'
import {
  QUICK_ROLL_SIDES, buildNotation, clampCount, parseMod,
  readQuickRollPref, writeQuickRollPref,
} from './quickRoll'

/**
 * Rolagem livre dentro do painel: escolhe tipo, quantidade e modificador.
 *
 * Não conhece o motor de dados — chama o mesmo `roll()` que perícias e ataques
 * usam, e com isso herda dados 3D, entrada no histórico e o modo pendente
 * (vantagem/desvantagem) sem uma linha de regra própria.
 *
 * A quantidade é guardada como TEXTO enquanto o usuário digita (pra ele poder
 * apagar o campo) e só é presa na faixa 1–20 na hora de usar; o blur devolve o
 * valor normalizado pro campo.
 */
export function QuickRollBar() {
  const { roll } = useDiceRoller()
  const [saved] = useState(readQuickRollPref)
  const [sides, setSides] = useState(saved.sides)
  const [countText, setCountText] = useState(String(saved.count))
  const [modText, setModText] = useState(saved.mod ? String(saved.mod) : '')

  const count = clampCount(countText)
  const mod = parseMod(modText)
  const notation = buildNotation({ count, sides, mod })

  useEffect(() => { writeQuickRollPref({ sides, count, mod }) }, [sides, count, mod])

  const chip = (active) => [
    'text-xs font-bold py-1 rounded border transition-all',
    active
      ? 'border-ink-300 bg-parchment-50 text-ink-500 shadow-inner'
      : 'border-parchment-600 text-ink-200 hover:border-ink-300 hover:text-ink-500',
  ].join(' ')

  const stepper = 'px-2 py-0.5 text-sm font-bold text-ink-200 hover:text-ink-500 transition-colors'

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-parchment-600 bg-parchment-100 shrink-0">
      <div className="grid grid-cols-7 gap-1">
        {QUICK_ROLL_SIDES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSides(s)}
            aria-pressed={sides === s}
            className={chip(sides === s)}
          >
            d{s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center rounded border border-parchment-600 bg-parchment-50 shrink-0">
          <button
            type="button"
            onClick={() => setCountText(String(clampCount(count - 1)))}
            aria-label="Diminuir quantidade"
            className={stepper}
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Quantidade de dados"
            value={countText}
            onChange={e => setCountText(e.target.value)}
            onBlur={() => setCountText(String(count))}
            className="w-7 bg-transparent text-center text-xs font-mono text-ink-500 outline-none"
          />
          <button
            type="button"
            onClick={() => setCountText(String(clampCount(count + 1)))}
            aria-label="Aumentar quantidade"
            className={stepper}
          >
            +
          </button>
        </div>

        <input
          type="text"
          inputMode="numeric"
          aria-label="Modificador"
          placeholder="mod"
          value={modText}
          onChange={e => setModText(e.target.value)}
          className="w-10 shrink-0 rounded border border-parchment-600 bg-parchment-50 px-1 py-0.5
            text-center text-xs font-mono text-ink-500 outline-none placeholder:text-ink-200"
        />

        <Button
          size="sm"
          className="flex-1 truncate"
          aria-label={`Rolar ${notation}`}
          onClick={() => roll(notation, 'Rolagem livre')}
        >
          Rolar {notation}
        </Button>
      </div>
    </div>
  )
}
```

O botão usa o primitivo `Button` (`variant` fica no padrão `primary`), que resolve a affordance no tema escuro via `.ui-btn` — pintar com utilitário de cor direto seria achatado pela ponte `legacy-bridge.css`.

- [ ] **Step 4: Rode e veja passar**

```bash
npx vitest run src/test/QuickRollBar.test.jsx --maxWorkers=2
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiceRoller/QuickRollBar.jsx src/test/QuickRollBar.test.jsx
git commit -m "feat(dados): faixa de rolagem livre (tipo, quantidade, modificador)"
```

---

### Task 4: Montar a faixa no painel

**Files:**
- Modify: `src/components/DiceRoller/DiceHistoryPanel.jsx`
- Modify: `src/test/integration/dice.test.jsx`

- [ ] **Step 1: Escreva o teste de integração que falha**

Acrescente ao fim do `describe('DiceRoller E2E', ...)` em `src/test/integration/dice.test.jsx`:

```jsx
  it('rolagem livre do painel entra no histórico', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText(/Abrir histórico/))
    await user.click(screen.getByRole('button', { name: 'd6' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.click(screen.getByRole('button', { name: 'Rolar 2d6' }))
    expect(await screen.findByText('Rolagem livre')).toBeInTheDocument()
    // Math.random alterna 0.95/0.05 → 6 + 1 = 7
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1)
  })
```

- [ ] **Step 2: Rode e veja falhar**

```bash
npx vitest run src/test/integration/dice.test.jsx --maxWorkers=2
```

Esperado: FAIL — não existe botão com nome `d6` no painel.

- [ ] **Step 3: Monte o componente no painel**

Em `src/components/DiceRoller/DiceHistoryPanel.jsx`, acrescente o import junto dos demais do topo:

```jsx
import { QuickRollBar } from './QuickRollBar'
```

E insira `<QuickRollBar />` **entre** o bloco de modo e o bloco do histórico — logo depois do `</div>` que fecha a fileira "Próxima:" e antes do comentário `{/* ── Histórico ── */}`:

```jsx
      {/* ── Rolagem livre ─────────────────────────────────────── */}
      <QuickRollBar />

      {/* ── Histórico ─────────────────────────────────────────── */}
```

- [ ] **Step 4: Rode e veja passar**

```bash
npx vitest run src/test/integration/dice.test.jsx --maxWorkers=2
```

Esperado: PASS, 8 testes (os 7 que já existiam + o novo).

- [ ] **Step 5: Commit**

```bash
git add src/components/DiceRoller/DiceHistoryPanel.jsx src/test/integration/dice.test.jsx
git commit -m "feat(dados): rolador livre aparece no painel de rolagens"
```

---

### Task 5: Verificação e entrega

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Rode a fatia de testes do sistema de dados**

```bash
npx vitest run src/test/quickRoll.test.js src/test/QuickRollBar.test.jsx src/test/integration/dice.test.jsx src/test/DiceRoller3d.test.jsx src/test/DiceHistoryPanel3d.test.jsx src/test/dice3d.test.js src/test/diceRoller-effects.test.jsx --maxWorkers=2
```

Esperado: todos verdes. Rodar por fatia é obrigatório — `npx vitest run` sem flags estoura a memória da máquina e produz falhas fantasma em arquivos sem relação.

- [ ] **Step 2: Rode a fatia da ficha v2 (quem mais consome o painel)**

```bash
npx vitest run src/test/sheetV2-roll-rows.test.jsx src/test/sheetV2-RollableRow.test.jsx src/test/sheetV2-dice-accent.test.jsx src/test/AttackRollButton.test.jsx --maxWorkers=2
```

Esperado: todos verdes, sem mudança de comportamento (nenhum deles toca a faixa nova).

- [ ] **Step 3: Lint dos arquivos novos**

```bash
npx eslint src/components/DiceRoller/quickRoll.js src/components/DiceRoller/QuickRollBar.jsx src/components/DiceRoller/DiceHistoryPanel.jsx
```

Esperado: zero erro **nos arquivos novos**. O projeto tem ~611 erros pré-existentes de lint em outros arquivos (débito antigo, não regressão) — não tente consertá-los aqui.

- [ ] **Step 4: Confira na tela**

Suba o preview e abra o painel 🎲: a faixa aparece abaixo de "Próxima:", os sete chips cabem numa linha só na largura de 288px, e o botão mostra a notação. Rolar `2d6` deve animar dois d6 no tabuleiro 3D e cair no histórico como "Rolagem livre".

- [ ] **Step 5: Push**

```bash
git push
```

Já estamos na `master`; o push dispara o deploy de produção.

---

## Notas para quem executa

- **Não mexa em `parseAndRoll`.** Ele já entende `3d6+2`; qualquer mudança ali afeta perícias, ataques, magias e dados de vida.
- **Não passe `opts` para o `roll()`.** Sem `category` é o que mantém os buffs de efeitos ativos fora da rolagem livre, e é comportamento testado na Task 3.
- **Vantagem em `3d6` não faz nada** — e está certo. O `parseAndRoll` só aplica adv/dis quando o primeiro grupo é exatamente `1d20` (PHB p.173). O modo pendente ainda assim é consumido e volta pra `normal`, porque quem reseta é o provider, não a faixa.
- Se um teste de arquivo sem relação falhar, suspeite da memória antes de suspeitar do código: rode aquele arquivo sozinho com `--maxWorkers=2`.
