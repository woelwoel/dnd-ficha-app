# Dados 3D na rolagem — Design

**Data:** 2026-07-05
**Status:** Aprovado pelo dono (abordagem A + seções 1 e 2)

## Objetivo

Animação de dados 3D na tela ao rolar (estilo D&D Beyond), em **todas as rolagens
do app**, com suspense real: o resultado só aparece quando os dados param.
O motor lógico de rolagem (`parseAndRoll`) continua sendo a única fonte de
verdade — o 3D é teatro com resultado forçado.

## Decisões do dono

1. **Suspense estilo Beyond**: dados rolam na tela; o total aparece num balão
   quando eles param (~1–2s). O painel de histórico NÃO abre sozinho; a entrada
   entra no histórico quando os dados param.
2. **Escopo**: todas as rolagens do app (integração no `DiceRollerProvider`).
3. **Estética**: cor da classe do personagem na ficha (mesmo `CLASS_ACCENTS`
   do v2); cor padrão do app fora da ficha.

## Biblioteca

**`@3d-dice/dice-box-threejs`** (MIT; three.js + cannon-es).

- Suporta **resultado pré-determinado** via notação `@`: `Box.roll("2d20@12,5")`
  rola dados que caem exatamente nesses valores. É o requisito que descarta a
  irmã `@3d-dice/dice-box` (BabylonJS), cujos resultados vêm só da física real.
- Construtor `new DiceBox(selector, config)`; callback `onRollComplete` (ou
  `await Box.roll(...)`); cor via `theme_customColorset`; sons opcionais
  (ficarão **desligados**: `sounds: false` — o app não tem áudio em lugar
  nenhum).
- Assets estáticos (texturas) precisam ser copiados do pacote pra pasta
  pública: usaremos `public/dice-box/`.

## Arquitetura

### Novo módulo `src/components/DiceRoller/dice3d.js`

Único lugar do app que conhece a `dice-box-threejs`.

- `isDice3dSupported()`: WebGL disponível **e** sem `prefers-reduced-motion`.
- **Lazy load**: `import('@3d-dice/dice-box-threejs')` dinâmico (chunk separado,
  ~250 KB gzip com three + cannon-es), instância singleton num container de
  tela cheia com `pointer-events: none` criado no `body` (os dados rolam por
  cima da ficha sem bloquear cliques). Se o import falhar (ex.: offline antes
  do chunk cachear), marca indisponível **pela sessão** — sem retry por rolagem.
- `rollDice3d({ sides, values, onSettled })`: monta a notação forçada
  (`${values.length}d${sides}@${values.join(',')}`), anima e resolve no
  `onRollComplete` **ou num timeout de segurança de 5s** (nunca se perde uma
  rolagem se o WebGL travar). Dados somem sozinhos ~2,5s após parar.
- **Fila FIFO**: rolagens simultâneas animam uma por vez, cada uma liberando
  sua entrada no histórico na ordem. Fluxo de ataque fica igual ao Beyond:
  d20 do ataque cai → depois os dados de dano caem.
- O **balão de resultado** pertence ao overlay do módulo (DOM simples no
  container do `body`, sem React) — estilizado como o painel de rolagens
  (parchment), fora do escopo `.sheet-v2`.
- **Guarda de dados suportados**: só anima `sides` que a lib suporta
  (4, 6, 8, 10, 12, 20, 100); qualquer outro caso usa o fluxo fallback.

### `DiceRollerProvider` — apresentação centralizada no `roll()`

- `roll()` continua calculando **sincronamente** via `parseAndRoll` e
  **retornando a entry na hora** (o `AttackRollButton` depende do retorno pra
  detectar 20/1 natural — API pública intacta).
- **Caminho 3D** (toggle ligado + suportado): a entrada NÃO é despachada
  ainda; a animação dispara com os valores forçados (`rolls`; em vantagem/
  desvantagem, os DOIS d20 de `allRolls` — o balão/histórico mostram qual
  valeu); quando os dados param, despacha `ADD_ROLL` + mostra o **balão de
  resultado** (label + total, centro-inferior da tela, some em ~2,5s,
  `aria-live="polite"`). O painel não abre. Se o singleton ainda não carregou,
  a rolagem **aguarda o import** (primeira rolagem pode pagar ~300ms); se o
  import rejeitar, essa rolagem e as seguintes usam o fallback.
- **Caminho fallback** (toggle desligado, sem WebGL, `prefers-reduced-motion`,
  import falhou, notação sem dados — ex. modificador puro `"5"` — ou `sides`
  não suportado): despacha `ADD_ROLL` imediatamente **e abre o painel** —
  comportamento idêntico ao atual.
- O reset do modo pendente (vantagem/desvantagem "armada") continua imediato,
  como hoje.
- **Preload em idle**: com toggle ligado + suportado, o provider dispara o
  import do chunk em `requestIdleCallback` pra primeira rolagem não pagar o
  carregamento.

### Call sites param de chamar `openPanel()` após `roll()`

A apresentação agora é responsabilidade do provider. Os chamadores deletam a
linha `openPanel()` (a função continua no contexto pro FAB/painel):

- `src/hooks/useRollInteraction.js`
- `src/systems/dnd5e/components/CharacterSheet/AttackRollButton.jsx`
- `src/systems/dnd5e/components/CharacterSheet/ClericDomainPanel.jsx` (2×)
- `src/systems/dnd5e/components/CharacterSheet/CombatClassActions.jsx` (3×)
- `src/systems/dnd5e/components/CharacterSheet/ManeuversPanel.jsx`
- `src/systems/dnd5e/components/CharacterSheet/WildShapePanel.jsx`
- `src/systems/dnd5e/components/CharacterSheet/WizardArcanePanel.jsx`

Testes de componente que asseravam `openPanel` chamado passam a asserar só o
`roll(...)` (o "abre painel no fallback" vira teste do provider).

### Toggle do usuário

Botão "3D" no cabeçalho do painel ROLAGENS (junto do "limpar"), persistido em
`localStorage` (`dnd-ficha:dice3d`), **ligado por padrão**. Se
`isDice3dSupported()` é falso, o toggle nem aparece.

### Cor da classe

- Contexto ganha `setDiceAccent(hex | null)`.
- `SheetV2` seta o accent via `classAccentOf(character.info.class)`
  (`v2/classAccents.js`) ao montar/trocar de classe e limpa (null) ao desmontar.
- O módulo 3D traduz o accent num `theme_customColorset` (corpo do dado na cor
  da classe, números em contraste claro). Accent null → colorset padrão do app
  (tinta escura + dourado).

### Offline / Service Worker

- Assets da lib em `public/dice-box/` + rota runtime `CacheFirst` nova no
  `vite.config.js` (`cacheName: 'dice3d-assets-v1'`, mesmo padrão de
  `/maps/`).
- O chunk JS lazy entra no precache normal do Workbox (globPatterns já cobre
  `**/*.js`; limite de 8 MB comporta).

## Testes

- **jsdom não tem WebGL** → todos os testes unitários existentes caem no fluxo
  fallback sem mudança — prova de que o fallback é o comportamento antigo.
  (Exceção: os que asseravam `openPanel` de componente, ajustados como acima.)
- Novos unitários (com `vi.mock` do `dice3d.js`):
  - entrada só entra no histórico após o settle;
  - ordem FIFO em rolagens encadeadas;
  - timeout de 5s libera a entrada;
  - toggle persiste em localStorage e default ligado;
  - `roll()` retorna a entry sincronamente nos dois caminhos;
  - fallback abre o painel; caminho 3D não abre.
- **e2e**: `installAuthedApp` semeia `dnd-ficha:dice3d` desligado (mantém os
  testes existentes determinísticos — WebGL em CI headless é flaky); smoke novo
  confirma o toggle no painel; axe segue zero critical/serious (balão com
  `aria-live`, toggle com label).
- **Prova visual** no final: screenshot dos dados 3D na tela via stub do e2e.

## Fora de escopo

- Sons de dado (config existe, fica desligada).
- Temas de dado escolhíveis pelo usuário (só cor da classe/padrão).
- Rolagem 3D no bestiário/mestre além do que já passa pelo `roll()` do
  contexto (ganham 3D de graça por serem o mesmo provider).
