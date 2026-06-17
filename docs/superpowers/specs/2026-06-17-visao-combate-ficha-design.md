# Design: Visão de Combate na ficha

**Data:** 2026-06-17
**Status:** Aprovado (aguardando review do spec escrito)

## Problema

No teste real (amigo Allyson criando um Bárbaro), o jogador "ficou perdido
procurando as habilidades pra combate no meio das habilidades todas". As
habilidades que definem o combate de cada classe — muitas delas **passivas ou
modificadores** — nunca aparecem no filtro "Ações" atual, porque esse filtro só
captura o que é literalmente ação/ação bônus/reação na economia de turno.

Evidência (detecção atual rodada sobre as 12 classes):

- **Ladino:** Ataque Furtivo (a habilidade de combate mais importante da classe)
  fica perdido entre 33 itens em "Habilidades".
- **Bárbaro:** Crítico Brutal e Ataque Extra caem só em Habilidades (só Fúria e
  Ataque Descuidado viram "ação").
- **Guerreiro:** Estilo de Combate, Ataque Extra → Habilidades.
- **Paladino:** Golpe Divino → Habilidades.
- **Monge:** Golpe Atordoante → Habilidades.

Além disso, "Habilidades" está poluído: "Aumento de Atributo" repete ~5x por
classe e há placeholders de arquétipo ("Característica do Arquétipo...").

**Insight central:** "habilidade de combate" ≠ "ação na economia de turno". A
solução precisa marcar o que é **relevante pra combate**, não o que é uma ação.

## Objetivo

Tornar óbvio, na ficha, tudo que o personagem faz/usa em combate — ações e
passivas — para todas as 12 classes base e suas subclasses.

## Não-objetivos (fora de escopo)

- Traços raciais: seguem na heurística de detecção atual (não recebem marcação
  explícita nesta rodada).
- Talentos (feats): fora de escopo desta rodada.
- Magias: já vivem na própria aba; não mudam.

## 1. Modelo de dados (a marcação)

Marcação **explícita e inline** nos JSONs que já são fonte da verdade:

- `public/srd-data/phb-class-progression-pt.json` — features das 12 classes base
  (`levels[].features[]`).
- `public/srd-data/phb-class-choices-pt.json` — opções de subclasse
  (`choices[].options[]`).

Cada feature/opção recebe **um campo de classificação**. Dois campos
mutuamente exclusivos, e uma feature tem no máximo um deles:

- `combat`: `"essencial"` | `"situacional"` — a feature é de combate.
- `category`: `"defesa"` | `"exploracao"` | `"social"` | `"magia"` — a feature
  é não-combate (vai pra Habilidades, na seção correspondente).

```json
{ "name": "Ataque Furtivo (1d6)", "desc": "...", "combat": "essencial" }
{ "name": "Sentido de Perigo",    "desc": "...", "combat": "situacional" }
{ "name": "Saúde Divina",         "desc": "...", "category": "defesa" }
{ "name": "Passo da Terra",       "desc": "...", "category": "exploracao" }
```

**Combat tiers:**
- `essencial` — acionado proativamente quase toda luta (Fúria, Ataque Extra,
  Golpe Divino, CA, Golpe Atordoante).
- `situacional` — condicional, reativo raro, gatilho de nicho, capstone (Sentido
  de Perigo, Indomável, Queda Lenta, Toque Purificador). **Regra de desempate:**
  na dúvida entre essencial e situacional, vai pra **essencial** (melhor mostrar
  demais que esconder).

Opcionalmente, `actionType` força o selo de tipo e sobrescreve a heurística:

```json
{ "name": "Fúria", "desc": "...", "combat": "essencial", "actionType": "ação bônus" }
```

Valores válidos de `actionType`: `"ação"`, `"ação bônus"`, `"reação"`,
`"passiva"`.

**Fallback seguro:** feature sem `combat` nem `category` cai em "Habilidades",
numa seção genérica "Outras". Nada some; o pior caso é uma feature de combate
não-marcada aparecer em Habilidades (comportamento de hoje).

## 2. O selo de tipo (na visão Combate)

Reaproveita `detectActionType` (já existe em `FeaturesTab.jsx`) para inferir
ação/ação bônus/reação a partir da descrição. Regras de resolução do selo:

1. Se a feature tem `actionType` no dado → usa esse valor (vence tudo).
2. Senão, roda `detectActionType(desc)`.
3. Se é de combate e nada foi detectado → selo **"Passiva"**.

## 3. UI (`src/components/CharacterSheet/FeaturesTab.jsx`)

Filtros de primeiro nível: **Combate · Habilidades · Recursos**. "Combate" é o
padrão (`activeFilter` inicial = `'combate'`).

**Aba Combate** — controle segmentado no topo: `[ Essencial | Situacional ]`,
alterna entre os dois tiers. Cada vista mostra os cards agrupados por economia
de turno quando fizer sentido (Ações / Bônus / Reações / Passivas). Abre em
Essencial.

**Aba Habilidades** — só não-combate, em **seções recolhíveis por categoria**,
com as menos usadas vindo recolhidas:
- **Defesas & Resistências** (`category: "defesa"`)
- **Exploração & Viagem** (`category: "exploracao"`)
- **Social & Conhecimento** (`category: "social"`)
- **Magia & Recursos** (`category: "magia"`)
- **Outras** (fallback — sem marcação)

Limpeza de ruído nesta aba:
- "Aumento de Atributo" deixa de aparecer como feature (já tratado no sistema de
  atributos/ASI).
- Placeholders de arquétipo (`subclass: true` / `choice_id`) somem quando a
  escolha correspondente já foi resolvida.

O card de cada feature já expande inline para mostrar a descrição completa — não
há popup/modal separado para features de utilidade.

**Aba Recursos** — permanece igual. Trackers de uso (Fúria, Ki, Canalizar
Divindade) continuam aparecendo inline no card da feature, inclusive na visão
Combate.

A classificação (combat tier / category / selo de tipo) é extraída para um
helper puro e testável, em vez de ficar embutida no JSX.

## 4. Cobertura

- 12 classes base (`phb-class-progression-pt.json`).
- Opções de subclasse (`phb-class-choices-pt.json`).
- Casos cinzentos de classe base já adjudicados com o dono do projeto (ver
  decisões abaixo); os de subclasse serão marcados pelo mesmo critério e trazidos
  numa lista de revisão junto da primeira passada.

### Decisões sobre casos cinzentos (classe base)

Combate **situacional**: Sentido de Perigo, Movimentação Veloz, Campeão Primitivo,
Fúria Implacável (Bárbaro); Inspiração Bárdica + recuperações, Contrafeitiço
(Bardo); Invocações Eldritch, Dádiva de Pacto (Bruxo); Intervenção Divina
(Clérigo); Forma Selvagem + derivados (Druida); Fonte de Magia, Metamagia,
Restauração (Feiticeiro); Indomável (Guerreiro); Sentido Cego, Mente Escorregadia
(Ladino); Movimento Desarmado, Tranquilidade Mental, Alma de Diamante, Eu Perfeito
(Monge); Cura pelas Mãos, Toque Purificador (Paladino); Ocultar-se às Claras,
Desaparecer, Sentidos Ferais (Patrulheiro).

Não-combate (Habilidades): Força Indomável (Bárbaro); Canção de Descanso (Bardo);
Queda Lenta, Mov. Desarmado Aprimorado, Pureza de Corpo (Monge); Sentido Divino,
Saúde Divina (Paladino); Inimigo Favorito, Consciência Primeva, Passo da Terra
(Patrulheiro). Mago não tem features base de combate (combate dele é magia).

## 5. Testes

- **Helper de classificação** (unitário): dada uma feature com `combat`/
  `category`/`actionType`, cai no balde certo e resolve o selo conforme a seção 2.
- **Teste-guarda por classe:** features-âncora aparecem onde devem — Ataque
  Furtivo (Ladino), Ataque Extra (Guerreiro), Golpe Divino (Paladino), Crítico
  Brutal (Bárbaro), Golpe Atordoante (Monge) em **Combate / Essencial**.
- **Tier situacional:** Indomável (Guerreiro), Sentido de Perigo (Bárbaro) em
  **Combate / Situacional**, não em Essencial.
- **Agrupamento de Habilidades:** Saúde Divina em "Defesas", Passo da Terra em
  "Exploração".
- **De-ruído:** "Aumento de Atributo" não aparece em Habilidades.
- **Fallback:** feature sem marcação aparece em Habilidades (seção "Outras"),
  não some.

## Esforço / divisão de trabalho

Classificar ~250 features base + opções de subclasse é trabalho manual de
julgamento de regras de D&D. Claude faz a primeira passada completa; o dono do
projeto revisa, com foco nos cinzentos de subclasse.
