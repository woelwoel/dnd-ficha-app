# Mesa de Combate — design

Data: 2026-07-26
Status: aprovado pelo dono

## Problema

O app tem 100% da sua superfície voltada pro **jogador**. O Mestre entra em
`/campaigns/:id`, e o que existe pra ele é administração de mesa: código de
convite, lista de membros, e leitura das fichas da companhia
(`CampaignDetail.jsx`). Nada disso ajuda a rodar uma sessão.

Na prática o Mestre roda o combate no papel, ou em outro app, e as fichas dos
jogadores ficam dessincronizadas do que aconteceu na mesa: ninguém lembra de
descontar o dano, ninguém lembra de recuperar os recursos no descanso, e as
condições ("você está Amedrontado até o fim do seu próximo turno") viram
combinado verbal.

A referência escolhida pelo dono foi o [Improved Initiative](https://improvedinitiative.app)
— rastreador de combate para 5e, sem ficha, sem mapa. A vantagem estrutural
deste app sobre ele é que **as fichas são nossas e estão vivas no mesmo banco**:
o Mestre pode agir sobre elas em vez de manter cópias manuais.

## Escopo

Três entregas, um sub-projeto:

1. **Rastreador de combate** — iniciativa ordenada, rodada, turno ativo, HP dos
   monstros, dano/cura/HP temporário, remover combatente.
2. **Condições aplicadas na ficha** — o Mestre marca a condição e ela nasce no
   `combat.conditions` da ficha do jogador, que já a renderiza.
3. **Descanso em lote** — descanso longo/curto da companhia inteira disparado
   pelo Mestre.

**Fora do escopo, de propósito:**

- Tela da Mesa / Player View (segunda tela pros jogadores) — cortado pelo dono.
- Pedir rolagem aos jogadores, log de rolagens da mesa, rolagem oculta.
- Construtor de encontros com dificuldade/limiar de XP e encontros salvos.
- Painel de consulta das fichas (passivas, salvaguardas, resistências).
- Mapa, grid, posicionamento.
- Atalhos de teclado (o alvo desta rodada é toque em celular/tablet).
- Rolar ataque/dano do monstro a partir do statblock.
- Condições alterando vantagem/desvantagem no motor de rolagem. Hoje só
  `SPEED_ZERO_CONDITIONS` tem efeito mecânico (`rules.js:971`) e isso continua.
- Cronômetro de turno, iniciativa vinculada, opções de surpresa, resumo
  pós-combate, chefe/lacaio, HP negativo (features do Improved Initiative
  avaliadas e descartadas).

## Decisões de arquitetura

### Fronteira multi-sistema

Mesa/campanha é da casca e agnóstica de sistema. Combate com statblock, CR e
condições do PHB é **D&D 5e**. Logo:

- domínio e UI moram em `src/systems/dnd5e/`;
- a rota `/campaigns/:id/combate` fica em `App.jsx` e **delega** pro sistema da
  mesa, no mesmo padrão de `Wizard`/`Sheet`;
- quando existir Daggerheart, ele traz a tela dele e a casca não muda.

### O combatente PJ não guarda HP

O combatente do tipo `pc` guarda apenas a referência (`characterId`) e o que é
do encontro (iniciativa). HP, CA e condições são lidos da ficha via realtime.

Motivo: HP duplicado é HP dessincronizado. O jogador que se cura no celular
aparece na tela do Mestre sem intervenção, e não existe estado de conflito
possível entre "o HP do encontro" e "o HP da ficha". Monstro guarda HP no estado
do encontro porque não existe outro lugar pra ele morar.

### A regra fica em JS, sempre

A aritmética de dano/cura/descanso **não** é reimplementada em SQL. O cliente do
Mestre já tem o doc completo da ficha (a RLS de select permite ao Mestre da
mesa), roda a função pura do domínio, e grava o resultado. As funções já
existem e são as mesmas que a ficha do jogador usa:

| Operação | Função | Arquivo |
|---|---|---|
| Dano | `applyDamage(char, amount, opts)` → `{ character, sideEffects }` | `domain/rules.js:1045` |
| Cura | `applyHealing(char, amount)` | `domain/rules.js:1145` |
| Descanso longo | `performLongRest(char)` | `utils/rest.js:122` |
| Descanso curto | `performShortRest(char, { spent: [] })` | `utils/rest.js:59` |

Consequência boa: `applyDamage` devolve `sideEffects` com
`concentrationCheckDC`, `droppedTo0`, `instakill` e `died`. A tela do Mestre
exibe esses avisos sem lógica nova ("Thalior precisa de CD 12 de concentração").

## Estrutura de arquivos

**Novos:**

```
src/systems/dnd5e/domain/encounter.js          (domínio puro)
src/systems/dnd5e/components/Encounter/
  EncounterScreen.jsx                          (orquestra)
  CombatantRow.jsx                             (linha + ações)
  AddMonstersPanel.jsx                         (ponte pro BestiaryModal)
  InitiativeRollPanel.jsx                      (rolagem em lote, editável)
  PartyRestPanel.jsx                           (descanso em lote)
  index.js
src/lib/encounters.js                          (CRUD + realtime do encontro)
src/lib/dmWrites.js                            (as duas RPCs)
supabase/migrations/0015_encounters.sql
```

**Tocados:**

```
src/systems/dnd5e/ui.jsx        (+ export Encounter, self-wrap no SrdProvider)
src/systems/ui-registry.js      (+ getLazyEncounter)
src/App.jsx                     (+ rota /campaigns/:id/combate)
src/components/Campaigns/CampaignDetail.jsx   (+ botão "Rodar combate", só DM)
```

## Modelo de dados

### Tabela `encounters` (migration 0015)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `campaign_id` | uuid not null → campaigns | |
| `state` | jsonb not null | ver shape abaixo |
| `version` | int not null default 1 | bump por trigger, igual `characters` |
| `active` | boolean not null default true | |
| `created_at` / `updated_at` | timestamptz | |

Índice único parcial (`create unique index … on encounters(campaign_id) where
active`) — um encontro ativo por mesa. Encerrar marca `active = false` em vez de
apagar (histórico barato, sem custo de UI).

RLS: select/insert/update/delete **só** com `public.is_campaign_dm(campaign_id)`.
Sem Tela da Mesa, nenhum jogador precisa ler o encontro. Sem policy permissiva
pra jogador = bloqueado por padrão.

### Shape do `state`

```js
{
  round: 2,
  activeId: 'k3',        // null antes de começar
  started: true,
  combatants: [
    { id: 'k1', kind: 'pc', characterId: 'uuid…', name: 'Thalior',
      initiative: 17, initiativeBonus: 3, orphaned: false },

    { id: 'k3', kind: 'npc', monsterIndex: 'goblin', name: 'Goblin 2',
      initiative: 12, initiativeBonus: 2,
      ac: 15, maxHp: 7, currentHp: 3, tempHp: 0,
      conditions: ['prone'], defeated: false },
  ],
}
```

`id` é local ao encontro (contador estável, não índice de array — remover
combatante não pode remapear os outros).

Campos do statblock SRD usados na criação do combatente `npc`:

| Campo do encontro | Origem no statblock |
|---|---|
| `ac` | `armor_class[0].value` (é array de objetos, não número) |
| `maxHp` | `hit_points` (média) ou rolagem de `hit_points_roll` |
| `initiativeBonus` | modificador de `dexterity` |
| `name` | `name` + ordinal quando repetido ("Goblin 2") |

Os 334 statblocks vêm de `5e-SRD-Monsters.json` com a camada PT por monstro de
`5e-SRD-Monsters-pt.json` (63 traduzidos), exatamente como o `BestiaryModal` já
faz hoje, com o mesmo toggle de idioma. Nenhum JSON muda → **não precisa bumpar
`srd-data-vN`**.

## As duas RPCs (migration 0015)

Ambas `security definer`, `set search_path = public, pg_temp`, e ambas checam
que quem chama é o Mestre da mesa **daquela** ficha:

```sql
-- pseudo
select campaign_id into v_cid from public.characters where id = p_character_id;
if v_cid is null or not public.is_campaign_dm(v_cid) then
  raise exception 'not_dm_of_campaign' using errcode = '42501';
end if;
```

### `dm_apply_combat_state(p_character_id uuid, p_patch jsonb, p_expected_version int) → int`

Caminho quente do combate. Grava **somente** estas chaves dentro de
`data->'combat'`:

```
currentHp · tempHp · deathSaves · isStable · isDead · conditions
```

Qualquer chave fora da lista → `raise exception 'illegal_patch_key'`. A lista é
exatamente o conjunto que `applyDamage`/`applyHealing` mexem, mais `conditions`.

Lock otimista: `where id = … and version = p_expected_version`; nenhuma linha
afetada → `raise exception 'version_conflict' using errcode = 'P0010'`, o mesmo
código que `save_character` já usa (0009), pra o cliente tratar igual.

Retorna a nova `version`.

### `dm_save_character(p_character_id uuid, p_data jsonb, p_expected_version int) → int`

Doc completo, mesmo contrato e mesmo `version_conflict` do `save_character`.
**Único consumidor: o descanso em lote**, porque descanso longo mexe em
`hitDice`, `classFeatureUses`, `spellcasting.usedSlots`, `pactSlotsUsed` e
`activeEffects` — reimplementar isso em SQL duplicaria regra, e é justamente o
que a decisão "a regra fica em JS" evita.

## Domínio puro — `domain/encounter.js`

Sem React, sem Supabase. Exporta:

| Função | Contrato |
|---|---|
| `buildPcCombatant(character, initiativeBonus)` | combatante `pc` a partir da ficha |
| `buildNpcCombatant(monster, ordinal, { rollHp })` | combatante `npc` do statblock |
| `rollInitiative(state, rng)` | devolve `{ state, rolls }` — `state` com `initiative` preenchido em todos, e `rolls` = `[{ id, die, bonus, total }]` pra UI exibir o dado |
| `sortByInitiative(combatants)` | ordena desc; empate resolve por `initiativeBonus` desc, depois por nome (determinístico) |
| `startEncounter(state)` | `started: true`, `round: 1`, `activeId` = primeiro |
| `nextTurn(state)` | avança; no fim da lista incrementa `round` e volta ao topo |
| `previousTurn(state)` | inverso, sem descer abaixo de `round: 1` |
| `applyNpcDamage(state, id, amount)` / `applyNpcHealing` / `setNpcTempHp` | HP de monstro fica em 0..maxHp; chegar a 0 marca `defeated: true` |
| `toggleCondition(state, id, conditionId)` | só para `npc`; PJ passa pela RPC |
| `removeCombatant(state, id)` | se era o ativo, `activeId` passa pro próximo antes de remover |
| `totalXp(state)` | soma `xp` dos statblocks dos `npc` |

`rollInitiative` recebe `rng` injetável — os testes fixam a rolagem.

## Fluxo do Mestre

**1. Abrir.** Botão "Rodar combate" no `CampaignDetail`, visível só pro DM
(`isDM`, já existe). Se houver encontro `active`, retoma; senão, cria.

**2. Montar.** Os PJs da mesa aparecem com checkbox, todos marcados por padrão
(o Mestre desmarca quem não está na cena). O bônus de iniciativa de cada PJ vem
do motor de regras sobre o doc completo da ficha, não de um campo copiado.
"Adicionar monstros" abre o `BestiaryModal` que já existe; clicar adiciona,
clicar de novo cria o ordinal. HP = média do statblock, com botão de rolar
`hit_points_roll`.

**3. Rolar iniciativa.** Rola todos de uma vez e mostra o dado
(`Goblin 2: [14]+2 = 16`), com cada total editável em um toque — em mesa
presencial o jogador rola o dado físico dele e informa o resultado.

**4. Rodar.** Lista ordenada, combatente ativo destacado, contador de rodada e
XP total dos monstros no cabeçalho (`totalXp`), "Próximo"/"Anterior". Por
combatente: dano, cura, HP temporário, condição, remover. Monstro resolve no domínio puro + save do `state`; PJ resolve com a
função pura do domínio da ficha + `dm_apply_combat_state`.

**5. Encerrar.** `active = false`, e a tela oferece o descanso.

## Descanso em lote

Painel com a companhia e dois botões:

- **Descanso longo:** `performLongRest(char)` por ficha → `dm_save_character`.
- **Descanso curto:** `performShortRest(char, { spent: [] })` → recarrega os
  recursos de descanso curto e zera a economia de ação, **sem** gastar dados de
  vida. Quantos dados gastar é decisão do jogador na ficha dele.

Cada ficha é uma chamada independente: uma falhar não derruba as outras. O
resultado é um sumário ("4 fichas descansaram, 1 falhou por conflito"), com
botão de tentar de novo nas que falharam.

## Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Conflito de versão (jogador salvou no mesmo instante) | a RPC recusa; o cliente refetcha a ficha e reaplica a operação uma vez; falhando de novo, avisa o Mestre em vez de sobrescrever |
| Ficha saiu da mesa no meio do combate (trigger de desvinculação, 0007) | combatante marcado `orphaned: true`: aparece riscado com "fora da mesa", **continua** na ordem de iniciativa, e as ações de escrita ficam desabilitadas |
| Ficha apagada | mesmo tratamento de `orphaned` |
| Mestre offline | o `state` local continua utilizável e a tela indica que não sincronizou. Sem fila de retry nesta rodada |
| Monstro a 0 HP | `defeated: true` — permanece na lista riscado (o Mestre decide remover), não morre automaticamente |
| PJ a 0 HP | quem decide é `applyDamage`: testes de morte, `instakill` por dano massivo, `died` com 3 falhas. A tela do Mestre mostra o aviso; nada de regra nova |
| Dano em PJ concentrando | `sideEffects.concentrationCheckDC` exibido como aviso na linha do combatente |

## Testes

**Unitários (`domain/encounter.js`)** — ordenação com empate (determinismo),
virada de rodada, `nextTurn` com o ativo removido, HP de monstro no piso e no
teto, `defeated` ao chegar a 0, HP médio vs rolado, `totalXp`.

**Integração da tela** — Supabase mockado no padrão de `campaigns.test.js`:
montar combate, aplicar dano em PJ dispara `dm_apply_combat_state` com o patch
correto, conflito de versão refetcha e reaplica, descanso em lote chama
`dm_save_character` uma vez por ficha e reporta as falhas.

**Perímetro das RPCs** — patch com chave fora da lista tem que estourar
`illegal_patch_key`; chamada por quem não é DM da mesa tem que estourar
`not_dm_of_campaign`; chamada por DM de **outra** mesa também.

**E2E (`installAuthedApp`)** — Mestre monta combate, adiciona monstro, rola
iniciativa, aplica dano num PJ, e o HP na ficha do jogador reflete a mudança.

## Ordem de implementação sugerida

1. `domain/encounter.js` + testes unitários (não depende de nada).
2. Migration 0015 (tabela + RLS + as duas RPCs) + testes de perímetro.
3. `lib/encounters.js` e `lib/dmWrites.js`.
4. `EncounterScreen` montando e rodando **só monstros** (sem escrever em ficha).
5. Escrita em ficha de PJ (dano/cura/HP temporário/condição).
6. Descanso em lote.
7. Rota, export no `ui.jsx`/`ui-registry.js`, botão no `CampaignDetail`.
8. E2E.
