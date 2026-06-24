# Artífice — Fase C (features numéricas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o Artífice com as três features numéricas restantes — teto de sintonia crescente por nível, Lampejo de Genialidade (nv7) e Item de Armazenar Magia (nv11) como recursos rastreáveis.

**Architecture:** Teto de sintonia vira função pura `getMaxAttunement(character)` (data-driven pelo nível de Artífice) e o `Inventory` consome ela no lugar do literal `3`. Lampejo e Item de Armazenar Magia entram na geração existente de `classFeatureUses` (`defaultClassFeatureUses` em `rules.js`), como Ki/Fúria/Canalizar. 100% código — não toca `srd-data` (sem bump de cache).

**Tech Stack:** React + Vite, Vitest + @testing-library/react. Base: [spec Fase C](../specs/2026-06-24-artifice-fase-c-design.md), [spike](../notes/2026-06-23-artifice-spike.md).

**Fatos confirmados (não re-derivar):**
- `defaultClassFeatureUses(character)` em `src/systems/dnd5e/domain/rules.js` (~linha 720) faz `const cha = getModifier(character.attributes?.cha ?? 10)` e itera classes (primária + multiclasses), com `out.push({ id, name, max, used: 0, recharge, source })`. `getModifier` vem de `../../../utils/calculations`.
- Teto de sintonia hoje: `const MAX_ATTUNED = 3` em `src/systems/dnd5e/components/CharacterSheet/Inventory.jsx` (~linha 201); usado em `attunedCount < MAX_ATTUNED` e no texto "Máx. 3 itens mágicos (PHB p.136)". `Inventory` recebe `character` por prop.
- `artificerLevelOf(character)` já existe em `src/systems/dnd5e/domain/artificerInfusions.js` (nível NA classe Artífice, 0 se não for).

---

## Estrutura de arquivos

**Modificar:**
- `src/systems/dnd5e/domain/artificerInfusions.js` — adicionar `getMaxAttunement(character)`.
- `src/systems/dnd5e/components/CharacterSheet/Inventory.jsx` — usar `getMaxAttunement` no lugar do `3` literal.
- `src/systems/dnd5e/domain/rules.js` — entradas `artifice` em `defaultClassFeatureUses`.

**Criar (testes):**
- `src/test/dnd5e/artificer-attunement.test.js`
- `src/test/dnd5e/artificer-feature-uses.test.js`

---

## Task C1: getMaxAttunement por nível de Artífice

**Files:**
- Modify: `src/systems/dnd5e/domain/artificerInfusions.js`
- Test: `src/test/dnd5e/artificer-attunement.test.js`

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/artificer-attunement.test.js
import { describe, it, expect } from 'vitest'
import { getMaxAttunement } from '../../systems/dnd5e/domain/artificerInfusions'

const char = (cls, level, mcs = []) => ({ info: { class: cls, level, multiclasses: mcs } })

describe('getMaxAttunement', () => {
  it('não-Artífice = 3', () => expect(getMaxAttunement(char('mago', 20))).toBe(3))
  it('Artífice nv9 = 3', () => expect(getMaxAttunement(char('artifice', 9))).toBe(3))
  it('Artífice nv10 = 4', () => expect(getMaxAttunement(char('artifice', 10))).toBe(4))
  it('Artífice nv14 = 5', () => expect(getMaxAttunement(char('artifice', 14))).toBe(5))
  it('Artífice nv18 = 6', () => expect(getMaxAttunement(char('artifice', 18))).toBe(6))
  it('Artífice em multiclasse usa o nível DA classe', () => {
    expect(getMaxAttunement(char('mago', 5, [{ class: 'artifice', level: 14 }]))).toBe(5)
  })
})
```

- [ ] **Step 2: Rodar, ver falhar** — `npm test -- src/test/dnd5e/artificer-attunement.test.js`.

- [ ] **Step 3: Implementar** — em `artificerInfusions.js` (reusa `artificerLevelOf`, já no arquivo):

```js
/** Teto de itens mágicos sintonizados. Base 3 (PHB); Artífice cresce 4/5/6
 *  (Perito nv10, Versado nv14, Maestria nv18). */
export function getMaxAttunement(character) {
  const L = artificerLevelOf(character)
  if (L >= 18) return 6
  if (L >= 14) return 5
  if (L >= 10) return 4
  return 3
}
```

- [ ] **Step 4: Rodar, ver passar (6/6).**

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/domain/artificerInfusions.js src/test/dnd5e/artificer-attunement.test.js
git commit -m "feat(dnd5e): getMaxAttunement — teto de sintonia por nível de Artífice"
git push
```

---

## Task C2: Inventory usa o teto derivado

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/Inventory.jsx`

> O literal `3` é trocado pela função pura (testada na C1). `Inventory` é um componente grande com muitas props — a lógica testável vive em `getMaxAttunement`; aqui a verificação é build + suíte (sem regressão) + manual. Não introduzir teste de render frágil do `Inventory`.

- [ ] **Step 1: Implementar** — em `Inventory.jsx`:
  - Importar no topo: `import { getMaxAttunement } from '../../domain/artificerInfusions'`.
  - Onde está `const MAX_ATTUNED = 3` (~linha 201), trocar por:
    ```js
    const MAX_ATTUNED = getMaxAttunement(character)
    ```
    (Confirmar que `character` está em escopo na função do componente; pela montagem em `SheetContent` o `Inventory` recebe `character`. Se o componente que tem `MAX_ATTUNED` não receber `character` diretamente, threear a prop a partir do pai — inspecionar antes.)
  - Atualizar o texto fixo "Máx. 3 itens mágicos (PHB p.136)" (~linha 291) para refletir o cap real:
    ```jsx
    <p className="text-xs text-gray-600">Máx. {MAX_ATTUNED} itens mágicos sintonizados</p>
    ```

- [ ] **Step 2: Build + suíte** — `npm run build` (exit 0) e `npm test` (sem regressão).

- [ ] **Step 3: Verificação manual** (`npm run dev`): Artífice nv10 → o medidor de sintonia mostra `x/4` (e nv14 → `/5`, nv18 → `/6`); não-Artífice continua `/3`.

- [ ] **Step 4: Commit**
```bash
git add src/systems/dnd5e/components/CharacterSheet/Inventory.jsx
git commit -m "feat(dnd5e): teto de sintonia do Inventory reflete o nível de Artífice"
git push
```

---

## Task C3: Lampejo de Genialidade + Item de Armazenar Magia (recursos)

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js` (`defaultClassFeatureUses`)
- Test: `src/test/dnd5e/artificer-feature-uses.test.js`

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/artificer-feature-uses.test.js
import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'

function artificer(level, int = 16) {
  return {
    info: { class: 'artifice', level, chosenFeatures: {}, multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int, wis: 10, cha: 10 },
  }
}
const byId = (arr, id) => arr.find(u => u.id === id)

describe('Artífice — recursos (classFeatureUses)', () => {
  it('nv7: Lampejo de Genialidade = INT mod usos, descanso longo', () => {
    const uses = defaultClassFeatureUses(artificer(7, 16)) // INT 16 → +3
    const flash = byId(uses, 'artifice-flash-of-genius')
    expect(flash).toMatchObject({ name: 'Lampejo de Genialidade', max: 3, recharge: 'long' })
  })
  it('Lampejo respeita mínimo 1 com INT baixo', () => {
    expect(byId(defaultClassFeatureUses(artificer(7, 10)), 'artifice-flash-of-genius').max).toBe(1)
  })
  it('nv11: Item de Armazenar Magia = 2×INT mod, descanso longo', () => {
    const uses = defaultClassFeatureUses(artificer(11, 16)) // 2×3 = 6
    expect(byId(uses, 'artifice-spell-storing-item')).toMatchObject({ max: 6, recharge: 'long' })
  })
  it('nv6: nenhum dos dois recursos do Artífice', () => {
    const uses = defaultClassFeatureUses(artificer(6))
    expect(byId(uses, 'artifice-flash-of-genius')).toBeUndefined()
    expect(byId(uses, 'artifice-spell-storing-item')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** — em `defaultClassFeatureUses`:
  - Junto de `const cha = getModifier(character.attributes?.cha ?? 10)`, adicionar:
    ```js
    const int = getModifier(character.attributes?.int ?? 10)
    ```
  - Dentro do `for (const { class: cls, level, chosen } of classes)`, adicionar (perto dos outros `if (cls === ...)`):
    ```js
    if (cls === 'artifice' && level >= 7) {
      out.push({ id: 'artifice-flash-of-genius', name: 'Lampejo de Genialidade', max: Math.max(1, int), used: 0, recharge: 'long', source: 'artifice' })
    }
    if (cls === 'artifice' && level >= 11) {
      out.push({ id: 'artifice-spell-storing-item', name: 'Item de Armazenar Magia', max: 2 * Math.max(1, int), used: 0, recharge: 'long', source: 'artifice' })
    }
    ```

- [ ] **Step 4: Rodar, ver passar (4/4).**

- [ ] **Step 5: Regressão** — `npm test -- src/test/ -t "feature"` e a suíte completa; recursos de outras classes inalterados.

- [ ] **Step 6: Commit**
```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/artificer-feature-uses.test.js
git commit -m "feat(dnd5e): Lampejo de Genialidade (nv7) e Item de Armazenar Magia (nv11) como recursos"
git push
```

---

## Verificação final da Fase C

- [ ] `npm test` — suíte inteira verde.
- [ ] `npm run build` — limpo (sem mudança de cache; não toca srd-data).
- [ ] `npm run dev` — Artífice nv11: medidor de sintonia reflete o nível; Lampejo de Genialidade e Item de Armazenar Magia aparecem como recursos rastreáveis (gastar/recuperar; recarregam no descanso longo).
- [ ] Outras classes: recursos e teto de sintonia (3) inalterados.

## Fora desta fase

- Validação de pré-requisitos de sintonia (o app não valida itens hoje).
- Conteúdo em volume (subclasses das 12 classes, magias, itens), Customizando sua Origem, importar magias faltantes do catálogo.
