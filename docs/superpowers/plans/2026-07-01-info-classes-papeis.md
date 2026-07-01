# Botão ℹ "Sobre a Classe" com papéis de foco — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão ℹ ao lado do seletor de classe (criação e multiclasse) que abre um modal em pergaminho com papéis de foco (pílulas coloridas + explicação de novato), resumo e lore completa da classe.

**Architecture:** Um helper puro (`class-roles.js`) centraliza cor e definição de cada papel. Um componente de corpo sem estado (`ClassInfoContent`) e um wrapper auto-contido com o modal (`ClassInfoButton`) são montados nos dois seletores. Os papéis vivem como campo `roles` no JSON de classes. O primitivo `Modal` ganha uma pilha para que Esc só feche o modal do topo.

**Tech Stack:** React, Vitest, @testing-library/react + user-event, Tailwind (paletas remapeadas no `index.css`), dados em `public/srd-data`.

**Spec:** [docs/superpowers/specs/2026-07-01-info-classes-papeis-design.md](../specs/2026-07-01-info-classes-papeis-design.md)

---

## Estrutura de arquivos

**Criar:**
- `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles.js` — `roleStyle(role)` + `ROLE_DEFINITIONS` + `ROLE_ORDER`.
- `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoContent.jsx` — corpo do modal (pílulas + legenda + resumo + lore).
- `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoButton.jsx` — botão ℹ + estado + `Modal`.
- Testes: `src/test/class-roles.test.js`, `src/test/ClassInfoContent.test.jsx`, `src/test/ClassInfoButton.test.jsx`, `src/test/Modal-stack.test.jsx`, `src/test/class-roles-data.test.js`.

**Modificar:**
- `public/srd-data/phb-classes-pt.json` — campo `roles` nas 12 classes.
- `public/srd-data/tasha-classes-pt.json` — campo `roles` no Artífice.
- `vite.config.js:97` — bump `srd-data-v19` → `srd-data-v20`.
- `src/components/ui/Modal.jsx` — pilha de modais no efeito de Esc.
- `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker.jsx` — montar `ClassInfoButton`.
- `src/systems/dnd5e/components/CharacterWizardV2/MulticlassModal.jsx` — montar `ClassInfoButton`.
- `src/test/wizardV2-ClassPicker.test.jsx` — cobrir presença/ausência do ℹ.

---

## Task 1: Helper de papéis (`class-roles.js`)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles.js`
- Test: `src/test/class-roles.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/class-roles.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { roleStyle, ROLE_DEFINITIONS, ROLE_ORDER } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles'

const ALL_ROLES = [
  'DANO CORPO A CORPO', 'DANO À DISTÂNCIA', 'DANO MÁGICO', 'CURA', 'SUPORTE',
  'TANQUE', 'CONTROLE', 'UTILIDADE', 'FURTIVIDADE', 'INVOCAÇÃO',
]

describe('class-roles', () => {
  it('roleStyle retorna classes de cor para cada papel conhecido', () => {
    for (const role of ALL_ROLES) {
      const cls = roleStyle(role)
      expect(typeof cls).toBe('string')
      expect(cls.length).toBeGreaterThan(0)
    }
  })

  it('roleStyle usa vermelho pra dano corpo a corpo e verde pra cura', () => {
    expect(roleStyle('DANO CORPO A CORPO')).toContain('red')
    expect(roleStyle('CURA')).toContain('green')
  })

  it('roleStyle tem fallback neutro pra papel desconhecido', () => {
    expect(roleStyle('QUALQUER COISA')).toContain('parchment')
  })

  it('ROLE_DEFINITIONS tem frase pra todos os 10 papéis', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_DEFINITIONS[role]).toBeTruthy()
      expect(ROLE_DEFINITIONS[role].length).toBeGreaterThan(10)
    }
  })

  it('ROLE_ORDER lista os 10 papéis', () => {
    expect([...ROLE_ORDER].sort()).toEqual([...ALL_ROLES].sort())
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/test/class-roles.test.js`
Expected: FAIL — módulo `class-roles` não existe.

- [ ] **Step 3: Implementar o helper**

Criar `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles.js`:

```js
// Papéis de foco de classe: cor (pílula) e definição de novato.
// Só existem 8 famílias de cor seguras no tema (index.css remapeia Tailwind);
// INVOCAÇÃO compartilha o verde com CURA de propósito. FURTIVIDADE usa cinza/ink.
const ROLE_STYLES = {
  'DANO CORPO A CORPO': 'border-red-700 bg-red-50 text-red-700',
  'DANO À DISTÂNCIA':   'border-orange-700 bg-orange-50 text-orange-700',
  'DANO MÁGICO':        'border-purple-700 bg-purple-50 text-purple-700',
  'CURA':               'border-green-700 bg-green-50 text-green-700',
  'SUPORTE':            'border-blue-700 bg-blue-50 text-blue-700',
  'TANQUE':             'border-sky-700 bg-sky-50 text-sky-700',
  'CONTROLE':           'border-amber-700 bg-amber-50 text-amber-700',
  'UTILIDADE':          'border-yellow-700 bg-yellow-50 text-yellow-700',
  'FURTIVIDADE':        'border-ink-300 bg-parchment-100 text-ink-500',
  'INVOCAÇÃO':          'border-green-700 bg-green-50 text-green-700',
}

const FALLBACK_STYLE = 'border-parchment-600 bg-parchment-100 text-ink-500'

export const ROLE_DEFINITIONS = {
  'DANO CORPO A CORPO': 'Fica na linha de frente e causa dano de perto (espadas, machados, punhos).',
  'DANO À DISTÂNCIA':   'Causa dano de longe, com arcos, bestas ou armas de arremesso.',
  'DANO MÁGICO':        'Causa dano com magias — fogo, raios, energia arcana.',
  'CURA':               'Restaura pontos de vida e mantém o grupo de pé.',
  'SUPORTE':            'Fortalece aliados e atrapalha inimigos com bênçãos, buffs e ajuda.',
  'TANQUE':             'Aguenta muito dano e protege os aliados segurando os inimigos.',
  'CONTROLE':           'Domina o campo — prende, atordoa ou reposiciona vários inimigos de uma vez.',
  'UTILIDADE':          'Resolve problemas fora do combate: exploração, social, truques variados.',
  'FURTIVIDADE':        'Age nas sombras — esgueira-se, desarma armadilhas, ataca pelas costas.',
  'INVOCAÇÃO':          'Conjura criaturas, espíritos ou constructos que lutam ao seu lado.',
}

export const ROLE_ORDER = Object.keys(ROLE_DEFINITIONS)

export function roleStyle(role) {
  return ROLE_STYLES[role] ?? FALLBACK_STYLE
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/test/class-roles.test.js`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles.js src/test/class-roles.test.js
git commit -m "feat(class-info): helper de papeis (cor + definicao)"
```

---

## Task 2: Pilha de modais (Esc só no topo)

**Files:**
- Modify: `src/components/ui/Modal.jsx`
- Test: `src/test/Modal-stack.test.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/Modal-stack.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../components/ui/Modal'

describe('Modal — pilha de Esc', () => {
  it('modal único fecha no Esc', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Único">corpo</Modal>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('com dois modais abertos, Esc fecha só o de cima', async () => {
    const onCloseOuter = vi.fn()
    const onCloseInner = vi.fn()
    render(
      <>
        <Modal open onClose={onCloseOuter} title="Externo">externo</Modal>
        <Modal open onClose={onCloseInner} title="Interno">interno</Modal>
      </>
    )
    await userEvent.keyboard('{Escape}')
    expect(onCloseInner).toHaveBeenCalledTimes(1)
    expect(onCloseOuter).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/test/Modal-stack.test.jsx`
Expected: FAIL no segundo teste — hoje os dois `onClose` são chamados.

- [ ] **Step 3: Implementar a pilha**

Em `src/components/ui/Modal.jsx`, adicionar a constante de módulo logo após os imports (antes de `const SIZE_CLS`):

```js
// Pilha de modais abertos: só o modal do topo responde ao Esc, pra que
// modais aninhados (ex.: info de classe sobre a MulticlassModal) não fechem
// os dois de uma vez. Nível de módulo = compartilhado por todas as instâncias.
const modalStack = []
```

Substituir o efeito de Esc/foco (o `useEffect` que registra `keydown`) por:

```js
  // Esc fecha (só se este for o modal do topo) + foco inicial — roda só na
  // transição de open.
  useEffect(() => {
    if (!open) return
    modalStack.push(titleId)
    function onKey(e) {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === titleId) {
        onCloseRef.current?.()
      }
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      (initialFocusRef?.current ?? closeRef.current)?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      const i = modalStack.indexOf(titleId)
      if (i !== -1) modalStack.splice(i, 1)
    }
  }, [open, initialFocusRef, titleId])
```

(`titleId` já existe no componente — `useRef` estável — e entra nas deps sem risco.)

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npx vitest run src/test/Modal-stack.test.jsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Rodar a suíte de modais existentes pra garantir não-regressão**

Run: `npx vitest run src/test/ -t "modal"`
Expected: PASS (ou "no tests" se nenhum casar — sem falhas).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Modal.jsx src/test/Modal-stack.test.jsx
git commit -m "fix(modal): pilha faz Esc fechar so o modal do topo"
```

---

## Task 3: Campo `roles` nos dados de classe + bump do SW

**Files:**
- Modify: `public/srd-data/phb-classes-pt.json` (12 classes)
- Modify: `public/srd-data/tasha-classes-pt.json` (Artífice)
- Modify: `vite.config.js:97`
- Test: `src/test/class-roles-data.test.js`

Atribuição de papéis por índice de classe:

| index | roles |
|---|---|
| `barbaro` | `["DANO CORPO A CORPO", "TANQUE"]` |
| `bardo` | `["SUPORTE", "CONTROLE", "UTILIDADE"]` |
| `clerigo` | `["CURA", "SUPORTE", "DANO MÁGICO"]` |
| `druida` | `["CURA", "CONTROLE", "INVOCAÇÃO"]` |
| `guerreiro` | `["DANO CORPO A CORPO", "DANO À DISTÂNCIA", "TANQUE"]` |
| `monge` | `["DANO CORPO A CORPO", "UTILIDADE"]` |
| `paladino` | `["DANO CORPO A CORPO", "CURA", "TANQUE"]` |
| `patrulheiro` | `["DANO À DISTÂNCIA", "UTILIDADE"]` |
| `ladino` | `["FURTIVIDADE", "DANO À DISTÂNCIA", "UTILIDADE"]` |
| `feiticeiro` | `["DANO MÁGICO", "CONTROLE"]` |
| `bruxo` | `["DANO MÁGICO", "CONTROLE", "UTILIDADE"]` |
| `mago` | `["DANO MÁGICO", "CONTROLE", "INVOCAÇÃO"]` |
| `artifice` | `["SUPORTE", "UTILIDADE", "INVOCAÇÃO"]` |

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/class-roles-data.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

function loadJson(rel) {
  const url = new URL(rel, import.meta.url)
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
}

const EXPECTED = {
  barbaro: ['DANO CORPO A CORPO', 'TANQUE'],
  bardo: ['SUPORTE', 'CONTROLE', 'UTILIDADE'],
  clerigo: ['CURA', 'SUPORTE', 'DANO MÁGICO'],
  druida: ['CURA', 'CONTROLE', 'INVOCAÇÃO'],
  guerreiro: ['DANO CORPO A CORPO', 'DANO À DISTÂNCIA', 'TANQUE'],
  monge: ['DANO CORPO A CORPO', 'UTILIDADE'],
  paladino: ['DANO CORPO A CORPO', 'CURA', 'TANQUE'],
  patrulheiro: ['DANO À DISTÂNCIA', 'UTILIDADE'],
  ladino: ['FURTIVIDADE', 'DANO À DISTÂNCIA', 'UTILIDADE'],
  feiticeiro: ['DANO MÁGICO', 'CONTROLE'],
  bruxo: ['DANO MÁGICO', 'CONTROLE', 'UTILIDADE'],
  mago: ['DANO MÁGICO', 'CONTROLE', 'INVOCAÇÃO'],
}

describe('roles nos dados de classe', () => {
  const phb = loadJson('../../public/srd-data/phb-classes-pt.json')
  const tasha = loadJson('../../public/srd-data/tasha-classes-pt.json')

  it('cada classe PHB tem o array roles esperado', () => {
    for (const [index, roles] of Object.entries(EXPECTED)) {
      const cls = phb.find(c => c.index === index)
      expect(cls, `classe ${index} não encontrada`).toBeTruthy()
      expect(cls.roles).toEqual(roles)
    }
  })

  it('Artífice (Tasha) tem roles', () => {
    const art = tasha.find(c => c.index === 'artifice')
    expect(art.roles).toEqual(['SUPORTE', 'UTILIDADE', 'INVOCAÇÃO'])
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/test/class-roles-data.test.js`
Expected: FAIL — `cls.roles` é `undefined`.

- [ ] **Step 3: Adicionar `roles` a cada classe**

Em `public/srd-data/phb-classes-pt.json`, para **cada** classe, inserir a propriedade `roles` logo após a linha `"name": "...",`. Exemplo concreto para o Bárbaro:

```json
    "index": "barbaro",
    "name": "Bárbaro",
    "roles": ["DANO CORPO A CORPO", "TANQUE"],
    "hit_die": 12,
```

Repetir para as 12 classes usando os valores da tabela acima (localizar cada bloco pela linha `"name"`, que é única). Em `public/srd-data/tasha-classes-pt.json`, no Artífice:

```json
    "index": "artifice",
    "name": "Artífice",
    "roles": ["SUPORTE", "UTILIDADE", "INVOCAÇÃO"],
    "hit_die": 8,
```

- [ ] **Step 4: Validar JSON e rodar o teste**

Run: `node -e "require('./public/srd-data/phb-classes-pt.json'); require('./public/srd-data/tasha-classes-pt.json'); console.log('json ok')"`
Expected: `json ok` (sem erro de parse).

Run: `npx vitest run src/test/class-roles-data.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Bump do cacheName do service worker**

Em `vite.config.js:97`, trocar:

```js
              cacheName: 'srd-data-v19',
```

por:

```js
              cacheName: 'srd-data-v20',
```

- [ ] **Step 6: Commit**

```bash
git add public/srd-data/phb-classes-pt.json public/srd-data/tasha-classes-pt.json vite.config.js src/test/class-roles-data.test.js
git commit -m "feat(class-info): campo roles nas classes + bump srd cache v20"
```

---

## Task 4: `ClassInfoContent` (corpo do modal)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoContent.jsx`
- Test: `src/test/ClassInfoContent.test.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/ClassInfoContent.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClassInfoContent } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoContent'

const classData = {
  name: 'Bárbaro',
  roles: ['DANO CORPO A CORPO', 'TANQUE'],
  summary: 'Guerreiros furiosos que entram em fúria primal.',
  fullDescription: 'Um humano alto membro de alguma tribo caminha em meio a uma nevasca.',
}

describe('ClassInfoContent', () => {
  it('mostra resumo e lore', () => {
    render(<ClassInfoContent classData={classData} />)
    expect(screen.getByText(classData.summary)).toBeInTheDocument()
    expect(screen.getByText(classData.fullDescription)).toBeInTheDocument()
  })

  it('mostra a definição de cada papel da classe', () => {
    render(<ClassInfoContent classData={classData} />)
    expect(screen.getByText(/linha de frente e causa dano de perto/i)).toBeInTheDocument()
    expect(screen.getByText(/aguenta muito dano e protege/i)).toBeInTheDocument()
  })

  it('não quebra quando roles está ausente', () => {
    render(<ClassInfoContent classData={{ name: 'X', summary: 's', fullDescription: 'd' }} />)
    expect(screen.getByText('s')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/test/ClassInfoContent.test.jsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar o componente**

Criar `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoContent.jsx`:

```jsx
import { roleStyle, ROLE_DEFINITIONS } from './class-roles'

/**
 * Corpo do modal "Sobre a Classe": pílulas de papel (visão rápida), legenda
 * sempre visível explicando cada papel (linguagem de novato), resumo e lore
 * completa. Sem estado — recebe o objeto de classe já resolvido.
 */
export function ClassInfoContent({ classData }) {
  if (!classData) return null
  const roles = Array.isArray(classData.roles) ? classData.roles : []

  return (
    <div className="flex flex-col gap-4">
      {roles.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {roles.map(r => (
              <span
                key={r}
                className={[
                  'px-2 py-0.5 rounded-full border-2 text-[11px] font-display tracking-wide uppercase',
                  roleStyle(r),
                ].join(' ')}
              >
                {r}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2.5">
            <p className="text-[11px] font-display tracking-widest uppercase text-ink-300">
              O que cada foco significa
            </p>
            {roles.map(r => (
              <div key={r} className="flex items-start gap-2">
                <span
                  className={[
                    'shrink-0 px-1.5 py-0.5 rounded-full border-2 text-[10px] font-display tracking-wide uppercase',
                    roleStyle(r),
                  ].join(' ')}
                >
                  {r}
                </span>
                <span className="text-xs text-ink-500 leading-relaxed">
                  {ROLE_DEFINITIONS[r] ?? ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {classData.summary && (
        <p className="text-sm text-ink-500 font-semibold leading-relaxed">
          {classData.summary}
        </p>
      )}

      {classData.fullDescription && (
        <p className="text-sm text-ink-500 leading-relaxed whitespace-pre-line">
          {classData.fullDescription}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/test/ClassInfoContent.test.jsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoContent.jsx src/test/ClassInfoContent.test.jsx
git commit -m "feat(class-info): ClassInfoContent (pilulas + legenda + lore)"
```

---

## Task 5: `ClassInfoButton` (botão ℹ + modal)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoButton.jsx`
- Test: `src/test/ClassInfoButton.test.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/ClassInfoButton.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassInfoButton } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoButton'

const classData = {
  name: 'Bárbaro',
  roles: ['DANO CORPO A CORPO', 'TANQUE'],
  summary: 'Guerreiros furiosos.',
  fullDescription: 'Lore do bárbaro.',
}

describe('ClassInfoButton', () => {
  it('não renderiza nada sem classData', () => {
    const { container } = render(<ClassInfoButton classData={null} />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('renderiza o botão ℹ e abre o modal ao clicar', async () => {
    render(<ClassInfoButton classData={classData} />)
    const btn = screen.getByRole('button', { name: /sobre a classe/i })
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    // título do modal = nome da classe
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Guerreiros furiosos.')).toBeInTheDocument()
    expect(screen.getByText('Lore do bárbaro.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/test/ClassInfoButton.test.jsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar o componente**

Criar `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoButton.jsx`:

```jsx
import { useState } from 'react'
import { Modal } from '../../../../../../components/ui/Modal'
import { Icon } from '../../../../../../components/ui/Icon'
import { ClassInfoContent } from './ClassInfoContent'

/**
 * Botão ℹ ao lado do seletor de classe. Só aparece quando há classe
 * selecionada (classData). Ao clicar, abre um modal em pergaminho com papéis,
 * resumo e lore completa da classe.
 */
export function ClassInfoButton({ classData }) {
  const [open, setOpen] = useState(false)
  if (!classData) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sobre a classe ${classData.name}`}
        title={`Sobre a classe ${classData.name}`}
        className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-sm border-2 border-parchment-600 text-ink-300 hover:text-ink-600 hover:border-ink-300 hover:bg-parchment-200 transition-colors"
      >
        <Icon name="info" size={18} strokeWidth={2} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={classData.name} size="lg">
        <ClassInfoContent classData={classData} />
      </Modal>
    </>
  )
}
```

> **Nota de caminho (confirmado):** de `blocks/class/` até `src/components/ui/`
> são seis níveis — `../../../../../../components/ui/...`. Igual ao import de
> `InfoPopover` em `ChosenFeaturePicker.jsx` (mesma pasta), já verificado.

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/test/ClassInfoButton.test.jsx`
Expected: PASS (2 testes). Se falhar no import, corrigir a profundidade de `../` conforme a nota.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoButton.jsx src/test/ClassInfoButton.test.jsx
git commit -m "feat(class-info): ClassInfoButton (botao + modal pergaminho)"
```

---

## Task 6: Ligar o ℹ no `ClassPicker` (criação)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker.jsx`
- Test: `src/test/wizardV2-ClassPicker.test.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao `describe('ClassPicker', ...)` em `src/test/wizardV2-ClassPicker.test.jsx` (e trocar o array `classes` local no topo do arquivo para incluir dados de info numa classe):

Trocar o array `classes` do topo por:

```jsx
const classes = [
  { index: 'guerreiro', name: 'Guerreiro', roles: ['DANO CORPO A CORPO', 'TANQUE'], summary: 'Mestres do combate.', fullDescription: 'Lore do guerreiro.' },
  { index: 'mago', name: 'Mago', roles: ['DANO MÁGICO', 'CONTROLE'], summary: 'Conjuradores arcanos.', fullDescription: 'Lore do mago.' },
]
```

Adicionar os testes:

```jsx
  it('mostra o botão ℹ quando há classe selecionada', () => {
    render(<ClassPicker classes={classes} classIndex="mago" level={1} onClassChange={() => {}} onLevelChange={() => {}} />)
    expect(screen.getByRole('button', { name: /sobre a classe mago/i })).toBeInTheDocument()
  })

  it('não mostra o botão ℹ sem classe selecionada', () => {
    render(<ClassPicker classes={classes} classIndex="" level={1} onClassChange={() => {}} onLevelChange={() => {}} />)
    expect(screen.queryByRole('button', { name: /sobre a classe/i })).toBeNull()
  })
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/test/wizardV2-ClassPicker.test.jsx`
Expected: FAIL nos dois testes novos — não há botão ℹ.

- [ ] **Step 3: Montar o `ClassInfoButton` no `ClassPicker`**

Em `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker.jsx`:

Adicionar o import no topo:

```js
import { ClassInfoButton } from './ClassInfoButton'
```

Dentro do componente, antes do `return`, calcular a classe selecionada:

```js
  const selectedClass = classes.find(c => c.index === classIndex) ?? null
```

Trocar o bloco do `<select>` de classe (o primeiro `<div>` com o label "Classe") para envolver select + botão numa linha flex:

```jsx
      <div>
        <label htmlFor="class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Classe <span className="text-red-700">*</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <select
              id="class-select"
              value={classIndex}
              onChange={e => onClassChange(e.target.value)}
              className={fieldCls}
            >
              <option value="">Escolher classe...</option>
              {classes.map(c => (
                <option key={c.index} value={c.index}>{c.name}{sourceSuffix(c.source)}</option>
              ))}
            </select>
          </div>
          <ClassInfoButton classData={selectedClass} />
        </div>
      </div>
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/test/wizardV2-ClassPicker.test.jsx`
Expected: PASS (todos, incluindo os 2 novos).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker.jsx src/test/wizardV2-ClassPicker.test.jsx
git commit -m "feat(class-info): botao Sobre a Classe no ClassPicker"
```

---

## Task 7: Ligar o ℹ no `MulticlassModal`

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/MulticlassModal.jsx`

- [ ] **Step 1: Adicionar o import**

Em `src/systems/dnd5e/components/CharacterWizardV2/MulticlassModal.jsx`, no topo:

```js
import { ClassInfoButton } from './blocks/class/ClassInfoButton'
```

- [ ] **Step 2: Envolver o select de classe secundária com o botão**

Trocar o `<div>` que contém o `<select id="mc-class-select">` para uma linha flex com o botão:

```jsx
        <div>
          <label htmlFor="mc-class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Classe <span className="text-red-700">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <select
                id="mc-class-select"
                value={classIndex}
                onChange={e => setClassIndex(e.target.value)}
                className={fieldCls}
              >
                <option value="">Escolher classe...</option>
                {available.map(c => (
                  <option key={c.index} value={c.index}>{c.name}</option>
                ))}
              </select>
            </div>
            <ClassInfoButton classData={selectedClass} />
          </div>
        </div>
```

(`selectedClass` já existe no componente, linha ~27.)

- [ ] **Step 3: Verificar que a suíte inteira passa**

Run: `npx vitest run`
Expected: PASS (nenhuma regressão; lembrar que o exit code de lint é débito pré-existente e não faz parte deste gate).

- [ ] **Step 4: Verificação visual no app (preview)**

Subir o dev server (preview_start), abrir o wizard, selecionar uma classe e clicar no ℹ. Conferir:
- Modal pergaminho abre com nome no header.
- Pílulas coloridas aparecem com cores distintas (vermelho/verde/etc.).
- Legenda mostra pílula + frase por papel.
- Resumo e lore aparecem legíveis.
- Esc fecha só o modal (na multiclasse, Esc fecha o info e mantém a seleção de multiclasse aberta).

Tirar um screenshot pra comprovar.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/MulticlassModal.jsx
git commit -m "feat(class-info): botao Sobre a Classe na MulticlassModal"
```

---

## Notas finais

- **SW cache:** o bump `srd-data-v20` (Task 3) é obrigatório — sem ele o JSON antigo (sem `roles`) fica servido pelo service worker e a feature não aparece em produção.
- **Papéis são editoriais:** a tabela da Task 3 e as frases da Task 1 são o gosto de jogador do dono; ajustar depois é só editar JSON/`ROLE_DEFINITIONS` (sem tocar em lógica). Ao mudar o JSON, bumpar o cache de novo.
- **Cores:** só há 8 famílias seguras no tema; `INVOCAÇÃO` compartilha verde com `CURA` de propósito. Se a verificação visual mostrar que alguma família (ex.: `yellow-700`) não está definida no `index.css` e renderiza off-theme, trocar por uma das confirmadas (`red, orange, amber, yellow, green, blue, sky, purple`) em `class-roles.js`.
