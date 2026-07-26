# Magias raciais inatas — design

Data: 2026-07-26
Status: aprovado pelo dono

## Problema

Quatro raças do app concedem magias por traço racial e **nenhuma delas chega à
ficha**. O texto existe só como prosa na aba Habilidades ("Você possui o truque
globos de luz. Quando você alcança o 3° nível..."), então o jogador precisa
adicionar a magia na mão — e, quando adiciona, ela vem com o atributo de
conjuração da classe, não o do traço.

O Alto Elfo é a exceção que já funciona: o truque é escolhido no wizard
(`racialCantrip`) e injetado no build.

Junto com isso, o app não tem como conjurar uma magia **sem gastar espaço**. O
comentário em `Spells.jsx:96-98` já registra a lacuna: "Hoje ele não tem como
conjurar (sem slot; o botão de free cast é do plano 3)". As magias raciais
precisam exatamente disso, e as de talento também — o dono decidiu construir o
mecanismo UMA vez, servindo os dois.

## Escopo

Entram as quatro raças que os dados do app descrevem:

| Chave (sub-raça ou raça) | Traço | Atributo | Concessões |
|---|---|---|---|
| `elfo-negro-drow` | Magia Drow | CAR | `globos-de-luz` (nv1, à vontade) · `fogo-das-fadas` (nv3, 1×/longo, conjura como nv1) · `escuridao` (nv5, 1×/longo, nv2) |
| `tiefling` | Legado Infernal | CAR | `taumaturgia` (nv1, à vontade) · `repreensao-infernal` (nv3, 1×/longo, **conjura como nv2** — texto explícito) · `escuridao` (nv5, 1×/longo, nv2) |
| `duergar` | Magia Duergar | INT | `aumentarreduzir` (nv3, 1×/longo, nv2) · `invisibilidade` (nv5, 1×/longo, nv2) |
| `gnomo-da-floresta` | Ilusionista Nato | INT | `ilusao-menor` (nv1, à vontade) |

O atributo do Duergar é INT porque é o que o texto do app diz ("Inteligência é
sua habilidade de conjuração para estas magias"). O gating usa o nível **total**
do personagem (traço racial não é de classe).

**Fora do escopo, de propósito:**

- Alta Magia Drow é TALENTO (Xanathar), já coberto por `featSpells.js`.
- As restrições textuais "somente versão Ampliar" e "somente sobre si mesmo"
  (Duergar) ficam como nota no selo da magia, não viram regra mecânica.
- O truque do Alto Elfo continua no caminho atual (escolha no wizard).

## Arquitetura

### 1. Declaração — `domain/racialSpells.js`

Tabela de dados espelhando o formato de `featSpells.js`:

```js
{ 'elfo-negro-drow': {
    label: 'Magia Drow', ability: 'cha',
    grants: [
      { spell: 'globos-de-luz',  minLevel: 1, atWill: true },
      { spell: 'fogo-das-fadas', minLevel: 3, freeCast: 'long', castAtLevel: 1 },
      { spell: 'escuridao',      minLevel: 5, freeCast: 'long', castAtLevel: 2 },
    ] } }
```

`getRacialSpellDef(race, subrace)` resolve por sub-raça primeiro e cai na raça
(o tiefling não tem sub-raça). `grantIdx` é a posição ABSOLUTA em `grants` — é
o que vai persistido na proveniência, então **reordenar `grants` orfana ficha
salva**.

### 2. Injeção — `injectRacialSpells(character, srdSpells)`

Espelha `injectFeatSpells`: merge idempotente por `index`, mapa de trabalho
único, e **retorna o MESMO objeto quando nada muda** (identidade preservada —
sem isso a abertura da ficha marcaria mudança e dispararia autosave).

Cada magia concedida recebe:

- `ability` — o atributo do traço, e **só quando a raça CRIA a magia**. Se a
  magia já existia (o Bruxo drow que aprendeu Escuridão pela classe), o
  atributo original é preservado, igual à regra do motor de talento;
- `alwaysPrepared: true`, `prepared: true`, `source: 'race'`, `sourceLabel` com
  o nome do traço;
- `raceGrants: [{ raceKey, grantIdx }]` — proveniência, ACUMULA (nunca
  sobrescreve);
- `raceCreated: true` **apenas** quando a magia não existia antes. É o que
  separa "só tenho isso pela raça" de "também sei pela classe", e é o que a
  política de slots consulta.

Concessão cujo `minLevel` é maior que o nível total simplesmente não entra.
Injetar de novo depois de subir de nível acrescenta as novas sem tocar nas
antigas.

**Onde roda:**

1. build do wizard (`buildCharacterWithSubclassSpells`);
2. level-up, junto com as outras injeções;
3. **abertura da ficha** — retrofit automático. Diferente dos talentos (que o
   dono decidiu retrofitar por botão explícito), aqui não há escolha nenhuma
   envolvida: um drow simplesmente TEM Magia Drow. A idempotência garante que
   abrir a ficha duas vezes não duplica nada.

### 3. Política de conjuração — `domain/castPolicy.js`

`getSpellCastPolicy(spell, character)` devolve a UNIÃO da política de talento
(`getCastPolicy`, que já existe e continua intocado) com a racial:

- `slots` — OR. A parte racial contribui `false` **apenas** quando
  `raceCreated`; caso contrário contribui `true`, porque a raça não tira o que
  a classe dá. Sem proveniência nenhuma a função devolve `null` e a UI usa o
  comportamento padrão de hoje;
- `atWill` — OR (truque racial, e as concessões marcadas à vontade);
- `freeCast` — LISTA concatenada; cada concessão tem tracker próprio. Um drow
  com Tocado pelas Sombras pode ter dois usos independentes da mesma magia;
- `ritualOnly` — só do lado do talento (nenhum traço racial é ritual-only).

`trackerId` racial: `raca-<raceKey>-<spellIndex>`.

### 4. Trackers — `defaultClassFeatureUses`

Duas seções novas, FORA do laço de classes (traço racial e talento não
dependem de classe):

```js
{ id: 'raca-elfo-negro-drow-fogo-das-fadas',
  name: 'Fogo das Fadas (Magia Drow)',
  max: 1, used: 0, recharge: 'long', source: 'raca' }
```

A seção de talento segue o que a spec de 2026-07-15 já definiu
(`feat-<talento>-<magia>`, `recharge` da declaração).

Truque e `atWill` NÃO geram tracker. `mergeFeatureUses` preserva `used`, e o
reset por descanso já é genérico sobre `recharge` (`utils/rest.js`) — nada novo
lá.

### 5. UI — `SpellRow`

O picker "Conjurar em:" passa a ser montado pela política:

- um botão **"1×/desc. longo (N)"** por entrada de `freeCast`; desabilitado
  (com o motivo no `title`) quando o tracker está esgotado, nunca escondido —
  sumir seria lido como "essa magia não dá pra conjurar";
- botões de slot escondidos quando `slots` é false;
- botão **"à vontade"** quando `atWill` numa magia de nível > 0 (caso de
  talento, ex. Alta Magia Drow). Truque racial NÃO precisa disso: o botão-raio
  "Rolar truque" já conjura sem gastar recurso e cobre os três truques da
  tabela;
- conjurar por uso grátis gasta o TRACKER e roda o mesmo plano de rolagem de
  hoje, com o `castAtLevel` da declaração (Repreensão Infernal como 2º nível).

**Ponto de atenção:** hoje o botão de conjurar de magia com nível é
`disabled` quando não há espaço disponível (`Spells.jsx:712-715`). É
exatamente o que trava o Guerreiro drow, que não tem espaço nenhum — a
condição passa a considerar também os usos grátis disponíveis.

O selo do traço (`sourceLabel`) já é exibido pelo caminho de sempre-preparada.

## Fluxo de dados

```
racialSpells.js (declaração)
   ├─ injectRacialSpells ──▶ character.spellcasting.spells[]  (ability, raceGrants, raceCreated)
   ├─ defaultClassFeatureUses ──▶ character.combat.classFeatureUses[]  (raca-*, recharge long)
   └─ getSpellCastPolicy ◀── lê raceGrants AO VIVO (nada de política persistida)
                                    │
                                    ▼
                          SpellRow: botões de conjuração
                                    │
                                    ▼
                     handleCast({ freeUse: trackerId }) ──▶ gasta tracker + rola plano
```

Nenhuma decisão de política é persistida na magia — só proveniência. Mudar a
tabela muda o comportamento de fichas já salvas sem migração.

## Erros e casos de borda

- **Magia fora do catálogo** (índice errado na tabela): a injeção pula a
  concessão. Um teste varre a tabela inteira contra o catálogo pra isso falhar
  no CI, não na ficha do jogador.
- **`grantIdx` órfão** (tabela editada depois de fichas salvas): mesma conduta
  do motor de talento — avisa em DEV e ignora a referência, sem derrubar a
  ficha.
- **Tracker esgotado**: botão desabilitado, nunca some (some seria confundido
  com "essa magia não existe").
- **Drow bruxo com Escuridão pela classe**: `raceCreated` fica false, os botões
  de slot continuam, e ele ganha o uso grátis por cima.
- **Nível abaixo do mínimo**: concessão ausente da ficha; ao subir de nível
  entra sozinha (level-up já reinjeta).

## Testes

**Domínio**
- tabela × catálogo: todo `spell` declarado existe (guard-rail de CI);
- gating: drow nv1 → 1 magia; nv3 → 2; nv5 → 3;
- idempotência: injetar duas vezes devolve o MESMO objeto;
- merge: magia já conhecida pela classe mantém `ability` e não vira
  `raceCreated`;
- política: união com talento (slots OR, freeCast concatenado);
- trackers: um por concessão com `freeCast`, nenhum pra truque/à vontade.

**Integração (aba Magias)**
- drow nv5: as três magias aparecem, com selo do traço;
- Fogo das Fadas mostra "1×/desc. longo (1)" e NÃO mostra botão de slot;
- conjurar consome o uso; segundo clique fica desabilitado;
- descanso longo devolve o uso.

**E2E**
- ficha salva de drow (sem as magias) ganha as três ao abrir;
- conjurar Fogo das Fadas gasta o uso e abre o painel de rolagem.

## Fatiamento

Um plano só. O motor (declaração + injeção + política + trackers) e a UI são
pequenos demais pra justificar dois ciclos, e entregar o motor sem o botão
deixaria a mesma lacuna que motivou o projeto.
