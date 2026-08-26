# D&D 2024 — Fase 1: fundação do eixo `ruleset`

Data: 2026-08-25
Estado: **APROVADO, não implementado.**

Primeira de seis fases do sub-projeto D&D 2024. Esta fase não entrega
conteúdo 2024 nenhum: entrega o eixo em que as outras cinco vão se pendurar,
mais uma divergência-piloto (exaustão) que prova o mecanismo de ponta a ponta.

## Problema

O app tem hoje **um** eixo de variação de conteúdo: `source`
(`phb`/`tasha`/`xanathar`/`homebrew`), em `domain/sources.js`. Ele é
**aditivo** — o próprio arquivo avisa que serve só para decidir o que é
*oferecido* nos pickers, nunca para trocar regra.

D&D 2024 é **substitutivo**. Ele reescreve funções puras dentro de `rules.js`:
espécie não dá mais bônus de atributo (quem dá é o antecedente, junto com um
talento de origem), subclasse chega no nível 3 para todas as classes, existe
maestria em armas, a exaustão vira −2 acumulativo em vez da tabela de seis
degraus, e preparação de magias, descanso, crítico e iniciativa/surpresa
mudam.

Isso não cabe como quarta `source`: ligar "LdJ 2024" no picker vazaria regra
2024 dentro de uma ficha 2014, em silêncio. Também não deveria virar
`src/systems/dnd5e-2024/`, que duplicaria ~90% de código idêntico (dano, cura,
concentração, salvas de morte, multiclasse, equipamento) e obrigaria a tela do
Mestre a lidar com dois sistemas em vez de duas fichas.

O que falta é um **terceiro eixo**, carimbado na ficha.

## Fonte do conteúdo

`Conteúdos D&D/D&D 2024/dampd-5e---livro-do-jogador-2024.pdf` — Livro do
Jogador 2024 em PT-BR, tradução comunitária Heróis Anônimos (6ª edição,
13/08/2025). Texto extrai limpo com `pdftotext -enc UTF-8`, mesma esteira de
Tasha e Xanathar. Cobre 12 classes × 4 subclasses, 10 espécies, 16
antecedentes, talentos em 4 categorias, equipamento, magias e o glossário de
regras do Apêndice C.

**Offset de paginação — vale para toda a esteira das Fases 2 a 5.** O PDF tem
397 páginas físicas, e a numeração impressa no livro está **6 atrás** da do
PDF:

```
página do PDF = página do livro + 6
```

Ou seja, `pdftotext -f 374 -l 374` entrega a página 368 do livro. O sumário do
livro (Cap. 3 em 48, Cap. 5 em 198, Ap. C em 360) precisa desse ajuste antes de
virar argumento de linha de comando. Todas as citações desta spec usam a
numeração **do livro**.

Nesta fase o PDF é usado só para o texto de Exaustão (Ap. C, p. 368 do livro =
374 do PDF).

## Decisões tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Eixo | `meta.ruleset: '2014' \| '2024'` | Substitutivo, carimbado na ficha. Nem `source` (aditivo) nem sistema irmão (duplicação). |
| Onde mora | `meta.ruleset`, **fora** de `meta.settings` | `settings` é o que o jogador liga e desliga a qualquer momento. Ruleset não é isso. |
| Mutabilidade | **Imutável** após a criação | Trocar 2014→2024 não é um toggle, é uma conversão (espécie perde ASI, subclasse muda de nível, talentos mudam de categoria). Quem quiser mudar cria outra ficha. |
| Exposição na Fase 1 | Escape hatch `?ruleset=2024` | Mesmo padrão de `?sheetV2=`, `?theme=parchment`, `?adm=1`. Permite criar ficha 2024 de verdade e provar carimbo/badge/tela do Mestre sem oferecer ficha meio-pronta ao usuário comum. Vira público na Fase 2 ou 3. |
| Piloto | Exaustão | Função pura pequena, consumida na ficha **e** na tela do Mestre. Prova o eixo do domínio até as duas UIs. |
| Item nunca tem ruleset | Só a ficha tem | Um talento não é "do 2024"; a ficha é. Catálogos 2024 serão arquivos separados, escolhidos pelo ruleset da ficha. |

## Fora de escopo

- Todo e qualquer conteúdo 2024 (espécies, antecedentes, classes, talentos,
  equipamento, magias). Fases 2 a 5.
- As outras divergências de regra de mesa (crítico, iniciativa/surpresa,
  descanso, preparação de magias). Fase 6.
- Conversão de ficha 2014 para 2024. Sub-projeto próprio, depois da Fase 3.
- Tornar o seletor de ruleset público. Fase 2 ou 3.

## Decomposição do sub-projeto completo

| # | Fase | Entrega |
|---|---|---|
| 1 | **Fundação do eixo** ← esta spec | `meta.ruleset`, dispatch, seletor escondido, badge, tela do Mestre, piloto de exaustão |
| 2 | Criação 2024 | 10 espécies (sem ASI), 16 antecedentes (ASI + talento de origem), talentos de origem |
| 3 | 12 classes + 48 subclasses | Subclasse no nível 3, progressões e features 2024. Sub-fatiado em levas |
| 4 | Equipamento + maestria em armas | Propriedades novas, maestrias, armas e armaduras revisadas |
| 5 | Magias 2024 | Listas por classe revisadas, magias alteradas, `spell-mechanics` das novas |
| 6 | Regras de mesa 2024 | Crítico, iniciativa/surpresa, descanso, preparação de magias, condições do glossário |

1→2→3 é ordem obrigatória. 4, 5 e 6 podem ser reordenadas.

## Arquitetura

### 1. O eixo — `src/systems/dnd5e/domain/ruleset.js` (novo)

Arquivo pequeno, espelhando o formato de `sources.js` — incluindo um aviso no
topo, que lá provou seu valor. O aviso aqui é o **inverso** do de lá:

> `source` é aditivo e só decide o que é OFERECIDO. `ruleset` é substitutivo e
> decide QUAL REGRA VALE. Nunca carimbe `ruleset` num item de catálogo; só a
> ficha tem ruleset.

```js
export const RULESETS = {
  '2014': { code: '2014', label: 'D&D 5e (2014)', abbr: '5e'   },
  '2024': { code: '2024', label: 'D&D 5e (2024)', abbr: '5e24' },
}

/** Ruleset da ficha. Ausente (ficha legada) → '2014'. */
export function rulesetOf(character)

export function is2024(character)

/** Dispatch por ruleset. Lança se faltar um dos dois ramos. */
export function byRuleset(character, { '2014': a, '2024': b })
```

`byRuleset` exigir os dois ramos é deliberado: força quem escreve regra a
responder "isso muda entre rulesets?" em vez de esquecer o ramo novo. É a
mesma classe de armadilha que a memória registrou nas listas fechadas do
Caçador de Sangue (`SUBCLASS_CHOICE_IDS`, `CombatClassActions`), que engoliam
conteúdo em silêncio.

### 2. Persistência — `SCHEMA_VERSION` 4 → 5

Em `characterSchema.js`, dentro de `metaSchema` e **ao lado** de `settings`,
não dentro dele:

```js
ruleset: z.enum(['2014', '2024']).default('2014'),
```

`migrateV4ToV5` carimba `'2014'` em toda ficha existente. A entrada no
histórico de `SCHEMA_VERSION` explica que o campo escolhe qual conjunto de
regras a ficha usa e que ele é imutável após a criação.

**Prova de não-regressão.** Um teste que pega fichas reais de fixture, roda
`parseCharacter` antes e depois do bump, e afirma que o **único** delta é
`meta.schemaVersion` e `meta.ruleset`. Isso ancora contra o gotcha registrado
no Caçador de Sangue: fixture escrita a partir da mesma suposição errada da
spec faz o teste passar mentindo. A âncora é a ficha real, não a fixture
inventada.

`migrateCharacter` já é idempotente e a migração precisa continuar sendo —
teste explícito de rodar duas vezes.

### 3. UI

**`RulesetPicker`** (novo componente, ao lado de `SourcePicker`) no
`CampaignSetupModal`, renderizado **somente** quando a URL traz
`?ruleset=2024`. `useDraft` passa a carregar o campo em `INITIAL_DRAFT_V2`
(default `'2014'`), e o draft o entrega ao `meta` da ficha criada.

**`RulesetBadge`** no `HeaderV2`, read-only, que **só renderiza quando a ficha
é 2024**. Ficha 2014 fica pixel-idêntica ao que é hoje — essa é a condição de
aceite visual da fase.

**Tela do Mestre**: o badge aparece por combatente no roster. Um teste afirma
que carregar uma ficha 2024 na mesa preserva o carimbo. Risco baixo: `ruleset`
viaja dentro do JSON `data`, não é coluna própria — não repete o gotcha da
migration 0009 (nunca nomear coluna opcional em `select`).

### 4. Piloto — exaustão nos dois rulesets

#### O que o 2024 diz (LdJ 2024, Ap. C, p. 368)

- Acumulativa: cada aquisição dá 1 nível. Morte no nível 6.
- **Testes de D20 afetados**: o resultado é reduzido em **2 × nível**.
- **Deslocamento reduzido**: em **1,5 m × nível**.
- Descanso Longo remove 1 nível.

Não há desvantagem, não há multiplicador, não há redução de PV máximo.

#### O estado atual, que o piloto também conserta

Três achados durante o desenho:

1. **`getExhaustionEffects` em `utils/calculations.js` é código morto.** O
   único importador é o próprio `src/test/exhaustion.test.js`. Mesmo padrão
   que a memória registrou em `testes-falsos` e `characterview-codigo-morto`:
   um teste verde dando confiança sobre função que nada usa.
2. **`effectiveMaxHp` nunca aplicou exaustão nível 4** (PV máximo à metade).
   Só desconta a penalidade do Caçador de Sangue. A regra 2014 é letra morta.
3. **A desvantagem de exaustão (níveis 1 e 3) não é aplicada em rolagem
   nenhuma.** Também letra morta.

O que existe de verdade hoje é `effectiveSpeed`, com os níveis 2 e 5
hard-coded, e o texto por nível em `EXHAUSTION_EFFECTS`.

#### `src/systems/dnd5e/domain/exhaustion.js` (novo)

`exhaustionEffects(character)` despacha por ruleset e devolve um **shape
unificado**. Os dois ramos preenchem o objeto inteiro; o que não se aplica sai
em valor neutro. Consumidores aplicam tudo sem nunca perguntar o ruleset:

```js
{
  level, dead,                    // ambos
  // 2014 — neutros no 2024 (false / 1)
  abilityCheckDisadvantage, attackDisadvantage, saveDisadvantage,
  speedMultiplier, maxHpMultiplier,
  // 2024 — neutros no 2014 (0)
  d20Penalty,                     // −2 × nível
  speedPenaltyMeters,             // 1,5 × nível
}
```

Esse formato é o produto real do piloto: a Fase 6 inteira vai repeti-lo. A
alternativa — cada consumidor perguntando o ruleset e ramificando — espalha o
dispatch por toda a UI.

`exhaustionLevelsText(ruleset)` substitui a constante `EXHAUSTION_EFFECTS`,
devolvendo a descrição por nível do ruleset certo.

O nível continua clampado em 0–6 nos dois rulesets (`combat.exhaustion` já é
`z.number().int().min(0).max(6)` no schema — não muda).

#### Consumidores

- **`getExhaustionEffects` deletado** de `utils/calculations.js`.
  `src/test/exhaustion.test.js` reescrito contra `exhaustionEffects`, cobrindo
  os dois rulesets.
- **`effectiveSpeed`** passa a consumir. 2014 mantém metade no 2+ e zero no
  5+; 2024 subtrai `speedPenaltyMeters`, com piso 0. As condições de
  `SPEED_ZERO_CONDITIONS` continuam zerando antes de tudo, nos dois.
- **`effectiveMaxHp`** passa a consumir. Ordem: aplica `maxHpMultiplier` sobre
  `combat.maxHp`, depois subtrai `bloodHunterMaxHpPenalty`, piso 1.
- **`EffectsSync`** ganha a exaustão. Hoje ele chama
  `setRollEffectsResolver(null)` quando não há efeito ativo nenhum; a condição
  de saída muda para "sem efeitos **e** sem exaustão". O resolver passa a
  **somar** exaustão com os buffs, nunca substituir:
  - 2024 → `flatMod: d20Penalty` nas categorias `attack`, `check`, `save`
    (nunca `damage` — a regra fala de teste de d20).
  - 2014 → desvantagem em `check` a partir do nível 1, e em `attack` e `save`
    a partir do nível 3, combinada com a vantagem dos buffs pela matriz PHB
    que `combineMode` já implementa.
- **`DiceRollerContext.roll`** ganha suporte a `flatMod` no retorno do
  resolver (~2 linhas: concatena o modificador com sinal na notação). Hoje o
  resolver só sabe devolver `extraDice`, `advantage`, `labelSuffix` e
  `onApplied`.
- **`HeaderV2`**: o chip de exaustão e o seletor mostram o efeito do ruleset
  da ficha. `CharacterListView` (que hoje destaca exaustão ≥ 4) segue como
  está — o limiar não muda.

**Iniciativa está coberta de graça.** O `InitiativeCard` em `AbilityStrip.jsx`
já rola com `category: 'check'` e `ability: 'dex'`, então a penalidade 2024 e a
desvantagem 2014 a alcançam sem nenhuma anotação nova — o que está certo nos
dois rulesets (em 2014 iniciativa é um teste de Destreza; em 2024 é um teste de
d20).

## Efeitos colaterais aceitos

Aprovados explicitamente pelo dono em 2026-08-25, com a alternativa de
implementar só o ramo 2024 recusada:

1. **Ficha 2014 com exaustão ≥ 4 muda.** O PV máximo passa a cair pela
   metade, como o PHB 2014 sempre mandou e o app nunca fez.
2. **Exaustão 2014 passa a dar desvantagem de verdade.** Nível 1 dá
   desvantagem em testes; nível 3, em ataques e salvaguardas. Hoje é só texto
   descritivo no chip.

Ambos são correção de regra, não regressão — mas são comportamento novo para
quem já joga, e ficam registrados aqui em vez de escondidos numa spec de
"fundação".

## Testes

**Domínio**
- `rulesetOf` devolve `'2014'` para ficha sem `meta`, sem `meta.ruleset`, e
  para `meta.ruleset` inválido.
- `byRuleset` lança quando falta um ramo.
- Migração v4→v5 carimba `'2014'`; roda duas vezes sem mudar nada.
- **Âncora**: fichas reais de fixture passam por `parseCharacter` antes e
  depois; único delta é `meta.schemaVersion` e `meta.ruleset`.
- `exhaustionEffects` nos dois rulesets, níveis 0 a 6, incluindo os neutros
  do ramo oposto e o clamp fora da faixa.
- `effectiveSpeed` e `effectiveMaxHp` nos dois rulesets, incluindo a
  interação com `SPEED_ZERO_CONDITIONS` e com a penalidade do Caçador de
  Sangue.

**Integração**
- Resolver de rolagem: exaustão sozinha registra o resolver (sem buff
  nenhum); exaustão + buff somam em vez de substituir; `flatMod` entra na
  notação com o sinal certo; `damage` não recebe a penalidade.
- Ficha criada com `?ruleset=2024` persiste e recarrega como 2024.
- `RulesetPicker` não renderiza sem o parâmetro de URL; renderiza com ele.
- `RulesetBadge` não renderiza em ficha 2014; renderiza em 2024.
- Ficha 2024 carregada na tela do Mestre preserva o carimbo.

**E2E** (`e2e-pw`, via `installAuthedApp` — stub de sessão que abre o app
autenticado sem passar pelo login)
- Criar ficha com `?ruleset=2024`, abrir a ficha, ver o badge; abrir uma ficha
  2014 e confirmar que o badge não está lá.

**Suíte**: rodar em fatias com `--maxWorkers=2`. `npx vitest run` sem flags
estoura a memória da máquina e finge falhas aleatórias em arquivos sem
relação.

## Notas de operação

- Nenhum JSON em `public/srd-data` muda nesta fase → **não** bumpar
  `srd-data-vN` em `vite.config.js`.
- Nenhuma migration de Supabase. `meta.ruleset` viaja dentro do JSON `data`.
