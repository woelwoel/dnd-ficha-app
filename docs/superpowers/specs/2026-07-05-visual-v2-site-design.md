# Visual v2 no site inteiro — Design (sub-projeto 1)

**Data:** 2026-07-05
**Status:** Aprovado pelo dono (estratégia + seções 1 e 2)

## Objetivo

Levar a identidade visual da ficha v2 (tema escuro, tokens `--v2-*`) para o
resto do site — lista de personagens, wizard, login, campanhas, admin,
bestiário, modais — que hoje usa o tema parchment. **76 arquivos JSX** fora da
ficha usam classes parchment/ink/gilt; o flip NÃO toca em JSX: é feito por
tema global + ponte CSS regenerada.

## Decisões do dono

1. **Estratégia**: ponte global + polimento (a técnica da fase 3 da ficha,
   aplicada ao app inteiro). Não é re-skin nativo tela a tela.
2. **Tema claro**: identidade única ESCURA. O modo claro do parchment
   sobrevive apenas dentro do escape hatch.
3. **Escape hatch**: flag temporário `?theme=parchment` (opt-out persistido),
   `?theme=v2` religa. Morre no corte definitivo, após observação em sessões
   reais.
4. **Escopo do sub-projeto 1**: infra do tema + passada visual com carinho em
   **lista + wizard + login**. Campanhas/admin/bestiário escurecem pelo flip
   mas o polimento fica pro sub-projeto 2.

## Arquitetura

### Escopo `.theme-v2` no `<html>`

- Novo diretório `src/theme/`:
  - `tokens.css` — os tokens `--v2-*` e os componentes `v2-panel`/`v2-btn`/
    `v2-chip`/`v2-title`/`v2-row`/etc. saem de
    `v2/tokens.css` pra cá. Tokens escopados em **`.theme-v2, .sheet-v2`**
    (o duplo escopo mantém a ficha v2 funcional mesmo com o tema global
    desligado pelo escape hatch). Componentes `v2-*` viram seletores planos
    (`.v2-panel` etc. — nomes já são prefixados e únicos), utilizáveis por
    qualquer tela na passada visual.
  - `legacy-bridge.css` — a ponte REGENERADA a partir do grep de TODOS os
    utilitários de cor do app (não só os da ficha), escopo duplo
    `.theme-v2 .util, .sheet-v2 .util`, mesma técnica por-utilitário com
    variantes (hover/focus/active/disabled/placeholder/group-hover/lg) da
    fase 3.
  - `flag.js` — `isThemeV2Enabled(search, storage)`, espelho exato do
    `isSheetV2Enabled`: `?theme=v2` religa e limpa; `?theme=parchment`
    desliga e persiste (`localStorage` chave `themeParchment`); sem query,
    ligado a menos que haja opt-out.
- `App.jsx` aplica a classe: efeito no root que faz
  `document.documentElement.classList.toggle('theme-v2', isThemeV2Enabled())`.
  Com o escopo no `<html>`, **portais** (Modal, ConfirmDialog, InfoPopover,
  painel de rolagens) ficam dentro do tema — o problema de portais do
  `.sheet-v2` não existe no escopo global.
- `v2/tokens.css` e `v2/legacy-bridge.css` atuais são substituídos pelos de
  `src/theme/` (imports do `SheetV2.jsx` atualizados). A ponte nova é
  superset da antiga (o grep global inclui os utilitários da ficha).
- `.sheet-v2` continua existindo só com o que é layout próprio da ficha.

### Gerador commitado

`scripts/gen-bridge.mjs` (hoje o gerador vive fora do repo — passa a ser
versionado): lê os utilitários de cor por grep do `src/` inteiro, emite
`src/theme/legacy-bridge.css`. Duas regras novas:

1. **Toda a saída embrulhada em `@media screen`** (variantes `lg:` viram
   `@media screen and (min-width:1024px)`). Motivo: o fluxo de impressão
   (`@media print` + `#print-character-view` no `index.css`) usa as classes
   parchment com cores de papel — a ponte NUNCA deve se aplicar em print.
   Com `@media screen`, a impressão permanece papel claro sem nenhum
   `:not()` por seletor.
2. **Seção bespoke ampliada**: além dos utilitários, o `index.css` tem
   classes próprias com cor hardcoded (`ink-italic`, `arcane-card`,
   `shadow-parchment`, scrollbars etc. — auditar por grep de cor no
   `index.css`). Cada uma ganha override bespoke no escopo do tema (lição do
   `.ink-italic` que o axe pegou na fase 5). O balão dos dados 3D
   (`.dice3d-toast`, cores hardcoded em `dice3d.css`) entra aqui: passa a
   usar tokens quando o tema está ativo.

### O que o flip NÃO muda

- **Fontes**: EB Garamond/IM Fell/Inter ficam como estão — a ponte só troca
  cor. Migração tipográfica é decisão tela a tela na passada visual, e os
  títulos display (a "cara" do Forja de Heróis) PERMANECEM serif.
- **JSX**: nenhum componente é editado pelo flip (só a passada visual toca
  em telas, e só nas três do escopo).
- **Parchment sob opt-out**: com `?theme=parchment`, o app volta ao tema
  atual, incluindo o modo claro por `prefers-color-scheme`. IMPORTANTE: o
  escape hatch restaura o TEMA, não congela o layout antigo — nas três telas
  que a passada visual tocar, mudanças estruturais (ex.: um card que virou
  `v2-panel`) aparecem degradadas sob o opt-out (vars `--v2-*` indefinidas
  fora dos escopos → painéis transparentes sobre parchment). Aceito de
  propósito: o flag é temporário e serve pra reverter a identidade, não o
  polimento.
- **Impressão**: sempre papel claro (via `@media screen` na ponte).

## Passada visual (lista + wizard + login)

Com a ponte no ar, as três telas já estarão escuras; a passada corrige o que
a tradução automática não resolve:

- Hierarquia e espaçamento; cards "chapados" ganham `v2-panel`; botões
  primários ganham `v2-btn` onde melhorar a consistência.
- **Acento fora da ficha**: teal padrão `#4fc7ab` (`--v2-accent` fallback).
  Dentro da ficha o acento por classe continua intocado.
- Ajustes pontuais de contraste que o axe apontar.
- Balão dos dados 3D e painel de rolagens acompanham o tema (bespoke acima).

Campanhas, admin, bestiário e modais restantes escurecem pelo flip e são
aceitos "como saírem" neste sub-projeto — polimento no sub-projeto 2.

## Testes e gates

- `src/test/theme-flag.test.js` — 3 casos, espelho do `sheetV2-flag.test`
  (default ligado; `?theme=parchment` persiste opt-out; `?theme=v2` limpa).
- Gates de axe existentes (login, privacidade, lista, wizard, ficha v1+v2)
  passam a rodar **no tema novo por default** — o contraste AA é o gate real
  do flip. Caso axe NOVO: lista com `?theme=parchment` (escape hatch não
  regrediu).
- E2e existentes asseram por texto/role — imunes a cor; suíte inteira roda
  como regressão.
- Prova visual: screenshots (lista, wizard, login) via stub do e2e, nos dois
  temas.
- Build + suíte unitária completos.

## Fora de escopo (sub-projetos seguintes)

- **Sub-projeto 2**: passada visual de campanhas/admin/bestiário/modais
  restantes.
- **Sub-projeto 3 (opcional, gated)**: migração nativa das telas pra tokens
  v2 com morte da ponte e do remap parchment do `index.css` — alinhada com a
  Etapa B da ficha v1; ambas dependem da observação do dono em sessões
  reais.
- Modo claro do tema v2; monetização de temas; troca global de fontes.
