# Telas de Preparação: Mesa e Encontros (sub-projeto 2 de 3)

Data: 2026-07-31
Antecessor: `2026-07-31-workspace-combate-design.md`

## Contexto

Com o combate reconstruído, sobram as duas telas em volta dele. As duas têm o
mesmo defeito: mostram o que é fácil de consultar e escondem o que o Mestre
precisa decidir.

**Mesa** (`CampaignDetail`) trata "Rodar combate" — a ação de toda semana — como
um botão do mesmo peso de "Encontros", espremido entre o código de convite e a
lista de fichas, enquanto "Apagar mesa" ganha uma seção inteira com título.
Membros e fichas moram em duas caixas separadas que nunca dizem que
"cristimansigor2" e "Sahir Al Madih" são a mesma pessoa. E o jogador, ao abrir a
mesa, vê apenas um código de convite e uma lista de logins.

**Encontros** (`EncounterLibraryScreen`) salva um encontro e depois não conta o
que tem dentro dele: a linha mostra o nome, o XP ajustado e a banda de
dificuldade, mas não os monstros. Para rodar um encontro salvo é preciso sair
dali, ir para a tela de Combate e carregá-lo pelo painel de montagem.

## Mesa

### Bloco de ação no topo

Logo abaixo do cabeçalho, antes de qualquer outra coisa: o estado do combate.

- **Combate em andamento** (existe encontro ativo com `started: true`): mostra a
  rodada e quantos combatentes estão na cena, com "Retomar combate" em destaque
  e "Encerrar" discreto ao lado.
- **Encontro ativo mas não iniciado**: "Continuar montagem".
- **Nada em andamento**: "Rodar combate" em destaque e "Encontros" ao lado.

A leitura é feita com `getActiveEncounter`, que já existe e já é usada pelo
`useEncounter`. Esta tela **lê e não cria** — abrir a Mesa não pode criar um
encontro vazio no banco, que é o que `useEncounter` faz de propósito ao montar.
Por isso a Mesa chama a função da lib direto, não o hook.

### Uma linha por jogador

`MembersList` e `CampaignCharactersList` viram um componente só, `PartyList`,
que casa membro e ficha por `owner_id === user_id` — os dois lados já vêm com
esse campo, sem query nova.

Cada linha traz: avatar do perfil, nome de exibição, papel (Mestre/Jogador), e —
quando houver ficha — nome do personagem, raça, classe, nível e PV. Clicar na
ficha abre em modo leitura, como hoje. Remover o membro continua onde estava.

Três casos que a fusão precisa tratar sem inventar:

- **Membro sem ficha**: diz "ainda não criou ficha", não some da lista.
- **Ficha sem membro**: o dono saiu da mesa mas a ficha ficou (ou está sendo
  desvinculada). Aparece numa seção separada, "Fichas sem dono na mesa".
- **Membro com mais de uma ficha**: a lista mostra todas na mesma linha do
  jogador, não escolhe uma em silêncio.

A falha de leitura das fichas continua sendo mostrada como hoje — o comentário em
`CampaignCharactersList` registra que lista vazia por erro de query já escondeu
um bug de schema por semanas, e essa distinção não pode se perder na fusão.

### O jogador enxerga a companhia

Para quem não é Mestre, a mesma `PartyList` é alimentada por `loadCampaignRoster`
(RPC `campaign_roster`, migration 0011), que devolve resumo público: nome,
raça, classe, nível, PV e CA — sem vazar a ficha inteira. O jogador vê com quem
está jogando; continua sem conseguir abrir a ficha alheia.

### Renomear e código de convite

O nome da mesa vira editável no lugar, pelo `renameCampaign` que já existe: um
botão discreto ao lado do título troca o `<h1>` por um input, com Enter para
salvar e Esc para cancelar. Só o Mestre vê o botão.

O `InviteCodeBox` passa a nascer recolhido atrás de um "Convidar jogador",
porque só importa quando entra gente nova. A zona de perigo perde o parágrafo
explicativo permanente — ele vai para o próprio `ConfirmDialog`, que já explica a
consequência antes de apagar.

## Encontros

### O card conta o que tem dentro

Cada encontro salvo passa a mostrar a composição: "4× Goblin · 1× Hobgoblin".
A receita já guarda `{ monsterIndex, count }` e o catálogo já é carregado nessa
tela para calcular a dificuldade — é derivação pura, sem leitura nova.

Com mais de quatro espécies distintas, corta em "+N espécies" para a linha não
virar parágrafo. Monstro que o catálogo não reconhece continua sendo contado no
aviso de "desconhecido" que já existe.

### Rodar direto da biblioteca

Botão "Rodar" em cada encontro salvo. Ele navega para a tela de Combate levando
o id do template, e o `SetupPanel` carrega a receita ao abrir — a montagem
continua sendo a fase onde o Mestre marca quem da companhia está na cena e rola
a iniciativa. Atalho de navegação, não caminho paralelo.

O id do template viaja por query string (`?encontro=<id>`), e não por estado de
rota, para que a URL sobreviva a um recarregamento no meio da sessão.

Se o template tiver sumido entre a lista e a montagem, a tela de Combate abre a
montagem vazia com um aviso, em vez de erro.

### Duplicar e buscar

- **Duplicar**: cria uma cópia com o nome "<nome> (cópia)", resolvendo colisão
  com sufixo numérico — a lib já rejeita nome duplicado por `duplicate-name`, e
  a duplicação não pode falhar por causa da própria regra que ela mesma dispara.
- **Buscar**: campo de filtro por nome, exibido apenas quando houver mais de
  cinco encontros salvos. Filtra em memória; a lista inteira já vem carregada.

### Notas do encontro

Campo de texto livre por encontro, no editor. Serve para gancho, tática e
tesouro. É armazenado junto da receita, e por isso precisa de uma coluna nova em
`encounter_templates`:

```sql
alter table encounter_templates add column if not exists notes text;
```

Migration `0018`. `updateTemplate` e `createTemplate` passam a aceitar `notes`
opcional; template gravado antes disso lê `null` e a UI mostra o campo vazio.

As notas aparecem no card da biblioteca em uma linha truncada, e inteiras no
editor. **Não aparecem durante o combate neste sub-projeto** — a tela de combate
carrega o encontro pela fase de montagem e não guarda de qual template ele veio;
ligar as duas pontas exigiria gravar essa origem no jsonb do encontro, que é
trabalho do sub-projeto 3, onde o painel lateral já será mexido.

## Arquitetura

```
CampaignDetail                 casca: carrega mesa, papel e encontro ativo
├── CampaignHeader             título editável + papel
├── EncounterStatusCard        rodada em andamento / retomar / rodar / encontros
├── InviteCodeBox              recolhido atrás de "Convidar jogador"
├── PartyList                  membros e fichas casados por owner_id
│   └── PartyRow
└── DangerZone                 apagar mesa

EncounterLibraryScreen         inalterado na estrutura
├── EncounterListItem          novo: composição, notas, rodar, duplicar, apagar
└── EncounterEditor            extraído: nome, notas, monstros, dificuldade
```

`fetchCampaignCharacters` e `listMembers` continuam como estão; quem cruza os
dois é a `PartyList`, e o cruzamento é função pura, testável sem rede:

```js
mergeParty(members, characters, { currentUserId })
// → { rows: [{ userId, displayName, avatarUrl, role, isSelf, characters: [] }],
//     orphanCharacters: [] }
```

## Erros

- `getActiveEncounter` falhando na Mesa: o bloco de ação cai para o estado
  "nada em andamento" com um aviso discreto. Nunca esconde o botão de rodar
  combate por causa de uma leitura que não respondeu.
- Falha ao renomear: o título volta ao valor anterior e mostra o motivo.
- Duplicar com nome que colide mesmo após o sufixo: mostra o erro da lib.
- Template apagado entre listar e rodar: montagem vazia com aviso.
- Roster do jogador falhando: a lista mostra os membros sem os personagens, e
  não uma tela vazia.

## Testes

Puros:

- `mergeParty` casa por `owner_id`, mantém membro sem ficha, agrupa duas fichas
  do mesmo dono e devolve ficha órfã separada.
- `describeRecipe` resume a composição e corta em "+N espécies".
- `nextCopyName` resolve colisão de nome ao duplicar.

Componentes:

- Mesa com combate em andamento mostra a rodada e "Retomar".
- Mesa sem encontro ativo mostra "Rodar combate" e não cria encontro no banco.
- Jogador vê a companhia pelo roster e não vê o botão de apagar mesa.
- Renomear salva e reflete no título; Esc cancela.
- Card de encontro salvo mostra a composição.
- "Rodar" navega para o combate com o template na query string.
- Duplicar cria o "(cópia)".
- Busca aparece só acima de cinco encontros.

Os testes existentes de `CampaignCharactersList`, `campaign-roster`,
`campaigns-rename`, `EncounterLibraryScreen` e `EncounterLibraryRoute` continuam
valendo e serão ajustados onde a fusão mover elementos de lugar.

## Fora de escopo

Notas visíveis durante o combate (sub-projeto 3). Bestiário liberado por mesa
(fog of war) segue adiado. Nada aqui mexe no motor de rolagem nem no domínio de
encontro.
