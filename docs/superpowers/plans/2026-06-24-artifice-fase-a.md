# Artífice — Fase A (classe jogável, sem infusões) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o **Artífice** uma classe jogável do D&D 5e — selecionável (gateada pela fonte Tasha), meio-conjuradora de Inteligência, com as 4 subclasses e todas as features de nível como texto — SEM o sistema de infusões (Fase B).

**Architecture:** O Artífice entra como dado novo (`tasha-classes-pt.json` + progressão + `class-choices` + magias de subclasse) mesclado ao conteúdo PHB pelo `SrdProvider` (generalizando o mecanismo `COMPOSED` já usado pros talentos). A conjuração reusa o motor de meio-conjurador existente (`utils/spellcasting.js`) com 4 ajustes pontuais já mapeados pelo spike. A máquina de classes é data-driven, então a integração na criação/ficha é mínima além do gating da lista de classes pela fonte.

**Tech Stack:** React + Vite, Zod, Vitest + @testing-library/react, Python + pymupdf (esteira de extração em `scripts/tasha/`, já existente). Base: [spike do Artífice](../notes/2026-06-23-artifice-spike.md), [spec do Tasha](../specs/2026-06-23-tasha-caldeirao-design.md).

**Fatos confirmados (não re-derivar):**
- Tabela de slots do Artífice = exatamente `SPELL_SLOTS_TABLE[ceil(nível/2)-1]` do motor atual (L1=2 de 1º; L5=4/2; L20=4/3/3/3/2). Nenhuma tabela nova.
- Classe: DV d8; salvaguardas CON+INT; armaduras leve/média/escudos; armas simples; ferramentas (ladrão + funileiro + 1 artesão à escolha); 2 perícias de {Arcanismo, História, Investigação, Medicina, Natureza, Percepção, Prestidigitação}; conjuração de INT preparada COM truques; subclasse no nível 3.
- Subclasses: Alquimista, Artilheiro, Ferreiro de Batalha, Armoreiro.
- Features por nível vivem em `progression[classe].levels[n].features` (lidas por `FeaturesTab.jsx`). Subclasses em `class-choices[classe].choices[].options[]` (desc com features por nível). Classe-base em `classes` (array). `classChoices`/`progression` são OBJETOS keyed por índice de classe.
- Não há listas de classes hardcoded no código de produção; os únicos pontos que citam índices de classe conjuradora são `utils/spellcasting.js` e `domain/rules.js` (cobertos abaixo).
- Conteúdo-fonte: PDF do Tasha em `C:\Users\gvfar\OneDrive\RPG BIGBIG\D&D 5e - Caldeirão de Tasha para Tudo (Versão Fã) (1).pdf`. Artífice nas páginas (0-indexadas) ~8–18: classe 8–11, subclasses 11–18, (infusões 18+ ficam pra Fase B). Extração é UTF-8 limpa (sem reparo de acento).

---

## Estrutura de arquivos

**Criar:**
- `public/srd-data/tasha-classes-pt.json` — entrada do Artífice (array, mesma forma de `phb-classes-pt.json`), `source: "tasha"`.
- `public/srd-data/tasha-class-progression-full-pt.json` — `{ artifice: { ...levels[20] } }` (features por nível, cantrips_known; sem spell_slots_table próprio — engine calcula).
- `public/srd-data/tasha-class-choices-pt.json` — `{ artifice: { choices: [ subclasse no nv3 com 4 options ] } }`.
- `scripts/tasha/build_artificer.py` — estrutura classe + progressão + subclasses a partir do texto extraído.
- Testes: `src/test/dnd5e/tasha-artificer-schema.test.js`, `src/test/dnd5e/artificer-spellcasting.test.js`, `src/test/dnd5e/SrdProvider-composed.test.jsx`, `src/test/dnd5e/artificer-class-gating.test.jsx`.

**Modificar:**
- `src/systems/dnd5e/data/SrdProvider.jsx` — generalizar `COMPOSED` (estratégia array vs objeto) e compor `classes`/`classChoices`/`progression` no boot.
- `src/utils/spellcasting.js` — `artifice` como meio-conjurador (começa nv1, ceil em multiclasse, prepara com truques, INT).
- `src/systems/dnd5e/domain/rules.js` — `artifice` em `SPELLCASTER_CLASSES` + mapa de atributo de conjuração.
- `src/systems/dnd5e/domain/subclassSpells.js` — magias sempre-preparadas das subclasses do Artífice.
- `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` (ou onde a lista de classes alimenta o ClassBlock) — gating da lista de classes pela fonte.
- `vite.config.js` — bump `cacheName` `srd-data-v8` → `srd-data-v9`.

---

## Task A1: Generalizar o merge COMPOSED (array + objeto) no SrdProvider

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Test: `src/test/dnd5e/SrdProvider-composed.test.jsx`

Hoje `COMPOSED = { feats: [['feats','phb'],['featsTasha','tasha']] }` e `loadComposed` faz `tagSource(...).flat()` (assume ARRAY). `classes` é array (concat+tag), mas `classChoices`/`progression` são OBJETOS keyed por índice (merge = spread). Precisamos das duas estratégias, e compor datasets NÃO-lazy no boot.

- [ ] **Step 1: Teste que falha** — `src/test/dnd5e/SrdProvider-composed.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SrdProvider, useSrd } from '../../systems/dnd5e/data/SrdProvider'

function Probe() {
  const { classes, classChoices } = useSrd()
  return (
    <div>
      <div data-testid="classes">{(classes ?? []).map(c => `${c.index}:${c.source}`).join(',')}</div>
      <div data-testid="choices">{Object.keys(classChoices ?? {}).sort().join(',')}</div>
    </div>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const body =
      url.includes('phb-classes')            ? [{ index: 'druida', name: 'Druida' }] :
      url.includes('tasha-classes')          ? [{ index: 'artifice', name: 'Artífice', source: 'tasha' }] :
      url.includes('phb-class-choices')      ? { druida: { choices: [] } } :
      url.includes('tasha-class-choices')    ? { artifice: { choices: [] } } :
      url.includes('phb-class-progression')  ? { druida: { levels: [] } } :
      url.includes('tasha-class-progression')? { artifice: { levels: [] } } :
      Array.isArray(url) ? [] : {}
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) })
  }))
})

describe('SrdProvider — datasets compostos no boot', () => {
  it('classes = array phb+tasha carimbado; classChoices = objeto mesclado', async () => {
    render(<SrdProvider><Probe /></SrdProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('classes').textContent).toContain('druida:phb')
      expect(screen.getByTestId('classes').textContent).toContain('artifice:tasha')
      expect(screen.getByTestId('choices').textContent).toBe('artifice,druida')
    })
  })
})
```

- [ ] **Step 2: Rodar, ver falhar** — `npm test -- src/test/dnd5e/SrdProvider-composed.test.jsx` → FAIL (classes sem `:phb`/sem artifice; choices sem artifice).

- [ ] **Step 3: Implementar.** Em `SrdProvider.jsx`:

(a) Adicionar partes Tasha ao `DATASETS` (não-lazy, como suas contrapartes PHB):
```js
  classesTasha:      { pt: 'tasha-classes-pt.json',               fallback: null, lazy: false },
  classChoicesTasha: { pt: 'tasha-class-choices-pt.json',         fallback: null, lazy: false },
  progressionTasha:  { pt: 'tasha-class-progression-full-pt.json',fallback: null, lazy: false },
```
(b) Redefinir `COMPOSED` com estratégia explícita:
```js
// chave lógica → { strategy: 'array'|'object', parts: [[parteKey, sourceCode], ...] }
const COMPOSED = {
  feats:        { strategy: 'array',  parts: [['feats', 'phb'], ['featsTasha', 'tasha']] },
  classes:      { strategy: 'array',  parts: [['classes', 'phb'], ['classesTasha', 'tasha']] },
  classChoices: { strategy: 'object', parts: [['classChoices', 'phb'], ['classChoicesTasha', 'tasha']] },
  progression:  { strategy: 'object', parts: [['progression', 'phb'], ['progressionTasha', 'tasha']] },
}

async function loadComposed(name) {
  const def = COMPOSED[name]
  if (!def) return null
  const loaded = await Promise.all(
    def.parts.map(async ([key, code]) => [code, await loadDataset(key, DATASETS[key])])
  )
  if (def.strategy === 'array') {
    return loaded.flatMap(([code, data]) => tagSource(Array.isArray(data) ? data : [], code))
  }
  // 'object': mescla por chave; partes posteriores (tasha) adicionam/sobrescrevem.
  return Object.assign({}, ...loaded.map(([, data]) => (data && typeof data === 'object' ? data : {})))
}
```
(c) No boot (`useEffect`), compor as chaves compostas não-lazy. As partes (`classes`, `classesTasha`, ...) NÃO devem entrar como datasets independentes no estado (são insumos). Trocar o cálculo de `coreEntries` por uma lista de chaves LÓGICAS a carregar no boot:
```js
const CORE_LOGICAL = ['races', 'classes', 'backgrounds', 'spells', 'levels', 'progression', 'classChoices']
// ...
Promise.all(CORE_LOGICAL.map(async (name) => {
  const value = COMPOSED[name] ? await loadComposed(name) : await loadDataset(name, DATASETS[name])
  return [name, value]
})).then(entries => { if (!cancelled) setData(prev => ({ ...prev, ...Object.fromEntries(entries), ready: true })) })
```
(d) `requestDataset` já trata `COMPOSED[name]` (talentos lazy) — manter, ajustando pra nova forma `{ strategy, parts }` via o mesmo `loadComposed`.
(e) `EMPTY_DEFAULTS`: manter `classes: []`, `classChoices: {}`, `progression: {}` (já existem).

VERIFICAR contra o código real: preservar o cache de módulo, o tratamento de vazio e o `requestDataset` lazy de `feats`. Não quebrar a composição de `feats` (Task 7 da fundação).

- [ ] **Step 4: Rodar, ver passar** — `npm test -- src/test/dnd5e/SrdProvider-composed.test.jsx` e `npm test -- src/test/dnd5e/SrdProvider-merge.test.jsx` (feats continua compondo).

- [ ] **Step 5: Regressão** — `npm test`. Datasets ausentes (arquivos tasha-* ainda não criados em runtime de teste) caem em `[]`/`{}` via `loadDataset` catch — confirmar que o boot não trava. Corrigir o que regredir.

- [ ] **Step 6: Commit**
```bash
git add src/systems/dnd5e/data/SrdProvider.jsx src/test/dnd5e/SrdProvider-composed.test.jsx
git commit -m "feat(dnd5e): SrdProvider compõe classes/classChoices/progression phb+tasha (estratégia array|objeto)"
git push
```

---

## Task A2: Motor de conjuração — Artífice como meio-conjurador

**Files:**
- Modify: `src/utils/spellcasting.js`
- Test: `src/test/dnd5e/artificer-spellcasting.test.js`

O Artífice difere de Paladino/Patrulheiro: conjura desde o nv1 (não nv2), arredonda PRA CIMA em multiclasse, prepara COM truques, usa INT. Ver spike.

- [ ] **Step 1: Teste que falha** — `src/test/dnd5e/artificer-spellcasting.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getSpellSlots } from '../../utils/spellcasting'

describe('Artífice — slots de meio-conjurador (começa nv1, ceil)', () => {
  it('nível 1: 2 slots de 1º círculo', () => {
    expect(getSpellSlots('artifice', 1, [])).toEqual({ 1: 2 })
  })
  it('nível 5: 4 de 1º, 2 de 2º', () => {
    expect(getSpellSlots('artifice', 5, [])).toEqual({ 1: 4, 2: 2 })
  })
  it('nível 20: 4/3/3/3/2 (até 5º círculo)', () => {
    expect(getSpellSlots('artifice', 20, [])).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 })
  })
})

describe('Paladino/Patrulheiro NÃO mudam (não conjuram no nv1)', () => {
  it('paladino nv1: sem slots', () => {
    expect(getSpellSlots('paladino', 1, [])).toBeNull()
  })
  it('paladino nv5: 4/2', () => {
    expect(getSpellSlots('paladino', 5, [])).toEqual({ 1: 4, 2: 2 })
  })
})
```

- [ ] **Step 2: Rodar, ver falhar** — `artifice` não está em `CASTER_TYPE` → `getSpellSlots('artifice', ...)` retorna null.

- [ ] **Step 3: Implementar** em `src/utils/spellcasting.js`:
  - `CASTER_TYPE.artifice = 'half'`.
  - Em `getSpellSlots`, no ramo SOLO `type === 'half'`: a guarda `if (c.level < 2) return null` deve ter exceção pro Artífice (conjura desde o nv1). Ex.: `const minLevel = c.index === 'artifice' ? 1 : 2; if (c.level < minLevel) return null;` — VERIFICAR como `c` carrega o índice da classe (`collectCasterEntries` deve expor `index`; se não expuser, adicionar). `effectiveLevel = Math.ceil(c.level / 2)` já vale pro Artífice.
  - Em `computeEffectiveCasterLevel` (ramo multiclasse), o half usa `Math.floor(level/2)`; pro Artífice usar `Math.ceil(level/2)` (errata Tasha). Localizar `else if (type === 'half') eff += Math.floor(level / 2)` e tratar `artifice` com `ceil`.
  - `PREPARE_CONFIG.artifice = { ability: 'int', halfLevel: true, hasCantrips: true, hasSpellbook: false }` (note: COM truques, diferente do paladino).

  Garantir que `collectCasterEntries`/`getCasterType` reconheçam `artifice` como conjurador.

- [ ] **Step 4: Rodar, ver passar** — `npm test -- src/test/dnd5e/artificer-spellcasting.test.js`. Os 2 testes de Paladino DEVEM continuar verdes (regressão da guarda/ceil).

- [ ] **Step 5: Regressão de conjuração** — `npm test -- src/test/ -t "slot"` e `-t "spell"` e `-t "multiclass"`. Paladino/Patrulheiro/multiclasse intactos. Corrigir o que regredir.

- [ ] **Step 6: Commit**
```bash
git add src/utils/spellcasting.js src/test/dnd5e/artificer-spellcasting.test.js
git commit -m "feat(dnd5e): Artífice meio-conjurador (começa nv1, ceil em multiclasse, prepara INT com truques)"
git push
```

---

## Task A3: rules.js — Artífice como classe conjuradora

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js`
- Test: `src/test/dnd5e/artificer-spellcasting.test.js` (adicionar bloco)

- [ ] **Step 1: Teste que falha** — adicionar ao arquivo da Task A2:
```js
import { SPELLCASTER_CLASSES } from '../../systems/dnd5e/domain/rules'
describe('Artífice é classe conjuradora', () => {
  it('está em SPELLCASTER_CLASSES', () => {
    expect(SPELLCASTER_CLASSES.has('artifice')).toBe(true)
  })
})
```
(Confirmar que `SPELLCASTER_CLASSES` é exportado; se não, exportá-lo ou testar via a função pública que usa o set.)

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** em `rules.js`: adicionar `'artifice'` ao set `SPELLCASTER_CLASSES` e ao mapa de atributo de conjuração por classe (`artifice: 'int'`, junto de `paladino: 'cha'` etc., ~linha 63).

- [ ] **Step 4: Rodar, ver passar.**

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/artificer-spellcasting.test.js
git commit -m "feat(dnd5e): Artífice em SPELLCASTER_CLASSES + atributo de conjuração INT"
git push
```

---

## Task A4: Extrair e estruturar a CLASSE Artífice (base + progressão)

**Files:**
- Create: `scripts/tasha/build_artificer.py`
- Create: `public/srd-data/tasha-classes-pt.json`
- Create: `public/srd-data/tasha-class-progression-full-pt.json`

> Ferramenta descartável (gitignore já ignora `*.txt`). Extração UTF-8 limpa, sem reparo. O texto-fonte (pgs 8–11) tem a tabela "O Artífice" e a seção "Características do Artífice".

- [ ] **Step 1: Escrever `scripts/tasha/build_artificer.py`** que produz DOIS JSON:
  - `tasha-classes-pt.json` = `[{ index:'artifice', name:'Artífice', hit_die:8, saving_throws:['Constituição','Inteligência'], armor_proficiencies:[...], weapon_proficiencies:['Armas simples'], tool_proficiencies:[...], skill_choices:{count:2, from:['Arcanismo','História','Investigação','Medicina','Natureza','Percepção','Prestidigitação']}, spellcasting_ability:'Inteligência', summary, fullDescription, topics, level1_features, gold_formula, source:'tasha' }]` — MESMA forma de `phb-classes-pt.json` (inspecionar uma entrada PHB pra casar os campos exatos).
  - `tasha-class-progression-full-pt.json` = `{ artifice: { index:'artifice', name:'Artífice', hit_die:8, primary_ability:'Inteligência', saving_throws:[...], armor_proficiencies:[...], weapon_proficiencies:[...], tool_proficiencies:[...], skill_choices:{...}, cantrips_known:[2,2,2,2,...], levels:[ { level, prof, features:[ {name, desc, ...} ] } × 20 ] } }`. NÃO incluir `spell_slots_table` (o motor calcula meio-conjurador). `cantrips_known` por nível: 2 (nv1–9), 3 (nv10–13), 4 (nv14+) — conforme a coluna "Truques Conhecidos" da tabela.
  - As features por nível (coluna "Características de Classe" da tabela) com descrição parseada da seção "Características do Artífice": Engenharia Mágica (Magical Tinkering) nv1, Conjuração nv1, Infundir Item nv2 (TEXTO descritivo — a mecânica interativa é Fase B), Especialização de Artífice nv3 (marca a escolha de subclasse — ver Task A5), A ferramenta certa para o trabalho nv3, Maestria em Ferramenta nv6, Lampejo de Genialidade nv7, Perito em Itens Mágicos nv10, Item de Armazenar Magia nv11, Versado em Itens Mágicos nv14, Maestria em Itens Mágicos nv18, Alma do Artífice nv20. "Aumento no Valor de Atributo" nos níveis 4/8/12/16/19 segue o padrão das outras classes (verificar como PHB marca ASI no progression e replicar).

  O parser segue o padrão de `build_feats.py`: extrair via `extract_text.py`, limpar ruído de rodapé, ancorar por nomes de feature em sequência, juntar linhas. REVISAR a saída à mão (descrições completas, níveis certos).

- [ ] **Step 2: Gerar os arquivos**
```bash
PDF="C:/Users/gvfar/OneDrive/RPG BIGBIG/D&D 5e - Caldeirão de Tasha para Tudo (Versão Fã) (1).pdf"
python scripts/tasha/build_artificer.py "$PDF"   # script escreve os 2 arquivos
```
Revisar: tabela de features por nível bate com a tabela "O Artífice"; cantrips_known correto; proficiências/perícias corretas.

- [ ] **Step 3: Commit**
```bash
git add scripts/tasha/build_artificer.py public/srd-data/tasha-classes-pt.json public/srd-data/tasha-class-progression-full-pt.json
git commit -m "feat(tasha): classe Artífice (base + progressão de features por nível)"
git push
```

---

## Task A5: Subclasses do Artífice (class-choices)

**Files:**
- Modify: `scripts/tasha/build_artificer.py` (gerar também as subclasses)
- Create: `public/srd-data/tasha-class-choices-pt.json`

> Subclasse escolhida no NÍVEL 3 ("Especialização de Artífice"). Mesma forma de `phb-class-choices-pt.json`: `{ artifice: { choices: [ { level:3, id:'artificer_specialist', featureName:'Especialização de Artífice', prompt:'Escolha sua Especialização', options:[ {value, name, desc} × 4 ] } ] } }`. O `desc` de cada subclasse embute as features por nível (nv3/5/9/15), como as subclasses PHB fazem.

- [ ] **Step 1: Estender `build_artificer.py`** pra parsear as 4 subclasses (pgs ~11–18): Alquimista (`alquimista`), Artilheiro (`artilheiro`), Ferreiro de Batalha (`ferreiro-de-batalha`), Armoreiro (`armoreiro`). Cada `option`: `value` (slug), `name`, `desc` (features por nível em texto, padrão das subclasses PHB — ex.: "Features por nível:\n• Nv 3 — ...").

- [ ] **Step 2: Gerar `tasha-class-choices-pt.json`** e revisar à mão (4 subclasses, features por nível, nível de escolha = 3). Conferir que o formato bate com uma entrada de `phb-class-choices-pt.json` (inspecionar `clerigo`/`druida`).

- [ ] **Step 3: Commit**
```bash
git add scripts/tasha/build_artificer.py public/srd-data/tasha-class-choices-pt.json
git commit -m "feat(tasha): 4 subclasses do Artífice em tasha-class-choices-pt.json"
git push
```

---

## Task A6: Magias sempre-preparadas das subclasses

**Files:**
- Modify: `src/systems/dnd5e/domain/subclassSpells.js`
- Test: `src/test/dnd5e/artificer-subclass-spells.test.js`

As subclasses do Artífice concedem magias "sempre preparadas" em níveis específicos (Alquimista, Artilheiro, Ferreiro de Batalha, Armoreiro). Modelar no motor genérico de `subclassSpells.js` (GRUPO "Sempre Preparadas", `alwaysPrepared:true`).

- [ ] **Step 1: Ler `subclassSpells.js`** e entender a estrutura de mapeamento (subclasse → níveis → magias). Inspecionar como Domínio do Clérigo (sempre preparadas) está modelado.

- [ ] **Step 2: Teste que falha** — `src/test/dnd5e/artificer-subclass-spells.test.js`: verifica que, dado um Artífice com subclasse (ex.: ferreiro-de-batalha) no nível adequado, a função de magias de subclasse retorna as magias sempre-preparadas esperadas com `alwaysPrepared:true`. (Usar a API pública de `subclassSpells.js`; espelhar um teste existente de magias de subclasse de Clérigo/Druida.)

- [ ] **Step 3: Implementar** — adicionar as entradas das 4 subclasses do Artífice ao mapa de `subclassSpells.js`, com os pares nível→magias extraídos do PDF (revisar nomes de magia contra `phb-spells-pt.json`/`tasha-spells-pt.json`; magias do Tasha que ainda não existem no app ficam fora do escopo da Fase A — listar quais e notar como pendência).

- [ ] **Step 4: Rodar, ver passar** + regressão `npm test -- src/test/ -t "subclass"`.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/domain/subclassSpells.js src/test/dnd5e/artificer-subclass-spells.test.js
git commit -m "feat(dnd5e): magias sempre-preparadas das subclasses do Artífice"
git push
```

---

## Task A7: Testes de schema dos JSON do Artífice

**Files:**
- Test: `src/test/dnd5e/tasha-artificer-schema.test.js`

- [ ] **Step 1: Escrever o teste** (ler os 3 arquivos via `readFileSync(resolve(process.cwd(), 'public/srd-data/<file>'))` — mesmo padrão de `tasha-feats-schema.test.js`):
```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const read = (f) => JSON.parse(readFileSync(resolve(process.cwd(), 'public/srd-data/', f), 'utf-8'))

describe('tasha — classe Artífice', () => {
  const classes = read('tasha-classes-pt.json')
  const prog = read('tasha-class-progression-full-pt.json')
  const choices = read('tasha-class-choices-pt.json')

  it('classe artifice presente, d8, saves CON+INT, source tasha', () => {
    const a = classes.find(c => c.index === 'artifice')
    expect(a).toBeTruthy()
    expect(a.hit_die).toBe(8)
    expect(a.source).toBe('tasha')
    expect(a.saving_throws).toEqual(expect.arrayContaining(['Constituição', 'Inteligência']))
    expect(a.skill_choices.count).toBe(2)
  })
  it('progressão tem 20 níveis com features', () => {
    expect(prog.artifice.levels).toHaveLength(20)
    expect(prog.artifice.levels[0].features.length).toBeGreaterThan(0)
    expect(prog.artifice).not.toHaveProperty('spell_slots_table') // engine calcula
  })
  it('escolha de subclasse no nível 3 com 4 opções', () => {
    const ch = choices.artifice.choices.find(c => c.level === 3)
    expect(ch).toBeTruthy()
    expect(ch.options.map(o => o.value).sort()).toEqual(
      ['alquimista', 'armoreiro', 'artilheiro', 'ferreiro-de-batalha'])
    for (const o of ch.options) expect(o.desc.length).toBeGreaterThan(20)
  })
  it('descrições sem ruído de paginação', () => {
    const all = JSON.stringify({ classes, prog, choices })
    expect(all).not.toMatch(/-----\s*p\.\d+/)
    expect(all).not.toMatch(/Opções de Personagens/)
  })
})
```

- [ ] **Step 2: Rodar** — corrigir os JSON (ou os scripts) até passar.

- [ ] **Step 3: Commit**
```bash
git add src/test/dnd5e/tasha-artificer-schema.test.js
git commit -m "test(tasha): valida schema da classe/subclasses do Artífice"
git push
```

---

## Task A8: Gating da lista de classes pela fonte (Wizard)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` (onde `classes` alimenta o ClassBlock)
- Test: `src/test/dnd5e/artificer-class-gating.test.jsx`

Como nos talentos: a lista de classes OFERECIDA na criação filtra pela fonte (`filterCatalogBySources(classes, draft.settings?.sources)`). Lookups do que a ficha já tem usam a lista NÃO filtrada (a classe escolhida sempre resolve).

- [ ] **Step 1: Teste de contrato** — `src/test/dnd5e/artificer-class-gating.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest'
import { filterCatalogBySources } from '../../systems/dnd5e/domain/sources'
describe('gating da lista de classes', () => {
  const classes = [{ index: 'druida', source: 'phb' }, { index: 'artifice', source: 'tasha' }]
  it('só phb não oferece Artífice', () => {
    expect(filterCatalogBySources(classes, ['phb']).map(c => c.index)).toEqual(['druida'])
  })
  it('com tasha oferece Artífice', () => {
    expect(filterCatalogBySources(classes, ['phb', 'tasha']).map(c => c.index))
      .toEqual(['druida', 'artifice'])
  })
})
```

- [ ] **Step 2: Rodar** — deve PASSAR (fixa o contrato).

- [ ] **Step 3: Implementar** — em `CharacterWizardV2.jsx`, onde `classes` (de `useSrd()`/`useLazySrdDataset`) é passado ao ClassBlock como lista de OFERTA, derivar `const offeredClasses = useMemo(() => filterCatalogBySources(classes ?? [], draft?.settings?.sources ?? ['phb']), [classes, draft?.settings?.sources])` e passar `offeredClasses` ao seletor de classe. Atenção: NÃO filtrar a lista usada pra resolver a classe já escolhida (multiclasse/lookup) — só a oferta no picker de classe primária e no picker de adicionar multiclasse. Inspecionar `ClassBlock.jsx` pra distinguir oferta de lookup (o `classes.find(c => c.index === draft.class)` é lookup → usa lista completa).

- [ ] **Step 4: Regressão** — `npm test -- src/test/ -t "Wizard"` e `-t "ClassBlock"`. Sem Tasha, lista de classes idêntica à atual.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx src/test/dnd5e/artificer-class-gating.test.jsx
git commit -m "feat(dnd5e): lista de classes da criação filtra Artífice pela fonte"
git push
```

---

## Task A9: Integração ponta-a-ponta + descoberta de premissas de classe

**Files:**
- Modify: conforme a descoberta (provavelmente nenhum ou poucos; `build-character.js`, sheet)
- Test: `src/test/dnd5e/artificer-integration.test.jsx` (ou estender testes de wizard)

> Verificar que um Artífice criado com Tasha ativo FUNCIONA de ponta a ponta. A máquina é data-driven, mas pode haver premissas a ajustar (ex.: aplicação de proficiências da classe, HP por DV, salvaguardas, escolha de subclasse no nv3, preparação de magia/cantrips).

- [ ] **Step 1: Teste de integração** — montar um draft de Artífice (com `settings.sources=['phb','tasha']`), rodar `build-character.js` e asserir no personagem resultante: `info.class==='artifice'`, DV/HP base d8 corretos, salvaguardas CON+INT, proficiências de classe aplicadas, `spellcasting` configurado pra INT preparado. Espelhar um teste existente de `build-character` (ex.: o de Clérigo/Druida) trocando a classe. Rodar e ver o que falha.

- [ ] **Step 2: Corrigir as premissas que aparecerem.** Se algo no `build-character.js`/sheet assumir classes PHB (improvável — confirmado que não há listas hardcoded, mas validar HP/proficiência/subclasse), ajustar de forma data-driven. Se aparecer algo grande/ambíguo, PARAR e reportar (não improvisar ref+ grande).

- [ ] **Step 3: Verificação manual** (`npm run dev`): criar ficha, ligar Tasha em "Fontes", escolher Artífice; confirmar DV d8, perícias da lista do Artífice, conjuração INT, slots corretos por nível, escolha de subclasse ao chegar no nv3, features por nível aparecendo na aba. Selo "TCE" na classe.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "feat(dnd5e): Artífice flui pela criação/ficha (integração ponta-a-ponta)"
git push
```

---

## Task A10: Bump do cache do service worker

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Bump** `cacheName: 'srd-data-v8'` → `'srd-data-v9'` e adicionar linha de comentário no histórico (`v8 → v9 (2026-XX): classe Artífice — tasha-classes/progression/class-choices`).

- [ ] **Step 2: Build** — `npm run build` (exit 0; precache lista os novos `tasha-*`).

- [ ] **Step 3: Commit**
```bash
git add vite.config.js
git commit -m "chore(pwa): bump srd-data cache v8->v9 (classe Artífice)"
git push
```

---

## Verificação final da Fase A

- [ ] `npm test` — suíte inteira verde.
- [ ] `npm run build` — limpo, novos arquivos no precache, cache `v9`.
- [ ] `npm run dev` — Artífice jogável: criar com Tasha on, DV d8, conjuração INT (slots L1=2; subir e conferir), subclasse no nv3, features por nível na ficha, selo TCE. Sem Tasha, Artífice não aparece. Ficha legada intacta.
- [ ] Paladino/Patrulheiro/multiclasse de conjuração inalterados (regressão da Task A2).

## Fora desta fase (próximos planos)

1. **Fase B — Infusões (Infundir Item):** sistema net-new (catálogo `tasha-infusions-pt.json`, schema `infusionsKnown`/`activeInfusions`, regras de caps por nível, UI de aprender/acoplar). Ver spike.
2. **Fase C — Features numéricas:** teto de sintonia (Perito/Versado/Maestria em Itens Mágicos), Lampejo de Genialidade como recurso, Item de Armazenar Magia.
3. **Magias do Tasha** referenciadas por subclasses que ainda não existam no catálogo (listadas na Task A6) — entram com o plano de "conteúdo em volume".
