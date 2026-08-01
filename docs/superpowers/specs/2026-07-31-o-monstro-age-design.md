# O Monstro Age (sub-projeto 3 de 3)

Data: 2026-07-31
Antecessores: `2026-07-31-workspace-combate-design.md`, `2026-07-31-telas-de-preparacao-design.md`

## Contexto

O painel de statblock entregue no sub-projeto 1 é de leitura: o Mestre vê que o
goblin tem "Scimitar: +4 to hit, 1d6+2 slashing" e depois rola isso em outro
lugar — nos dados físicos, na cabeça, ou numa terceira aba. Enquanto isso o app
já tem motor de rolagem completo, com vantagem, crítico e dados 3D, usado pela
ficha do jogador.

E toda bola de fogo é seis operações manuais: digitar o dano na linha de cada
alvo, um por vez, dividindo por dois de cabeça para quem passou na salvaguarda.

Este sub-projeto liga as duas pontas.

## Ataques clicáveis no statblock

### O que o SRD dá de graça

As ações dos monstros são estruturadas, não só texto:

```json
{ "name": "Scimitar", "attack_bonus": 4,
  "damage": [{ "damage_dice": "1d6+2", "damage_type": { "name": "Slashing" } }] }

{ "name": "Fire Breath",
  "dc": { "dc_type": { "name": "DEX" }, "dc_value": 21, "success_type": "none" },
  "damage": [{ "damage_dice": "18d6", "damage_type": { "name": "Fire" } }] }
```

Um parser puro (`domain/monsterActions.js`) classifica cada ação em três tipos:

- **ataque** — tem `attack_bonus`; rola `1d20+bônus` e depois o dano.
- **salvaguarda** — tem `dc`; anuncia CD e atributo, e alimenta o dano em área.
- **outra** — nem uma nem outra (Multiattack, auras, habilidades passivas). Fica
  no statblock como texto, sem botão.

Três armadilhas dos dados que o parser precisa tratar:

1. **`success_type` mente.** 31 ações dizem `"half"`, mas 36 descrições dizem
   "half as much damage on a successful one" — o Sopro de Fogo do dragão vermelho
   adulto é uma das cinco divergências, marcado como `"none"` num efeito que o
   PHB define como metade. O parser considera "metade no sucesso" quando
   **qualquer um dos dois** afirma isso; confiar só no campo estruturado faria o
   app aplicar dano cheio em quem passou na salvaguarda.
2. **16 entradas de dano não têm `damage_dice`** — são escolhas
   (`{ choose, from, type }`, tipo "à escolha entre fogo e gelo"). Elas não viram
   botão de dano; a ação continua listada com sua descrição.
3. **Uma ação pode ter mais de um dado de dano** (mordida + veneno). Cada linha
   de dano vira seu próprio botão, com o tipo no rótulo — somá-las num total só
   esconderia que resistência a veneno se aplica a uma e não à outra.

### Na tela

Dentro do `CombatantDetail`, acima do statblock (que continua sendo a fonte de
consulta), uma lista de ações do monstro selecionado. Cada ação de ataque tem
três botões:

- **Atacar** → `1d20+bônus`, rótulo "Goblin 2 · Cimitarra".
- **Dano** → a notação da linha de dano, rótulo com o tipo.
- **Crítico** → o mesmo dano com `crit: true`, que o motor já sabe dobrar.

Botão separado para o crítico, e não detecção automática do 20 natural, porque a
rolagem de ataque e a de dano são gestos independentes aqui: o Mestre pode rolar
o ataque, ouvir a CA do jogador, e só então decidir. Amarrar as duas exigiria
guardar estado por ação e ainda erraria quando o crítico vem de outra fonte.

Ação de salvaguarda mostra "CD 21 DES · metade no sucesso" e um botão de dano.

A rolagem usa o `roll()` do `DiceRollerContext`, o mesmo da ficha — vantagem,
histórico e dados 3D vêm junto sem código novo.

## Dano em área multi-alvo

### O gesto

Um botão "Dano em área" na barra de comando entra em modo de mira. Nesse modo:

- cada linha da ordem de iniciativa ganha uma caixa de seleção;
- um painel embaixo pede o valor do dano e mostra os alvos marcados;
- cada alvo marcado tem um interruptor **"passou"**, que aplica metade nele;
- "Aplicar" resolve tudo de uma vez e sai do modo de mira.

Metade arredonda **para baixo** (PHB p.196, divisão de dano).

### Como escreve

Os monstros vão numa **única** chamada de `update`, com uma função nova de
domínio:

```js
applyNpcDamageMany(state, [{ id, amount }, …])
```

Um `update` por alvo geraria uma corrida de versões contra o próprio lock
otimista — o segundo save sairia com a versão que o primeiro acabou de invalidar,
levaria conflito de propósito e recarregaria do servidor no meio da aplicação.

Os PJs continuam um a um pela RPC da ficha, que é por natureza uma escrita por
personagem. As escritas de PJ são disparadas em paralelo e esperadas juntas: são
fichas diferentes, sem lock compartilhado entre elas.

### Desfazer

O slot de desfazer do sub-projeto 1 guarda **um** combatente. Ele passa a guardar
uma lista, porque desfazer só metade de uma bola de fogo seria pior que não
desfazer. A estrutura vira:

```js
lastAction = { label, ids: [], undo: async () => {} }
```

O botão continua sumindo quando os alvos saem do combate — agora quando **todos**
saem. Se um único monstro dos seis foi removido, desfazer ainda faz sentido para
os outros cinco, e `restoreCombatant` já ignora snapshot de quem não está mais na
lista.

## Arquitetura

```
domain/monsterActions.js        parser puro do statblock → ações rolaveis
domain/encounter.js             + applyNpcDamageMany

Encounter/MonsterActionList     botões de ataque/dano/crítico do selecionado
Encounter/AreaDamagePanel       valor, alvos marcados, quem passou, aplicar
Encounter/CombatantDetail       passa a renderizar MonsterActionList
Encounter/EncounterScreen       modo de mira, aplicação em lote, desfazer em lista
Encounter/CombatantRow          caixa de seleção quando o modo de mira está ligado
```

O `EncounterScreen` já é a casca que decide onde cada escrita vai; o modo de mira
mora nele porque é a única camada que enxerga a lista inteira e as duas rotas de
escrita ao mesmo tempo.

## Erros

- Monstro sem ações roláveis (só passivas): a lista não aparece, o statblock
  continua inteiro.
- Notação de dano que o parser do motor recusa: o botão não é criado para aquela
  linha, e a descrição continua visível no statblock.
- Aplicar dano em área sem alvo marcado ou com valor zero: o botão fica
  desabilitado, sem escrita nem entrada no registro.
- Uma escrita de PJ falha no meio do lote: as outras continuam, e o aviso aparece
  na linha do PJ afetado com o mesmo tratamento que já existe. O desfazer segue
  válido para quem foi escrito.
- PJ órfão marcado como alvo: fica de fora da aplicação, como já fica do dano
  individual.

## Testes

Parser (`monsterActions`):

- Goblin devolve duas ações de ataque com bônus +4 e dano `1d6+2`.
- Sopro de Fogo vira ação de salvaguarda com CD 21 DES e **metade no sucesso**,
  apesar de `success_type: "none"` — é a regressão que o campo mentiroso causaria.
- Ação com `{ choose, from }` no dano não vira botão de dano.
- Ação com duas linhas de dano devolve duas entradas, cada uma com seu tipo.
- Multiattack não vira ação rolável.

Domínio:

- `applyNpcDamageMany` aplica em todos os ids de uma vez e ignora id inexistente.
- HP temporário é absorvido por alvo, independentemente.

Componentes:

- Clicar em "Atacar" chama `roll` com `1d20+4` e o nome do monstro no rótulo.
- Clicar em "Crítico" chama `roll` com `crit: true`.
- Modo de mira mostra caixas de seleção e some ao aplicar.
- Aplicar com "passou" marcado aplica metade arredondada para baixo.
- Aplicação em lote chama `update` **uma vez** para os monstros.
- Desfazer restaura todos os alvos.

## Fora de escopo

Multiattack encadeado (rolar as três investidas do dragão num clique), recarga
de sopro (`usage.recharge`), resistências e imunidades aplicadas automaticamente
ao dano, e a Tela do Jogador. Nada aqui muda o esquema do banco: não há migration
neste sub-projeto.
