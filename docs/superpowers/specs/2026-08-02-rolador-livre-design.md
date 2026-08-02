# Rolador livre no painel de dados

**Data:** 2026-08-02
**Status:** aprovado, aguardando plano de implementação

## Problema

Hoje só se rola o que está pré-definido: perícias, salvaguardas, ataques, magias,
dados de vida. Não existe jeito de rolar um dado qualquer — `3d6` pra riqueza
inicial, `1d100` numa tabela de tesouro, `2d10` de dano de queda, `1d4` pra
decidir a direção do vento. O jogador precisa largar o app e pegar dado físico
(ou outro app), e a rolagem some do histórico da sessão.

## Solução

Uma faixa de rolagem livre dentro do painel flutuante de rolagens, que já existe
e é global (aparece na ficha, na mesa de combate, na lista de personagens).

### Onde entra

`DiceHistoryPanel` (`src/components/DiceRoller/DiceHistoryPanel.jsx`) ganha um
componente novo, `QuickRollBar`, posicionado **entre** a fileira "Próxima:
Normal/Vant./Desv." e a lista do histórico.

```
┌─ 🎲 ROLAGENS ────── último: 17 ─ 3D ─ limpar ─ ✕ ─┐
│ Próxima:  [Normal] [↑ Vant.] [↓ Desv.]            │
├───────────────────────────────────────────────────┤
│ [d4][d6][d8][d10][d12][d20][d100]                 │  ← QuickRollBar
│ [−] 3 [+]   mod [+2]   [ Rolar 3d6+2 ]            │
├───────────────────────────────────────────────────┤
│ (histórico…)                                      │
└───────────────────────────────────────────────────┘
```

A faixa é **sempre visível** quando o painel está aberto — sem colapsar, sem
estado de aberto/fechado pra manter. O painel tem `w-72` (288px) e `maxHeight:
60vh`; a faixa custa ~70px de histórico visível, que continua rolando.

### Comportamento

**Tipo de dado.** Sete chips: `d4 d6 d8 d10 d12 d20 d100`. Seleção única — um
clique troca o tipo, não acumula. Padrão inicial: **d20**. Esses sete são
exatamente os lados que a lib 3D sabe animar (`DICE3D_SIDES` em `dice3d.js`), o
que garante que nenhuma rolagem saída daqui caia no fluxo sem animação.

**Quantidade.** Botões `−` e `+`, faixa de **1 a 20**, com clamp nas duas
pontas (`+` em 20 não passa, `−` em 1 não desce). Clicar no número abre
digitação direta; valor não-numérico ou fora da faixa faz clamp ao aplicar.

**Modificador.** Campo curto que aceita positivo e negativo (`2`, `+2`, `-1`).
Vazio significa 0 e **não entra na notação**. Entrada por
`inputMode="numeric"` (sem as setinhas do `type=number`).

**Disparo.** O botão exibe a notação que vai rolar (`Rolar 3d6+2`) — o usuário
confere antes de apertar. Ao clicar, chama o `roll()` do `DiceRollerContext`:

```js
roll(notation, 'Rolagem livre')
```

Sem `opts`. Isso faz a rolagem herdar, de graça, tudo que o provider já
orquestra:

- **Dados 3D** animados (com o accent da classe, quando na ficha);
- **Entrada no histórico** com o mesmo formato das demais;
- **Destaque de 20/1 natural** (só quando `sides === 20`, que é o que a
  `RollEntry` já checa);
- **Modo pendente** da fileira "Próxima:". Pela regra do `parseAndRoll`,
  vantagem/desvantagem só age quando o primeiro grupo é exatamente `1d20`;
  `3d6` com vantagem marcada rola normal. É o comportamento correto do PHB
  (p.173) e não precisa de código novo — mas o modo pendente **é consumido**
  pela rolagem livre como por qualquer outra (reseta pra `normal`).

**Sem buffs.** Não passamos `opts.category`, então os efeitos ativos (bênção,
etc.) não injetam dados extras nem vantagem. É deliberado: os buffs se aplicam
por categoria de rolagem (ataque, salvaguarda, perícia) e a rolagem livre não
tem categoria. Dado livre é dado cru.

**Rótulo.** As entradas no histórico e o toast 3D aparecem como
**"Rolagem livre"**.

### Montagem da notação

```
count + 'd' + sides + (mod === 0 ? '' : (mod > 0 ? `+${mod}` : `${mod}`))
```

Exemplos: `1d20`, `3d6+2`, `2d8-1`, `1d100`. O `parseAndRoll` já entende esse
formato — nenhuma mudança no motor de rolagem.

### Persistência

A última escolha (tipo, quantidade, modificador) é gravada em `localStorage`
sob a chave `dnd-ficha:quickroll`, no mesmo padrão de `dnd-ficha:dice3d` e
`dnd-ficha:fab-dice`: leitura e escrita dentro de `try/catch`, caindo no padrão
(`d20`, 1, 0) se o storage estiver indisponível ou o valor for inválido.

Motivo: quem rola `8d6` de bola de fogo repete a mesma rolagem várias vezes na
sessão; reabrir o painel já com `8d6` na mão economiza seis cliques.

### Acessibilidade

- Chips de tipo: `aria-pressed` refletindo a seleção;
- `−`/`+`: `aria-label` ("Diminuir quantidade" / "Aumentar quantidade");
- Campo de quantidade e de modificador com `aria-label` próprio;
- Botão de disparo com `aria-label` explícito: `Rolar 3d6+2`.

### Estilo

Os chips seguem o padrão visual da fileira "Próxima:" que já está no painel
(borda + superfície parchment, ativo com `shadow-inner`), pra faixa nova não
destoar de dois centímetros acima. O botão de disparo usa o primitivo
`Button` (`variant="primary" size="sm"`), que já resolve a affordance no tema
escuro via `.ui-btn` — não pintar botão com utilitário de cor direto, que a
ponte `legacy-bridge.css` achata (ver spec de affordance de botões,
2026-08-01).

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/components/DiceRoller/QuickRollBar.jsx` | **novo** — a faixa inteira, autocontida |
| `src/components/DiceRoller/DiceHistoryPanel.jsx` | monta `<QuickRollBar />` entre o bloco de modo e o histórico |
| `src/test/QuickRollBar.test.jsx` | **novo** |

`useDiceRoller.js`, `DiceRollerContext.jsx` e `dice3d.js` **não mudam**. A faixa
é só mais um call site do `roll()`.

## Testes

1. Notação montada corretamente: `1d20` (padrão), `3d6+2`, `2d8-1`, e
   modificador 0 omitido.
2. Clamp da quantidade: `+` parado em 20, `−` parado em 1, digitação de `0` e
   de `99` corrigida pra 1 e 20.
3. `roll` chamado com a notação e o rótulo `'Rolagem livre'`, e **sem**
   `opts.category`.
4. Persistência: a escolha vai pro `localStorage` e é lida na montagem; valor
   corrompido cai no padrão sem quebrar.
5. Integração: a rolagem aparece no histórico do painel.

Rodar a suíte por fatias com `--maxWorkers=2` (a suíte cheia estoura a memória
da máquina).

## Fora de escopo

- **Misturar tipos numa mesma rolagem** (`2d6+1d8`). A `parseAndRoll` até
  suporta multi-termo, mas o `enqueueDice3d` recebe um único `sides` e só
  animaria o primeiro grupo — a rolagem ficaria com metade dos dados invisíveis
  no tabuleiro. Fica pra quando (e se) o 3D souber misturar.
- **Rolagens favoritas com nome** ("Bola de Fogo — 8d6").
- **Compartilhar a rolagem com a mesa.** É o sub-projeto seguinte (log de
  rolagens da mesa), independente deste: ele intercepta o `roll()` do provider,
  então captura *todas* as rolagens do jogador, não só as livres.
