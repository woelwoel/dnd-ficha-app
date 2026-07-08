# Xanathar Plano 1 — Fundação (fonte XGE) + Talentos Raciais

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar a fonte `xanathar` (XGE) na infra de procedência já existente e prová-la ponta a ponta entregando os **15 talentos raciais** do livro, gateados pela fonte e filtrados por um **novo pré-requisito de raça** nos dois FeatPickers (wizard + level-up).

**Architecture:** A infra de fontes (merge carimbado no `SrdProvider`, `filterCatalogBySources`, `SourcePicker`, `SourceBadge`) já foi construída pelo Tasha e escala por dados. Este plano só (1) registra a fonte em `sources.js`, (2) generaliza o compositor de `classChoices` de 2→N fontes, (3) pluga os 4 datasets `xanathar-*.json`, e (4) adiciona o tipo de `prereq` `{ type: 'race' }` num módulo puro novo (`featPrereqs.js`) consumido pelos dois FeatPickers. Conteúdo (talentos) vem do PDF via esteira `scripts/xanathar/` (cópia da do Tasha).

**Tech Stack:** React, Vitest + @testing-library/react, JSON em `public/srd-data`, Python+pymupdf (extração), Vite (PWA/Workbox).

**Spec:** `docs/superpowers/specs/2026-07-07-xanathar-design.md` · **Roadmap:** `docs/superpowers/plans/2026-07-07-xanathar-roadmap.md`

**Comando de teste:** `npx vitest run <arquivo>` (um arquivo) · `npx vitest run` (tudo).

**PDF fonte:** `C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-guia-de-xanathar-para-todas-as-coisas-fundo-branco-biblioteca-elfica.pdf`

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/systems/dnd5e/domain/sources.js` | + entrada `xanathar` em `SOURCES` | Modificar |
| `src/systems/dnd5e/data/SrdProvider.jsx` | Datasets XGE + `loadComposed` classChoices N fontes | Modificar |
| `public/srd-data/xanathar-feats-pt.json` | 15 talentos raciais | **Criar** |
| `public/srd-data/xanathar-spells-pt.json` | `[]` (esqueleto p/ planos futuros) | **Criar** |
| `public/srd-data/xanathar-class-choices-pt.json` | `{}` (esqueleto) | **Criar** |
| `public/srd-data/xanathar-magic-items-pt.json` | `[]` (esqueleto) | **Criar** |
| `scripts/xanathar/extract_text.py` | Extração UTF-8 (cópia da do Tasha) | **Criar** |
| `scripts/xanathar/build_feats.py` | Estrutura os 15 talentos no schema de feats | **Criar** |
| `scripts/xanathar/README.md` | Doc da esteira | **Criar** |
| `src/systems/dnd5e/domain/featPrereqs.js` | `meetsRacePrereq` + `formatRacePrereq` | **Criar** |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx` | Filtro + label de prereq de raça | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx` | Passa `raceInfo` ao FeatPicker | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ASIOrFeatPicker.jsx` | Repassa `raceInfo` | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/LevelProgressionList.jsx` | Passa `raceInfo` ao ASIOrFeatPicker | Modificar |
| `src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx` | Filtro + label de prereq de raça | Modificar |
| `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx` | Passa `raceInfo` ao FeatPicker | Modificar |
| `vite.config.js` | Bump `srd-data-v22` → `v23` | Modificar |
| Vários `src/test/...` | Testes unit/componente/schema | Criar/Modificar |

---

## Task 1: Fonte `xanathar` em `sources.js`

**Files:**
- Modify: `src/systems/dnd5e/domain/sources.js`
- Test: `src/test/dnd5e/sources.test.js` (estender)

- [ ] **Step 1: Escrever o teste que falha** — adicionar ao describe existente:

```js
it('conhece a fonte xanathar (XGE)', () => {
  expect(SOURCES.xanathar).toMatchObject({
    code: 'xanathar',
    label: 'Guia de Xanathar para Todas as Coisas',
    abbr: 'XGE',
  })
})

it('gating trata item xanathar como qualquer suplemento', () => {
  const items = [{ index: 'a' }, { index: 'b', source: 'xanathar' }]
  expect(filterCatalogBySources(items, ['phb']).map(i => i.index)).toEqual(['a'])
  expect(filterCatalogBySources(items, ['phb', 'xanathar']).map(i => i.index)).toEqual(['a', 'b'])
})
```

(Se `filterCatalogBySources` ainda não estiver importado no arquivo de teste, adicionar ao import de `../../systems/dnd5e/domain/sources`.)

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/test/dnd5e/sources.test.js` → FAIL (`SOURCES.xanathar` undefined).
- [ ] **Step 3: Implementar** — em `sources.js`, dentro de `SOURCES`, após a linha `tasha`:

```js
  xanathar: { code: 'xanathar', label: 'Guia de Xanathar para Todas as Coisas', abbr: 'XGE' },
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/sources.test.js` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/sources.js src/test/dnd5e/sources.test.js
git commit -m "feat(xanathar): fonte XGE no dominio de procedencia"
```

---

## Task 2: Datasets XGE no `SrdProvider` + compositor de classChoices N fontes

**Files:**
- Create: `public/srd-data/xanathar-feats-pt.json` (`[]`), `xanathar-spells-pt.json` (`[]`), `xanathar-class-choices-pt.json` (`{}`), `xanathar-magic-items-pt.json` (`[]`)
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Test: `src/test/dnd5e/mergeClassChoices.test.js` (estender)

- [ ] **Step 1: Escrever o teste que falha** — em `mergeClassChoices.test.js`, provar o encadeamento de 3 fontes:

```js
it('encadeia tres fontes preservando o carimbo de cada uma', () => {
  const phb   = { bruxo: { choices: [{ id: 'patron', options: [{ value: 'feerico' }] }] } }
  const tasha = { bruxo: { choices: [{ id: 'patron', options: [{ value: 'genio' }] }] } }
  const xan   = { bruxo: { choices: [{ id: 'patron', options: [{ value: 'hexblade' }] }] } }
  const merged = mergeClassChoices(mergeClassChoices(phb, tasha, 'tasha'), xan, 'xanathar')
  const opts = merged.bruxo.choices[0].options
  expect(opts.map(o => [o.value, o.source ?? 'phb'])).toEqual([
    ['feerico', 'phb'], ['genio', 'tasha'], ['hexblade', 'xanathar'],
  ])
})
```

- [ ] **Step 2: Rodar** — `npx vitest run src/test/dnd5e/mergeClassChoices.test.js`. Este teste já deve **PASSAR** (a função é pura e encadeável; `tagSource` preserva carimbo existente). É a prova de que só falta plugar o provider — não muda `mergeClassChoices`. Se passar, seguir.
- [ ] **Step 3: Criar os 4 JSONs esqueleto:**

```bash
printf '[]' > public/srd-data/xanathar-feats-pt.json
printf '[]' > public/srd-data/xanathar-spells-pt.json
printf '{}' > public/srd-data/xanathar-class-choices-pt.json
printf '[]' > public/srd-data/xanathar-magic-items-pt.json
```

- [ ] **Step 4: Adicionar os datasets** — em `SrdProvider.jsx`, no `DATASETS`, após as entradas Tasha correspondentes:

```js
  spellsXanathar:       { pt: 'xanathar-spells-pt.json',        fallback: null, lazy: false },
  classChoicesXanathar: { pt: 'xanathar-class-choices-pt.json', fallback: null, lazy: false },
  featsXanathar:        { pt: 'xanathar-feats-pt.json',         fallback: null, lazy: true },
  magicItemsXanathar:   { pt: 'xanathar-magic-items-pt.json',   fallback: null, lazy: true },
```

- [ ] **Step 5: Estender as parts do `COMPOSED`** — substituir as 4 entradas por:

```js
  feats:        { strategy: 'array',  parts: [['feats', 'phb'], ['featsTasha', 'tasha'], ['featsXanathar', 'xanathar']] },
  spells:       { strategy: 'array',  parts: [['spells', 'phb'], ['spellsTasha', 'tasha'], ['spellsXanathar', 'xanathar']] },
  classChoices: { strategy: 'classChoices', parts: [['classChoices', 'phb'], ['classChoicesTasha', 'tasha'], ['classChoicesXanathar', 'xanathar']] },
  magicItems:   { strategy: 'array',  parts: [['magicItems', 'phb'], ['magicItemsTasha', 'tasha'], ['magicItemsXanathar', 'xanathar']] },
```

- [ ] **Step 6: Generalizar o branch `classChoices` de `loadComposed`** — hoje é hard-coded pra `map.phb`/`map.tasha`. Substituir por um reduce que encadeia N fontes:

```js
  if (def.strategy === 'classChoices') {
    const [[, base], ...rest] = loaded
    return rest.reduce((acc, [code, data]) => mergeClassChoices(acc, data, code), base ?? {})
  }
```

- [ ] **Step 7: Rodar a suíte de dados** — `npx vitest run src/test/dnd5e/ src/test/phb-classes.test.js` → PASS (JSONs vazios não mudam nada observável; o compositor com base PHB + 2 suplementos vazios devolve o PHB).
- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/data/SrdProvider.jsx public/srd-data/xanathar-*.json src/test/dnd5e/mergeClassChoices.test.js
git commit -m "feat(xanathar): datasets XGE compostos no SrdProvider (classChoices N fontes)"
```

---

## Task 3: Esteira `scripts/xanathar/`

**Files:**
- Create: `scripts/xanathar/extract_text.py`, `scripts/xanathar/build_feats.py`, `scripts/xanathar/README.md`

> Sem teste automatizado aqui (ferramenta descartável de build); a validação vem do schema test na Task 4.

- [ ] **Step 1: Copiar `extract_text.py`** — `scripts/xanathar/extract_text.py` é cópia tal e qual de `scripts/tasha/extract_text.py` (já é genérico: recebe pdf + `--pages` + `-o`). Não alterar o do Tasha.

```bash
cp scripts/tasha/extract_text.py scripts/xanathar/extract_text.py
```

- [ ] **Step 2: Localizar as páginas dos talentos raciais** — extrair o sumário e depois o capítulo 1 (Opções de Personagem → Talentos Raciais):

```bash
PDF="/c/Users/gvfar/OneDrive/RPG BIGBIG/dd-5e-guia-de-xanathar-para-todas-as-coisas-fundo-branco-biblioteca-elfica.pdf"
python scripts/xanathar/extract_text.py "$PDF" --pages 2-6 -o /tmp/xge-sumario.txt   # achar a pagina dos Talentos Raciais
```

Ler `/tmp/xge-sumario.txt` com a tool Read, achar o intervalo, e extrair os talentos:

```bash
python scripts/xanathar/extract_text.py "$PDF" --pages <A-B> -o /tmp/xge-feats.txt
```

(Arquivos em `/tmp` NÃO vão pro git.)

- [ ] **Step 3: Escrever `scripts/xanathar/build_feats.py`** — adaptar `scripts/tasha/build_feats.py`: mesma mecânica (âncoras sequenciais por nome em `FEAT_ORDER`, junção de linhas em parágrafo, descarte de rodapés), trocando `source` pra `"xanathar"` e o dicionário `META` pelos 15 talentos raciais. `META` mapeia `slug → (raças_prereq, choices_de_attrBonus | None)`; a `desc` vem fiel do texto:

```python
# slug: (prereq_races, attr_bonus_choices | None)
META = {
    'sorte-abundante':          (['halfling'], None),                                    # Bountiful Luck
    'medo-draconico':           (['draconato'], ['str', 'con', 'cha']),                  # Dragon Fear
    'couro-de-dragao':          (['draconato'], ['str', 'con', 'cha']),                  # Dragon Hide
    'alta-magia-drow':          (['elfo-negro-drow'], None),                             # Drow High Magic
    'fortitude-ana':            (['anao'], ['con']),                                     # Dwarven Fortitude
    'precisao-elfica':          (['elfo', 'meio-elfo'], ['dex', 'int', 'wis', 'cha']),   # Elven Accuracy
    'desvanecer':               (['gnomo'], ['dex', 'int']),                             # Fade Away
    'teleporte-feerico':        (['alto-elfo'], ['int', 'cha']),                         # Fey Teleportation
    'chamas-de-flegetos':       (['tiefling'], ['int', 'cha']),                          # Flames of Phlegethos
    'constituicao-infernal':    (['tiefling'], ['con']),                                 # Infernal Constitution
    'furia-orc':                (['meio-orc'], ['str', 'con']),                          # Orcish Fury
    'prodigio':                 (['meio-elfo', 'meio-orc', 'humano'], None),             # Prodigy
    'segunda-chance':           (['halfling'], ['dex', 'con', 'cha']),                   # Second Chance
    'agilidade-atarracada':     (['anao', 'halfling', 'gnomo'], ['str', 'dex']),         # Squat Nimbleness (spec: "anao ou raca Pequena" -> lista explicita)
    'magia-do-elfo-da-floresta':(['elfo-da-floresta'], ['wis']),                         # Wood Elf Magic
}
```

Saída por talento, no schema de `phb-feats-pt.json`:

```json
{ "index": "fortitude-ana", "name": "<nome do PDF>", "desc": "<texto do PDF>",
  "source": "xanathar",
  "prereq": { "type": "race", "races": ["anao"] },
  "attrBonus": { "choices": ["con"], "amount": 1 } }
```

(`attrBonus` só quando `choices` não é None. Nomes/slug definitivos e a ordem alfabética real vêm do PDF — ajustar `FEAT_ORDER`/`META`.)

- [ ] **Step 4: Escrever `scripts/xanathar/README.md`** — doc curta apontando o PDF, o intervalo de páginas dos talentos, e o comando de geração (espelhar `scripts/tasha/README.md`).
- [ ] **Step 5: Commit** (só a esteira; o JSON gerado entra na Task 4)

```bash
git add scripts/xanathar/
git commit -m "chore(xanathar): esteira de extracao (extract_text + build_feats)"
```

---

## Task 4: Gerar e validar os 15 talentos raciais

**Files:**
- Modify: `public/srd-data/xanathar-feats-pt.json`
- Test: `src/test/dnd5e/xanathar-feats-schema.test.js` (criar)

- [ ] **Step 1: Escrever o teste de schema que falha** — `src/test/dnd5e/xanathar-feats-schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const feats = JSON.parse(readFileSync('public/srd-data/xanathar-feats-pt.json', 'utf8'))
const ATTRS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

describe('xanathar-feats-pt.json', () => {
  it('tem os 15 talentos raciais', () => expect(feats).toHaveLength(15))

  it('todos carimbados e com prereq de raca valido', () => {
    const seen = new Set()
    for (const f of feats) {
      expect(f.index, JSON.stringify(f)).toMatch(/^[a-z0-9-]+$/)
      expect(seen.has(f.index), f.index).toBe(false); seen.add(f.index)
      expect(f.name?.length, f.index).toBeGreaterThan(2)
      expect(f.desc?.length, f.index).toBeGreaterThan(50)
      expect(f.source, f.index).toBe('xanathar')
      expect(f.prereq?.type, f.index).toBe('race')
      expect(Array.isArray(f.prereq.races) && f.prereq.races.length > 0, f.index).toBe(true)
    }
  })

  it('attrBonus quando presente segue o schema', () => {
    for (const f of feats.filter(f => f.attrBonus)) {
      expect(f.attrBonus.amount, f.index).toBe(1)
      expect(f.attrBonus.choices.every(c => ATTRS.includes(c)), f.index).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/test/dnd5e/xanathar-feats-schema.test.js` → FAIL (arquivo é `[]`).
- [ ] **Step 3: Gerar o JSON** (iterando o build script até bater):

```bash
PDF="/c/Users/gvfar/OneDrive/RPG BIGBIG/dd-5e-guia-de-xanathar-para-todas-as-coisas-fundo-branco-biblioteca-elfica.pdf"
python scripts/xanathar/extract_text.py "$PDF" --pages <A-B> \
  | python scripts/xanathar/build_feats.py > public/srd-data/xanathar-feats-pt.json
```

Inspecionar com a tool Read (não `cat` — terminal quebra UTF-8).

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/xanathar-feats-schema.test.js` → PASS.
- [ ] **Step 5: Validar JSON** — `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/xanathar-feats-pt.json','utf8')); console.log('JSON ok')"` → `JSON ok`.
- [ ] **Step 6: Revisão de fidelidade com o dono** — mostrar os 15 nomes+descs; corrigir o que ele apontar.
- [ ] **Step 7: Commit**

```bash
git add public/srd-data/xanathar-feats-pt.json src/test/dnd5e/xanathar-feats-schema.test.js
git commit -m "feat(xanathar): 15 talentos raciais do XGE"
```

---

## Task 5: Módulo puro `featPrereqs.js`

**Files:**
- Create: `src/systems/dnd5e/domain/featPrereqs.js`
- Test: `src/test/dnd5e/featPrereqs.test.js` (criar)

- [ ] **Step 1: Escrever o teste que falha** — `src/test/dnd5e/featPrereqs.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { meetsRacePrereq, formatRacePrereq } from '../../systems/dnd5e/domain/featPrereqs'

describe('meetsRacePrereq', () => {
  const prereq = { type: 'race', races: ['anao', 'elfo-negro-drow'] }
  it('casa pela raca', () => expect(meetsRacePrereq(prereq, { race: 'anao', subrace: 'anao-da-colina' })).toBe(true))
  it('casa pela sub-raca', () => expect(meetsRacePrereq(prereq, { race: 'elfo', subrace: 'elfo-negro-drow' })).toBe(true))
  it('rejeita quem nao e', () => expect(meetsRacePrereq(prereq, { race: 'humano', subrace: '' })).toBe(false))
  it('prereq de outro tipo nunca bloqueia aqui', () => expect(meetsRacePrereq({ type: 'ability' }, { race: 'humano' })).toBe(true))
  it('sem prereq passa', () => expect(meetsRacePrereq(null, { race: 'humano' })).toBe(true))
})

describe('formatRacePrereq', () => {
  it('rotulo legivel com "ou"', () => expect(formatRacePrereq({ type: 'race', races: ['anao', 'halfling'] })).toBe('Anão ou Halfling'))
})
```

- [ ] **Step 2: Rodar e ver falhar** — módulo não existe.
- [ ] **Step 3: Implementar `featPrereqs.js`:**

```js
/**
 * Pré-requisitos de talento por RAÇA (talentos raciais do Xanathar).
 * O match aceita tanto o índice da raça quanto o da sub-raça da ficha —
 * "elfo-negro-drow" é sub-raça de "elfo", mas conta como raça pro prereq.
 */
const RACE_LABEL = {
  anao: 'Anão', elfo: 'Elfo', halfling: 'Halfling', humano: 'Humano',
  draconato: 'Draconato', gnomo: 'Gnomo', 'meio-elfo': 'Meio-Elfo',
  'meio-orc': 'Meio-Orc', tiefling: 'Tiefling',
  'alto-elfo': 'Alto Elfo', 'elfo-da-floresta': 'Elfo da Floresta',
  'elfo-negro-drow': 'Drow',
}

export function meetsRacePrereq(prereq, { race, subrace } = {}) {
  if (!prereq || prereq.type !== 'race') return true
  return (prereq.races ?? []).some(r => r === race || r === subrace)
}

export function formatRacePrereq(prereq) {
  return (prereq?.races ?? []).map(r => RACE_LABEL[r] ?? r).join(' ou ')
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/featPrereqs.test.js` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/featPrereqs.js src/test/dnd5e/featPrereqs.test.js
git commit -m "feat(xanathar): featPrereqs — prereq de talento por raca (dominio puro)"
```

---

## Task 6: Prereq de raça no FeatPicker do **wizard**

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx` (call site ~270)
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ASIOrFeatPicker.jsx` (~130)
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/LevelProgressionList.jsx` (~65)
- Test: `src/test/wizardV2-FeatPicker.test.jsx` (estender)

- [ ] **Step 1: Escrever os testes que falham** — em `wizardV2-FeatPicker.test.jsx` (seguir o padrão de render do arquivo; importar `screen`/`render` já usados lá):

```js
it('esconde talento racial de outra raca quando raceInfo e fornecido', () => {
  const feats = [
    { index: 'atleta', name: 'Atleta', desc: 'x', prereq: null },
    { index: 'fortitude-ana', name: 'Fortitude Anã', desc: 'x', prereq: { type: 'race', races: ['anao'] } },
  ]
  render(<FeatPicker feats={feats} value={null} onChange={() => {}} raceInfo={{ race: 'humano', subrace: '' }} />)
  expect(screen.getByText('Atleta')).toBeInTheDocument()
  expect(screen.queryByText('Fortitude Anã')).not.toBeInTheDocument()
})

it('mostra talento racial pra raca certa', () => {
  const feats = [{ index: 'fortitude-ana', name: 'Fortitude Anã', desc: 'x', prereq: { type: 'race', races: ['anao'] } }]
  render(<FeatPicker feats={feats} value={null} onChange={() => {}} raceInfo={{ race: 'anao', subrace: 'anao-da-colina' }} />)
  expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
})

it('sem raceInfo mostra tudo (retrocompat)', () => {
  const feats = [{ index: 'fortitude-ana', name: 'Fortitude Anã', desc: 'x', prereq: { type: 'race', races: ['anao'] } }]
  render(<FeatPicker feats={feats} value={null} onChange={() => {}} />)
  expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/test/wizardV2-FeatPicker.test.jsx` → FAIL (o talento anão aparece pro humano).
- [ ] **Step 3: Implementar no FeatPicker do wizard** — em `blocks/FeatPicker.jsx`:

3a. Import no topo: `import { meetsRacePrereq, formatRacePrereq } from '../../../domain/sources'` — **corrigir caminho**: o módulo é `../../../domain/featPrereqs`. Adicionar:

```js
import { meetsRacePrereq, formatRacePrereq } from '../../../domain/featPrereqs'
```

3b. Assinatura ganha `raceInfo = null`:

```js
export function FeatPicker({ feats = [], value = null, onChange, raceInfo = null }) {
```

3c. O `filtered` passa a excluir os que não casam **quando `raceInfo` é fornecido**:

```js
  const filtered = feats.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
    && (!raceInfo || meetsRacePrereq(f.prereq, raceInfo))
  )
```

3d. Em `formatPrereq`, adicionar o case antes do `default`:

```js
    case 'race':
      return formatRacePrereq(prereq)
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/wizardV2-FeatPicker.test.jsx` → PASS.
- [ ] **Step 5: Plumbar `raceInfo` nos call sites do wizard:**

5a. `RaceBlock.jsx` (~270, Humano Variante) → `raceInfo={{ race: draft.race, subrace: draft.subrace }}`.

5b. `ASIOrFeatPicker.jsx` — ganha prop `raceInfo` na assinatura (~9) e repassa ao `<FeatPicker ... raceInfo={raceInfo} />` (~130).

5c. `LevelProgressionList.jsx` (~65, que já tem `draft`) → passar `raceInfo={{ race: draft.race, subrace: draft.subrace }}` ao `<ASIOrFeatPicker>`.

- [ ] **Step 6: Rodar a suíte do wizard** — `npx vitest run src/test/wizardV2-FeatPicker.test.jsx src/test/wizardV2-ASIOrFeatPicker.test.jsx src/test/wizardV2-RaceBlock.test.jsx src/test/wizardV2-LevelProgressionList.test.jsx` → PASS.
- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/FeatPicker.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ASIOrFeatPicker.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/class/LevelProgressionList.jsx src/test/wizardV2-FeatPicker.test.jsx
git commit -m "feat(xanathar): prereq de raca no FeatPicker do wizard"
```

---

## Task 7: Prereq de raça no FeatPicker do **level-up** (ficha)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx` (~181)
- Test: `src/test/dnd5e/levelup-FeatPicker-race.test.jsx` (criar)

- [ ] **Step 1: Escrever o teste que falha** — `src/test/dnd5e/levelup-FeatPicker-race.test.jsx` (render direto do componente; conferir as props obrigatórias do FeatPicker do level-up lendo o topo do arquivo — recebe `feats`, `attributes`, `onSelect`/`onChange`, etc. Ajustar a chamada ao contrato real):

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatPicker } from '../../systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker'

const feats = [
  { index: 'atleta', name: 'Atleta', desc: 'x', prereq: null },
  { index: 'fortitude-ana', name: 'Fortitude Anã', desc: 'x', prereq: { type: 'race', races: ['anao'] } },
]

describe('FeatPicker (level-up) — prereq de raca', () => {
  it('esconde talento racial de outra raca', () => {
    render(<FeatPicker feats={feats} attributes={{}} raceInfo={{ race: 'humano', subrace: '' }} onSelect={() => {}} />)
    expect(screen.getByText('Atleta')).toBeInTheDocument()
    expect(screen.queryByText('Fortitude Anã')).not.toBeInTheDocument()
  })
  it('mostra pra raca certa', () => {
    render(<FeatPicker feats={feats} attributes={{}} raceInfo={{ race: 'anao', subrace: 'anao-da-colina' }} onSelect={() => {}} />)
    expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar no FeatPicker do level-up** — em `levelProgression/FeatPicker.jsx`:

3a. Import: `import { meetsRacePrereq, formatRacePrereq } from '../../../domain/featPrereqs'`.

3b. Assinatura ganha `raceInfo = null`.

3c. No filtro de prereq (junto dos branches `ability`/`ability_or`, ~linha 20-27), adicionar:

```js
    if (f.prereq.type === 'race') {
      return !raceInfo || meetsRacePrereq(f.prereq, raceInfo)
    }
```

3d. No bloco de labels (~62-66), adicionar:

```jsx
                      {feat.prereq.type === 'race' && `(requer ${formatRacePrereq(feat.prereq)})`}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/levelup-FeatPicker-race.test.jsx` → PASS.
- [ ] **Step 5: Plumbar no `LevelUpPanel.jsx`** (~181) — passar `raceInfo={{ race: character.info?.race, subrace: character.info?.subrace }}` ao `<FeatPicker>` (confirmar o nome da variável de personagem no arquivo — pode ser `character` ou desestruturado).
- [ ] **Step 6: Rodar a suíte de level-up** — `npx vitest run src/test/dnd5e/` → PASS.
- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker.jsx src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx src/test/dnd5e/levelup-FeatPicker-race.test.jsx
git commit -m "feat(xanathar): prereq de raca no FeatPicker do level-up"
```

---

## Task 8: Gating por fonte dos talentos XGE

**Files:**
- Test: `src/test/dnd5e/feat-source-gating.test.jsx` (estender)

- [ ] **Step 1: Estender o teste de gating existente** com o caso XGE (copiar o padrão Tasha do arquivo, trocando a fonte):

```js
it('talento xanathar so e oferecido com a fonte xanathar ativa', () => {
  const feats = [{ index: 'fortitude-ana', name: 'Fortitude Anã', source: 'xanathar' }]
  expect(filterCatalogBySources(feats, ['phb']).length).toBe(0)
  expect(filterCatalogBySources(feats, ['phb', 'tasha']).length).toBe(0)
  expect(filterCatalogBySources(feats, ['phb', 'xanathar']).length).toBe(1)
})
```

- [ ] **Step 2: Rodar e ver passar** — `npx vitest run src/test/dnd5e/feat-source-gating.test.jsx` → PASS (a infra já faz o gating; este teste ancora o comportamento pra XGE). Se falhar por import, alinhar ao que o arquivo já importa.
- [ ] **Step 3: Commit**

```bash
git add src/test/dnd5e/feat-source-gating.test.jsx
git commit -m "test(xanathar): gating por fonte dos talentos XGE"
```

---

## Task 9: Bump do SW + verificação final + merge

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Bump do `cacheName`** — em `vite.config.js` (~linha 100), `cacheName: 'srd-data-v22'` → `'srd-data-v23'` (confirmar que 22 ainda é o atual; usar o próximo N livre).
- [ ] **Step 2: Suíte completa** — `npx vitest run` → PASS (fora flakes conhecidos de timeout em `LoginScreen`/`ResetPasswordScreen`; se aparecerem, re-rodar só esses arquivos).
- [ ] **Step 3: Build sanity** — `npx vite build` → conclui sem erro.
- [ ] **Step 4: Commit**

```bash
git add vite.config.js
git commit -m "chore(xanathar): bump cache srd-data v22->v23 (fundacao + talentos)"
```

- [ ] **Step 5: Merge + deploy** — mergear a branch `xanathar` na `master` e `git push` (deploy automático — política do dono).

---

## Verificação manual (preview) sugerida após a Task 9

1. Criar personagem com Xanathar **desligado** → nenhum talento racial XGE aparece.
2. Ligar Xanathar → os talentos raciais aparecem com selo **XGE**, mas só os da raça do personagem (ex.: Anão vê Fortitude Anã; Humano não).
3. Humano Variante (passo de raça) → mesma filtragem por raça no FeatPicker.

---

## Self-review (cobertura da spec §Infra + §prereq de raça + §talentos)

- Fonte XGE em `sources.js` (spec §"Infra da fonte XGE") → Task 1.
- Datasets compostos + N fontes no provider (spec §"Infra") → Task 2.
- Esteira de extração (spec §"Esteira de extração") → Task 3.
- 15 talentos raciais no schema (spec §"Talentos raciais") → Task 4.
- Novo tipo `prereq: race`, sub-raça e "Pequena→lista explícita" (spec §"Peça: pré-requisito de raça") → Tasks 5-7.
- Gating por fonte (spec §"Infra", princípio de gating) → Task 8.
- Bump SW (spec §"Service worker") → Task 9.
