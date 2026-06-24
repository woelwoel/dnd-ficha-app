# Tasha (Caldeirão de Tasha para Tudo) + procedência + seletor de fontes por personagem

Data: 2026-06-23
Branch base: `multi-sistema-fronteira` (a fronteira de System já está mergeada na master e deployada)
Sistema alvo: `dnd5e` (todo o conteúdo vive dentro de `src/systems/dnd5e/` e `public/srd-data/`)

## Objetivo

Trazer o conteúdo do **Caldeirão de Tasha para Tudo** (fonte: PDF fan-translation
fornecido pelo dono) para dentro do sistema D&D 5e do app, com duas capacidades
transversais novas:

1. **Procedência** — todo conteúdo novo declara de qual livro veio.
2. **Seletor de fontes por personagem** — cada ficha escolhe usar só o D&D 5e
   básico (PHB) ou também o Tasha.

Este é o sub-projeto 3 da virada multi-sistema. O Xanathar é um sub-projeto
futuro separado; a esteira de extração criada aqui deve ser reutilizável nele.

## Escopo

### Dentro do escopo (conteúdo que o app modela)

- **Subclasses** novas das 12 classes (entram como `options` por classe, no
  mesmo formato de `phb-class-choices-pt.json`).
- **Talentos** (mesmo formato de `phb-feats-pt.json`).
- **Magias** (mesmo formato de `phb-spells-pt.json`).
- **Itens mágicos** (mesmo formato de `phb-magic-items-pt.json`), incluindo os
  itens comuns/tatuagens mágicas que o modelo de item suporta.
- **Características opcionais de classe** (as features adicionais que o Tasha
  oferece às classes do PHB).
- **Classe Artífice** (nova classe completa — ver sub-fase própria abaixo).
- **Regra "Customizando sua Origem"** (afeta criação de personagem — ver peça
  própria abaixo).

### Fora do escopo (prosa de mestre que a ficha não modela)

Patronos de grupo, presentes sobrenaturais, quebra-cabeças, regras de
sessão-zero / aliados (sidekicks) / downtime, e demais conteúdo voltado ao
mestre. Não há onde encaixar isso numa ficha; fica de fora.

## Convenção de procedência (`source`)

- Todo item de conteúdo passa a carregar um campo `source` (string, código curto).
- **Ausência de `source` = `"phb"`** (D&D 5e básico). Isso mantém todos os
  arquivos `phb-*` e fichas antigas válidos sem migração.
- Tasha = `"tasha"`.
- Uma constante `SOURCES` no domínio mapeia código → metadados de exibição
  (nome longo "Caldeirão de Tasha para Tudo", sigla "TCE"). Único lugar que
  conhece o nome bonito de cada fonte.

## Arquivos de dados novos (`public/srd-data/`)

Espelham o padrão `phb-*`, um arquivo por tipo, com cada item carimbado
`source: "tasha"`:

- `tasha-feats-pt.json`
- `tasha-spells-pt.json`
- `tasha-magic-items-pt.json`
- `tasha-class-choices-pt.json` (subclasses novas, como `options` por classe;
  mescladas às `choices` existentes no carregamento)
- `tasha-classes-pt.json` (Artífice) + progressão correspondente
- `tasha-infusions-pt.json` (infusões do Artífice)

## SrdProvider: merge de PHB + suplementos

`src/systems/dnd5e/data/SrdProvider.jsx`, mapa `DATASETS`.

- Ganha as entradas Tasha.
- Na carga, cada tipo passa a ser a **união** PHB + Tasha:
  - `feats` = phb-feats ∪ tasha-feats
  - `spells` = phb-spells ∪ tasha-spells
  - `magicItems` = phb ∪ tasha
  - `classChoices`: as `options` de cada classe recebem append das opções Tasha
  - `classes`: recebe o Artífice
- Cada item é **carimbado com seu `source` na carga** (se vier sem, vira `phb`).
- A **filtragem por fonte NÃO acontece no provider.** O provider entrega o
  conjunto completo, carimbado. A filtragem é responsabilidade do consumo
  (princípio abaixo).

## Seletor por personagem + princípio de gating

- O corpo da ficha (body dnd5e) ganha `sources: string[]`, ex.: `["phb"]` ou
  `["phb", "tasha"]`.
- **Default / ausência = `["phb"]`** → fichas antigas só enxergam o básico,
  sem migração. Persistido no blob, round-trip pelo codec existente.
- **Wizard** (criação): um controle "Fontes" liga/desliga o Tasha.
- **Ficha**: o mesmo controle "Fontes" fica editável depois.
- **Princípio de gating (importante):** as fontes ativas filtram **o que é
  oferecido** nos pickers (talentos, subclasses, magias, itens). **O que a
  ficha já tem sempre renderiza.** Desligar o Tasha numa ficha que já usou
  conteúdo Tasha não apaga as escolhas feitas — só some das próximas escolhas.
  Isso evita corromper ficha.

Pontos de consumo a aplicar o filtro: FeatPicker(s), o picker de subclasse
(class-choices no Wizard e no level-up), SpellsBlock / listas de magia, e o
inventário/itens mágicos.

## Procedência visível

Itens não-PHB ganham um selo pequeno (ex.: "Tasha"/"TCE") nos pickers e na
ficha, derivado de `SOURCES[item.source]`. Deixa claro o que é suplemento.

## Peça: "Customizando sua Origem"

Não é import de JSON — é comportamento do Wizard. A regra solta os aumentos de
atributo (e idiomas/perícia) da raça, deixando o jogador realocá-los. Bate
direto em `src/systems/dnd5e/domain/racialBonuses.js` e no fluxo de raça do
Wizard (o mesmo terreno do Humano Variante já tratado).

- É uma opção, **gateada pelo seletor de fontes** (só disponível com Tasha ativo).
- Quando ligada, o passo de raça do Wizard oferece a realocação dos bônus em vez
  de aplicá-los fixos.
- Tratada como peça própria, não diluída no "import de dados".

## Sub-fase: Artífice (a mais pesada)

Classe nova, não é dado solto. Características: dado de vida d8, conjuração de
Inteligência (meio-conjurador, lista preparada), Remendo Mágico, Infundir Item
(infusões com itens conhecidos/ativos), subclasses (Alquimista, Artilheiro,
Ferreiro de Batalha, Armoreiro).

Toca o motor de regras `src/systems/dnd5e/domain/rules.js`:

- Progressão de slots de **meio-conjurador** (pode não existir hoje).
- Contagem de **infusões conhecidas / ativas** por nível.
- Integração da subclasse e das magias concedidas (`subclassSpells.js`).

**Risco principal do projeto.** Não se sabe se o motor de regras aguenta
meio-conjurador + infusões sem refatorar. Mitigação: **spike curto no Artífice /
motor de regras logo no começo** (ver ordem de build), antes de investir no
volume de conteúdo, pra descobrir cedo se o motor precisa mexer enquanto é barato.

## Esteira de extração (tooling)

`scripts/` (Python + `pymupdf`, já instalado). Descartável quanto ao runtime,
mas mantida no repo pra reusar no Xanathar.

1. **Extrair** o texto do PDF do Tasha.
2. **Reparar acentos** — a extração crua quebra acentuação (problema de
   cmap/fonte: `MÚSICA` → `M�SICA`). Etapa de normalização obrigatória antes de
   o texto virar dado.
3. **Estruturar** nos schemas-alvo (feats / spells / subclasses / items / classe).
4. **Validar**: checagem de schema automatizada + **revisão manual com o dono**
   dos itens de risco (Artífice, magias com regras sutis). O conteúdo entra em
   arquivos; os trechos críticos são revisados a quatro mãos.

## Service worker + testes

- **Bumpar `cacheName 'srd-data-vN'` em `vite.config.js`** ao mexer em
  `public/srd-data` — senão o SW serve dado antigo e o deploy não chega no
  usuário.
- Testes:
  - Merge/gating por `source` (item Tasha some quando a fonte está off; aparece
    quando on).
  - Ficha legada sem `sources` cai em `["phb"]`.
  - Princípio de render: ficha que já tem conteúdo Tasha continua renderizando
    com a fonte desligada.
  - Regras do Artífice (slots de meio-conjurador, contagem de infusões).
  - Schema dos JSON novos (validação estrutural).

## Ordem de build interna

Mesmo entregando "Tasha completo", o build segue uma fatia vertical primeiro
pra de-riscar:

1. **Infra + spike do Artífice.** Campo `source` + merge no provider + seletor
   por personagem + selo de procedência, provado com uma fatia pequena de
   conteúdo (talentos). **Em paralelo, spike do Artífice no motor de regras**
   (meio-conjurador + infusões) pra saber se `rules.js` precisa mexer.
2. **Conteúdo em volume.** Subclasses, magias, itens, características opcionais
   de classe — extraídos, estruturados e validados.
3. **Artífice completo.** Já com o motor preparado pelo spike: classe,
   progressão, infusões, subclasses.
4. **"Customizando sua Origem"** no Wizard, gateada pela fonte.

## Fora de escopo / decisões adiadas

- **Default global de fontes + override por ficha** (melhoria de UX). Começa
  100% por ficha; o default global pode vir depois.
- **Xanathar** — sub-projeto futuro próprio, reaproveitando esta esteira.

## Relacionado

- [[multi-sistema-fronteira]] — a fronteira de System que habilitou isto.
- [[sw-cache-bump-srd]] — regra do bump de cacheName.
- [[variant-human-feat]] — terreno do Wizard que "Customizando sua Origem" toca.
- [[lint-debt-ungated]] — débito de lint pré-existente, não regressão.
