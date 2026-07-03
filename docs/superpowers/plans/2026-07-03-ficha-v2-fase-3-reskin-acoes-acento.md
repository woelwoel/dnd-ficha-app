# Ficha v2 — Fase 3: Re-skin profundo, fusão da aba Ações e acento por classe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o v2 parecer v2 por inteiro: ponte CSS que re-tematiza os componentes v1 embrulhados (sem editá-los), aba Ações fundida com filtros e trackers, acento de cor por classe nas 13 classes, e banners de erro/conflito no v2.

**Architecture:** Três mecanismos: (1) `classAccents.js` injeta `--v2-accent` no root por classe primária; (2) `legacy-bridge.css` sobrescreve, escopado em `.sheet-v2`, as classes utilitárias parchment/ink que os componentes v1 emitem — re-skin de TODOS os embrulhados (RestActions, Spells, Inventory, FeaturesTab, Notes, modais) num arquivo só, sem tocar v1; (3) `ActionsTab.jsx` substitui o empilhamento da aba Ações por seções filtráveis. Spec: `docs/superpowers/specs/2026-07-03-redesign-ficha-pagina-unica-design.md`. Pré-requisito: fases 1 e 2 mergeadas.

**Tech Stack:** React 19, CSS puro escopado, Vitest + Testing Library, dev server pra verificação visual.

---

## ⚠️ Regras deste projeto

1. **NUNCA use utilitários de COR do Tailwind no v2** — cores via `v2-*`/`var(--v2-*)`. Tailwind só layout.
2. **Nenhum arquivo v1 é editado.** O re-skin dos embrulhados acontece EXCLUSIVAMENTE via `legacy-bridge.css`.
3. Commits pequenos por task com trailer `Co-Authored-By:`; push é do controlador.
4. TDD onde há lógica; a ponte CSS se verifica visualmente (dev server + `?sheetV2=1`) e com os testes existentes.
5. Dívidas desta fase (anotadas na fase 1): o popover de Descansos parchment no header — a ponte CSS resolve.

## Interfaces (verificadas na fase 1)

- `featureUses` (contexto): lista mesclada de `defaultClassFeatureUses(character, classChoices)` + persistidos — shape dos itens: **verifique em `domain/rules.js:758`** (procure o objeto retornado: id, name, max/uses, reset...).
- `spendFeatureUse(id, featureUses)` / `regainFeatureUse(id, featureUses)`.
- `calc.maxSlots` e `calc.safeUsedSlots` (espaços de magia), `toggleSlot` nos updaters.
- Ataques: `character.combat.attacks`; o cálculo de bônus/dano por ataque vive em `Attacks.jsx` — **fonte da verdade**.
- As 13 classes: índices em `useSrd().classes[].index` — confirme os índices exatos (ex.: `artificer`, `barbarian`, `bard`, `cleric`, `druid`, `fighter`, `monk`, `paladin`, `ranger`, `rogue`, `sorcerer`, `warlock`, `wizard`) no JSON de classes em `public/srd-data/` antes da Task 1.

---

### Task 1: Acento por classe (`classAccents.js`)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/classAccents.js`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx`
- Test: `src/test/sheetV2-classAccents.test.js`

- [ ] **Step 1: Confirme os índices das classes** no JSON de classes (`public/srd-data/`, arquivo de classes pt). Ajuste as chaves do mapa abaixo se algum índice diferir.

- [ ] **Step 2: Write the failing test**

```js
// src/test/sheetV2-classAccents.test.js
import { describe, it, expect } from 'vitest'
import { classAccentOf, CLASS_ACCENTS } from '../systems/dnd5e/components/CharacterSheet/v2/classAccents'

describe('classAccentOf', () => {
  it('cobre as 13 classes com hex válido', () => {
    expect(Object.keys(CLASS_ACCENTS)).toHaveLength(13)
    for (const hex of Object.values(CLASS_ACCENTS)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
  it('resolve classe conhecida e cai no fallback teal', () => {
    expect(classAccentOf('wizard')).toBe(CLASS_ACCENTS.wizard)
    expect(classAccentOf('classe-inexistente')).toBe('#4fc7ab')
    expect(classAccentOf(undefined)).toBe('#4fc7ab')
  })
})
```

- [ ] **Step 3: FAIL. Step 4: Implement**

```js
// src/systems/dnd5e/components/CharacterSheet/v2/classAccents.js
/**
 * Acento de cor por classe (spec 2026-07-03). Tons calibrados pra contraste
 * AA como TEXTO sobre --v2-surface-0 (#0f141a) e --v2-surface-1 (#1a222c).
 * Multiclasse usa a classe primária (character.info.class).
 */
export const CLASS_ACCENTS = {
  artificer: '#4fc7ab',
  barbarian: '#e8836f',
  bard:      '#d49ae0',
  cleric:    '#e8ce6f',
  druid:     '#8fc978',
  fighter:   '#d9a06a',
  monk:      '#6fc4d6',
  paladin:   '#e8b04c',
  ranger:    '#7dbd93',
  rogue:     '#aab6c4',
  sorcerer:  '#e88a8a',
  warlock:   '#b195e8',
  wizard:    '#7fb3e8',
}

export function classAccentOf(classIndex) {
  return CLASS_ACCENTS[classIndex] ?? '#4fc7ab'
}
```

- [ ] **Step 5: Aplicar no SheetV2.** No root: `import { classAccentOf } from './classAccents'` e, no div `.sheet-v2`, `style={{ '--v2-accent': classAccentOf(character.info?.class) }}` (o SheetV2 precisa ler `character` via `useCharacterContext` — adicione o hook). Todos os usos de `v2-acc`/`--v2-accent` (marcadores, bônus, aba ativa, botões Usar) herdam automaticamente.

- [ ] **Step 6: Contraste AA.** Verifique cada hex contra `#1a222c` com razão ≥ 4.5:1 (script rápido de luminância no scratchpad, ou ferramenta que preferir). Ajuste tons reprovados clareando até passar; anote no commit os ajustados.

- [ ] **Step 7:** `npx vitest run src/test/sheetV2-classAccents.test.js src/test/sheetV2-SheetV2.test.jsx` → PASS. **Step 8: Commit** — `git commit -m "feat(ficha-v2): acento de cor por classe (13 classes, AA)"`

---

### Task 2: Ponte CSS parchment→v2 (`legacy-bridge.css`)

Esta é a task de maior alavancagem da fase: re-tematiza TODOS os componentes v1 embrulhados de uma vez.

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/legacy-bridge.css`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx` (importar o css) e `EditDialog.jsx` (o painel `.sheet-v2` do portal também pega a ponte automaticamente — nada a fazer além de confirmar)

- [ ] **Step 1: Levantar as classes reais em uso.** Rode um grep pelos utilitários de cor nos componentes v1 embrulhados:

```bash
grep -rhoE '(bg|text|border|ring|divide)-(parchment|ink|gilt|amber|red|green|blood)[a-z0-9/-]*' \
  src/systems/dnd5e/components/CharacterSheet/{Attacks,Spells,Inventory,FeaturesTab,Notes,RestActions,CharacterInfo,SkillsList,LevelProgression,DamageModal,CombatClassActions,ManeuversPanel,ArtificerInfusionsPanel}.jsx \
  src/systems/dnd5e/components/SourcePicker* src/components/ui/ConfirmDialog.jsx 2>/dev/null | sort -u
```

(Ajuste caminhos que não existirem; inclua subpastas de LevelProgression se houver.) A lista resultante é o contrato da ponte.

- [ ] **Step 2: Escrever a ponte.** Para cada classe da lista, um override escopado. Esqueleto com o mapeamento semântico (COMPLETE com a lista real do Step 1 — toda classe encontrada precisa de uma linha):

```css
/* Ponte de re-skin: re-tematiza componentes v1 (parchment) quando renderizados
   dentro do v2, SEM editar os componentes. Morre junto com os componentes v1
   quando forem reescritos nativos. !important porque os utilitários do Tailwind
   têm a mesma especificidade e ordem de import não é garantida. */
.sheet-v2 .bg-parchment-50,
.sheet-v2 .bg-parchment-100 { background-color: var(--v2-surface-1) !important; }
.sheet-v2 .bg-parchment-200,
.sheet-v2 .bg-parchment-300 { background-color: var(--v2-surface-2) !important; }
.sheet-v2 .border-parchment-400,
.sheet-v2 .border-parchment-600 { border-color: var(--v2-border) !important; }
.sheet-v2 .text-ink-500,
.sheet-v2 .text-ink-400 { color: var(--v2-text-1) !important; }
.sheet-v2 .text-ink-300,
.sheet-v2 .text-ink-200 { color: var(--v2-text-2) !important; }
.sheet-v2 .text-gilt-500 { color: var(--v2-accent) !important; }
/* ...complete com TODAS as classes do grep do Step 1, mapeando:
   fundos claros → surface-1/2 · bordas → border · tinta escura → text-1 ·
   tinta média → text-2 · dourado/destaque → accent · vermelho/dano → danger ·
   verde/cura → success · âmbar/aviso → warning */
```

Regras do mapeamento: NUNCA deixe um fundo claro sem override (é o que denuncia o parchment); estados hover (`hover:bg-*`) também precisam de par (`.sheet-v2 .hover\:bg-parchment-200:hover { ... }` — escape do `:` no seletor).

- [ ] **Step 3:** Importar em `SheetV2.jsx`: `import './legacy-bridge.css'` (depois do tokens.css).

- [ ] **Step 4: Verificação visual sistemática** no dev server com `?sheetV2=1`, aba a aba: Ações (RestActions no header, CombatClassActions), Magias, Inventário, Características, Notas, e os modais da fase 2 (identidade, perícias, progressão, DamageModal). Critério de aceite: **nenhum painel de fundo claro** dentro do `.sheet-v2`; texto principal legível. Ache classe sem override → adicione a linha e re-verifique.

- [ ] **Step 5:** `npm run test` (suíte inteira — a ponte não pode quebrar testes v1; ela só se aplica sob `.sheet-v2`) e `npm run build`. **Step 6: Commit** — `git commit -m "feat(ficha-v2): ponte CSS re-tematiza componentes v1 embrulhados"`

---

### Task 3: ActionsTab — estrutura, filtros e ataques nativos

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/ActionsTab.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx` (aba 'acoes' renderiza ActionsTab)
- Test: `src/test/sheetV2-ActionsTab.test.jsx`

- [ ] **Step 1: Estude a fonte da verdade do cálculo de ataque.** Leia `Attacks.jsx` e identifique como bônus de ataque e dano são computados por item de `combat.attacks` (helpers importados de utils/domain, ou inline). Se houver helper exportado, importe-o; se for inline, extraia a MESMA expressão para dentro do ActionsTab (anote a origem em comentário). NÃO altere Attacks.jsx.

- [ ] **Step 2: Write the failing test**

```jsx
// src/test/sheetV2-ActionsTab.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeCharacter } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/Attacks', () => ({ Attacks: () => <div data-testid="attacks-manager" /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CombatClassActions', () => ({ CombatClassActions: () => <div data-testid="ccas" /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/ManeuversPanel', () => ({ ManeuversPanel: () => <div /> }))

import { ActionsTab } from '../systems/dnd5e/components/CharacterSheet/v2/ActionsTab'

function charWithAttack() {
  const ch = makeCharacter()
  ch.combat = {
    ...ch.combat,
    attacks: [{ id: 'atk1', name: 'Machado grande', ability: 'str', proficient: true, damageDie: '1d12', damageType: 'cortante' }],
  }
  return ch
}

describe('ActionsTab', () => {
  it('renderiza filtros e seções', () => {
    renderWithSheetContext(<ActionsTab />, { character: charWithAttack() })
    for (const f of ['Todas', 'Ação', 'Bônus', 'Reação', 'Limitadas']) {
      expect(screen.getByRole('button', { name: f })).toBeInTheDocument()
    }
    expect(screen.getByText('Machado grande')).toBeInTheDocument()
  })

  it('botão gerenciar ataques abre o Attacks v1', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<ActionsTab />, { character: charWithAttack() })
    await user.click(screen.getByRole('button', { name: /Gerenciar ataques/ }))
    expect(screen.getByTestId('attacks-manager')).toBeInTheDocument()
  })
})
```

ATENÇÃO: o shape do ataque no teste acima é PROVISÓRIO — no Step 1 você descobriu o shape real de `combat.attacks` (campos exatos usados por Attacks.jsx). CORRIJA o fixture do teste para o shape real antes de rodar.

- [ ] **Step 3: FAIL. Step 4: Implement `ActionsTab.jsx`:**
  - Pills de filtro (Todas/Ação/Bônus/Reação/Limitadas) — estado local, estilo `v2-chip` com ativo em `--v2-accent`.
  - Seção **ATAQUES** (visível nos filtros Todas/Ação): linhas nativas v2 (`v2-row`): nome, bônus formatado (`calc.fmt`), dano — cálculo do Step 1. Botão `aria-label="Gerenciar ataques"` abre `EditDialog size="md"` com o `Attacks` v1 (props VERBATIM de `MainBox.jsx` fase 1 — que por sua vez copiou de SheetContent).
  - Seção **RECURSOS DE CLASSE** (filtros Todas/Limitadas): renderiza `CombatClassActions` + `ManeuversPanel` (mesmas props do MainBox fase 1) — re-tematizados pela ponte da Task 2.
  - Seção **ESPAÇOS DE MAGIA** (Todas/Limitadas): linhas por círculo com `calc.maxSlots`/`calc.safeUsedSlots` e bolinhas clicáveis via `toggleSlot(level, slotIndex)` — **verifique a assinatura real de `toggleSlot` em `useCharacter.js`** e o formato de maxSlots/safeUsedSlots em `useCharacterCalculations.js:190-191` antes de implementar; só renderiza círculos com total > 0.
  - `readOnly`: o fieldset do MainBox já desabilita tudo — não duplique.

- [ ] **Step 5:** Em `MainBox.jsx`, a aba 'acoes' passa a renderizar `<ActionsTab />` (remova o empilhamento direto de Attacks/CombatClassActions/ManeuversPanel e os imports que ficarem órfãos — ActionsTab os importa agora).

- [ ] **Step 6:** `npx vitest run src/test/sheetV2-ActionsTab.test.jsx src/test/sheetV2-MainBox.test.jsx` → PASS (ajuste os mocks do MainBox.test se necessário: ele pode mockar ActionsTab). **Step 7: Commit** — `git commit -m "feat(ficha-v2): aba Acoes fundida com filtros, ataques nativos e espacos de magia"`

---

### Task 4: Categorização de recursos por tipo de ação

- [ ] **Step 1: Investigue os metadados.** Leia `defaultClassFeatureUses` (`domain/rules.js:758+`) e verifique se os itens de featureUses carregam tipo de ação (`action`/`bonus`/`reaction`). Também olhe como o `FeaturesTab` monta a visão Combate (Essencial/Situacional) — pode haver categorização reaproveitável.
- [ ] **Step 2:** Se NÃO houver metadado: crie `v2/actionTypes.js` com um mapa `id do recurso → 'action'|'bonus'|'reaction'|'passive'` cobrindo os recursos gerados por `defaultClassFeatureUses` (liste-os do código; ex.: surto de ação → especial, retomar o fôlego → bônus, fúria → bônus, etc. — confirme cada um no texto da feature). Fallback: recursos sem entrada aparecem só em Todas/Limitadas. Com teste unitário do mapa (existência + valores válidos).
- [ ] **Step 3:** ActionsTab usa o mapa pra distribuir trackers de featureUses nas seções AÇÕES BÔNUS/REAÇÕES (linhas nativas v2 com pill `N/N` + botão Usar via `spendFeatureUse(id, featureUses)`), mantendo CombatClassActions como painel de recursos ricos (fúria, forma selvagem etc.) sob RECURSOS DE CLASSE. Sem duplicar tracker: recurso que aparece como linha nativa NÃO deve também aparecer no CombatClassActions? — se houver sobreposição, prefira manter só o CombatClassActions pro recurso rico e a linha nativa pros simples; documente a escolha no commit.
- [ ] **Step 4:** Testes: um recurso de bônus aparece na seção certa e o Usar decrementa (spy em spendFeatureUse). Rodar tudo + commit — `git commit -m "feat(ficha-v2): recursos categorizados por tipo de acao na aba Acoes"`

---

### Task 5: Banners de import/conflito no v2

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx`, `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`
- Test: `src/test/sheetV2-SheetV2-banners.test.jsx`

- [ ] **Step 1:** `SheetV2` ganha prop opcional `banner` (node). `CharacterSheet.jsx` (ramo v2) passa: `banner={importError ? <ImportErrorBanner message={importError} onDismiss={() => setImportError(null)} /> : conflictNotice ? <ImportErrorBanner message="Esta ficha foi alterada em outro dispositivo. Recarregamos a versão mais recente — confira sua última edição." onDismiss={() => setConflictNotice(false)} /> : null}` (o ImportErrorBanner é re-tematizado pela ponte). SheetV2 renderiza `{banner}` entre o header e a faixa.
- [ ] **Step 2:** Teste: renderWithSheetContext com `banner={<div>erro de teste</div>}` → aparece. Build verde (wiring). Commit — `git commit -m "feat(ficha-v2): banners de import e conflito no layout v2"`

---

### Task 6: Passada visual fina + verificação final

- [ ] **Step 1:** Dev server com `?sheetV2=1`, ficha rica (multiclasse artífice/guerreiro, conjurador, com infusões): percorrer as 5 abas + todos os modais; corrigir na PONTE (nunca no v1) qualquer resíduo claro/ilegível; conferir o acento trocando a classe primária (wizard azul, barbarian vermelho...).
- [ ] **Step 2:** `npm run test` completa + `npm run build` + `npm run test:e2e` (toggle off) → tudo verde.
- [ ] **Step 3:** Commit final — `git commit -m "chore(ficha-v2): fase 3 verificada (re-skin completo atras do toggle)"`

## Fora deste plano

Mobile (fase 4); corte do v1/toggle (fase 5); reescrita nativa dos componentes de conteúdo (Spells/Inventory internos continuam v1 sob a ponte — reescrevê-los é trabalho futuro pós-corte, se valer a pena).
