# Redesign Ficha Clássica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o tema visual atual ("Pedra e Sangue") por uma estética de ficha de papel clássica D&D — papel sépia envelhecido, tipografia serifada (EB Garamond + IM Fell English SC), layout em livro aberto, ornamentação rica.

**Architecture:** Tokens CSS centralizados em `src/index.css` (Tailwind v4 `@theme`), primitivas React reutilizáveis em `src/components/ui/`, ornamentos SVG inline em `src/components/ui/ornaments/`, migração faseada por tela (Ficha → Lista → Wizard → Modais).

**Tech Stack:** React 19, Tailwind v4, Vite, SVG inline (sem PNG), Google Fonts (EB Garamond, IM Fell English SC).

**Spec:** [docs/superpowers/specs/2026-05-13-redesign-ficha-classica-design.md](../specs/2026-05-13-redesign-ficha-classica-design.md)

**Sem testes automatizados novos:** este é redesign visual. A verificação por tarefa é `npm run dev` + inspeção manual. Os testes existentes (`npm test`) devem continuar passando — se algum quebrar por seletor CSS, ajusta-se o teste, sem mexer na lógica.

**Cada commit é seguido de `git push` (regra global do usuário).**

---

## File Structure

### Criados

- `src/index.css` — substituído (mantém `@import "tailwindcss"`; troca `@theme` para nova paleta; adiciona import de fontes; adiciona keyframes/utilities sépia)
- `src/components/ui/index.js` — barrel export das primitivas
- `src/components/ui/BookSpread.jsx`
- `src/components/ui/Page.jsx`
- `src/components/ui/OrnateFrame.jsx`
- `src/components/ui/IlluminatedHeading.jsx`
- `src/components/ui/DropCap.jsx`
- `src/components/ui/Cartouche.jsx`
- `src/components/ui/Divider.jsx`
- `src/components/ui/MarginalIcon.jsx`
- `src/components/ui/InkField.jsx`
- `src/components/ui/TomeButton.jsx`
- `src/components/ui/ui.module.css` — estilos compartilhados das primitivas (texturas, sombras, gradientes não-Tailwindáveis)
- `src/components/ui/ornaments/index.js` — barrel de SVGs
- `src/components/ui/ornaments/CornerVignette.jsx`
- `src/components/ui/ornaments/Flourish.jsx`
- `src/components/ui/ornaments/MarginIcons.jsx` (espada, escudo, magia, dado, taça, pergaminho, runa, coroa — todos em um arquivo)
- `src/components/ui/ornaments/DropCapFrame.jsx`

### Modificados (Fases 1-4)

- `src/App.css` — limpar restos de "Pedra e Sangue"
- `src/components/CharacterSheet/**` — todos os subcomponentes recebem primitivas
- `src/components/CharacterList.jsx`
- `src/components/CharacterWizard/**`
- `src/components/DetailsModal.jsx`
- `src/components/SpellDetailModal.jsx`
- `src/components/SrdSearchModal.jsx`
- `src/components/CantripsGrantPicker.jsx`
- `src/components/TopicList.jsx`
- `src/components/Tooltip.jsx`
- `src/components/FormFieldError.jsx`
- `src/components/PrintView/**`
- `src/components/DiceRoller/**`

---

# FASE 0 — Fundação

## Task 0.1: Substituir tokens em `src/index.css` (cores, fontes, texturas)

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Ler arquivo atual**

Run: `Read src/index.css` (todo o arquivo, 210 linhas)

- [ ] **Step 2: Substituir o bloco `@theme` e adicionar fontes/utilities**

Substituir todo o conteúdo de `src/index.css` por:

```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IM+Fell+English+SC&display=swap');

/* ── Paleta Ficha Clássica (tinta única sépia, papel envelhecido moderado) ── */
@theme {
  /* Papel (fundos) */
  --color-parchment-50:  #f4ead3;
  --color-parchment-100: #ede0c2;
  --color-parchment-200: #e8dcc0;  /* base */
  --color-parchment-300: #dccaa3;
  --color-parchment-400: #c9b896;  /* shadow */
  --color-parchment-500: #b8a47e;
  --color-parchment-600: #a8956f;  /* edge */
  --color-parchment-700: #8a7456;
  --color-parchment-800: #5a4530;
  --color-parchment-900: #2a1f14;

  /* Tinta (texto) */
  --color-ink-50:  #8a7456;  /* faded */
  --color-ink-100: #6b5640;
  --color-ink-200: #5a4530;  /* secondary */
  --color-ink-300: #4a3826;
  --color-ink-400: #3a2b1c;
  --color-ink-500: #2a1f14;  /* primary */
  --color-ink-600: #1f1610;
  --color-ink-700: #15100a;

  /* Ornamento sépia-dourado escuro (apenas para SVG decorativo) */
  --color-gilt-400: #a88a4a;
  --color-gilt-500: #8b6f3a;
  --color-gilt-600: #6e572b;

  /* Tipografia */
  --font-display: 'IM Fell English SC', 'EB Garamond', serif;
  --font-body: 'EB Garamond', 'Garamond', 'Times New Roman', serif;

  /* Sombras quentes (sem azul) */
  --shadow-parchment-sm: 0 1px 2px rgba(42,31,20,0.10);
  --shadow-parchment:    0 2px 6px rgba(42,31,20,0.15);
  --shadow-parchment-lg: 0 8px 24px rgba(42,31,20,0.25);
}

/* ── Base global ── */
html, body, #root {
  background-color: var(--color-parchment-200);
  color: var(--color-ink-500);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
}

body {
  background-image:
    radial-gradient(ellipse at 20% 15%, rgba(168, 149, 111, 0.18) 0%, transparent 45%),
    radial-gradient(ellipse at 75% 80%, rgba(168, 149, 111, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(201, 184, 150, 0.10) 0%, transparent 70%);
  background-attachment: fixed;
  min-height: 100vh;
}

/* Versalete para labels e títulos pequenos */
.font-display {
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}

/* Itálico de tinta para texto secundário */
.ink-italic {
  font-style: italic;
  color: var(--color-ink-200);
}

/* Filete duplo (borda dupla sépia) */
.rule-double {
  border-top: 1px solid var(--color-ink-200);
  box-shadow: 0 3px 0 -2px var(--color-ink-200);
}
.rule-double-b {
  border-bottom: 1px solid var(--color-ink-200);
  box-shadow: 0 -3px 0 -2px var(--color-ink-200) inset;
}

/* Foco visível mantido (acessibilidade) — sépia em vez de azul */
*:focus-visible {
  outline: 2px solid var(--color-ink-200);
  outline-offset: 2px;
}

/* Scrollbar sépia */
* {
  scrollbar-color: var(--color-parchment-600) var(--color-parchment-100);
}
```

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Abrir o navegador. Esperado: fundo bege, texto serifado em sépia escuro. Telas vão parecer "quebradas" temporariamente (classes Tailwind antigas com cores `gray-*`, `amber-*` etc. agora mapeiam para nada útil) — isso é esperado e será resolvido nas próximas fases.

- [ ] **Step 4: Rodar testes existentes**

Run: `npm test`
Expected: todos passam (mudança de CSS não afeta lógica).

- [ ] **Step 5: Commit + push**

```bash
git add src/index.css
git commit -m "feat(redesign): substitui paleta por tema ficha clássica (sépia)"
git push origin HEAD
```

---

## Task 0.2: Limpar `src/App.css`

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Ler arquivo**

Run: `Read src/App.css`

- [ ] **Step 2: Reescrever apenas com layout genérico**

Substituir conteúdo por:

```css
/* Layout genérico — sem cores temáticas. Tudo de cor vem dos tokens em index.css. */
#root {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

@media (max-width: 768px) {
  #root {
    padding: 0.5rem;
  }
}
```

- [ ] **Step 3: Commit + push**

```bash
git add src/App.css
git commit -m "chore(redesign): limpa App.css do tema antigo"
git push origin HEAD
```

---

## Task 0.3: Criar SVGs ornamentais

**Files:**
- Create: `src/components/ui/ornaments/CornerVignette.jsx`
- Create: `src/components/ui/ornaments/Flourish.jsx`
- Create: `src/components/ui/ornaments/MarginIcons.jsx`
- Create: `src/components/ui/ornaments/DropCapFrame.jsx`
- Create: `src/components/ui/ornaments/index.js`

- [ ] **Step 1: CornerVignette.jsx**

```jsx
export default function CornerVignette({ size = 48, className = '', rotate = 0 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, color: 'var(--color-gilt-500)' }}
      aria-hidden="true"
    >
      <path
        d="M2 2 L2 14 M2 2 L14 2 M2 2 Q12 6 14 14 Q22 12 26 4 Q20 14 28 18 Q36 14 40 6"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="14" cy="14" r="1.2" fill="currentColor" />
      <circle cx="26" cy="4" r="0.9" fill="currentColor" />
      <path
        d="M6 6 L10 10 M10 6 L6 10"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Flourish.jsx (divisória ornamentada)**

```jsx
export default function Flourish({ width = 200, className = '' }) {
  return (
    <svg
      width={width}
      height="24"
      viewBox="0 0 200 24"
      className={className}
      style={{ color: 'var(--color-gilt-500)' }}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M10 12 L80 12 Q90 12 92 8 Q95 4 100 12 Q105 20 108 8 Q110 12 120 12 L190 12"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="100" cy="12" r="2" fill="currentColor" />
      <path
        d="M85 12 Q80 6 75 12 M115 12 Q120 6 125 12"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}
```

- [ ] **Step 3: MarginIcons.jsx (8 ícones em um arquivo, todos exportados)**

```jsx
const baseProps = {
  width: 32,
  height: 32,
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style: { color: 'var(--color-gilt-500)' },
};

export const SwordIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 4 L16 22 M12 22 L20 22 M14 24 L18 24 M16 24 L16 28 M13 6 L19 6" />
  </svg>
);
export const ShieldIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 4 L26 8 L26 16 Q26 24 16 28 Q6 24 6 16 L6 8 Z M16 10 L16 22 M10 16 L22 16" />
  </svg>
);
export const SpellIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 4 L18 12 L26 14 L18 16 L16 24 L14 16 L6 14 L14 12 Z" />
    <circle cx="16" cy="14" r="2" />
  </svg>
);
export const DieIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 3 L28 10 L28 22 L16 29 L4 22 L4 10 Z M16 3 L16 16 M4 10 L16 16 L28 10" />
  </svg>
);
export const ChaliceIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M8 4 L24 4 L22 14 Q16 20 10 14 Z M16 14 L16 24 M10 28 L22 28 M16 24 L16 28" />
  </svg>
);
export const ScrollIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M6 8 Q6 4 10 4 L24 4 Q28 4 28 8 L28 24 Q28 28 24 28 L8 28 Q4 28 4 24 L4 20 L8 20" />
    <path d="M12 10 L22 10 M12 14 L22 14 M12 18 L20 18" />
  </svg>
);
export const RuneIcon = (p) => (
  <svg {...baseProps} {...p}>
    <circle cx="16" cy="16" r="11" />
    <path d="M12 10 L20 22 M20 10 L12 22 M10 16 L22 16" />
  </svg>
);
export const CrownIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M4 22 L6 10 L12 16 L16 6 L20 16 L26 10 L28 22 Z M4 26 L28 26" />
    <circle cx="6" cy="10" r="1" />
    <circle cx="16" cy="6" r="1" />
    <circle cx="26" cy="10" r="1" />
  </svg>
);
```

- [ ] **Step 4: DropCapFrame.jsx**

```jsx
export default function DropCapFrame({ children, className = '' }) {
  return (
    <span
      className={className}
      style={{
        float: 'left',
        fontFamily: 'var(--font-display)',
        fontSize: '3.5em',
        lineHeight: 0.9,
        padding: '0.1em 0.15em 0 0',
        marginRight: '0.08em',
        color: 'var(--color-ink-500)',
      }}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: index.js (barrel)**

```js
export { default as CornerVignette } from './CornerVignette.jsx';
export { default as Flourish } from './Flourish.jsx';
export { default as DropCapFrame } from './DropCapFrame.jsx';
export {
  SwordIcon, ShieldIcon, SpellIcon, DieIcon,
  ChaliceIcon, ScrollIcon, RuneIcon, CrownIcon,
} from './MarginIcons.jsx';
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: build completa sem erro.

- [ ] **Step 7: Commit + push**

```bash
git add src/components/ui/ornaments/
git commit -m "feat(redesign): adiciona SVGs ornamentais (vinhetas, flourish, ícones, drop cap)"
git push origin HEAD
```

---

## Task 0.4: Primitivas — `BookSpread`, `Page`, `Divider`, `IlluminatedHeading`

**Files:**
- Create: `src/components/ui/ui.module.css`
- Create: `src/components/ui/BookSpread.jsx`
- Create: `src/components/ui/Page.jsx`
- Create: `src/components/ui/Divider.jsx`
- Create: `src/components/ui/IlluminatedHeading.jsx`

- [ ] **Step 1: ui.module.css**

```css
/* Layout livro aberto */
.spread {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  background: linear-gradient(
    to right,
    var(--color-parchment-200) 0%,
    var(--color-parchment-300) 49%,
    var(--color-parchment-400) 50%,
    var(--color-parchment-300) 51%,
    var(--color-parchment-200) 100%
  );
  border-radius: 6px;
  box-shadow: var(--shadow-parchment-lg);
  position: relative;
  min-height: 600px;
}
.spread::before, .spread::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  width: 12px;
  pointer-events: none;
}
.spread::before {
  left: 0;
  background: linear-gradient(to right, var(--color-parchment-600), transparent);
  border-radius: 6px 0 0 6px;
}
.spread::after {
  right: 0;
  background: linear-gradient(to left, var(--color-parchment-600), transparent);
  border-radius: 0 6px 6px 0;
}
@media (max-width: 768px) {
  .spread {
    grid-template-columns: 1fr;
    background: var(--color-parchment-200);
  }
  .spread::before, .spread::after { display: none; }
}

/* Página individual */
.page {
  padding: 3rem 2.5rem;
  position: relative;
  background-image:
    radial-gradient(circle at 15% 25%, rgba(168, 149, 111, 0.10) 0%, transparent 30%),
    radial-gradient(circle at 80% 70%, rgba(168, 149, 111, 0.08) 0%, transparent 35%);
  min-height: 100%;
}
.pageLeft {
  border-right: 1px solid var(--color-parchment-500);
  box-shadow: inset -8px 0 12px -6px rgba(42,31,20,0.18);
}
.pageRight {
  border-left: 1px solid var(--color-parchment-500);
  box-shadow: inset 8px 0 12px -6px rgba(42,31,20,0.18);
}
@media (max-width: 768px) {
  .page { padding: 1.5rem 1rem; box-shadow: none; border: none; }
}

/* Heading iluminado */
.headingWrap {
  text-align: center;
  margin: 1.5rem 0;
}
.headingText {
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  color: var(--color-ink-500);
  display: inline-block;
  padding: 0 1rem;
}
.headingL1 { font-size: 2rem; }
.headingL2 { font-size: 1.5rem; }
.headingL3 { font-size: 1.15rem; }
.headingRule {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.headingLine {
  flex: 1;
  height: 0;
  border-top: 1px solid var(--color-ink-200);
  box-shadow: 0 3px 0 -2px var(--color-ink-200);
  max-width: 280px;
}

/* Divider */
.dividerLine {
  border: 0;
  border-top: 1px solid var(--color-ink-200);
  box-shadow: 0 3px 0 -2px var(--color-ink-200);
  margin: 1.25rem 0;
}
.dividerFlourish {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
}
```

- [ ] **Step 2: BookSpread.jsx**

```jsx
import styles from './ui.module.css';

export default function BookSpread({ children, className = '' }) {
  return <div className={`${styles.spread} ${className}`}>{children}</div>;
}
```

- [ ] **Step 3: Page.jsx**

```jsx
import styles from './ui.module.css';

export default function Page({ side = 'left', children, className = '' }) {
  const sideClass = side === 'right' ? styles.pageRight : styles.pageLeft;
  return <div className={`${styles.page} ${sideClass} ${className}`}>{children}</div>;
}
```

- [ ] **Step 4: IlluminatedHeading.jsx**

```jsx
import styles from './ui.module.css';

const levelClass = { 1: styles.headingL1, 2: styles.headingL2, 3: styles.headingL3 };

export default function IlluminatedHeading({ level = 2, children, className = '' }) {
  const Tag = `h${level}`;
  return (
    <div className={`${styles.headingWrap} ${className}`}>
      <div className={styles.headingRule}>
        <span className={styles.headingLine} />
        <Tag className={`${styles.headingText} ${levelClass[level]}`}>{children}</Tag>
        <span className={styles.headingLine} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Divider.jsx**

```jsx
import styles from './ui.module.css';
import { Flourish } from './ornaments/index.js';

export default function Divider({ variant = 'line', className = '' }) {
  if (variant === 'flourish' || variant === 'icon') {
    return (
      <div className={`${styles.dividerFlourish} ${className}`}>
        <Flourish width={220} />
      </div>
    );
  }
  return <hr className={`${styles.dividerLine} ${className}`} />;
}
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: build completa sem erro.

- [ ] **Step 7: Commit + push**

```bash
git add src/components/ui/
git commit -m "feat(redesign): primitivas BookSpread, Page, IlluminatedHeading, Divider"
git push origin HEAD
```

---

## Task 0.5: Primitivas — `OrnateFrame`, `Cartouche`, `DropCap`, `MarginalIcon`

**Files:**
- Modify: `src/components/ui/ui.module.css` (acrescentar)
- Create: `src/components/ui/OrnateFrame.jsx`
- Create: `src/components/ui/Cartouche.jsx`
- Create: `src/components/ui/DropCap.jsx`
- Create: `src/components/ui/MarginalIcon.jsx`

- [ ] **Step 1: Acrescentar ao final de `ui.module.css`**

```css
.frame {
  position: relative;
  border: 1px solid var(--color-ink-200);
  box-shadow:
    0 0 0 2px var(--color-parchment-200) inset,
    0 0 0 3px var(--color-ink-200) inset;
  padding: 1.5rem;
  background: var(--color-parchment-100);
}
.frameSimple {
  border: 1px solid var(--color-ink-200);
  padding: 1.25rem;
  background: var(--color-parchment-100);
}
.frameCartouche {
  display: inline-block;
  padding: 0.75rem 2.5rem;
  background: var(--color-parchment-100);
  border: 1px solid var(--color-ink-200);
  border-radius: 999px;
  box-shadow: 0 0 0 3px var(--color-parchment-200), 0 0 0 4px var(--color-ink-200);
  position: relative;
}
.frameCorner {
  position: absolute;
  width: 48px; height: 48px;
}
.frameCornerTL { top: -10px; left: -10px; }
.frameCornerTR { top: -10px; right: -10px; }
.frameCornerBL { bottom: -10px; left: -10px; }
.frameCornerBR { bottom: -10px; right: -10px; }

.cartoucheShield {
  display: inline-block;
  padding: 0.6rem 2rem;
  background: var(--color-parchment-100);
  border: 1px solid var(--color-ink-200);
  clip-path: polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%);
  text-align: center;
}
.cartoucheOval {
  display: inline-block;
  padding: 0.6rem 2.5rem;
  background: var(--color-parchment-100);
  border: 1px solid var(--color-ink-200);
  border-radius: 999px;
  text-align: center;
}

.marginalIcon {
  position: absolute;
  opacity: 0.65;
  pointer-events: none;
}
.marginalLeft { left: -1.5rem; }
.marginalRight { right: -1.5rem; }
```

- [ ] **Step 2: OrnateFrame.jsx**

```jsx
import styles from './ui.module.css';
import { CornerVignette } from './ornaments/index.js';

export default function OrnateFrame({ variant = 'full', children, className = '' }) {
  if (variant === 'simple') {
    return <div className={`${styles.frameSimple} ${className}`}>{children}</div>;
  }
  if (variant === 'cartouche') {
    return <div className={`${styles.frameCartouche} ${className}`}>{children}</div>;
  }
  return (
    <div className={`${styles.frame} ${className}`}>
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerTL}`} rotate={0} />
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerTR}`} rotate={90} />
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerBR}`} rotate={180} />
      <CornerVignette size={48} className={`${styles.frameCorner} ${styles.frameCornerBL}`} rotate={270} />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Cartouche.jsx**

```jsx
import styles from './ui.module.css';

export default function Cartouche({ shape = 'oval', children, className = '' }) {
  const cls = shape === 'shield' ? styles.cartoucheShield : styles.cartoucheOval;
  return <div className={`${cls} ${className}`}>{children}</div>;
}
```

- [ ] **Step 4: DropCap.jsx**

```jsx
import { DropCapFrame } from './ornaments/index.js';

export default function DropCap({ children, className = '' }) {
  const letter = typeof children === 'string' ? children.charAt(0).toUpperCase() : children;
  return <DropCapFrame className={className}>{letter}</DropCapFrame>;
}
```

- [ ] **Step 5: MarginalIcon.jsx**

```jsx
import styles from './ui.module.css';
import * as Icons from './ornaments/index.js';

const map = {
  sword: Icons.SwordIcon,
  shield: Icons.ShieldIcon,
  spell: Icons.SpellIcon,
  die: Icons.DieIcon,
  chalice: Icons.ChaliceIcon,
  scroll: Icons.ScrollIcon,
  rune: Icons.RuneIcon,
  crown: Icons.CrownIcon,
};

export default function MarginalIcon({ icon = 'sword', side = 'left', top = '1rem', size = 32 }) {
  const Cmp = map[icon] || Icons.SwordIcon;
  const sideCls = side === 'right' ? styles.marginalRight : styles.marginalLeft;
  return (
    <div className={`${styles.marginalIcon} ${sideCls}`} style={{ top }}>
      <Cmp width={size} height={size} />
    </div>
  );
}
```

- [ ] **Step 6: Commit + push**

```bash
git add src/components/ui/
git commit -m "feat(redesign): primitivas OrnateFrame, Cartouche, DropCap, MarginalIcon"
git push origin HEAD
```

---

## Task 0.6: Primitivas — `InkField`, `TomeButton` + barrel `index.js`

**Files:**
- Modify: `src/components/ui/ui.module.css` (acrescentar)
- Create: `src/components/ui/InkField.jsx`
- Create: `src/components/ui/TomeButton.jsx`
- Create: `src/components/ui/index.js`

- [ ] **Step 1: Acrescentar ao `ui.module.css`**

```css
.inkField {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.75rem 0;
}
.inkLabel {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  color: var(--color-ink-200);
}
.inkInput {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-ink-500);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-ink-200);
  padding: 0.35rem 0.25rem;
  outline: none;
  transition: border-color 120ms, box-shadow 120ms;
}
.inkInput:focus {
  border-bottom-color: var(--color-ink-500);
  box-shadow: 0 2px 0 -1px var(--color-ink-500);
}
.inkInput::placeholder {
  color: var(--color-ink-50);
  font-style: italic;
}

.tomeBtn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: transparent;
  border: none;
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: var(--color-ink-500);
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  position: relative;
}
.tomeBtn::after {
  content: '';
  position: absolute;
  left: 10%; right: 10%; bottom: 0;
  border-top: 1px solid var(--color-ink-500);
  box-shadow: 0 3px 0 -2px var(--color-ink-500);
  transition: left 160ms, right 160ms;
}
.tomeBtn:hover::after { left: 0; right: 0; }
.tomeBtn:disabled { color: var(--color-ink-50); cursor: not-allowed; }
.tomeBtn:disabled::after { border-top-color: var(--color-ink-50); box-shadow: 0 3px 0 -2px var(--color-ink-50); }

.tomeBtnPrimary { font-weight: 600; }
.tomeBtnDanger  { font-style: italic; }
```

- [ ] **Step 2: InkField.jsx**

```jsx
import { forwardRef, useId } from 'react';
import styles from './ui.module.css';

const InkField = forwardRef(function InkField(
  { label, type = 'text', className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`${styles.inkField} ${className}`}>
      {label && <label className={styles.inkLabel} htmlFor={inputId}>{label}</label>}
      <input ref={ref} id={inputId} type={type} className={styles.inkInput} {...rest} />
    </div>
  );
});

export default InkField;
```

- [ ] **Step 3: TomeButton.jsx**

```jsx
import styles from './ui.module.css';

const variantClass = {
  primary: styles.tomeBtnPrimary,
  secondary: '',
  danger: styles.tomeBtnDanger,
};

export default function TomeButton({
  variant = 'secondary',
  type = 'button',
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`${styles.tomeBtn} ${variantClass[variant] || ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: index.js (barrel da pasta `ui/`)**

```js
export { default as BookSpread } from './BookSpread.jsx';
export { default as Page } from './Page.jsx';
export { default as OrnateFrame } from './OrnateFrame.jsx';
export { default as IlluminatedHeading } from './IlluminatedHeading.jsx';
export { default as DropCap } from './DropCap.jsx';
export { default as Cartouche } from './Cartouche.jsx';
export { default as Divider } from './Divider.jsx';
export { default as MarginalIcon } from './MarginalIcon.jsx';
export { default as InkField } from './InkField.jsx';
export { default as TomeButton } from './TomeButton.jsx';
export * as Ornaments from './ornaments/index.js';
```

- [ ] **Step 5: Verificar build e testes**

Run: `npm run build && npm test`
Expected: build OK, testes existentes passam.

- [ ] **Step 6: Commit + push**

```bash
git add src/components/ui/
git commit -m "feat(redesign): primitivas InkField, TomeButton + barrel ui/index.js"
git push origin HEAD
```

---

# FASE 1 — Ficha do Personagem

## Task 1.1: Inspecionar e mapear a estrutura atual

**Files:**
- Read-only: `src/components/CharacterSheet/`

- [ ] **Step 1: Listar arquivos**

Run: `Glob src/components/CharacterSheet/**/*.jsx`

- [ ] **Step 2: Ler container principal**

Run: `Read src/components/CharacterSheet/index.jsx` (ou o arquivo principal — descobrir nome real)

- [ ] **Step 3: Identificar e anotar**

Anotar em um comentário temporário (não commitado) ou mentalmente:
- Qual o componente raiz?
- Quais subcomponentes existem (atributos, perícias, combate, inventário, magias)?
- Como as abas atuais funcionam (`HabilitiesTab`, `FeaturesTab` etc.)?

Nenhuma mudança ainda. Sem commit.

---

## Task 1.2: Wrapper `BookSpread` no container da ficha + página esquerda (identidade + atributos)

**Files:**
- Modify: `src/components/CharacterSheet/<container>.jsx` (descoberto na Task 1.1)
- Modify: subcomponentes da página esquerda (identidade, atributos, perícias, salvamentos)

- [ ] **Step 1: Envolver layout principal em `<BookSpread>` com duas `<Page>`**

Estrutura alvo:

```jsx
import { BookSpread, Page, IlluminatedHeading, Cartouche, Divider, MarginalIcon } from '../ui';

<BookSpread>
  <Page side="left">
    <MarginalIcon icon="shield" side="left" top="2rem" />
    <Cartouche shape="shield">
      <span className="font-display" style={{ fontSize: '1.4rem' }}>{character.name}</span>
    </Cartouche>
    <IlluminatedHeading level={2}>Atributos</IlluminatedHeading>
    {/* render atributos atuais */}
    <Divider variant="flourish" />
    <IlluminatedHeading level={2}>Perícias</IlluminatedHeading>
    {/* perícias */}
    <Divider variant="flourish" />
    <IlluminatedHeading level={2}>Salvamentos</IlluminatedHeading>
    {/* salvamentos */}
  </Page>

  <Page side="right">
    {/* preenchido na Task 1.3 */}
  </Page>
</BookSpread>
```

- [ ] **Step 2: Substituir classes Tailwind antigas dos atributos/perícias/salvamentos**

Onde houver `text-amber-*`, `text-gray-*`, `bg-gray-*` etc., trocar por:
- Texto principal: removido (herda de `body`)
- Texto secundário: `text-ink-200` ou classe `ink-italic`
- Fundos de cards internos: `bg-parchment-100` (ou remover, deixar transparente sobre a página)
- Bordas: `border-ink-200` ou usar `<OrnateFrame variant="simple">`
- Títulos de bloco interno: `font-display`

Não mudar nenhuma lógica de cálculo, hooks ou props passadas.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Abrir a ficha de um personagem existente. Esperado: vê-se o spread de livro com a página esquerda preenchida com identidade, atributos, perícias, salvamentos em sépia. Página direita ainda vazia ou mostrando placeholders.

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: passam. Se algum teste falhar por seletor de classe, ajustar o seletor (ex: trocar `getByClassName('text-amber-500')` por um seletor por texto/role).

- [ ] **Step 5: Commit + push**

```bash
git add src/components/CharacterSheet/
git commit -m "feat(redesign): ficha — página esquerda (identidade, atributos, perícias)"
git push origin HEAD
```

---

## Task 1.3: Página direita (combate, inventário, magias)

**Files:**
- Modify: `src/components/CharacterSheet/<container>.jsx`
- Modify: subcomponentes de combate, inventário, magias

- [ ] **Step 1: Preencher `<Page side="right">`**

```jsx
<Page side="right">
  <MarginalIcon icon="sword" side="right" top="2rem" />
  <IlluminatedHeading level={2}>Combate</IlluminatedHeading>
  {/* CA em <Cartouche shape="oval">, HP atual/máximo, iniciativa, ataques */}
  <Divider variant="flourish" />
  <IlluminatedHeading level={2}>Inventário</IlluminatedHeading>
  {/* lista de itens, peso, moedas */}
  <Divider variant="flourish" />
  <IlluminatedHeading level={2}>Magias</IlluminatedHeading>
  {/* slots, lista de magias preparadas — se aplicável à classe */}
</Page>
```

- [ ] **Step 2: Substituir classes Tailwind antigas dos subcomponentes**

Mesma diretriz da Task 1.2 Step 2. Para valores numéricos em destaque (CA, HP), usar `<Cartouche shape="oval">`.

- [ ] **Step 3: Substituir botões de ação por `<TomeButton>`**

Botões "Rolar dano", "Adicionar item", "Lançar magia" etc. viram `<TomeButton variant="primary">` ou `secondary`. "Excluir item" → `variant="danger"`.

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`
Abrir ficha. Esperado: spread completo, livro aberto com identidade à esquerda e combate/inventário/magias à direita.

- [ ] **Step 5: Rodar testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 6: Commit + push**

```bash
git add src/components/CharacterSheet/
git commit -m "feat(redesign): ficha — página direita (combate, inventário, magias)"
git push origin HEAD
```

---

## Task 1.4: Abas internas viram "marcadores de página"

**Files:**
- Modify: arquivos de abas internas em `CharacterSheet/` (ex: `HabilitiesTab.jsx`, `FeaturesTab.jsx`, navegação de abas)

- [ ] **Step 1: Reestilizar barra de abas**

Substituir CSS atual da nav de abas por estilo "marcadores":
- Cada aba é uma pequena "guia" de papel saindo do topo (ou lateral) do spread
- Aba ativa: fundo `parchment-100`, borda `ink-200`, texto `font-display` em `ink-500`
- Aba inativa: fundo `parchment-300`, texto `ink-200`, opacidade 0.8
- Sem cores Tailwind antigas

Estrutura sugerida (CSS pode ir em `ui.module.css` se a estética for útil em outros lugares; senão inline ou em CSS local da aba):

```jsx
<nav className="flex gap-1 -mb-px px-4">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`font-display px-4 py-2 border border-ink-200 rounded-t-md ${
        activeTab === tab.id ? 'bg-parchment-100' : 'bg-parchment-300 opacity-80'
      }`}
    >
      {tab.label}
    </button>
  ))}
</nav>
```

- [ ] **Step 2: Conteúdo das abas usa primitivas**

Em `HabilitiesTab.jsx` e `FeaturesTab.jsx`, substituir os títulos de seção interna por `<IlluminatedHeading level={3}>`, divisórias por `<Divider>`, blocos descritivos podem usar `<OrnateFrame variant="simple">` quando o conteúdo for uma "característica" destacada.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Esperado: abas parecem marcadores de papel; conteúdo das abas em sépia coerente com o resto.

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/CharacterSheet/
git commit -m "feat(redesign): abas da ficha viram marcadores de página"
git push origin HEAD
```

---

## Task 1.5: DiceRoller tematizado

**Files:**
- Modify: `src/components/DiceRoller/**`

- [ ] **Step 1: Inspecionar**

Run: `Glob src/components/DiceRoller/**`
Run: `Read` no componente principal.

- [ ] **Step 2: Substituir botões por `<TomeButton>` e classes antigas**

- Botões de rolagem → `<TomeButton>` com ícone `<DieIcon>` lateral via `Ornaments.DieIcon`
- Resultados em destaque → `<Cartouche shape="oval">` para o número final
- Histórico em fonte serifada, `text-ink-200` para entradas antigas

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Rolar um dado. Esperado: visual coerente, resultado destacado em cartouche, sem cores antigas.

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/DiceRoller/
git commit -m "feat(redesign): DiceRoller tematizado (TomeButton, Cartouche, ícones)"
git push origin HEAD
```

---

# FASE 2 — Lista de Personagens

## Task 2.1: `CharacterList` como "índice do tomo"

**Files:**
- Modify: `src/components/CharacterList.jsx`

- [ ] **Step 1: Ler arquivo**

Run: `Read src/components/CharacterList.jsx`

- [ ] **Step 2: Reescrever JSX para usar primitivas**

Estrutura alvo:

```jsx
import { BookSpread, Page, IlluminatedHeading, Divider, TomeButton, Cartouche } from './ui';
import { ScrollIcon } from './ui/ornaments/index.js';

return (
  <BookSpread>
    <Page side="left">
      <IlluminatedHeading level={1}>Crônica dos Heróis</IlluminatedHeading>
      <p className="ink-italic text-center">
        Página onde se registram aqueles que ousaram trilhar reinos esquecidos.
      </p>
      <Divider variant="flourish" />
      <div className="flex justify-center">
        <TomeButton variant="primary" onClick={onCreateNew}>
          <ScrollIcon width={20} height={20} /> Forjar novo herói
        </TomeButton>
      </div>
    </Page>

    <Page side="right">
      <IlluminatedHeading level={2}>Heróis Registrados</IlluminatedHeading>
      {characters.length === 0 ? (
        <p className="ink-italic text-center">Ainda não há heróis nesta crônica.</p>
      ) : (
        <ul className="space-y-2">
          {characters.map((c, i) => (
            <li key={c.id}>
              {i > 0 && <Divider variant="line" />}
              <button
                onClick={() => onSelect(c.id)}
                className="w-full text-left py-3 px-2 hover:bg-parchment-100 rounded"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-lg">{c.name}</span>
                  <span className="ink-italic text-sm">
                    {c.race} {c.class}, nível {c.level}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  </BookSpread>
);
```

Adaptar nomes de props (`onCreateNew`, `onSelect`, etc.) aos reais do componente após leitura. Não alterar lógica de dados.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Esperado: lista parece índice de livro, com cabeçalho iluminado, divisórias entre personagens.

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/CharacterList.jsx
git commit -m "feat(redesign): CharacterList vira índice do tomo"
git push origin HEAD
```

---

# FASE 3 — Wizard de Criação

## Task 3.1: Inspecionar wizard

- [ ] **Step 1: Mapear**

Run: `Glob src/components/CharacterWizard/**/*.jsx`
Run: `Read` no container principal e no stepper.
Anotar: quantos passos, como o stepper renderiza, quais campos cada passo tem.

Sem mudanças. Sem commit.

---

## Task 3.2: Container do wizard em `BookSpread` + stepper como marcadores de capítulo

**Files:**
- Modify: container principal do `CharacterWizard/`
- Modify: stepper

- [ ] **Step 1: Wrapper `<BookSpread>`**

```jsx
<BookSpread>
  <Page side="left">
    <IlluminatedHeading level={2}>{currentStep.title}</IlluminatedHeading>
    {/* parte 1 do conteúdo do passo (instruções, campos básicos) */}
  </Page>
  <Page side="right">
    {/* parte 2 do conteúdo do passo (escolhas, preview) */}
    <Divider variant="flourish" />
    <div className="flex justify-between mt-6">
      <TomeButton onClick={onPrev} disabled={isFirst}>‹ Página anterior</TomeButton>
      <TomeButton variant="primary" onClick={onNext}>Próxima página ›</TomeButton>
    </div>
  </Page>
</BookSpread>
```

- [ ] **Step 2: Stepper como "marcadores de capítulo"**

Substituir estilização atual por linha de marcadores ornamentados:

```jsx
<div className="flex items-center justify-center gap-2 mb-4">
  {steps.map((s, i) => (
    <div key={s.id} className="flex items-center gap-2">
      <span className={`font-display text-sm px-2 py-1 border border-ink-200 ${
        i === currentIndex ? 'bg-parchment-100' : 'bg-parchment-300 opacity-70'
      }`}>
        {s.label}
      </span>
      {i < steps.length - 1 && <span className="text-ink-200">◆</span>}
    </div>
  ))}
</div>
```

- [ ] **Step 3: Verificar**

Run: `npm run dev`
Esperado: wizard agora em formato de livro, stepper como sequência de marcadores.

- [ ] **Step 4: Testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/CharacterWizard/
git commit -m "feat(redesign): wizard em BookSpread, stepper como marcadores"
git push origin HEAD
```

---

## Task 3.3: Campos do wizard (InkField) e cards de escolha (OrnateFrame)

**Files:**
- Modify: arquivos dos passos do wizard (raça, classe, background, atributos, etc.)

- [ ] **Step 1: Substituir inputs por `<InkField>`**

Onde houver `<input>` ou `<TextField>` tradicional, trocar por `<InkField label="…" value={…} onChange={…} />`. Selects podem ficar nativos por enquanto, só restilizados via CSS global se necessário.

- [ ] **Step 2: Cards de escolha (raça/classe/background) em `<OrnateFrame variant="simple">`**

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {options.map(opt => (
    <OrnateFrame
      key={opt.id}
      variant="simple"
      className={`cursor-pointer ${selected === opt.id ? 'ring-2 ring-ink-200' : ''}`}
    >
      <button onClick={() => setSelected(opt.id)} className="text-left w-full">
        <div className="font-display text-lg mb-1">{opt.name}</div>
        <div className="ink-italic text-sm">{opt.summary}</div>
      </button>
    </OrnateFrame>
  ))}
</div>
```

- [ ] **Step 3: Verificar**

Run: `npm run dev`
Passar pelo wizard inteiro. Esperado: cada passo coerente, campos como linhas de escrita, cards de escolha emoldurados.

- [ ] **Step 4: Testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/CharacterWizard/
git commit -m "feat(redesign): campos do wizard como InkField, escolhas como OrnateFrame"
git push origin HEAD
```

---

# FASE 4 — Modais e Componentes Auxiliares

## Task 4.1: Modais (`DetailsModal`, `SpellDetailModal`, `SrdSearchModal`, `CantripsGrantPicker`)

**Files:**
- Modify: `src/components/DetailsModal.jsx`
- Modify: `src/components/SpellDetailModal.jsx`
- Modify: `src/components/SrdSearchModal.jsx`
- Modify: `src/components/CantripsGrantPicker.jsx`

- [ ] **Step 1: Estrutura padrão para cada modal**

Trocar o painel principal de cada modal por:

```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-500/40 p-4">
  <div className="max-w-2xl w-full max-h-[85vh] overflow-auto">
    <OrnateFrame variant="full">
      <IlluminatedHeading level={2}>{title}</IlluminatedHeading>
      {/* conteúdo */}
      <Divider variant="flourish" />
      <div className="flex justify-end gap-3">
        <TomeButton onClick={onClose}>Fechar</TomeButton>
        {primaryAction && (
          <TomeButton variant="primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </TomeButton>
        )}
      </div>
    </OrnateFrame>
  </div>
</div>
```

Adaptar o conteúdo interno de cada modal preservando lógica (props, callbacks, estados).

- [ ] **Step 2: Verificar**

Run: `npm run dev`
Abrir cada modal. Esperado: pergaminho emoldurado, conteúdo legível, botões TomeButton.

- [ ] **Step 3: Testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 4: Commit + push**

```bash
git add src/components/*.jsx
git commit -m "feat(redesign): modais como pergaminhos emoldurados"
git push origin HEAD
```

---

## Task 4.2: Tooltip, FormFieldError, TopicList

**Files:**
- Modify: `src/components/Tooltip.jsx`
- Modify: `src/components/FormFieldError.jsx`
- Modify: `src/components/TopicList.jsx`

- [ ] **Step 1: Tooltip — pequeno cartão sépia**

```jsx
<div
  role="tooltip"
  className="bg-parchment-100 border border-ink-200 text-ink-500 text-sm px-3 py-2 rounded shadow-parchment max-w-xs"
  style={{ fontFamily: 'var(--font-body)' }}
>
  {content}
</div>
```

- [ ] **Step 2: FormFieldError — itálico sépia (sem cor)**

```jsx
<p className="ink-italic text-sm mt-1" role="alert">{message}</p>
```

A regra de tinta única significa: sem vermelho. Erros se distinguem por itálico + ícone `◆` opcional, não cor.

- [ ] **Step 3: TopicList — divisórias e tipografia coerentes**

Trocar separadores por `<Divider variant="line">` ou `flourish`; títulos em `<IlluminatedHeading level={3}>`; texto descritivo em fonte body.

- [ ] **Step 4: Verificar**

Run: `npm run dev`
Esperado: tooltips, erros e listas de tópicos visualmente integrados.

- [ ] **Step 5: Testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 6: Commit + push**

```bash
git add src/components/Tooltip.jsx src/components/FormFieldError.jsx src/components/TopicList.jsx
git commit -m "feat(redesign): Tooltip, FormFieldError, TopicList tematizados"
git push origin HEAD
```

---

## Task 4.3: `PrintView` — variante otimizada para impressão

**Files:**
- Modify: `src/components/PrintView/**`

- [ ] **Step 1: Mapear**

Run: `Glob src/components/PrintView/**`
Run: `Read` no componente principal.

- [ ] **Step 2: Adicionar regras `@media print` no CSS da PrintView**

Em `ui.module.css` (ou em CSS local da PrintView se preferir isolamento), acrescentar:

```css
@media print {
  body {
    background: white !important;
    background-image: none !important;
  }
  .spread {
    box-shadow: none !important;
    background: white !important;
    page-break-inside: avoid;
  }
  .spread::before, .spread::after { display: none; }
  .page {
    box-shadow: none !important;
    background-image: none !important;
    border: none !important;
  }
  /* Vinhetas e flourishes ficam sépia leve, não escuras demais para tinta de impressora */
  [aria-hidden="true"] { opacity: 0.6; }
}
```

- [ ] **Step 3: Garantir que `PrintView` use as mesmas primitivas**

Se PrintView ainda tem seu próprio markup duplicado, substituir por `<BookSpread>`/`<Page>`. Resultado: a ficha impressa parece a mesma da tela, sem fundo bege carregado.

- [ ] **Step 4: Verificar**

Run: `npm run dev`
Abrir PrintView e usar pré-visualização de impressão do navegador (Ctrl+P). Esperado: papel branco, conteúdo sépia legível, ornamentos sutis.

- [ ] **Step 5: Testes**

Run: `npm test`
Expected: passam.

- [ ] **Step 6: Commit + push**

```bash
git add src/components/PrintView/ src/components/ui/ui.module.css
git commit -m "feat(redesign): PrintView com regras @media print otimizadas"
git push origin HEAD
```

---

## Task 4.4: Verificação final ponta a ponta

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: build limpa, sem warnings novos.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem erros novos. Avisos pré-existentes podem permanecer (não é objetivo deste plano corrigi-los).

- [ ] **Step 3: Testes completos**

Run: `npm test`
Expected: 100% dos testes existentes passam.

- [ ] **Step 4: Tour manual**

Run: `npm run dev`
Navegar manualmente:
1. Lista de personagens → criar novo
2. Wizard completo até finalizar
3. Ficha do personagem (todas as abas)
4. Abrir cada modal (detalhes, magia, busca SRD)
5. Rolar dados
6. Imprimir / pré-visualizar impressão

Esperado: tudo coerente visualmente, sem cores azuis/cinzas/vermelhas do tema antigo, fontes serifadas em toda a UI.

- [ ] **Step 5: Commit de fechamento (se houver ajustes)**

Se durante o tour aparecer alguma classe Tailwind residual (`text-gray-*`, `bg-amber-*`, etc.), corrigir e commitar:

```bash
git add -A
git commit -m "fix(redesign): remove resíduos de classes do tema antigo"
git push origin HEAD
```

Senão, plano completo — nada a commitar.

---

## Self-Review

**1. Spec coverage:** todas as seções da spec mapeadas:
- §1 Tokens → Task 0.1
- §2 Primitivas (10) → Tasks 0.3–0.6
- §3 Fase 0 → Tasks 0.1–0.6
- §3 Fase 1 → Tasks 1.1–1.5
- §3 Fase 2 → Task 2.1
- §3 Fase 3 → Tasks 3.1–3.3
- §3 Fase 4 → Tasks 4.1–4.4
- §4 Princípios (sem novos testes, push automático, mobile) → embutidos nas tarefas
- §5 Decisões (tinta única, sem PNG, PrintView, subagentes) → embutidas

**2. Placeholders:** nenhum TBD/TODO. Onde dizemos "adaptar nomes reais", a Task 1.1 / 3.1 manda inspecionar primeiro — o engenheiro descobre os nomes antes de tocar no código.

**3. Consistência de tipos:** todos os nomes de primitivas (`BookSpread`, `Page`, `OrnateFrame`, etc.) e variantes (`variant="full|simple|cartouche"`, `level={1|2|3}`, `shape="shield|oval"`, `variant="primary|secondary|danger"`) batem entre tasks e barrel.

Plano pronto.
