# Spike — Artífice no motor de regras (achados)

Escrito 2026-06-24 (Task 12 do plano da fundação de fontes). Objetivo: medir o
tamanho da mudança no motor de regras pro Artífice ANTES de extrair o volume de
conteúdo do Tasha. **Decisão: GO.** O motor já suporta meio-conjurador; o que
falta é (a) algumas adições config-driven + 2 guardas pontuais na conjuração e
(b) um sistema NOVO de infusões. Detalhes abaixo.

## (a) O que o motor JÁ suporta

A conjuração de meio-conjurador está madura em `src/utils/spellcasting.js`:

- `CASTER_TYPE` mapeia `paladino`/`patrulheiro` como `'half'`.
- `SPELL_SLOTS_TABLE` (nível efetivo 1–20) é a tabela oficial unificada.
- `getSpellSlots(...)` trata single-class e multiclasse uniformemente. Para
  meio-conjurador SOLO usa `ceil(level/2)`; em multiclasse usa `floor(level/2)`
  por classe (`computeEffectiveCasterLevel`).
- `PREPARE_CONFIG` modela classes que PREPARAM (mago/clérigo/druida/paladino)
  com flags `ability`, `halfLevel`, `hasCantrips`, `hasSpellbook` — exatamente o
  formato que o Artífice precisa.
- `rules.js`: `SPELLCASTER_CLASSES` (set) e o mapa de atributo de conjuração por
  classe; `classFeatureUses[]` modela recursos limitados por descanso
  (max/used/recharge short|long|dawn).

## (b) O que falta pro Artífice — conjuração (esforço BAIXO, config-driven)

O Artífice é meio-conjurador de INTELIGÊNCIA, preparado, COM truques, que difere
de Paladino/Patrulheiro em dois pontos de regra:

1. **Conjura desde o nível 1** (Paladino/Patrulheiro só no 2). Hoje
   `getSpellSlots` faz `if (c.level < 2) return null` pro half solo — isso
   bloquearia o Artífice nível 1 indevidamente. Precisa de exceção por classe
   (ex.: `artifice` não tem a guarda `< 2`). Artífice nv1 = `ceil(1/2)=1` →
   linha 1 da tabela = 2 slots de 1º.
2. **Arredonda PRA CIMA mesmo em multiclasse** (errata Tasha), ao contrário do
   `floor` padrão. `computeEffectiveCasterLevel` usa `floor(level/2)` pro half —
   o Artífice precisa de `ceil` ali.

Mudanças necessárias (todas pequenas e localizadas):

- `CASTER_TYPE.artifice = 'half'` (`src/utils/spellcasting.js`).
- `getSpellSlots`: exceção de "começa no nível 1" pro `artifice` na guarda solo.
- `computeEffectiveCasterLevel`: `ceil` (não `floor`) quando a classe half é
  `artifice`.
- `PREPARE_CONFIG.artifice = { ability:'int', halfLevel:true, hasCantrips:true,
  hasSpellbook:false }` — note `hasCantrips:true` (diferente do Paladino).
- `rules.js`: somar `'artifice'` a `SPELLCASTER_CLASSES` e ao mapa de atributo
  de conjuração (`artifice: 'int'`).

Risco: baixo. É o padrão já usado pras outras classes preparadas.

## (c) O que falta — INFUSÕES (Infundir Item) — esforço ALTO, é NET-NEW

As infusões NÃO encaixam em `classFeatureUses[]` (que é "X usos por descanso").
A mecânica é:

- **Infusões conhecidas**: uma lista que o Artífice APRENDE (4 no nv2, crescendo
  até 12 nos níveis altos), trocável em subida de nível.
- **Infusões ativas**: subconjunto efetivamente acoplado a itens (2 no nv2, até
  6), recriado/realocado ao terminar um descanso longo.

Precisa de estrutura nova em 4 frentes:

- **Dados**: `tasha-infusions-pt.json` (catálogo: nome, nível mínimo, alvo do
  item, efeito, desc, `source:'tasha'`).
- **Schema**: corpo da ficha ganha algo como `artifice: { infusionsKnown:
  string[], activeInfusions: [{ infusion, itemRef }] }` (com migração default
  vazio). Bump de `SCHEMA_VERSION`.
- **Regras**: caps de conhecidas/ativas por nível de Artífice; validação de
  pré-requisito de nível por infusão.
- **UI**: aprender/trocar infusões (subida de nível) e acoplar a itens
  (descanso longo). É a maior peça de UI da classe.

Risco: médio-alto, mas ISOLADO da conjuração. Pode ser uma fase própria.

## (d) Plumbing de classe/subclasse (dados, não motor)

Padrão já existente, só volume:

- `tasha-classes-pt.json` (Artífice: DV d8, salvaguardas CON+INT, proficiências)
  + progressão em `phb-class-progression-full-pt.json` (equivalente Tasha) +
  subclasses em class-choices (Alquimista, Artilheiro, Ferreiro de Batalha,
  Armoreiro) + magias sempre-preparadas de subclasse em `subclassSpells.js`.
- **Generalizar o `COMPOSED` do SrdProvider** (hoje só compõe `feats`) para
  também compor `classes`, `classChoices` e `progression` PHB+Tasha carimbados.
  Isso é trabalho do plano "conteúdo em volume", não do Artífice em si.
- Features textuais: Remendo Mágico, Sintonia com Itens Mágicos (mexe no teto de
  sintonia — único outro toque numérico no motor, se o app impuser limite de
  sintonia), Ferramenta Certa pro Trabalho, Lampejo de Genialidade, etc.

## Ordem sugerida pro plano do Artífice

1. **Conjuração + dados de classe/subclasse** → Artífice meio-conjurador
   jogável (slots, magias preparadas, subclasses). Reaproveita (b) e (d).
2. **Sistema de infusões** (c) — fase própria: dados → schema → regras → UI.
3. **Features diversas** (teto de sintonia, Lampejo de Genialidade, etc.).

## Itens de motor a confirmar no plano do Artífice

- A guarda `level < 2` e o `floor` em multiclasse precisam de teste de regressão
  (Paladino/Patrulheiro NÃO podem mudar de comportamento ao adicionar a exceção
  do Artífice).
- Teto de sintonia (>3 itens) — verificar se o app modela limite de sintonia
  hoje; se sim, Sintonia com Itens Mágicos do Artífice mexe nele.
