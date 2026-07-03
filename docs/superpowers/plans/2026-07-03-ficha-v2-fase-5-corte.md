# Ficha v2 — Fase 5: Corte (v2 vira o único layout) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promover o v2 a layout único da ficha: E2E e a11y rodando NO v2, corte em duas etapas (default liga → remoção), apagar o shell v1 (SheetTabs/SheetContent/SheetHeader + ramo v1) e o toggle, e limpar componentes órfãos.

**Architecture:** Corte em duas etapas deployáveis separadamente: **(A) soft cut** — o default do flag inverte (v2 liga por padrão, `?sheetV2=0` vira escape hatch) e roda em produção por um período de observação decidido pelo dono; **(B) remoção** — flag, shell v1 e órfãos são apagados. Entre A e B, qualquer problema real tem rollback de 1 query param. Spec: `docs/superpowers/specs/2026-07-03-redesign-ficha-pagina-unica-design.md`. Pré-requisito: fases 1–4 mergeadas e usadas em jogo real pelo dono.

**⚠️ CORREÇÃO AO SPEC:** o spec fase 5 previa a "morte do remapeamento parchment do index.css". Isso está ERRADO neste corte: lista de personagens, wizard, login e admin AINDA usam o tema parchment (escopo aprovado foi "ficha primeiro, resto depois"), e os componentes de CONTEÚDO v1 reusados pelo v2 (Spells, Inventory, FeaturesTab...) também emitem classes parchment re-tematizadas pela ponte. O remapeamento só morre na futura migração do app inteiro. Este plano audita e remove apenas o que ficar ÓRFÃO.

**Tech Stack:** Playwright (E2E + axe), Vitest, git.

---

## ⚠️ Regras deste projeto

1. Commits pequenos com trailer `Co-Authored-By:`; push é do controlador.
2. As etapas A e B são DEPLOYS SEPARADOS — não as junte num commit/merge só. A etapa B só começa com aval explícito do dono após o período de observação.
3. Antes de apagar QUALQUER arquivo: grep de usos no repo inteiro (incluindo testes e PrintView). Um falso "órfão" quebra produção.

---

## ETAPA A — soft cut (v2 por padrão)

### Task A1: E2E e a11y rodando no v2

**Files:**
- Modify: specs em `e2e-pw/` (a11y.spec.js e smoke da ficha)
- Possibly modify: helpers/fixtures de setup dos E2E

- [ ] **Step 1: Entenda o setup atual.** Leia `e2e-pw/a11y.spec.js` (o teste "ficha de personagem sem violações critical/serious", linha ~56) e os helpers de login/seed que ele usa. Descubra como a URL da ficha é montada.
- [ ] **Step 2:** Parametrize: os specs de FICHA (a11y da ficha + interações de ficha se houver) passam a rodar em DOIS modos — v1 e v2 — via `test.describe` duplicado ou loop `for (const v2 of [false, true])`, ligando o v2 por `page.addInitScript(() => localStorage.setItem('sheetV2', '1'))` (ou `?sheetV2=1` na URL — escolha UM mecanismo e use consistentemente).
- [ ] **Step 3:** Rode `npm run test:e2e`. O axe do v2 VAI apontar os débitos anotados na fase 1: hierarquia de headings (v2 pula direto pra h3; nome do personagem é div) e o que mais aparecer.
- [ ] **Step 4: Corrija as violações NO v2** até zero critical/serious: nome do personagem no HeaderV2 vira `<h1>` (estilo mantido via style inline), títulos de painel (`v2-title`) viram `<h2>` onde são heading de seção (SidePanels/SkillsPanel/seções do ActionsTab — mantendo classes), landmarks se o axe exigir. Ajuste os testes unitários v2 que quebrarem por tag (asserts por texto continuam válidos).
- [ ] **Step 5:** `npm run test:e2e` → verde nos dois modos. `npm run test` → verde. Commit — `git commit -m "test(ficha-v2): e2e e axe rodando no v2 + headings corrigidos"`

### Task A2: Dedup da proficiência de salvaguarda (dívida da fase 1)

Com o v2 prestes a virar padrão, feche a dívida: duas fontes independentes de "salvaguarda proficiente" (o `calc.savingThrows` inline em `useCharacterCalculations.js:150-157` e `getEffectiveSaveProficiencies` em `domain/rules.js:705`).

- [ ] **Step 1:** Leia as duas implementações. `useCharacterCalculations.js:150-157` usa `saves?.includes(key)` + caso especial diamondSoul; `getEffectiveSaveProficiencies` retorna a lista efetiva (incluindo monge 14 = diamondSoul?). CONFIRME se `getEffectiveSaveProficiencies` já cobre o diamondSoul; se cobrir, refatore o calc pra consumi-la; se não cobrir, mova o caso pra ela primeiro (com teste).
- [ ] **Step 2:** Refatore `useCharacterCalculations.js` para `const saveProfs = getEffectiveSaveProficiencies(character)` e `isProficient = saveProfs.includes(key)` — comportamento IDÊNTICO, provado pelos testes existentes do calc (rode a suíte inteira; qualquer diff de comportamento é regressão, reverta e investigue).
- [ ] **Step 3:** `npm run test` → verde. Commit — `git commit -m "refactor(rules): salvaguarda proficiente com fonte unica (getEffectiveSaveProficiencies)"`

### Task A3: Inverter o default do flag

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/flag.js`
- Test: `src/test/sheetV2-flag.test.js`

- [ ] **Step 1: Atualize os testes primeiro** (TDD do comportamento novo):

```js
  it('sem query param e sem storage, LIGADO por padrão (soft cut)', () => {
    expect(isSheetV2Enabled('', storage)).toBe(true)
  })

  it('?sheetV2=0 persiste o opt-out', () => {
    expect(isSheetV2Enabled('?sheetV2=0', storage)).toBe(false)
    expect(isSheetV2Enabled('', storage)).toBe(false) // opt-out lembrado
  })
```

(Substitua o teste antigo "sem query param e sem storage, desligado" — o default mudou. Os testes de `=1`/`=0` com query continuam.)

- [ ] **Step 2: Implemente:** o opt-OUT vira o estado persistido:

```js
export function isSheetV2Enabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  const q = new URLSearchParams(search).get('sheetV2')
  if (q === '1') { storage?.removeItem('sheetV2Off'); return true }
  if (q === '0') { storage?.setItem('sheetV2Off', '1'); return false }
  return storage?.getItem('sheetV2Off') !== '1'
}
```

(Nota: a chave muda de `sheetV2` pra `sheetV2Off` de propósito — quem tinha opt-IN salvo simplesmente cai no novo default ligado; não é preciso migrar nada.)

- [ ] **Step 3:** `npx vitest run src/test/sheetV2-flag.test.js` → PASS. `npm run test` + `npm run test:e2e` → verdes (os E2E que assumem v1 por default DEVEM ser ajustados nesta task para pedir `?sheetV2=0` explicitamente OU — melhor — atualizados pro v2 como modo principal; decida pelo menor diff que mantenha cobertura dos dois modos até a etapa B).
- [ ] **Step 4:** Commit — `git commit -m "feat(ficha-v2): v2 vira o layout padrao (soft cut; ?sheetV2=0 = escape hatch)"`

### Task A4: Merge + deploy + observação

- [ ] **Step 1:** Merge na master + push (deploy). Anunciar ao dono: v2 é o padrão; `?sheetV2=0` volta ao antigo.
- [ ] **Step 2:** **PARAR AQUI.** O período de observação (dono joga sessões reais, mesa presencial) é decidido pelo dono. A etapa B só começa com o aval dele. Registrar na memória do projeto o estado "soft cut em produção".

---

## ETAPA B — remoção (após aval do dono)

### Task B1: Inventário de órfãos

- [ ] **Step 1:** Para CADA candidato a remoção, grep de usos no repo inteiro (src + e2e-pw). Candidatos: `SheetTabs.jsx`, `SheetContent.jsx`, `SheetHeader.jsx`, `CombatStats.jsx`, `PreparedSpellsList.jsx`, `v2/flag.js`, `AttributesSection.jsx`. NÃO são candidatos (o v2 usa): Attacks, Spells, Inventory, FeaturesTab, Notes, CharacterInfo, SkillsList, LevelProgression, RestActions, DamageModal, SourcePicker, CombatClassActions, ManeuversPanel, ArtificerInfusionsPanel.
- [ ] **Step 2:** Atenção aos usos indiretos: `PrintView` importa componentes? Testes v1 (`src/test/`) referenciam os candidatos? Um candidato usado por PrintView/testes que ficam → NÃO remove o candidato; remove-se só o teste do que for junto.
- [ ] **Step 3:** Produza a lista final REMOVER vs MANTER com a evidência (saída do grep) e registre no commit da B2.

### Task B2: Remoção do shell v1 + toggle

**Files (conforme B1):**
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx`
- Delete: shell v1 órfão + `v2/flag.js` + testes correspondentes

- [ ] **Step 1:** Em `CharacterSheet.jsx`: remover o import e o `useState` do flag, remover o ternário — `SheetBody` retorna `<SheetV2 .../>` direto (Print components continuam como estão). Remover imports v1 que ficarem órfãos no arquivo (SheetHeader, SheetTabs, SheetContent, TABS, banners se moveram) e o estado que só o v1 usava (`activeTab`/`handleTabChange`/`navBlocked`/`quickStats` — CONFIRA um a um; `importError`/`conflictNotice` FICAM, alimentam o banner do v2).
- [ ] **Step 2:** Apagar os arquivos da lista REMOVER + seus testes. `git rm` explícito.
- [ ] **Step 3:** `npm run test` → verde (removidos os testes dos removidos); `npm run build` → verde; grep final pelos nomes apagados → zero referências.
- [ ] **Step 4:** Simplificar E2E: remover o modo v1 dos specs parametrizados (v2 é o único). `npm run test:e2e` → verde.
- [ ] **Step 5:** Commit — `git commit -m "feat(ficha-v2)!: corte final — v2 e o unico layout da ficha"`

### Task B3: Auditoria de CSS órfão (NÃO é a morte do remapeamento)

- [ ] **Step 1:** Grep pelas classes parchment que só o shell removido usava; remova da `legacy-bridge.css` os overrides que ficaram sem consumidor (a ponte continua existindo pros componentes de conteúdo v1).
- [ ] **Step 2:** O remapeamento do `index.css` FICA (lista/wizard/login + conteúdo v1 sob a ponte). Deixe um comentário no index.css: "remapeamento morre na migração do app inteiro pro design system v2".
- [ ] **Step 3:** Verificação visual das OUTRAS telas (lista, wizard, login) — intactas. Commit — `git commit -m "chore(ficha-v2): limpeza de css orfao pos-corte"`

### Task B4: Verificação final + docs

- [ ] **Step 1:** Suíte completa + build + E2E → verdes. Axe: zero critical/serious na ficha v2 (todas as abas + mobile).
- [ ] **Step 2:** Atualizar memória do projeto (redesign concluído; próxima fronteira: migrar lista/wizard/login pro design system v2) e marcar o spec como implementado (nota no topo do arquivo de spec).
- [ ] **Step 3:** Merge na master + push (deploy). Anunciar: redesign da ficha concluído.

## Fora deste plano

Migração das outras telas (lista/wizard/login/admin) pro design system v2 — é o sub-projeto que finalmente mata o remapeamento parchment; tema claro sobre os tokens v2; reescrita nativa dos componentes de conteúdo v1 (hoje sob a ponte CSS).
