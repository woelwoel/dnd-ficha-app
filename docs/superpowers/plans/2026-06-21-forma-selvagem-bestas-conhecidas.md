# Forma Selvagem restrita a bestas conhecidas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o druida só conseguir se transformar em bestas que já viu, com a lista de bestas conhecidas vivendo na própria ficha e marcada pelo jogador.

**Architecture:** Um campo persistente `combat.knownBeasts` (array de `index` do catálogo `wild-shape-beasts-pt.json`) guarda as bestas vistas. O `BeastPicker` da Forma Selvagem mostra todas as elegíveis por CR/movimento, mas só deixa transformar nas conhecidas — as demais aparecem bloqueadas com botão "já vi essa". Um painel novo `KnownBeastsPanel`, ancorado na ficha do druida, permite curadoria/marcação em lote. O bestiário global (`BestiaryModal`) não é tocado.

**Tech Stack:** React (hooks), Zod (schema da ficha), Vitest + Testing Library, Tailwind. Estado da ficha gerido por `useCharacter` (mutações via `setCharacter` que carimba `meta.updatedAt`).

---

## Estrutura de arquivos

- `src/domain/characterSchema.js` — adiciona `combat.knownBeasts` (default `[]`).
- `src/hooks/useCharacter.js` — adiciona e exporta a mutação `toggleKnownBeast`.
- `src/components/CharacterSheet/WildShapePanel.jsx` — `BeastPicker` passa a distinguir besta conhecida (transformável) de não conhecida (bloqueada + "já vi essa"); recebe `onToggleKnownBeast` e lê `knownBeasts` da ficha.
- `src/components/CharacterSheet/KnownBeastsPanel.jsx` — **novo**: visão de curadoria (lista de bestas com toggle conhecida/não conhecida).
- `src/components/CharacterSheet/CombatClassActions.jsx` — passa `onToggleKnownBeast` ao `WildShapePanel` e renderiza o `KnownBeastsPanel` (druida nv 2+).
- `src/components/CharacterSheet/SheetContent.jsx` — fia `onToggleKnownBeast={toggleKnownBeast}` no `CombatClassActions`.
- Testes: `src/test/knownBeasts-schema.test.js` (novo), `src/test/WildShapePanel.test.jsx` (ajustes + novos casos), `src/test/KnownBeastsPanel.test.jsx` (novo), `src/test/integration/classActions.test.jsx` (ajuste do fluxo de transformação).

**Sem bump de cache do SW:** nenhum arquivo em `public/srd-data` é alterado (só lido). Logo não precisa mexer no `cacheName` em `vite.config.js`.

**Migração:** o default `[]` do Zod cobre druidas existentes — eles passam a ter a lista vazia automaticamente, sem função de migração extra. Comportamento desejado pelo spec (começam bloqueados até remarcar).

---

## Task 1: Campo `combat.knownBeasts` no schema

**Files:**
- Modify: `src/domain/characterSchema.js` (logo após `wildShape`, ~linha 188)
- Test: `src/test/knownBeasts-schema.test.js` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/knownBeasts-schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { characterSchema } from '../domain/characterSchema'

describe('combat.knownBeasts', () => {
  it('default é array vazio quando ausente', () => {
    const parsed = characterSchema.parse({})
    expect(parsed.combat.knownBeasts).toEqual([])
  })

  it('preserva índices de bestas fornecidos', () => {
    const parsed = characterSchema.parse({ combat: { knownBeasts: ['wolf', 'brown-bear'] } })
    expect(parsed.combat.knownBeasts).toEqual(['wolf', 'brown-bear'])
  })
})
```

> Nota: confirme o nome do export do schema em `src/domain/characterSchema.js` (provável `characterSchema`). Se for outro, ajuste o import.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/test/knownBeasts-schema.test.js`
Expected: FAIL — `knownBeasts` é `undefined` (campo não existe).

- [ ] **Step 3: Adicionar o campo no schema**

Em `src/domain/characterSchema.js`, logo depois do bloco `wildShape: z.any().default(false),`:

```js
  /**
   * Druida: bestas que o personagem já viu e pode assumir via Forma Selvagem
   * (PHB p.66). Guarda o `index` do catálogo wild-shape-beasts-pt.json.
   * Vazio por padrão — druida começa sem nenhuma besta conhecida.
   */
  knownBeasts: z.array(z.string()).default([]),
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/test/knownBeasts-schema.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/characterSchema.js src/test/knownBeasts-schema.test.js
git commit -m "feat(schema): combat.knownBeasts para Forma Selvagem"
```

---

## Task 2: Mutação `toggleKnownBeast` no hook

**Files:**
- Modify: `src/hooks/useCharacter.js` (adicionar callback perto de `setWildShape`, ~linha 648; exportar no objeto de retorno, ~linha 731)
- Test: `src/test/useCharacter-knownBeasts.test.js` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/useCharacter-knownBeasts.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../hooks/useCharacter'

describe('useCharacter.toggleKnownBeast', () => {
  it('adiciona índice ausente e remove índice presente', () => {
    const { result } = renderHook(() => useCharacter({ combat: { knownBeasts: [] } }))

    act(() => result.current.toggleKnownBeast('wolf'))
    expect(result.current.character.combat.knownBeasts).toContain('wolf')

    act(() => result.current.toggleKnownBeast('wolf'))
    expect(result.current.character.combat.knownBeasts).not.toContain('wolf')
  })

  it('não duplica índice já presente', () => {
    const { result } = renderHook(() => useCharacter({ combat: { knownBeasts: ['eagle'] } }))
    act(() => result.current.toggleKnownBeast('wolf'))
    expect(result.current.character.combat.knownBeasts).toEqual(['eagle', 'wolf'])
  })
})
```

> Nota: confirme em `src/hooks/useCharacter.js` o nome do estado retornado (provável `character`) e a assinatura `useCharacter(initialCharacter)`. Ajuste o teste se divergir.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/test/useCharacter-knownBeasts.test.js`
Expected: FAIL — `result.current.toggleKnownBeast is not a function`.

- [ ] **Step 3: Implementar a mutação**

Em `src/hooks/useCharacter.js`, logo após o `setWildShape` (~linha 653), adicionar:

```js
  /**
   * Liga/desliga uma besta na lista de conhecidas do druida (PHB p.66).
   * Adiciona se ausente, remove se presente. Marcação feita pelo jogador.
   */
  const toggleKnownBeast = useCallback(beastIndex => {
    setCharacter(prev => {
      const list = prev.combat?.knownBeasts ?? []
      const next = list.includes(beastIndex)
        ? list.filter(i => i !== beastIndex)
        : [...list, beastIndex]
      return { ...prev, combat: { ...prev.combat, knownBeasts: next } }
    })
  }, [setCharacter])
```

Depois, no objeto de retorno do hook (perto de `setWildShape,` ~linha 731), adicionar a linha:

```js
    toggleKnownBeast,
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/test/useCharacter-knownBeasts.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCharacter.js src/test/useCharacter-knownBeasts.test.js
git commit -m "feat(hook): toggleKnownBeast em useCharacter"
```

---

## Task 3: Picker distingue conhecida (transforma) de não conhecida (bloqueada)

**Files:**
- Modify: `src/components/CharacterSheet/WildShapePanel.jsx` (`BeastPicker` ~linhas 71-158; componente principal ~linhas 320-453)
- Test: `src/test/WildShapePanel.test.jsx` (ajustar makeChar + testes de filtro/seleção; adicionar 2 casos)

- [ ] **Step 1: Ajustar os testes existentes e escrever os novos (vão falhar)**

Em `src/test/WildShapePanel.test.jsx`:

(a) Ampliar `makeChar` para aceitar `knownBeasts`:

```js
function makeChar(overrides = {}) {
  return {
    info: { class: 'druida', level: 4, chosenFeatures: {}, ...overrides.info },
    combat: { wildShape: { active: false }, knownBeasts: [], ...overrides.combat },
  }
}
```

(b) No teste `'picker filtra bestas por CR e movimento permitido'`, passar todas como conhecidas para que a asserção continue medindo só o filtro de CR/movimento. Trocar o `char`:

```js
    const char = makeChar({ info: { level: 4 }, combat: { knownBeasts: ['wolf', 'brown-bear', 'eagle'] } })
```

(c) No teste `'nv 8 permite voo e CR 1'`, passar `character` com todas conhecidas:

```js
        onSpend={() => {}}
        character={makeChar({ info: { level: 8 }, combat: { knownBeasts: ['wolf', 'brown-bear', 'eagle'] } })}
        onSetWildShape={() => {}}
```

(d) No teste `'selecionar besta chama onSetWildShape e onSpend'`, tornar o Lobo conhecido:

```js
        onSpend={onSpend}
        character={makeChar({ combat: { knownBeasts: ['wolf'] } })}
        onSetWildShape={onSetWildShape}
```

(e) Adicionar dois casos novos no final do `describe`:

```js
  it('besta NÃO conhecida aparece bloqueada com botão "já vi essa"', async () => {
    const user = userEvent.setup()
    const onToggleKnownBeast = vi.fn()
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={() => {}} character={makeChar({ combat: { knownBeasts: [] } })}
        onSetWildShape={() => {}} onToggleKnownBeast={onToggleKnownBeast}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Transformar$/ }))
    // Lobo não conhecido: não há botão de transformar nele, mas há "já vi essa"
    const seenBtn = await screen.findByRole('button', { name: /já vi essa/i })
    await user.click(seenBtn)
    expect(onToggleKnownBeast).toHaveBeenCalledWith('wolf')
  })

  it('só bestas conhecidas são transformáveis', async () => {
    const user = userEvent.setup()
    const onSetWildShape = vi.fn()
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={() => {}} character={makeChar({ combat: { knownBeasts: ['wolf'] } })}
        onSetWildShape={onSetWildShape} onToggleKnownBeast={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Transformar$/ }))
    await user.click(await screen.findByRole('button', { name: /Lobo/ }))
    expect(onSetWildShape).toHaveBeenCalledWith(expect.objectContaining({ beastName: 'Lobo' }))
  })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/WildShapePanel.test.jsx`
Expected: FAIL — os casos novos falham (não existe botão "já vi essa"; `onToggleKnownBeast` não é usado).

- [ ] **Step 3: Implementar lock/unlock no picker**

Em `src/components/CharacterSheet/WildShapePanel.jsx`:

(a) `BeastPicker` passa a receber `knownSet` e `onMarkSeen`. Trocar a assinatura (~linha 71):

```js
function BeastPicker({ beasts, crLimit, allowFly, allowSwim, isMoon, knownSet, onSelect, onMarkSeen, onCancel }) {
```

(b) Trocar a renderização de cada item (o `<button>` interno do `list.map`, ~linhas 137-151) por uma versão que ramifica conhecida/não conhecida:

```js
              {list.map(b => {
                const known = knownSet.has(b.index)
                if (known) {
                  return (
                    <button
                      key={b.index}
                      onClick={() => onSelect(b)}
                      title={`${b.name} (${b.nameEn}) — HP ${b.hp} · AC ${b.ac} · ${formatSpeed(b.speed)}`}
                      className="text-left text-[13px] px-2 py-1.5 rounded border border-parchment-600 bg-parchment-50 hover:bg-emerald-50 hover:border-emerald-500 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink-500 truncate flex-1">{b.name}</span>
                        <span className="text-[13px] text-ink-300 font-mono shrink-0">HP{b.hp}</span>
                        <span className="text-[13px] text-ink-300 font-mono shrink-0">AC{b.ac}</span>
                      </div>
                      <div className="text-[13px] text-ink-300 italic truncate">{formatSpeed(b.speed)}</div>
                    </button>
                  )
                }
                return (
                  <div
                    key={b.index}
                    title={`${b.name} (${b.nameEn}) — ainda não vista`}
                    className="text-left text-[13px] px-2 py-1.5 rounded border border-dashed border-parchment-600 bg-parchment-100/50 opacity-70"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-ink-300 truncate flex-1">🔒 {b.name}</span>
                      <button
                        onClick={() => onMarkSeen(b.index)}
                        className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-700 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 font-bold shrink-0"
                      >
                        já vi essa
                      </button>
                    </div>
                    <div className="text-[13px] text-ink-300 italic truncate">{formatSpeed(b.speed)}</div>
                  </div>
                )
              })}
```

(c) No componente principal `WildShapePanel`, adicionar `onToggleKnownBeast` aos props (~linha 329, junto de `onConsumeSlot,`):

```js
  onToggleKnownBeast,
```

(d) Derivar o set de conhecidas perto dos outros derivados (~linha 343, depois de `const isMoon = ...`):

```js
  const knownSet = useMemo(
    () => new Set(character.combat?.knownBeasts ?? []),
    [character.combat?.knownBeasts]
  )
```

(e) Passar as novas props ao `BeastPicker` no JSX (~linhas 444-452):

```js
        <BeastPicker
          beasts={beasts}
          crLimit={crLimit}
          allowFly={movement.fly}
          allowSwim={movement.swim}
          isMoon={isMoon}
          knownSet={knownSet}
          onSelect={selectBeast}
          onMarkSeen={onToggleKnownBeast}
          onCancel={() => setShowPicker(false)}
        />
```

> `useMemo` já está importado no arquivo (linha 1). Nenhum import novo necessário.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/WildShapePanel.test.jsx`
Expected: PASS (todos, incluindo os 2 novos).

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet/WildShapePanel.jsx src/test/WildShapePanel.test.jsx
git commit -m "feat(forma-selvagem): só transforma em bestas conhecidas; bloqueia o resto com 'já vi essa'"
```

---

## Task 4: Painel de curadoria `KnownBeastsPanel`

**Files:**
- Create: `src/components/CharacterSheet/KnownBeastsPanel.jsx`
- Test: `src/test/KnownBeastsPanel.test.jsx` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/KnownBeastsPanel.test.jsx`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KnownBeastsPanel } from '../components/CharacterSheet/KnownBeastsPanel'

const BEASTS_FIXTURE = {
  beasts: [
    { index: 'wolf', name: 'Lobo', nameEn: 'Wolf', cr: 0.25, crLabel: '1/4', hp: 11, ac: 13,
      speed: { walk: { ft: 40, m: 12, label: 'caminhar' } } },
    { index: 'eagle', name: 'Águia', nameEn: 'Eagle', cr: 0, crLabel: '0', hp: 3, ac: 12,
      speed: { walk: { ft: 10, m: 3, label: 'caminhar' }, fly: { ft: 60, m: 18, label: 'voar' } } },
  ],
}

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(BEASTS_FIXTURE) }))
})

function makeChar(knownBeasts = []) {
  return { info: { class: 'druida', level: 4 }, combat: { knownBeasts } }
}

describe('<KnownBeastsPanel>', () => {
  it('lista bestas e marca uma não conhecida ao clicar', async () => {
    const user = userEvent.setup()
    const onToggleKnownBeast = vi.fn()
    render(
      <KnownBeastsPanel druidaLevel={4} character={makeChar([])} onToggleKnownBeast={onToggleKnownBeast} />
    )
    // Abre a seção de curadoria
    await user.click(screen.getByRole('button', { name: /bestas conhecidas/i }))
    const wolfToggle = await screen.findByRole('button', { name: /Lobo/ })
    await user.click(wolfToggle)
    expect(onToggleKnownBeast).toHaveBeenCalledWith('wolf')
  })

  it('mostra contagem de conhecidas', async () => {
    const user = userEvent.setup()
    render(
      <KnownBeastsPanel druidaLevel={4} character={makeChar(['wolf'])} onToggleKnownBeast={() => {}} />
    )
    await user.click(screen.getByRole('button', { name: /bestas conhecidas/i }))
    expect(await screen.findByText(/1 conhecida/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/KnownBeastsPanel.test.jsx`
Expected: FAIL — módulo `KnownBeastsPanel` não existe.

- [ ] **Step 3: Implementar o componente**

Criar `src/components/CharacterSheet/KnownBeastsPanel.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react'

/**
 * Curadoria das bestas conhecidas do druida (PHB p.66). Lista todo o catálogo
 * de Forma Selvagem com um toggle conhecida/não conhecida por besta — pensado
 * pro momento "alinhei com o mestre na criação, conheço lobo/urso/águia".
 * Marcação feita pelo próprio jogador via onToggleKnownBeast.
 */
function useBeasts(enabled) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    fetch('/srd-data/wild-shape-beasts-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setData(d.beasts ?? []))
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar bestas:', err)
      })
    return () => ctrl.abort()
  }, [enabled])
  return data
}

export function KnownBeastsPanel({ druidaLevel, character, onToggleKnownBeast }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const beasts = useBeasts(open)

  const knownSet = useMemo(
    () => new Set(character.combat?.knownBeasts ?? []),
    [character.combat?.knownBeasts]
  )

  const filtered = useMemo(() => {
    if (!beasts) return []
    const q = query.trim().toLowerCase()
    if (!q) return beasts
    return beasts.filter(b =>
      b.name.toLowerCase().includes(q) || b.nameEn.toLowerCase().includes(q)
    )
  }, [beasts, query])

  if (druidaLevel < 2) return null

  return (
    <div className="rounded-lg border-2 border-parchment-600 bg-parchment-50 p-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-sm font-display tracking-wide text-ink-500"
      >
        <span>📖 Bestas conhecidas</span>
        <span className="text-xs ink-italic text-ink-300">
          {knownSet.size} conhecida{knownSet.size !== 1 ? 's' : ''} {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="mt-2 pt-2 border-t border-parchment-600 space-y-2">
          <p className="text-[13px] ink-italic text-ink-300">
            Marque as bestas que seu druida já viu. Só as conhecidas podem ser
            assumidas na Forma Selvagem.
          </p>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar besta…"
            className="w-full bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          {!beasts && <p className="text-xs italic text-ink-300">Carregando catálogo…</p>}
          <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 pr-1">
            {filtered.map(b => {
              const known = knownSet.has(b.index)
              return (
                <button
                  key={b.index}
                  onClick={() => onToggleKnownBeast(b.index)}
                  className={`text-left text-[13px] px-2 py-1.5 rounded border transition-colors ${
                    known
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-parchment-600 bg-parchment-100/50 text-ink-300'
                  }`}
                >
                  <span className="font-bold">{known ? '✓ ' : '○ '}{b.name}</span>
                  <span className="ml-1 text-[11px] font-mono opacity-70">CR {b.crLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/KnownBeastsPanel.test.jsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet/KnownBeastsPanel.jsx src/test/KnownBeastsPanel.test.jsx
git commit -m "feat(forma-selvagem): painel de curadoria de bestas conhecidas"
```

---

## Task 5: Fiar tudo (CombatClassActions + SheetContent) e ajustar integração

**Files:**
- Modify: `src/components/CharacterSheet/CombatClassActions.jsx` (props ~linhas 690-691; bloco do druida ~linhas 824-836)
- Modify: `src/components/CharacterSheet/SheetContent.jsx` (~linhas 194-205)
- Test: `src/test/integration/classActions.test.jsx` (ajustar fluxo de transformação ~linhas 105-108 e 270-282)

- [ ] **Step 1: Ajustar o teste de integração (vai falhar)**

Em `src/test/integration/classActions.test.jsx`:

(a) No wrapper `ControlledActions`, adicionar a prop `onToggleKnownBeast` logo após `onSetWildShape` (~linha 107):

```js
        onSetWildShape={(ws) =>
          setCharacter(c => ({ ...c, combat: { ...c.combat, wildShape: ws ?? { active: false, beastName: '', currentHp: 0, maxHp: 0 } } }))
        }
        onToggleKnownBeast={(idx) =>
          setCharacter(c => {
            const list = c.combat.knownBeasts ?? []
            const next = list.includes(idx) ? list.filter(i => i !== idx) : [...list, idx]
            return { ...c, combat: { ...c.combat, knownBeasts: next } }
          })
        }
```

(b) Reescrever o teste `'transformação via picker de bestas cria estado wildShape ativo'` (~linhas 270-282) pra refletir o novo fluxo (primeiro "já vi essa", depois transformar):

```js
    it('transformação via picker: marcar "já vi essa" libera transformar', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('druida', 4)} />)
      await user.click(screen.getByRole('button', { name: /^Transformar$/i }))
      // Lobo começa bloqueado — marca como vista
      await user.click(await screen.findByRole('button', { name: /já vi essa/i }))
      // Agora o Lobo é transformável
      await user.click(await screen.findByRole('button', { name: /Lobo/i }))
      await waitFor(() => expect(screen.getByText(/EM FORMA SELVAGEM — Lobo/)).toBeInTheDocument())
      expect(screen.getByText('11/11')).toBeInTheDocument()
      expect(screen.getByText('Mordida')).toBeInTheDocument()
    })
```

> Garantir que `baseCharacter` produz `combat.knownBeasts` (vazio é ok — o default do schema cobre, mas se `baseCharacter` montar `combat` à mão sem o campo, adicione `knownBeasts: []` lá).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/integration/classActions.test.jsx`
Expected: FAIL — não há botão "já vi essa" porque `CombatClassActions` ainda não repassa `onToggleKnownBeast`.

- [ ] **Step 3: Repassar a prop no CombatClassActions**

Em `src/components/CharacterSheet/CombatClassActions.jsx`:

(a) Adicionar `onToggleKnownBeast` à desestruturação de props (~linha 690-691), junto de `onSetWildShape`:

```js
  onToggleSlot, onSetWildShape, onApplyDamage, onToggleKnownBeast,
  onSetRangerCompanion, onUpdatePortent,
```

(b) Passar ao `WildShapePanel` (~linha 824-836), adicionando a linha dentro do JSX existente:

```jsx
      {druidaLevel >= 2 && (
        <WildShapePanel
          druidaLevel={druidaLevel}
          wsUse={wsUse}
          usesRemaining={wsRemaining}
          onSpend={onSpendFeatureUse}
          character={character}
          onSetWildShape={onSetWildShape}
          onApplyDamage={onApplyDamage}
          onToggleKnownBeast={onToggleKnownBeast}
          slotsAvailable={slotsAvailable}
          onConsumeSlot={handleConsumeSlot}
        />
      )}
      {druidaLevel >= 2 && (
        <KnownBeastsPanel
          druidaLevel={druidaLevel}
          character={character}
          onToggleKnownBeast={onToggleKnownBeast}
        />
      )}
```

(c) Importar o novo painel no topo do arquivo, junto do import do `WildShapePanel`:

```js
import { KnownBeastsPanel } from './KnownBeastsPanel'
```

> Confirme onde está o `import { WildShapePanel } ...` (linha 6 de `CombatClassActions.jsx`) e coloque o novo import adjacente.

- [ ] **Step 4: Fiar no SheetContent**

Em `src/components/CharacterSheet/SheetContent.jsx`:

(a) Garantir que `toggleKnownBeast` é extraído do `useCharacter` (no destructuring onde já vêm `setWildShape`, `updatePortent`, etc.). Adicionar `toggleKnownBeast` à lista.

(b) Passar a prop ao `CombatClassActions` (~linha 194-205), adicionando:

```jsx
              onToggleKnownBeast={toggleKnownBeast}
```

- [ ] **Step 5: Rodar a integração e confirmar que passa**

Run: `npx vitest run src/test/integration/classActions.test.jsx`
Expected: PASS (incluindo o fluxo reescrito do druida).

- [ ] **Step 6: Commit**

```bash
git add src/components/CharacterSheet/CombatClassActions.jsx src/components/CharacterSheet/SheetContent.jsx src/test/integration/classActions.test.jsx
git commit -m "feat(forma-selvagem): fia knownBeasts da ficha ao picker e à curadoria"
```

---

## Task 6: Verificação final da suíte

**Files:** nenhum (só execução)

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS — sem regressões nos demais testes.

- [ ] **Step 2: Lint dos arquivos tocados (se houver script)**

Run: `npm run lint` (se existir)
Expected: sem novos erros nos arquivos modificados. (Lembrete: o projeto tem ~611 erros de lint pré-existentes — só não introduzir novos.)

- [ ] **Step 3: Smoke manual (opcional, recomendado)**

Subir o app, criar/abrir um druida nv 2+, abrir Forma Selvagem → verificar bestas bloqueadas com "já vi essa"; marcar uma → ela vira transformável; abrir "Bestas conhecidas" → marcar/desmarcar em lote e ver a contagem.

---

## Notas de verificação contra o spec

- **Druida só transforma em bestas conhecidas** → Task 3 (lock no picker) + Task 5 (fiação).
- **Não conhecidas bloqueadas com "já vi essa"** → Task 3.
- **Lugar na ficha pra marcar em lote** → Task 4 (`KnownBeastsPanel`) + Task 5.
- **Bestiário global intocado** → nenhum task mexe em `BestiaryModal`/`BestiaryButton`.
- **Druidas existentes começam vazios sem quebrar** → Task 1 (default `[]` do Zod).
- **Só druida nv 2+** → guardas `druidaLevel < 2` no `WildShapePanel` (já existe) e no `KnownBeastsPanel` (Task 4) + condição `druidaLevel >= 2` no `CombatClassActions` (Task 5).
