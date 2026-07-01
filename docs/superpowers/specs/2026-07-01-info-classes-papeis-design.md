# Botão ℹ "Sobre a Classe" com papéis de foco — Design

**Data:** 2026-07-01
**Branch:** multi-sistema-fronteira
**Autor:** brainstorming com o dono

## Problema

No wizard de criação, a classe é escolhida por um `<select>` nativo
([ClassPicker.jsx](../../../src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassPicker.jsx))
e no [MulticlassModal.jsx](../../../src/systems/dnd5e/components/CharacterWizardV2/MulticlassModal.jsx).
Quem está começando não tem como saber **o que a classe é** e **no que ela é
focada** (dano, cura, suporte…) antes de escolher. A informação existe no
domínio (`summary`, `fullDescription`), mas não é exposta na hora da decisão.

## Objetivo

Adicionar um botão de informação (ℹ) ao lado do seletor de classe (na criação e
na multiclasse) que abre um popover explicando, de forma curta e visual, o que a
classe é e quais são seus papéis de foco em jogo.

Não-objetivos (YAGNI): não trocar o `<select>` por cards; não expor a lore longa
(`fullDescription`); não criar página/tela de "comparar classes".

## Decisões de design

### 1. Interação
Reaproveitar o componente existente
[InfoPopover.jsx](../../../src/components/ui/InfoPopover.jsx) (botão ℹ que abre
popover no clique, via portal — já resolve toque e overflow). O botão fica
**inline à direita do `<select>`** de classe. Só aparece quando há classe
selecionada (o `InfoPopover` retorna `null` sem conteúdo).

### 2. Conteúdo do popover
- **Título:** nome da classe.
- **Etiquetas de papel** (pílulas coloridas) no topo — ver seção 3.
- **Texto descritivo:** o campo `summary` que já existe no JSON de classes
  (frase de "o que é a classe", ex.: *"Guerreiros furiosos que entram em fúria
  primal para causar dano massivo e resistir a qualquer coisa"*).

### 3. Papéis de foco (vocabulário detalhado — 10 etiquetas)

`DANO CORPO A CORPO`, `DANO À DISTÂNCIA`, `DANO MÁGICO`, `CURA`, `SUPORTE`,
`TANQUE`, `CONTROLE`, `UTILIDADE`, `FURTIVIDADE`, `INVOCAÇÃO`.

Atribuição inicial por classe (ponto de partida — o dono revisa):

| Classe (index) | Papéis |
|---|---|
| Bárbaro (`barbaro`) | DANO CORPO A CORPO · TANQUE |
| Bardo (`bardo`) | SUPORTE · CONTROLE · UTILIDADE |
| Clérigo (`clerigo`) | CURA · SUPORTE · DANO MÁGICO |
| Druida (`druida`) | CURA · CONTROLE · INVOCAÇÃO |
| Guerreiro (`guerreiro`) | DANO CORPO A CORPO · DANO À DISTÂNCIA · TANQUE |
| Monge (`monge`) | DANO CORPO A CORPO · UTILIDADE |
| Paladino (`paladino`) | DANO CORPO A CORPO · CURA · TANQUE |
| Patrulheiro (`patrulheiro`) | DANO À DISTÂNCIA · UTILIDADE |
| Ladino (`ladino`) | FURTIVIDADE · DANO À DISTÂNCIA · UTILIDADE |
| Feiticeiro (`feiticeiro`) | DANO MÁGICO · CONTROLE |
| Bruxo (`bruxo`) | DANO MÁGICO · CONTROLE · UTILIDADE |
| Mago (`mago`) | DANO MÁGICO · CONTROLE · INVOCAÇÃO |
| Artífice (`artifice`, Tasha) | SUPORTE · UTILIDADE · INVOCAÇÃO |

### 4. Onde os dados vivem
Adicionar um campo `roles: [...]` (array de strings) por classe em
[phb-classes-pt.json](../../../public/srd-data/phb-classes-pt.json) e em
[tasha-classes-pt.json](../../../public/srd-data/tasha-classes-pt.json). Esses
arquivos já são carregados no wizard → **zero fetch novo**. O objeto de classe
selecionada já está disponível nos dois pontos de UI (`selectedClass`).

⚠️ **Service worker:** mexer em `public/srd-data` exige bumpar o `cacheName`
`srd-data-v19` → `srd-data-v20` em [vite.config.js:97](../../../vite.config.js),
senão o SW serve o JSON antigo e o deploy não chega no usuário.

### 5. Cores das pílulas (por categoria)
O `index.css` remapeia as paletas do Tailwind para tons terrosos do tema, mas
mantém matizes distintos. Só há **8 famílias seguras**: `red, orange, amber,
yellow, green, blue, sky, purple` (+ `ink`/`gray` para cinza). Como são 10
papéis, alguns compartilham matiz dentro da mesma macro-categoria; o texto da
pílula sempre distingue. Mapa proposto (`border-X-700 bg-X-50 text-X-700`,
padrão já usado no app):

| Papel | Família |
|---|---|
| DANO CORPO A CORPO | red |
| DANO À DISTÂNCIA | orange |
| DANO MÁGICO | purple |
| CURA | green |
| SUPORTE | blue |
| TANQUE | sky |
| CONTROLE | amber |
| UTILIDADE | yellow |
| FURTIVIDADE | ink/gray |
| INVOCAÇÃO | green (compartilha com CURA — ambos "natureza/conjurar") |

Um único componente `RoleBadge` (ou helper `roleStyle(role)`) centraliza o mapa
role→classe-de-cor, consumido pelo popover nos dois lugares.

### 6. Escopo de UI
Dois pontos, mesmo padrão:
1. `ClassPicker.jsx` — ℹ inline à direita do `<select>` principal.
2. `MulticlassModal.jsx` — ℹ inline à direita do `<select>` de classe secundária.

Para evitar duplicação, o conteúdo do popover (pílulas + summary) vira um
componente pequeno reutilizável, ex.: `ClassInfoContent({ classData })`, passado
como `content` do `InfoPopover`. Fica em
`src/systems/dnd5e/components/CharacterWizardV2/blocks/class/`.

## Componentes e fronteiras

- **`roleStyle(role)`** (helper puro): role → classes Tailwind da pílula. Fácil
  de testar isoladamente.
- **`ClassInfoContent({ classData })`**: renderiza pílulas (via `roleStyle`) +
  `summary`. Sem estado. Recebe o objeto de classe.
- **`ClassPicker` / `MulticlassModal`**: montam `<InfoPopover title={nome}
  content={<ClassInfoContent classData={selectedClass} />} />` ao lado do select.
- **Dados**: `roles` no JSON de classes (PHB + Tasha).

## Testes

Em `src/test/`:
1. `roleStyle` retorna classe de cor conhecida para cada papel e um fallback
   neutro para papel desconhecido.
2. `ClassInfoContent` renderiza uma pílula por papel + o texto `summary`.
3. `ClassPicker`: com classe selecionada, o botão ℹ aparece; sem classe, não
   aparece. (Abrir o popover e ver o nome/summary, se viável no jsdom via portal.)

## Riscos / notas
- Esquecer o bump do `cacheName` (memória `sw-cache-bump-srd`) → deploy invisível.
- Atribuição de papéis é editorial; o dono (jogador de D&D) deve revisar a tabela
  antes ou logo após implementar — trivial de ajustar (só editar o JSON).
- Artífice/Tasha entra nos dados por consistência, mesmo com a branch Tasha não
  mergeada; não custa nada e evita buraco se a fonte for ativada.
