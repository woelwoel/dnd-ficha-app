# Caçador de Sangue — conteúdo de terceiros no eixo `source`

Data: 2026-08-25
Estado: aprovado, pronto para virar plano de implementação

## Problema

O app cobre três livros (PHB, Tasha, Xanathar). O dono quer jogar Caçador de
Sangue, classe do Matt Mercer que não está em nenhum deles. Não existe hoje
nenhum caminho para conteúdo fora dos livros oficiais.

## Decisões tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Eixo | `source` novo, código `homebrew` | O eixo `source` é aditivo (só acrescenta opção ao picker). `ruleset` é substitutivo e não serve — a classe não troca resposta de pergunta existente. |
| Rótulo | Categoria genérica "Conteúdo de Terceiros" | Balde para material fora dos livros oficiais, não uma fonte por editora. |
| Versão | 2016 oficial, em português | Já traduzida e é o texto do Mercer. A alternativa (revisão de fã de 2020, em inglês) exigiria traduzir ~11 páginas e nos amarraria à revisão de um terceiro em cima do 2020. |
| Profundidade | Integração mecânica completa | Padrão que Runas, Manobras e Infusões já estabeleceram. Classe "burra" destoaria das 13 existentes. |
| Alma Profana | Adiada para projeto separado | Conjuradora de pacto de um terço — encosta em espaços de magia, multiclasse e CD. Mesmo caminho do Hexblade, que deu certo aqui. |
| Assento da mecânica | Módulo de domínio dedicado + duas costuras nomeadas no núcleo | Generalizar `activeEffects` para "efeito de arma" antes de existir o caso concreto inverte a ordem e respinga em conteúdo já em produção. |

## Fora de escopo

- Ordem da Alma Profana e a conjuração de pacto de um terço.
- Generalizar `activeEffects` para efeitos ligados a item. Fica para quando
  houver dois ou três casos reais (Arma de Pacto, venenos, óleos) sobre os
  quais generalizar.
- Editor de homebrew pelo app. A fonte é curada em JSON, como as outras três.

## Arquitetura

### Eixo de conteúdo

`SOURCES` em `domain/sources.js` ganha:

```js
homebrew: { code: 'homebrew', label: 'Conteúdo de Terceiros', abbr: '3P' }
```

`RULESETS['2014'].sources` em `domain/rulesets.js` ganha `'homebrew'`.
`RULESETS['2024'].sources` **não** ganha — a classe é escrita nas regras de
2014, e `sourcesFor` já faz a interseção sozinho, sem código novo.

### Arquivos de dado

Espelham exatamente o pacote do Artífice (a classe do Tasha que já provou este
caminho):

| arquivo | conteúdo |
|---|---|
| `public/srd-data/homebrew-classes-pt.json` | identidade: `index: 'cacador-de-sangue'`, dado de vida d10, salvaguardas Força/Sabedoria, 2 perícias entre 6, papéis, resumo e lore |
| `public/srd-data/homebrew-class-progression-pt.json` | 20 níveis com features e a coluna do dado de rito |
| `public/srd-data/homebrew-class-choices-pt.json` | Rituais Primais e Esotéricos, Estilo de Luta, Ordem, maldições de sangue, fórmulas mutagênicas |

Registro em `data/SrdProvider.jsx`: chaves lógicas `classesHomebrew`,
`progressionHomebrew`, `classChoicesHomebrew`, entrando nas composições
`classes`, `progression` e `classChoices` como partes `[chave, 'homebrew']`.

`cacheName` `srd-data-vN` em `vite.config.js` **precisa ser bumpado**, senão o
Service Worker serve o catálogo antigo e o deploy não chega no usuário.

### Ordens (subclasses)

Entram como `options` no class-choices no formato `• Nv N — ` já parseado por
`domain/subclassFeatures.js`. Os cards por nível e os trackers nascem daí, sem
código novo. Invariante existente a respeitar: id do card == id do tracker.

A Ordem da Alma Profana **existe no dado, marcada como indisponível**, com o
motivo à vista. Não some da lista: um jogador não pode criar a ficha e
descobrir depois que falta um quarto da classe.

### Módulo de domínio

`domain/bloodHunter.js`, puro (sem React), no molde de `domain/runes.js`.
Dono único da regra da classe. Superfície:

- `riteDieFor(level)` — 1d4 (1–5), 1d6 (6–10), 1d8 (11–15), 1d10 (16–20)
- `bloodCursesKnown(level)` — 1 no 2º; +1 no 5º, 9º, 13º, 16º e 20º
- `hemocraftDC(character)` — 8 + proficiência + modificador de Sabedoria
- `chosenRites(character, classChoices)` — Primais no 1º, 6º e 11º; Esotérico a partir do 14º
- `activeRites(character)` — quais armas estão imbuídas
- `bloodHunterMaxHpPenalty(character)` — nível do personagem × ritos ativos; **zero no 20º nível** (Maestria Sanguínea remove o sacrifício)
- `riteDamageFor(attack, character)` — dado e tipo de dano do rito daquela arma

### As duas costuras no núcleo

1. **PV máximo** — `domain/rules.js:753` passa a subtrair
   `bloodHunterMaxHpPenalty(character)`. Hoje o teto sai de
   `combat.maxHp + aumentos` e não existe delta temporário.
2. **Dano por arma** — a montagem do ataque carimba `attack.rite`, e
   `utils/attacks.js:calculateWeaponDamage` soma o dado. Copia o padrão que já
   existe no arquivo: `attack.fightingStyles` já é lista carimbada por arma,
   porque um estilo vale só na arma que se qualifica. O rito é o mesmo formato
   de problema.

### UI

**Painel do Ritual Vermelho**, no mesmo lugar do Painel de Runas: escolhe arma
+ rito conhecido e ativa. Ao ativar, o teto de PV cai, um chip aparece no
cabeçalho e a linha de ataque daquela arma mostra o dado extra com o tipo de
dano certo.

O rito termina por: botão, descanso longo, ou ao ativar outro rito na mesma
arma.

**Trackers.** Sangue Maldito (1/2/3/4 usos por descanso curto ou longo, nos
níveis 2, 6, 11 e 17) via `defaultClassFeatureUses`. Os das Ordens —
Transformação Híbrida, Elevação Impulsiva, Metabolismo Estranho — vêm do
parser de features de subclasse.

## Qualidade do texto

A tradução do PDF de 2016 tem defeitos: "Ordem do Ghostslayer" não traduzido,
"Regeneration Licantrópica", "Charisma", "MASTERIA", "descanço". O texto será
**revisado na transcrição** — redação corrigida, regra intacta. O app hoje tem
texto limpo e não vamos regredir nisso.

## Fases

1. **Fonte + classe base.** Código `homebrew`, os três JSONs, registro no
   SrdProvider, bump do SW. Classe do 1º ao 20º com Ritual Vermelho e Sangue
   Maldito vivos: painel, redutor de PV máximo, dano por arma, tracker de usos.
   Nenhuma Ordem ainda.
2. **Ordem do Caçador de Espectros e Ordem do Licantropo.** Ambas cabem no
   parser de subclasse e nos trackers existentes.
3. **Ordem do Mutante e os 14 mutagênicos.**

A fase 3 é isolada de propósito. Os mutagênicos mexem em **valor de atributo e
no teto do atributo** (Potência: +Força igual ao nível de mutação, teto
incluso), CA, deslocamento, iniciativa, resistências, visão no escuro e faixa
de crítico (Precisão: 19-20, depois 18-20). Nada disso é modelado hoje —
`aggregateSpellEffects` só conhece CA, salvaguardas e deslocamento. É a maior
fatia do projeto, maior que a classe base.

Se o custo da fase 3 estourar, as fases 1 e 2 são entregáveis sozinhas e o
Mutante fica com as fórmulas registradas e efeito manual até a fase fechar —
em vez de segurar a classe inteira refém da parte mais cara.

## Testes

- **Domínio, puro:** dado de rito e maldições conhecidas nos 20 níveis; CD de
  Hemocraft; redutor de PV máximo com 0, 1 e 2 ritos ativos; o redutor virando
  zero no 20º nível.
- **Costuras:** teto de PV cai e volta ao desfazer o rito; o dano do rito
  aparece na arma imbuída e **não** nas outras; rito coexistindo com Estilo de
  Luta na mesma arma sem um comer o outro.
- **Fonte:** classe não aparece no picker com a fonte desligada; aparece com
  ela ligada; **não** aparece no ruleset 2024; ficha que já escolheu a classe
  continua renderizando mesmo com a fonte desligada depois (invariante de
  `filterCatalogBySources`).
- **Dado:** id de card de subclasse == id de tracker, para as Ordens.

A suíte roda em fatias com `--maxWorkers=2` — sem flags ela estoura a memória
da máquina e finge falhas em arquivos sem relação.
