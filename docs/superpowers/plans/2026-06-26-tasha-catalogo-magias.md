# Tasha — Catálogo de Magias (Balde B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar as 18 magias novas do Caldeirão de Tasha que ainda faltam para o catálogo, fazendo `tasha-spells-pt.json` passar de 3 para 21 entradas.

**Architecture:** Dado puro. O `SrdProvider` já compõe `spells` como dataset `array` (PHB + Tasha concatenados e carimbados por fonte), então basta anexar as 18 magias ao `tasha-spells-pt.json` no mesmo schema das 3 existentes. `useClassSpells` filtra a lista por `s.classes?.includes(classIndex)` (slugs PT), então o array `classes` de cada magia é o que a faz aparecer no picker da classe certa. Zero código de motor.

**Tech Stack:** JSON de dados (srd-data), Vitest, Vite (PWA cache bump).

---

## Contexto que o executor precisa saber

- **Schema de cada magia** (igual às 3 entradas existentes em `public/srd-data/tasha-spells-pt.json`): `index` (slug kebab-case), `name`, `level` (número, 0 = truque), `school` (minúsculo), `ritual` (bool), `casting_time` (string), `range` (string), `components` (string tipo `"V, S, M"`), `material` (string, `""` se não houver), `duration` (string), `concentration` (bool), `desc` (string), `higher_level` (string, `""` se a magia não escala), `source: "tasha"`, `classes` (array de slugs PT).
- **Slugs de classe válidos (PT):** `artifice`, `barbaro`, `bardo`, `clerigo`, `druida`, `feiticeiro`, `guerreiro`, `ladino`, `mago`, `monge`, `paladino`, `patrulheiro`, `bruxo`. Na tabela do TCE, **"Guardião" = `patrulheiro`**.
- **Escolas válidas (do catálogo base):** `evocação`, `transmutação`, `conjuração`, `abjuração`, `encantamento`, `adivinhação`, `ilusão`, `necromancia`. O TCE rotula a escola das invocações como **"Invocação"**, mas no catálogo isso é **`conjuração`** (as 2 invocações já existentes usam `conjuração`). Mapeie sempre Invocação→`conjuração`.
- **Nenhuma das 18 colide** com `index` do catálogo base (`phb-spells-pt.json`) nem entre si — verificado.
- **Fonte do conteúdo:** extraído de `scripts/tasha/_work/tce_full.txt` (capítulo "Descrições de Magia", linhas 9360–10333) + tabela de Feitiços (linhas 9190–9316). As descrições das invocações (summons) já vêm **condensadas** abaixo no mesmo estilo das entradas `invocar-aberracao`/`invocar-construto` existentes (bloco de stats resumido num parágrafo) — copie como está.
- **GOTCHA de nível:** o bloco de descrição de "Invocar Prole Sombria" diz "8º Círculo", mas isso é erro de OCR — a tabela e o texto de "em círculos superiores" (4º+) confirmam **nível 3**. Use `level: 3`.
- **Ambiente:** Bash tool é Git Bash (POSIX); o working-dir pode driftar — comece comandos compostos com `cd /c/Users/gvfar/git/dnd-ficha-app` ou use caminhos absolutos. Rode o vitest capturando o exit code: `npx vitest run <file> > /tmp/out.txt 2>&1; echo "exit=$?"; tail -30 /tmp/out.txt` (nunca mascare com `| tail`). Mantenha acentuação PT-BR completa. O Edit exige Read antes; garanta JSON válido (vírgulas) ao anexar ao array.

---

### Task 1: 11 magias não-invocação

**Files:**
- Modify: `public/srd-data/tasha-spells-pt.json` (anexar 11 objetos ao array)
- Test: `src/test/dnd5e/tasha-spells-schema.test.js` (criar)

- [ ] **Step 1: Escrever o teste falhando**

Criar `src/test/dnd5e/tasha-spells-schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const tasha = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-spells-pt.json'), 'utf-8'),
)
const base = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/phb-spells-pt.json'), 'utf-8'),
)

const SCHOOLS = new Set([
  'evocação', 'transmutação', 'conjuração', 'abjuração',
  'encantamento', 'adivinhação', 'ilusão', 'necromancia',
])
const CLASSES = new Set([
  'artifice', 'barbaro', 'bardo', 'clerigo', 'druida', 'feiticeiro',
  'guerreiro', 'ladino', 'mago', 'monge', 'paladino', 'patrulheiro', 'bruxo',
])
const byIndex = Object.fromEntries(tasha.map(s => [s.index, s]))

function expectValidSpell(idx) {
  const s = byIndex[idx]
  expect(s, `${idx} ausente`).toBeTruthy()
  expect(typeof s.name).toBe('string'); expect(s.name.length).toBeGreaterThan(2)
  expect(typeof s.level).toBe('number')
  expect(SCHOOLS.has(s.school), `${idx} escola inválida: ${s.school}`).toBe(true)
  expect(typeof s.ritual).toBe('boolean')
  expect(typeof s.concentration).toBe('boolean')
  expect(s.casting_time.length).toBeGreaterThan(0)
  expect(s.range.length).toBeGreaterThan(0)
  expect(s.duration.length).toBeGreaterThan(0)
  expect(typeof s.components).toBe('string')
  expect(typeof s.material).toBe('string')
  expect(s.desc.length, `${idx} desc curta`).toBeGreaterThan(40)
  expect(typeof s.higher_level).toBe('string')
  expect(s.source).toBe('tasha')
  expect(Array.isArray(s.classes) && s.classes.length > 0, `${idx} sem classes`).toBe(true)
  for (const c of s.classes) expect(CLASSES.has(c), `${idx} classe inválida: ${c}`).toBe(true)
}

describe('tasha-spells — schema de toda entrada', () => {
  it('toda magia do arquivo tem schema válido', () => {
    for (const s of tasha) expectValidSpell(s.index)
  })
  it('nenhum index de Tasha colide com o catálogo base', () => {
    const baseIdx = new Set(base.map(s => s.index))
    for (const s of tasha) expect(baseIdx.has(s.index), `colisão: ${s.index}`).toBe(false)
  })
  it('indices únicos dentro do arquivo Tasha', () => {
    const seen = new Set()
    for (const s of tasha) { expect(seen.has(s.index), `dup: ${s.index}`).toBe(false); seen.add(s.index) }
  })
})

describe('tasha-spells — magias não-invocação (Task 1)', () => {
  const ESPERADAS = [
    'chicote-eletrico', 'lamina-da-chama-esverdeada', 'lamina-estrondosa',
    'rompante-de-espadas', 'beberagem-caustica', 'chicote-mental',
    'fortaleza-intelectual', 'mortalha-espiritual', 'disfarce-sobrenatural',
    'sonho-do-veu-azul', 'lamina-do-desastre',
  ]
  for (const idx of ESPERADAS) {
    it(`${idx} presente e válida`, () => expectValidSpell(idx))
  }
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/dnd5e/tasha-spells-schema.test.js > /tmp/b1.txt 2>&1; echo "exit=$?"; tail -25 /tmp/b1.txt`
Expected: FAIL (as 11 magias da Task 1 ainda não existem no arquivo).

- [ ] **Step 3: Anexar as 11 magias ao array em `tasha-spells-pt.json`**

Abra `public/srd-data/tasha-spells-pt.json`. O arquivo é um array JSON `[ ... ]` com as 3 magias existentes. Adicione uma vírgula após a última entrada existente (`invocar-construto`) e cole estes 11 objetos antes do `]` final:

```json
{
  "index": "chicote-eletrico",
  "name": "Chicote Elétrico",
  "level": 0,
  "school": "evocação",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "Pessoal (raio de 4,5m)",
  "components": "V",
  "material": "",
  "duration": "Instantânea",
  "concentration": false,
  "desc": "Você cria um chicote de energia elétrica que golpeia uma criatura à sua escolha, à sua vista, a até 4,5m de você. O alvo deve ser bem-sucedido numa salvaguarda de Força ou é puxado até 3m em linha reta na sua direção e, se ficar a até 1,5m de você, sofre 1d8 de dano elétrico.",
  "higher_level": "O dano aumenta em 1d8 ao alcançar o 5º nível (2d8), o 11º nível (3d8) e o 17º nível (4d8).",
  "source": "tasha",
  "classes": ["artifice", "bruxo", "feiticeiro", "mago"]
},
{
  "index": "lamina-da-chama-esverdeada",
  "name": "Lâmina da Chama Esverdeada",
  "level": 0,
  "school": "evocação",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "Pessoal (raio de 1,5m)",
  "components": "S, M",
  "material": "uma arma corpo a corpo de no mínimo 1 pp",
  "duration": "Instantânea",
  "concentration": false,
  "desc": "Você brande a arma usada na conjuração e faz um ataque corpo a corpo contra uma criatura a até 1,5m de você. Em um acerto, o alvo sofre os efeitos normais do ataque da arma e uma chama verde salta dele para outra criatura à sua escolha, à sua vista, a até 1,5m do primeiro alvo, causando dano ígneo igual ao seu modificador de atributo de conjuração.",
  "higher_level": "No 5º nível, o ataque com arma causa +1d8 de dano ígneo e o salto vira 1d8 + seu modificador de conjuração. Ambos aumentam em 1d8 no 11º nível (2d8 e 2d8) e no 17º nível (3d8 e 3d8).",
  "source": "tasha",
  "classes": ["artifice", "bruxo", "feiticeiro", "mago"]
},
{
  "index": "lamina-estrondosa",
  "name": "Lâmina Estrondosa",
  "level": 0,
  "school": "evocação",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "Pessoal (raio de 1,5m)",
  "components": "S, M",
  "material": "uma arma corpo a corpo de no mínimo 1 pp",
  "duration": "1 rodada",
  "concentration": false,
  "desc": "Você brande a arma usada na conjuração e faz um ataque corpo a corpo contra uma criatura a até 1,5m de você. Em um acerto, o alvo sofre os efeitos normais do ataque da arma e fica envolto em energia estrondosa até o começo do seu próximo turno. Se o alvo se mover 1,5m ou mais voluntariamente, sofre 1d8 de dano trovejante e o efeito termina.",
  "higher_level": "No 5º nível, o ataque com arma causa +1d8 de dano trovejante e o dano por movimento vira 2d8. Ambos aumentam em 1d8 no 11º nível (2d8 e 3d8) e no 17º nível (3d8 e 4d8).",
  "source": "tasha",
  "classes": ["artifice", "bruxo", "feiticeiro", "mago"]
},
{
  "index": "rompante-de-espadas",
  "name": "Rompante de Espadas",
  "level": 0,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "Pessoal (raio de 1,5m)",
  "components": "V",
  "material": "",
  "duration": "Instantânea",
  "concentration": false,
  "desc": "Você cria um círculo momentâneo de lâminas espectrais que giram ao seu redor. Cada criatura a até 1,5m de você (exceto você) deve ser bem-sucedida numa salvaguarda de Destreza ou sofre 1d6 de dano de energia.",
  "higher_level": "O dano aumenta em 1d6 ao alcançar o 5º nível (2d6), o 11º nível (3d6) e o 17º nível (4d6).",
  "source": "tasha",
  "classes": ["artifice", "bruxo", "feiticeiro", "mago"]
},
{
  "index": "beberagem-caustica",
  "name": "Beberagem Cáustica de Tasha",
  "level": 1,
  "school": "evocação",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "Pessoal (linha de 9m)",
  "components": "V, S, M",
  "material": "um pedaço de comida apodrecida",
  "duration": "Concentração, até 1 minuto",
  "concentration": true,
  "desc": "Um jorro de ácido emana de você numa linha de 9m de comprimento e 1,5m de largura, numa direção à sua escolha. Cada criatura na linha deve ser bem-sucedida numa salvaguarda de Destreza ou fica coberta de ácido pela duração da magia ou até usar sua ação para removê-lo de si ou de outra criatura. Uma criatura coberta sofre 2d4 de dano ácido no começo de cada turno dela.",
  "higher_level": "Ao usar um espaço de 2º círculo ou superior, o dano inicial aumenta em 2d4 para cada círculo acima do 1º.",
  "source": "tasha",
  "classes": ["artifice", "feiticeiro", "mago"]
},
{
  "index": "chicote-mental",
  "name": "Chicote Mental de Tasha",
  "level": 2,
  "school": "encantamento",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "27 metros",
  "components": "V",
  "material": "",
  "duration": "1 rodada",
  "concentration": false,
  "desc": "Você enlaça psiquicamente uma criatura à sua vista dentro do alcance. Ela deve ser bem-sucedida numa salvaguarda de Inteligência. Em caso de falha, sofre 3d6 de dano psíquico e não pode realizar reações até o fim do próximo turno dela; além disso, no próximo turno dela ela só pode fazer uma coisa entre se mover, realizar uma ação ou uma ação bônus. Num sucesso, sofre metade do dano e nenhum outro efeito.",
  "higher_level": "Ao usar um espaço de 3º círculo ou superior, atinge um alvo adicional para cada círculo acima do 2º (os alvos devem estar a até 9m entre si).",
  "source": "tasha",
  "classes": ["feiticeiro", "mago"]
},
{
  "index": "fortaleza-intelectual",
  "name": "Fortaleza Intelectual",
  "level": 3,
  "school": "abjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "9 metros",
  "components": "V",
  "material": "",
  "duration": "Concentração, até 1 minuto",
  "concentration": true,
  "desc": "Pela duração da magia, você ou uma criatura voluntária à sua vista dentro do alcance adquire resistência a dano psíquico e vantagem em salvaguardas de Inteligência, Sabedoria e Carisma.",
  "higher_level": "Ao usar um espaço de 4º círculo ou superior, atinge um alvo adicional para cada círculo acima do 3º (os alvos devem estar a até 9m entre si).",
  "source": "tasha",
  "classes": ["artifice", "bardo", "bruxo", "feiticeiro", "mago"]
},
{
  "index": "mortalha-espiritual",
  "name": "Mortalha Espiritual",
  "level": 3,
  "school": "necromancia",
  "ritual": false,
  "casting_time": "1 ação bônus",
  "range": "Pessoal",
  "components": "V, S",
  "material": "",
  "duration": "Concentração, até 1 minuto",
  "concentration": true,
  "desc": "Você convoca espíritos dos mortos, que flutuam ao seu redor pela duração da magia, intangíveis e invulneráveis. Até o fim da magia, qualquer ataque seu causa +1d8 de dano (gélido, necrótico ou radiante, à sua escolha) ao acertar uma criatura a até 3m de você, e essa criatura não pode recuperar PV até o início do seu próximo turno. Além disso, qualquer criatura à sua escolha em seu campo de visão que comece o turno a até 3m de você tem o deslocamento reduzido em 3m.",
  "higher_level": "Ao usar um espaço de 4º círculo ou superior, o dano extra aumenta em 1d8 para cada 2 círculos acima do 3º.",
  "source": "tasha",
  "classes": ["bruxo", "clerigo", "mago", "paladino"]
},
{
  "index": "disfarce-sobrenatural",
  "name": "Disfarce Sobrenatural de Tasha",
  "level": 6,
  "school": "transmutação",
  "ritual": false,
  "casting_time": "1 ação bônus",
  "range": "Pessoal",
  "components": "V, S, M",
  "material": "um objeto entalhado com o símbolo dos Planos Exteriores",
  "duration": "Concentração, até 1 minuto",
  "concentration": true,
  "desc": "Você extrai a magia dos Planos Inferiores ou Superiores (à sua escolha) e se transforma, ganhando até o fim da magia: imunidade a dano ígneo e venenoso (Inferiores) ou necrótico e radiante (Superiores); imunidade à condição envenenado (Inferiores) ou enfeitiçado (Superiores); asas espectrais com voo 12m; +2 na CA; todos os ataques com arma viram mágicos e podem usar seu atributo de conjuração no lugar de Força/Destreza; e um ataque adicional na ação de Ataque (não acumula com Ataque Extra).",
  "higher_level": "",
  "source": "tasha",
  "classes": ["bruxo", "feiticeiro", "mago"]
},
{
  "index": "sonho-do-veu-azul",
  "name": "Sonho do Véu Azul",
  "level": 7,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "10 minutos",
  "range": "6 metros",
  "components": "V, S, M",
  "material": "um item mágico ou criatura voluntária do mundo de destino",
  "duration": "6 horas",
  "concentration": false,
  "desc": "Você e até oito criaturas voluntárias no alcance caem inconscientes pela duração e vivenciam visões de outro mundo do Plano Material (Oerth, Toril, Krynn, Eberron…). Se a magia durar por completo, todos abrem uma misteriosa cortina azul e são teletransportados a um local seguro a até 1,5 km de onde o item de destino foi criado (ou de onde uma criatura afetada nasceu naquele mundo). Conjurá-la exige um item mágico originário do mundo desejado. Se uma criatura sofrer dano, a magia termina para ela (sem teleporte); se você sofrer dano, termina para todos.",
  "higher_level": "",
  "source": "tasha",
  "classes": ["bardo", "bruxo", "feiticeiro", "mago"]
},
{
  "index": "lamina-do-desastre",
  "name": "Lâmina do Desastre",
  "level": 9,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação bônus",
  "range": "18 metros",
  "components": "V, S",
  "material": "",
  "duration": "Concentração, até 1 minuto",
  "concentration": true,
  "desc": "Você cria um rasgo planar em forma de lâmina de ~1,5m num espaço desocupado à vista dentro do alcance. Ao conjurar — e depois com uma ação bônus a cada turno, podendo antes mover a lâmina até 9m — você faz até dois ataques corpo a corpo com magia contra criaturas, objetos soltos ou estruturas a até 1,5m da lâmina. Em um acerto, 4d12 de dano de energia; o ataque é crítico com 18+ no d20, somando mais 8d12 (total 12d12). A lâmina atravessa inofensivamente qualquer barreira, inclusive muralha de energia.",
  "higher_level": "",
  "source": "tasha",
  "classes": ["bruxo", "feiticeiro", "mago"]
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-spells-pt.json','utf8'));console.log('JSON ok')"` → `JSON ok`.
Run: `npx vitest run src/test/dnd5e/tasha-spells-schema.test.js > /tmp/b1.txt 2>&1; echo "exit=$?"; tail -15 /tmp/b1.txt`
Expected: `exit=0`, todos verdes.

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-spells-pt.json src/test/dnd5e/tasha-spells-schema.test.js
git commit -m "feat(tasha): 11 magias não-invocação do TCE no catálogo"
```

---

### Task 2: 7 magias de invocação (summons)

**Files:**
- Modify: `public/srd-data/tasha-spells-pt.json` (anexar 7 objetos)
- Test: `src/test/dnd5e/tasha-spells-schema.test.js` (adicionar describe)

- [ ] **Step 1: Adicionar o teste falhando**

Acrescentar ao final de `src/test/dnd5e/tasha-spells-schema.test.js` (reusa `expectValidSpell` do escopo do módulo):

```js
describe('tasha-spells — invocações (Task 2)', () => {
  const ESPERADAS = [
    'invocar-fera', 'invocar-feerico', 'invocar-morto-vivo',
    'invocar-prole-sombria', 'invocar-elemental', 'invocar-celestial',
    'invocar-corruptor',
  ]
  for (const idx of ESPERADAS) {
    it(`${idx} presente e válida`, () => expectValidSpell(idx))
  }
  it('toda invocação é escola conjuração ou necromancia e concentração=true', () => {
    for (const idx of ESPERADAS) {
      const s = byIndex[idx]
      expect(['conjuração', 'necromancia']).toContain(s.school)
      expect(s.concentration, `${idx} deveria ser concentração`).toBe(true)
    }
  })
})
```

Nota: `byIndex` e `expectValidSpell` já estão no escopo do módulo (definidos na Task 1). O teste será re-lido do arquivo JSON a cada run, então as 7 novas entradas aparecem assim que forem adicionadas.

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/test/dnd5e/tasha-spells-schema.test.js > /tmp/b2.txt 2>&1; echo "exit=$?"; tail -25 /tmp/b2.txt`
Expected: FAIL (as 7 invocações ainda não existem).

- [ ] **Step 3: Anexar as 7 invocações ao array**

Adicione vírgula após `lamina-do-desastre` e cole antes do `]` final:

```json
{
  "index": "invocar-fera",
  "name": "Invocar Fera",
  "level": 2,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "18 metros",
  "components": "V",
  "material": "",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito feral, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito Feral. Ao conjurar, escolha um ambiente: Ar, Terra ou Água — define algumas características. A criatura é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito Feral (Fera): CA 11 + círculo da magia; PV 20 (Ar) ou 30 (Terra e Água) + 5 por círculo acima do 2º; deslocamento 9m (voo 18m só Ar, escalada 9m só Terra, natação 9m só Água). Ataques Múltiplos = metade do círculo. Mandíbulas (1d8+4+círculo perfurante). Ar tem Sobrevoo; Terra/Água têm Tática de Matilha.",
  "higher_level": "Ao usar um espaço de 3º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["druida", "patrulheiro"]
},
{
  "index": "invocar-feerico",
  "name": "Invocar Feérico",
  "level": 3,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "27 metros",
  "components": "V, S, M",
  "material": "uma flor feita de ouro no valor de 300 po",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito feérico, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito Feérico. Ao conjurar, escolha um humor: Irritadiço, Jubiloso ou Brincalhão. A criatura é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito Feérico (Feérico Pequeno): CA 12 + círculo da magia; PV 30 + 10 por círculo acima do 3º; deslocamento 12m. Ataques Múltiplos = metade do círculo. Espada Curta (1d6+6+círculo de energia). Ação bônus Passo Feérico (teleporte 9m + efeito do humor: Irritadiço = vantagem no próximo ataque; Jubiloso = enfeitiça um alvo a 3m; Brincalhão = cria escuridão mágica num cubo de 1,5m).",
  "higher_level": "Ao usar um espaço de 4º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["bruxo", "druida", "patrulheiro", "mago"]
},
{
  "index": "invocar-morto-vivo",
  "name": "Invocar Morto-Vivo",
  "level": 3,
  "school": "necromancia",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "27 metros",
  "components": "V, S, M",
  "material": "um crânio de ouro no valor de 300 po",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito morto-vivo, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito Morto-Vivo. Ao conjurar, escolha a forma: Fantasmal, Pútrido ou Esquelético. A criatura é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito Morto-Vivo (Morto-Vivo Médio): CA 11 + círculo da magia; PV 30 (Fantasmal/Pútrido) ou 20 (Esquelético) + 10 por círculo acima do 3º; deslocamento 9m (voo 12m só Fantasmal); imune a necrótico e venenoso. Ataques Múltiplos = metade do círculo. Fantasmal (Toque Mortal 1d10+3+círculo necrótico + medo); Esquelético (Virote do Túmulo à distância 2d4+3+círculo necrótico); Pútrido (Garra Apodrecida 1d6+3+círculo cortante, pode paralisar alvo envenenado).",
  "higher_level": "Ao usar um espaço de 4º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["bruxo", "mago"]
},
{
  "index": "invocar-prole-sombria",
  "name": "Invocar Prole Sombria",
  "level": 3,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "18 metros",
  "components": "V",
  "material": "",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito sombrio, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito das Sombras. Ao conjurar, escolha uma emoção: Fúria, Desespero ou Medo. A criatura é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito das Sombras (Monstruosidade Média): CA 11 + círculo da magia; PV 35 + 15 por círculo acima do 3º; deslocamento 12m; imune a necrótico e à condição amedrontado. Ataques Múltiplos = metade do círculo. Rasgo Congelante (1d12+3+círculo gélido); Grito Pavoroso (1/dia, amedronta a 9m). Fúria = vantagem contra amedrontados; Desespero = reduz deslocamento alheio; Medo = Furtividade Sombria.",
  "higher_level": "Ao usar um espaço de 4º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["bruxo", "mago"]
},
{
  "index": "invocar-elemental",
  "name": "Invocar Elemental",
  "level": 4,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "27 metros",
  "components": "V, S, M",
  "material": "ar, um cascalho, cinzas e água num frasco banhado a ouro no valor de 400 po",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito elemental, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito Elemental. Ao conjurar, escolha um elemento: Ar, Água, Terra ou Fogo. A criatura é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito Elemental (Elemental Médio): CA 11 + círculo da magia; PV 50 + 10 por círculo acima do 4º; deslocamento 12m (voo 12m Ar, escavação 12m Terra, natação 12m Água); imune a venenoso (e ígneo só Fogo). Ataques Múltiplos = metade do círculo. Pancada (1d10+4+círculo contundente, ou ígneo se Fogo). Água/Ar/Fogo têm Forma Amorfa.",
  "higher_level": "Ao usar um espaço de 5º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["druida", "patrulheiro", "mago"]
},
{
  "index": "invocar-celestial",
  "name": "Invocar Celestial",
  "level": 5,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "27 metros",
  "components": "V, S, M",
  "material": "um relicário de ouro no valor mínimo de 500 po",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito celestial, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito Celestial. Ao conjurar, escolha Vingador ou Defensor — define o ataque da criatura. Ela é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito Celestial (Celestial Grande): CA 11 + círculo da magia (+2 só Defensor); PV 40 + 10 por círculo acima do 5º; deslocamento 9m, voo 12m; resistência a radiante; imune a amedrontado e enfeitiçado. Ataques Múltiplos = metade do círculo. Vingador (Disparo Radiante à distância 2d6+2+círculo radiante); Defensor (Golpe Radiante 1d10+3+círculo radiante + concede PV temporários). Toque Curativo 1/dia (cura 2d8+círculo).",
  "higher_level": "Ao usar um espaço de 6º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["clerigo", "paladino"]
},
{
  "index": "invocar-corruptor",
  "name": "Invocar Corruptor",
  "level": 6,
  "school": "conjuração",
  "ritual": false,
  "casting_time": "1 ação",
  "range": "27 metros",
  "components": "V, S, M",
  "material": "sangue humanoide num frasco de rubi no valor de 600 po",
  "duration": "Concentração, até 1 hora",
  "concentration": true,
  "desc": "Você convoca um espírito corruptivo, que se manifesta num espaço desocupado à sua vista dentro do alcance, usando o bloco de estatísticas do Espírito Corruptivo. Ao conjurar, escolha Diabo, Demônio ou Yugoloth. A criatura é aliada a você e seus companheiros, age logo após seu turno na sua iniciativa e obedece a seus comandos verbais. Espírito Corruptivo (Corruptor Grande): CA 12 + círculo da magia; PV 50 (Demônio) / 40 (Diabo) / 60 (Yugoloth) + 15 por círculo acima do 6º; deslocamento 12m (escalada 12m Demônio, voo 12m Diabo); resistência a ígneo, imune a venenoso; Resistência à Magia. Ataques Múltiplos = metade do círculo. Demônio (Mordida 1d12+3+círculo necrótico, Espasmos de Morte ao morrer); Yugoloth (Garras 1d8+3+círculo cortante + teleporte 9m); Diabo (Arremessar Chamas à distância 2d6+3+círculo ígneo).",
  "higher_level": "Ao usar um espaço de 7º círculo ou superior, use o círculo mais alto sempre que o bloco de estatísticas referenciar o círculo da magia.",
  "source": "tasha",
  "classes": ["bruxo", "mago"]
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-spells-pt.json','utf8'));console.log('JSON ok')"` → `JSON ok`.
Run: `npx vitest run src/test/dnd5e/tasha-spells-schema.test.js > /tmp/b2.txt 2>&1; echo "exit=$?"; tail -15 /tmp/b2.txt`
Expected: `exit=0`, todos verdes (o arquivo agora tem 21 magias).

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/tasha-spells-pt.json src/test/dnd5e/tasha-spells-schema.test.js
git commit -m "feat(tasha): 7 magias de invocação do TCE no catálogo"
```

---

### Task 3: Composição/filtro por classe + bump de cache + verificação

**Files:**
- Create: `src/test/dnd5e/tasha-spells-composition.test.js`
- Modify: `vite.config.js` (cacheName `srd-data-vN`)

- [ ] **Step 1: Escrever o teste de composição falhando**

Criar `src/test/dnd5e/tasha-spells-composition.test.js` — verifica que, ao concatenar PHB+Tasha (como o `SrdProvider` faz no COMPOSED `spells`), as magias novas surgem no filtro por classe que o `useClassSpells` aplica (`s.classes.includes(classIndex)`):

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-spells-pt.json'), 'utf-8'))
const base = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-spells-pt.json'), 'utf-8'))

// Espelha o COMPOSED.spells do SrdProvider: concat PHB + Tasha.
const all = [...base, ...tasha]
const forClass = cls => all.filter(s => s.classes?.includes(cls)).map(s => s.index)

describe('composição PHB+Tasha — magias novas aparecem na classe certa', () => {
  it('o catálogo Tasha tem 21 magias e o composto não tem index duplicado', () => {
    expect(tasha).toHaveLength(21)
    const seen = new Set()
    for (const s of all) { expect(seen.has(s.index), `dup: ${s.index}`).toBe(false); seen.add(s.index) }
  })
  it('patrulheiro recebe as invocações de fera/feérico/elemental', () => {
    const p = forClass('patrulheiro')
    for (const i of ['invocar-fera', 'invocar-feerico', 'invocar-elemental']) expect(p).toContain(i)
  })
  it('clérigo/paladino recebem Invocar Celestial e Mortalha Espiritual', () => {
    expect(forClass('clerigo')).toContain('invocar-celestial')
    expect(forClass('paladino')).toContain('mortalha-espiritual')
  })
  it('artífice recebe os truques de lâmina/chicote e Beberagem Cáustica', () => {
    const a = forClass('artifice')
    for (const i of ['lamina-estrondosa', 'chicote-eletrico', 'beberagem-caustica']) expect(a).toContain(i)
  })
  it('mago recebe Lâmina do Desastre (9º) e Sonho do Véu Azul (7º)', () => {
    const m = forClass('mago')
    expect(m).toContain('lamina-do-desastre')
    expect(m).toContain('sonho-do-veu-azul')
  })
})
```

- [ ] **Step 2: Rodar e confirmar passa**

Run: `npx vitest run src/test/dnd5e/tasha-spells-composition.test.js > /tmp/b3.txt 2>&1; echo "exit=$?"; tail -15 /tmp/b3.txt`
Expected: `exit=0`, verdes (os dados já existem das Tasks 1-2; este teste documenta a composição).

- [ ] **Step 3: Localizar e bumpar o cacheName**

Run: `grep -n "srd-data-v" vite.config.js`
Expected: `cacheName: 'srd-data-v12'` (valor pós-balde A). Edite para `'srd-data-v13'`. (Se o grep mostrar outro N, use N+1 e ajuste a mensagem de commit.)

- [ ] **Step 4: Suíte completa + build**

Run: `npx vitest run > /tmp/full.txt 2>&1; echo "exit=$?"; tail -20 /tmp/full.txt`
Expected: `exit=0`. Se falhar SÓ em `LoginScreen`/`ResetPasswordScreen` por timeout, é flake conhecido — re-rode isolado pra confirmar.

Run: `npm run build > /tmp/build.txt 2>&1; echo "exit=$?"; tail -12 /tmp/build.txt`
Expected: `exit=0`, build limpo (o aviso de chunk >500 kB é pré-existente).

- [ ] **Step 5: Commit**

```bash
git add src/test/dnd5e/tasha-spells-composition.test.js vite.config.js
git commit -m "test(tasha): composição/filtro por classe das magias + bump cache v12->v13"
```

---

## Self-Review

- **Spec coverage:** 18 magias novas → Task 1 (11 não-invocação) + Task 2 (7 invocações); tagging por classe da tabela do TCE embutido em cada `classes`; composição/cache/verificação na Task 3. ✓
- **Escola Invocação→conjuração:** aplicado a rompante-de-espadas, sonho-do-veu-azul, lamina-do-desastre e às 5 invocações de conjuração; invocar-morto-vivo e mortalha-espiritual são `necromancia`. Consistente com as 2 invocações já existentes. ✓
- **GOTCHA de nível** (Prole Sombria = 3, não 8) tratado explicitamente. ✓
- **Concentração das invocações** vem da coluna da tabela (todas "Sim" = true), mesmo quando o bloco de descrição omitiu "Concentração" (Fera/Prole). ✓
- **Sem colisão** com catálogo base (testado na Task 1) e sem duplicar as 3 já existentes (índices distintos). ✓
- **Placeholders:** todo o JSON e os testes estão completos; `higher_level: ""` é intencional para as magias de nível fixo (Disfarce/Sonho/Lâmina do Desastre). ✓
- **Fora de escopo (balde C):** listas "Magias Adicionais" por classe/subclasse que adicionam magias *existentes* a uma lista — não tocadas aqui. ✓
