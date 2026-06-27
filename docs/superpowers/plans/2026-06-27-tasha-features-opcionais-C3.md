# Tasha — Features Opcionais de Classe (C3: casos com motor) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as features opcionais de classe de Tasha que sobraram do fan-out: a Consciência Primordial do Patrulheiro (substituição que CONCEDE 5 magias — injeção real no motor de magias quando ligada na ficha) + 3 features card-only que dependiam de modelagem ou escaparam (Véu Natural, Versatilidade Marcial, Golpes Abençoados).

**Architecture:** A Consciência Primordial é uma substituição opcional (modelo C1, `featureName: "Consciência Primeva"`) cujo TOGGLE também dispara injeção de magias. O motor espelha o padrão já existente do familiar do Pacto da Corrente (`PACT_FAMILIAR_SPELL` em `rules.js` + `syncGrantedSpells`): definimos as 5 magias como constantes e estendemos `syncGrantedSpells` para reconciliar (adiciona idempotente quando o toggle está ligado e o nível chegou; remove por tag quando desliga). Rotear o toggle pelo sync = fazer `setChosenFeature` (useCharacter) passar por `syncGrantedSpells`. As outras 3 features são dado puro sobre a infra do C1/C2.

**Tech Stack:** React + Vite, Vitest (`npx vitest run <arquivo>`), dados em `public/srd-data/*.json`, service worker Workbox (cache `srd-data-vN` em `vite.config.js`, hoje **v15**).

---

## Contexto (leia antes de começar)

- `syncGrantedSpells(character)` em `src/systems/dnd5e/domain/rules.js` (l.77) HOJE só trata o familiar do Pacto da Corrente, usando a constante `PACT_FAMILIAR_SPELL` (l.30, objeto de magia mínimo: index/name/level/school/ritual/concentration/desc). É chamado por `applyLevelUp` (rules.js l.642) e por `handleChosenFeaturesChange` (useSheetHandlers).
- O toggle "Variantes de Tasha" da ficha chama `onSetChosenFeature` = `setChosenFeature` de `src/hooks/useCharacter.js` (l.298), que HOJE só grava `chosenFeatures[id]=value`, SEM sync. É o ponto a rotear.
- O motor de magias de subclasse (`subclassSpells.js`) injeta no BUILD e no LEVEL-UP (não em toggle da ficha). Marca magias concedidas com `alwaysPrepared: true, prepared: true` (Grupo A) — a contagem de preparadas as exclui. Patrulheiro já recebe magias de arquétipo assim. NÃO mexa em subclassSpells.js — Consciência Primordial é fonte SEPARADA (mesmos níveis 3/5/9/13/17 do arquétipo, coexistem).
- Modelo de feature opcional (C1): SUBSTITUIÇÃO = choice `optional: true` com `featureName` = nome EXATO da feature-base na progressão; `resolveChosenFeature` (FeaturesTab) troca name/desc. ADIÇÃO = `optional: true` + `addsFeature: true`, sem featureName, vira card via `getChosenAdditions`.
- Nomes-base EXATOS na progressão do Patrulheiro (`phb-class-progression-pt.json`): nv3 = `"Consciência Primeva"`; nv10 = `"Ocultar-se às Claras"` (é o "Hide in Plain Sight" — o TCE chama de "Sumir de Vista", mas o swap precisa casar a PROGRESSÃO). Use esses nomes nos `featureName`.
- Slugs das 5 magias (todas já no catálogo PHB): `falar-com-animais` (nv1), `sentido-bestial` (Beast Sense, nv2), `falar-com-plantas` (nv3), `localizar-criatura` (nv4), `comunhao-com-a-natureza` (nv5).
- Cleric nv8 na progressão é um placeholder genérico "Característica do Domínio" (Golpe Divino/Conjuração Poderosa vêm do domínio, sem âncora) → Golpes Abençoados NÃO é swappable; vira ADIÇÃO com nota.
- `category: "outras"` NUNCA vai no JSON (é fallback computado). `combat` e `category` são mutuamente exclusivos. O guard `src/test/srd-combat-tags.test.js` varre os arquivos Tasha.
- Convenção: options de Tasha NÃO gravam `source` no cru (carimbo runtime via merge).

---

## Task 1: Motor — magias da Consciência Primordial em `syncGrantedSpells`

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js` (perto de `PACT_FAMILIAR_SPELL` l.30 e `syncGrantedSpells` l.77)
- Test: `src/test/dnd5e/primal-awareness-spells.test.js` (new)

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/primal-awareness-spells.test.js
import { describe, it, expect } from 'vitest'
import { syncGrantedSpells } from '../../systems/dnd5e/domain/rules'

function ranger(level, chosen = {}, spells = []) {
  return {
    info: { class: 'patrulheiro', level, chosenFeatures: chosen },
    spellcasting: { spells },
  }
}
const indices = c => (c.spellcasting?.spells ?? []).map(s => s.index)

describe('syncGrantedSpells — Consciência Primordial (Patrulheiro)', () => {
  it('toggle ligado no nv3 injeta só Falar com Animais', () => {
    const out = syncGrantedSpells(ranger(3, { ranger_primal_awareness: 'consciencia_primordial' }))
    expect(indices(out)).toEqual(['falar-com-animais'])
    const sp = out.spellcasting.spells[0]
    expect(sp.alwaysPrepared).toBe(true)
    expect(sp.sourceLabel).toBe('Consciência Primordial')
  })

  it('no nv13 injeta as magias até o nível (3 falar-animais,5 sentido,9 plantas,13 localizar)', () => {
    const out = syncGrantedSpells(ranger(13, { ranger_primal_awareness: 'consciencia_primordial' }))
    expect(indices(out).sort()).toEqual(
      ['falar-com-animais', 'sentido-bestial', 'falar-com-plantas', 'localizar-criatura'].sort()
    )
  })

  it('é idempotente (rodar 2x não duplica)', () => {
    const once = syncGrantedSpells(ranger(5, { ranger_primal_awareness: 'consciencia_primordial' }))
    const twice = syncGrantedSpells(once)
    expect(indices(twice).sort()).toEqual(['falar-com-animais', 'sentido-bestial'].sort())
  })

  it('desligar o toggle REMOVE as magias concedidas (por tag)', () => {
    const on = syncGrantedSpells(ranger(5, { ranger_primal_awareness: 'consciencia_primordial' }))
    const off = syncGrantedSpells({ ...on, info: { ...on.info, chosenFeatures: {} } })
    expect(indices(off)).toEqual([])
  })

  it('não remove uma magia homônima adicionada manualmente (sem tag)', () => {
    const manual = ranger(5, {}, [{ index: 'falar-com-animais', name: 'Falar com Animais', level: 1 }])
    const out = syncGrantedSpells(manual)
    expect(indices(out)).toEqual(['falar-com-animais']) // intacta
  })

  it('classe não-patrulheiro nunca recebe as magias', () => {
    const mago = { info: { class: 'mago', level: 13, chosenFeatures: { ranger_primal_awareness: 'consciencia_primordial' } }, spellcasting: { spells: [] } }
    expect(indices(syncGrantedSpells(mago))).toEqual([])
  })

  it('preserva o familiar do Pacto da Corrente (não regride)', () => {
    const bruxo = { info: { class: 'bruxo', chosenFeatures: { pact_boon: 'corrente' } }, spellcasting: { spells: [] } }
    expect(indices(syncGrantedSpells(bruxo))).toContain('find-familiar')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/primal-awareness-spells.test.js`
Expected: FAIL (magias não injetadas / removidas).

- [ ] **Step 3: Implementar no `rules.js`**

Logo após `PACT_FAMILIAR_SPELL` (l.38), adicione as constantes:

```js
/* ── Consciência Primordial (Patrulheiro, Tasha) — magias concedidas ──
 * Feature opcional que SUBSTITUI Consciência Primeva e concede magias em
 * 3/5/9/13/17, cada uma conjurável 1×/descanso longo sem gastar espaço
 * (a regra do "1× grátis" fica na desc do card; aqui elas entram como
 * sempre-preparadas, espelhando o padrão das magias de arquétipo).
 * Objetos mínimos como PACT_FAMILIAR_SPELL; tag sourceLabel permite
 * adicionar/remover ao ligar/desligar o toggle. */
const PRIMAL_AWARENESS_LABEL = 'Consciência Primordial'
const PRIMAL_AWARENESS_GRANTS = [
  { level: 3,  spell: { index: 'falar-com-animais',      name: 'Falar com Animais',       level: 1, school: 'Adivinhação', ritual: true,  concentration: false, desc: 'Você compreende e se comunica verbalmente com bestas pela duração.' } },
  { level: 5,  spell: { index: 'sentido-bestial',        name: 'Sentido Bestial',         level: 2, school: 'Adivinhação', ritual: true,  concentration: true,  desc: 'Por meio de uma besta tocada, você percebe o que ela percebe enquanto durar.' } },
  { level: 9,  spell: { index: 'falar-com-plantas',      name: 'Falar com Plantas',       level: 3, school: 'Transmutação', ritual: false, concentration: false, desc: 'Você imbui plantas a até 9m com percepção e capacidade de conversar com você.' } },
  { level: 13, spell: { index: 'localizar-criatura',     name: 'Localizar Criatura',      level: 4, school: 'Adivinhação', ritual: false, concentration: true,  desc: 'Você sente a direção de uma criatura conhecida, se estiver a até 300m.' } },
  { level: 17, spell: { index: 'comunhao-com-a-natureza', name: 'Comunhão com a Natureza', level: 5, school: 'Adivinhação', ritual: true,  concentration: false, desc: 'Você se sintoniza à natureza e ganha conhecimento do território ao redor.' } },
].map(g => ({ ...g, spell: { ...g.spell, alwaysPrepared: true, prepared: true, source: 'optional-feature', sourceLabel: PRIMAL_AWARENESS_LABEL } }))
```

Depois reescreva `syncGrantedSpells` (l.77) para reconciliar AMBAS as fontes:

```js
export function syncGrantedSpells(character) {
  let current = character.spellcasting?.spells ?? []
  let changed = false

  // 1. Familiar do Pacto da Corrente (Bruxo) — comportamento original.
  const pact = character.info?.chosenFeatures?.pact_boon
  if (pact === 'corrente' && !current.some(s => s.index === 'find-familiar')) {
    current = [...current, { ...PACT_FAMILIAR_SPELL }]
    changed = true
  }

  // 2. Consciência Primordial (Patrulheiro) — injeta/remove por toggle+nível.
  const isRanger   = character.info?.class === 'patrulheiro'
  const primalOn   = character.info?.chosenFeatures?.ranger_primal_awareness === 'consciencia_primordial'
  const rangerLvl  = character.info?.level ?? 1
  const desired = (isRanger && primalOn)
    ? new Set(PRIMAL_AWARENESS_GRANTS.filter(g => g.level <= rangerLvl).map(g => g.spell.index))
    : new Set()

  // Remove SÓ as que nós concedemos (tag) e não são mais desejadas.
  const afterRemoval = current.filter(s =>
    !(s.sourceLabel === PRIMAL_AWARENESS_LABEL && !desired.has(s.index))
  )
  if (afterRemoval.length !== current.length) { current = afterRemoval; changed = true }

  // Adiciona as desejadas ausentes (idempotente por index).
  const present = new Set(current.map(s => s.index))
  for (const g of PRIMAL_AWARENESS_GRANTS) {
    if (desired.has(g.spell.index) && !present.has(g.spell.index)) {
      current = [...current, { ...g.spell }]
      changed = true
    }
  }

  if (!changed) return character
  return { ...character, spellcasting: { ...character.spellcasting, spells: current } }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/primal-awareness-spells.test.js`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/primal-awareness-spells.test.js
git commit -m "feat(tasha): Consciência Primordial concede magias via syncGrantedSpells (add/remove por toggle)"
```

---

## Task 2: Rotear o toggle da ficha pelo sync

Sem isso, ligar a Consciência Primordial na ficha grava o `chosenFeatures` mas não injeta as magias (o setter não sincroniza).

**Files:**
- Modify: `src/hooks/useCharacter.js` (`setChosenFeature`, l.298; e o import de `syncGrantedSpells`)
- Test: `src/test/dnd5e/set-chosen-feature-sync.test.js` (new)

- [ ] **Step 1: Escrever o teste que falha**

Este teste exercita a MESMA transformação que `setChosenFeature` aplica (set + sync), de forma pura, sem renderizar o hook:

```js
// src/test/dnd5e/set-chosen-feature-sync.test.js
import { describe, it, expect } from 'vitest'
import { syncGrantedSpells } from '../../systems/dnd5e/domain/rules'

// Espelha a transformação que setChosenFeature deve aplicar.
function setAndSync(prev, choiceId, value) {
  return syncGrantedSpells({
    ...prev,
    info: { ...prev.info, chosenFeatures: { ...(prev.info?.chosenFeatures ?? {}), [choiceId]: value } },
  })
}

describe('setChosenFeature deve sincronizar magias concedidas', () => {
  const ranger = { info: { class: 'patrulheiro', level: 7, chosenFeatures: {} }, spellcasting: { spells: [] } }

  it('ligar Consciência Primordial injeta as magias até o nível', () => {
    const out = setAndSync(ranger, 'ranger_primal_awareness', 'consciencia_primordial')
    expect((out.spellcasting.spells ?? []).map(s => s.index).sort())
      .toEqual(['falar-com-animais', 'sentido-bestial'].sort())
  })
  it('desligar remove', () => {
    const on = setAndSync(ranger, 'ranger_primal_awareness', 'consciencia_primordial')
    const off = setAndSync(on, 'ranger_primal_awareness', '')
    expect(off.spellcasting.spells ?? []).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver passar (o helper já usa o syncGrantedSpells da Task 1)**

Run: `npx vitest run src/test/dnd5e/set-chosen-feature-sync.test.js`
Expected: PASS. (Este teste protege o CONTRATO; o passo abaixo aplica esse contrato no hook real.)

- [ ] **Step 3: Aplicar no `setChosenFeature` real**

Em `src/hooks/useCharacter.js`, garanta que `syncGrantedSpells` está importado (de `../systems/dnd5e/domain/rules` — confira o caminho relativo correto a partir de `src/hooks/`). Depois troque o corpo de `setChosenFeature` (l.298) por:

```js
  const setChosenFeature = useCallback((choiceId, value) => {
    setCharacter(prev => syncGrantedSpells({
      ...prev,
      info: {
        ...prev.info,
        chosenFeatures: {
          ...(prev.info?.chosenFeatures ?? {}),
          [choiceId]: value,
        },
      },
    }))
  }, [setCharacter])
```

(Se `syncGrantedSpells` já estiver importado no arquivo, não duplique o import.)

- [ ] **Step 4: Rodar a suíte tocada + build**

Run: `npx vitest run src/test/dnd5e/set-chosen-feature-sync.test.js src/test/dnd5e/primal-awareness-spells.test.js`
Expected: PASS.

Run: `npm run build`
Expected: build OK (confere o import resolvido).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCharacter.js src/test/dnd5e/set-chosen-feature-sync.test.js
git commit -m "feat(tasha): setChosenFeature roteia por syncGrantedSpells (toggle injeta/remove magias)"
```

---

## Task 3: Dados — 4 features (Patrulheiro + Clérigo) + bump de cache

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (append a `patrulheiro.choices` e `clerigo.choices`)
- Modify: `vite.config.js` (cache `srd-data-v15` → `srd-data-v16`)
- Test: `src/test/dnd5e/tasha-optional-features-c3.test.js` (new)

- [ ] **Step 1: Escrever o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isOptionalChoice, isAdditionChoice } from '../../systems/dnd5e/domain/optionalFeatures'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const prog = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-progression-pt.json'), 'utf-8'))
const choice = (cls, id) => tasha[cls]?.choices.find(c => c.id === id)
const baseNames = cls => (prog[cls]?.levels ?? []).flatMap(l => (l.features ?? []).map(f => f.name))

describe('C3 — substituições do Patrulheiro (com âncora na progressão)', () => {
  it('ranger_primal_awareness substitui Consciência Primeva (nv3, valor consciencia_primordial)', () => {
    const c = choice('patrulheiro', 'ranger_primal_awareness')
    expect(c).toBeTruthy()
    expect(isOptionalChoice(c)).toBe(true)
    expect(isAdditionChoice(c)).toBe(false)
    expect(c.featureName).toBe('Consciência Primeva')
    expect(baseNames('patrulheiro')).toContain('Consciência Primeva')
    expect(c.level).toBe(3)
    expect(c.options.map(o => o.value)).toEqual(['consciencia_primordial'])
  })
  it('ranger_natures_veil substitui Ocultar-se às Claras (nv10)', () => {
    const c = choice('patrulheiro', 'ranger_natures_veil')
    expect(c.featureName).toBe('Ocultar-se às Claras')
    expect(baseNames('patrulheiro')).toContain('Ocultar-se às Claras')
    expect(isAdditionChoice(c)).toBe(false)
    expect(c.level).toBe(10)
    expect(c.options.map(o => o.value)).toEqual(['veu_natural'])
  })
})

describe('C3 — adições', () => {
  it('patrulheiro_martial_versatility (adição nv4)', () => {
    const c = choice('patrulheiro', 'patrulheiro_martial_versatility')
    expect(isAdditionChoice(c)).toBe(true)
    expect(c.level).toBe(4)
  })
  it('clerigo_blessed_strikes (adição nv8, desc cita substituição de Golpe Divino/Conjuração Poderosa)', () => {
    const c = choice('clerigo', 'clerigo_blessed_strikes')
    expect(isAdditionChoice(c)).toBe(true)
    expect(c.level).toBe(8)
    expect(c.options[0].desc.toLowerCase()).toContain('substitui')
    expect(c.options[0].combat).toBe('situacional')
  })
})

describe('C3 — options não gravam source no cru', () => {
  it('sem source', () => {
    for (const [cls, id] of [['patrulheiro','ranger_primal_awareness'],['patrulheiro','ranger_natures_veil'],['patrulheiro','patrulheiro_martial_versatility'],['clerigo','clerigo_blessed_strikes']]) {
      for (const o of choice(cls, id).options) expect(o.source).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features-c3.test.js`
Expected: FAIL.

- [ ] **Step 3: Append no JSON**

Em `patrulheiro.choices`:
```json
{
  "id": "ranger_primal_awareness",
  "featureName": "Consciência Primeva",
  "optional": true,
  "level": 3,
  "options": [
    {
      "value": "consciencia_primordial",
      "name": "Consciência Primordial",
      "desc": "Substitui Consciência Primeva. Você foca sua consciência pelas conexões da natureza e aprende magias adicionais conforme sobe de nível, que não contam contra suas magias de patrulheiro conhecidas: Falar com Animais (nv 3), Sentido Bestial (nv 5), Falar com Plantas (nv 9), Localizar Criatura (nv 13) e Comunhão com a Natureza (nv 17). Você pode conjurar cada uma delas uma vez sem gastar espaço de magia; depois disso, só pode fazê-lo de novo após um descanso longo. (Ao ligar esta variante, as magias já aparecem na sua lista como sempre preparadas.)"
    }
  ]
},
{
  "id": "ranger_natures_veil",
  "featureName": "Ocultar-se às Claras",
  "optional": true,
  "level": 10,
  "options": [
    {
      "value": "veu_natural",
      "name": "Véu Natural",
      "combat": "situacional",
      "actionType": "ação bônus",
      "desc": "Substitui Ocultar-se às Claras. Você invoca os poderes da natureza para se esconder brevemente. Como uma ação bônus, você fica magicamente invisível — junto de todo equipamento que estiver usando ou carregando — até o início do seu próximo turno. Você pode usar isso um número de vezes igual ao seu bônus de proficiência, recuperando todos os usos em um descanso longo."
    }
  ]
},
{
  "id": "patrulheiro_martial_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    {
      "value": "versatilidade_marcial",
      "name": "Versatilidade Marcial",
      "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode substituir um estilo de combate que conhece por outro da lista disponível para patrulheiros."
    }
  ]
}
```

Em `clerigo.choices`:
```json
{
  "id": "clerigo_blessed_strikes",
  "addsFeature": true,
  "optional": true,
  "level": 8,
  "options": [
    {
      "value": "golpes_abencoados",
      "name": "Golpes Abençoados",
      "combat": "situacional",
      "desc": "Substitui Golpe Divino ou Conjuração Poderosa (a característica de 8º nível do seu domínio). Quando uma criatura sofre dano de um dos seus truques ou ataques com arma, você pode causar 1d8 de dano radiante adicional a ela. Depois de causar esse dano, você não pode usar esta característica de novo até o início do seu próximo turno."
    }
  ]
}
```

Valide o JSON: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-class-choices-pt.json','utf-8')); console.log('ok')"`

- [ ] **Step 4: Bump do cache**

Em `vite.config.js`, troque `cacheName: 'srd-data-v15'` por `cacheName: 'srd-data-v16'` (comentário datado no estilo das entradas anteriores).

- [ ] **Step 5: Rodar e ver passar (inclui o guard de tags)**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features-c3.test.js src/test/srd-combat-tags.test.js`
Expected: PASS (ambos).

- [ ] **Step 6: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json vite.config.js src/test/dnd5e/tasha-optional-features-c3.test.js
git commit -m "feat(tasha): C3 dados — Consciência Primordial/Véu Natural/Versatilidade Marcial (Patrulheiro) + Golpes Abençoados (Clérigo)"
```

---

## Task 4: Verificação ponta-a-ponta + memória

- [ ] **Step 1: Suíte cheia + build**

Run: `npx vitest run`
Expected: tudo verde (baseline 1403 + os novos casos).

Run: `npm run build`
Expected: build PWA OK.

- [ ] **Step 2: Sanidade no preview**

Suba o preview, abra/crie um Patrulheiro nv 13 com Tasha ativo → aba Habilidades → "Variantes de Tasha":
- Ligar **Consciência Primordial** → o card de "Consciência Primeva" vira "...: Consciência Primordial", E na aba Magias aparecem Falar com Animais, Sentido Bestial, Falar com Plantas, Localizar Criatura (sempre preparadas, fonte "Consciência Primordial"). Desligar → somem.
- Ligar **Véu Natural** (nv10+) troca "Ocultar-se às Claras".
- **Versatilidade Marcial** e (num Clérigo nv8+) **Golpes Abençoados** aparecem como cards ao ligar.

- [ ] **Step 3: Memória**

Atualize `C:\Users\gvfar\.claude\projects\C--Users-gvfar-git-dnd-ficha-app\memory\project_tasha_fontes.md`: registre C3 (Consciência Primordial com injeção real de magias via syncGrantedSpells + setChosenFeature roteado; Véu Natural/Versatilidade Marcial/Golpes Abençoados card-only; cache v15→v16; suíte verde) e que isso FECHA as features opcionais de classe de Tasha. Restam: balde D (itens mágicos), listas de magias expandidas, magias faltantes do catálogo base.

- [ ] **Step 4: Commit (se a memória ficar versionada) / encerrar**

(A memória mora fora do repo; nenhum commit necessário além dos anteriores.)

---

## Self-review (cobertura)

- **Consciência Primordial** (substituição + concede magias) → Task 1 (motor: PRIMAL_AWARENESS_GRANTS + syncGrantedSpells reconcilia add/remove por tag) + Task 2 (toggle roteado pelo sync) + Task 3 (dado: choice com featureName "Consciência Primeva"). Injeção REAL conforme escolhido pelo dono.
- **Véu Natural** (substitui Ocultar-se às Claras) → Task 3, substituição card-only (featureName = nome da PROGRESSÃO, não "Sumir de Vista" do TCE).
- **Versatilidade Marcial** (Patrulheiro nv4) → Task 3, adição que escapou do C2.
- **Golpes Abençoados** (Clérigo nv8) → Task 3, adição com nota (não swappable: feature de domínio sem âncora).
- **Cache SW** → Task 3 (v15→v16).
- **Guard de tags** roda nos arquivos Tasha (Task 3 step 5).
- **Escopo declarado FORA:** tracking do "1× grátis/descanso longo" da Consciência Primordial (as magias entram como sempre-preparadas; a regra fica na desc — não construímos tracker dedicado); multiclasse (grant usa info.level como nível de patrulheiro, só classe primária). Edição manual de nível na ficha que não passe por level-up pode não sincronizar tiers novos até a próxima mudança de chosenFeatures (aceitável). Balde D (itens) e listas de magias expandidas seguem fora.
