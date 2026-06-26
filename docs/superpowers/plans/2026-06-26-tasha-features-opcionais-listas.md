# Tasha — Opções Opcionais em Listas Existentes (Sub-projeto A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar as opções opcionais do Caldeirão de Tasha (invocações místicas, metamagia, estilos de combate e manobras) às listas de escolha que já existem no app, como dado puro gateado por fonte.

**Architecture:** Estende `public/srd-data/tasha-class-choices-pt.json` com novos objetos `choice` cujos `id` casam com os do PHB. `mergeClassChoices` (já existente) concatena `options` de choices de mesmo `id` entre fontes e carimba a fonte extra (`tasha`) em runtime via `tagSource` — nenhuma opção grava `source` no arquivo cru. O gating por fonte (`filterChoiceBySources`) some com elas quando Tasha está desligada e sempre preserva o já-escolhido. Zero trabalho de motor: todas essas listas são puramente descritivas (`value/name/desc/combat`).

**Tech Stack:** JSON de dados (srd-data), Vitest, Vite (PWA Workbox cache bump).

---

## Contexto que o executor precisa saber

- **Estrutura do arquivo:** `tasha-class-choices-pt.json` é `{ "<classe>": { "choices": [ { level, id, featureName?, prompt?, options: [...] } ] } }`. As classes `bruxo`, `feiticeiro`, `guerreiro`, `paladino`, `patrulheiro` **já existem** no arquivo (com choices de subclasse). Você vai **adicionar um novo objeto choice ao array `choices`** de cada uma — NÃO criar a classe do zero, NÃO mexer nos choices de subclasse já presentes.
- **Merge por `id`:** `src/systems/dnd5e/domain/mergeClassChoices.js` acha o choice do PHB com o mesmo `id` e faz `existing.options = [...existing.options, ...ech.options]`. Então o novo choice no arquivo Tasha precisa ter EXATAMENTE o mesmo `id` do choice do PHB para concatenar (senão vira um choice solto novo).
- **`id`s do PHB (confirmados em `public/srd-data/phb-class-choices-pt.json`):**
  - bruxo: `eldritch_invocations`
  - feiticeiro: `metamagic`, `metamagic_10`, `metamagic_17` (três choices separados, mesma poça de opções)
  - guerreiro: `fighting_style`, `martial_archetype_maneuvers`
  - paladino: `fighting_style_paladin` (NÃO é `fighting_style`)
  - patrulheiro: `fighting_style_ranger`
- **Convenção de `value`** (casar com a lista existente): invocações = snake_case; metamagia = palavra única minúscula; fighting styles = snake_case; manobras = kebab-case.
- **`source` NUNCA no JSON cru** — carimbo é runtime. Os testes verificam `opt.source` indefinido.
- **`combat`** é um tag (`essencial`/`situacional`) usado pela aba Combate. Atribuído por melhor esforço aqui; o dono revisa os cinzentos depois (ver memória `feedback-combat-abilities-discoverability`).
- **Texto:** orthografia PT-BR completa com acentos. Descrições fiéis à tradução, condensadas no estilo das entradas existentes.

---

### Task 1: Invocações Místicas de Tasha (Bruxo)

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (classe `bruxo`, append choice `eldritch_invocations`)
- Test: `src/test/dnd5e/tasha-optional-features.test.js` (criar)

- [ ] **Step 1: Escrever o teste falhando**

Criar `src/test/dnd5e/tasha-optional-features.test.js`:

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const tasha = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)
const phb = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'),
)

function tashaOptions(cls, choiceId) {
  const choice = tasha[cls]?.choices.find(c => c.id === choiceId)
  return choice?.options ?? []
}

describe('Tasha opções opcionais — invocações místicas (bruxo)', () => {
  const ESPERADAS = [
    'ligado_ao_talisma', 'mente_mistica', 'escrita_longinqua',
    'dadiva_dos_protetores', 'implemento_mestre_corrente',
    'protecao_do_talisma', 'repreensao_do_talisma', 'servidao_eterna',
  ]

  it('o arquivo Tasha tem o choice eldritch_invocations com as 8 invocações', () => {
    const opts = tashaOptions('bruxo', 'eldritch_invocations')
    const valores = opts.map(o => o.value)
    for (const v of ESPERADAS) expect(valores, `${v} ausente`).toContain(v)
    for (const o of opts) expect(o.desc.length, o.value).toBeGreaterThan(40)
  })

  it('nenhuma invocação grava source no arquivo cru', () => {
    for (const o of tashaOptions('bruxo', 'eldritch_invocations')) {
      expect(o.source, o.value).toBeUndefined()
    }
  })

  it('merge concatena as invocações de Tasha (carimbadas) com as do PHB', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const choice = merged.bruxo.choices.find(c => c.id === 'eldritch_invocations')
    const tashaOnes = choice.options.filter(o => o.source === 'tasha')
    expect(tashaOnes.map(o => o.value).sort()).toEqual([...ESPERADAS].sort())
    // PHB segue presente e sem source
    expect(choice.options.some(o => o.value === 'forca_agonizante' && !o.source)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: FAIL (choice `eldritch_invocations` ainda não existe no arquivo Tasha → `tashaOptions` vazio).

- [ ] **Step 3: Adicionar o choice ao `bruxo` em `tasha-class-choices-pt.json`**

No objeto `"bruxo": { "choices": [ ... ] }`, **adicionar ao final do array `choices`** (depois do choice de subclasse `patron` e da subescolha de gênio) este objeto:

```json
{
  "level": 2,
  "id": "eldritch_invocations",
  "featureName": "Invocações Místicas",
  "options": [
    { "value": "ligado_ao_talisma", "name": "Ligado ao Talismã", "combat": "situacional", "desc": "Pré-requisito: 12º nível de bruxo, característica de Pacto do Talismã.\n\nEnquanto outra criatura estiver vestindo seu talismã, você pode usar sua ação para se teletransportar a um espaço desocupado próximo a ela (ambos no mesmo plano); o portador pode fazer o mesmo, usando a ação dele para vir até você. Usos = seu bônus de proficiência, recuperados num descanso longo." },
    { "value": "mente_mistica", "name": "Mente Mística", "combat": "essencial", "desc": "Você tem vantagem nas salvaguardas de Constituição feitas para manter a concentração em uma magia." },
    { "value": "escrita_longinqua", "name": "Escrita Longínqua", "combat": "situacional", "desc": "Pré-requisito: 5º nível de bruxo, característica de Pacto do Tomo.\n\nUma nova página aparece no seu Livro das Sombras. Criaturas que assinarem o nome nela (até seu bônus de proficiência) podem ser alvo da magia Remeter sem gastar espaço de magia nem componentes materiais." },
    { "value": "dadiva_dos_protetores", "name": "Dádiva dos Protetores", "combat": "situacional", "desc": "Pré-requisito: 9º nível de bruxo, característica de Pacto do Tomo.\n\nUma nova página aparece no seu Livro das Sombras. Quando uma criatura cujo nome esteja na página (até seu bônus de proficiência) for reduzida a 0 PV sem morrer na hora, ela cai para 1 PV em vez disso. Recarrega após um descanso longo." },
    { "value": "implemento_mestre_corrente", "name": "Implemento do Mestre da Corrente", "combat": "situacional", "desc": "Pré-requisito: característica de Pacto da Corrente.\n\nAo conjurar Encontrar Familiar, você imbui o familiar: ganha voo ou natação 12m; pode comandá-lo a Atacar com uma ação bônus; os ataques dele são mágicos e usam a sua CD de magia; e você pode usar sua reação para dar resistência a ele contra um dano que sofra." },
    { "value": "protecao_do_talisma", "name": "Proteção do Talismã", "combat": "situacional", "desc": "Pré-requisito: 7º nível de bruxo, característica de Pacto do Talismã.\n\nQuando o portador do seu talismã falhar em uma salvaguarda, ele pode somar 1d4 à jogada, podendo transformá-la em sucesso. Usos = seu bônus de proficiência, recuperados num descanso longo." },
    { "value": "repreensao_do_talisma", "name": "Repreensão do Talismã", "combat": "situacional", "desc": "Pré-requisito: característica de Pacto do Talismã.\n\nQuando o portador do talismã for acertado por um atacante a até 9m de você e em seu campo de visão, você pode usar sua reação para causar dano psíquico igual ao seu bônus de proficiência e empurrá-lo até 3m para longe do portador." },
    { "value": "servidao_eterna", "name": "Servidão Eterna", "combat": "situacional", "desc": "Pré-requisito: 5º nível de bruxo.\n\nVocê pode conjurar Animar Mortos sem gastar um espaço de magia. Feito isso, não pode conjurá-la dessa forma de novo até terminar um descanso longo." }
  ]
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: PASS (3 testes verdes).

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-optional-features.test.js
git commit -m "feat(tasha): invocações místicas opcionais do bruxo (8)"
```

---

### Task 2: Metamagia de Tasha (Feiticeiro)

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (classe `feiticeiro`, append choices `metamagic`, `metamagic_10`, `metamagic_17`)
- Test: `src/test/dnd5e/tasha-optional-features.test.js` (adicionar describe)

- [ ] **Step 1: Adicionar o teste falhando**

Acrescentar ao arquivo de teste:

```js
describe('Tasha opções opcionais — metamagia (feiticeiro)', () => {
  const ESPERADAS = ['perseguidora', 'transmutada']
  const IDS = ['metamagic', 'metamagic_10', 'metamagic_17']

  it('cada choice de metamagia ganha as 2 opções de Tasha', () => {
    for (const id of IDS) {
      const opts = tashaOptions('feiticeiro', id)
      const valores = opts.map(o => o.value)
      for (const v of ESPERADAS) expect(valores, `${id}/${v}`).toContain(v)
    }
  })

  it('merge concatena a metamagia de Tasha com a do PHB em metamagic', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const choice = merged.feiticeiro.choices.find(c => c.id === 'metamagic')
    const tashaOnes = choice.options.filter(o => o.source === 'tasha').map(o => o.value).sort()
    expect(tashaOnes).toEqual([...ESPERADAS].sort())
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: FAIL (metamagia de Tasha ausente).

- [ ] **Step 3: Adicionar os três choices ao `feiticeiro`**

No `"feiticeiro": { "choices": [ ... ] }`, append ao array `choices` os três objetos (mesmas 2 opções nos três `id`):

```json
{
  "level": 3,
  "id": "metamagic",
  "featureName": "Metamagia",
  "options": [
    { "value": "perseguidora", "name": "Magia Perseguidora", "combat": "essencial", "desc": "Se você errar uma jogada de ataque de uma magia, pode gastar 2 pontos de feitiçaria para rolar o d20 de novo, ficando com o novo resultado. Pode ser usada mesmo que você já esteja usando outra Metamagia na conjuração." },
    { "value": "transmutada", "name": "Magia Transmutada", "combat": "situacional", "desc": "Ao conjurar uma magia que cause dano de ácido, gélido, ígneo, elétrico, venenoso ou trovejante, gaste 1 ponto de feitiçaria para mudar o tipo de dano para outro dentre esses listados." }
  ]
},
{
  "level": 10,
  "id": "metamagic_10",
  "featureName": "Metamagia",
  "options": [
    { "value": "perseguidora", "name": "Magia Perseguidora", "combat": "essencial", "desc": "Se você errar uma jogada de ataque de uma magia, pode gastar 2 pontos de feitiçaria para rolar o d20 de novo, ficando com o novo resultado. Pode ser usada mesmo que você já esteja usando outra Metamagia na conjuração." },
    { "value": "transmutada", "name": "Magia Transmutada", "combat": "situacional", "desc": "Ao conjurar uma magia que cause dano de ácido, gélido, ígneo, elétrico, venenoso ou trovejante, gaste 1 ponto de feitiçaria para mudar o tipo de dano para outro dentre esses listados." }
  ]
},
{
  "level": 17,
  "id": "metamagic_17",
  "featureName": "Metamagia",
  "options": [
    { "value": "perseguidora", "name": "Magia Perseguidora", "combat": "essencial", "desc": "Se você errar uma jogada de ataque de uma magia, pode gastar 2 pontos de feitiçaria para rolar o d20 de novo, ficando com o novo resultado. Pode ser usada mesmo que você já esteja usando outra Metamagia na conjuração." },
    { "value": "transmutada", "name": "Magia Transmutada", "combat": "situacional", "desc": "Ao conjurar uma magia que cause dano de ácido, gélido, ígneo, elétrico, venenoso ou trovejante, gaste 1 ponto de feitiçaria para mudar o tipo de dano para outro dentre esses listados." }
  ]
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-optional-features.test.js
git commit -m "feat(tasha): metamagia opcional do feiticeiro (Perseguidora/Transmutada)"
```

---

### Task 3: Estilos de Combate de Tasha (Guerreiro, Paladino, Patrulheiro)

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (classes `guerreiro`, `paladino`, `patrulheiro`)
- Test: `src/test/dnd5e/tasha-optional-features.test.js` (adicionar describe)

- [ ] **Step 1: Adicionar o teste falhando**

```js
describe('Tasha opções opcionais — estilos de combate', () => {
  const CASOS = [
    { cls: 'guerreiro',   id: 'fighting_style',         vals: ['luta_as_cegas', 'interceptador', 'tecnica_superior', 'arremesso_de_armas', 'ataque_desarmado'] },
    { cls: 'paladino',    id: 'fighting_style_paladin',  vals: ['guerreiro_abencoado', 'luta_as_cegas', 'interceptador'] },
    { cls: 'patrulheiro', id: 'fighting_style_ranger',   vals: ['luta_as_cegas', 'guerreiro_druidico', 'arremesso_de_armas'] },
  ]

  for (const { cls, id, vals } of CASOS) {
    it(`${cls}: ${id} ganha os estilos de Tasha`, () => {
      const valores = tashaOptions(cls, id).map(o => o.value)
      for (const v of vals) expect(valores, `${cls}/${v}`).toContain(v)
    })
    it(`${cls}: estilos de Tasha entram no merge carimbados`, () => {
      const merged = mergeClassChoices(phb, tasha, 'tasha')
      const choice = merged[cls].choices.find(c => c.id === id)
      const tashaOnes = choice.options.filter(o => o.source === 'tasha').map(o => o.value)
      for (const v of vals) expect(tashaOnes, `${cls}/${v} sem carimbo`).toContain(v)
    })
  }
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: FAIL.

- [ ] **Step 3: Adicionar os choices de estilo nas três classes**

No `guerreiro`, append:

```json
{
  "level": 1,
  "id": "fighting_style",
  "featureName": "Estilo de Luta",
  "options": [
    { "value": "luta_as_cegas", "name": "Luta às Cegas", "combat": "essencial", "desc": "Você tem percepção às cegas com alcance de 3m: dentro dela, enxerga o que não estiver sob cobertura total mesmo cego ou no escuro, e vê criaturas invisíveis (a menos que se escondam de você com sucesso)." },
    { "value": "interceptador", "name": "Interceptador", "combat": "situacional", "desc": "Quando uma criatura que você veja acerta um alvo (que não seja você) a até 1,5m de você, use sua reação para reduzir o dano em 1d10 + seu bônus de proficiência (mínimo 0). Você precisa empunhar um escudo ou uma arma simples ou marcial." },
    { "value": "tecnica_superior", "name": "Técnica Superior", "combat": "essencial", "desc": "Você aprende uma manobra à sua escolha dentre as do Mestre de Batalha e ganha um dado de superioridade (d6, somado a outros que você tenha). A CD da manobra = 8 + seu bônus de proficiência + Força ou Destreza (à sua escolha). O dado é recuperado num descanso curto ou longo." },
    { "value": "arremesso_de_armas", "name": "Arremesso de Armas", "combat": "essencial", "desc": "Você pode sacar uma arma com a propriedade arremesso como parte da ação de ataque com ela. Além disso, ao acertar um ataque à distância com arma de arremesso, ganha +2 na jogada de dano." },
    { "value": "ataque_desarmado", "name": "Ataque Desarmado", "combat": "essencial", "desc": "Seus ataques desarmados causam 1d6 + seu modificador de Força de dano contundente (o d6 vira d8 se você não empunhar arma nem escudo). No início de cada turno, pode causar 1d4 contundente a uma criatura agarrada por você." }
  ]
}
```

No `paladino`, append:

```json
{
  "level": 2,
  "id": "fighting_style_paladin",
  "featureName": "Estilo de Luta",
  "options": [
    { "value": "guerreiro_abencoado", "name": "Guerreiro Abençoado", "combat": "essencial", "desc": "Você aprende dois truques à sua escolha da lista de magias do Clérigo; contam como magias de paladino e usam Carisma como atributo de conjuração. Ao subir de nível nesta classe, pode trocar um deles por outro truque da lista de clérigo." },
    { "value": "luta_as_cegas", "name": "Luta às Cegas", "combat": "essencial", "desc": "Você tem percepção às cegas com alcance de 3m: dentro dela, enxerga o que não estiver sob cobertura total mesmo cego ou no escuro, e vê criaturas invisíveis (a menos que se escondam de você com sucesso)." },
    { "value": "interceptador", "name": "Interceptador", "combat": "situacional", "desc": "Quando uma criatura que você veja acerta um alvo (que não seja você) a até 1,5m de você, use sua reação para reduzir o dano em 1d10 + seu bônus de proficiência (mínimo 0). Você precisa empunhar um escudo ou uma arma simples ou marcial." }
  ]
}
```

No `patrulheiro`, append:

```json
{
  "level": 2,
  "id": "fighting_style_ranger",
  "featureName": "Estilo de Luta",
  "options": [
    { "value": "luta_as_cegas", "name": "Luta às Cegas", "combat": "essencial", "desc": "Você tem percepção às cegas com alcance de 3m: dentro dela, enxerga o que não estiver sob cobertura total mesmo cego ou no escuro, e vê criaturas invisíveis (a menos que se escondam de você com sucesso)." },
    { "value": "guerreiro_druidico", "name": "Guerreiro Druídico", "combat": "essencial", "desc": "Você aprende dois truques à sua escolha da lista de magias do Druida; contam como magias de patrulheiro e usam Sabedoria como atributo de conjuração. Ao subir de nível nesta classe, pode trocar um deles por outro truque da lista de druida." },
    { "value": "arremesso_de_armas", "name": "Arremesso de Armas", "combat": "essencial", "desc": "Você pode sacar uma arma com a propriedade arremesso como parte da ação de ataque com ela. Além disso, ao acertar um ataque à distância com arma de arremesso, ganha +2 na jogada de dano." }
  ]
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-optional-features.test.js
git commit -m "feat(tasha): estilos de combate opcionais (guerreiro/paladino/patrulheiro)"
```

---

### Task 4: Manobras de Tasha (Mestre de Combate / Guerreiro)

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (classe `guerreiro`, append choice `martial_archetype_maneuvers`)
- Test: `src/test/dnd5e/tasha-optional-features.test.js` (adicionar describe)

- [ ] **Step 1: Adicionar o teste falhando**

```js
describe('Tasha opções opcionais — manobras (guerreiro)', () => {
  const ESPERADAS = [
    'emboscada', 'engodo', 'enganchar', 'presenca-dominante',
    'golpe-imobilizador', 'lancamento-rapido', 'avaliacao-tatica',
  ]

  it('o choice martial_archetype_maneuvers ganha as 7 manobras de Tasha', () => {
    const valores = tashaOptions('guerreiro', 'martial_archetype_maneuvers').map(o => o.value)
    for (const v of ESPERADAS) expect(valores, `${v} ausente`).toContain(v)
  })

  it('as manobras de Tasha entram no merge carimbadas e somadas às do PHB', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const choice = merged.guerreiro.choices.find(c => c.id === 'martial_archetype_maneuvers')
    const tashaOnes = choice.options.filter(o => o.source === 'tasha').map(o => o.value).sort()
    expect(tashaOnes).toEqual([...ESPERADAS].sort())
    expect(choice.options.some(o => o.value === 'ataque-ardiloso' && !o.source)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: FAIL.

- [ ] **Step 3: Adicionar o choice de manobras ao `guerreiro`**

No `guerreiro`, append ao array `choices`:

```json
{
  "level": 3,
  "id": "martial_archetype_maneuvers",
  "featureName": "Manobras",
  "options": [
    { "value": "emboscada", "name": "Emboscada", "combat": "situacional", "desc": "Ao fazer um teste de Destreza (Furtividade) ou uma jogada de iniciativa, você pode gastar um dado de superioridade e somar o resultado à rolagem, desde que não esteja incapacitado." },
    { "value": "engodo", "name": "Engodo", "combat": "situacional", "desc": "Estando a até 1,5m de uma criatura no seu turno, gaste um dado de superioridade e troque de lugar com ela (criatura voluntária e não incapacitada; gaste ao menos 1,5m de movimento). O movimento não provoca ataques de oportunidade. Role o dado: até o início do seu próximo turno, você ou a criatura (à sua escolha) ganha um bônus de CA igual ao valor rolado." },
    { "value": "enganchar", "name": "Enganchar", "combat": "situacional", "desc": "Quando uma criatura que você veja se mover para dentro do alcance da sua arma corpo a corpo empunhada, use sua reação e gaste um dado de superioridade para atacá-la com essa arma. Se acertar, some o dado de superioridade ao dano." },
    { "value": "presenca-dominante", "name": "Presença Dominante", "combat": "situacional", "desc": "Ao fazer um teste de Carisma (Intimidação, Atuação ou Persuasão), você pode gastar um dado de superioridade e somar o resultado ao teste." },
    { "value": "golpe-imobilizador", "name": "Golpe Imobilizador", "combat": "situacional", "desc": "Logo após acertar uma criatura com um ataque corpo a corpo no seu turno, gaste um dado de superioridade e tente agarrar o alvo como ação bônus; some o dado ao seu teste de Força (Atletismo)." },
    { "value": "lancamento-rapido", "name": "Lançamento Rápido", "combat": "essencial", "desc": "Como ação bônus, gaste um dado de superioridade e ataque com uma arma de arremesso (pode sacá-la como parte dessa ação). Se acertar, some o dado de superioridade ao dano." },
    { "value": "avaliacao-tatica", "name": "Avaliação Tática", "combat": "situacional", "desc": "Ao fazer um teste de Inteligência (Investigação), Inteligência (História) ou Sabedoria (Intuição), você pode gastar um dado de superioridade e somar o resultado ao teste." }
  ]
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js`
Expected: PASS (todos os describes verdes).

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-optional-features.test.js
git commit -m "feat(tasha): manobras opcionais do Mestre de Combate (7)"
```

---

### Task 5: Bump de cache do Service Worker + verificação final

**Files:**
- Modify: `vite.config.js` (cacheName `srd-data-vN`)

- [ ] **Step 1: Localizar o cacheName atual**

Run: `grep -n "srd-data-v" vite.config.js`
Expected: uma linha tipo `cacheName: 'srd-data-v11'` (valor atual em produção pós-subclasses).

- [ ] **Step 2: Bumpar v11 → v12**

Editar a string para `'srd-data-v12'`. (Se o grep do Step 1 mostrar outro número N, use N+1 e ajuste a mensagem de commit.)

- [ ] **Step 3: Validar JSON e rodar a suíte relacionada**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-class-choices-pt.json','utf8')); console.log('JSON ok')"`
Expected: `JSON ok` (sem erro de parse — vírgulas dos appends corretas).

Run: `npx vitest run src/test/dnd5e/tasha-optional-features.test.js src/test/dnd5e/mergeClassChoices.test.js src/test/dnd5e/filterChoiceBySources.test.js > /tmp/tasha_a.txt 2>&1; echo "exit=$?"; tail -20 /tmp/tasha_a.txt`
Expected: `exit=0`, todos verdes. (Captura o exit code em vez de mascarar com `| tail`.)

- [ ] **Step 4: Suíte completa (rede de segurança)**

Run: `npx vitest run > /tmp/full_suite.txt 2>&1; echo "exit=$?"; tail -25 /tmp/full_suite.txt`
Expected: `exit=0`. Se houver falhas SÓ em `LoginScreen`/`ResetPasswordScreen` por timeout, são flakes conhecidos (memória `variant-human-feat`) — re-rodar isolado para confirmar que não é regressão.

- [ ] **Step 5: Build PWA (garante que o cache bump não quebrou o config)**

Run: `npm run build > /tmp/build.txt 2>&1; echo "exit=$?"; tail -15 /tmp/build.txt`
Expected: `exit=0`, build limpo.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js
git commit -m "chore(sw): bump cache srd-data v11->v12 (features opcionais de Tasha)"
```

---

## Self-Review

- **Spec coverage:** As quatro frentes do balde A (invocações, metamagia, estilos, manobras) viram Tasks 1–4; cache bump + verificação na Task 5. ✓
- **Pact Boon:** o design notou que o TCE não cria tipos novos de Dádiva do Pacto. A extração do PDF confirmou — não há seção de novas opções de `pact_boon` (só invocações que mexem nos pactos, já cobertas na Task 1). Nenhuma task para `pact_boon`. ✓
- **`id`s e classes:** `fighting_style_paladin` (não `fighting_style`) e os três `metamagic*` estão explícitos. ✓
- **Carimbo de fonte:** nenhum `source` no JSON cru (testado na Task 1, regra geral do merge cobre as demais). ✓
- **Placeholders:** todas as descrições e o JSON estão completos; nenhum "TBD". O único "typo intencional" sinalizado (Destrieza) tem nota de correção. ✓
- **Gating off→preserva escolhido:** mecanismo já é unit-testado em `filterChoiceBySources.test.js` (rodado na Task 5); não reimplementado aqui — só verificamos que as opções fluem carimbadas pelo merge. ✓
