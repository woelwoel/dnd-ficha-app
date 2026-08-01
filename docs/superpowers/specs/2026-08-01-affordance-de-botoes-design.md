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
| `.ui-btn--primary` | preenchido no acento com texto escuro — **no máximo um por tela** |
| `.ui-btn--danger` | borda e texto em `--v2-danger`, preenche no hover |
| `.ui-btn--quiet` | link de texto: sem caixa, mas com cursor, underline no hover e foco visível |

### 2. Regra de adoção automática

Uma regra que dá superfície, hover, `:active` e cursor a todo `button` que já se
declara botão por classe de borda ou de fundo:

```css
button:where([class*="border-"], [class*="bg-"]):where(:not(.token-coin), ...)
```

O seletor inteiro fica dentro de `:where()`, de propósito: a especificidade
resultante é `0,0,1`. Consequências desejadas:

- qualquer utilitário do Tailwind (`0,1,0`) sobrescreve — botão que já tem cor
  própria (Dano, Cura) mantém a cor;
- a ponte, que usa `!important`, continua mandando;
- `bg-transparent` continua transparente;
- `.v2-btn` (`0,1,0`) e as demais classes `custom` continuam mandando nas suas.

Ou seja: a regra **só preenche buraco**, nunca disputa.

Exclusões explícitas: `token-coin` (ficha do mapa, tem borda própria e é arte) e
as classes `v2-*` que já têm chrome.

### 3. Hierarquia, aplicada à mão

| Tela | Primário | Perigo |
| --- | --- | --- |
| Mesas | Criar mesa · Entrar | — |
| Detalhe da mesa | Rodar combate | Apagar mesa · Remover |
| Preparação de combate | Rolar iniciativa | — |
| Bestiário | Adicionar ao combate | — |
| Workspace de combate | Próximo turno | Encerrar · ✕ do combatente |
| Ficha v2 | levantado na execução | — |

Ao marcar um botão como `--primary` ou `--danger`, as classes Tailwind de cor
daquele botão são **removidas** do JSX. Deixá-las conviveria com o `!important`
da ponte e a variante perderia.

### 4. Triagem dos 123 `bare`

Regra de decisão, por botão:

- **é ação** (executa algo, muda estado) → recebe `.ui-btn`;
- **é navegação/link** (breadcrumb, "renomear", "esqueci a senha") →
  `.ui-btn--quiet`;
- **é ícone de controle** (✕ de fechar, ✕ de remover linha) → mantém o desenho,
  ganha só `cursor: pointer`, área de toque mínima de 32px e `:focus-visible`;
- **é accordion / linha rolável / toggle** → intocado.

### 5. `Button.jsx`

`src/components/ui/Button.jsx` tem 4 variantes do tema pergaminho e **zero
imports** — está morto. Reescrito sobre `.ui-btn` para que componente novo nasça
certo. Os 411 `<button>` existentes **não** são migrados para ele agora.

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
