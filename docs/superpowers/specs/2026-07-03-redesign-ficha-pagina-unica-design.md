# Redesign da ficha — página única estilo D&D Beyond

**Data:** 2026-07-03
**Status:** aprovado em brainstorming (usuário validou seções 1–4)

## Contexto e objetivo

A tela de ficha atual usa 6 abas de página inteira (Ficha, Magias, Habilidades/Ações,
Inventário, Progressão, Notas). Durante o jogo isso obriga trocas de aba constantes:
perícias e salvaguardas somem quando o jogador está olhando ações ou magias.

O objetivo é um redesign completo da ficha inspirado na página do D&D Beyond:
**tudo em uma página só no desktop**, com um esqueleto fixo sempre visível
(atributos, salvaguardas, perícias) e um **quadro principal com abas internas**
para o conteúdo que alterna (ações, magias, inventário, características, notas).

Este redesign é novo — não aproveita nada do redesign de UI anteriormente abandonado.

## Decisões de design (validadas com o dono)

| Decisão | Escolha |
|---|---|
| Identidade visual | **Nova identidade completa**, direção "App moderno": neutro escuro, denso, limpo, acento de cor por classe. Sem estética de pergaminho/livro. |
| Escopo | **Ficha primeiro**; lista de personagens, wizard, login etc. migram em fases futuras já com o design system novo. Inconsistência temporária entre telas é aceita. |
| Edição vs. jogo | **Jogo por padrão, edição sob demanda**: a ficha é leitura + trackers; editar abre popover/modal ao clicar na seção. Nada de +/− ou selects inline permanentes. |
| Mobile | **Desktop = página única; mobile = navegação por abas na base da tela** (bottom nav), com barra de combate compacta no topo. |
| Progressão | **Painel dedicado** aberto por botão "▲ Nível" no header. Sai do fluxo de jogo. |
| Tema | **Escuro agora**, construído 100% sobre tokens CSS; tema claro é fase futura barata. |
| Layout desktop | **A · Três colunas (Beyond fiel)**: header de personagem + faixa de atributos + corpo em 3 colunas. |

## Estrutura da página (desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: retrato · nome · raça/antecedente · classes (acento) │
│ XP · descansos curto/longo · ▲ Nível · engrenagem · PV+barra │
│ chips: condições ativas · exaustão · inspiração · + Condição │
├──────────────────────────────────────────────────────────────┤
│ FAIXA: FOR DES CON INT SAB CAR  ·  CA  ·  INIT/VEL           │
├──────────────┬───────────────┬───────────────────────────────┤
│ Salvaguardas │ Perícias      │ QUADRO PRINCIPAL (abas):      │
│ Sentidos     │ (18, lista    │ Ações · Magias · Inventário · │
│ Proficiências│  vertical)    │ Características · Notas       │
└──────────────┴───────────────┴───────────────────────────────┘
```

### Header do personagem

Substitui a barra de combate sticky atual e o card "Identidade".

- Retrato (anel na cor de acento da classe), nome, raça/antecedente, classes com
  níveis (ex.: "Artífice 2 · Guerreiro 11"), XP com barra de progresso.
- Botões: Descanso curto, Descanso longo, "▲ Nível" (abre painel de progressão),
  engrenagem (configurações da ficha).
- PV grande com barra colorida; botões rápidos de dano/cura (DamageModal atual).
- Quando PV = 0, o bloco de PV se transforma nos testes de morte (como no Beyond).
- Chips de condições ativas + exaustão (destaque âmbar) + inspiração. Chip
  "+ Condição" abre popover com checklist das condições e stepper de exaustão 0–6.
- Clicar no retrato/nome abre o modal de edição de identidade.

### Faixa de atributos

- 6 cards (sigla, modificador em destaque, valor em chip) + card de CA (com origem,
  ex.: "escudo") + card de Iniciativa/Velocidade.
- Clicar num atributo abre popover de edição (valor, método de pontos, travar).
- CA e iniciativa exibem valor calculado/sugerido; edição manual no popover da CA.

### Coluna 1 — defesa e sentidos

- **Salvaguardas**: 6 linhas com marcador de proficiência (acento) e bônus.
- **Sentidos passivos**: Percepção, Investigação e Intuição passivas (as duas
  últimas são novas; calculadas como 10 + modificador da perícia).
- **Proficiências**: idiomas, armaduras/armas/ferramentas, bônus de proficiência.

### Coluna 2 — perícias

- Lista vertical das 18 perícias: marcador (proficiente/especialista em acento),
  nome, bônus tabular. Marcador de antecedente preservado.
- Leitura pura; engrenagem no título abre o seletor de proficiências atual.

### Coluna 3 — quadro principal (abas internas)

| Aba | Conteúdo | Origem no código atual |
|---|---|---|
| **Ações** | Fusão de ataques + recursos de classe em combate + manobras. Filtros: Todas / Ação / Bônus / Reação / Limitadas. Trackers de uso inline (pills N/N + botão Usar). Espaços de magia compactos. Botão "+ Ataque". | `Attacks`, `CombatClassActions`, `ManeuversPanel`, lógica da visão Combate do `FeaturesTab` |
| **Magias** | Aba de magias atual (espaços, preparadas, truques, concentração, pacto). | `Spells` |
| **Inventário** | Inventário atual com moedas e sintonização. | `Inventory` |
| **Características** | Features de classe/subclasse/raça/talentos com trackers + infusões de artífice. | `FeaturesTab`, `ArtificerInfusionsPanel` |
| **Notas** | Notas livres + traços de antecedente. | `Notes` |

### O que deixa de existir na página

- Card "Magias preparadas" da aba Ficha (o quadro resolve).
- Cards recolhíveis "Fontes de conteúdo" e "Infusões de Artífice" da coluna direita
  (fontes vão pro modal de configurações; infusões vão pra aba Características).
- Navegação lateral de 6 abas no desktop (sobrevive re-estilizada só no mobile).
- Card "Detalhes" (PROF/percepção passiva migram pra coluna 1;
  PV máx/temp migram pro popover do PV; dados de vida aparecem no fluxo de
  descanso — o `RestActions` atual já os exibe e gasta).

## Edição sob demanda — mapa completo

Regra: informação de jogo é sempre leitura; clicar nela abre o editor.

| O quê | Onde edita |
|---|---|
| Atributos | Popover no card do atributo (valor, método, travar) |
| Identidade (nome, raça, sub-raça, classe, antecedente, alinhamento, jogador, retrato, idiomas) | Modal via retrato/nome no header |
| Perícias (proficiência/especialidade) | Engrenagem no título da coluna → seletor atual |
| PV máximo / PV temporário | Popover no bloco de PV |
| Dano / cura / estabilizar | Botões rápidos no header (DamageModal atual) |
| CA / velocidade | Popover no card de CA (manual vs. sugerido) |
| Ataques | Botão "+ Ataque" na aba Ações |
| Condições / exaustão / inspiração | Chips + popover no header |
| Fontes de conteúdo, multiclasse on/off, talentos on/off | Modal de configurações (engrenagem no header) |
| Progressão (level up, multiclasse, escolhas de features) | Painel dedicado via "▲ Nível" |
| Visão do mestre (readOnly) | Editores simplesmente não abrem; trackers desabilitados como hoje |

## Mobile

- Barra de topo compacta: PV + barra, CA, chips de condições, botão de dano/cura.
- **Bottom nav** com 5 itens: `Ficha` (atributos, salvaguardas, sentidos, perícias),
  `Ações`, `Magias`, `Itens`, `Mais` (características, notas, configurações).
- Mesmo conteúdo das abas do desktop; só a moldura muda. Alvos de toque ≥ 44px.
- Breakpoint: página única a partir de `lg` (como o grid atual da aba Ficha).

## Design system

### Tokens

Toda cor vira CSS variable. O remapeamento atual Tailwind→parchment com escala
invertida no `index.css` **não é usado** pelos componentes novos e morre quando o
corte final remover os componentes antigos.

- Superfícies: `--surface-0` (página, #0f141a), `--surface-1` (painel, #1a222c),
  `--surface-2` (elevado/chip, #24313f).
- Bordas: `--border` (#2b3644), `--border-strong`.
- Texto: `--text-1` (#e7edf3), `--text-2` (#8b99a7), `--text-3` (desabilitado).
- Semânticas: `--success`/PV (#58c98c), `--warning` (#e8b04c), `--danger` (#f0908a),
  `--accent` (cor da classe; fallback teal #4fc7ab).
- Contraste AA garantido nos pares token/fundo desde o dia 1 (CI de a11y existente
  deve continuar com zero violações critical/serious).

### Acento por classe

Cada uma das 13 classes (12 PHB + Artífice) tem uma cor de acento definida como
token. Multiclasse usa a classe primária. O acento pinta: marcadores de
proficiência, bônus destacados, aba ativa do quadro, anel do retrato, nome da
classe e botões "Usar". Cores exatas definidas na implementação com validação de
contraste (ex.: Artífice teal, Mago azul, Druida verde, Bárbaro vermelho).

### Tipografia

- Sans-serif única (Inter/system stack), dois pesos (400/600).
- `font-variant-numeric: tabular-nums` em todos os bônus e valores numéricos.
- Sem serifas display; clima de RPG vem do acento por classe e da iconografia.

## Plano técnico

### Princípios

- **Lógica intocada**: `CharacterContext`, updaters, `calc`, `domain/rules`,
  `DamageModal`, `defaultClassFeatureUses`/`resolveFeatureUseList` e todo o motor
  de regras não mudam. O redesign é pele + layout.
- **v2 ao lado do v1**: componentes novos em
  `src/systems/dnd5e/components/CharacterSheet/v2/`, consumindo o mesmo
  `CharacterContext`. Nenhum componente v1 é editado (exceto o ponto de entrada
  que escolhe v1/v2).
- **Toggle temporário**: query param + localStorage (ex.: `?sheetV2=1`) escolhe o
  layout. Permite merge contínuo na master com deploy automático sem afetar
  usuários. No corte final: toggle removido, v1 apagado, v2 vira o único layout.

### Fases internas

1. **Tokens + esqueleto**: arquivo de tokens, header, faixa de atributos, colunas
   1–2, quadro com abas embrulhando os componentes de conteúdo atuais
   (re-tokenizados minimamente).
2. **Popovers de edição**: atributos, PV, CA, condições, identidade, perícias,
   configurações.
3. **Re-skin profundo das abas**: aba Ações (fusão Attacks + CombatClassActions +
   manobras — a maior), depois Magias, Inventário, Características, Notas.
4. **Mobile**: bottom nav + barra compacta.
5. **Corte**: E2E no v2, remoção do toggle e dos componentes v1, morte do
   remapeamento parchment.

### Testes

- Testes de lógica existentes continuam valendo (lógica não muda).
- Novos testes: render do esqueleto, popovers de edição (abrir/editar/fechar),
  chips de condições, troca de abas do quadro, bottom nav mobile, readOnly.
- Axe/a11y nas telas novas (mesmo padrão do CI atual).
- E2E existentes devem passar com o toggle desligado durante todo o desenvolvimento;
  antes do corte, E2E principais rodam também com o toggle ligado.

### Riscos e mitigações

- **Regressão de a11y**: paleta nova validada por contraste antes do merge; axe nos
  testes de componente.
- **Densidade vs. legibilidade**: fontes mínimas de 12px na ficha real (mockups
  usaram 10–11px por serem miniaturas).
- **Aba Ações (fusão)** é a maior superfície de risco funcional: os trackers devem
  continuar usando `featureUses`/`spendFeatureUse` sem duplicar estado.
- **Service worker**: mudanças são de JS/CSS (bundle novo com hash) — não requer
  bump de cache de SRD; se algum JSON de `public/srd-data` mudar, bumpar
  `srd-data-vN` no `vite.config.js`.

## Fora de escopo

- Redesign das outras telas (lista, wizard, login, admin) — fases futuras.
- Tema claro — fase futura sobre os mesmos tokens.
- Cards deslizáveis no mobile.
- Qualquer mudança de regra de D&D 5e ou de modelo de dados do personagem.
  Nada novo precisa ser persistido: condições, inspiração e exaustão já existem
  em `combat`, e os sentidos passivos novos são derivados por cálculo.

## Critérios de sucesso

- No desktop (≥ lg), jogar uma sessão inteira sem trocar de página: perícias,
  salvaguardas e atributos visíveis enquanto qualquer aba do quadro está aberta.
- Nenhuma funcionalidade da ficha atual perdida (paridade completa do mapa acima).
- Zero violações critical/serious de a11y nas telas novas.
- Testes e E2E verdes com toggle off durante o desenvolvimento e com toggle on
  antes do corte.
