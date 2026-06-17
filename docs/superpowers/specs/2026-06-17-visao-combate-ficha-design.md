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

Cada feature/opção ganha **um campo booleano obrigatório**:

```json
{ "name": "Ataque Furtivo (1d6)", "desc": "...", "combat": true }
```

Opcionalmente, um campo `actionType` força o selo de tipo e sobrescreve a
heurística:

```json
{ "name": "Fúria", "desc": "...", "combat": true, "actionType": "ação bônus" }
```

Valores válidos de `actionType`: `"ação"`, `"ação bônus"`, `"reação"`,
`"passiva"`.

**Fallback seguro:** feature sem `combat` (ou `combat: false`) é tratada como
não-combate e aparece em "Habilidades". Se uma feature de combate ficar sem
marcação por engano, o pior caso é o comportamento atual — nada quebra.

## 2. O selo de tipo

Reaproveita `detectActionType` (já existe em `FeaturesTab.jsx`) para inferir
ação/ação bônus/reação a partir da descrição. Regras de resolução do selo:

1. Se a feature tem `actionType` no dado → usa esse valor (vence tudo).
2. Senão, roda `detectActionType(desc)`.
3. Se `combat: true` e nada foi detectado → selo **"Passiva"**.

## 3. UI (`src/components/CharacterSheet/FeaturesTab.jsx`)

- Filtro **"Ações" renomeado para "Combate"** e passa a ser o **filtro padrão**
  (`activeFilter` inicial = `'combate'`).
- A visão Combate agrupa por seções: **Ações · Ações Bônus · Reações ·
  Passivas**. Mantém a economia de turno visível e traz as passivas de combate
  (Ataque Furtivo, Ataque Extra, Crítico Brutal etc.) na seção Passivas.
- **"Habilidades"** passa a listar **somente o não-combate**, limpo do ruído:
  - "Aumento de Atributo" deixa de aparecer como feature (já é tratado no
    sistema de atributos/ASI).
  - Placeholders de arquétipo (`subclass: true` / `choice_id`) somem quando a
    escolha correspondente já foi resolvida.
- **"Recursos"** permanece igual.
- Trackers de uso (Fúria, Ki, Canalizar Divindade) continuam aparecendo inline
  no card da feature, inclusive na visão Combate.

A categorização (combate vs. não-combate, e o balde de tipo) é extraída para um
helper puro e testável, em vez de ficar embutida no JSX.

## 4. Cobertura

- 12 classes base (`phb-class-progression-pt.json`).
- Opções de subclasse (`phb-class-choices-pt.json`).
- Casos cinzentos (ex.: "Sentido Divino" do Paladino — mais utilidade que
  combate) serão decididos na marcação e revisados pelo dono do projeto.

## 5. Testes

- **Helper de categorização** (unitário): dada uma feature com `combat`/
  `actionType`, cai no balde certo (Ações/Bônus/Reações/Passivas vs.
  Habilidades) e resolve o selo conforme as regras da seção 2.
- **Teste-guarda por classe:** features-âncora de combate aparecem em
  **Combate**, não em Habilidades — Ataque Furtivo (Ladino), Ataque Extra
  (Guerreiro), Golpe Divino (Paladino), Crítico Brutal (Bárbaro), Golpe
  Atordoante (Monge).
- **De-ruído:** "Aumento de Atributo" não aparece em Habilidades.
- **Fallback:** feature sem `combat` aparece em Habilidades (não some).

## Esforço / divisão de trabalho

Marcar `combat` em ~250 features base + opções de subclasse é trabalho manual de
julgamento de regras de D&D. Claude faz a primeira passada completa; o dono do
projeto revisa as marcações, com foco nos casos cinzentos.
