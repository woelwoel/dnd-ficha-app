# Affordance de botões — design

Data: 2026-08-01
Status: aprovado (abordagem B)

## Problema

No tema escuro (`.theme-v2`), botão não parece botão.

O app tem 411 `<button>`. O padrão dominante do legado é
`border-2 border-parchment-600` (163 ocorrências), que a ponte CSS achata para
`border-color: var(--v2-border-strong)` — **sem preenchimento nenhum**. O
resultado é uma borda de #3a4756 sobre painel #1a222c: contraste ~1.4:1, na
faixa em que o olho lê "desabilitado". Não há `:active`, não há superfície, e
`cursor: pointer` só aparece por default do agente de usuário.

Some-se a isso a ausência de hierarquia: na tela de combate,
`Anterior · Próximo turno · Adicionar monstro · Dano em área · Encerrar` têm
peso visual idêntico, sendo que "Próximo turno" é a ação de 90% dos cliques da
sessão e "Encerrar" é destrutiva.

O caso mais grave é o botão "Adicionar ao combate" do bestiário: é o CTA da
tela, ocupa a largura inteira do painel e, sem fundo, lê como **cabeçalho de
seção**.

## Inventário

Varredura de `src/**/*.jsx` (script em `scripts/scan-buttons.mjs`), classificando
cada `<button>` pelo chrome que já declara:

| Grupo | Qtd | Tratamento |
| --- | --- | --- |
| `bordered` — tem `border-*` | 192 | adoção automática por CSS |
| `filled` — tem `bg-*`, sem borda | 59 | adoção automática por CSS |
| `bare` — nem borda nem fundo | 123 | triagem manual |
| `custom` — `v2-btn`/`v2-tab`/`v2-rollable`/`v2-ability*`/`v2-bottomnav`/`token-coin` | 37 | intocados |

Os 123 `bare` **não são todos botões de verdade**. Entre eles: links sublinhados
(`renomear`, `← Mesas`, "esqueci a senha"), ✕ de fechar modal (`opacity-60`),
cabeçalhos de accordion (`w-full text-left`), o botão flutuante de dados
(`RollButton`) e um toggle desenhado à mão (`w-11 h-6 rounded-full`, em
`FeaturesTab.jsx:413`). Encaixotar esse grupo inteiro pioraria a ficha.

## Abordagem escolhida (B)

Camada de tema por **opt-in**, mais triagem manual do resto.

Descartada a abordagem A (`.theme-v2 button { border; background }` global):
resolve em uma linha, mas transforma ✕, accordions e o toggle em caixinhas.

### 1. Primitivas em `src/theme/tokens.css`

`legacy-bridge.css` é **gerado** por `scripts/gen-bridge.mjs` e não aceita edição
manual, então tudo novo vive em `tokens.css`. Escopo duplo `.theme-v2` /
`.sheet-v2`, como o resto do arquivo.

| Classe | Papel |
| --- | --- |
| `.ui-btn` | superfície `--v2-surface-2`, borda `--v2-border`, radius 8, `min-height: 32px`, `cursor: pointer`; hover eleva borda para `--v2-border-strong`; `:active` desloca 1px; `:focus-visible` com ring do acento; `:disabled` opacidade 0.5 e cursor bloqueado |
| `.ui-btn--primary` | preenchido, texto escuro — **no máximo um por tela**. Dourado (`--v2-warning`) no site, que é a linguagem que o header do Mapa já usa em "Recrutar"; acento-da-classe dentro da ficha, onde o dourado competiria com os avisos |
| `.ui-btn--danger` | borda e texto em `--v2-danger`, preenche no hover |
| `.ui-btn--selected` | lado ligado de um par de alternância (Mapa/Lista); NÃO é dourado, para não competir com o CTA |
| `.ui-btn--quiet` | link de texto: sem caixa, mas com cursor, underline no hover e foco visível |
| `.ui-icon-btn` | botão-ícone: mantém o desenho, ganha alvo de toque de 32px e foco |

### 2. Regra de adoção automática

Uma regra que dá superfície, hover, `:active` e cursor a todo `button` que já se
declara botão por classe de borda ou de fundo, e que **só preenche buraco**:
qualquer utilitário do Tailwind sobrescreve, `bg-transparent` continua
transparente, `border-2` continua com 2px, e a ponte (`!important`) segue acima
de tudo.

O que garante isso é a regra morar em **`@layer components`**, não a
especificidade. A primeira versão usava `:where()` para ficar em `0,0,1`
acreditando que assim perderia dos utilitários — e atropelou todos eles:
`bg-transparent` virou opaco, `rounded-full` virou 8px, `border-2` virou 1px. O
Tailwind v4 emite os utilitários dentro de `@layer utilities`, e **CSS fora de
qualquer layer vence qualquer layer**, independente de especificidade. Truque de
especificidade não resolve cascade layer. `index.css` declara
`theme, base, components, utilities`, então `components` fica exatamente onde
precisa.

Exclusões explícitas: `token-coin` (ficha do mapa, tem borda própria e é arte) e
tudo que casa `[class*="v2-"]`, que já tem chrome.

Além disso, `cursor: pointer` em **todo** `button` do tema. É o que dá
affordance aos 123 nus sem encaixotar nenhum deles.

### 3. Hierarquia

**A hierarquia já estava codificada e não aparecia.** `<Button>` sem `variant`
significava `primary`, e os autores marcaram assim exatamente os CTAs certos —
"Próximo turno", "Rodar combate", "Rolar iniciativa", "Aplicar em N". O que
apagava a intenção era a ponte: `bg-ink-500` (primary) e `border-parchment-600`
(ghost) chegavam no escuro como a **mesma** superfície. Corrigir o primitivo,
portanto, acende a hierarquia das telas de uma vez.

| Tela | Primário | Perigo |
| --- | --- | --- |
| Mesas | Criar mesa · Entrar (um por card) | — |
| Detalhe da mesa | Rodar combate | Apagar mesa · Remover |
| Preparação de combate | Rolar iniciativa | — |
| Bestiário | Adicionar ao combate | — |
| Workspace de combate | Próximo turno | Encerrar · ✕ do combatente |
| Biblioteca de encontros | Salvar / Novo encontro (ramos exclusivos) | — |

Ajustes contra primário indevido, achados na revisão visual:

- **Descanso longo** era primário por omissão. Não é a ação principal da tela de
  combate, tem um irmão de mesmo peso ("Descanso curto") e ainda reescreve a
  ficha de todos — virou `ghost`.
- **Mapa / Lista** usavam `gold` para o lado ligado. Estado de seleção não é
  CTA: os dois dourados competiam com "Recrutar" no mesmo header. Ganharam a
  variante nova `selected` (superfície mais clara, sem dourado).

Ao marcar um botão como `--primary` ou `--danger`, as classes Tailwind de cor
daquele botão são **removidas** do JSX. Deixá-las conviveria com o `!important`
da ponte e a variante perderia. Foi o caso de "Apagar mesa", cujo
`!text-red-700 !border-red-700 hover:!bg-red-50` chegava no escuro como um bloco
avermelhado de texto ilegível.

### 4. Triagem dos 123 `bare`

Todos ganham `cursor: pointer` pela regra global — é o que faltava para o grupo
inteiro sinalizar que responde ao clique, sem encaixotar nada. Além disso:

- **é ação** (executa algo, muda estado) → recebe `.ui-btn`;
- **é navegação/link** (breadcrumb, "renomear", "esqueci a senha") →
  `.ui-btn--quiet`;
- **é ícone de controle** (✕ de fechar, ✕ de remover linha) → `.ui-icon-btn`:
  mantém o desenho, ganha alvo de toque de 32px e `:focus-visible`;
- **é accordion / linha rolável / toggle** → intocado.

O alvo de 32px no ✕ do combatente custou layout: a linha tem `flex-wrap` e os
2rem extras a quebravam em duas. O `min-w` do nome caiu de 8rem para 6rem. Vale
o troco — aquele ✕ é vizinho do campo de dano e clicar nele por engano **remove
o combatente**.

### 5. `Button.jsx`

**Correção ao levantamento inicial:** o componente não está morto. São 49 usos
em 19 arquivos — e justamente nas telas de campanha, mesa e combate do relato. O
grep que dizia "zero imports" estava mal formado.

Isso muda o peso do item: reescrever o primitivo sobre `.ui-btn*` conserta a
maior parte das telas de uma vez. As variantes deixam de carregar utilitários de
cor do Tailwind (que a ponte achatava) e passam a mapear para as classes novas:
`primary`/`gold` → `.ui-btn--primary`, `ghost`/`ghost-dark` → `.ui-btn`, mais
`danger`, `selected` e `quiet`. O default segue `primary`.

Os 411 `<button>` crus **não** são migrados para o componente agora.

## Fora de escopo

- O `<input type="checkbox">` nativo da preparação de combate (quadrado branco
  sólido, destoa do tema escuro). Anotado, não incluído.
- Migrar os `<button>` existentes para o componente `Button`.
- Distância entre CTA e conteúdo em telas largas.

## Verificação

Testes de unidade não enxergam CSS de arquivo importado no jsdom, então a prova
se divide:

- **Testes**: asserções de que os botões certos carregam as classes certas
  (`Próximo turno` com `ui-btn--primary`, `Encerrar` com `ui-btn--danger`),
  e de que os elementos da lista de intocados **não** ganharam `ui-btn`.
- **Visual**: dev server + screenshot antes/depois das 6 telas do relato, mais a
  ficha v2 e o mapa — as duas maiores superfícies de regressão.
- Suíte completa em fatias com `--maxWorkers=2` (a suíte estoura memória sem
  isso).
