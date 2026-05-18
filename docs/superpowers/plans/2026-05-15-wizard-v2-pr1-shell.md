# Wizard V2 — PR 1: Shell + Grid + Setup Modal + Feature Flag

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr em pé a casca do CharacterWizardV2 — shell em grid, modal de configuração de campanha, hooks centrais (`useDraft`, `useBlockStatus`), feature flag, e cards-placeholder. Nenhum bloco funcional ainda.

**Architecture:** Componente novo em `src/components/CharacterWizardV2/`, ativado por feature flag (`?v2=1` ou `localStorage.wizardV2`). O shell renderiza um grid de 7-8 cards, cada um abre um modal genérico que mostra "Em construção" (blocos chegam em PRs seguintes). Estado central em `useDraft` com autosave em `sessionStorage`.

**Tech Stack:** React 18, Vite, Vitest + Testing Library, Tailwind (paleta `parchment-*`/`ink-*` já existente), Playwright (apenas para PRs futuras).

**Spec:** [docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md](../specs/2026-05-15-redesign-character-wizard-design.md)

---

## Visão geral do PR

Ao final desta PR, com `?v2=1` na URL:
1. Clicar "Criar Personagem" abre `CampaignSetupModal`.
2. Confirmar leva ao grid `CharacterWizardV2` com 7-8 cards.
3. Cada card mostra label, status (todos `vazio`), e um resumo "preencher...".
4. Clicar em um card abre modal genérico com placeholder "Em construção (PR seguinte)".
5. Botão "← Personagens" volta com confirmação se houve mudança.
6. Recarregar a página com draft em andamento mostra modal "Continuar?".

Fluxo antigo (sem `?v2=1`) continua **idêntico** — zero regressão.

---

## Estrutura de arquivos (a criar nesta PR)

```
src/components/CharacterWizardV2/
├── CharacterWizardV2.jsx           // shell: header + grid + state plumbing
├── CampaignSetupModal.jsx          // modal upfront: 4 perguntas de settings
├── BlockCard.jsx                    // card único do grid (label + status + resumo)
├── BlockEditorModal.jsx             // wrapper genérico de modal (Esc/click-fora/Salvar)
├── ResumeDraftPrompt.jsx            // mini-modal "Continuar/Começar novo"
├── ConfirmExitPrompt.jsx            // mini-modal "Descartar/Salvar e sair"
├── blocks-config.js                 // constante: lista ordenada de blocos { id, label }
├── hooks/
│   ├── useDraft.js                 // estado central + autosave em sessionStorage
│   └── useBlockStatus.js            // computa vazio/parcial/completo/bloqueado
└── index.js                         // export { CharacterWizardV2 }

src/test/
├── wizardV2-useDraft.test.js
├── wizardV2-useBlockStatus.test.js
├── wizardV2-CampaignSetupModal.test.jsx
├── wizardV2-BlockCard.test.jsx
├── wizardV2-BlockEditorModal.test.jsx
└── e2e/
    └── wizardV2-shell.test.jsx       // RTL+jsdom: feature flag, fluxo entrada→grid

src/App.jsx                            // MODIFICAR: feature flag + lazy import V2
```

---

## Definição de "blocos-placeholder"

`blocks-config.js` define a ordem visual e labels — usado em PR 1 e em todas as seguintes:

```js
// src/components/CharacterWizardV2/blocks-config.js

// Ordem visual recomendada (Raça primeiro, Revisão último).
// Magias só entra no grid se a classe atual for conjuradora.
export const BLOCKS = [
  { id: 'race',       label: 'Raça'        },
  { id: 'class',      label: 'Classe'      },
  { id: 'background', label: 'Antecedente' },
  { id: 'attributes', label: 'Atributos'   },
  { id: 'skills',     label: 'Perícias'    },
  { id: 'spells',     label: 'Magias'      },
  { id: 'concept',    label: 'Conceito'    },
  { id: 'review',     label: 'Revisão'     },
]
```

Em PR 1, todos os 8 sempre aparecem (lógica condicional de `spells` chega na PR 5). Status de todos é `vazio` exceto quando regras simples permitem outro estado (detalhadas na Task 3).

---

## Convenções

- **Commits:** estilo do repo (`feat(wizardV2): ...`, `test(wizardV2): ...`, `chore(wizardV2): ...`).
- **Push:** após cada commit (`git push origin HEAD`) — preferência registrada em memória.
- **Tailwind:** reusa tokens existentes (`bg-parchment-50`, `border-parchment-600`, `text-ink-500`, `font-display`, `tracking-widest`). Inspirar-se em `src/components/CharacterList/CharacterSidebar.jsx` para tom visual.
- **Paths:** sempre absolutos nos exemplos abaixo, mas no terminal usar relativos.
- **Skill anti-pattern:** se um teste falhar de forma confusa, NÃO mocke pra fazer passar — investigue.

---

## Task 1: Esqueleto da pasta e blocos-config

**Files:**
- Create: `src/components/CharacterWizardV2/blocks-config.js`
- Create: `src/components/CharacterWizardV2/index.js`
- Test: `src/test/wizardV2-blocks-config.test.js`

- [ ] **Step 1.1: Criar teste failing**

```js
// src/test/wizardV2-blocks-config.test.js
import { describe, it, expect } from 'vitest'
import { BLOCKS } from '../components/CharacterWizardV2/blocks-config'

describe('BLOCKS config', () => {
  it('lista 8 blocos na ordem recomendada', () => {
    expect(BLOCKS.map(b => b.id)).toEqual([
      'race', 'class', 'background', 'attributes',
      'skills', 'spells', 'concept', 'review',
    ])
  })

  it('cada bloco tem id e label', () => {
    BLOCKS.forEach(b => {
      expect(typeof b.id).toBe('string')
      expect(typeof b.label).toBe('string')
      expect(b.id.length).toBeGreaterThan(0)
      expect(b.label.length).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 1.2: Rodar teste — esperado falhar**

```bash
npm test -- wizardV2-blocks-config
```
Esperado: FAIL com `Cannot find module '../components/CharacterWizardV2/blocks-config'`.

- [ ] **Step 1.3: Implementar `blocks-config.js`**

```js
// src/components/CharacterWizardV2/blocks-config.js

// Ordem visual recomendada (Raça primeiro, Revisão último).
// Magias só entra no grid se a classe atual for conjuradora — lógica em PR futura.
export const BLOCKS = [
  { id: 'race',       label: 'Raça'        },
  { id: 'class',      label: 'Classe'      },
  { id: 'background', label: 'Antecedente' },
  { id: 'attributes', label: 'Atributos'   },
  { id: 'skills',     label: 'Perícias'    },
  { id: 'spells',     label: 'Magias'      },
  { id: 'concept',    label: 'Conceito'    },
  { id: 'review',     label: 'Revisão'     },
]
```

- [ ] **Step 1.4: Implementar `index.js` (vazio temporariamente — barrel)**

```js
// src/components/CharacterWizardV2/index.js
// Será populado conforme módulos são criados.
```

- [ ] **Step 1.5: Rodar teste — esperado passar**

```bash
npm test -- wizardV2-blocks-config
```
Esperado: PASS, 2 testes verdes.

- [ ] **Step 1.6: Commit + push**

```bash
git add src/components/CharacterWizardV2/blocks-config.js src/components/CharacterWizardV2/index.js src/test/wizardV2-blocks-config.test.js
git commit -m "feat(wizardV2): blocks-config com ordem visual dos 8 blocos"
git push origin HEAD
```

---

## Task 2: Hook `useDraft` (estado + autosave)

**Files:**
- Create: `src/components/CharacterWizardV2/hooks/useDraft.js`
- Test: `src/test/wizardV2-useDraft.test.js`

**Comportamento esperado:**
- Inicializa com `INITIAL_DRAFT` (mesma forma usada pelo wizard antigo, mas reescrita aqui — não importar do antigo).
- Aceita `initialSettings` opcional pra mesclar settings vindas do `CampaignSetupModal`.
- Expõe `{ draft, updateDraft, resetDraft, hasChanges }`.
- Autosalva em `sessionStorage['wizard-v2-draft']` com debounce de 500ms.
- Restaura draft do sessionStorage se chamar `useDraft({ resume: true })`.
- `hasChanges` é `true` se `draft` difere do `INITIAL_DRAFT` (comparação rasa de chaves relevantes — ver código abaixo).

- [ ] **Step 2.1: Escrever testes failing**

```js
// src/test/wizardV2-useDraft.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDraft, INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

describe('useDraft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('inicializa com INITIAL_DRAFT_V2', () => {
    const { result } = renderHook(() => useDraft())
    expect(result.current.draft).toEqual(INITIAL_DRAFT_V2)
    expect(result.current.hasChanges).toBe(false)
  })

  it('mescla initialSettings nas settings do draft', () => {
    const { result } = renderHook(() =>
      useDraft({ initialSettings: { allowFeats: true, startLevel: 3 } })
    )
    expect(result.current.draft.settings.allowFeats).toBe(true)
    expect(result.current.draft.settings.startLevel).toBe(3)
    // outras settings preservam defaults
    expect(result.current.draft.settings.abilityScoreMethod).toBe('standard-array')
  })

  it('updateDraft aplica patch e marca hasChanges', () => {
    const { result } = renderHook(() => useDraft())
    act(() => result.current.updateDraft({ name: 'Heitor' }))
    expect(result.current.draft.name).toBe('Heitor')
    expect(result.current.hasChanges).toBe(true)
  })

  it('autosalva em sessionStorage após debounce de 500ms', () => {
    const { result } = renderHook(() => useDraft())
    act(() => result.current.updateDraft({ name: 'Heitor' }))
    expect(sessionStorage.getItem('wizard-v2-draft')).toBeNull()
    act(() => vi.advanceTimersByTime(500))
    const saved = JSON.parse(sessionStorage.getItem('wizard-v2-draft'))
    expect(saved.name).toBe('Heitor')
  })

  it('restaura draft do sessionStorage com resume:true', () => {
    sessionStorage.setItem('wizard-v2-draft', JSON.stringify({
      ...INITIAL_DRAFT_V2,
      name: 'Salvo',
    }))
    const { result } = renderHook(() => useDraft({ resume: true }))
    expect(result.current.draft.name).toBe('Salvo')
    expect(result.current.hasChanges).toBe(true)
  })

  it('resetDraft volta ao INITIAL_DRAFT_V2 e limpa sessionStorage', () => {
    const { result } = renderHook(() => useDraft())
    act(() => result.current.updateDraft({ name: 'X' }))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.resetDraft())
    expect(result.current.draft).toEqual(INITIAL_DRAFT_V2)
    expect(result.current.hasChanges).toBe(false)
    expect(sessionStorage.getItem('wizard-v2-draft')).toBeNull()
  })
})
```

- [ ] **Step 2.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-useDraft
```
Esperado: FAIL com `Cannot find module`.

- [ ] **Step 2.3: Implementar `useDraft.js`**

```js
// src/components/CharacterWizardV2/hooks/useDraft.js
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'wizard-v2-draft'
const AUTOSAVE_MS = 500

export const INITIAL_DRAFT_V2 = {
  settings: {
    abilityScoreMethod: 'standard-array',
    allowFeats: false,
    allowMulticlass: false,
    startLevel: 1,
  },
  name: '', playerName: '', alignment: '', appearance: '',
  race: '', subrace: '', racialBonuses: {},
  racialAbilityChoices: [], racialSkills: [], draconicAncestry: '', racialCantrip: '',
  class: '', level: 1, chosenFeatures: {}, savingThrows: [],
  asiChoices: {},
  multiclasses: [],
  spellcastingAbility: null, hitDice: '1d8',
  background: '', backgroundSkills: [], backgroundItems: [],
  backgroundGold: 0,
  classEquipmentChoice: 'equipment', classEquipmentChoices: {},
  classEquipmentPicks: {}, classStartingGold: 0,
  baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  rolledScores: [],
  chosenSkills: [],
  spells: [], bonusSpells: [],
}

function shallowEqualDraft(a, b) {
  // Comparação JSON é suficiente: drafts são objetos serializáveis
  // e sempre passam por sessionStorage (round-trip JSON), então qualquer
  // diferença que não sobrevive a JSON.stringify também não importa.
  return JSON.stringify(a) === JSON.stringify(b)
}

export function useDraft({ initialSettings = null, resume = false } = {}) {
  const [draft, setDraft] = useState(() => {
    if (resume) {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        try { return JSON.parse(saved) } catch { /* fallthrough */ }
      }
    }
    if (initialSettings) {
      return {
        ...INITIAL_DRAFT_V2,
        settings: { ...INITIAL_DRAFT_V2.settings, ...initialSettings },
      }
    }
    return INITIAL_DRAFT_V2
  })

  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    }, AUTOSAVE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [draft])

  const updateDraft = useCallback(patch => {
    setDraft(prev => ({ ...prev, ...patch }))
  }, [])

  const resetDraft = useCallback(() => {
    setDraft(INITIAL_DRAFT_V2)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const hasChanges = useMemo(
    () => !shallowEqualDraft(draft, INITIAL_DRAFT_V2),
    [draft],
  )

  return { draft, updateDraft, resetDraft, hasChanges }
}
```

- [ ] **Step 2.4: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-useDraft
```
Esperado: PASS, 6 testes verdes.

- [ ] **Step 2.5: Commit + push**

```bash
git add src/components/CharacterWizardV2/hooks/useDraft.js src/test/wizardV2-useDraft.test.js
git commit -m "feat(wizardV2): hook useDraft com autosave em sessionStorage"
git push origin HEAD
```

---

## Task 3: Hook `useBlockStatus` (lógica placeholder)

**Files:**
- Create: `src/components/CharacterWizardV2/hooks/useBlockStatus.js`
- Test: `src/test/wizardV2-useBlockStatus.test.js`

**Escopo desta PR:** lógica simplificada — cada bloco devolve apenas `vazio`/`parcial`/`completo`/`bloqueado` baseado em **regras mínimas**, suficiente para o grid mostrar status correto sem os blocos completos. Lógica detalhada vem nas PRs dos blocos.

**Regras placeholder por bloco:**

| Bloco | `vazio` se | `parcial` se | `completo` se | `bloqueado` se |
|---|---|---|---|---|
| race | `!draft.race` | — | `draft.race` preenchido | nunca |
| class | `!draft.class` | — | `draft.class` preenchido | nunca |
| background | `!draft.background` | — | `draft.background` preenchido | nunca |
| attributes | todos atributos = 0 | algum > 0 mas há zeros | todos > 0 | `!draft.race` |
| skills | `chosenSkills.length === 0` | — | `chosenSkills.length > 0` | `!draft.class` ou `!draft.background` |
| spells | `spells.length === 0 && bonusSpells.length === 0` | — | qualquer magia | `!draft.class` (lógica conjurador-só vem na PR 5) |
| concept | `!draft.name?.trim()` | — | `draft.name` preenchido | nunca |
| review | sempre `bloqueado` enquanto qualquer outro não-bloqueado não está completo | — | só `completo` quando todos os outros (não-bloqueados) estão completos | sempre, até estar pronto |

- [ ] **Step 3.1: Escrever testes failing**

```js
// src/test/wizardV2-useBlockStatus.test.js
import { describe, it, expect } from 'vitest'
import { getBlockStatus } from '../components/CharacterWizardV2/hooks/useBlockStatus'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const empty = INITIAL_DRAFT_V2

describe('getBlockStatus', () => {
  it('race vazio quando não preenchido', () => {
    expect(getBlockStatus('race', empty).status).toBe('vazio')
  })

  it('race completo quando preenchido', () => {
    expect(getBlockStatus('race', { ...empty, race: 'meio-elfo' }).status).toBe('completo')
  })

  it('attributes bloqueado quando race vazio', () => {
    const r = getBlockStatus('attributes', empty)
    expect(r.status).toBe('bloqueado')
    expect(r.blockedBy).toContain('race')
  })

  it('attributes vazio quando race preenchido mas atributos zerados', () => {
    expect(getBlockStatus('attributes', { ...empty, race: 'humano' }).status).toBe('vazio')
  })

  it('attributes parcial quando alguns atributos preenchidos', () => {
    const draft = {
      ...empty, race: 'humano',
      baseAttributes: { str: 15, dex: 14, con: 0, int: 0, wis: 0, cha: 0 },
    }
    expect(getBlockStatus('attributes', draft).status).toBe('parcial')
  })

  it('attributes completo quando todos os 6 preenchidos', () => {
    const draft = {
      ...empty, race: 'humano',
      baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    }
    expect(getBlockStatus('attributes', draft).status).toBe('completo')
  })

  it('skills bloqueado se class ou background vazios', () => {
    const r1 = getBlockStatus('skills', { ...empty, background: 'soldado' })
    expect(r1.status).toBe('bloqueado')
    expect(r1.blockedBy).toContain('class')
    const r2 = getBlockStatus('skills', { ...empty, class: 'guerreiro' })
    expect(r2.status).toBe('bloqueado')
    expect(r2.blockedBy).toContain('background')
  })

  it('spells bloqueado se class vazio', () => {
    expect(getBlockStatus('spells', empty).status).toBe('bloqueado')
  })

  it('concept completo só com name preenchido', () => {
    expect(getBlockStatus('concept', empty).status).toBe('vazio')
    expect(getBlockStatus('concept', { ...empty, name: 'Heitor' }).status).toBe('completo')
  })

  it('review bloqueado enquanto draft está vazio', () => {
    expect(getBlockStatus('review', empty).status).toBe('bloqueado')
  })

  it('review completo quando todos os outros não-bloqueados estão completos', () => {
    const draft = {
      ...empty,
      race: 'humano', class: 'guerreiro', background: 'soldado',
      baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      chosenSkills: ['atletismo'],
      spells: [{ index: 'mage-hand' }],
      name: 'Heitor',
    }
    expect(getBlockStatus('review', draft).status).toBe('completo')
  })
})
```

- [ ] **Step 3.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-useBlockStatus
```
Esperado: FAIL.

- [ ] **Step 3.3: Implementar `useBlockStatus.js`**

```js
// src/components/CharacterWizardV2/hooks/useBlockStatus.js
import { useMemo } from 'react'
import { BLOCKS } from '../blocks-config'

const ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function statusOf(blockId, draft) {
  switch (blockId) {
    case 'race':
      return draft.race ? 'completo' : 'vazio'

    case 'class':
      return draft.class ? 'completo' : 'vazio'

    case 'background':
      return draft.background ? 'completo' : 'vazio'

    case 'attributes': {
      const vals = ATTR_KEYS.map(k => draft.baseAttributes?.[k] ?? 0)
      const filled = vals.filter(v => v > 0).length
      if (filled === 0) return 'vazio'
      if (filled === 6) return 'completo'
      return 'parcial'
    }

    case 'skills':
      return (draft.chosenSkills?.length ?? 0) > 0 ? 'completo' : 'vazio'

    case 'spells': {
      const total = (draft.spells?.length ?? 0) + (draft.bonusSpells?.length ?? 0)
      return total > 0 ? 'completo' : 'vazio'
    }

    case 'concept':
      return draft.name?.trim() ? 'completo' : 'vazio'

    case 'review':
      // tratado abaixo (precisa olhar todos os outros)
      return 'vazio'

    default:
      return 'vazio'
  }
}

function blockedBy(blockId, draft) {
  switch (blockId) {
    case 'attributes':
      return draft.race ? [] : ['race']
    case 'skills': {
      const list = []
      if (!draft.class) list.push('class')
      if (!draft.background) list.push('background')
      return list
    }
    case 'spells':
      return draft.class ? [] : ['class']
    default:
      return []
  }
}

export function getBlockStatus(blockId, draft) {
  if (blockId === 'review') {
    // Review fica bloqueado até todos os outros não-bloqueados estarem completos.
    const others = BLOCKS.filter(b => b.id !== 'review')
    const allReady = others.every(b => {
      const blocked = blockedBy(b.id, draft).length > 0
      if (blocked) return true   // bloqueado conta como "ainda não pronto, mas não impede"
      return statusOf(b.id, draft) === 'completo'
    })
    if (allReady) return { status: 'completo', missing: [], blockedBy: [] }
    return { status: 'bloqueado', missing: [], blockedBy: ['outros'] }
  }

  const bb = blockedBy(blockId, draft)
  if (bb.length > 0) {
    return { status: 'bloqueado', missing: [], blockedBy: bb }
  }
  return { status: statusOf(blockId, draft), missing: [], blockedBy: [] }
}

export function useBlockStatus(draft) {
  return useMemo(() => {
    const map = {}
    BLOCKS.forEach(b => { map[b.id] = getBlockStatus(b.id, draft) })
    return map
  }, [draft])
}
```

- [ ] **Step 3.4: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-useBlockStatus
```
Esperado: PASS, 11 testes verdes.

- [ ] **Step 3.5: Commit + push**

```bash
git add src/components/CharacterWizardV2/hooks/useBlockStatus.js src/test/wizardV2-useBlockStatus.test.js
git commit -m "feat(wizardV2): hook useBlockStatus com regras placeholder por bloco"
git push origin HEAD
```

---

## Task 4: Componente `BlockCard`

**Files:**
- Create: `src/components/CharacterWizardV2/BlockCard.jsx`
- Test: `src/test/wizardV2-BlockCard.test.jsx`

**Comportamento:**
- Props: `{ label, status, summary, onClick, blockedBy }`.
- Renderiza um card clicável com:
  - Label uppercase em `font-display`.
  - Badge de status com ícone+cor.
  - Resumo (texto preenchido ou "preencher..." em itálico).
- Se `status === 'bloqueado'`, opacidade reduzida, `aria-disabled`, e clique não dispara `onClick`.
- Tooltip de bloqueio mostrando "Preencha [labels] primeiro" via atributo `title`.
- `data-testid="block-card-{id}"` opcional (passado via prop `dataTestId`).

- [ ] **Step 4.1: Escrever testes failing**

```jsx
// src/test/wizardV2-BlockCard.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockCard } from '../components/CharacterWizardV2/BlockCard'

describe('BlockCard', () => {
  it('renderiza label e resumo', () => {
    render(<BlockCard label="Raça" status="vazio" summary="preencher..." onClick={() => {}} />)
    expect(screen.getByText('Raça')).toBeInTheDocument()
    expect(screen.getByText('preencher...')).toBeInTheDocument()
  })

  it('mostra ícone ✓ quando status=completo', () => {
    const { container } = render(
      <BlockCard label="Raça" status="completo" summary="Meio-elfo" onClick={() => {}} />
    )
    expect(container.textContent).toContain('✓')
  })

  it('mostra ícone 🔒 quando status=bloqueado', () => {
    const { container } = render(
      <BlockCard label="Atributos" status="bloqueado" summary="—"
        blockedBy={['Raça']} onClick={() => {}} />
    )
    expect(container.textContent).toContain('🔒')
  })

  it('chama onClick ao clicar quando não bloqueado', async () => {
    const onClick = vi.fn()
    render(<BlockCard label="Raça" status="vazio" summary="—" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('NÃO chama onClick quando bloqueado', async () => {
    const onClick = vi.fn()
    render(<BlockCard label="Atributos" status="bloqueado" summary="—"
      blockedBy={['Raça']} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('tooltip lista o que precisa preencher quando bloqueado', () => {
    render(<BlockCard label="Perícias" status="bloqueado" summary="—"
      blockedBy={['Classe', 'Antecedente']} onClick={() => {}} />)
    expect(screen.getByRole('button').getAttribute('title'))
      .toContain('Classe')
    expect(screen.getByRole('button').getAttribute('title'))
      .toContain('Antecedente')
  })
})
```

- [ ] **Step 4.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-BlockCard
```
Esperado: FAIL.

- [ ] **Step 4.3: Implementar `BlockCard.jsx`**

```jsx
// src/components/CharacterWizardV2/BlockCard.jsx

const STATUS_BADGE = {
  completo:   { icon: '✓',  cls: 'bg-emerald-700 text-parchment-50 border-emerald-800' },
  parcial:    { icon: '●',  cls: 'bg-amber-500 text-parchment-50 border-amber-700' },
  vazio:      { icon: '○',  cls: 'bg-parchment-200 text-ink-300 border-parchment-600' },
  bloqueado:  { icon: '🔒', cls: 'bg-parchment-200 text-ink-200 border-parchment-600' },
}

export function BlockCard({ label, status, summary, onClick, blockedBy = [], dataTestId }) {
  const isBlocked = status === 'bloqueado'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.vazio
  const title = isBlocked && blockedBy.length
    ? `Preencha ${blockedBy.join(', ')} primeiro`
    : undefined

  return (
    <button
      type="button"
      data-testid={dataTestId}
      title={title}
      aria-disabled={isBlocked}
      onClick={isBlocked ? undefined : onClick}
      className={[
        'flex flex-col gap-2 p-4 text-left rounded-sm border-2 transition-all duration-150',
        'bg-parchment-50 border-parchment-600',
        isBlocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-ink-300 hover:shadow-md cursor-pointer',
      ].join(' ')}
      style={{ boxShadow: isBlocked ? 'none' : 'var(--shadow-parchment)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-display tracking-widest uppercase text-ink-500">
          {label}
        </span>
        <span className={[
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
          badge.cls,
        ].join(' ')}>
          {badge.icon}
        </span>
      </div>
      <div className={[
        'text-sm font-display',
        status === 'completo' ? 'text-ink-500' : 'text-ink-300 italic',
      ].join(' ')}>
        {summary}
      </div>
    </button>
  )
}
```

- [ ] **Step 4.4: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-BlockCard
```
Esperado: PASS, 6 testes verdes.

- [ ] **Step 4.5: Commit + push**

```bash
git add src/components/CharacterWizardV2/BlockCard.jsx src/test/wizardV2-BlockCard.test.jsx
git commit -m "feat(wizardV2): componente BlockCard com 4 estados (vazio/parcial/completo/bloqueado)"
git push origin HEAD
```

---

## Task 5: Componente `BlockEditorModal` (genérico)

**Files:**
- Create: `src/components/CharacterWizardV2/BlockEditorModal.jsx`
- Test: `src/test/wizardV2-BlockEditorModal.test.jsx`

**Comportamento:**
- Props: `{ open, title, onClose, onClear, children }`.
- Renderiza overlay full-screen + card centralizado.
- Header com título e botão "✕".
- Body com `children` (em PR 1 o conteúdo é placeholder "Em construção").
- Footer com botões "Limpar" (chama `onClear`, opcional) e "Fechar".
- Fecha ao clicar overlay, pressionar Esc, ou clicar "Fechar".
- Não renderiza nada se `open === false`.

- [ ] **Step 5.1: Escrever testes failing**

```jsx
// src/test/wizardV2-BlockEditorModal.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockEditorModal } from '../components/CharacterWizardV2/BlockEditorModal'

describe('BlockEditorModal', () => {
  it('não renderiza quando open=false', () => {
    render(
      <BlockEditorModal open={false} title="Raça" onClose={() => {}}>
        conteúdo
      </BlockEditorModal>
    )
    expect(screen.queryByText('Raça')).not.toBeInTheDocument()
  })

  it('renderiza título e children quando open=true', () => {
    render(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}}>
        conteúdo do bloco
      </BlockEditorModal>
    )
    expect(screen.getByText('Raça')).toBeInTheDocument()
    expect(screen.getByText('conteúdo do bloco')).toBeInTheDocument()
  })

  it('fecha ao clicar botão Fechar', async () => {
    const onClose = vi.fn()
    render(
      <BlockEditorModal open={true} title="Raça" onClose={onClose}>x</BlockEditorModal>
    )
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('fecha ao pressionar Esc', () => {
    const onClose = vi.fn()
    render(
      <BlockEditorModal open={true} title="Raça" onClose={onClose}>x</BlockEditorModal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('mostra botão Limpar só quando onClear fornecido', () => {
    const { rerender } = render(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}}>x</BlockEditorModal>
    )
    expect(screen.queryByRole('button', { name: /limpar/i })).not.toBeInTheDocument()
    rerender(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}} onClear={() => {}}>x</BlockEditorModal>
    )
    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument()
  })

  it('chama onClear ao clicar Limpar', async () => {
    const onClear = vi.fn()
    render(
      <BlockEditorModal open={true} title="Raça" onClose={() => {}} onClear={onClear}>x</BlockEditorModal>
    )
    await userEvent.click(screen.getByRole('button', { name: /limpar/i }))
    expect(onClear).toHaveBeenCalled()
  })
})
```

- [ ] **Step 5.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-BlockEditorModal
```
Esperado: FAIL.

- [ ] **Step 5.3: Implementar `BlockEditorModal.jsx`**

```jsx
// src/components/CharacterWizardV2/BlockEditorModal.jsx
import { useEffect } from 'react'

export function BlockEditorModal({ open, title, onClose, onClear, children }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-parchment-50 border-2 border-parchment-600 rounded-sm overflow-hidden"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b-2 border-parchment-600 bg-parchment-100">
          <h2 className="text-base font-display text-ink-500 tracking-widest uppercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-ink-300 hover:text-ink-500 text-lg leading-none"
          >✕</button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t-2 border-parchment-600 bg-parchment-100">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-display tracking-wide text-ink-300 hover:text-ink-500 uppercase"
            >Limpar</button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm border-2 border-ink-300 hover:border-ink-500 text-ink-500 text-sm font-display tracking-wide bg-parchment-50 hover:bg-parchment-100"
          >Fechar</button>
        </footer>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.4: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-BlockEditorModal
```
Esperado: PASS, 6 testes verdes.

- [ ] **Step 5.5: Commit + push**

```bash
git add src/components/CharacterWizardV2/BlockEditorModal.jsx src/test/wizardV2-BlockEditorModal.test.jsx
git commit -m "feat(wizardV2): BlockEditorModal genérico (Esc/click-fora/limpar)"
git push origin HEAD
```

---

## Task 6: `CampaignSetupModal`

**Files:**
- Create: `src/components/CharacterWizardV2/CampaignSetupModal.jsx`
- Test: `src/test/wizardV2-CampaignSetupModal.test.jsx`

**Comportamento:**
- Props: `{ open, onCancel, onConfirm }`.
- Renderiza modal com 4 controles:
  - **Método de atributos** (radio): `standard-array` | `point-buy` | `manual` | `roll`.
  - **Permitir feats** (checkbox).
  - **Permitir multiclasse** (checkbox).
  - **Nível inicial** (number input, 1-20, default 1).
- Botões "Cancelar" e "Começar".
- "Começar" chama `onConfirm({ abilityScoreMethod, allowFeats, allowMulticlass, startLevel })`.

- [ ] **Step 6.1: Escrever testes failing**

```jsx
// src/test/wizardV2-CampaignSetupModal.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignSetupModal } from '../components/CharacterWizardV2/CampaignSetupModal'

describe('CampaignSetupModal', () => {
  it('renderiza com defaults', () => {
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.getByLabelText(/standard array/i)).toBeChecked()
    expect(screen.getByLabelText(/permitir feats/i)).not.toBeChecked()
    expect(screen.getByLabelText(/permitir multiclasse/i)).not.toBeChecked()
    expect(screen.getByLabelText(/nível inicial/i)).toHaveValue(1)
  })

  it('confirma com settings escolhidas', async () => {
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByLabelText(/point buy/i))
    await userEvent.click(screen.getByLabelText(/permitir feats/i))
    await userEvent.click(screen.getByLabelText(/permitir multiclasse/i))
    await userEvent.clear(screen.getByLabelText(/nível inicial/i))
    await userEvent.type(screen.getByLabelText(/nível inicial/i), '5')

    await userEvent.click(screen.getByRole('button', { name: /começar/i }))

    expect(onConfirm).toHaveBeenCalledWith({
      abilityScoreMethod: 'point-buy',
      allowFeats: true,
      allowMulticlass: true,
      startLevel: 5,
    })
  })

  it('cancela sem chamar onConfirm', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={onCancel} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('clampa nível inicial entre 1 e 20', async () => {
    const onConfirm = vi.fn()
    render(<CampaignSetupModal open={true} onCancel={() => {}} onConfirm={onConfirm} />)

    const input = screen.getByLabelText(/nível inicial/i)
    await userEvent.clear(input)
    await userEvent.type(input, '99')
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ startLevel: 20 }))
  })
})
```

- [ ] **Step 6.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-CampaignSetupModal
```
Esperado: FAIL.

- [ ] **Step 6.3: Implementar `CampaignSetupModal.jsx`**

```jsx
// src/components/CharacterWizardV2/CampaignSetupModal.jsx
import { useState } from 'react'

const METHODS = [
  { value: 'standard-array', label: 'Standard Array (15,14,13,12,10,8)' },
  { value: 'point-buy',      label: 'Point Buy (27 pontos)' },
  { value: 'manual',         label: 'Manual (digitar valores)' },
  { value: 'roll',           label: 'Rolar 4d6 e descartar menor' },
]

function clampLevel(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.max(1, Math.min(20, Math.round(v)))
}

export function CampaignSetupModal({ open, onCancel, onConfirm }) {
  const [method, setMethod] = useState('standard-array')
  const [allowFeats, setAllowFeats] = useState(false)
  const [allowMulticlass, setAllowMulticlass] = useState(false)
  const [startLevel, setStartLevel] = useState(1)

  if (!open) return null

  function submit(e) {
    e.preventDefault()
    onConfirm({
      abilityScoreMethod: method,
      allowFeats,
      allowMulticlass,
      startLevel: clampLevel(startLevel),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label="Configuração da Campanha"
        className="w-full max-w-md flex flex-col gap-5 bg-parchment-50 border-2 border-parchment-600 rounded-sm p-6"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        <header className="text-center">
          <p className="text-[10px] ink-italic tracking-[0.3em] uppercase mb-1">Forjar Herói</p>
          <h2 className="text-xl font-display text-ink-500 tracking-widest uppercase">
            Como vai ser essa campanha?
          </h2>
        </header>

        <fieldset>
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
            Método de atributos
          </legend>
          <div className="flex flex-col gap-1">
            {METHODS.map(m => (
              <label key={m.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="method"
                  value={m.value}
                  checked={method === m.value}
                  onChange={() => setMethod(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowFeats}
            onChange={e => setAllowFeats(e.target.checked)}
          />
          Permitir feats no lugar de ASI
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowMulticlass}
            onChange={e => setAllowMulticlass(e.target.checked)}
          />
          Permitir multiclasse
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Nível inicial</span>
          <input
            type="number"
            min={1}
            max={20}
            value={startLevel}
            onChange={e => setStartLevel(e.target.value)}
            className="w-16 px-2 py-1 border-2 border-parchment-600 rounded-sm bg-parchment-50 text-ink-500 text-right"
          />
        </label>

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Cancelar</button>
          <button
            type="submit"
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide"
          >Começar</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 6.4: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-CampaignSetupModal
```
Esperado: PASS, 4 testes verdes.

- [ ] **Step 6.5: Commit + push**

```bash
git add src/components/CharacterWizardV2/CampaignSetupModal.jsx src/test/wizardV2-CampaignSetupModal.test.jsx
git commit -m "feat(wizardV2): CampaignSetupModal com 4 perguntas + clamp de nível"
git push origin HEAD
```

---

## Task 7: Mini-modais de fluxo (`ResumeDraftPrompt` e `ConfirmExitPrompt`)

**Files:**
- Create: `src/components/CharacterWizardV2/ResumeDraftPrompt.jsx`
- Create: `src/components/CharacterWizardV2/ConfirmExitPrompt.jsx`
- Test: `src/test/wizardV2-prompts.test.jsx`

**Comportamento:**
- `ResumeDraftPrompt`: `{ open, onResume, onDiscard }` — pergunta "Continuar personagem em construção?" com botões "Continuar" / "Começar novo".
- `ConfirmExitPrompt`: `{ open, onSaveAndExit, onDiscard, onCancel }` — pergunta "Sair sem finalizar?" com botões "Salvar e sair" / "Descartar progresso" / "Cancelar".

- [ ] **Step 7.1: Escrever testes failing**

```jsx
// src/test/wizardV2-prompts.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumeDraftPrompt } from '../components/CharacterWizardV2/ResumeDraftPrompt'
import { ConfirmExitPrompt } from '../components/CharacterWizardV2/ConfirmExitPrompt'

describe('ResumeDraftPrompt', () => {
  it('chama onResume ao clicar Continuar', async () => {
    const onResume = vi.fn()
    render(<ResumeDraftPrompt open={true} onResume={onResume} onDiscard={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(onResume).toHaveBeenCalled()
  })

  it('chama onDiscard ao clicar Começar novo', async () => {
    const onDiscard = vi.fn()
    render(<ResumeDraftPrompt open={true} onResume={() => {}} onDiscard={onDiscard} />)
    await userEvent.click(screen.getByRole('button', { name: /começar novo/i }))
    expect(onDiscard).toHaveBeenCalled()
  })

  it('não renderiza quando open=false', () => {
    render(<ResumeDraftPrompt open={false} onResume={() => {}} onDiscard={() => {}} />)
    expect(screen.queryByText(/continuar/i)).not.toBeInTheDocument()
  })
})

describe('ConfirmExitPrompt', () => {
  it('renderiza 3 botões e dispara handlers correspondentes', async () => {
    const onSave = vi.fn(), onDiscard = vi.fn(), onCancel = vi.fn()
    render(
      <ConfirmExitPrompt open={true}
        onSaveAndExit={onSave} onDiscard={onDiscard} onCancel={onCancel} />
    )
    await userEvent.click(screen.getByRole('button', { name: /salvar e sair/i }))
    await userEvent.click(screen.getByRole('button', { name: /descartar/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onSave).toHaveBeenCalled()
    expect(onDiscard).toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-prompts
```
Esperado: FAIL.

- [ ] **Step 7.3: Implementar `ResumeDraftPrompt.jsx`**

```jsx
// src/components/CharacterWizardV2/ResumeDraftPrompt.jsx
export function ResumeDraftPrompt({ open, onResume, onDiscard }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <div
        role="dialog"
        className="w-full max-w-sm bg-parchment-50 border-2 border-parchment-600 rounded-sm p-5 flex flex-col gap-4"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        <h2 className="text-base font-display text-ink-500 tracking-widest uppercase text-center">
          Continuar personagem em construção?
        </h2>
        <p className="text-sm text-ink-300 text-center">
          Encontramos um rascunho salvo na sua sessão.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Começar novo</button>
          <button
            type="button"
            onClick={onResume}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide"
          >Continuar</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7.4: Implementar `ConfirmExitPrompt.jsx`**

```jsx
// src/components/CharacterWizardV2/ConfirmExitPrompt.jsx
export function ConfirmExitPrompt({ open, onSaveAndExit, onDiscard, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <div
        role="dialog"
        className="w-full max-w-sm bg-parchment-50 border-2 border-parchment-600 rounded-sm p-5 flex flex-col gap-4"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        <h2 className="text-base font-display text-ink-500 tracking-widest uppercase text-center">
          Sair sem finalizar?
        </h2>
        <p className="text-sm text-ink-300 text-center">
          O personagem ainda não foi inscrito.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onSaveAndExit}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide"
          >Salvar e sair</button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-red-700 text-ink-300 hover:text-red-700 text-sm font-display tracking-wide"
          >Descartar progresso</button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Cancelar</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7.5: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-prompts
```
Esperado: PASS, 4 testes verdes.

- [ ] **Step 7.6: Commit + push**

```bash
git add src/components/CharacterWizardV2/ResumeDraftPrompt.jsx src/components/CharacterWizardV2/ConfirmExitPrompt.jsx src/test/wizardV2-prompts.test.jsx
git commit -m "feat(wizardV2): mini-modais ResumeDraft e ConfirmExit"
git push origin HEAD
```

---

## Task 8: Shell `CharacterWizardV2` integrando tudo

**Files:**
- Create: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`
- Modify: `src/components/CharacterWizardV2/index.js` (export)
- Test: `src/test/e2e/wizardV2-shell.test.jsx`

**Comportamento:**
- Props: `{ onBack, onComplete }` (mesmas do wizard antigo).
- Estado interno: `phase` = `'setup'` | `'resume'` | `'grid'`; `openBlockId` = `null` ou id de bloco; `exitConfirm` = boolean.
- Ao montar: se `sessionStorage['wizard-v2-draft']` existe → `phase = 'resume'`; senão → `phase = 'setup'`.
- `phase === 'setup'`: renderiza `CampaignSetupModal`. Confirmar → cria draft com settings → vai pra `'grid'`. Cancelar → `onBack()`.
- `phase === 'resume'`: renderiza `ResumeDraftPrompt`. Continuar → `useDraft({ resume: true })` → `'grid'`. Começar novo → limpa storage → `'setup'`.
- `phase === 'grid'`: renderiza header + grid de cards. Botão "← Personagens" → se `hasChanges`, abre `ConfirmExitPrompt`; senão `onBack()`. Botão "✦ Inscrever Herói ✦" desabilitado em PR 1 (só destrava na PR 5).
- Clicar em card → setar `openBlockId` → renderizar `BlockEditorModal` com placeholder "Em construção (PR seguinte)".

- [ ] **Step 8.1: Escrever testes failing (E2E shell)**

```jsx
// src/test/e2e/wizardV2-shell.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterWizardV2 } from '../../components/CharacterWizardV2/CharacterWizardV2'

describe('E2E — CharacterWizardV2 shell', () => {
  beforeEach(() => sessionStorage.clear())

  it('abre setup modal ao montar sem draft salvo', () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    expect(screen.getByRole('dialog', { name: /configuração da campanha/i })).toBeInTheDocument()
  })

  it('confirmar setup leva ao grid com 8 cards', async () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    // grid renderiza os 8 labels
    for (const label of ['Raça', 'Classe', 'Antecedente', 'Atributos', 'Perícias', 'Magias', 'Conceito', 'Revisão']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('clicar em card abre modal placeholder', async () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /raça/i }))
    expect(screen.getByText(/em construção/i)).toBeInTheDocument()
  })

  it('mostra ResumeDraftPrompt se sessionStorage tem draft', () => {
    sessionStorage.setItem('wizard-v2-draft', JSON.stringify({ name: 'Salvo' }))
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    expect(screen.getByText(/continuar personagem em construção/i)).toBeInTheDocument()
  })

  it('botão Inscrever Herói está desabilitado em PR 1 (review nunca completo aqui)', async () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(screen.getByRole('button', { name: /inscrever herói/i })).toBeDisabled()
  })

  it('voltar sem mudanças chama onBack direto', async () => {
    const onBack = vi.fn()
    render(<CharacterWizardV2 onBack={onBack} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /personagens/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
```

(Adicionar `import { vi } from 'vitest'` se faltar nos imports.)

- [ ] **Step 8.2: Rodar testes — esperado falhar**

```bash
npm test -- wizardV2-shell
```
Esperado: FAIL.

- [ ] **Step 8.3: Implementar `CharacterWizardV2.jsx`**

```jsx
// src/components/CharacterWizardV2/CharacterWizardV2.jsx
import { useState, useEffect } from 'react'
import { CampaignSetupModal } from './CampaignSetupModal'
import { BlockCard } from './BlockCard'
import { BlockEditorModal } from './BlockEditorModal'
import { ResumeDraftPrompt } from './ResumeDraftPrompt'
import { ConfirmExitPrompt } from './ConfirmExitPrompt'
import { BLOCKS } from './blocks-config'
import { useDraft } from './hooks/useDraft'
import { useBlockStatus } from './hooks/useBlockStatus'

const STORAGE_KEY = 'wizard-v2-draft'

function summaryFor(blockId, draft) {
  switch (blockId) {
    case 'race':       return draft.race || 'preencher...'
    case 'class':      return draft.class ? `${draft.class} ${draft.level}` : 'preencher...'
    case 'background': return draft.background || 'preencher...'
    case 'attributes': {
      const vals = Object.values(draft.baseAttributes ?? {})
      const filled = vals.filter(v => v > 0).length
      return filled === 0 ? 'preencher...' : `${filled}/6 atributos`
    }
    case 'skills':     return (draft.chosenSkills?.length ?? 0) === 0
      ? 'preencher...'
      : `${draft.chosenSkills.length} perícias`
    case 'spells': {
      const total = (draft.spells?.length ?? 0) + (draft.bonusSpells?.length ?? 0)
      return total === 0 ? 'preencher...' : `${total} magias`
    }
    case 'concept':    return draft.name?.trim() || 'preencher...'
    case 'review':     return 'em revisão'
    default:           return 'preencher...'
  }
}

const LABEL_BY_ID = Object.fromEntries(BLOCKS.map(b => [b.id, b.label]))

export function CharacterWizardV2({ onBack, onComplete: _onComplete }) {
  const hasSavedDraft = !!sessionStorage.getItem(STORAGE_KEY)
  const [phase, setPhase] = useState(hasSavedDraft ? 'resume' : 'setup')
  const [pendingSettings, setPendingSettings] = useState(null)
  const [resumeRequested, setResumeRequested] = useState(false)
  const [openBlockId, setOpenBlockId] = useState(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  // useDraft só é "armado" quando entramos no grid; antes disso o estado é o setup/resume.
  const draftEnabled = phase === 'grid'
  const { draft, hasChanges, resetDraft } = useDraft({
    initialSettings: pendingSettings,
    resume: resumeRequested,
  })
  const blockStatus = useBlockStatus(draft)

  // Cleanup quando desmonta sem finalizar
  useEffect(() => () => { /* draft persiste em sessionStorage propositalmente */ }, [])

  if (phase === 'resume') {
    return (
      <ResumeDraftPrompt
        open={true}
        onResume={() => { setResumeRequested(true); setPhase('grid') }}
        onDiscard={() => { sessionStorage.removeItem(STORAGE_KEY); setPhase('setup') }}
      />
    )
  }

  if (phase === 'setup') {
    return (
      <CampaignSetupModal
        open={true}
        onCancel={onBack}
        onConfirm={settings => { setPendingSettings(settings); setPhase('grid') }}
      />
    )
  }

  function handleBackClick() {
    if (hasChanges) setExitConfirmOpen(true)
    else onBack()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-parchment-100">
      <header className="flex items-center gap-4 px-6 py-3.5 border-b-2 border-parchment-600 bg-parchment-100"
        style={{ boxShadow: 'var(--shadow-parchment)' }}>
        <button
          onClick={handleBackClick}
          className="text-ink-200 hover:text-ink-500 text-sm font-display tracking-wide"
        >← Personagens</button>
        <div className="w-px h-4 bg-parchment-600" />
        <h1 className="text-sm font-display text-ink-500 tracking-widest uppercase">
          Forjar Herói
        </h1>
        <button
          type="button"
          disabled={blockStatus.review.status !== 'completo'}
          className="ml-auto px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-35 disabled:cursor-not-allowed"
        >✦ Inscrever Herói ✦</button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {BLOCKS.map(b => {
            const s = blockStatus[b.id]
            return (
              <BlockCard
                key={b.id}
                dataTestId={`block-card-${b.id}`}
                label={b.label}
                status={s.status}
                summary={summaryFor(b.id, draft)}
                blockedBy={s.blockedBy.map(id => LABEL_BY_ID[id] ?? id)}
                onClick={() => setOpenBlockId(b.id)}
              />
            )
          })}
        </div>
      </div>

      <BlockEditorModal
        open={openBlockId !== null}
        title={openBlockId ? LABEL_BY_ID[openBlockId] : ''}
        onClose={() => setOpenBlockId(null)}
      >
        <p className="text-sm text-ink-300 italic text-center py-12">
          Em construção (PR seguinte).
        </p>
      </BlockEditorModal>

      <ConfirmExitPrompt
        open={exitConfirmOpen}
        onSaveAndExit={() => { setExitConfirmOpen(false); onBack() }}
        onDiscard={() => {
          resetDraft()
          setExitConfirmOpen(false)
          onBack()
        }}
        onCancel={() => setExitConfirmOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 8.4: Atualizar `index.js`**

```js
// src/components/CharacterWizardV2/index.js
export { CharacterWizardV2 } from './CharacterWizardV2'
```

- [ ] **Step 8.5: Rodar testes — esperado passar**

```bash
npm test -- wizardV2-shell
```
Esperado: PASS, 6 testes verdes.

- [ ] **Step 8.6: Rodar suite completa pra checar zero regressão**

```bash
npm test
```
Esperado: PASS em todos os arquivos (incluindo testes pré-existentes).

- [ ] **Step 8.7: Commit + push**

```bash
git add src/components/CharacterWizardV2/CharacterWizardV2.jsx src/components/CharacterWizardV2/index.js src/test/e2e/wizardV2-shell.test.jsx
git commit -m "feat(wizardV2): shell completo (setup→resume→grid + modal placeholder)"
git push origin HEAD
```

---

## Task 9: Feature flag em `App.jsx`

**Files:**
- Modify: `src/App.jsx` (lazy import + lógica de seleção)

**Comportamento:**
- Adicionar `lazy` import de `CharacterWizardV2`.
- Helper `shouldUseWizardV2()` checa `URLSearchParams` e `localStorage`.
- Quando `view.kind === VIEW.NEW`: renderizar V2 ou antigo conforme flag.

- [ ] **Step 9.1: Editar `App.jsx`**

Substituir o trecho de imports e o bloco do `VIEW.NEW`:

```jsx
// src/App.jsx (trechos)

// ... imports existentes mantidos ...

const CharacterWizard = lazy(() =>
  import('./components/CharacterWizard/CharacterWizard').then(m => ({ default: m.CharacterWizard }))
)
const CharacterWizardV2 = lazy(() =>
  import('./components/CharacterWizardV2').then(m => ({ default: m.CharacterWizardV2 }))
)

function shouldUseWizardV2() {
  if (typeof window === 'undefined') return false
  try {
    const url = new URLSearchParams(window.location.search)
    if (url.get('v2') === '1') return true
  } catch { /* ignore */ }
  try {
    return localStorage.getItem('wizardV2') === 'true'
  } catch { return false }
}

// dentro do JSX, substituir o bloco {view.kind === VIEW.NEW && ...} por:
{view.kind === VIEW.NEW && (
  shouldUseWizardV2()
    ? <CharacterWizardV2 onBack={goToList} onComplete={goToSheet} />
    : <CharacterWizard onBack={goToList} onComplete={goToSheet} />
)}
```

- [ ] **Step 9.2: Adicionar teste de seleção de wizard**

Criar `src/test/wizardV2-feature-flag.test.jsx`:

```jsx
// src/test/wizardV2-feature-flag.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock dos dois wizards pra detectar qual renderizou (sem carregar dependências do SRD)
vi.mock('../components/CharacterWizard/CharacterWizard', () => ({
  CharacterWizard: () => <div>Wizard Antigo</div>,
}))
vi.mock('../components/CharacterWizardV2', () => ({
  CharacterWizardV2: () => <div>Wizard V2</div>,
}))
// Mock do CharacterList pra ter botão Criar acessível sem SRD/personagens.
vi.mock('../components/CharacterList', () => ({
  CharacterList: ({ onCreate }) => (
    <button onClick={onCreate}>Criar Personagem</button>
  ),
}))
// Mocks dos providers pra evitar fetch SRD.
vi.mock('../providers/SrdProvider', () => ({
  SrdProvider: ({ children }) => <>{children}</>,
}))
vi.mock('../context/DiceRollerContext', () => ({
  DiceRollerProvider: ({ children }) => <>{children}</>,
}))
vi.mock('../components/DiceRoller/DiceHistoryPanel', () => ({
  DiceHistoryPanel: () => null,
}))
vi.mock('../components/Bestiary/BestiaryButton', () => ({
  BestiaryButton: () => null,
}))

import App from '../App'

describe('Feature flag — seleção de wizard', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('sem flag, usa wizard antigo', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /criar personagem/i }))
    expect(await screen.findByText('Wizard Antigo')).toBeInTheDocument()
  })

  it('com ?v2=1, usa wizard V2', async () => {
    window.history.replaceState({}, '', '/?v2=1')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /criar personagem/i }))
    expect(await screen.findByText('Wizard V2')).toBeInTheDocument()
  })

  it('com localStorage.wizardV2=true, usa V2', async () => {
    localStorage.setItem('wizardV2', 'true')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /criar personagem/i }))
    expect(await screen.findByText('Wizard V2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 9.3: Rodar teste — esperado passar (depois de aplicar a edição em App.jsx)**

```bash
npm test -- wizardV2-feature-flag
```
Esperado: PASS, 3 testes verdes.

- [ ] **Step 9.4: Rodar suite completa pra checar zero regressão**

```bash
npm test
```
Esperado: PASS em todos os arquivos.

- [ ] **Step 9.5: Commit + push**

```bash
git add src/App.jsx src/test/wizardV2-feature-flag.test.jsx
git commit -m "feat(wizardV2): feature flag (?v2=1 ou localStorage.wizardV2)"
git push origin HEAD
```

---

## Task 10: Verificação manual + ajustes finais

- [ ] **Step 10.1: Subir dev server e testar manualmente**

```bash
npm run dev
```

Abrir `http://localhost:5173/?v2=1` no navegador. Verificar:
1. Clicar "Criar Personagem" abre `CampaignSetupModal`.
2. Confirmar leva ao grid com 8 cards.
3. Cards de Atributos, Perícias e Magias mostram 🔒 (bloqueados).
4. Clicar Raça abre modal "Em construção".
5. Clicar "← Personagens" volta direto (sem mudanças).
6. Refresh na página com draft mostra modal "Continuar?".

Sem `?v2=1` (`http://localhost:5173/`), confirmar que o wizard antigo continua funcionando idêntico.

- [ ] **Step 10.2: Se algum bug encontrado, registrar e corrigir antes de fechar a PR**

Nada de "ah depois eu vejo". Bug encontrado = task adicional aqui mesmo, com teste cobrindo a regressão.

- [ ] **Step 10.3: Abrir PR no GitHub**

```bash
gh pr create --title "feat(wizardV2): PR 1 — shell, grid e setup modal (com placeholders)" --body "$(cat <<'EOF'
## Summary
- Cria `CharacterWizardV2` em paralelo, ativável por `?v2=1` na URL ou `localStorage.wizardV2=true`
- Shell em grid não-linear com 8 cards (placeholders nesta PR; conteúdo dos blocos chega nas próximas)
- `CampaignSetupModal` upfront com 4 perguntas (método de atributos, feats, multiclasse, nível inicial)
- Hooks centrais: `useDraft` (autosave em sessionStorage) + `useBlockStatus` (lógica placeholder)
- Mini-modais de fluxo: continuar/descartar rascunho, sair sem finalizar
- Wizard antigo continua intocado e é o default

## Spec
[docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md](../tree/claude/naughty-kalam-b9eac8/docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md)

## Test plan
- [x] `npm test` — toda suite passa, incluindo testes pré-existentes
- [x] Manual: `?v2=1` mostra V2; sem flag mostra antigo idêntico
- [x] Manual: refresh com draft em sessionStorage mostra "Continuar?"
- [x] Manual: cards bloqueados (Atributos sem Raça etc.) não abrem modal
EOF
)"
```

---

## Self-review (antes de fechar a PR)

- [ ] **Spec coverage** — releia a seção "Visão geral do PR" no topo deste plano contra o spec. Os 6 itens da "Visão geral" estão cobertos por tasks?
- [ ] **Sem placeholders** — busque "TBD"/"TODO"/"implementar depois" no diff. Não pode haver.
- [ ] **Consistência de nomes** — `CharacterWizardV2`, `BlockCard`, `BlockEditorModal`, `useDraft`, `useBlockStatus`, `INITIAL_DRAFT_V2`, `BLOCKS`, `STORAGE_KEY = 'wizard-v2-draft'`, `localStorage.wizardV2`. Mesmos em todos os arquivos.
- [ ] **Sem regressão** — `npm test` verde, e teste manual sem `?v2=1` mostra wizard antigo idêntico.

Se algo falhar, conserte aqui antes de mandar PR pra revisão.

---

## Adiado para PRs futuras (intencional)

- **Botão "⚙ campanha" no header** que reabre `CampaignSetupModal` — depende do bloco Atributos existir pra implementar a regra "trocar método zera valores". Vai junto com PR 4 (`AttributesBlock`).
- **Bloco Magias condicional** (só aparecer pra classe conjuradora) — vai junto com PR 5 (`SpellsBlock`).
- **Lógica fina de status por bloco** (ex: classe `parcial` quando subclasse falta) — chega conforme cada bloco é construído.

## Próxima PR (referência)

PR 2 substitui o placeholder "Em construção" do bloco Raça e Conceito por componentes reais (`RaceBlock`, `ConceptBlock`). Padrão validado nesta PR vira modelo pras seguintes.
