# Redesign — CharacterList "Mapa da Campanha"

**Data:** 2026-05-14
**Escopo:** Tela 1 de um redesign visual amplo, tela por tela. Esta spec cobre **somente CharacterList + design tokens compartilhados**. As demais telas (CharacterSheet, modais, Wizard, PrintView) terão specs próprias.

---

## 1. Visão geral

Substituir a tela de Lista de Personagens (atualmente um "Tomo de Heróis" em pergaminho com lista vertical) por um **Mapa da Campanha**: um background ilustrado de mapa fantasy onde cada personagem é um **token** posicionável. Um **painel lateral** mantém uma lista compacta com filtros, e um **toggle Mapa↔Lista** permite alternar entre visão imersiva e visão produtiva quando há muitas fichas.

A direção visual geral do app passa a ser **híbrida moderno-clássica**: base clara off-white, tipografia mista (Inter para UI/dados, EB Garamond para nomes/títulos, IM Fell English SC para rótulos ornamentais), acentos sépia/dourados, e elementos temáticos pontuais (mapa, banners, tokens) em vez de pergaminho pesado em toda parte.

---

## 2. Decisões de produto

| # | Decisão | Justificativa |
|---|---|---|
| 1 | Direção visual: **híbrido moderno-clássico** | Mantém alma D&D sem sacrificar legibilidade. |
| 2 | Estratégia: **redesign tela por tela** | Cada tela vira PR completo, design tokens travam na tela 1. |
| 3 | Tela 1: **CharacterList**, escopo completo (visual + estrutura) | Porta de entrada, menos complexa, e onde os tokens compartilhados nascem. |
| 4 | Conceito: **Mapa da Campanha** com tokens posicionáveis | Resposta direta a "algo marcante com pegada única" — usa metáfora central do D&D. |
| 5 | Avatar do token: **gerado por classe** (silhueta SVG) | Sem necessidade de upload do usuário; cada classe tem ícone visual próprio. |
| 6 | Asset do mapa: **CC0 default + caminho configurável** | Bundle 1 mapa CC0 em `/public/maps/default.webp`, path em uma constante de config. UI de upload fica pós-MVP. |
| 7 | Idioma do dataset (PT/EN): **mantém** o toggle herdado do Bestiário | Não escopo dessa tela. |

---

## 3. Design tokens (compartilhados)

Estes tokens substituem/complementam os atuais em `src/index.css`. Convivem com os tokens de pergaminho existentes durante a transição entre telas — telas ainda não redesenhadas usam os antigos; telas novas usam os abaixo.

### 3.1 Cores

```css
@theme {
  /* === BASE CLARA === */
  --color-bg-canvas:    #faf7f1;  /* fundo de página */
  --color-bg-surface:   #ffffff;  /* cards, painéis */
  --color-bg-elevated:  #f4ead3;  /* destaque suave (chips, hover) */
  --color-bg-overlay:   rgba(15, 10, 5, 0.55); /* atrás de modais */

  /* === TINTA === */
  --color-ink-primary:   #1f1a14; /* texto principal */
  --color-ink-secondary: #6b6356; /* texto meta, descrições */
  --color-ink-muted:     #8a7456; /* texto sutil, captions */
  --color-ink-inverse:   #faf7f1; /* texto sobre fundos escuros */

  /* === SÉPIA (acentos) === */
  --color-accent-50:  #fcf3da;
  --color-accent-100: #f4ead3;
  --color-accent-300: #d6c39f;
  --color-accent-500: #8b6f3a; /* primary accent */
  --color-accent-700: #5a4530;
  --color-accent-900: #2a1f14;

  /* === DOURADO (heroico, usado em tokens, banners, CTAs principais) === */
  --color-gold-400: #d4ad6a;
  --color-gold-500: #b89855;
  --color-gold-700: #6e572b;

  /* === SEMÂNTICAS === */
  --color-blood: #8b0000;   /* selos, indicadores de nível, danger */
  --color-ink-on-map: #2a1f14; /* texto sobre o mapa */

  /* === SUPERFÍCIE ESCURA (quando necessário — banner, sidebar do mapa, modais cinematográficos) === */
  --color-shell-900: #1a1108;
  --color-shell-800: #2a1f14;
  --color-shell-700: #3a2b1c;
  --color-shell-border: #6e572b;
}
```

### 3.2 Tipografia

```css
--font-display: 'IM Fell English SC', 'EB Garamond', serif; /* títulos ornamentais, banner, labels heroicos */
--font-serif:   'EB Garamond', Garamond, serif;             /* nomes de personagens, títulos */
--font-sans:    'Inter', system-ui, -apple-system, sans-serif; /* UI, dados, descrições */
```

| Uso | Família | Tamanho | Peso |
|---|---|---|---|
| Banner heroico | display | 15–22px | 700 |
| Nome de personagem (token, card) | serif | 14–16px | 600 |
| Sub/meta (raça, classe, etc.) | sans | 11–13px | 400 |
| Botões CTA | display | 11–13px | 600, tracking 0.15em, uppercase |
| Body padrão | sans | 14px | 400, line-height 1.5 |
| Captions / labels pequenos | sans | 11px | 500, tracking 0.08em, uppercase |
| Numeração de nível (token) | display | 10–12px | 700, romano |

### 3.3 Espaçamento e raios

Mantém escala Tailwind padrão. Raios: `2px` (pergaminhos, banners), `4px` (botões, inputs), `6px` (cards), `8px` (painéis), `999px` (chips, selos circulares).

### 3.4 Sombras

```css
--shadow-card:     0 2px 4px rgba(31, 26, 20, 0.06), 0 1px 2px rgba(31, 26, 20, 0.04);
--shadow-elevated: 0 4px 12px rgba(31, 26, 20, 0.10), 0 2px 4px rgba(31, 26, 20, 0.06);
--shadow-token:    0 4px 8px rgba(0, 0, 0, 0.5), 0 0 0 2px var(--color-gold-400);
--shadow-banner:   0 3px 10px rgba(0, 0, 0, 0.4);
```

### 3.5 Primitivos compartilhados

Estes ganham componentes próprios em `src/components/ui/` (alguns já existem):

| Primitivo | Arquivo (proposto) | Notas |
|---|---|---|
| `Button` (variants: primary, ghost, gold) | `src/components/ui/Button.jsx` | Já existe diretório `ui/`; estender. |
| `Card` | `src/components/ui/Card.jsx` | Base com sombra suave + borda âmbar leve. |
| `Banner` | `src/components/ui/Banner.jsx` | Header pergaminho com fitas (SVG embutido). |
| `Tooltip` | `src/components/Tooltip.jsx` | Já existe; revisitar estilos. |
| `Chip` | `src/components/ui/Chip.jsx` | Filtros, badges. |

Esta spec **não implementa** todos os primitivos — só os necessários pra CharacterList (Banner, Button gold, Chip, Tooltip). Os demais surgem nas telas seguintes.

---

## 4. CharacterList — anatomia

### 4.1 Layout (desktop ≥ 768px)

```
┌──────────────────────────────────────────────────────────┐
│  TOOLBAR                                                  │ ← 56px alta
│  [⚜ Companhia do Vale]  [▦ Mapa | ≡ Lista]  [⚔ Recrutar] │
├────────────────────────────────────────┬──────────────────┤
│                                        │   SIDEBAR        │
│           MAPA (background)            │   ────────       │
│                                        │   Companhia      │
│   ┌─Banner─┐                  ╱╲       │   ┌────┐         │
│   │⚜ ... ⚜ │              ╱╲ ╱╲╱╲     │   │ ⚔  │ ...      │
│   └────────┘              ╱╲╱  ╲       │   ├────┤         │
│                              ⚔(V)      │   │ ✦  │ ...      │
│                  ✦(VII)                │   ├────┤         │
│     ☩(III)         ╱╲╱╲                │   │ ☩  │ ...      │
│                       ⚜(VI)            │   └────┘         │
│                              ⛪Ruínas   │   + 8 outros     │
│                                        │                  │
│   [escala] [🧭 rosa-dos-ventos]        │                  │
└────────────────────────────────────────┴──────────────────┘
                            ratio: mapa 75% / sidebar 25%
                            sidebar mínima: 240px
```

### 4.2 Layout (mobile < 768px)

- Sidebar vira **drawer** controlado por botão "≡" na toolbar (substitui as tabs Mapa/Lista — vira "abrir lista" + "abrir mapa").
- Mapa ocupa 100% da viewport útil. Sem sidebar lado a lado.
- Tokens mantêm tamanho mínimo de 36×36 (touch target).
- Toolbar colapsa: brand vira ícone, "Recrutar" vira botão circular flutuante (FAB) no canto inferior direito.

### 4.3 Toolbar

| Elemento | Detalhe |
|---|---|
| Brand | "⚜ Companhia do Vale" em `--font-display`, `--color-gold-400` sobre shell escura. |
| View toggle | Botões "▦ Mapa" / "≡ Lista" estilo segmented control, gradiente ouro quando ativo. |
| CTA "⚔ Recrutar" | Botão variant gold (gradiente `--color-gold-400 → --color-gold-700`, texto `--color-shell-900`, display uppercase). |
| Background | `linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))`, borda 1px `--color-shell-border`. |

### 4.4 Mapa

| Elemento | Detalhe |
|---|---|
| Container | `aspect-ratio` controlado; max-height = `100vh - toolbar - padding`. Border 12px com `border-image` simulando moldura de madeira (gradient diagonal sépia). Inset shadow grossa pra dar profundidade. |
| Background | `background-image: url('/maps/default.webp')`. Path lido de `MAP_BACKGROUND_URL` em `src/utils/config.js`. `background-size: cover; background-position: center`. |
| Banner | SVG inline (fitas vermelhas + pergaminho central) no topo, posição `absolute`. Conteúdo: nome da campanha (placeholder "⚜ Companhia do Vale ⚜"). Configurável via `localStorage['dnd-ficha:campaign-name']`. |
| Rosa-dos-ventos | SVG inline canto inferior direito, 78×78px, opacidade 0.85. |
| Escala "léguas" | SVG inline canto inferior esquerdo, decorativo. |

### 4.5 Tokens

| Aspecto | Spec |
|---|---|
| Tamanho | 56×56px (disco) + nome + level badge. Touch-target ≥ 44px. |
| Disco | `radial-gradient` ouro com borda preta + anel dourado externo + sombra projetada (`--shadow-token`). |
| Conteúdo interno | SVG de silhueta da classe (ver §4.6). Inverte cor pra `--color-ink-on-map`. |
| Badge de nível | Disco 22×22 vermelho sangue, número romano em display. Posição: bottom-right do disco principal. |
| Label nome | Faixa abaixo do disco: pergaminho `rgba(255,251,242,0.95)`, borda sépia, `--font-display` 11px, color `--color-ink-primary`. Truncate em 14ch + ellipsis. Mostra nome completo no tooltip. |
| Hover | Disco escala 1.05, translateY -3px, transition 180ms. z-index sobe pra 10. |
| Tooltip (hover/focus) | Painel escuro com nome, raça/classe, HP, CA, última jogada. Posicionamento smart (não sai do viewport). |
| Click | Abre ficha (`onSelect(characterId)`). |
| Drag (desktop) | Pointer drag reposiciona o token. Snap a grid de 8px. Persiste em `character.position`. |
| Long-press (mobile) | Inicia drag. |
| Sem position salva | Auto-place: distribui em "região" baseada na classe (mago perto da torre, ladino perto da floresta, etc.) usando coordenadas hardcoded no mapa default. Ver §6.3. |

### 4.6 Silhuetas por classe

SVGs inline em `src/utils/class-icons.js`. Inspirados no que já existe em `CharacterList.jsx` (`CLASS_ICONS`), mas como path data em vez de glyph emoji.

| Classe | SVG conceito |
|---|---|
| Guerreiro | Espada vertical com guarda larga |
| Mago | Chapéu pontudo com estrela |
| Clérigo | Cruz/símbolo divino com aura |
| Ladino | Duas adagas cruzadas |
| Bárbaro | Machado de duas mãos |
| Bardo | Lira/harpa estilizada |
| Druida | Folha-carvalho dentro de círculo |
| Patrulheiro | Arco com flecha |
| Paladino | Espada apontando pra cima com asas |
| Feiticeiro | Olho com chamas |
| Bruxo | Crânio com pacto |
| Monge | Punho cerrado / círculo zen |
| Fallback (sem classe ou não reconhecida) | Estrela de 6 pontas |

Cada um é um `<svg viewBox="0 0 32 32">` com paths simples (≤ 5 paths/cada). Vai num único módulo exportando `ClassIcon({ classKey, size, color })`.

### 4.7 Sidebar (Companhia)

| Elemento | Detalhe |
|---|---|
| Container | Background `linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))`, borda 1px `--color-shell-border`, padding 12, gap 10. |
| Cabeçalho | "COMPANHIA" em `--font-display`, 11px, letter-spacing 0.18em, color `--color-gold-400`, borda inferior 1px sépia. |
| Filtros (linha de chips) | "Todos" + um chip por classe (ícone SVG mini). Click toggla; ativo = gradiente ouro. |
| Lista | Cada linha: mini-token (26×26) + nome (serif) + meta (sans 10px) + level (romano, gold). Click → seleciona personagem (mesmo que click no token do mapa). Hover → realce sépia translúcido. |
| Cluster overflow | Quando há mais que `N=10` na sidebar visíveis, agrupa o resto em "+ X outros (clique pra expandir)". |
| Scroll | overflow-y auto, scrollbar sépia (já globalmente estilizada). |
| Estado vazio | "Nenhum herói recrutado. Toque em ⚔ Recrutar pra começar." |

### 4.8 View toggle Mapa ↔ Lista

| Modo | Aparência |
|---|---|
| Mapa | (default) — descrito acima. |
| Lista | Mapa some, sidebar expande pra largura total, cada linha vira card horizontal mais espaçoso (estilo V2 do design B), com avatar grande à esquerda, nome+meta no centro, "última jogada" + level à direita. |

A escolha persiste em `localStorage['dnd-ficha:char-list-view']` (`'map' | 'list'`). Default: `'map'` quando há ≤ 8 personagens, `'list'` quando há mais.

### 4.9 Estado vazio (zero personagens)

Mapa com o banner padrão (`CAMPAIGN_NAME_DEFAULT`), sem tokens. Centro do mapa: caixa de texto pergaminho com "Sua história começa aqui. Recrute seu primeiro aventureiro." e botão grande "⚔ Recrutar Aventureiro". CTA do toolbar permanece visível.

### 4.10 Confirmação de delete (mantém o existente, refinado)

Toque longo no token (ou botão "..." no menu de contexto) abre menu: **Abrir / Mover (drag) / Excluir**. Excluir abre confirm-dialog escuro modal: "Riscar Thoradin Pedra-Forte do registro? Esta ação não pode ser desfeita." [Cancelar] [Riscar].

---

## 5. Estrutura de arquivos

```
src/
├─ components/
│  ├─ CharacterList/
│  │  ├─ CharacterList.jsx       (orquestra modos, toolbar, drawer mobile)
│  │  ├─ CharacterMap.jsx        (mapa + tokens + banner + compass)
│  │  ├─ CharacterToken.jsx      (token individual, drag, hover, tooltip)
│  │  ├─ CharacterSidebar.jsx    (lista compacta + filtros)
│  │  ├─ CharacterListView.jsx   (modo lista, cards horizontais)
│  │  ├─ EmptyState.jsx          (zero personagens)
│  │  └─ index.js                (re-export do default)
│  └─ ui/
│     ├─ Banner.jsx              (SVG pergaminho + fitas)
│     ├─ Button.jsx              (variants: primary, ghost, gold)
│     └─ Chip.jsx                (filtros, badges)
├─ utils/
│  ├─ class-icons.js             (SVG paths por classe + componente ClassIcon)
│  ├─ config.js                  (MAP_BACKGROUND_URL, defaults)
│  └─ token-position.js          (auto-place + region defaults + persistence)
├─ index.css                     (estende com novos tokens da §3)
public/
└─ maps/
   └─ default.webp               (mapa CC0 bundlado durante impl)
```

`src/components/CharacterList.jsx` (arquivo único atual) é **deletado**, substituído pelo diretório acima. Import paths externos (`./components/CharacterList`) continuam funcionando via `index.js`.

---

## 6. Mudanças no modelo de dados

### 6.1 Campo novo: `character.position`

```js
character = {
  id: '...',
  info: { name, race, class, level, ... },
  // ...campos existentes...
  position: { x: 0.32, y: 0.58 } | null  // novo, normalizado 0–1
}
```

- `null` → token é auto-posicionado na próxima renderização.
- Persistido em `localStorage` junto com o personagem (storage.js já cuida disso).
- Sem migração necessária — fichas antigas têm `position === undefined` → tratadas como `null`.

### 6.2 Campo novo: `character.lastOpenedAt`

```js
character = {
  // ...
  lastOpenedAt: 1747257600000  // epoch ms
}
```

Atualizado quando `onSelect(id)` é chamado. Usado no view "Lista" e no tooltip.

### 6.3 Auto-placement quando `position == null`

`utils/token-position.js` exporta `getDefaultPosition(character, mapKey)`:

- Tem mapa de regiões hardcoded para `mapKey = 'default'`:
  ```js
  REGIONS_DEFAULT = {
    forest:  { x: 0.18, y: 0.55, r: 0.08 },  // mata
    castle:  { x: 0.50, y: 0.45, r: 0.10 },  // pedra do rei
    tower:   { x: 0.22, y: 0.40, r: 0.06 },  // torre arcana
    ruins:   { x: 0.82, y: 0.65, r: 0.08 },  // ruínas
    village: { x: 0.42, y: 0.80, r: 0.06 },  // aldeia
    port:    { x: 0.80, y: 0.70, r: 0.06 },  // porto
  }
  CLASS_TO_REGION = {
    mago: 'tower', feiticeiro: 'tower', bruxo: 'tower',
    druida: 'forest', patrulheiro: 'forest',
    ladino: 'ruins',
    clerigo: 'castle', paladino: 'castle',
    guerreiro: 'castle', barbaro: 'castle',
    bardo: 'village', monge: 'village',
  }
  ```
- Posição final = centro da região + jitter aleatório bounded por `r`. Determinístico baseado em `character.id` pra que mesma ficha caia sempre no mesmo lugar até o usuário arrastar.
- Quando o usuário arrasta, `position` é salvo e `getDefaultPosition` é ignorado dali em diante.

Se trocarmos o mapa no futuro, basta adicionar um novo `REGIONS_<mapKey>` ou usar uma grid simples como fallback.

---

## 7. Interações detalhadas

### 7.1 Drag-and-drop do token

- `pointerdown` no disco → `setDragging(true)` + offset relativo ao centro do disco.
- `pointermove` (no container do mapa, window listener) → calcula posição normalizada (0–1) pelo bounding rect do mapa.
- `pointerup` → salva `position` no character via `updateCharacter(id, { position })` em `utils/storage.js`. Faz snap a grid de 0.005 (granularidade 0.5% do mapa).
- Visual durante drag: token aumenta scale para 1.1, sombra fica mais forte. Cursor: `grabbing`.
- Mobile: long-press 250ms inicia drag.

### 7.2 Click / tap

- Click curto (não-drag): chama `onSelect(id)`, atualiza `lastOpenedAt`, transita pra ficha.
- Se estiver em modo drag (foi arrastado), o pointerup NÃO conta como click (movimento > 4px).

### 7.3 Hover/focus tooltip

- Trigger: mouse hover 300ms ou keyboard focus (Tab).
- Conteúdo: nome completo (display), raça · classe · subclasse (serif itálico), HP atual/máx + CA (sans), "última jogada: X" (sans itálico ouro).
- Posicionamento: prefere acima do token; se sair do viewport, vai pra baixo/lado.
- Acessibilidade: `aria-describedby` aponta pro tooltip; também acessível por keyboard.

### 7.4 Toggle Mapa ↔ Lista

- Botão segmented control. Click alterna; estado persiste em localStorage.
- Transição: cross-fade 200ms entre modos (não animação complexa).

### 7.5 Filtros da sidebar

- Click no chip "Mago" → filtra tokens **visíveis no mapa** + lista da sidebar.
- Tokens filtrados saem com `opacity: 0; pointer-events: none` (não removidos do DOM, transição 200ms).
- "Todos" (chip default) reseta filtros.

---

## 8. Acessibilidade

- Toda interação por mouse tem equivalente por teclado.
- Tokens são `<button>` com `aria-label="<nome>, <classe>, nível <X>"`.
- Tab order: toolbar → tokens (esquerda → direita, cima → baixo por posição) → sidebar.
- Tooltip também acessível por focus.
- Filtros são `<button aria-pressed>`.
- Mapa em si tem `role="region" aria-label="Mapa da campanha"`.
- Contraste mínimo AA: ouro #b89855 sobre shell #1a1108 = 6.8:1 ✓; ink-primary sobre canvas = 14:1 ✓.
- Modo "Lista" garante que toda info do modo mapa está acessível também aí (fallback total).
- `prefers-reduced-motion`: desativa fade do toggle e bounce no drag.

---

## 9. Performance

- Mapa background: WebP, < 400KB, pré-loaded via `<link rel="preload">` no `index.html`.
- Tokens: SVGs inline (não HTTP requests), memoizados por `classKey + level`.
- Drag: usa `transform: translate(x, y)` (não top/left) pra evitar reflow.
- Lista filtrada: já é client-side, < 1000 personagens não é gargalo.

---

## 10. Testing

Cobertura mínima a entregar (Vitest + RTL):

| Suite | Casos |
|---|---|
| `CharacterMap.test.jsx` | renderiza mapa + tokens; auto-place quando position null; renderiza banner. |
| `CharacterToken.test.jsx` | click → onSelect; drag → atualiza position; hover → tooltip aparece com nome/level. |
| `CharacterSidebar.test.jsx` | filtros por classe; cluster overflow após N+1; click linha → onSelect. |
| `CharacterListView.test.jsx` | modo lista renderiza cards; ordenação por lastOpenedAt desc. |
| `class-icons.test.js` | retorna SVG correto por classe; fallback. |
| `token-position.test.js` | getDefaultPosition determinístico; respeita região da classe. |
| `useViewMode.test.js` (se virar hook) | persiste em localStorage; sync entre abas. |
| E2E `character-list.test.jsx` | fluxo: criar → ver token no mapa → arrastar → reload → token continua na nova posição. |

---

## 11. Asset do mapa

### 11.1 Default bundle

Durante a fase de implementação, escolher um mapa CC0 de **OpenGameArt.org** (categoria "Fantasy Parchment" / "Fantasy World Map"). Critérios:

- Licença CC0 ou CC-BY (com atribuição em `CREDITS.md`).
- Resolução mínima 1920×1280, otimizado para WebP ≤ 500KB.
- Estilo: parchment/aged paper, top-down, sem texto vivo (nomes de lugares ok).
- Sem elementos religiosos/políticos identificáveis.

Salvar em `public/maps/default.webp`. Se necessário, registrar atribuição em `public/maps/CREDITS.md`.

### 11.2 Configuração

```js
// src/utils/config.js
export const MAP_BACKGROUND_URL = '/maps/default.webp'
export const CAMPAIGN_NAME_DEFAULT = '⚜ Companhia do Vale ⚜'
```

Quando o usuário tiver um mapa próprio (Azgaar / comissionado / etc.), basta substituir o arquivo e (se quiser) atualizar `REGIONS_DEFAULT` em `token-position.js`. Não há UI de upload nesta versão.

---

## 12. Fora de escopo (próximas specs)

| Tela | Próxima spec |
|---|---|
| CharacterSheet (8 abas) | spec separada, virá em seguida. |
| Modais (Bestiary, SpellDetail, etc.) | spec separada. |
| CharacterWizard | spec separada — incluirá campo opcional de "região inicial" pra novos personagens. |
| PrintView | revisão mínima, mantém quase tudo. |
| Upload custom de mapa pelo usuário | post-MVP. |
| Múltiplos mapas (biblioteca + settings) | post-MVP. |
| Edição do nome da campanha via UI | aceita-se hardcoded no localStorage por enquanto; UI vem com a tela de Settings (futuro). |

---

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Mapa CC0 escolhido não combina visualmente com tokens. | Validar visual durante implementação; tem 3-4 candidatos avaliados antes de bundlar. |
| Drag não funciona bem em mobile. | Long-press 250ms + feedback visual claro; testar em device. |
| 20+ tokens viram visualmente caóticos. | Toggle "Lista" + cluster na sidebar (cobrem este caso). |
| Mistura visual com telas antigas (CharacterSheet ainda em sépia) cria choque. | Aceitável durante transição tela-por-tela; documentar em CHANGELOG. |
| `character.position` quebra fichas exportadas/importadas. | Tratar undefined como null (já no design). |

---

## 14. Próximos passos

1. Você revisa este doc e me avisa o que mudar.
2. Quando aprovado, invoco `superpowers:writing-plans` pra gerar o plano de execução (tarefas bite-sized + TDD).
3. Implementação tela-por-tela; esta é a tela 1.
