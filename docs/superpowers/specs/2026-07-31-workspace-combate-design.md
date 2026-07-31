# Workspace de Combate (sub-projeto 1 de 3)

Data: 2026-07-31
Referência de design: [improvedinitiative.app](https://improvedinitiative.app)

## Contexto

A tela de combate entregue em 2026-07-27 (spec `2026-07-26-mesa-de-combate-design.md`)
funciona, mas é uma coluna única onde cada linha carrega tudo: input de iniciativa,
HP, CA, input de valor, quatro botões, chips de condição e uma paleta de condições
que expande dentro da própria linha. O resultado parece um formulário, não uma mesa.
Falta também o que o Mestre mais precisa e não tem: **ver o statblock do monstro**.

Este sub-projeto reconstrói a tela de combate. Os outros dois — telas de preparação
(Mesa e Encontros) e o monstro que rola os próprios ataques — têm specs próprios.

## Decisões que moldam tudo

**Duas colunas, não três.** O Improved Initiative mantém a biblioteca de criaturas
aberta permanentemente porque lá montar e rodar o encontro acontecem no mesmo lugar.
Aqui já existem a tela de Encontros e a fase de montagem, então a biblioteca é um
gesto ocasional (reforços, invocações) e não merece um terço da tela a noite inteira.

**Dano e cura continuam na linha.** O modelo "seleciona depois age" do Improved
Initiative só é rápido porque lá o dano é uma tecla de atalho. Atalhos de teclado
ficaram fora de escopo por decisão do dono, então exigir seleção antes de aplicar
dano seria uma regressão em relação à tela de hoje.

**Desktop primeiro.** Abaixo de `lg` o layout empilha: o painel de detalhe cai
embaixo da lista. Sem sistema de abas, sem gaveta lateral, sem media query em JS.

## Arquitetura

`EncounterScreen` vira uma casca de layout e orquestração. Todo o resto sai dela
para componentes com responsabilidade única.

```
EncounterScreen                     casca: carrega, orquestra, decide onde escrever
├── EncounterToolbar                rodada, XP, turno anterior/próximo, adicionar, encerrar
├── UndoBar                         "Desfazer: dano 7 em Goblin 2"
├── InitiativeList                  <ul> da ordem de iniciativa
│   └── CombatantRow                linha enxuta, selecionável
│       └── HpBar                   barra + números
└── CombatantDetail                 painel lateral do selecionado
    ├── MonsterStatBlock            já existe (src/systems/dnd5e/components/Bestiary)
    ├── PcTacticalCard              novo: CA, PV, salvaguardas, percepção passiva
    ├── ConditionPalette            paleta de condições + duração
    └── CombatLog                   registro da sessão
```

O domínio puro (`domain/encounter.js`) ganha três funções e nenhuma dependência nova.

### Seleção

`selectedId` é **estado local do componente**, nunca persistido no jsonb. Persistir
faria dois aparelhos do Mestre brigarem pela seleção e queimaria um bump de versão
por clique.

Regra de foco: a seleção acompanha o combatente ativo quando o turno muda; um clique
manual sobrescreve até a próxima virada de turno. `nextTurn` e `previousTurn` sempre
reposicionam a seleção no novo ativo.

Selecionar é um `<button>` em volta do nome, não um `onClick` no `<li>` — linha
inteira clicável quebraria a navegação por teclado e conflitaria com os inputs que
moram dentro dela.

### A linha (`CombatantRow`)

Fica na linha: iniciativa, nome (botão de seleção), barra de HP com números, CA,
chips de condição em modo leitura, campo de valor + Dano + Cura, remover.

Sai da linha para o painel: HP temporário, paleta de condições, avisos de
concentração e morte, statblock.

`HpBar` colore por fração — acima de 50% verde, de 25% a 50% âmbar, acima de zero
vermelho, zero mostra "caído". Combatente `defeated` ou `isDead` fica esmaecido com
o nome riscado, como hoje.

### O painel (`CombatantDetail`)

Renderiza **uma vez só**, no `<aside>`. Em telas largas fica à direita em `grid`;
abaixo de `lg` o grid vira uma coluna e o painel cai sob a lista. Não há segunda
instância no DOM e não há `matchMedia` em JS.

Conteúdo por tipo de combatente:

- **Monstro**: busca `monsterIndex` no dataset preguiçoso `monsters` e renderiza
  `MonsterStatBlock`. Enquanto o catálogo não resolve, mostra "carregando
  statblock…"; se o índice não existir no catálogo, diz isso em vez de renderizar
  vazio.
- **PJ**: `PcTacticalCard` com o que o Mestre precisa consultar no turno do jogador —
  CA, PV/PV máximo/temporário, salvaguardas, percepção passiva, deslocamento,
  resistências e imunidades. Não é a ficha inteira: quem quer a ficha abre a ficha.
- **Nada selecionado**: convite curto para escolher alguém na lista.

Abaixo do statblock, sempre: HP temporário, `ConditionPalette` e `CombatLog`.

### Adicionar monstro no meio do combate

Reusa `BestiaryModal`, que já tem busca, prévia de statblock e `onPick`. É modal e
não gaveta de propósito: o componente já existe, já é testado, e para um gesto que
acontece duas vezes por sessão a diferença entre modal e gaveta é estética.

O monstro entra com `initiative: null`, que ordena para o fim da lista. Uma função
nova de domínio rola a iniciativa só dele e o reordena, sem tocar em `activeId` nem
na rodada:

```js
rollInitiativeFor(state, id, rng)   // → state
```

`nextTurn` procura o ativo por id, não por índice, então inserir alguém antes do
ativo não faz ninguém agir duas vezes nem pular.

### Desfazer a última ação

Um único nível de desfazer, em estado local, com um slot só. Vale para a última
escrita de dano, cura ou HP temporário. Escolha deliberada: um histórico completo
exigiria persistir o antes de cada escrita no jsonb, e o problema real é o "70"
digitado no lugar de "7" — que o Mestre percebe no mesmo segundo.

```js
lastAction = { combatantId, label, undo: async () => {} }
```

O slot é limpo por qualquer ação seguinte, pela virada de turno, por adicionar ou
remover combatente e ao encerrar o combate. Nunca sobrevive a um recarregamento da
página.

- **Monstro**: guarda o combatente inteiro antes da mudança e restaura só ele sobre
  o estado atual, via função nova de domínio `restoreCombatant(state, snapshot)`.
  Restaurar o `state` inteiro seria mais simples e errado: atropelaria o que o outro
  aparelho do Mestre tivesse mudado no meio, e reverteria a rodada junto.
- **PJ**: reescreve o bloco `combat` anterior pela mesma RPC `dmApplyCombatState`,
  na versão atual da ficha. Se a escrita de desfazer falhar, o aviso é o mesmo
  tratamento de erro que já existe para as escritas normais.

### Condições com duração

Marcar uma condição continua sendo um toque. Marcar **com duração** é um segundo
gesto opcional na paleta: um seletor de rodadas ao lado da condição já ativa.

Formato no combatente, retrocompatível com o que está gravado hoje:

```js
conditions: ['prone', 'frightened'],        // inalterado
conditionUntil: { frightened: 5 },          // novo, opcional
```

`conditionUntil[id]` é a **rodada absoluta em que a condição some**, não uma contagem
regressiva. Absoluto sobrevive a `previousTurn` (que decrementa a rodada) sem
precisar recalcular nada. Duração de N rodadas marcada na rodada R grava `R + N`:
marcar 2 rodadas na rodada 3 mantém a condição nas rodadas 3 e 4 e a remove ao entrar
na 5.

A expiração roda dentro de `nextTurn`, no domínio puro, depois de calcular a rodada
nova. Condição sem entrada em `conditionUntil` nunca expira sozinha.

**Limitação conhecida e deliberada: duração vale só para monstros.** As condições do
PJ moram no doc da ficha dele, que é compartilhado com o próprio jogador; expirá-las
a partir da tela do Mestre exigiria campo novo no bloco `combat`, mudança na RPC e
migration. Para PJ a condição continua entrando e saindo por toque manual.

### Log da sessão

`CombatLog` mostra as últimas 50 entradas em `{ round, text }`, do mais recente para
o mais antigo, dentro do painel de detalhe.

**O log é local e não persistido.** Persistir custaria uma escrita extra por dano no
PJ — as mudanças de PJ vão pela RPC da ficha e não passam pelo `update` do encontro,
então metade do log ficaria de fora ou pagaria uma segunda ida à rede por golpe.
Log pela metade é pior que log honestamente efêmero. Ele morre ao recarregar a página
e ao encerrar o combate.

## Fluxo de dados

Nada muda no modelo de escrita estabelecido na spec de 2026-07-26 e ele continua
sendo a invariante mais importante da tela:

- Regra de D&D sempre roda em JS, no domínio.
- HP do PJ **nunca** é copiado para o encontro. Mora no doc da ficha, e a tela só o
  reescreve pelas duas RPCs estreitas da migration 0015.
- Mudança de monstro vai para o jsonb do encontro por `update`, com lock otimista.
- `loadCampaignCharacters` engole erro e devolve `[]`; `reloadParty` continua se
  recusando a sobrescrever uma companhia já povoada com um resultado vazio.

## Erros

Os tratamentos existentes ficam como estão: conflito de versão do encontro recarrega
e avisa; falha de escrita na ficha tenta reler a companhia e distingue os três casos
(conflito, falha simples, falha dupla). O que muda é onde o aviso aparece — sai da
linha e vai para o painel de detalhe do combatente afetado, com a linha marcando que
há um aviso.

Casos novos:

- Catálogo de monstros ainda carregando quando o painel abre → estado de carregamento
  explícito, nunca painel vazio.
- `monsterIndex` fora do catálogo → mensagem dizendo que o statblock não foi
  encontrado, com o nome e o índice, sem quebrar o resto do painel.
- Desfazer com o combatente já removido da lista → o botão some junto com ele.

## Testes

Domínio (`src/test/encounter.test.js` e vizinhos):

- `restoreCombatant` devolve só o combatente alvo ao estado do snapshot e não toca
  nos outros, nem em `round`, nem em `activeId`.
- `rollInitiativeFor` rola só para o id pedido, reordena e preserva `activeId`.
- `nextTurn` remove condição cuja rodada de expiração chegou e preserva as sem prazo.
- `previousTurn` não ressuscita condição já expirada (é comportamento aceito e
  documentado, o teste fixa a expectativa).
- Combatente gravado antes desta mudança, sem `conditionUntil`, atravessa `nextTurn`
  intacto.

Componentes:

- `CombatantRow` não renderiza mais paleta de condições nem HP temporário.
- Clicar no nome seleciona; virar o turno move a seleção para o novo ativo.
- Painel mostra `MonsterStatBlock` para monstro e `PcTacticalCard` para PJ.
- Desfazer restaura o HP do monstro no estado do encontro.
- Desfazer de PJ chama `dmApplyCombatState` com o bloco `combat` anterior.
- Adicionar monstro durante o combate o insere já com iniciativa.

Os testes existentes de `EncounterScreen`, `CombatantRow`, `EncounterRoute` e
`EncounterSetupPanel` continuam valendo e serão ajustados, não descartados, onde a
mudança de layout mover um elemento de lugar.

## Fora de escopo

Tela do Jogador, atalhos de teclado, ocultar combatente dos jogadores e iniciativa em
grupo foram descartados pelo dono. Ataques clicáveis no statblock e dano em área
multi-alvo são o sub-projeto 3. Melhorias das telas de Mesa e Encontros são o
sub-projeto 2.
