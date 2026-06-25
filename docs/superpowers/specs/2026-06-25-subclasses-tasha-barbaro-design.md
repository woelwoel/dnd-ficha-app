# Subclasses de Tasha — Sub-projeto 1 (Keystone + Bárbaro)

Data: 2026-06-25
Branch: multi-sistema-fronteira

## Contexto

Frente "conteúdo em volume". Descoberta-chave: as subclasses **e** magias do PHB já
estão completas no repositório. A frente restante real é **subclasses de fontes além
do PHB**. Decidido começar só por **Tasha's (TCE)**, com **paridade total** de
fidelidade mecânica (desc por nível + subescolhas interativas + magias concedidas
quando houver).

Tasha traz ~25 subclasses → grande demais para um spec. Decomposição aprovada:

1. **Keystone + Bárbaro** (este spec) — infra de merge multi-fonte, provada com 2
   subclasses do bárbaro (sem magias concedidas).
2. Classes sem magia (Bardo, Guerreiro, Monge, Ladino, Mago).
3. Conjuradores com magia PHB (Clérigo, Druida, Paladino).
4. Conjuradores com magia Tasha (Feiticeiro, Bruxo, Patrulheiro) — puxa mini-catálogo
   de magias de Tasha.

## Objetivo deste sub-projeto

Resolver a infra que hoje impede subclasses de Tasha em classes que já existem no PHB
(o merge de `classChoices` é um `Object.assign` raso que clobberia), e prová-la
entregando as subclasses **Caminho da Besta** e **Caminho da Magia Selvagem** do
bárbaro, gateadas pela fonte `tasha`.

Bárbaro foi escolhido por não conjurar (zero dependência do catálogo de magias) e por
ter um caso com subescolha (Besta) e um sem (Magia Selvagem) — exercita os dois ramos
da infra.

## Decisões de arquitetura

- **A1 — merge profundo no compositor (SrdProvider).** Módulo puro novo
  `src/systems/dnd5e/domain/mergeClassChoices.js`. A entrada `classChoices` do
  `COMPOSED` troca o `Object.assign` raso por esse merge.
- **B1 — filtro de opções por fonte em `getLeveledChoices`.** 4º parâmetro
  `activeSources`; filtra `options` via `filterCatalogBySources`, **preservando sempre
  a opção já escolhida**.

Rejeitadas: merge no consumidor (espalha lógica/frágil), pré-merge em build script
(mata a procedência), filtro no render de cada botão (duplica/arrisca esconder
escolhido).

## Detalhamento

### 1. Dados — `public/srd-data/tasha-class-choices-pt.json`, chave `barbaro`

```jsonc
"barbaro": {
  "choices": [
    { "level": 3, "id": "primal_path", "featureName": "Caminho Primitivo",
      "prompt": "Escolha seu Caminho Primitivo",
      "options": [
        { "value": "besta", "name": "Caminho da Besta", "combat": "essencial",
          "source": "tasha", "desc": "...features por nível 3/6/10/14..." },
        { "value": "magia-selvagem", "name": "Caminho da Magia Selvagem",
          "combat": "essencial", "source": "tasha",
          "desc": "...features por nível 3/6/10/14; tabela de Surto Mágico d8 em prosa..." }
      ]
    },
    { "level": 3, "id": "barbaro_beast_form", "featureName": "Forma da Besta (nv 3)",
      "prompt": "Escolha sua arma natural ao entrar em Fúria",
      "requires": { "primal_path": "besta" }, "source": "tasha",
      "options": [ {Mordida}, {Garras}, {Cauda} ] }
  ]
}
```

Conteúdo das features (paridade total, em prosa por nível):
- **Caminho da Besta**: nv3 Forma da Besta (Mordida/Garras/Cauda); nv6 Alma Bestial
  (natação/escalada/salto + ataques contam como mágicos); nv10 Fúria Infecciosa; nv14
  Convocar a Caçada.
- **Caminho da Magia Selvagem**: nv3 Consciência Mágica + Surto Mágico (tabela d8); nv6
  Magia Reforçadora; nv10 Reação Instável; nv14 Surto Controlado.

### 2. Merge profundo — `mergeClassChoices(phb, tasha)`

- Classe só-Tasha (ex.: `artifice`) → entra inteira, opções carimbadas `source: 'tasha'`.
- Classe em colisão (ex.: `barbaro`) → para cada `choice` de Tasha: se já existe choice
  de mesmo `id`, **concatena `options`** (carimbando Tasha); senão **anexa o choice**.
- Opções do PHB ficam sem `source` (default = phb).
- Idempotente o suficiente para o atual artífice cair no caso "classe só-Tasha" sem
  regressão.

`SrdProvider.COMPOSED.classChoices` passa a usar esse merge no lugar do `Object.assign`.

### 3. Filtro por fonte — `getLeveledChoices(data, level, chosenFeatures, activeSources)`

- Filtra `options` de cada choice via `filterCatalogBySources(options, activeSources)`.
- **Preserva a opção já escolhida** (`chosenFeatures[choice.id]`, incluindo arrays
  multiSelect) mesmo se a fonte foi desligada.
- Choice sem nenhuma opção oferecida **e** sem nada escolhido → omitido.
- Continua respeitando `requires`.
- Sem `activeSources` → só PHB (back-compat: dados PHB não têm `source`).

Callers a atualizar:
- `ClassBlock.jsx` — primário e multiclasse; plumbar `activeSources`
  (`draft.settings.sources`).
- `ClassProgressionPanel.jsx` — ficha; já recebe `activeSources`.

### 4. UI — SourceBadge

No renderizador de opções, exibir `<SourceBadge source={option.source} />` quando
`option.source && option.source !== 'phb'`. Componente já existe.

### 5. Progressão — sem mudança

Features específicas vivem na prosa do `desc` (igual ao Berserker). `phb`/`tasha`
class-progression não mudam para o bárbaro.

### 6. Cache do Service Worker

Editamos JSON em `public/srd-data` → **bumpar `srd-data-vN`** no `vite.config.js`.

## Testes

- Unit `mergeClassChoices`: colisão concatena+carimba; classe só-Tasha entra inteira;
  choice só-Tasha é anexado; PHB intocado quando Tasha vazio.
- Unit `getLeveledChoices`: filtra por fonte; preserva escolhido; esconde choice vazio;
  respeita `requires`; back-compat sem `activeSources`.
- Schema: `barbaro` de Tasha com `value` únicos e `requires` apontando id válido.
- Componente: Besta/Magia Selvagem só com Tasha ativo; SourceBadge presente; subescolha
  de Besta só após escolher Besta.
- Estender `SrdProvider-composed.test` para o merge profundo de `classChoices`.

## Fora de escopo

- Demais classes (sub-projetos 2–4).
- Catálogo de magias de Tasha.
- Xanathar's e outras fontes.
