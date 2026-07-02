# Fase 4 — Fronteira Multi-Sistema: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zerar os imports diretos de `systems/dnd5e/**` fora do sistema (esvaziar a whitelist da regra ESLint da Task 0.3), desfazendo o ciclo utils↔domain.

**Architecture:** Descoberta do mapeamento (2026-07-02): os 4 hooks da whitelist e os 10 utils D&D são consumidos EXCLUSIVAMENTE por código de dentro de `systems/dnd5e` — são código D&D morando na pasta errada. A cirurgia é MOVER (não abstrair): utils → `systems/dnd5e/utils/`, hooks → `systems/dnd5e/hooks/`, com codemod de imports. Só o App.jsx precisa de mecanismo novo: `GlobalWidgets` exposto via ui-registry (mesmo padrão lazy do Wizard/Sheet). O contrato core.js NÃO precisa engordar nesta fase.

**Tech Stack:** git mv + codemod Node (resolução de caminhos relativos), ESLint no-restricted-imports, Vitest.

---

## Fatos do mapeamento (2026-07-02)

- Consumidores de `useCharacter`/`useCharacterCalculations`/`useClassSpells`/`useTabValidation`: **100% dentro de systems/dnd5e** (CharacterSheet, useSheetHandlers, build-character, SpellsBlock, Spells).
- Consumidores dos utils D&D (`calculations`, `spellcasting`, `hitDice`, `rest`, `attacks`, `draconicAncestors`, `weaponI18n`, `spellFilters`, `monsters`, `monsters-i18n`) fora do sistema: **só os 4 hooks acima** (que se movem junto).
- Casca (`src/components`, `src/lib`, `src/auth`, `src/context`): **zero** imports desses módulos.
- App.jsx importa `SrdProvider`+`BestiaryButton` direto (linha 212) — único caso que precisa de contrato novo.
- 20 arquivos em `src/test` importam os caminhos antigos (codemod cobre).
- `useAutoSave`/`useCharacterRealtime`/`useDiceRoller` ficam na casca (genéricos, não importam dnd5e).

### Task 1: Mover utils + hooks D&D pra dentro do sistema (codemod)

**Files:**
- Move: `src/utils/{calculations,spellcasting,hitDice,rest,attacks,draconicAncestors,weaponI18n,spellFilters,monsters,monsters-i18n}.js` → `src/systems/dnd5e/utils/`
- Move: `src/hooks/{useCharacter,useCharacterCalculations,useClassSpells,useTabValidation}.js` → `src/systems/dnd5e/hooks/`
- Create (scratchpad, descartável): codemod de reescrita de imports
- Modify: todos os importadores (sistema + testes) via codemod

- [ ] **Step 1:** Conferir se `class-icons.jsx` é consumido pelo sistema (se só a casca usa, fica onde está — é apresentação do `summarize().icon` do contrato).
- [ ] **Step 2:** `git mv` dos 14 arquivos para os novos diretórios.
- [ ] **Step 3:** Rodar codemod que (a) reescreve imports que RESOLVEM para os arquivos movidos (relativo novo por arquivo), e (b) reescreve os imports DE DENTRO dos movidos (resolvidos pelo caminho antigo, re-relativizados pro novo). O ciclo morre aqui: `calculations.js` passa a importar `../domain/attributes` de dentro do sistema.
- [ ] **Step 4:** `npm test` → suíte verde (mesma contagem de sempre; flakes conhecidos de timeout passam isolados).
- [ ] **Step 5:** Commit: `refactor(fronteira): utils e hooks D&D movem pra dentro de systems/dnd5e`.

### Task 2: App.jsx via registry (GlobalWidgets)

**Files:**
- Modify: `src/systems/dnd5e/ui.jsx` (novo export `GlobalWidgets`)
- Modify: `src/systems/ui-registry.js` (novo `getLazyGlobalWidgets`)
- Modify: `src/App.jsx` (remove imports diretos; renderiza widgets de todos os sistemas registrados)

- [ ] **Step 1:** Em `ui.jsx`, adicionar (self-wrap no SrdProvider, padrão do arquivo):

```jsx
import { BestiaryButton } from './components/Bestiary/BestiaryButton'

/** Widgets globais do sistema (montados pela casca fora de Wizard/Sheet). */
export function GlobalWidgets() {
  return (
    <SrdProvider>
      <BestiaryButton />
    </SrdProvider>
  )
}
```

- [ ] **Step 2:** Em `ui-registry.js`: `export const getLazyGlobalWidgets = (systemId) => getLazy(systemId, 'GlobalWidgets')`.
- [ ] **Step 3:** Em `App.jsx`: remover os imports de `SrdProvider`/`BestiaryButton`; no lugar da montagem atual (linha ~212), renderizar por sistema registrado (import de `listSystems` do registry + `getLazyGlobalWidgets`), dentro do `Suspense` já existente na árvore.
- [ ] **Step 4:** Verificação no app: bestiário abre normal (botão global visível e modal carrega monstros).
- [ ] **Step 5:** Commit: `refactor(fronteira): BestiaryButton via GlobalWidgets do ui-registry`.

### Task 3: Esvaziar a whitelist e fechar

**Files:**
- Modify: `eslint.config.js` (remover as 6 entradas de débito)

- [ ] **Step 1:** Remover da whitelist os 6 arquivos (App.jsx, 4 hooks — que nem existem mais na casca — e utils/calculations.js).
- [ ] **Step 2:** `npx eslint .` → nenhum erro `no-restricted-imports`; contagem total ≤ baseline (616).
- [ ] **Step 3:** `npm test` + `npm run build` → verdes.
- [ ] **Step 4:** Commit + merge na master + push (deploy).

## Critério de aceite da fase

Whitelist da regra de fronteira **vazia**; `grep -rl "systems/dnd5e" src --include='*.js*' | grep -v '^src/systems' | grep -v '^src/test'` retorna vazio; suíte e build verdes.

## Fora de escopo (fica pro futuro)

- Engordar core.js com `derivedStats`/`defaultCharacter` — só quando um SEGUNDO consumidor genuíno da casca existir (Daggerheart). YAGNI.
- Split do useCharacter.js (798 linhas) — política da Fase 10 (ao tocar, extrair).
