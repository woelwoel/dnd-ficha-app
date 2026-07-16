# Spec — Magias concedidas por talentos

**Data:** 2026-07-15
**Status:** aprovada pelo dono (design revisado em conversa)

## Contexto e problema

11 talentos do catálogo (PHB, Tasha, Xanathar) concedem magias — fixas
("aprende Passo Nebuloso") ou por escolha ("uma magia de 1º círculo de
Adivinhação ou Encantamento"). Hoje **nenhum** está implementado: o talento
entra em `info.feats`, o `attrBonus` é aplicado, mas as magias não aparecem
em lugar nenhum e não há UI pra escolher as que exigem escolha. Caso real que
motivou: Humano Variante com Tocado pelas Fadas — o +1 funciona, o Passo
Nebuloso não existe na ficha.

O molde arquitetural é o motor de magias por subclasse
(`src/systems/dnd5e/domain/subclassSpells.js`): declaração no domínio,
injeção na criação (`injectSubclassSpellsAtBuild`) e no level-up
(`enrichWithSubclassSpells`), rótulo de origem, `alwaysPrepared`.

## Escopo — os 11 talentos

| Talento | Fonte | Atributo | Concede |
|---|---|---|---|
| Tocado pelas Fadas | tasha | `chosenAttr` | fixa `passo-nebuloso` (freeCast long, slots always) + escolhe 1 de 1º círculo, escolas adivinhação/encantamento (freeCast long, slots always) |
| Tocado pelas Sombras | tasha | `chosenAttr` | fixa `invisibilidade` (freeCast long, slots always) + escolhe 1 de 1º círculo, escolas ilusão/necromancia (freeCast long, slots always) |
| Iniciado em Magia | phb | `byList` | escolhe classe (bardo/bruxo/clérigo/druida/feiticeiro/mago) → 2 truques da lista + 1 magia de 1º da lista (freeCast long, slots **classMatch** — Sage Advice) |
| Iniciado Artífice | tasha | `int` | escolhe 1 truque de artífice + 1 magia de 1º de artífice (freeCast long, slots always — texto explícito) |
| Conjurador de Ritual | phb | `byList` | escolhe classe → 2 magias de 1º com descritor ritual (**ritualOnly**: sem slot, sem freeCast, sem tracker) |
| Atirador de Magia | phb | `byList` | escolhe classe (**só bruxo/druida/feiticeiro/mago** — ver nota) → 1 truque de **ataque** (derivado de `spell-mechanics attack: true`) |
| Magia do Elfo da Floresta | xanathar | `wis` | escolhe 1 truque de druida + fixas `passos-longos` e `passar-sem-rastro` (cada uma freeCast long, slots never) |
| Telepático | tasha | `chosenAttr` | fixa `detectar-pensamentos` (freeCast long, slots always) |
| Telecinético | tasha | `chosenAttr` | fixa `maos-magicas` (truque, à vontade por natureza) |
| Teleporte das Fadas | xanathar | `int` | fixa `passo-nebuloso` (freeCast **short**, slots never) |
| Alta Magia Drow | xanathar | `cha` | fixa `detectar-magia` (**atWill**) + fixas `levitacao` e `dissipar-magia` (cada uma freeCast long, slots never) |

**Fora de escopo** (permanece como prosa no card do talento): proficiência em
ferramenta (Iniciado Artífice), idioma silvestre (Teleporte das Fadas),
telepatia 18m (Telepático), empurrão telecinético e mão invisível
(Telecinético), adicionar rituais encontrados ao livro (Conjurador de
Ritual), invocação do Adepto Místico, dobro de alcance/ignorar cobertura
(Atirador de Magia).

**Bug de dados correlato, fora de escopo:** `passar-sem-rastro` e
`passos-sem-pegadas` são a MESMA magia duplicada no `phb-spells-pt.json`
(task separada já sinalizada). Este projeto usa o índice `passar-sem-rastro`.

## Arquitetura

### 1. Motor — `src/systems/dnd5e/domain/featSpells.js`

Módulo JS no domínio (sem JSON novo → **sem bump de SW cache**). Declaração
por talento:

```js
export const FEAT_SPELL_GRANTS = {
  'tocado-pelas-fadas': {
    ability: 'chosenAttr',   // 'chosenAttr' | 'byList' | 'str'...'cha'
    grants: [
      { fixed: 'passo-nebuloso', freeCast: 'long', slots: 'always' },
      { choose: { count: 1, level: 1, schools: ['adivinhação', 'encantamento'] },
        freeCast: 'long', slots: 'always' },
    ],
  },
  'iniciado-em-magia': {
    ability: 'byList',
    pickList: ['bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'mago'],
    grants: [
      { choose: { count: 2, level: 0, fromList: true } },
      { choose: { count: 1, level: 1, fromList: true },
        freeCast: 'long', slots: 'classMatch' },
    ],
  },
  'conjurador-de-ritual': {
    ability: 'byList',
    pickList: ['bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'mago'],
    grants: [
      { choose: { count: 2, level: 1, ritual: true, fromList: true },
        ritualOnly: true },
    ],
  },
  'alta-magia-drow': {
    ability: 'cha',
    grants: [
      { fixed: 'detectar-magia', atWill: true },
      { fixed: 'levitacao',      freeCast: 'long', slots: 'never' },
      { fixed: 'dissipar-magia', freeCast: 'long', slots: 'never' },
    ],
  },
  // ... demais talentos conforme a tabela acima
}
```

Predicados de `choose`: `level` (exato), `schools[]`, `fromList` (a lista da
classe em `pickList` escolhida, via campo `classes` do catálogo), `ritual`,
`attack` (lê `spell-mechanics-pt.json` — `attack: true` E `level === 0`).

**Nota — `pickList` só oferece listas satisfazíveis.** RAW, o Atirador de
Magia lista as seis classes conjuradoras, mas bardo e clérigo não têm
truque com jogada de ataque (Chama Sagrada e Escárnio Viciante são
salvaguarda), nem no catálogo nem no livro. Como o grant é `count: 1`,
oferecer essas listas criaria um beco sem saída permanente no gate. A
`pickList` do Atirador é `['bruxo','druida','feiticeiro','mago']`. As
`pickList` de Iniciado em Magia e Conjurador de Ritual continuam com as
seis (todas satisfazíveis; feiticeiro tem exatamente 2 rituais de 1º, o
mínimo pro `count: 2`).

**Nota — dois espaços de índice sobre `grants`.** `spellChoices.picks` é
indexado por ORDINAL entre os grants `choose`; `featGrant` (persistido) e
`resolveFeatSpellOptions(featIndex, grantIdx)` usam a posição ABSOLUTA em
`grants`. Eles divergem sempre que uma fixa vem antes de um choose
(Tocado pelas Fadas/Sombras). O helper exportado `getChooseGrants(featIndex)`
→ `[{ grantIdx, ordinal, choose, grant }]` é o ÚNICO lugar que computa o
ordinal; todo consumidor (gate, injeção, picker) passa por ele.

`ability` resolve em três modos:
- `'chosenAttr'` → o atributo que o próprio talento aumentou (`chosenAttr`
  do feat em `info.feats`);
- literal (`'int'`, `'wis'`, `'cha'`) → fixo;
- `'byList'` → mapa da classe escolhida: mago→int, clérigo/druida→wis,
  bardo/bruxo/feiticeiro→cha.

API pública:
- `getFeatSpellDef(featIndex)` → declaração ou null;
- `getChooseGrants(featIndex)` → `[{ grantIdx, ordinal, choose, grant }]`
  (único lugar que computa o ordinal — ver nota acima);
- `resolveFeatSpellOptions(featIndex, grantIdx, { list, srdSpells, spellMechanics })`
  → candidatas do picker. `grantIdx` é ABSOLUTO em `grants`. **Lança** se o
  grant tem `attack: true` e `spellMechanics` não veio — o dataset é `lazy`
  no SrdProvider, então lista vazia silenciosa seria indistinguível de
  "nenhuma opção válida" na UI. Quem chama gate no dataset, não no `[]`;
- `injectFeatSpells(character, srdSpells)` → injeta as magias de todos os
  talentos com merge idempotente (usado no build E no retrofit do plano 2);
- `isFeatSpellChoiceComplete(featIndex, spellChoices)` → gating;
- `getCastPolicy(spell, character)` → `{ slots: bool, ritualOnly: bool,
  atWill: bool, freeCast: [{ recharge, trackerId }] }` resolvido AO VIVO
  (classMatch reavaliado a cada render — multiclassar depois muda o
  resultado). União sobre `featGrants` — ver nota do modelo de dados. Lança
  em política de `slots` desconhecida (erro de declaração); `featGrant`
  órfão (declaração editada, ficha salva) é ignorado com warn em DEV, e se
  TODOS forem órfãos retorna null.

### 2. Modelo de dados

**Draft do wizard** (`racialFeat` e `asiChoices[lvl]`/`mc.asiChoices[lvl]`)
ganha `featSpellChoices`:

```js
{ featIndex, featName, featAttrBonus, featChosenAttr,
  featSpellChoices: { list: 'mago' | null, picks: [['luz','raio-de-fogo'], ['escudo-arcano']] } }
```

`picks[i]` alinha posicionalmente com o i-ésimo grant `choose` do talento.
Trocar de talento reconstrói o objeto → escolhas antigas morrem (comportamento
atual do `selectFeat`, agora coberto por teste).

**Persistido** em `info.feats[]`:

```js
{ index, name, takenAtLevel, chosenAttr,
  spellChoices: { list, picks } }
```

**Magia injetada** em `spellcasting.spells[]` — campos novos:

```js
{ ...mapSrdSpellToCharacter(srd),
  source: 'feat',
  sourceLabel: 'Talento: Tocado pelas Fadas',
  featGrants: [                       // proveniência: LISTA, não escalar
    { featIndex: 'tocado-pelas-fadas', featGrant: 0 },
  ],
  ability: 'cha',                     // resolvido na injeção (estável)
  alwaysPrepared: true, prepared: true }
```

Regras de conjuração (freeCast/atWill/ritualOnly/slots) **NÃO** são
persistidas na magia — derivam ao vivo de `featGrants` via `getCastPolicy`.
Mudança futura na declaração corrige fichas existentes de graça; o doc do
personagem guarda só escolhas e proveniência.

**Por que `featGrants` é lista (e não `featIndex`/`featGrant` escalares).**
Dois talentos podem conceder a MESMA magia com políticas diferentes, em
builds legais:

- `passo-nebuloso` — `tocado-pelas-fadas` (slots sim, grátis 1×/longo) +
  `teleporte-das-fadas` (slots não, grátis 1×/**curto**): alto elfo com os
  dois talentos.
- `detectar-magia` — `alta-magia-drow` (à vontade) + `tocado-pelas-fadas`
  escolhendo ela (é adivinhação de 1º): drow com os dois talentos.

Com proveniência escalar, a política vira dependente da ORDEM em
`info.feats`, e uma das ordens viola a regra (o jogador perde o "você também
pode conjurar usando espaço de magia" que o Tocado pelas Fadas concede
explicitamente). `getCastPolicy` faz a **união**: `slots` e `atWill` são OR,
`ritualOnly` é AND (só é ritual-only se TODA concessão for), e `freeCast` é
uma LISTA — cada concessão tem seu tracker independente (o alto elfo tem
genuinamente dois Passos Nebulosos grátis: um por descanso curto, um por
longo). A união é comutativa por construção.

### 3. Atributo de conjuração por magia

Cascata de resolução, por linha de magia:

```
spell.ability ?? spellcasting.abilitiesByClass[classe da magia] ??
spellcasting.ability ?? atributo da classe (SRD)
```

- CD e bônus de ataque calculados por magia em `Spells.jsx` (e caminho v2,
  que reutiliza o mesmo componente — verificar no plano);
- o ctx de `spellRollPlan` em `handleCast` (`spellAttack`, `spellMod`,
  `spellDC`) passa a ser derivado da magia clicada, não global;
- o cabeçalho da aba (CD/ataque geral) continua usando o atributo da classe;
- linha de magia cujo `ability` difere do global exibe um badge — sem isso a
  CD divergente ficaria invisível pro jogador (necessidade de UX incluída no
  design, não pedida pelo dono). **O badge só afirma número quando existe
  um**, lendo `spell-mechanics-pt.json`:
  - tem salvaguarda → `CD 13 · CAR`
  - tem jogada de ataque → `+5 · CAR`
  - nenhum dos dois → só `CAR`

  O terceiro caso não é hipotético: é o Passo Nebuloso, a magia-símbolo
  deste projeto. Teleporte não tem rolagem, e a versão anterior desta spec
  mandava exibir "CD 13 · CAR" nele — o jogador leria que Passo Nebuloso tem
  CD 13. Badge não renderiza se `abbrOfKey(ability)` não resolver (dado
  corrompido não vira separador solto). Durante o load do `spellMechanics`
  (lazy) o badge degrada pro caso 3 e se corrige sozinho.

Resolve o caso crítico: Guerreiro com Tocado pelas Fadas rolava CD 10
(sem `spellcasting.ability`); agora rola com o atributo do talento.

### 4. UI — `FeatSpellPicker`

Componente novo, inline, renderizado pelos DOIS pickers de talento
(`CharacterWizardV2/blocks/FeatPicker.jsx` e
`CharacterSheet/levelProgression/FeatPicker.jsx`), logo abaixo da
sub-escolha de atributo:

- fixas → chips read-only ("Passo Nebuloso ✓");
- `pickList` → botões de classe primeiro; listas só aparecem após escolher;
- cada grant `choose` → bloco com busca + contador ("2 de 2 truques");
- lista vazia nunca deve acontecer (as `pickList` só oferecem listas
  satisfazíveis — ver nota do Atirador de Magia); se acontecer mesmo assim,
  mostrar mensagem explícita em vez de lista muda.

**Gating**: `isASIChoiceComplete` (class-helpers) e o caso `race` do
`useBlockStatus` passam a exigir `isFeatSpellChoiceComplete` — mesmo
mecanismo que hoje trava sem o `featChosenAttr`.

### 5. Injeção

Três pontos, todos com merge idempotente:

1. **Criação**: `injectFeatSpells(character, srdSpells)` no wrapper de
   `build-character.js`, DEPOIS de `injectSubclassSpellsAtBuild` (a ordem
   importa: inverter faria a magia do juramento do paladino ser rotulada
   como "Talento:"). Lê `info.feats` (que já agrega talento racial + ASIs
   primário + ASIs de multiclasse).
2. **Level-up**: `enrichWithFeatSpells({ patch, character, srdSpells })`
   alimentando `bonusSpells` (magias novas) e `featSpellMerges` (magias já
   conhecidas), ambos consumidos pelo `applyLevelUp`.
   **DIFERENÇA do irmão de subclasse**: NÃO retorna cedo quando
   `multiclassIndex != null` — ASI de multiclasse também vira talento.
   O `existing` do enrich enxerga `character.spellcasting.spells` **E**
   `patch.bonusSpells`: o enrich de subclasse roda ANTES e pode ter posto a
   mesma magia lá; sem isso a ref do talento se perderia no `uniqueBy`
   (first-wins) do `applyLevelUp`.

   **Estado do level-up até o plano 2**: o patch do `LevelUpPanel` carrega
   `featChosenAttr` mas ainda NÃO carrega `featSpellChoices` (o picker é do
   plano 2). Degradação é limpa e intencional: os 5 talentos de magia FIXA
   (Telepático, Telecinético, Teleporte das Fadas, Alta Magia Drow, Magia do
   Elfo da Floresta) já funcionam ponta a ponta no level-up; os 4 que exigem
   escolha (Iniciado em Magia, Conjurador de Ritual, Atirador de Magia,
   Iniciado Artífice) não injetam nada até o picker existir. Tocado pelas
   Fadas/Sombras injetam só a fixa.
3. **Retrofit** (ficha existente): ver §6.

**Merge, nunca skip**: se a magia já existe em `spellcasting.spells`
(ex.: Passo Nebuloso via Juramento de Vingança + Tocado pelas Fadas), a
entrada existente ganha a referência **anexada** a `featGrants` em vez de ser
duplicada ou de a concessão ser descartada. O free cast do talento continua
funcionando sobre a entrada única.

**`ability` só na magia que o talento CRIA** — nunca no merge. Chave é
proveniência, não ausência: `mapSrdSpellToCharacter` nunca grava `ability`,
então "ausente" é sempre verdadeiro e carimbar no merge trocaria a CD de
magia que o jogador já tinha por outra fonte. Um bardo com Enfeitiçar Pessoa
(CAR) que pega Tocado pelas Fadas com INT continua conjurando pela CAR; só o
Guerreiro, cujo Passo Nebuloso o talento criou do zero, carrega o `ability`
do talento — que é exatamente o bug da CD 10 que este projeto conserta.

**Anexar, não sobrescrever**: quando um SEGUNDO talento concede uma magia
que já tem `featGrants`, a referência nova é ACRESCENTADA à lista (sem
duplicar o par `featIndex`+`featGrant`). É o que torna a união do
`getCastPolicy` alcançável — sobrescrever recriaria o bug de ordem.

### 6. Retrofit na ficha (fichas já salvas)

Na seção "Talentos" da `FeaturesTab`, cada talento cujo `index` tem
declaração em `featSpells.js` E cuja concessão está pendente
(`spellChoices` incompleto OU magias concedidas ausentes de
`spellcasting.spells`) mostra aviso + botão:

- talento com escolha → "Escolher magias" abre modal pergaminho (pilha de
  Esc existente) com o mesmo `FeatSpellPicker`; salvar grava
  `info.feats[].spellChoices` e injeta (merge);
- talento só com fixas (Telepático, Telecinético, Teleporte das Fadas,
  Alta Magia Drow) → "Adicionar magias", um clique injeta.

Decisão do dono: retrofit explícito via botão, sem migração automática.
É o caminho que conserta o personagem que motivou o projeto.

### 7. Conjuração especial (plano 3)

**Trackers 1×/descanso** — nova seção em `defaultClassFeatureUses` (fora do
laço de classes), lendo `info.feats` + declarações:

```js
{ id: 'feat-tocado-pelas-fadas-passo-nebuloso',
  name: 'Passo Nebuloso (Tocado pelas Fadas)',
  max: 1, used: 0, recharge: 'long', source: 'feat' }
```

- um tracker por CONCESSÃO com `freeCast` (o texto diz "a mesma magia" —
  contadores independentes); id = `feat-<talento>-<magia>`, estável porque a
  escolha é permanente. Uma magia concedida por dois talentos gera DOIS
  trackers — é exatamente o que `getCastPolicy` devolve em `freeCast[]`;
- Teleporte das Fadas → `recharge: 'short'`;
- `atWill` e `ritualOnly` e truques NÃO geram tracker;
- invariantes existentes preservadas: `mergeFeatureUses` mantém `used`,
  `resolveFeatureUseList` preserva persistidos.

**Na linha da magia** (`SpellRow`), conforme `getCastPolicy`:

- um botão "1×/descanso" POR entrada de `freeCast[]` com tracker disponível
  — gasta o tracker, não o slot. Normalmente é zero ou um; o alto elfo com
  Tocado pelas Fadas + Teleporte das Fadas vê dois (curto e longo);
- botões de slot escondidos quando `slots` resolve false (`'never'`, ou
  `'classMatch'` sem classe correspondente) e quando `ritualOnly`;
- botão "à vontade" (conjura sem gastar nada) quando `atWill`;
- `ritualOnly` → apenas o caminho de ritual.

**Limite conhecido do `ritualOnly`** (aceito neste escopo): ele expressa a
RESTRIÇÃO ("só como ritual"), não a CAPACIDADE ("dá pra ritualizar"). Uma
magia vinda do Conjurador de Ritual E do Iniciado em Magia volta
`ritualOnly: false` — correto pra esconder/mostrar os botões de slot, que é
tudo que a UI precisa hoje. Se algum dia o ritual virar botão próprio, isso
pede um `ritual: bool` separado ao lado do `ritualOnly`.

## Fatiamento em 3 planos

1. **Motor + atributo por magia + injeção** — `featSpells.js` completo (11
   talentos), campo `ability` + cascata de CD/ataque por linha, injeção na
   criação e no level-up (merge + multiclasse). Entrega: magias fixas
   aparecem e rolam com CD certa em personagens novos e level-ups.
2. **Pickers + gating + retrofit** — `FeatSpellPicker` inline nos dois
   FeatPickers (usando `getChooseGrants` pros dois índices), gating no
   wizard (`useBlockStatus`/`isASIChoiceComplete`) e no level-up, botão de
   retrofit na FeaturesTab. Entrega: escolhas funcionam em todo lugar; o
   personagem do dono é consertado aqui.
3. **Conjuração especial** — trackers, botão 1×/descanso, à vontade,
   ritual-only, política de slots. Entrega: os 11 talentos jogáveis por
   regra, incluindo não-conjuradores.

Cada plano mergeia na master e deploya sozinho.

## Testes

- **Domínio** (`featSpells.test.js`): cada predicado (schools, fromList,
  ritual, attack); os 3 modos de `ability`; completude
  (`isFeatSpellChoiceComplete`) por talento; `getCastPolicy` incluindo
  classMatch positivo/negativo e reavaliação após multiclasse; guard-rail
  congelando o conjunto derivado de truques de ataque (detecta mudança no
  spell-mechanics).
- **Injeção**: build injeta com `ability` correto; level-up injeta em
  classe primária E multiclasse; merge quando a magia já existe (caso
  Paladino Vingança + Fey Touched); idempotência do retrofit.
- **Componente** (`FeatSpellPicker.test.jsx`): escolher classe filtra
  listas; contador trava no limite; trocar talento reseta escolhas; lista
  vazia mostra mensagem.
- **Integração**: Guerreiro + Tocado pelas Fadas → Passo Nebuloso na ficha
  com CD derivada de CAR (não 10); gating do bloco Raça exige a magia;
  tracker gasta e recarrega no descanso longo; Iniciado em Magia sem a
  classe correspondente não mostra botões de slot.

## GOTCHAs e restrições

- **Sem bump de SW**: nenhuma mudança em `public/srd-data`.
- `enrichWithFeatSpells` NÃO copia o guard de `multiclassIndex` do irmão.
- Política de conjuração deriva ao vivo — nunca persistir
  freeCast/slots/atWill na magia.
- Elfo da Floresta usa o índice `passar-sem-rastro` (não
  `passos-sem-pegadas`, duplicata a ser removida em task separada).
- O catálogo cobre todos os filtros hoje: 21 candidatas Fey Touched, 9
  Shadow Touched, 13 rituais de 1º, 14 truques de artífice, 9 truques de
  ataque, 10 fixas presentes.
