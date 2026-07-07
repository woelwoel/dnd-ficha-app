# Efeitos Ativos de Magia — Sub-projeto B (Design)

**Data:** 2026-07-07
**Status:** Aprovado pelo dono (decisões via brainstorming + revisão crítica nesta sessão)

## Objetivo

Buffs de magia (Bênção, Velocidade, Escudo da Fé, Orientação…) viram **efeitos
ativos** na ficha: modificam CA, deslocamento e rolagens automaticamente,
aparecem como chips dispensáveis e expiram com a concentração. Fecha a segunda
metade do pedido original ("magias que modificam minha ficha"), sobre a
fundação do sub-projeto A ([spec](2026-07-06-magias-interativas-design.md)).

## Decisões do dono

1. **Criação:** automática ao conjurar **quando o alcance é "Pessoal"**;
   alcance maior (Bênção, Velocidade — normalmente miram aliados) mostra um
   botão transiente **"✦ Aplicar em você?"** na linha da magia (número errado
   por padrão é pior que um clique a mais). Além disso, catálogo **"+ Efeito"**
   para adicionar manualmente buffs recebidos de aliados.
2. **Mecânicas suportadas (as três):** modificadores **fixos** (CA,
   deslocamento, salvaguardas, atributos), **riders de dado** (Bênção +1d4 em
   ataque/salvaguarda; Orientação +1d4 num teste, uso único) e
   **vantagem/desvantagem** por categoria de rolagem.
3. **Expiração:** por concentração (efeitos criados por conjuração própria) +
   dispensa manual (✕ no chip) + **descanso longo limpa tudo**. Sem timer de
   rodadas/duração (o app não rastreia turnos).
4. **Riders automáticos por categoria:** com Bênção ativa, toda rolagem de
   ataque/salvaguarda soma +1d4 sozinha e mostra a origem no resultado.

## Contexto (estado atual — tudo isso JÁ existe)

- `useCharacterCalculations` consome um pacote agregado `magicEffects` (de
  itens mágicos, `domain/magicItems.js`) com formato definido: `ac`, `saves`,
  `saveAbility{}`, `attrSet{}`, `attrBonus{}`, `speed` (aditivo, metros),
  `sources[]`. Alimenta CA sugerida, salvaguardas, atributos efetivos.
- CA e deslocamento **reais** são editáveis (`combat.armorClass`,
  `combat.speed`) — a sugestão não sobrescreve.
- Rolagem: `roll(notation, label, opts)` centralizado (histórico + dados 3D);
  `parseAndRoll` aceita **um único termo de dado** (`1d20+5`); call sites:
  `useRollInteraction` (perícias/salvaguardas/atributos/init),
  `AttackRollButton` (armas), `executeCastPlan` (magias),
  `ConcentrationPromptV2` (salvaguarda de CON).
- `DiceRollerProvider` já aceita injeção da ficha via `setDiceAccent`
  (padrão `DiceAccentSync`).
- Concentração: `combat.concentrating {spellIndex, spellName}`, slot único;
  `setConcentration(spell|null)`.
- Chips de condição no `HeaderV2` com "+ Condição" (padrão visual a seguir).
- `spell-mechanics-pt.json` curado (sub-projeto A), com `_ignore` listando
  justamente os buffs ("dado que não é dano/cura do conjurador") — ponto de
  partida da curadoria de efeitos.

## Arquitetura

### 1. Dados — campo `effect` no `spell-mechanics-pt.json`

Opcional e ortogonal a `damage`/`heal` (uma entrada pode ter só `effect`):

```jsonc
"escudo-da-fe": { "effect": { "concentration": true, "mods": { "ac": 2 }, "summary": "+2 CA" } },
"bencao":      { "effect": { "concentration": true,
                 "riders": [{ "dice": "1d4", "categories": ["attack", "save"] }],
                 "summary": "+1d4 em ataques e salvaguardas" } },
"velocidade":  { "effect": { "concentration": true,
                 "mods": { "ac": 2, "speedMultiplier": 2 },
                 "advantages": [{ "categories": ["save"], "abilities": ["dex"] }],
                 "summary": "+2 CA · deslocamento ×2 · vantagem em salv. DES · 1 ação extra (narre)" } },
"orientacao":  { "effect": { "concentration": true,
                 "riders": [{ "dice": "1d4", "categories": ["check"], "oneShot": true }],
                 "summary": "+1d4 em um teste de habilidade" } }
```

Semântica:

- `mods` — subconjunto do formato `magicEffects`: `ac`, `saves`,
  `saveAbility`, `speed`, **mais `speedMultiplier`** (Velocidade dobra;
  aplicado POR ÚLTIMO, sobre base + aditivos). `attrSet`/`attrBonus` ficam
  FORA de propósito: nenhum buff clássico altera atributo (Aprimorar
  Habilidade dá vantagem), e atributo efetivo contaminaria o PV máximo
  sugerido.
- `riders: [{ dice, categories, oneShot? }]` — dado extra somado à rolagem.
  `categories` ⊆ `attack | save | check`. `oneShot: true` = consumido na
  primeira rolagem aplicável (Orientação, Resistência).
- `advantages: [{ mode?, categories, abilities? }]` — `mode` default `'adv'`;
  `abilities` filtra (Velocidade: só salvaguardas de DES).
- `concentration: true` — amarra à concentração do conjurador (ver ciclo de
  vida).
- `summary` — texto do chip/tooltip; carrega o que não é representável
  (ação extra da Velocidade).
- O que a magia faz e não cabe no schema fica no `summary` — nunca inventar
  mecânica aproximada.

**Curadoria:** ~10–15 buffs clássicos do PHB/Tasha, garimpados do `_ignore`
(bencao, escudo-da-fe, velocidade, orientacao, resistencia, heroismo,
aumentar-reduzir, patas-de-aranha, etc. — só os representáveis; fonte da
verdade = prosa). **O guard-rail `--check` NÃO cobre efeitos** — dano/cura
continuam obrigatórios, efeito é opt-in por curadoria.

**Validação (extensão do teste de dados existente):** chaves conhecidas do
`effect`; `riders[].dice` parseável; `categories` válidas; `abilities`
canônicas; `speedMultiplier` número ≥ 1; `summary` obrigatório.

### 2. Estado e ciclo de vida — `combat.activeEffects[]`

```jsonc
{
  "id": "bencao",              // = spellIndex; chave de substituição
  "name": "Bênção",
  "source": "cast" | "manual", // conjurada por você vs recebida de aliado
  "concentration": true,
  "mods": { ... }, "riders": [ ... ], "advantages": [ ... ],
  "summary": "+1d4 em ataques e salvaguardas"
}
```

- `characterSchema` ganha `combat.activeEffects` (default `[]`, migração
  implícita como os demais campos novos).
- **Criação:**
  - Conjurar magia com `effect` e alcance "Pessoal" → efeito entra direto
    (`source:'cast'`).
  - Alcance ≠ Pessoal → botão transiente "✦ Aplicar em você?" (~10s, padrão
    do "Aplicar N PV") na linha da magia; clicar cria o efeito
    (`source:'cast'`).
  - Catálogo "+ Efeito" (header v2): lista as magias com `effect` curado
    (nome + summary), clique adiciona `source:'manual'`.
- **Substituição:** adicionar `id` já presente SUBSTITUI (mesma magia não
  empilha — PHB "combining magical effects"). Ids distintos coexistem.
- **Expiração:**
  - `source:'cast'` + `concentration:true` → removido automaticamente quando
    `combat.concentrating` deixa de ser aquela magia (rompeu, trocou de magia
    de concentração, caiu no teste). Regra PURA em `rules.js` (a remoção
    acontece nas transições de `setConcentration`).
  - `source:'manual'` NUNCA expira pela sua concentração — a concentração é
    do aliado que conjurou. Só ✕ ou descanso longo.
  - ✕ no chip remove qualquer efeito.
  - **Descanso longo remove TODOS os efeitos ativos** (nenhum buff coberto
    sobrevive a 8h).

### 3. Modificadores fixos — merge na camada de cálculo

- Função pura `aggregateSpellEffects(activeEffects)` em
  `domain/activeEffects.js` → `{ fx, riders, advantages }`:
  - `fx` no formato `magicEffects` + `speedMultiplier` (multiplicadores de
    efeitos distintos multiplicam entre si; na prática só Velocidade existe).
  - Agregação numérica soma (como `getActiveMagicEffects`).
- `useCharacterCalculations` funde `fx.saves`/`fx.saveAbility` no cálculo de
  `savingThrows` (derivado de exibição, mesmo caminho dos itens mágicos).
- **`fx.ac` e `fx.speed`/`speedMultiplier` NÃO entram no `suggestedAC`** — a
  sugestão alimenta o botão "Sugerido" que grava na base editável, e um buff
  temporário seria assado na ficha permanente. Eles só produzem os novos
  derivados do `calc`: `effectiveAC` = `combat.armorClass` + bônus de
  efeitos; `effectiveSpeed` = (`combat.speed` + aditivos) ×
  `speedMultiplier`. **Efeito nunca muta a base editável** — tudo derivado e
  reversível.
- UI (v2) exibe o valor efetivo destacado quando difere da base, com tooltip
  do breakdown ("18 = 16 + 2 Escudo da Fé").

### 4. Riders e vantagem — pipeline de rolagem

**4a. Parser multi-termo (a peça mais arriscada — fase própria no plano).**

- `parseAndRoll` passa a aceitar múltiplos termos de dado:
  `1d20+1d4+5`. A entry ganha `groups: [{ sides, rolls }]`, MANTENDO
  `sides`/`rolls`/`total` do **grupo principal (primeiro termo)** — todos os
  consumidores atuais (detecção de nat 20/1, painel, dados 3D) continuam
  funcionando sem mudança.
- `adv`/`dis` aplica só ao termo `1d20` (primeiro); riders rolam normal.
- Riders só aparecem em rolagens de d20 (ataque/salvaguarda/teste) — **não
  interagem com crítico** (que dobra dados de DANO, onde não há rider).
- Dados 3D: d20 + d4 voam juntos via notação composta com resultado forçado;
  se a lib resistir, **fallback aprovado**: anima só o d20 e o rider entra
  somado no toast/histórico.

**4b. Resolver injetado no provider (padrão `DiceAccentSync`).**

- `DiceRollerProvider` ganha `setRollEffectsResolver(fn|null)`.
- Componente `EffectsSync` no `SheetV2` registra o resolver na montagem e
  limpa na desmontagem. O provider continua genérico (não conhece o
  personagem); no v1 nada é registrado → riders/vantagem são v2-only.
- `roll(notation, label, opts)` consulta o resolver **apenas quando
  `opts.category` vem preenchido**: `resolver(category, ability)` →
  `{ extraDice: ['1d4'], advantage: 'adv'|null, labelSuffix: '· Bênção +1d4',
  onApplied }`. O roll estende a notação, resolve o modo e chama
  `onApplied()` após rolar (consome `oneShot` via updater da ficha).
- **Categorias nos call sites** (única mudança neles): perícias, testes de
  atributo e iniciativa = `check`; salvaguardas = `save` + `ability`;
  ataques de arma (`AttackRollButton`) e de magia (`executeCastPlan`, passo
  `attack`) = `attack`; `ConcentrationPromptV2` = `save`/`con` — **Bênção
  passa a valer no teste de concentração** (fiel ao PHB).

**4c. Matriz de vantagem (PHB p.173 — cancelamento).**

| gesto do usuário | efeito ativo | resultado |
|---|---|---|
| nenhum | adv | **adv** |
| Shift (adv) | adv | adv |
| Alt (dis) | adv | **normal** (cancelam) |
| nenhum/Shift/Alt | nenhum | comportamento atual |

Vantagem e desvantagem NUNCA empilham; qualquer par oposto = normal.

**4d. Apresentação.** Label ganha sufixo por rider aplicado ("Salvaguarda —
SAB · Bênção +1d4"); o painel mostra o breakdown dos grupos; o toast 3D mostra
o total como hoje.

### 5. UI (v2)

- **Chips de efeitos** no `HeaderV2`, junto às condições: cor de acento, nome,
  tooltip com `summary`, ✕ pra dispensar. Padrão visual dos chips existentes.
- **"+ Efeito"** ao lado de "+ Condição": modal-catálogo (EditDialog) com as
  magias com `effect`, nome + summary, clique adiciona.
- **Prompt pós-conjuração** na linha da magia (Spells.jsx compartilhado — o
  DADO nasce em qualquer shell, mas chips/valores efetivos/riders só no v2).
- CA/deslocamento efetivos no header com destaque + tooltip de breakdown.
- readOnly: chips visíveis, sem ✕/catálogo. Print: ignora efeitos (valores de
  papel = base).

## Fora de escopo (explícito)

- Timer de rodadas/duração automática (sem rastreador de turnos no app).
- Debuffs em inimigos / rastreamento de alvos externos.
- Poções e consumíveis no catálogo de efeitos.
- Ação extra da Velocidade como mecânica (fica no `summary`).
- UI no shell v1 (a caminho da remoção).
- Magias de Xanathar; efeitos custom free-form (catálogo só de curados).

## Testes

- **Unit:** `aggregateSpellEffects` (merge, substituição por id, multiplicador
  por último, multiplicadores compostos); parser multi-termo (parse, compat de
  `sides`/`rolls`/nat20, adv só no d20, notação de 1 termo intacta); matriz de
  vantagem completa (incluindo cancelamento); resolver (filtro
  categoria/ability, `oneShot` consumido exatamente uma vez); expiração
  (romper/trocar concentração remove `cast`, preserva `manual`; descanso longo
  limpa tudo); validação do campo `effect` no teste de dados.
- **Component:** chip renderiza/dispensa; catálogo adiciona manual; prompt
  pós-cast (Pessoal auto vs botão); rolagem com Bênção mostra "+1d4" no label
  e consome Orientação; CA/deslocamento efetivos exibidos com breakdown.
- **E2E (1 caso determinístico):** conjurar Escudo da Fé → aplicar em você →
  CA efetiva sobe no header → romper concentração → CA volta.
- **Gates:** suíte unit completa, e2e, build, axe na ficha (chips novos).

## Operacional

- Mudou `spell-mechanics-pt.json` → **bump `srd-data-v23`** no
  `vite.config.js`.
- Utilitário de cor novo em tela legada → `node scripts/gen-bridge.mjs`;
  componentes v2 novos usam `.v2-*`/`--v2-*`.
- Não mutar `ref.current` no render (`react-hooks/refs`) — estado derivado via
  setState condicional no render.
