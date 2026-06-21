# Forma Selvagem restrita a bestas conhecidas — Design

**Data:** 2026-06-21
**Status:** Aprovado (aguardando plano de implementação)

## Problema

Hoje o druida pode se transformar em qualquer besta do catálogo SRD dentro dos
limites de CR e movimento do nível. A regra oficial do PHB (p.66) diz que o
druida só pode assumir a forma de uma besta que **já tenha visto pelo menos uma
vez**. O app ignora esse requisito.

Queremos respeitar a regra: o druida só se transforma em bestas que conhece, e a
lista de bestas conhecidas cresce ao longo do jogo.

## Filosofia / fluxo de jogo pretendido

- O druida nasce (nível 2) **sem nenhuma besta conhecida**. A lista inicial é
  fruto de uma conversa com o mestre na criação ("sou da floresta, então conheço
  lobo, urso, águia…"), não de uma tabela automática genérica.
- A marcação de "já vi" é sempre feita pelo **próprio jogador**, na confiança —
  tanto em jogo solo quanto em mesa. Não há papel de mestre nem fluxo de
  aprovação nesta feature.
- Esta feature é **independente** do "fog of war do bestiário por mesa" (ideia
  separada, registrada à parte). Não depende de tabela no Supabase, RLS, nem de
  controle pelo mestre.

## Modelo de dados

Campo novo na ficha, dentro de `combat`:

```
combat.knownBeasts: string[]   // index das bestas vistas, ex.: ["wolf", "brown-bear"]
```

- A chave é o `index` do catálogo `public/srd-data/wild-shape-beasts-pt.json` — o
  mesmo arquivo que o `WildShapePanel`/`BeastPicker` já consome. Tanto o picker
  quanto a nova visão de curadoria leem desse arquivo, então não há risco de
  divergência de chaves entre fontes diferentes (o bestiário global usa
  `5e-SRD-Monsters.json`, que **não** é usado aqui).
- Schema: adicionar `knownBeasts: z.array(z.string()).default([])` em
  `combatSchema` (`src/domain/characterSchema.js`). Diferente de
  `combat.wildShape` (que é estado transitório da besta ativa), `knownBeasts` é
  estado persistente.

## Componentes e comportamento

### 1. Picker da Forma Selvagem (`WildShapePanel` → `BeastPicker`)

- Continua filtrando por CR e movimento exatamente como hoje.
- Cada besta elegível passa a ter dois estados visuais:
  - **Conhecida** (`index ∈ knownBeasts`): selecionável para transformar, como
    hoje.
  - **Não conhecida**: acinzentada/bloqueada, **não** selecionável para
    transformar, com um botão **"já vi essa"** que adiciona o `index` ao
    `knownBeasts` ali mesmo (marcação rápida no calor do jogo).
- Druida nv 2 recém-criado vê todas as bestas bloqueadas mas marcáveis — o
  comportamento de "cold start" desejado, não um bug.
- A contagem/label do filtro pode distinguir "X conhecidas de Y elegíveis".

### 2. Visão "Bestas conhecidas" (dentro da ficha do druida)

- Uma lista navegável **somente de bestas** (do catálogo wild-shape), para
  marcação em lote com calma — o momento "alinhei com o mestre na criação,
  conheço lobo/urso/águia".
- Cada item tem um toggle de conhecida/não conhecida.
- Fica ancorada na ficha (tem acesso ao `CharacterContext`), então sempre sabe
  qual druida está sendo editado. **O bestiário global (`BestiaryModal`) não é
  tocado** — ele é montado no shell do app, fora da rota da ficha, e não tem
  noção de "ficha atual".
- Localização exata na UI (aba própria, seção dentro do painel de combate, ou
  expansível) fica para o plano de implementação decidir seguindo os padrões
  existentes.

### Condição de exibição

Tudo (picker com estados + visão de curadoria) só aparece para druida nível 2+,
mesma condição que já controla a exibição do `WildShapePanel` hoje.

## Druidas existentes (migração)

Druidas já criados não têm o campo `knownBeasts`. Ao subir a feature, eles
começam com a lista **vazia** — todas as bestas bloqueadas até o jogador remarcar
o que conhece. Tratamento idêntico ao de um druida novo. Custo aceito: um atrito
único de remarcação para quem já tem druida; coerente com a filosofia "alinhe com
o mestre".

(Não haverá lógica especial de "legado liberado" / dois comportamentos.)

## Fora de escopo

- Fog of war do bestiário por mesa (ideia separada).
- Marcação dentro do bestiário global (`BestiaryModal`) — descartado por custo de
  encanamento e ambiguidade (modal não sabe qual ficha está aberta).
- Marcação pelo mestre, fluxo de aprovação, persistência em Supabase
  específica da feature.
- Marcação automática ao encontrar a besta em combate (não há tracker de
  encontro hoje).

## Critérios de sucesso

- Druida nv 2+ só consegue **transformar** em bestas presentes em
  `combat.knownBeasts`.
- Bestas não conhecidas aparecem no picker bloqueadas, com ação "já vi essa" que
  as torna conhecidas e selecionáveis.
- Existe um lugar na ficha para marcar/desmarcar bestas conhecidas em lote.
- O bestiário global permanece inalterado.
- Druidas existentes começam com a lista vazia, sem quebrar (sem erro, só
  bloqueados até marcar).
