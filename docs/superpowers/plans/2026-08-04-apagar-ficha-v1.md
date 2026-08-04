# Apagar a ficha v1 (FASE 5 etapa B) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o layout v1 da ficha de personagem, deixando o v2 como único caminho de render, e limpar as branches e worktrees mortas do repositório.

**Architecture:** O v1 e o v2 coexistem hoje atrás de um ternário em `CharacterSheet.jsx`, controlado por um flag persistente. Só 10 arquivos são exclusivos do v1; os outros 99 do subsistema da ficha são compartilhados e não se movem. A remoção acontece em três movimentos: extrair o que o v2 ainda importa de dentro de um arquivo do v1 (`ImportErrorBanner`), apagar os arquivos e o flag, e trocar o sinal de navegação para a aba Magias por um explícito — hoje ele funciona porque um `SyntheticEvent` é truthy.

**Tech Stack:** React 18, Vite, Vitest + Testing Library (jsdom), Playwright, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-04-apagar-ficha-v1-design.md`

---

## Estrutura de arquivos

**Criados:**
- `src/systems/dnd5e/components/CharacterSheet/ImportErrorBanner.jsx` — o banner dispensável de erro de importação/conflito de versão. Sai de dentro do `SheetTabs.jsx` (v1) porque o v2 o consome.
- `src/test/ImportErrorBanner.test.jsx` — cobertura do componente extraído.

**Modificados:**
- `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx` — perde a bifurcação v1/v2, o estado de abas do v1 e o `quickStats`; ganha o sinal `spellNav`.
- `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx` — passa a reagir a `spellNav.nonce`.
- `src/systems/dnd5e/components/CharacterSheet/levelProgression/FusedSpellSlots.jsx` — para de mandar o evento de clique como id de magia.
- `src/test/helpers/sheetV2TestContext.jsx` — o contexto falso troca `focusSpellId` por `spellNav`.
- `src/test/sheetV2-MainBox.test.jsx` — testes do sinal novo.
- `src/test/sheetV2-AbilityStrip-edit.test.jsx` — recebe a cobertura do teto 1–30 que morre com o `AttributeBox`.
- `e2e-pw/portrait.spec.js` — reescrito para o caminho do v2.
- `e2e-pw/a11y.spec.js` — o loop de dois layouts colapsa em um.

**Apagados:** 11 arquivos de código + 3 de teste (lista completa na Task 5).

---

### Task 1: Extrair o `ImportErrorBanner` do `SheetTabs`

O `SheetTabs.jsx` é um arquivo do v1 que vai ser apagado, mas o ramo do v2 em `CharacterSheet.jsx:303` importa o `ImportErrorBanner` de dentro dele. Extrair primeiro, senão a remoção quebra o v2.

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/ImportErrorBanner.jsx`
- Create: `src/test/ImportErrorBanner.test.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetTabs.jsx:157-164`
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx:12`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/test/ImportErrorBanner.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportErrorBanner } from '../systems/dnd5e/components/CharacterSheet/ImportErrorBanner'

describe('ImportErrorBanner', () => {
  it('anuncia a mensagem como alerta', () => {
    render(<ImportErrorBanner message="JSON inválido" onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('JSON inválido')
  })

  it('o botão Fechar chama onDismiss uma vez', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ImportErrorBanner message="JSON inválido" onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx vitest run src/test/ImportErrorBanner.test.jsx
```

Esperado: FAIL. A mensagem é de resolução de módulo — `Failed to resolve import ".../CharacterSheet/ImportErrorBanner"`, porque o arquivo ainda não existe.

- [ ] **Step 3: Criar o componente**

Crie `src/systems/dnd5e/components/CharacterSheet/ImportErrorBanner.jsx` com exatamente este conteúdo (o corpo é o mesmo que estava no `SheetTabs.jsx:157-164` — a extração não muda markup nem classes):

```jsx
import { memo } from 'react'

/**
 * Aviso dispensável no topo da ficha: erro ao importar JSON, ou conflito de
 * versão (a ficha foi salva por outro dispositivo da mesma conta).
 *
 * Morava dentro do SheetTabs.jsx, do layout v1. Saiu de lá porque o v2 também
 * depende dele e o v1 está sendo removido — o banner não podia ficar preso a
 * um arquivo condenado.
 */
export const ImportErrorBanner = memo(function ImportErrorBanner({ message, onDismiss }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 bg-parchment-50 border border-ink-200 rounded-lg px-4 py-3 text-sm">
      <span className="ink-italic">{message}</span>
      <button onClick={onDismiss} className="text-ink-200 hover:text-ink-500 text-lg leading-none" aria-label="Fechar">✕</button>
    </div>
  )
})
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx vitest run src/test/ImportErrorBanner.test.jsx
```

Esperado: PASS, 2 testes.

- [ ] **Step 5: Apontar o `CharacterSheet` para o módulo novo**

Em `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`, troque a linha 12:

```jsx
import { SheetTabs, TABS, NavBlockedBanner, ImportErrorBanner } from './SheetTabs'
```

por estas duas:

```jsx
import { SheetTabs, TABS, NavBlockedBanner } from './SheetTabs'
import { ImportErrorBanner } from './ImportErrorBanner'
```

- [ ] **Step 6: Apagar a cópia velha**

Em `src/systems/dnd5e/components/CharacterSheet/SheetTabs.jsx`, remova o bloco das linhas 157 a 164 (o `export const ImportErrorBanner = memo(...)` inteiro). O `NavBlockedBanner` acima dele **fica** — ele morre junto com o arquivo na Task 5.

Confirme que sobrou uma única definição:

```bash
grep -rn "ImportErrorBanner = memo" src/
```

Esperado: uma linha só, em `ImportErrorBanner.jsx`.

- [ ] **Step 7: Rodar os testes tocados e commitar**

```bash
npx vitest run src/test/ImportErrorBanner.test.jsx src/test/sheetV2-SheetV2-banners.test.jsx
```

Esperado: PASS.

```bash
git add src/systems/dnd5e/components/CharacterSheet/ImportErrorBanner.jsx src/test/ImportErrorBanner.test.jsx src/systems/dnd5e/components/CharacterSheet/SheetTabs.jsx src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx
git commit -m "refactor(ficha): ImportErrorBanner sai do SheetTabs pro proprio modulo

O SheetTabs e do layout v1 e vai ser apagado, mas o ramo do v2 importa o
banner de dentro dele.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Portar a cobertura do teto de atributo 1–30

`src/test/AttributeBox.test.jsx` cobre o teto absoluto de 30 e some com o componente na Task 5. O v2 tem o mesmo clamp em `AbilityStrip.jsx:136` (`n >= 1 && n <= 30` desabilita o botão Aplicar), mas **sem teste**. Porte a asserção enquanto o original ainda existe para comparar.

Estes testes passam de primeira — a implementação já existe. Não há fase vermelha aqui de propósito: é transferência de cobertura, não código novo. O valor está em provar que o v2 tem o mesmo comportamento antes de apagar a prova antiga.

**Files:**
- Modify: `src/test/sheetV2-AbilityStrip-edit.test.jsx`

- [ ] **Step 1: Confirmar o que o teste do v1 garante hoje**

```bash
npx vitest run src/test/AttributeBox.test.jsx
```

Esperado: PASS. Leia a saída e note o nome do caso — `permite aumentar acima de 20 (teto absoluto 30)`.

- [ ] **Step 2: Escrever os casos equivalentes no v2**

Em `src/test/sheetV2-AbilityStrip-edit.test.jsx`, adicione estes três casos dentro do `describe` existente, depois do caso `campo de atributo vazio desabilita Aplicar`:

```jsx
  it('aceita 30 — o teto absoluto', async () => {
    const user = userEvent.setup()
    const updateAttribute = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateAttribute }) })
    await user.click(screen.getByRole('button', { name: /Editar FOR/ }))
    const input = screen.getByLabelText('Valor')
    await user.clear(input)
    await user.type(input, '30')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateAttribute).toHaveBeenCalledWith('str', '30')
  })

  it('acima de 30 desabilita Aplicar', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateAttribute: vi.fn() }) })
    await user.click(screen.getByRole('button', { name: /Editar FOR/ }))
    const input = screen.getByLabelText('Valor')
    await user.clear(input)
    await user.type(input, '31')
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('abaixo de 1 desabilita Aplicar', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateAttribute: vi.fn() }) })
    await user.click(screen.getByRole('button', { name: /Editar FOR/ }))
    const input = screen.getByLabelText('Valor')
    await user.clear(input)
    await user.type(input, '0')
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })
```

- [ ] **Step 3: Rodar e confirmar que passam**

```bash
npx vitest run src/test/sheetV2-AbilityStrip-edit.test.jsx
```

Esperado: PASS, 6 testes (3 que já existiam + 3 novos).

Se algum falhar, **pare**: significa que o v2 não tem o comportamento do v1 e a remoção perderia regra de verdade. Reporte antes de continuar.

- [ ] **Step 4: Commitar**

```bash
git add src/test/sheetV2-AbilityStrip-edit.test.jsx
git commit -m "test(ficha): teto de atributo 1-30 coberto no v2

Porta a garantia que vivia no AttributeBox.test.jsx (v1), que vai ser
apagado junto com o componente.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Reescrever o e2e de retrato para o v2

`e2e-pw/portrait.spec.js:21` força `?sheetV2=0` porque o fluxo de upload era a seção "Identidade" colapsável do v1. No v2 o retrato mora no diálogo "Identidade", aberto pelo token do header (`HeaderV2.jsx:314`, `aria-label="Editar retrato"`), e esse diálogo renderiza o mesmo `CharacterInfo` — ou seja, o mesmo `input[type=file]` e o mesmo `img[alt="Retrato"]`.

Como o v2 já é o padrão em produção, este teste passa a valer imediatamente, antes mesmo de o v1 sumir.

**Files:**
- Modify: `e2e-pw/portrait.spec.js:18-24`

- [ ] **Step 1: Trocar a rota e o gesto de abertura**

Em `e2e-pw/portrait.spec.js`, substitua este trecho:

```js
  // Fluxo de retrato é UI do v1 (seção Identidade colapsável); com o soft cut
  // o default virou v2, então pedimos o v1 explicitamente. (Reescrito p/ v2 na etapa B.)
  await page.goto('/c/RETRATABCD?sheetV2=0')
  await expect(page.getByText('Retratado').first()).toBeVisible()
  // A seção "Identidade" (que contém o retrato) é colapsada por padrão.
  await page.getByRole('button', { name: /Identidade/i }).click()
```

por:

```js
  await page.goto('/c/RETRATABCD')
  await expect(page.getByText('Retratado').first()).toBeVisible()
  // No v2 o retrato vive no diálogo "Identidade", aberto pelo token do header.
  // O diálogo renderiza o mesmo CharacterInfo do layout antigo, então o input
  // de arquivo e o <img alt="Retrato"> continuam sendo os mesmos elementos.
  await page.getByRole('button', { name: 'Editar retrato' }).click()
```

O resto do arquivo (geração do PNG 2000×2000, `setInputFiles`, e as asserções de `data:image/(webp|jpeg)` e `< 60_000`) **não muda**.

- [ ] **Step 2: Rodar o e2e e confirmar que passa**

```bash
npx playwright test e2e-pw/portrait.spec.js
```

Esperado: PASS, 1 teste. O Playwright sobe `vite build && vite preview` sozinho na primeira execução (até 2 min).

- [ ] **Step 3: Commitar**

```bash
git add e2e-pw/portrait.spec.js
git commit -m "test(e2e): retrato deixa de depender do layout v1

O diagolo Identidade do v2 renderiza o mesmo CharacterInfo, entao o input
de arquivo e as asserçoes de compressao seguem iguais.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Colapsar o loop de dois layouts no e2e de acessibilidade

`e2e-pw/a11y.spec.js:65` roda a auditoria da ficha duas vezes, uma por layout. Com o v1 indo embora, sobra uma.

**Files:**
- Modify: `e2e-pw/a11y.spec.js:63-77`

- [ ] **Step 1: Trocar o loop por um teste único**

Substitua o bloco inteiro das linhas 63 a 77 por:

```js
  test('ficha de personagem sem violações critical/serious', async ({ page, context }) => {
    const id = '99999999-9999-4999-8999-999999999999'
    // shortId sem chars ambíguos (0/1/I/O/l) — SHORT_ID_REGEX os rejeita.
    await installAuthedApp(context, {
      characters: [makeCharacter(id, 'Herói Axe', { shortId: 'SHEETAXEBC' })],
    })
    await page.goto('/c/SHEETAXEBC')
    await expect(page.getByText('Herói Axe').first()).toBeVisible()
    assertClean(await seriousViolations(page))
  })
```

- [ ] **Step 2: Rodar e confirmar**

```bash
npx playwright test e2e-pw/a11y.spec.js
```

Esperado: PASS. O arquivo tinha um teste de ficha por layout; agora tem um só, e a contagem total do arquivo cai em 1.

- [ ] **Step 3: Commitar**

```bash
git add e2e-pw/a11y.spec.js
git commit -m "test(e2e): auditoria de a11y da ficha roda so no v2

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Apagar o v1 e encolher o `CharacterSheet`

O corte. Depois desta task não existe mais `?sheetV2=`.

**Files:**
- Delete: 11 arquivos de código + 3 de teste (lista abaixo)
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`

- [ ] **Step 1: Apagar os arquivos**

```bash
git rm src/systems/dnd5e/components/CharacterSheet/SheetHeader.jsx \
       src/systems/dnd5e/components/CharacterSheet/SheetTabs.jsx \
       src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx \
       src/systems/dnd5e/components/CharacterSheet/SheetCombatBar.jsx \
       src/systems/dnd5e/components/CharacterSheet/AttributesSection.jsx \
       src/systems/dnd5e/components/CharacterSheet/AttributeBox.jsx \
       src/systems/dnd5e/components/CharacterSheet/CombatStats.jsx \
       src/systems/dnd5e/components/CharacterSheet/SkillsList.jsx \
       src/systems/dnd5e/components/CharacterSheet/PreparedSpellsList.jsx \
       src/systems/dnd5e/components/CharacterSheet/v2/flag.js \
       src/components/Tooltip.jsx \
       src/test/AttributeBox.test.jsx \
       src/test/CombatStats-damage.test.jsx \
       src/test/sheetV2-flag.test.js
```

`Tooltip.jsx` entra na lista porque só `AttributeBox` e `SkillsList` o importavam. `MapTooltip` (usado pela lista de personagens) é outro componente, em `src/components/CharacterList/`, e **não** é afetado.

- [ ] **Step 2: Remover os imports mortos do `CharacterSheet.jsx`**

Apague estas quatro linhas (11, 12, 13 e 23 do arquivo original):

```jsx
import { SheetHeader } from './SheetHeader'
import { SheetTabs, TABS, NavBlockedBanner } from './SheetTabs'
import { SheetContent } from './SheetContent'
import { isSheetV2Enabled } from './v2/flag'
```

O `import { ImportErrorBanner } from './ImportErrorBanner'` da Task 1 **fica**, e o `import { SheetV2 } from './v2/SheetV2'` também.

- [ ] **Step 3: Remover o estado do v1**

Dentro de `SheetBody`, apague estas três declarações:

```jsx
  const [activeTab, setActiveTab] = useState('ficha')
  const [navBlocked, setNavBlocked] = useState(false)
```

```jsx
  // Toggle temporário do redesign (spec 2026-07-03). Lido uma vez no mount —
  // trocar exige reload, o que evita layouts trocando com a ficha suja.
  const [sheetV2] = useState(() => isSheetV2Enabled())
```

O `const [focusSpellId, setFocusSpellId] = useState(null)` **fica** — a Task 6 cuida dele.

- [ ] **Step 4: Encolher o `useTabValidation`**

Troque a linha:

```jsx
  const { getTabErrors, markTouched, hasErrors, focusFirstError } = useTabValidation(character, validationDeps)
```

por:

```jsx
  // Só `getTabErrors` sobrevive: `markTouched`/`hasErrors`/`focusFirstError`
  // serviam ao gate de troca de aba do layout v1. O v2 lê `fichaErrors` no
  // HeaderV2 pra marcar os campos inválidos do diálogo Identidade.
  const { getTabErrors } = useTabValidation(character, validationDeps)
```

- [ ] **Step 5: Remover `handleTabChange` e `quickStats`**

Apague a função inteira:

```jsx
  function handleTabChange(newTabId) {
    const currentIdx = TABS.findIndex(t => t.id === activeTab)
    const newIdx = TABS.findIndex(t => t.id === newTabId)
    const isForward = newIdx > currentIdx

    if (isForward && hasErrors(activeTab)) {
      markTouched(activeTab)
      setNavBlocked(true)
      return
    }
    setNavBlocked(false)
    setActiveTab(newTabId)
  }
```

E o bloco do `quickStats`, que só alimentava o modo legado do `SheetHeader`:

```jsx
  // Quick stats para o header
  const quickStats = {
    currentHp:  character.combat.currentHp,
    maxHp:      character.combat.maxHp,
    armorClass: character.combat.armorClass,
    initiative: calc.initiative,
    hpPercent:  calc.hpPercent,
    hpColor:    calc.hpColor,
  }
```

- [ ] **Step 6: Tirar o `setActiveTab` do handler de navegação**

No `contextValue`, troque:

```jsx
    // Quando chamado sem arg, só troca de aba. Com arg (spellId), também
    // pede pra aba Magias auto-abrir o modal de detalhe daquela magia.
    onNavigateToSpells: (spellId) => {
      if (spellId != null) setFocusSpellId(spellId)
      setActiveTab('magias')
    },
```

por:

```jsx
    onNavigateToSpells: (spellId) => {
      if (spellId != null) setFocusSpellId(spellId)
    },
```

- [ ] **Step 7: Substituir o ternário pelo `SheetV2` direto**

Troque todo o bloco `{sheetV2 ? ( ... ) : ( ... )}` (do `{sheetV2 ? (` até o `)}` que fecha o ternário, imediatamente antes do comentário `{/* Ficha para impressão/PDF ... */}`) por:

```jsx
      <SheetV2
        onBack={onBack}
        onExport={handleExport}
        onPrint={() => setPrintOpen(true)}
        onImport={handleImport}
        onImportError={setImportError}
        saving={saving}
        saved={saved}
        saveError={saveError}
        banner={
          importError ? (
            <ImportErrorBanner message={importError} onDismiss={() => setImportError(null)} />
          ) : conflictNotice ? (
            <ImportErrorBanner
              message="Esta ficha foi alterada em outro dispositivo. Recarregamos a versão mais recente — confira sua última edição."
              onDismiss={() => setConflictNotice(false)}
            />
          ) : null
        }
      />
```

O `<PrintView .../>` e o `<PrintPreviewModal .../>` que vêm depois **não mudam** — continuam irmãos dentro do `CharacterProvider`.

- [ ] **Step 8: Provar que não sobrou referência**

```bash
grep -rn "sheetV2Off\|isSheetV2Enabled\|SheetTabs\|SheetContent\|SheetHeader\|SheetCombatBar\|AttributesSection\|AttributeBox\|CombatStats\|SkillsList\|PreparedSpellsList" src/ e2e-pw/
```

Esperado: **nenhuma saída**. Se aparecer `components/Tooltip`, também é referência morta e precisa sair.

- [ ] **Step 9: Build — pega import órfão que teste não pega**

```bash
npm run build
```

Esperado: build conclui sem erro de resolução de módulo.

- [ ] **Step 10: Suíte em fatias**

A suíte cheia sem flags estoura a memória da máquina e produz falhas aleatórias em arquivos sem relação. Rode em duas fatias:

```bash
npx vitest run src/test/sheetV2-*.test.jsx src/test/sheetV2-*.test.js --maxWorkers=2
```

```bash
npx vitest run src/test/integration --maxWorkers=2
```

Esperado: PASS nas duas.

- [ ] **Step 11: Commitar**

```bash
git add -A
git commit -m "refactor(ficha)!: apaga o layout v1 e o escape hatch sheetV2

O v2 e o padrao em producao desde o soft cut da fase 5 etapa A; o periodo
de observacao passou. Saem 9 componentes exclusivos do v1, o flag.js, o
Tooltip (que so eles usavam) e 3 arquivos de teste.

O CharacterSheet perde a bifurcacao, o estado de abas do v1 e o quickStats.
useTabValidation encolhe pra so getTabErrors — o HeaderV2 le fichaErrors.

A chave sheetV2Off que ficou gravada em localStorage de usuario vira lixo
inerte: ninguem mais le, e nao vale codigo de limpeza.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Trocar `focusSpellId` por um sinal `spellNav` explícito

Hoje a navegação para a aba Magias no v2 funciona por acidente. `FusedSpellSlots.jsx:10` usa `onClick={onNavigateToSpells}` sem arrow function, então o React passa o `SyntheticEvent` como `spellId`. O evento é truthy, `setFocusSpellId(event)` roda, e o efeito do `MainBox` salta de aba. Depois `Spells.jsx:147` procura uma magia com `id === event`, não acha nada e limpa o sinal.

Com o `setActiveTab` removido na Task 5, esse acidente virou o único mecanismo. Troque por um sinal com `nonce`, que separa "quero ir pra aba Magias" de "quero abrir o detalhe desta magia".

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx:24,58-66,137`
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/FusedSpellSlots.jsx:10`
- Modify: `src/test/helpers/sheetV2TestContext.jsx:89`
- Modify: `src/test/sheetV2-MainBox.test.jsx:38-41`

- [ ] **Step 1: Escrever o teste que falha**

Em `src/test/sheetV2-MainBox.test.jsx`, substitua o caso existente das linhas 38-41:

```jsx
  it('pula pra aba Magias quando focusSpellId chega', () => {
    renderWithSheetContext(<MainBox />, { focusSpellId: 'fireball' })
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })
```

por estes dois:

```jsx
  it('pula pra aba Magias quando chega um spellNav COM magia', () => {
    renderWithSheetContext(<MainBox />, { spellNav: { nonce: 1, spellId: 'fireball' } })
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })

  // O botão "Adicionar / Gerenciar Magias" dos espaços fundidos pede a aba sem
  // magia específica. Antes isso só funcionava porque o SyntheticEvent do clique
  // ia parar no lugar do id e era truthy.
  it('pula pra aba Magias quando o spellNav chega SEM magia', () => {
    renderWithSheetContext(<MainBox />, { spellNav: { nonce: 1, spellId: null } })
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
npx vitest run src/test/sheetV2-MainBox.test.jsx
```

Esperado: FAIL nos dois casos novos, com `expected "false" to be "true"` no atributo `aria-selected` — o `MainBox` ainda lê `focusSpellId`, que o helper entrega como `null`.

- [ ] **Step 3: Atualizar o contexto falso dos testes**

Em `src/test/helpers/sheetV2TestContext.jsx`, troque a linha 89:

```jsx
    focusSpellId: null,
```

por:

```jsx
    spellNav: { nonce: 0, spellId: null },
```

A linha 90 (`clearFocusSpell: noop`) fica como está.

- [ ] **Step 4: Fazer o `MainBox` reagir ao `nonce`**

Em `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx`, troque a linha 24:

```jsx
    updaters, featureUses, readOnly, focusSpellId, clearFocusSpell,
```

por:

```jsx
    updaters, featureUses, readOnly, spellNav, clearFocusSpell,
```

Troque o efeito das linhas 58-66:

```jsx
  // Sinal one-shot vindo do contexto (ex.: clicar num chip de magia preparada):
  // ao chegar um focusSpellId, salta pra aba Magias. Precisa de efeito porque é
  // reação a um sinal externo — não dá pra derivar `tab` (o usuário navega depois).
  useEffect(() => {
    if (focusSpellId == null) return
    if (isControlled) onTabChange?.('magias'); else setInternalTab('magias')
    // one-shot: reage só ao sinal; onTabChange/isControlled omitidos de propósito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSpellId])
```

por:

```jsx
  // Sinal one-shot vindo do contexto (chip de magia preparada, botão dos espaços
  // fundidos): a cada `nonce` novo salta pra aba Magias. Reage ao nonce e não ao
  // spellId porque o pedido pode vir sem magia específica — e porque `nonce`
  // muda mesmo quando o usuário pede a MESMA magia duas vezes seguidas.
  useEffect(() => {
    if (!spellNav?.nonce) return
    if (isControlled) onTabChange?.('magias'); else setInternalTab('magias')
    // one-shot: reage só ao sinal; onTabChange/isControlled omitidos de propósito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellNav?.nonce])
```

E na linha 137, onde o `Spells` é montado, troque:

```jsx
            focusSpellId={focusSpellId}
```

por:

```jsx
            focusSpellId={spellNav?.spellId ?? null}
```

O `Spells.jsx` **não muda** — ele continua recebendo `focusSpellId` como prop e só abre o modal quando acha a magia.

- [ ] **Step 5: Rodar e confirmar que passam**

```bash
npx vitest run src/test/sheetV2-MainBox.test.jsx
```

Esperado: PASS.

- [ ] **Step 6: Emitir o sinal no `CharacterSheet`**

Em `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`, troque a declaração de estado:

```jsx
  // Magia que deve ter o modal de detalhe auto-aberto ao navegar pra aba Magias.
  // Setada por PreparedSpellsList ao clicar num chip; consumida e zerada pelo
  // próprio Spells (que dispara setDetailSpell e depois chama clearFocusSpell).
  const [focusSpellId, setFocusSpellId] = useState(null)
```

por:

```jsx
  // Pedido one-shot de "abra a aba Magias". `nonce` sobe a cada pedido, então a
  // troca de aba não depende de haver magia específica; `spellId` é opcional e
  // só serve pra auto-abrir o modal de detalhe.
  const [spellNav, setSpellNav] = useState({ nonce: 0, spellId: null })
```

Troque o handler dentro do `contextValue`:

```jsx
    onNavigateToSpells: (spellId) => {
      if (spellId != null) setFocusSpellId(spellId)
    },
    focusSpellId,
    clearFocusSpell: () => setFocusSpellId(null),
```

por:

```jsx
    // Normaliza de propósito: quando o handler é passado direto pro onClick de
    // um botão, o React entrega o SyntheticEvent aqui — e um evento nunca é id
    // de magia. Sem isso, o objeto vazaria pro Spells e seria comparado contra
    // ids reais.
    onNavigateToSpells: (spellId) => {
      const id = typeof spellId === 'string' || typeof spellId === 'number' ? spellId : null
      setSpellNav(prev => ({ nonce: prev.nonce + 1, spellId: id }))
    },
    spellNav,
    clearFocusSpell: () => setSpellNav(prev => ({ ...prev, spellId: null })),
```

E no array de dependências do `useMemo` do `contextValue`, troque `focusSpellId` por `spellNav`:

```jsx
  }), [character, setCharacter, calc, classData, races, classes, backgrounds, updaters, handlers, fichaErrors, featureUses, spellNav, readOnly])
```

- [ ] **Step 7: Parar de mandar o evento no `FusedSpellSlots`**

Em `src/systems/dnd5e/components/CharacterSheet/levelProgression/FusedSpellSlots.jsx`, troque a linha 10:

```jsx
            onClick={onNavigateToSpells}
```

por:

```jsx
            onClick={() => onNavigateToSpells()}
```

A normalização do Step 6 já protegeria contra o evento, mas mandar o objeto e descartá-lo do outro lado é ruído — o chamador não deve passar o que o receptor não quer.

- [ ] **Step 8: Provar que `focusSpellId` só sobrevive como prop do `Spells`**

```bash
grep -rn "focusSpellId" src/
```

Esperado: apenas ocorrências em `Spells.jsx` (parâmetro e efeito) e a linha do `MainBox.jsx` que passa `spellNav?.spellId` para ele. **Nenhuma** em `CharacterSheet.jsx` nem no helper de teste.

- [ ] **Step 9: Rodar as fatias e o build**

```bash
npx vitest run src/test/sheetV2-*.test.jsx src/test/sheetV2-*.test.js --maxWorkers=2
```

```bash
npm run build
```

Esperado: PASS e build limpo.

- [ ] **Step 10: Commitar**

```bash
git add -A
git commit -m "fix(ficha): navegacao pra aba Magias vira sinal explicito

FusedSpellSlots passava o handler direto pro onClick, entao o React
entregava o SyntheticEvent no lugar do spellId. Como evento e truthy, a
troca de aba funcionava por acidente — e o objeto ainda era comparado
contra ids de magia no Spells.

focusSpellId vira spellNav {nonce, spellId}: o nonce troca a aba, o
spellId (opcional, normalizado) abre o detalhe.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Limpar worktrees e branches

Sem tocar em código de aplicação.

**Files:** nenhum arquivo do projeto.

- [ ] **Step 1: Remover os 4 worktrees**

Eles vivem em `.claude/worktrees/`. Três estão em HEAD destacado; o quarto segura `claude/relaxed-haibt-0621e7`, e o git recusa apagar uma branch enquanto houver worktree nela.

Juntos ocupam ~1,25 GB (411M + 404M + 404M + 28M), quase tudo `node_modules` duplicado.

```bash
git worktree remove --force .claude/worktrees/eager-poincare-6d137e
git worktree remove --force .claude/worktrees/naughty-kalam-b9eac8
git worktree remove --force .claude/worktrees/optimistic-hoover-cc4864
git worktree remove --force .claude/worktrees/relaxed-haibt-0621e7
git worktree prune
```

Confirme:

```bash
git worktree list
```

Esperado: uma linha só, a do repositório principal em `C:/Users/gvfar/git/dnd-ficha-app`.

- [ ] **Step 2: Conferir a lista de mergeadas antes de apagar**

```bash
git branch --merged master | grep -v -E "^\*|^\s*master$"
```

Esperado: 28 nomes. Leia a lista. Se aparecer alguma branch que você não reconhece como já integrada, **pare e reporte** em vez de apagar.

- [ ] **Step 3: Apagar as branches locais mergeadas**

`git branch -d` (minúsculo) recusa apagar o que não está mergeado — é a rede de segurança. Não troque por `-D`.

```bash
git branch --merged master | grep -v -E "^\*|^\s*master$" | xargs -n 1 git branch -d
```

- [ ] **Step 4: Apagar as mesmas branches no remoto**

```bash
git fetch --prune
git branch -r --merged origin/master | grep -v -E "origin/master|origin/HEAD" | sed 's|origin/||' | xargs -n 1 git push origin --delete
```

Confirme:

```bash
git branch -a
```

Esperado: `master` local, `origin/master`, `origin/HEAD`, e só as não mergeadas.

- [ ] **Step 5: Levantar a tabela das 15 não mergeadas**

```bash
git branch --no-merged master --format='%(refname:short)' | while read b; do
  echo "$b | $(git rev-list --count master..$b) commits | $(git log -1 --format='%ad' --date=short $b) | $(git log -1 --format='%s' $b)"
done
```

Monte com a saída uma tabela markdown (branch, commits à frente, data do último commit, assunto) e **apresente ao dono**. Não apague nenhuma delas.

`feat/magias-talento-p2` é sabidamente o plano 2 das magias de talento — trabalho real que nunca aterrissou. Sinalize essa explicitamente.

- [ ] **Step 6: Commitar (se houver o que commitar)**

Remover worktrees e branches não gera mudança rastreada, exceto se `.claude/worktrees/` tinha algo versionado. Confira:

```bash
git status --short
```

Se estiver limpo, não há commit nesta task — siga para a verificação final.

---

### Verificação final

- [ ] **Step 1: Suíte inteira, em fatias**

```bash
npx vitest run src/test --maxWorkers=2
```

Se a máquina engasgar, quebre em partes menores (`src/test/sheetV2-*`, `src/test/integration`, `src/test/dnd5e`, o resto). A suíte cheia sem `--maxWorkers` estoura a memória e inventa falhas em arquivos sem relação.

- [ ] **Step 2: E2E da ficha**

```bash
npx playwright test e2e-pw/smoke.spec.js e2e-pw/persistence.spec.js e2e-pw/portrait.spec.js e2e-pw/a11y.spec.js e2e-pw/spell-cast.spec.js e2e-pw/level-up.spec.js
```

Esperado: todos PASS.

- [ ] **Step 3: Prova visual no browser**

Suba o preview e abra a ficha autenticada pelo stub (sem login). Confirme, com screenshot:

1. Header do v2 renderiza (nome, PV, condições).
2. Clicar no token de retrato abre o diálogo "Identidade".
3. O painel de Progressão abre pelo header.
4. Numa ficha multiclasse com espaços fundidos, "✨ Adicionar / Gerenciar Magias →" fecha o diálogo e leva à aba Magias.
5. As 5 abas do `MainBox` trocam no desktop, e a navegação inferior funciona no mobile (375×812).

- [ ] **Step 4: Merge e deploy**

```bash
git checkout master
git merge --no-ff <branch-do-trabalho>
git push
```

---

## Fora de escopo

Não faça nada disto neste plano, mesmo que pareça adjacente:

- Dissolver o wrapper `CharacterSheet.jsx` no `SheetV2`. Ele faz carregamento assíncrono, gate de acesso dono/DM/admin, autosave e realtime — é outra refatoração, e misturá-la esconderia regressão de permissão no diff.
- Matar a ponte CSS gerada (`scripts/gen-bridge.mjs`) ou o tema `?theme=parchment`.
- Podar o débito de lint (~611 erros pré-existentes, não gateados).
- Apagar qualquer branch não mergeada sem aprovação explícita do dono.
- Qualquer trabalho de D&D 2024.
