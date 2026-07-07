# Xanathar (Guia de Xanathar para Todas as Coisas) — pacote completo de jogador

Data: 2026-07-07
Sistema alvo: `dnd5e` (conteúdo em `src/systems/dnd5e/` e `public/srd-data/`)
Fonte do material: PDF fan-translation PT-BR fornecido pelo dono (fora do repo)

## Objetivo

Trazer o conteúdo de jogador do **Guia de Xanathar para Todas as Coisas** (XGE)
para o sistema D&D 5e do app, reaproveitando integralmente a infraestrutura de
procedência e seleção de fontes criada no sub-projeto Tasha:

- `SOURCES` em `src/systems/dnd5e/domain/sources.js`
- merge carimbado no `SrdProvider` (mapa `DATASETS`)
- gating por ficha via `filterCatalogBySources` / `filterChoiceBySources`
- `SourcePicker` (Wizard + ficha) e `SourceBadge` (selo de procedência)
- esteira de extração de PDF (`scripts/tasha/`, pymupdf)

Resolve também o deferral registrado em 2026-06-30: o patrono **Hexblade**
entra, e com ele a opção de **Carisma no ataque/dano da arma de pacto**
(Guerreiro Hediondo), que o `WarlockPactPanel` hoje nega de propósito.

## Escopo

### Dentro do escopo (conteúdo que a ficha modela)

- **Subclasses** (25, todas as 12 classes) — como `options` das choices
  existentes, formato `phb-class-choices-pt.json`:
  - Bárbaro: Guardião Ancestral, Arauto da Tempestade, Fanático
  - Bardo: Glamour, Espadas, Sussurros
  - Clérigo: Forja, Sepultura
  - Druida: Sonhos, Pastor
  - Guerreiro: Arqueiro Arcano, Cavaleiro, Samurai
  - Monge: Mestre Bêbado, Kensei, Alma Solar
  - Paladino: Conquista, Redenção
  - Patrulheiro: Perseguidor Sombrio, Andarilho do Horizonte, Caçador de Monstros
  - Ladino: Inquisitivo, Mente Criminosa, Batedor, Espadachim
  - Feiticeiro: Alma Divina, Magia das Sombras, Feitiçaria da Tempestade
  - Bruxo: Celestial, **Hexblade**
  - Mago: Magia de Guerra

  (Nomes PT-BR definitivos vêm do PDF na extração.)
- **Magias** (~95) — formato `phb-spells-pt.json`, com curadoria de mecânicas
  obrigatória em `spell-mechanics-pt.json` (guard-rail `findUncovered`).
- **Talentos raciais** (15) — formato `phb-feats-pt.json`, com **novo tipo de
  pré-requisito de raça** (ver peça própria).
- **Invocações Místicas novas do Bruxo** (~14) — options `source: "xanathar"`
  na choice `eldritch_invocations` existente; só dados, gating de graça.
- **Itens mágicos comuns** (~19) — formato `phb-magic-items-pt.json`.

### Fora do escopo

- Regras de mestre: downtime revisitado, armadilhas, construção de encontros,
  tabelas de nomes, presentes sobrenaturais (mesmo critério do Tasha).
- **"Isto é Sua Vida"** (tabelas de geração de história) — decidido fora;
  pode virar ideia futura de gerador no Wizard.
- Regras expandidas de ferramentas (prosa sem mecânica de ficha).

## Infra da fonte XGE

- `sources.js`: nova entrada
  `xanathar: { code: 'xanathar', label: 'Guia de Xanathar para Todas as Coisas', abbr: 'XGE' }`.
- Arquivos novos em `public/srd-data/`:
  - `xanathar-feats-pt.json`
  - `xanathar-spells-pt.json`
  - `xanathar-class-choices-pt.json` (subclasses + invocações, como options por classe)
  - `xanathar-magic-items-pt.json`
- `SrdProvider`: união PHB ∪ Tasha ∪ Xanathar, cada item carimbado na carga.
  Filtragem continua no consumo, nunca no provider.
- `SourcePicker`: verificar se itera `SOURCES` (toggle de graça) ou se tem o
  Tasha hard-coded; ajustar pra escalar com N fontes.
- Princípio de gating mantido: fontes ativas filtram só o que é **oferecido**;
  o que a ficha já tem sempre renderiza.

## Peça: pré-requisito de raça nos talentos

Os 15 talentos raciais exigem raça específica. Hoje `prereq` suporta
`spellcasting` / `ability` / `ability_or` / `proficiency`.

- Novo tipo: `{ "type": "race", "races": ["anao", ...] }`, com os códigos de
  raça do app.
- **Agilidade Atarracada** ("anão ou raça Pequena") vira lista explícita das
  raças válidas do app (anão, halfling, gnomo) — sem criar tipo `size`.
- Talentos com sub-raça (Alta Magia Drow, Magia do Elfo da Floresta,
  Teleporte Feérico) usam o código da sub-raça.
- Os **dois** FeatPickers (Wizard `blocks/FeatPicker.jsx` e level-up
  `levelProgression/FeatPicker.jsx`) filtram pelo prereq e mostram label
  legível "(requer raça X)".
- `attrBonus` (+1 em atributo) já é suportado pelo schema de talentos.

## Peça: Hexblade + Guerreiro Hediondo

A única peça que mexe em motor/painel:

- Patrono novo na choice `patron`, com features no formato parseável
  "• Nv N —" (cards por nível + trackers automáticos; invariante
  ids card == tracker). Maldição do Hexblade ganha tracker 1/descanso curto.
- Lista expandida de magias do patrono nas tabelas do `subclassSpells.js`
  (GRUPO B — conhecidas adicionais, sem `alwaysPrepared`).
- **Guerreiro Hediondo**: quando o patrono é Hexblade, o `WarlockPactPanel`
  passa a usar `max(FOR, DES, CAR)` no ataque/dano da arma de pacto (hoje é
  `max(FOR, DES)` de propósito). Testes estendem `WarlockPactPanel.test.jsx`.

## Subclasses em volume

- Append nas `choices` existentes de cada classe via
  `xanathar-class-choices-pt.json`, texto no formato "• Nv N —" pra reusar o
  parser de cards+trackers.
- Magias concedidas nas tabelas do `subclassSpells.js`:
  - Forja e Sepultura → domínios de Clérigo (GRUPO A, sempre preparadas)
  - Celestial → lista expandida de patrono (GRUPO B)
  - Conquista e Redenção → tabela de juramentos do Paladino (GRUPO A)
- Escolhas internas de subclasse (Disparos Arcanos do Arqueiro Arcano, armas
  do Kensei, etc.) usam o mecanismo de choice existente, como as manobras.
- Verificar `ClericDomainPanel` / `class-roles.js` para entradas dos domínios
  e subclasses novos.

### Risco: Alma Divina (Divine Soul)

O Feiticeiro Alma Divina escolhe magias **também da lista de Clérigo**. Isso
pode exigir mexer no filtro de listas de magia por classe (hoje cada magia
declara suas classes). **Spike no início da fase de subclasses** pra decidir:
estender o filtro (magia de clérigo oferecida a feiticeiro quando a subclasse
é Alma Divina) ou outra modelagem. Não investir no volume antes de resolver.

## Magias + mecânicas (maior custo do projeto)

- `xanathar-spells-pt.json` no schema existente, cada magia declarando classes.
- O guard-rail `findUncovered` de `spell-mechanics-pt.json` **falha com fonte
  nova** — a curadoria das ~95 magias é obrigatória: dano/cura/ataque/CD/
  upcast pras roláveis, `_ignore` pras utilitárias.
  GOTCHAs conhecidos: `upcast.perLevels`, `damage[].addMod`, `beams`.
- Se o sub-projeto Efeitos Ativos (spec 2026-07-07) já estiver mergeado na
  execução, magias XGE com buff ganham os campos de efeito na mesma curadoria.

## Invocações + itens

- Invocações: options na choice `eldritch_invocations` com `source:
  "xanathar"`; adicionar hints de combate relevantes em `INVOCATION_HINTS`
  (Golpe Místico, Arma de Pacto Aprimorada, ...).
- Itens comuns no formato `phb-magic-items-pt.json`.

## Esteira de extração

- `scripts/xanathar/` reutilizando `extract_text.py` (importado/compartilhado
  do `scripts/tasha/`), com build scripts por tipo no padrão `build_feats.py`.
- Saída UTF-8 direta (não há problema de acento — descoberta do Tasha).
- Mapeamento de páginas do PDF feito no início de cada fase de conteúdo.
- **Validação**: checagem de schema automatizada + revisão manual com o dono
  nos itens de risco (Hexblade, Alma Divina, magias com regras sutis).

## Service worker + testes

- **Bumpar `cacheName 'srd-data-vN'` em `vite.config.js`** ao mexer em
  `public/srd-data`.
- Testes:
  - Schema dos JSONs novos (validação estrutural).
  - Gating por fonte: item XGE some com a fonte off, aparece com on; ficha
    que já usou XGE continua renderizando com a fonte desligada.
  - Prereq de raça nos dois FeatPickers (filtro + label).
  - Guerreiro Hediondo: CHA na arma de pacto só com patrono Hexblade.
  - Tiers novos do `subclassSpells.js` (Forja/Sepultura/Celestial/juramentos).
  - `findUncovered` verde com as mecânicas XGE curadas.
  - Parse "• Nv N —" das subclasses novas (cards + trackers, ids iguais).

## Ordem de build

1. **Infra XGE + talentos raciais.** Fonte, arquivos, merge, seletor/selo,
   provados ponta a ponta com os 15 talentos (inclui o prereq de raça).
2. **Hexblade completo.** Patrono + Guerreiro Hediondo (CHA) + tracker da
   Maldição + lista expandida. Resolve o deferral.
3. **Subclasses em volume.** Spike Alma Divina primeiro; depois as 24
   restantes com magias concedidas e escolhas internas.
4. **Magias.** Extração das ~95 + curadoria de mecânicas (guard-rail verde).
5. **Invocações + itens comuns.**
6. **Fechamento.** Bump do SW cache, e2e, auditoria de conteúdo com o dono.

## Fora de escopo / decisões adiadas

- "Isto é Sua Vida" (gerador de história no Wizard) — ideia futura.
- Regras de mestre do XGE — sem lugar na ficha.
- Default global de fontes (herdado do Tasha como melhoria futura de UX).

## Relacionado

- [[tasha-fontes]] — infra de fontes e esteira que este sub-projeto reusa.
- [[xanathar-deferral]] — o deferral do Hexblade/CHA que a fase 2 resolve.
- [[magias-interativas]] — guard-rail de mecânicas que a fase 4 obedece.
- [[subclass-features-por-nivel]] — parser de features que as subclasses reusam.
- [[sw-cache-bump-srd]] — regra do bump de cacheName.
