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
| Atirador de Magia | phb | `byList` | escolhe classe → 1 truque de **ataque** (derivado de `spell-mechanics attack: true`) |
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

`ability` resolve em três modos:
- `'chosenAttr'` → o atributo que o próprio talento aumentou (`chosenAttr`
  do feat em `info.feats`);
- literal (`'int'`, `'wis'`, `'cha'`) → fixo;
- `'byList'` → mapa da classe escolhida: mago→int, clérigo/druida→wis,
  bardo/bruxo/feiticeiro→cha.

API pública:
- `getFeatSpellDef(featIndex)` → declaração ou null;
- `resolveFeatSpellOptions(def, grantIdx, { list, srdSpells, spellMechanics })`
  → candidatas do picker;
- `getFeatSpellGrants(feat, srdSpells)` → lista resolvida de magias a
  injetar (fixas + escolhidas), com `ability` resolvido;
- `isFeatSpellChoiceComplete(featIndex, spellChoices)` → gating;
- `getCastPolicy(spell, character)` → `{ slots: bool, freeCast, atWill,
  ritualOnly }` resolvido AO VIVO (classMatch reavaliado a cada render —
  multiclassar depois muda o resultado).

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
  featIndex: 'tocado-pelas-fadas',   // proveniência → política de conjuração
  featGrant: 0,                       // posição do grant na declaração
  ability: 'cha',                     // resolvido na injeção (estável)
  alwaysPrepared: true, prepared: true }
```

Regras de conjuração (freeCast/atWill/ritualOnly/slots) **NÃO** são
persistidas na magia — derivam ao vivo de `featIndex`+`featGrant` via
`getCastPolicy`. Mudança futura na declaração corrige fichas existentes de
graça; o doc do personagem guarda só escolhas e proveniência.

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
- linha de magia cujo `ability` difere do global exibe a CD própria
  (ex.: "CD 14 · CAR") — sem isso a CD divergente ficaria invisível pro
  jogador (necessidade de UX incluída no design, não pedida pelo dono).

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
- lista vazia (ex.: Atirador de Magia + clérigo, que não tem truque de
  ataque no catálogo) → mensagem explícita "esta classe não tem truque de
  ataque no catálogo", nunca lista muda.

**Gating**: `isASIChoiceComplete` (class-helpers) e o caso `race` do
`useBlockStatus` passam a exigir `isFeatSpellChoiceComplete` — mesmo
mecanismo que hoje trava sem o `featChosenAttr`.

### 5. Injeção

Três pontos, todos com merge idempotente:

1. **Criação**: `injectFeatSpellsAtBuild(character, srdSpells)` no wrapper
   de `build-character.js`, ao lado de `injectSubclassSpellsAtBuild`. Lê
   `info.feats` (que já agrega talento racial + ASIs primário + ASIs de
   multiclasse).
2. **Level-up**: `enrichWithFeatSpells({ patch, character, srdSpells })`
   alimentando `bonusSpells` (que `applyLevelUp` já consome).
   **DIFERENÇA do irmão de subclasse**: NÃO retorna cedo quando
   `multiclassIndex != null` — ASI de multiclasse também vira talento.
3. **Retrofit** (ficha existente): ver §6.

**Merge, nunca skip**: se a magia já existe em `spellcasting.spells`
(ex.: Passo Nebuloso via Juramento de Vingança + Tocado pelas Fadas), a
entrada existente ganha `featIndex`/`featGrant` (e `ability` apenas se
ausente) em vez de ser duplicada ou de a concessão ser descartada. O free
cast do talento continua funcionando sobre a entrada única.

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

- um tracker POR MAGIA com `freeCast` (o texto diz "a mesma magia" —
  contadores independentes); id incorpora o índice da magia (estável,
  escolha é permanente);
- Teleporte das Fadas → `recharge: 'short'`;
- `atWill` e `ritualOnly` e truques NÃO geram tracker;
- invariantes existentes preservadas: `mergeFeatureUses` mantém `used`,
  `resolveFeatureUseList` preserva persistidos.

**Na linha da magia** (`SpellRow`), conforme `getCastPolicy`:

- botão "1×/descanso" quando há `freeCast` com tracker disponível — gasta o
  tracker, não o slot;
- botões de slot escondidos quando `slots` resolve false (`'never'`, ou
  `'classMatch'` sem classe correspondente) e quando `ritualOnly`;
- botão "à vontade" (conjura sem gastar nada) quando `atWill`;
- `ritualOnly` → apenas o caminho de ritual.

## Fatiamento em 3 planos

1. **Motor + atributo por magia + injeção** — `featSpells.js` completo (11
   talentos), campo `ability` + cascata de CD/ataque por linha, injeção na
   criação e no level-up (merge + multiclasse). Entrega: magias fixas
   aparecem e rolam com CD certa em personagens novos e level-ups.
2. **Pickers + gating + retrofit** — `FeatSpellPicker` inline nos dois
   FeatPickers, gating no wizard (`useBlockStatus`/`isASIChoiceComplete`)
   e no level-up, botão de retrofit na FeaturesTab. Entrega: escolhas
   funcionam em todo lugar; o personagem do dono é consertado aqui.
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
