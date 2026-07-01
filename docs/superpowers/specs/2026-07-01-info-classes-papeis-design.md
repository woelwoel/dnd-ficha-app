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
na multiclasse) que abre um modal em pergaminho: bússola rápida no topo (papéis
de foco + resumo) e, abaixo, a lore completa da classe (`fullDescription`) com
boa tipografia de leitura.

Não-objetivos (YAGNI): não trocar o `<select>` por cards; não criar página/tela
de "comparar classes".

## Decisões de design

### 1. Interação
Um botão ℹ fica **inline à direita do `<select>`** de classe e só aparece quando
há classe selecionada. Ao clicar, abre um **modal em pergaminho** (o componente
existente [Modal.jsx](../../../src/components/ui/Modal.jsx), `size="lg"`), que dá
espaço confortável para a lore completa — ao contrário do `InfoPopover` (balão
estreito e escuro), inadequado para texto longo. O `InfoPopover` **não** é usado
nesta feature.

### 2. Conteúdo do modal
- **Título (header do Modal):** nome da classe.
- **Etiquetas de papel** (pílulas coloridas) no topo — ver seção 3.
- **Resumo:** o campo `summary` em destaque (frase de "o que é a classe", ex.:
  *"Guerreiros furiosos que entram em fúria primal para causar dano massivo e
  resistir a qualquer coisa"*).
- **Legenda dos papéis (sempre visível):** logo abaixo das pílulas, uma linha
  curta por papel *daquela* classe, explicando o que o papel significa — ver
  seção 3.1. Público-alvo inclui quem nunca jogou; a explicação fica à mostra, não
  escondida atrás de clique/hover.
- **Lore completa:** o campo `fullDescription`, renderizado com boa tipografia de
  leitura (parágrafos no tema pergaminho, como a página de livro do PHB).

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

### 3.1 Definições dos papéis (linguagem de novato)

Mapa único `role → frase curta` (`ROLE_DEFINITIONS`), autorado uma vez e
reaproveitado na legenda. Explica **todos** os papéis, sem pressupor conhecimento:

| Papel | Definição |
|---|---|
| DANO CORPO A CORPO | Fica na linha de frente e causa dano de perto (espadas, machados, punhos). |
| DANO À DISTÂNCIA | Causa dano de longe, com arcos, bestas ou armas de arremesso. |
| DANO MÁGICO | Causa dano com magias — fogo, raios, energia arcana. |
| CURA | Restaura pontos de vida e mantém o grupo de pé. |
| SUPORTE | Fortalece aliados e atrapalha inimigos com bênçãos, buffs e ajuda. |
| TANQUE | Aguenta muito dano e protege os aliados segurando os inimigos. |
| CONTROLE | Domina o campo — prende, atordoa ou reposiciona vários inimigos de uma vez. |
| UTILIDADE | Resolve problemas fora do combate: exploração, social, truques variados. |
| FURTIVIDADE | Age nas sombras — esgueira-se, desarma armadilhas, ataca pelas costas. |
| INVOCAÇÃO | Conjura criaturas, espíritos ou constructos que lutam ao seu lado. |

Texto é editorial — o dono revisa junto com a tabela de atribuição.

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

Um único componente auto-contido `ClassInfoButton({ classData })` encapsula o
botão ℹ + o estado de aberto/fechado + o `Modal`. Assim os pais não precisam
gerenciar estado, e o mesmo componente serve nos dois pontos. Fica em
`src/systems/dnd5e/components/CharacterWizardV2/blocks/class/`.

### 7. Esc em modais aninhados (correção no primitivo `Modal`)
Na multiclasse, o `ClassInfoButton` abre um `Modal` **dentro** de outro `Modal`.
Hoje cada `Modal` registra o listener de Esc no `document`, então Esc fecharia os
dois de uma vez. Correção na raiz, em [Modal.jsx](../../../src/components/ui/Modal.jsx):
uma **pilha de modais** em nível de módulo (`const modalStack = []`). Cada modal
empilha seu `id` ao abrir e sai da pilha ao fechar/desmontar; o handler de Esc só
chama `onClose` **se aquele modal for o topo da pilha**:

```js
const modalStack = []            // nível de módulo
// no efeito de open:
modalStack.push(id)
function onKey(e) {
  if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) {
    onCloseRef.current?.()
  }
}
// cleanup: modalStack.splice(modalStack.indexOf(id), 1)
```

Resultado: Esc fecha só o modal do topo (o de info); apertar de novo fecha o de
baixo (a multiclasse). Beneficia **todos** os ~8 modais unificados nesse
primitivo, não só este caso. O backdrop já está correto (o modal de cima cobre a
tela, então clicar fora fecha só ele) — só o Esc precisava da pilha. `id` = o
mesmo identificador estável já criado no componente (`titleId`/ref).

## Componentes e fronteiras

- **`roleStyle(role)`** (helper puro): role → classes Tailwind da pílula. Fácil
  de testar isoladamente.
- **`ROLE_DEFINITIONS`** (mapa `role → frase`, seção 3.1): fonte única das
  explicações da legenda.
- **`ClassInfoContent({ classData })`**: corpo do modal — pílulas (via
  `roleStyle`) + legenda (pílula + `ROLE_DEFINITIONS[role]` por papel) + `summary`
  + `fullDescription`. Sem estado. Recebe o objeto de classe. Separado para testar
  sem abrir modal.
- **`ClassInfoButton({ classData })`**: botão ℹ + estado `open` + `<Modal
  open={open} title={classData.name} size="lg"><ClassInfoContent .../></Modal>`.
  Retorna `null` se não houver `classData`.
- **`ClassPicker` / `MulticlassModal`**: montam `<ClassInfoButton
  classData={selectedClass} />` ao lado do select.
- **`Modal.jsx`**: ganha a pilha de modais (seção 7) — mudança isolada no efeito
  de Esc; não altera a API pública.
- **Dados**: `roles` no JSON de classes (PHB + Tasha).

## Testes

Em `src/test/`:
1. `roleStyle` retorna classe de cor conhecida para cada papel e um fallback
   neutro para papel desconhecido; `ROLE_DEFINITIONS` tem entrada para os 10
   papéis.
2. `ClassInfoContent` renderiza uma pílula + a definição (`ROLE_DEFINITIONS`) por
   papel, mais o `summary` e o `fullDescription`.
3. `ClassInfoButton`: sem `classData` não renderiza nada; com classe, o botão ℹ
   aparece e, ao clicar, o modal abre mostrando nome + papéis + resumo + lore.
4. `ClassPicker`: com classe selecionada o botão ℹ aparece; sem classe, não.
5. `Modal` (pilha, seção 7): com dois modais abertos, Esc fecha só o de cima; um
   segundo Esc fecha o de baixo. Não deve quebrar o caso de modal único.

## Riscos / notas
- Esquecer o bump do `cacheName` (memória `sw-cache-bump-srd`) → deploy invisível.
- A pilha de modais (seção 7) mexe num primitivo compartilhado por ~8 telas — o
  teste 5 cobre o caso aninhado e o único; rodar a suíte inteira antes de mergear.
- Atribuição de papéis é editorial; o dono (jogador de D&D) deve revisar a tabela
  antes ou logo após implementar — trivial de ajustar (só editar o JSON).
- Artífice/Tasha entra nos dados por consistência, mesmo com a branch Tasha não
  mergeada; não custa nada e evita buraco se a fonte for ativada.
