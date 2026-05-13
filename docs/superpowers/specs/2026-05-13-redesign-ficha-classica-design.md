# Redesign: Ficha Clássica D&D (papel envelhecido, livro aberto)

**Data:** 2026-05-13
**Escopo:** Redesign visual completo do dnd-ficha-app
**Objetivo:** Substituir o tema atual ("Pedra e Sangue — brutal fantasy") por uma estética de ficha de papel clássica D&D, em formato de livro aberto, com ornamentação rica e tinta sépia única.

---

## 1. Linguagem visual (tokens)

### Paleta — tinta única sépia, papel envelhecido moderado

| Token | Valor | Uso |
|---|---|---|
| `--parchment-base` | `#e8dcc0` | Cor de fundo do papel |
| `--parchment-shadow` | `#c9b896` | Vincos, dobras, manchas |
| `--parchment-edge` | `#a8956f` | Bordas escurecidas do papel |
| `--ink-primary` | `#2a1f14` | Tinta principal (corpo, títulos) |
| `--ink-secondary` | `#5a4530` | Labels, metadados |
| `--ink-faded` | `#8a7456` | Placeholders, divisórias, texto auxiliar |
| `--gilt` | `#8b6f3a` | Sépia-dourado para detalhes ornamentais (molduras, vinhetas). **Não é cor de destaque** — mantém regra de tinta única. |

**Sombras:** apenas tons quentes `rgba(42,31,20,0.15)` para simular profundidade de papel. Sem `box-shadow` azulado.

### Tipografia — serifada clássica em tudo

- **Corpo e títulos:** EB Garamond (Google Fonts)
- **Drop caps, versaletes, cabeçalhos:** IM Fell English SC (Google Fonts)
- **Sem fontes sans-serif em lugar algum.**
- Tamanhos: corpo 16px, labels 14px (versalete), títulos 22–32px

### Textura

- Background de papel gerado via CSS gradient + SVG sutil (manchas, fibras, dobras leves)
- Sem PNG pesado — gerado em CSS para performance e responsividade
- Bordas das páginas com gradiente mais escuro para simular desgaste

### Centralização

Todos os tokens em `src/index.css` como `:root` custom properties. O tema atual ("Pedra e Sangue") é removido — preserva-se apenas CSS genérico de layout (reset, utilities sem cor).

---

## 2. Primitivas tematizadas

Nova pasta: `src/components/ui/`
Subpasta: `src/components/ui/ornaments/` (SVGs inline reutilizáveis)

### Componentes

| Primitiva | Função | Props principais |
|---|---|---|
| `<BookSpread>` | Layout livro aberto, duas páginas lado a lado em desktop, empilhadas em mobile. Renderiza lombada central. | `spine="left|right|none"` |
| `<Page>` | Página individual com textura de papel, padding generoso, curvatura/sombra. | `side="left|right"` |
| `<OrnateFrame>` | Moldura com 4 vinhetas SVG nos cantos e filete duplo sépia. | `variant="full|simple|cartouche"` |
| `<IlluminatedHeading>` | Título em versalete com filetes duplos acima/abaixo e ornamento central opcional. | `level={1|2|3}` |
| `<DropCap>` | Letra capitular ~3 linhas de altura, opcionalmente em quadrado decorado. | (children: 1 char) |
| `<Cartouche>` | Placa ornamental em formato de escudo/oval para valores importantes (nome, classe, nível, CA). | `shape="shield|oval"` |
| `<Divider>` | Divisória entre seções. | `variant="line|flourish|icon"` |
| `<MarginalIcon>` | Ícone SVG sépia decorativo nas margens externas de uma `<Page>`. | `icon="sword|shield|spell|die|..."` |
| `<InkField>` | Input estilizado como linha de escrita: sublinhado sépia, label em versalete, sem caixa. | (forwarded input props) |
| `<TomeButton>` | Botão sem fundo: texto sépia, filete duplo embaixo, ornamento ao lado. | `variant="primary|secondary|danger"` |

### SVGs ornamentais (~15–20)

- Vinhetas de canto (4 variações)
- Flourishes de divisória (3 variações)
- Frames de drop cap
- Ícones marginais: espada, escudo, livro de magia, dado, taça, pergaminho, runa, coroa
- Todos usam `currentColor` para herdar a tinta do contexto.

### Princípio

Toda ornamentação rica (Seção 1) é encapsulada nessas primitivas. Telas consumidoras não escrevem CSS ornamental — apenas compõem primitivas.

---

## 3. Migração faseada

Cada fase é um checkpoint independente. Usuário revisa e aprova antes da próxima.

### Fase 0 — Fundação

- Adicionar tokens em `src/index.css`
- Importar fontes via Google Fonts
- Criar `src/components/ui/` com as 10 primitivas e `ornaments/` com SVGs
- Remover CSS específico do tema "Pedra e Sangue" de `App.css` (preservar layout genérico)
- **Sem mudança visual nas telas ainda** — só infraestrutura
- Commit + push

### Fase 1 — Ficha do personagem (`src/components/CharacterSheet/`)

Tela de maior valor para o jogador.
- Container principal vira `<BookSpread>`
- **Página esquerda:** identidade (nome em `<Cartouche>`), atributos, perícias, salvamentos
- **Página direita:** combate (HP, CA, ataques), inventário, magias
- Abas internas viram "marcadores de página" (laterais ou topo da spread)
- Modais (`DetailsModal`, `SpellDetailModal`) viram pergaminhos sobrepostos com `<OrnateFrame variant="full">`
- DiceRoller usa `<TomeButton>` e tipografia sépia

### Fase 2 — Lista de personagens (`src/components/CharacterList.jsx`)

- Vira "estante" / "índice do tomo"
- Cada personagem = entrada manuscrita: nome em versalete, classe/raça/nível em itálico, ornamento divisório entre entradas
- Botão "Novo personagem" como `<TomeButton variant="primary">`
- Header com `<IlluminatedHeading level={1}>`

### Fase 3 — Wizard de criação (`src/components/CharacterWizard/`)

Fase mais complexa.
- Cada passo do wizard = uma `<BookSpread>`
- Stepper como "marcadores de capítulo" ornamentados
- Campos com `<InkField>`, escolhas (raça/classe/background) como cards estilo plate com `<OrnateFrame variant="simple">`
- Navegação: botões "Página anterior" / "Próxima página" com ornamentos de seta sépia

### Fase 4 — Modais e auxiliares

`SrdSearchModal`, `DetailsModal`, `SpellDetailModal`, `CantripsGrantPicker`, `TopicList`, `Tooltip`, `FormFieldError`, `PrintView`.
- Modais como pergaminhos com `<OrnateFrame>`
- Tooltips como pequenos cartões sépia
- Erros em itálico (sem cor — apenas peso/estilo, mantendo tinta única)
- `PrintView` recebe versão otimizada para impressão (textura suave, ornamentos reduzidos)

---

## 4. Princípios de execução

- **Não mexer em lógica de domínio** (`src/domain/`), hooks, providers, contexto
- **Não mexer em testes existentes** — se seletor CSS quebrar, ajusta-se o teste
- **Não adicionar testes novos** — é redesign visual, sem novas regras de domínio
- **Commit + push isolados por fase** (respeitando a regra de push automático)
- **Responsividade mobile:** spread vira páginas empilhadas em < 768px; ornamentos reduzem de intensidade
- **Verificação por fase:** rodar `npm run dev`, navegar manualmente pelas telas afetadas, confirmar que nada quebrou funcionalmente. Testes automatizados existentes devem continuar passando.

---

## 5. Decisões / não-objetivos

- **Tinta única:** sem cor vermelha, dourada brilhante ou multi-tinta. `--gilt` é sépia-escuro, usado apenas em SVGs ornamentais, não como destaque de UI.
- **Sem PNG de fundo:** textura gerada em CSS/SVG inline para responsividade e performance.
- **Sem mudança de funcionalidade:** todas as features atuais permanecem; apenas a camada visual muda.
- **`PrintView`** recebe variante simplificada (impressão em papel branco real precisa de menos ornamento).
- **Subagentes para execução:** cada fase pode ser executada por subagente independente, validando-se manualmente após cada uma.
