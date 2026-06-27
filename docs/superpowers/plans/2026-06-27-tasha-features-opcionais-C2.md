# Tasha — Features Opcionais de Classe (C2: fan-out por classe) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fan-out das características opcionais de classe de Tasha para as demais classes — 19 adições (opt-in card-only) sobre a infra de feature opcional já entregue no C1, mais o Pacto do Talismã (novo tipo de Dádiva de Pacto do Bruxo, como option de lista).

**Architecture:** Tudo é DADO em `public/srd-data/tasha-class-choices-pt.json`. As 19 adições seguem o modelo do C1: choice `optional: true` + `addsFeature: true` (sem `featureName`), uma opção; quando ligada na seção "Variantes de Tasha", é injetada como card via `getChosenAdditions`. O Pacto do Talismã é diferente: é uma opção nova na choice existente `pact_boon` do Bruxo (id igual ao PHB → `mergeClassChoices` concatena e carimba `source: 'tasha'`), NÃO um opt-in toggle. Nenhuma mudança de código — só dado + bump de cache + testes.

**Tech Stack:** Vite, Vitest (`npx vitest run <arquivo>`), dados em `public/srd-data/*.json`, service worker Workbox (cache `srd-data-vN` em `vite.config.js`, hoje **v14**).

---

## Contexto (leia antes de começar)

- Modelo de feature opcional (C1): em `src/systems/dnd5e/domain/optionalFeatures.js`. Uma ADIÇÃO = choice `optional: true` + `addsFeature: true`, SEM `featureName`, com exatamente uma `option`. Quando ligada (toggle na ficha), vira card via `getChosenAdditions`, que copia `combat`/`category`/`actionType` da option pro card (roteamento: `combat` → aba Combate; `category` → seção em Habilidades).
- `mergeClassChoices` carimba `source: 'tasha'` em runtime nas options de TODO choice extra (id novo OU colidindo). NÃO grave `source` nas options no JSON cru. O flag `optional`/`addsFeature` fica no choice e é preservado pelo `...ch`.
- Todas as 13 classes JÁ existem como chaves em `tasha-class-choices-pt.json` — você APENAS acrescenta objetos ao array `choices` de cada uma. Nunca remova/edite entradas existentes.
- `pact_boon` existe em `phb-class-choices-pt.json` no Bruxo nv3 com options `[corrente, lamina, tomo]`. O Pacto do Talismã entra como choice `{ id: "pact_boon", level: 3, options: [{ value: "talisma", ... }] }` no Bruxo de Tasha → o merge concatena ao PHB.
- Convenção de `category`: `'magia'` (Magia & Recursos), `'defesa'`, `'exploracao'`, `'social'`, ou ausência → `'outras'`. Convenção de combate: `combat: 'situacional'` + `actionType: 'ação'|'ação bônus'|'reação'` para o que é de combate.
- FORA do escopo do C2 (vão pro C3): Consciência Primordial (Patrulheiro — concede magias) e Golpes Abençoados (Clérigo nv8 — substitui feature de subclasse). NÃO adicione esses.

---

## Task 1: Adições das classes marciais (Bárbaro, Ladino, Monge)

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (append a `barbaro.choices`, `ladino.choices`, `monge.choices`)
- Test: `src/test/dnd5e/tasha-optional-features-c2-martial.test.js` (new)

- [ ] **Step 1: Escrever o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isAdditionChoice } from '../../systems/dnd5e/domain/optionalFeatures'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const choice = (cls, id) => tasha[cls]?.choices.find(c => c.id === id)

const CASOS = [
  ['barbaro', 'barbaro_primal_knowledge',   3],
  ['barbaro', 'barbaro_instinctive_pounce', 7],
  ['ladino',  'ladino_steady_aim',          3],
  ['monge',   'monge_dedicated_weapon',     2],
  ['monge',   'monge_ki_fueled_attack',     3],
  ['monge',   'monge_quickened_healing',    4],
  ['monge',   'monge_focused_aim',          5],
]

describe('C2 marciais — adições opcionais', () => {
  for (const [cls, id, level] of CASOS) {
    it(`${cls}/${id}: optional + addsFeature, sem featureName, nível ${level}, 1 opção com desc`, () => {
      const c = choice(cls, id)
      expect(c, `${id} ausente`).toBeTruthy()
      expect(isAdditionChoice(c)).toBe(true)
      expect(c.featureName).toBeUndefined()
      expect(c.level).toBe(level)
      expect(c.options).toHaveLength(1)
      expect(c.options[0].desc.length).toBeGreaterThan(60)
      expect(c.options[0].source).toBeUndefined() // carimbo é runtime
    })
  }
  it('os ids combativos carregam combat:situacional', () => {
    for (const id of ['barbaro_instinctive_pounce', 'ladino_steady_aim', 'monge_ki_fueled_attack', 'monge_quickened_healing', 'monge_focused_aim', 'monge_dedicated_weapon']) {
      const c = choice(id.split('_')[0] === 'ladino' ? 'ladino' : id.startsWith('barbaro') ? 'barbaro' : 'monge', id)
      expect(c.options[0].combat, id).toBe('situacional')
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features-c2-martial.test.js`
Expected: FAIL — choices ausentes.

- [ ] **Step 3: Append no JSON**

Em `barbaro.choices`, acrescente:
```json
{
  "id": "barbaro_primal_knowledge",
  "addsFeature": true,
  "optional": true,
  "level": 3,
  "options": [
    { "value": "conhecimento_primitivo", "name": "Conhecimento Primitivo", "category": "outras", "desc": "Ao alcançar o 3º nível, e novamente no 10º nível, você ganha proficiência em uma perícia à sua escolha da lista de perícias do bárbaro de 1º nível." }
  ]
},
{
  "id": "barbaro_instinctive_pounce",
  "addsFeature": true,
  "optional": true,
  "level": 7,
  "options": [
    { "value": "instinto_agressivo", "name": "Instinto Agressivo", "combat": "situacional", "actionType": "ação bônus", "desc": "Como parte da ação bônus que você usa para entrar em fúria, você pode se mover até metade do seu deslocamento." }
  ]
}
```

Em `ladino.choices`, acrescente:
```json
{
  "id": "ladino_steady_aim",
  "addsFeature": true,
  "optional": true,
  "level": 3,
  "options": [
    { "value": "mira_firme", "name": "Mira Firme", "combat": "situacional", "actionType": "ação bônus", "desc": "Como uma ação bônus, você pode conceder a si mesmo vantagem na sua próxima jogada de ataque neste turno. Você só pode usar essa ação bônus se não tiver se movido neste turno; depois de usá-la, seu deslocamento passa a ser 0 até o fim do turno." }
  ]
}
```

Em `monge.choices`, acrescente:
```json
{
  "id": "monge_dedicated_weapon",
  "addsFeature": true,
  "optional": true,
  "level": 2,
  "options": [
    { "value": "arma_dedicada", "name": "Arma Dedicada", "combat": "situacional", "desc": "Sempre que terminar um descanso curto ou longo, você pode tocar uma arma e concentrar seu ki nela, tratando-a como arma de monge até usar essa característica de novo. A arma deve ser simples ou marcial, você precisa ter proficiência com ela, e ela não pode ter as propriedades pesada ou especial." }
  ]
},
{
  "id": "monge_ki_fueled_attack",
  "addsFeature": true,
  "optional": true,
  "level": 3,
  "options": [
    { "value": "ataque_com_ki", "name": "Ataque com Ki", "combat": "situacional", "actionType": "ação bônus", "desc": "Se você gastar 1 ponto de ki ou mais como parte da sua ação no seu turno, você pode fazer um ataque desarmado ou com arma de monge como uma ação bônus antes do fim do turno." }
  ]
},
{
  "id": "monge_quickened_healing",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "cura_acelerada", "name": "Cura Acelerada", "combat": "situacional", "actionType": "ação", "desc": "Como uma ação, você pode gastar 2 pontos de ki e rolar um dado de Artes Marciais, recuperando pontos de vida iguais ao resultado mais o seu bônus de proficiência." }
  ]
},
{
  "id": "monge_focused_aim",
  "addsFeature": true,
  "optional": true,
  "level": 5,
  "options": [
    { "value": "mira_focalizada", "name": "Mira Focalizada", "combat": "situacional", "desc": "Quando você erra uma jogada de ataque, você pode gastar de 1 a 3 pontos de ki para aumentar a rolagem de ataque em 2 para cada ponto gasto, potencialmente transformando o erro em acerto." }
  ]
}
```

Valide o JSON: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-class-choices-pt.json','utf-8')); console.log('ok')"`

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features-c2-martial.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-optional-features-c2-martial.test.js
git commit -m "feat(tasha): features opcionais C2 — marciais (Bárbaro, Ladino, Monge)"
```

---

## Task 2: Adições das classes conjuradoras + Pacto do Talismã

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json` (append a bardo/bruxo/clerigo/druida/feiticeiro/mago/paladino/patrulheiro)
- Test: `src/test/dnd5e/tasha-optional-features-c2-casters.test.js` (new)

- [ ] **Step 1: Escrever o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isAdditionChoice, isOptionalChoice } from '../../systems/dnd5e/domain/optionalFeatures'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'))
const choice = (cls, id) => tasha[cls]?.choices.find(c => c.id === id)

const ADICOES = [
  ['bardo',       'bardo_magical_inspiration',        2],
  ['bardo',       'bardo_bardic_versatility',         4],
  ['bruxo',       'bruxo_mystic_versatility',         4],
  ['clerigo',     'clerigo_harness_divine_power',     2],
  ['clerigo',     'clerigo_cantrip_versatility',      4],
  ['druida',      'druida_cantrip_versatility',       4],
  ['feiticeiro',  'feiticeiro_sorcerous_versatility', 4],
  ['feiticeiro',  'feiticeiro_magical_guidance',      5],
  ['mago',        'mago_cantrip_formulas',            3],
  ['paladino',    'paladino_harness_divine_power',    3],
  ['paladino',    'paladino_martial_versatility',     4],
  ['patrulheiro', 'patrulheiro_spellcasting_focus',   2],
]

describe('C2 conjuradores — adições opcionais', () => {
  for (const [cls, id, level] of ADICOES) {
    it(`${cls}/${id}: addition válida, nível ${level}`, () => {
      const c = choice(cls, id)
      expect(c, `${id} ausente`).toBeTruthy()
      expect(isAdditionChoice(c)).toBe(true)
      expect(c.level).toBe(level)
      expect(c.options).toHaveLength(1)
      expect(c.options[0].desc.length).toBeGreaterThan(60)
      expect(c.options[0].source).toBeUndefined()
    })
  }
})

describe('Pacto do Talismã — option de lista no pact_boon do Bruxo (não opt-in)', () => {
  it('é um choice pact_boon de Tasha, NÃO optional, com a opção talisma', () => {
    const c = choice('bruxo', 'pact_boon')
    expect(c, 'pact_boon de Tasha ausente').toBeTruthy()
    expect(isOptionalChoice(c)).toBe(false)
    expect(c.options.map(o => o.value)).toContain('talisma')
  })
  it('merge concatena talisma às opções do PHB, carimbado tasha', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const pb = merged.bruxo.choices.find(c => c.id === 'pact_boon')
    const vals = pb.options.map(o => o.value)
    expect(vals).toEqual(expect.arrayContaining(['corrente', 'lamina', 'tomo', 'talisma']))
    expect(pb.options.find(o => o.value === 'talisma').source).toBe('tasha')
    expect(pb.options.find(o => o.value === 'corrente').source).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features-c2-casters.test.js`
Expected: FAIL — ausentes.

- [ ] **Step 3: Append no JSON**

Em `bardo.choices`:
```json
{
  "id": "bardo_magical_inspiration",
  "addsFeature": true,
  "optional": true,
  "level": 2,
  "options": [
    { "value": "inspiracao_magica", "name": "Inspiração Mágica", "category": "magia", "desc": "Se uma criatura tem um dado de Inspiração de Bardo concedido por você e conjura uma magia que restaura pontos de vida ou causa dano, ela pode rolar esse dado e escolher um alvo afetado pela magia, somando o número rolado aos pontos de vida recuperados ou ao dano causado. O dado de Inspiração é gasto." }
  ]
},
{
  "id": "bardo_bardic_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "versatilidade_bardica", "name": "Versatilidade Bárdica", "category": "outras", "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode: transferir o bônus da característica Especialista de uma perícia para outra na qual você seja proficiente (e que ainda não tenha o bônus); ou substituir um truque aprendido pela conjuração de bardo por outro truque da lista de bardo." }
  ]
}
```

Em `bruxo.choices` (a ADIÇÃO e o PACTO — dois objetos distintos):
```json
{
  "id": "bruxo_mystic_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "versatilidade_mistica", "name": "Versatilidade Mística", "category": "magia", "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode: substituir um truque aprendido pela Magia do Pacto por outro truque da lista de bruxo; substituir a opção escolhida de Dádiva do Pacto por outra disponível; e, no 12º nível ou acima, substituir uma magia da Arcana Mística por outra magia de bruxo do mesmo círculo. Se a troca tornar você inelegível para uma Invocação Mística, troque também essa invocação por outra para a qual você se qualifique." }
  ]
},
{
  "id": "pact_boon",
  "level": 3,
  "options": [
    { "value": "talisma", "name": "Pacto do Talismã", "desc": "Seu patrono lhe dá um amuleto — um talismã que pode auxiliar seu portador quando a necessidade exigir. Quando o portador falha em um teste de habilidade, ele pode adicionar 1d4 ao resultado, potencialmente transformando a falha em sucesso. Pode usar isso um número de vezes igual ao seu bônus de proficiência, recuperando todos os usos em um descanso longo. Se você perder o talismã, pode realizar uma cerimônia de 1 hora durante um descanso curto ou longo para receber de seu patrono um substituto, destruindo o amuleto anterior. O talismã vira cinzas quando você morre." }
  ]
}
```
NOTA: o objeto `pact_boon` NÃO tem `optional`/`addsFeature` — é uma opção de lista normal (mesmo id do PHB; o merge concatena). Não tem `featureName` porque já casa o id da choice do PHB.

Em `clerigo.choices`:
```json
{
  "id": "clerigo_harness_divine_power",
  "addsFeature": true,
  "optional": true,
  "level": 2,
  "options": [
    { "value": "explorar_poder_divino", "name": "Explorar o Poder Divino", "category": "magia", "desc": "Você pode gastar um uso de Canalizar Divindade para alimentar suas magias. Como uma ação bônus, você toca seu símbolo sagrado, faz uma prece e recupera um espaço de magia gasto cujo círculo não pode ser maior que metade do seu bônus de proficiência (arredondado para cima). Você pode usar isso uma vez no 2º nível, duas no 6º e três no 18º, recuperando os usos em um descanso longo." }
  ]
},
{
  "id": "clerigo_cantrip_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "versatilidade_em_truques", "name": "Versatilidade em Truques", "category": "magia", "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode substituir um truque aprendido pela conjuração de clérigo por outro truque da lista de magias do clérigo." }
  ]
}
```

Em `druida.choices`:
```json
{
  "id": "druida_cantrip_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "versatilidade_em_truques", "name": "Versatilidade em Truques", "category": "magia", "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode substituir um truque aprendido pela conjuração de druida por outro truque da lista de magias do druida." }
  ]
}
```

Em `feiticeiro.choices`:
```json
{
  "id": "feiticeiro_sorcerous_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "versatilidade_feiticeira", "name": "Versatilidade Feiticeira", "category": "magia", "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode: substituir uma das suas opções de Metamagia por outra disponível; ou substituir um truque aprendido pela conjuração de feiticeiro por outro truque da lista do feiticeiro." }
  ]
},
{
  "id": "feiticeiro_magical_guidance",
  "addsFeature": true,
  "optional": true,
  "level": 5,
  "options": [
    { "value": "orientacao_magica", "name": "Orientação Mágica", "category": "magia", "desc": "Você pode acessar sua fonte interna de magia para evocar o sucesso a partir do fracasso. Quando você falha em um teste de habilidade, pode gastar 1 ponto de feitiçaria para rolar novamente o d20 e usar o novo resultado, potencialmente transformando a falha em sucesso." }
  ]
}
```

Em `mago.choices`:
```json
{
  "id": "mago_cantrip_formulas",
  "addsFeature": true,
  "optional": true,
  "level": 3,
  "options": [
    { "value": "formulacao_de_truques", "name": "Formulação de Truques", "category": "magia", "desc": "Você escreveu um conjunto de fórmulas arcanas no seu livro de magias. Sempre que termina um descanso longo e consulta essas fórmulas, você pode substituir um truque que conhece por outro truque da lista de magias do mago." }
  ]
}
```

Em `paladino.choices`:
```json
{
  "id": "paladino_harness_divine_power",
  "addsFeature": true,
  "optional": true,
  "level": 3,
  "options": [
    { "value": "explorar_poder_divino", "name": "Explorar o Poder Divino", "category": "magia", "desc": "Você pode gastar um uso de Canalizar Divindade para alimentar suas magias. Como uma ação bônus, você toca seu símbolo sagrado, faz uma prece e recupera um espaço de magia gasto cujo círculo não pode ser maior que metade do seu bônus de proficiência (arredondado para cima). Você pode usar isso uma vez no 3º nível, duas no 7º e três no 15º, recuperando os usos em um descanso longo." }
  ]
},
{
  "id": "paladino_martial_versatility",
  "addsFeature": true,
  "optional": true,
  "level": 4,
  "options": [
    { "value": "versatilidade_marcial", "name": "Versatilidade Marcial", "category": "outras", "desc": "Sempre que você alcança um nível que concede Aumento no Valor de Atributo, você pode substituir um estilo de combate que conhece por outro da lista disponível para paladinos." }
  ]
}
```

Em `patrulheiro.choices`:
```json
{
  "id": "patrulheiro_spellcasting_focus",
  "addsFeature": true,
  "optional": true,
  "level": 2,
  "options": [
    { "value": "foco_de_conjuracao", "name": "Foco de Conjuração", "category": "magia", "desc": "Você pode usar um foco druídico como foco de conjuração para suas magias de patrulheiro." }
  ]
}
```

Valide o JSON: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-class-choices-pt.json','utf-8')); console.log('ok')"`

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-features-c2-casters.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-optional-features-c2-casters.test.js
git commit -m "feat(tasha): features opcionais C2 — conjuradores + Pacto do Talismã (Bruxo)"
```

---

## Task 3: Bump de cache + verificação ponta-a-ponta

**Files:**
- Modify: `vite.config.js` (cache `srd-data-v14` → `srd-data-v15`)

- [ ] **Step 1: Bump do cache**

Em `vite.config.js`, troque `cacheName: 'srd-data-v14'` por `cacheName: 'srd-data-v15'` (com um comentário datado no estilo das entradas anteriores). Mudou JSON em `public/srd-data` → o cache precisa bumpar, senão o SW serve dado antigo.

- [ ] **Step 2: Suíte cheia + build**

Run: `npx vitest run`
Expected: tudo verde (baseline 1381 + os ~14 novos casos do C2).

Run: `npm run build`
Expected: build PWA conclui sem erro.

- [ ] **Step 3: Sanidade no preview (opcional mas recomendado)**

Suba o preview, abra/crie um Monge nv 5 com Tasha ativo → aba Habilidades → seção "Variantes de Tasha" deve listar Arma Dedicada, Ataque com Ki, Cura Acelerada, Mira Focalizada. Ligar "Ataque com Ki" → aparece um card na aba Combate (Situacional). Abrir um Bruxo nv 3 com Tasha e conferir que "Pacto do Talismã" aparece como opção na escolha de Dádiva de Pacto (não na seção de Variantes).

- [ ] **Step 4: Commit + memória**

```bash
git add vite.config.js
git commit -m "chore(tasha): bump cache SW v14->v15 (features opcionais C2)"
```

Atualize `C:\Users\gvfar\.claude\projects\C--Users-gvfar-git-dnd-ficha-app\memory\project_tasha_fontes.md`: registre C2 (19 adições nas 11 classes + Pacto do Talismã como pact_boon option; cache v14→v15; suíte verde), e que C3 (Consciência Primordial concede-magias + Golpes Abençoados substitui feature de subclasse) segue pendente.

---

## Self-review (cobertura)

- **19 adições** (card-only, modelo C1 `optional`+`addsFeature`) → Task 1 (7: Bárbaro 2, Ladino 1, Monge 4) + Task 2 (12: Bardo 2, Bruxo 1, Clérigo 2, Druida 1, Feiticeiro 2, Mago 1, Paladino 2, Patrulheiro 1).
- **Pacto do Talismã** (novo tipo de Dádiva de Pacto) → Task 2, como option de lista no `pact_boon` do Bruxo (id colidindo com PHB → merge concatena+carimba), NÃO opt-in toggle. Corrige a conclusão do balde A de que "TCE não cria novos tipos de pacto".
- **Tags de roteamento**: combativas (`combat: 'situacional'` + `actionType`) p/ Instinto Agressivo, Mira Firme, Arma Dedicada, Ataque com Ki, Cura Acelerada, Mira Focalizada; `category: 'magia'` p/ as versatilidades de truque/conjuração, Inspiração Mágica, Explorar o Poder Divino, Formulação de Truques, Foco de Conjuração; `category: 'outras'` p/ Conhecimento Primitivo, Versatilidade Bárdica, Versatilidade Marcial.
- **Cache SW** → Task 3 (v14→v15).
- **Sem código novo** — reusa 100% da infra do C1. Nenhuma option grava `source` no cru (carimbo runtime).
- **FORA (declarado, vai pro C3):** Consciência Primordial (concede magias), Golpes Abençoados (substitui feature de subclasse). Listas de magias expandidas seguem como balde separado. Guerreiro não tem feature opcional nova nesta tradução.
