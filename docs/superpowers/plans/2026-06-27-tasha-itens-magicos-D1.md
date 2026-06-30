# Tasha — Itens Mágicos (D1: infra de gating + piloto) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer o catálogo de itens mágicos pro sistema de fontes (hoje ele é fetchado direto no Inventory, sem gating) e provar com um piloto de itens de Tasha — um personagem sem Tasha não vê itens de Tasha na busca; com Tasha, vê. O fan-out dos ~30 itens é o D2.

**Architecture:** O catálogo de itens entra no `COMPOSED` do SrdProvider como dataset `array` (phb + tasha, carimbado por `tagSource`), lazy. O `Inventory` troca o `fetch` direto por `useLazySrdDataset('magicItems')` e filtra o que é OFERECIDO no modal de busca por `filterCatalogBySources(catalog, activeSources)`. `SheetContent` passa `activeSources` (= `character.meta.settings.sources`) ao Inventory. Nenhum item já no inventário some (gating só filtra o que é oferecido). Item de Tasha = `source: 'tasha'` carimbado em runtime (não no JSON cru).

**Tech Stack:** React + Vite, Vitest, dados em `public/srd-data/*.json`, SW Workbox (cache `srd-data-vN` em `vite.config.js`, hoje **v16**).

---

## Contexto (leia antes de começar)

- `SrdProvider.jsx`: `DATASETS` (mapa nome→arquivo, com flag `lazy`) e `COMPOSED` (datasets lógicos compostos por partes carimbadas; estratégia `array` = concat + `tagSource`). Ex.: `spells`/`feats` já são compostos phb+tasha. `loadComposed` (l.50) e `loadDataset`. Hook `useLazySrdDataset(name)` carrega sob demanda.
- `domain/sources.js`: `tagSource(items, code)` (carimba `source` quando ausente), `filterCatalogBySources(items, activeSources)` (PHB sempre incluso; ausente/vazio = só PHB).
- `Inventory.jsx`: HOJE faz `fetch('/srd-data/phb-magic-items-pt.json').then(setMagicCatalog)` (~l.145) e passa `items={magicCatalog}` ao `SrdSearchModal` (~l.476). Assinatura (l.102): `Inventory({ inventory, attributes, maxAttunement, onUpdateCurrency, onAddItem, onRemoveItem, onUpdateItem, onAddAttack, onRemoveAttack })` — NÃO recebe `character` nem `activeSources`.
- `SheetContent.jsx` (~l.341) renderiza `<Inventory ... />` e tem `character` em escopo. `activeSources` do personagem = `character.meta?.settings?.sources ?? ['phb']`.
- `phb-magic-items-pt.json` é um ARRAY de 50 itens; cada item: `{ index, name, category, rarity, requiresAttunement, description, effects? }`. Itens de Tasha seguem o MESMO schema.
- Convenção: itens de Tasha NÃO gravam `source` no JSON cru — `tagSource` carimba em runtime.

---

## Task 1: Compor o catálogo de itens mágicos no SrdProvider (phb + tasha, gated)

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx` (DATASETS + COMPOSED)
- Create: `public/srd-data/tasha-magic-items-pt.json` (piloto: 3 itens)
- Test: `src/test/dnd5e/magic-items-composition.test.js` (new)

- [ ] **Step 1: Criar o arquivo piloto `public/srd-data/tasha-magic-items-pt.json`**

```json
[
  {
    "index": "amuleto-do-devoto",
    "name": "Amuleto do Devoto",
    "category": "item-maravilhoso",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Requer sintonização por um clérigo ou paladino. Enquanto usa este símbolo sagrado, você ganha um bônus nas jogadas de ataque mágico e nas CDs de resistência das suas magias, determinado pela raridade (+1 incomum, +2 raro, +3 muito raro). Além disso, você pode usar seu Canalizar Divindade sem gastar um uso; depois de usar essa propriedade, ela só volta no próximo amanhecer."
  },
  {
    "index": "arquivo-de-astromancia",
    "name": "Arquivo de Astromancia",
    "category": "item-maravilhoso",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Requer sintonização por um mago. Esta esfera armilar dobrável contém augúrio, adivinhação, encontrar o caminho, previsão, localizar criatura e localizar objeto (magias de mago para você) e funciona como grimório e foco de conjuração. Tem 3 cargas, recupera 1d3 ao amanhecer: gaste 1 carga (após 1 minuto de estudo) para trocar uma magia de mago preparada por outra de adivinhação no arquivo; ou, como reação, gaste 1 carga para forçar uma criatura a até 9m a rolar 1d4 e somar/subtrair do d20 dela."
  },
  {
    "index": "bracadeiras-de-arquearia",
    "name": "Braçadeiras de Arquearia",
    "category": "item-maravilhoso",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Requer sintonização. Enquanto usa estas braçadeiras e empunha um arco longo ou curto, você ganha proficiência com ele (se já não tiver) e +2 de bônus no dano dos ataques à distância feitos com ele."
  }
]
```

- [ ] **Step 2: Escrever o teste que falha**

```js
// src/test/dnd5e/magic-items-composition.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { tagSource, filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-magic-items-pt.json'), 'utf-8'))
const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-magic-items-pt.json'), 'utf-8'))

// Espelha a composição 'array' do SrdProvider.
const composed = [...tagSource(phb, 'phb'), ...tagSource(tasha, 'tasha')]

describe('catálogo de itens mágicos composto + gated', () => {
  it('tasha-magic-items é um array com o schema certo e sem source no cru', () => {
    expect(Array.isArray(tasha)).toBe(true)
    expect(tasha.length).toBeGreaterThanOrEqual(3)
    for (const it of tasha) {
      expect(typeof it.index).toBe('string')
      expect(typeof it.name).toBe('string')
      expect(it.rarity).toBeTruthy()
      expect(typeof it.description).toBe('string')
      expect(it.source).toBeUndefined() // carimbo é runtime
    }
  })
  it('merge carimba phb e tasha; indices únicos', () => {
    const tashaIdx = new Set(tasha.map(i => i.index))
    const phbIdx = new Set(phb.map(i => i.index))
    for (const idx of tashaIdx) expect(phbIdx.has(idx)).toBe(false) // sem colisão
    expect(composed.find(i => i.index === 'amuleto-do-devoto').source).toBe('tasha')
    expect(composed.find(i => phb[0].index === i.index).source).toBe('phb')
  })
  it('sem Tasha ativo, itens de Tasha NÃO são oferecidos; com Tasha, sim', () => {
    const soPhb = filterCatalogBySources(composed, ['phb'])
    expect(soPhb.some(i => i.source === 'tasha')).toBe(false)
    expect(soPhb.length).toBe(phb.length)
    const comTasha = filterCatalogBySources(composed, ['phb', 'tasha'])
    expect(comTasha.some(i => i.index === 'amuleto-do-devoto')).toBe(true)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/magic-items-composition.test.js`
Expected: FAIL (arquivo tasha ausente até o Step 1; se Step 1 feito, este teste já passa — nesse caso pule pro Step 5). NOTA: este teste valida só dado+helpers (não depende do SrdProvider). Ele deve passar assim que o arquivo piloto existir.

- [ ] **Step 4: Registrar no SrdProvider**

Em `src/systems/dnd5e/data/SrdProvider.jsx`:
1. Em `DATASETS`, adicione (lazy, junto dos outros lazy):
```js
  magicItems:      { pt: 'phb-magic-items-pt.json',     fallback: null,                      lazy: true },
  magicItemsTasha: { pt: 'tasha-magic-items-pt.json',   fallback: null,                      lazy: true },
```
2. Em `COMPOSED`, adicione:
```js
  magicItems:   { strategy: 'array',  parts: [['magicItems', 'phb'], ['magicItemsTasha', 'tasha']] },
```
(NÃO adicione `magicItems` a `CORE_LOGICAL` — fica lazy, carregado sob demanda pelo Inventory.)

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/magic-items-composition.test.js`
Expected: PASS.

Valide o JSON: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-magic-items-pt.json','utf-8')); console.log('ok')"`

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/data/SrdProvider.jsx public/srd-data/tasha-magic-items-pt.json src/test/dnd5e/magic-items-composition.test.js
git commit -m "feat(tasha): catálogo de itens mágicos composto phb+tasha (gated por fonte) + piloto"
```

---

## Task 2: Inventory consome o catálogo composto e filtra por fonte

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/Inventory.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx` (passa `activeSources`)

- [ ] **Step 1: Inventory recebe `activeSources` e usa o dataset lazy**

Em `Inventory.jsx`:
1. Importe o hook e o filtro no topo:
```js
import { useLazySrdDataset } from '../../data/SrdProvider'
import { filterCatalogBySources } from '../../domain/sources'
```
(Confira os caminhos relativos a partir de `components/CharacterSheet/`. `useLazySrdDataset` mora em `../../data/SrdProvider`; `filterCatalogBySources` em `../../domain/sources`. Se `getRarityInfo`/`getActiveMagicEffects` já vêm de `../../domain/magicItems`, espelhe o padrão.)
2. Acrescente `activeSources = ['phb']` à desestruturação de props (l.102-106):
```js
export function Inventory({
  inventory, attributes, maxAttunement = 3, activeSources = ['phb'],
  onUpdateCurrency, onAddItem, onRemoveItem, onUpdateItem,
  onAddAttack, onRemoveAttack,
}) {
```
3. REMOVA o `useState`/`useEffect` que faz o `fetch('/srd-data/phb-magic-items-pt.json')` em `magicCatalog` (~l.111 e o bloco de fetch ~l.145). Troque por:
```js
  const magicCatalogRaw = useLazySrdDataset('magicItems') ?? []
  const magicCatalog = useMemo(
    () => filterCatalogBySources(magicCatalogRaw, activeSources),
    [magicCatalogRaw, activeSources],
  )
```
(Mantenha o `magicSearchOpen` state. `useMemo` já está importado na l.1.)
4. O `SrdSearchModal` segue recebendo `items={magicCatalog}` — agora já filtrado por fonte.

- [ ] **Step 2: SheetContent passa `activeSources`**

Em `SheetContent.jsx` (~l.341), adicione a prop ao `<Inventory>`:
```jsx
        <Inventory
          inventory={character.inventory}
          attributes={character.attributes}
          maxAttunement={getMaxAttunement(character)}
          activeSources={character.meta?.settings?.sources ?? ['phb']}
          onUpdateCurrency={updateCurrency}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onAddAttack={addAttack}
          onRemoveAttack={removeAttack}
        />
```

- [ ] **Step 3: Build + suíte tocada**

Run: `npm run build`
Expected: build OK (imports resolvidos; nenhum fetch órfão).

Run: `npx vitest run src/test/dnd5e/magic-items-composition.test.js`
Expected: PASS.

- [ ] **Step 4: Sanidade no preview**

Suba o preview. Abra/crie um personagem SEM Tasha → Inventário → busca de item mágico: NÃO deve listar "Amuleto do Devoto"/"Braçadeiras de Arquearia". Ative Tasha na aba Ficha (ou crie com Tasha) → a busca passa a listar os itens de Tasha. Itens já adicionados ao inventário continuam intactos ao desativar a fonte.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/Inventory.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx
git commit -m "feat(tasha): Inventory usa catálogo composto e filtra busca de itens por fonte"
```

---

## Task 3: Bump de cache + verificação

**Files:**
- Modify: `vite.config.js` (cache `srd-data-v16` → `srd-data-v17`)

- [ ] **Step 1: Bump do cache**

Em `vite.config.js`, troque `cacheName: 'srd-data-v16'` por `'srd-data-v17'` (comentário datado: "itens mágicos de Tasha — infra D1 + piloto").

- [ ] **Step 2: Suíte cheia + build**

Run: `npx vitest run`
Expected: tudo verde.

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit + memória**

```bash
git add vite.config.js
git commit -m "chore(tasha): bump cache SW v16->v17 (itens mágicos D1)"
```

Atualize a memória (`project_tasha_fontes.md`): D1 entregue (catálogo de itens composto+gated, piloto de 3 itens, Inventory filtra por fonte, cache v17); D2 = fan-out dos ~27 itens restantes do capítulo 4 do TCE (L10486–12681), dado puro sobre a infra do D1.

---

## Self-review (cobertura)

- **Gating do catálogo de itens** (decisão do dono: arquivo separado + gating) → Task 1 (COMPOSED array phb+tasha carimbado) + Task 2 (Inventory filtra por activeSources; SheetContent passa a fonte). Consistente com feats/spells.
- **Piloto** (prova end-to-end) → 3 itens reais de Tasha (Amuleto do Devoto, Arquivo de Astromancia, Braçadeiras de Arquearia), description-only (efeitos complexos fora dos tipos suportados pelo motor — padrão do catálogo).
- **Não quebra inventário existente** → gating só filtra o OFERECIDO; itens já no inventário renderizam sempre.
- **Cache SW** → Task 3 (v16→v17).
- **FORA do D1 (vai pro D2):** os ~27 itens restantes; mapear `effects[]` pros itens cujo efeito casa tipos suportados (a maioria fica description-only); enforcement do limite de sintonização (adiado, fora de todo o D).
