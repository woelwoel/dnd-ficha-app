# Ficha v2 — Rolagem interativa (perícias, salvaguardas, atributos, iniciativa, ataques)

**Data:** 2026-07-04 · **Status:** aprovado pelo dono (brainstorm nesta data)

## Objetivo

Tornar a ficha v2 interativa para rolagem, estilo D&D Beyond: clicar numa perícia,
salvaguarda, atributo ou iniciativa rola o dado no dice roller 2D existente.
Dados 3D são um sub-projeto FUTURO — este spec é só a interatividade de rolagem.

## Contexto

- Infra pronta: `parseAndRoll` (vantagem/desvantagem em 1d20 via `mode`, crítico via
  `crit`), `useDiceRoller` (contexto com `roll(notation, label, opts)` + `openPanel`),
  `RollButton` (ícone com Shift+click=vantagem, Alt+click=desvantagem, long-press
  ≥500ms=vantagem com vibração), painel de histórico flutuante 🎲.
- O v1 rola perícias/atributos/salvaguardas/iniciativa/ataques. O v2 hoje só rola o
  que embrulha do v1 (Attacks no dialog, CombatClassActions, Spells, ManeuversPanel)
  e testes de morte. Os painéis NATIVOS do v2 são só leitura.

## Decisões (Q&A com o dono)

1. **Interação: linha inteira clicável** (não ícone por linha, não bônus clicável).
   Alvo de toque grande, visual limpo. Gestos de vantagem/desvantagem preservados.
2. **Card de atributo: clique ROLA o teste; edição migra pra um ícone ✎** no canto
   do card (padrão do PV no header). Editar é raro (level up); rolar é frequente.
3. **Escopo:** perícias (18), salvaguardas (6), testes de atributo (6), iniciativa
   (card INIT) e as linhas nativas de ataque da aba Ações (ataque + dano, com
   consumo de munição). Sentidos e bônus de proficiência NÃO rolam (passivos).
   CA NÃO rola (clique continua abrindo o editor). Testes de morte já rolam (fase 2).
4. **Abordagem A:** extrair a interação do RollButton para um hook headless
   compartilhado (fonte única do gesto), em vez de duplicar lógica (B) ou tornar o
   RollButton polimórfico (C).

## Arquitetura

### `useRollInteraction` (novo, `src/hooks/useRollInteraction.js`)

Hook headless com EXATAMENTE o comportamento atual do RollButton:

- Assinatura: `useRollInteraction({ notation, label, crit = false, onAfterRoll })`
  → `{ handlers, longPressActive, title }`.
- `handlers`: `onClick` (normal/Shift=adv/Alt=dis, chama `roll` + `openPanel` +
  `onAfterRoll`), `onPointerDown/Up/Leave/Cancel` (long-press 500ms → vantagem,
  `navigator.vibrate(40)` melhor-esforço), `onContextMenu` (preventDefault).
- `title`: string com as dicas de atalho (igual à atual do RollButton).
- Agnóstico de sistema — vive junto do `useDiceRoller`.

`RollButton` é REFATORADO para consumir o hook: mesma UI, mesmo comportamento,
mesmos testes (a suíte existente prova a equivalência). Nenhuma mudança de API.

### `RollableRow` (novo, `v2/RollableRow.jsx`)

`<button type="button">` com layout de `v2-row` (largura cheia, children livres),
usando o hook. Classe `v2-rollable` em `tokens.css`: hover com `--v2-surface-2`,
cursor pointer, active scale, highlight de long-press (mesmo feedback visual do
RollButton: destaque + escala enquanto o gesto arma vantagem). Cores só via tokens.

### Notações e labels (derivados do `calc`, mesma fonte que a ficha exibe)

| Onde | Notação | Label no histórico |
|------|---------|--------------------|
| Perícia (18) | `1d20{fmt(skillBonus(character, calc, key))}` | nome da perícia ("Atletismo") |
| Salvaguarda (6) | `1d20{fmt(calc.savingThrows[key])}` | `Salvaguarda — {ABBR}` |
| Teste de atributo (6) | `1d20{fmt(calc.mods[key])}` | `Teste de {Nome}` |
| Iniciativa | `1d20{fmt(calc.initiative)}` | `Iniciativa` |
| Ataque (linhas nativas) | via `AttackRollButton` v1 + `RollButton` de dano | nome da arma |

Labels iguais aos do v1 onde houver paridade (histórico consistente).

## Mudanças por componente (tudo em `v2/`; único toque no v1 é o refactor interno do RollButton)

- **SkillsPanel** — cada linha vira `RollableRow` (marcador ○/●/◆, nome e bônus
  visualmente idênticos).
- **SavesPanel** — idem, 6 linhas.
- **AbilityStrip** — card de atributo: clique rola o teste; edição vira ícone ✎
  pequeno no canto (só `!readOnly`, alvo ≥ 24px). O ✎ HERDA os aria-labels de edição
  atuais (`Editar Força`... `Editar Carisma`) — testes da fase 2 continuam válidos.
  Card CA: intocado (clique = editor). Card INIT: clique rola iniciativa.
- **ActionsTab** — linhas nativas de ataque ganham `AttackRollButton` (fluxo
  ataque→crítico→dano do v1) + `RollButton` de dano avulso, com `onAfterRoll`
  consumindo munição via `updateItem` (mesma semântica do AttackRow v1, via
  `findAmmoForAttack`). Re-tematizados pela ponte CSS.

## readOnly (visão do mestre)

Rolar NÃO muta a ficha → permitido em readOnly. Perícias/salvaguardas/atributos/INIT
rolam; o ✎ de edição some (como hoje). Exceção conhecida: as linhas de ataque vivem
dentro do `fieldset disabled` do MainBox — no modo DM os botões de ataque ficam
desabilitados junto. Aceito e documentado; não vale reestruturar o fieldset.

## Acessibilidade

Linhas viram `<button>` reais: `aria-label` descritivo ("Rolar Atletismo, bônus +5"),
foco por teclado (Enter/Espaço funcionam nativamente), outline global de foco.
Gate: o teste axe do v2 (e2e, fase 5) continua zero critical/serious.

## Testes

- `sheetV2TestContext` ganha `DiceRollerContext.Provider` com `roll`/`openPanel`
  espiáveis (hoje o helper não provê o contexto).
- Unit: por painel — clicar na linha chama `roll` com notação/label certos e abre o
  painel; card de atributo rola E o ✎ ainda abre o editor; RollButton v1 sem
  regressão (suíte existente); ataque nativo consome munição após rolar.
- E2E: axe v2 verde (existente); smoke opcional "clicar perícia abre painel de dados".

## Fora de escopo

Dados 3D (sub-projeto futuro, ver conversa 2026-07-04); rolagem em componentes v1
embrulhados além do listado; mudanças no painel de histórico; rolagem de CA/sentidos/
bônus de proficiência; Etapa B do corte do v1 (segue gated pelo dono).
