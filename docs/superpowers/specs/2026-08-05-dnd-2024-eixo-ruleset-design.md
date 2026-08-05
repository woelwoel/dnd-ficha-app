# D&D 2024 — eixo `ruleset` (sub-projeto 1: fatia vertical)

Data: 2026-08-05

## Problema

O app cobre D&D 5e 2014 (PHB + Tasha + Xanathar). O D&D 2024 precisa entrar sem
quebrar as fichas existentes e sem duplicar o motor de regra.

A pergunta bloqueante era **em que eixo** o 2024 entra. Três candidatos foram
avaliados e dois rejeitados.

### Por que não é uma quarta `source`

`filterCatalogBySources` em `domain/sources.js` é **aditiva**: `phb` está sempre
incluída e o filtro só decide o que é *oferecido* nos pickers. Fonte nova = mais
opções na mesma lista.

O 2024 não adiciona opções — **muda a resposta de perguntas que já existem**. No
2024 a espécie não concede aumento de atributo e o antecedente concede (+2/+1 ou
+1/+1/+1, mais um talento de origem). Convivendo no mesmo picker, seria possível
montar espécie 2024 + antecedente 2014 e terminar **sem nenhum aumento de
atributo**. Some subclasse no nível 3 uniforme, talento categorizado, maestria de
arma e exaustão numérica: é motor de regra, não catálogo.

### Por que não é um `system` novo (ao lado de Daggerheart)

O contrato `System` (`src/systems/index.js`, `ui-registry.js`) é limpo e adicionar
um sistema é barato *mecanicamente* — uma entrada em cada registry. Mas um
`system` fornece **peças inteiras**: `Wizard`, `Sheet`, `Encounter`,
`EncounterLibrary`, `GlobalWidgets` e `core`. Hoje isso são **30.277 linhas** em
`src/systems/dnd5e/` (21.257 de componentes, 5.700 de domínio).

O teste que o contrato codifica é *"o que essas duas coisas compartilham além da
casca?"*:

- **Daggerheart:** 2d12 Esperança/Medo, sem d20, sem espaço de magia, sem CA.
  Compartilha login, lista e campanhas. Fronteira honesta.
- **D&D 2024:** d20, os mesmos seis atributos, bônus de proficiência, CA, tabela
  de espaços, concentração, testes de morte, condições, motor de efeitos ativos,
  rolador, layout inteiro da ficha. Divergem em ~10%.

E o argumento que decide: **uma campanha é amarrada a um sistema só**
(`App.jsx:200` — `getLazyEncounter(resolved.system)`). Com 2024 como sistema, uma
mesa seria `dnd5e` **ou** `dnd5e2024`, e ficha da outra geração não entraria na
mesa de combate. Numa transição de edição, **mesa mista é o caso normal** — o
grupo migra e por semanas convivem fichas das duas gerações. Com o eixo
`ruleset`, todos seguem `dnd5e` e mesa/iniciativa/encontros funcionam sem tocar
em uma linha.

(Um sistema separado só se justificaria se o 2014 fosse **congelado**. A decisão
foi o oposto — ver abaixo.)

## Decisões

| Questão | Decisão |
|---|---|
| Convivência | **Ambas permanentes.** Fichas 2014 e 2024 criáveis e ativas pra sempre. `rules.js` parametrizado em definitivo, não como transição. |
| Mistura de conteúdo | **Estrito.** Ficha 2024 não oferece Tasha/Xanathar (conteúdo 2014). `ruleset` manda em `sources`. |
| Onde mora | **Por ficha** (`meta.settings.ruleset`), não por campanha. A ficha precisa saber a própria geração pra renderizar sozinha. |
| Separação na tela inicial | **Só selo.** Sem abas, sem filtro, sem esconder fichas. |
| Material | PDF do Livro do Jogador 2024 **em português**, mesma esteira do Tasha/Xanathar. |

## Arquitetura: núcleo comum + descritor de ruleset

Alternativas consideradas para parametrizar `rules.js` (1.315 linhas, ~35 exports):

- **Ramificar por dentro** — cada função diverge com `if`. Menor esforço, mas o
  delta do 2024 fica pulverizado e ninguém consegue responder "o que muda no
  2024?" sem varrer o arquivo. Rejeitada.
- **Dois módulos irmãos** (`rules/2014.js`, `rules/2024.js`) — cada geração
  legível isolada, mas a maioria esmagadora das regras é idêntica. Duplicar 1.315
  linhas é deriva garantida. Rejeitada.
- **Núcleo comum + descritor** — **escolhida**.

Descoberta que ancora a escolha: `rules.js` **já tem precedente**.
`rules.js:263` lê `character.meta.settings.flexibleRacialAsi` ("Customizando sua
Origem", do Tasha) — o código **já modela "de onde vem o aumento de atributo"
como configuração**. O 2024 generaliza um eixo existente.

Facilitador: quase toda função exportada já recebe `character` como primeiro
argumento (`applyLevelUp`, `defaultClassFeatureUses`, `effectiveSpeed`,
`baseSpeedMeters`). Com o ruleset morando dentro da ficha, ele viaja junto e
**nenhuma assinatura muda**.

### `src/systems/dnd5e/domain/rulesets.js` (novo)

```js
export const RULESETS = {
  '2014': {
    id: '2014',
    label: 'D&D 5e (2014)',
    sources: ['phb', 'tasha', 'xanathar'],
    abilityBonusFrom: 'race',
    backgroundGrantsFeat: false,
    subclassLevel: null,        // por classe, vem do class-choices
  },
  '2024': {
    id: '2024',
    label: 'D&D 2024',
    sources: ['phb2024'],
    abilityBonusFrom: 'background',
    backgroundGrantsFeat: 'origem',
    subclassLevel: 3,           // uniforme
  },
}

export function rulesetOf(character) { /* meta.settings.ruleset ?? '2014' */ }
```

`rulesetOf` trata **apenas ausência** (ficha legada → `'2014'`). Validade é
responsabilidade do schema, não dele — ver "Tratamento de erro" abaixo.

Só entra o que esta fatia precisa. Exaustão numérica, maestria de arma e
construção de encontro 2024 entram quando forem a vez deles.

**Regra de disciplina:** o descritor é **dado**. Divergência que não couber em
dado vira hook nomeado, e cada hook é sinal de alerta — se aparecerem muitos, a
abordagem degenerou em "ramificar por dentro" e a decisão deve ser reaberta.
Previsão para esta fatia: **zero hooks**.

### As três costuras desta fatia

| Onde | Hoje (2014) | Com o descritor |
|---|---|---|
| `rules.js:235` `computeRacialBonuses` | soma `ability_bonuses` da raça/sub-raça | `abilityBonusFrom !== 'race'` → devolve `{}` |
| `rules.js:285` `applyBackgroundChange` | perícias, equipamento, ouro | passa a aplicar aumento de atributo e conceder talento de origem |
| `sources.js` `filterCatalogBySources` | `phb` sempre + fontes ligadas | fontes permitidas saem do descritor; `phb` deixa de ser fixa |

## Modelo de dados

- `meta.settings.ruleset`, enum `'2014' | '2024'`, default `'2014'`.
- `SCHEMA_VERSION` **4 → 5**, com passo de migração explícito carimbando `'2014'`
  nas fichas existentes (escada documentada em `characterSchema.js:468`).
- `system` continua `'dnd5e'` nas duas gerações — mesa mista segue funcionando.
- **Nenhum retrofit:** ficha 2014 existente não muda de comportamento.

## Camada de dados

`SrdProvider` **não é global** — cada superfície se auto-embrulha em `ui.jsx`
(`Wizard`, `Sheet`, `Encounter`, `EncounterLibrary`, `GlobalWidgets`). Isso torna
a parametrização barata.

**A chave lógica não muda.** O provider já separa *chave lógica* (`races`,
`classes`, `spells`) das *partes* que a compõem (`classesTasha`,
`spellsXanathar`). O 2024 troca só as partes:

```js
const COMPOSED_BY_RULESET = {
  '2014': { classes: [['classes','phb'], ['classesTasha','tasha']], /* … */ },
  '2024': { classes: [['classes2024','phb2024']], /* … */ },
}
```

Consequência: os ~21.000 linhas de componentes continuam pedindo
`useSrd().classes` e **não mudam**. O `moduleCache` é chaveado por nome de
dataset, então `classes` e `classes2024` convivem sem colisão.

**Como o provider descobre o ruleset:** `<SrdProvider ruleset>`, com o valor
vindo da casca sem vazar D&D pra ela. O `core` ganha um export irmão do
`summarize()`:

```js
export function dataVariantOf(character) { /* → '2014' | '2024' */ }
```

A casca já faz consulta equivalente (`getCharacterSystem(id)` antes de montar a
`Sheet`). Ela passa a receber uma **string opaca** e repassar pro `ui.jsx`. A
casca sabe que "sistemas podem ter variantes de dado" — nunca o que é um ruleset.

**Superfícies de encontro ficam neutras nesta fatia.** `Encounter` e
`EncounterLibrary` são de mesa, podem ter companhia mista, e usam bestiário e
limiares de XP. O 2024 mexeu na construção de encontro, mas isso é sub-projeto 4.

**Obrigatório:** arquivo novo em `public/srd-data` exige bumpar `srd-data-vN` no
`vite.config.js`, senão o Service Worker serve o dado velho e o deploy não chega
no usuário.

## UI

- **Escolha da geração:** primeiro passo do wizard do D&D, não da casca —
  `ruleset` é conceito de D&D. Explícito e antes de qualquer escolha de
  personagem.
- **Selo na lista:** uma linha em `core.js:28` (`summarize().badges`), badge
  `2024`. `CharacterListView.jsx:175` já renderiza badges às cegas. Fichas 2014
  **não** ganham selo — o silêncio é o padrão e a geração nova se anuncia.
- **Token do mapa:** marca gráfica (anel ou canto), nunca texto — os rótulos já
  truncam. `CharacterToken.jsx:32` lê `info` direto e **não** passa pelo
  `summarize()`; esse acoplamento pré-existente da casca com D&D é aceito aqui,
  não corrigido.

## Escopo da fatia vertical

**Dentro:** todas as espécies, todos os antecedentes, os talentos de origem, e
**uma classe: o Mago**.

A escolha do Mago não é arbitrária — a subclasse dele foi do nível 2 pro 3, então
é o caso que de fato exercita o `subclassLevel` do descritor (o Guerreiro já era
3 no 2014 e não testaria nada). É conjurador, então a fatia atravessa lista de
magias e espaços em vez de parar no marcial.

**Pronto quando:** dá pra criar um Mago 2024 do zero, com aumento de atributo
vindo do antecedente, talento de origem concedido, subclasse aparecendo no nível
3, catálogo estritamente 2024 nos pickers, ficha abrindo e rolando normalmente —
e uma ficha 2014 existente continua idêntica ao que era.

**Fora:** as outras 11 classes, magias além das do Mago, maestria de arma,
exaustão numérica, construção de encontro 2024, trava de geração por mesa.

## Extração do PDF: sondagem (2026-08-05)

PDF: `OneDrive\Área de Trabalho\Conteúdos D&D\D&D 2024\dampd-5e---livro-do-jogador-2024.pdf`
(35 MB, **397 páginas**, fora do repo como os anteriores).

**Risco de OCR: descartado.** Diferente do Xanathar, a camada de texto é
**digital**, não OCR de scan: acentuação íntegra, sem corrupção de glifo, sem
`l`/`1` trocados. A curadoria manual pesada que o Xanathar exigiu **não se
aplica aqui**.

**GOTCHA principal — versalete em Área de Uso Privado.** Títulos usam
`MrsEavesOT-Roman` em versalete, e `get_text()` devolve as minúsculas como
`U+F700 + codepoint`. "Descrições das Espécies" sai da extração como
`D\uf765\uf773\uf763\uf772\uf769\uf7e7\uf7f5\uf765\uf773 \uf764\uf761\uf773 E\uf773\uf770\uf7e9\uf763\uf769\uf765\uf773` — só a maiúscula inicial de cada
palavra sobrevive. Num terminal isso imprime como `D  E`, e a ancoragem por
título quebra **em silêncio**. Decodificação é mecânica:

```python
def unsmallcaps(s):
    return "".join(chr(ord(c) - 0xF700) if 0xF700 <= ord(c) <= 0xF7FF else c for c in s)
```

Validado nas quatro seções da fatia: **zero glifos PUA remanescentes**.

**Âncora por tamanho de fonte, não por texto.** A hierarquia é limpa via
`get_text("dict")`, mas o limiar **varia por seção** — nome de antecedente é
18,0 e nome de espécie é 15,0. Os build scripts precisam de limiar por seção,
não de um global.

**Outros tratamentos mecânicos:** desfazer hifenização de quebra de linha
(12 ocorrências só na p.182) e deduplicar spans repetidos (título de capítulo
aparece 2×).

**Paginação:** `get_toc()` devolve páginas 1-based sobre o índice do pymupdf
(`toc − 1 = índice`); a numeração impressa é `índice − 5`.

**Mapa de páginas da fatia** (índice pymupdf): Mago 152 · magias de Mago 155 ·
subclasses de Mago 159 · Descrições dos Antecedentes 182 · Descrições das
Espécies 191 · Talentos de Origem 205.

**Premissas do design validadas contra o livro:**

- Antecedente traz "Valores de Atributo… três dos valores de atributo" (p.182) —
  confirma `abilityBonusFrom: 'background'`.
- Espécie é narrativa + "Traços de X", sem valores de atributo (p.191) — confirma
  que `computeRacialBonuses` deve devolver `{}` no 2024.
- **"Nível 3: Subclasse de Mago"** (p.154) — confirma `subclassLevel: 3` e a
  escolha do Mago como caso de teste do descritor.
- Dez espécies: Aasimar, Anão, Draconato, Elfo, Gnomo, Golias, Humano, Orc,
  Pequenino, Tiferino. Quatro subclasses de Mago: Abjurador, Adivinhador,
  Evocador, Ilusionista.

## Tratamento de erro e casos de borda

1. **Dataset 2024 ausente (404).** `loadDataset` já cai em `[]` e não cacheia
   vazio, então a próxima montagem retenta. A ficha renderiza degradada. Aceito —
   é o mesmo comportamento das fontes atuais.
2. **`ruleset` desconhecido** (ficha adulterada ou vinda de versão futura).
   Resolver **pelo enum do zod**, não por fallback silencioso no `rulesetOf`:
   valor inválido reprova o parse e cai no caminho de erro existente. Cair
   calado em `'2014'` renderizaria uma ficha 2024 com números errados sem avisar
   — exatamente a classe de defeito que já mordeu este projeto antes.
3. **Ausência de `ruleset`** (ficha legada) é diferente de valor inválido: é
   `'2014'` por definição, tratado pelo default do schema e pela migração.
4. **Maior risco silencioso da fatia:** esquecer de tirar o `'phb'` fixo de
   `filterCatalogBySources`. A ficha 2024 passaria a oferecer conteúdo 2014 sem
   erro nenhum. Exige teste dedicado (abaixo).
5. **Migração v4→v5** idempotente, como as anteriores.

## Testes

- Descritor e as três costuras: testes de domínio puros, importando produção
  (nada de reimplementar a regra no teste).
- **Invariante de não-regressão:** ficha 2014 produz resultado idêntico antes e
  depois da mudança — o contrato central de "ambas permanentes".
- **Gating estrito nos dois sentidos:** catálogo oferecido a ficha 2024 não
  contém item com `source` `phb`/`tasha`/`xanathar`, e catálogo 2014 não contém
  `phb2024`. Cobre o risco nº 4.
- Migração v4→v5 idempotente.
- `ruleset` inválido reprova o parse.
- Rodar a suíte em fatias com `--maxWorkers=2`: `npx vitest run` sem flags
  estoura a memória da máquina e produz falhas falsas em arquivos sem relação.

## Sub-projetos seguintes (fora desta spec)

2. Catálogo completo do LdJ'24 — 12 classes com subclasses, magias, equipamento.
3. Maestria de arma — mexe no motor de ataque, que hoje não tem esse conceito.
4. Condições e descanso revisados — exaustão numérica, Inspiração Heroica,
   construção de encontro 2024; respinga na ficha e na mesa de combate.
